// Enhanced API Client with improved error handling, retry logic, and performance
import { ClientApiClient, ApiResponse } from './api-client';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface RequestQueueItem {
  id: string;
  endpoint: string;
  options: RequestInit;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number;
  timestamp: number;
}

export class EnhancedApiClient extends ClientApiClient {
  private requestQueue: RequestQueueItem[] = [];
  private isProcessingQueue = false;
  private concurrentRequests = 0;
  private maxConcurrentRequests = 3;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };
  private offlineQueue: RequestQueueItem[] = [];
  private isOnline = true;

  constructor(token?: string) {
    super(token);
    this.setupOnlineOfflineHandlers();
  }

  // Setup online/offline detection
  private setupOnlineOfflineHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      this.isOnline = navigator.onLine;
    }
  }

  private handleOnline() {
    console.log('[ONLINE] Connection restored - processing offline queue');
    this.isOnline = true;
    this.processOfflineQueue();
  }

  private handleOffline() {
    console.log('[OFFLINE] Connection lost - queuing requests');
    this.isOnline = false;
  }

  // Enhanced request with queue, retry, and offline support
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    priority: number = 1
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const queueItem: RequestQueueItem = {
        id: requestId,
        endpoint,
        options,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
      };

      if (!this.isOnline) {
        // Queue request for when connection is restored
        this.offlineQueue.push(queueItem);
        console.log(`[QUEUED] Offline request: ${endpoint}`);
        return;
      }

      this.requestQueue.push(queueItem);
      this.processQueue();
    });
  }

  // Process request queue with concurrency control
  private async processQueue() {
    if (this.isProcessingQueue || this.concurrentRequests >= this.maxConcurrentRequests) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.concurrentRequests < this.maxConcurrentRequests) {
      // Sort by priority (higher first) and timestamp (older first)
      this.requestQueue.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.timestamp - b.timestamp;
      });

      const item = this.requestQueue.shift();
      if (item) {
        this.concurrentRequests++;
        this.processRequestItem(item);
      }
    }

    this.isProcessingQueue = false;
  }

  // Process individual request with retry logic
  private async processRequestItem(item: RequestQueueItem) {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Call parent request method
        const response = await super.request(item.endpoint, item.options);
        
        this.concurrentRequests--;
        item.resolve(response);
        
        // Process next item in queue
        setTimeout(() => this.processQueue(), 10);
        return;
        
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
        
        // Calculate delay for retry
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelay
        );
        
        if (attempt < this.retryConfig.maxRetries) {
          console.log(`[RETRY] Request ${item.endpoint} in ${delay}ms (attempt ${attempt + 1})`);
          await this.sleep(delay);
        }
      }
    }
    
    // All retries failed
    this.concurrentRequests--;
    console.error(`[FAILED] Request failed after ${this.retryConfig.maxRetries + 1} attempts:`, item.endpoint);
    item.reject(lastError);
    
    // Process next item
    setTimeout(() => this.processQueue(), 10);
  }

  // Process offline queue when connection is restored
  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    console.log(`[PROCESSING] ${this.offlineQueue.length} offline requests`);
    
    // Move offline requests to main queue
    this.requestQueue.push(...this.offlineQueue);
    this.offlineQueue = [];
    
    this.processQueue();
  }

  // Check if error should not be retried
  private isNonRetryableError(error: any): boolean {
    if (error?.status) {
      // Don't retry client errors (400-499) except for 429 (rate limit)
      return error.status >= 400 && error.status < 500 && error.status !== 429;
    }
    return false;
  }

  // Utility sleep function
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Batch operations for efficiency
  async batchSave(operations: Array<{endpoint: string; data: any; priority?: number}>): Promise<ApiResponse[]> {
    console.log(`[BATCH] Executing batch save with ${operations.length} operations`);
    
    const promises = operations.map(op => 
      this.request(op.endpoint, {
        method: 'PUT',
        body: JSON.stringify(op.data),
      }, op.priority || 1)
    );

    try {
      const results = await Promise.allSettled(promises);
      
      const responses = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`[BATCH ERROR] Operation failed for ${operations[index].endpoint}:`, result.reason);
          return {
            success: false,
            error: result.reason.message || 'Batch operation failed',
          };
        }
      });

      console.log(`[BATCH COMPLETE] ${responses.filter(r => r.success).length}/${operations.length} successful`);
      return responses;
      
    } catch (error) {
      console.error('[BATCH FAILED]:', error);
      throw error;
    }
  }

  // Get queue status for debugging
  getQueueStatus() {
    return {
      online: this.isOnline,
      requestQueue: this.requestQueue.length,
      offlineQueue: this.offlineQueue.length,
      concurrentRequests: this.concurrentRequests,
      isProcessing: this.isProcessingQueue,
    };
  }

  // Clear queues (useful for cleanup)
  clearQueues() {
    this.requestQueue = [];
    this.offlineQueue = [];
    this.isProcessingQueue = false;
    this.concurrentRequests = 0;
  }
}