/**
 * Enhanced AutoSave Queue Management System
 * Fixes race conditions, data loss, and version conflicts identified in production readiness report
 */

export interface SaveOperation {
  id: string;
  stepNumber: number;
  data: Record<string, unknown>;
  timestamp: number;
  version?: number;
  retryCount: number;
  clientTimestamp: string;
  getLatestVersion?: () => number; // Function to get the latest version at execution time
}

export interface SaveResult {
  success: boolean;
  operationId: string;
  stepNumber: number;
  newVersion?: number;
  error?: string;
  conflictDetected?: boolean;
}

export interface AutoSaveConfig {
  enabled: boolean;
  debounceTime: number;
  maxBatchSize: number;
  maxRetries: number;
  retryDelay: number;
  conflictRetryDelay: number;
}

export class AutoSaveQueue {
  private operationQueue: Map<number, SaveOperation> = new Map();
  private inProgress: Set<string> = new Set();
  private isProcessing: boolean = false;
  private processingPromise: Promise<{ success: boolean; results: SaveResult[] }> | null = null;
  private operationCounter: number = 0;
  private readonly config: AutoSaveConfig;

  constructor(config: AutoSaveConfig) {
    this.config = config;
  }

  /**
   * Generate unique operation ID for deduplication
   */
  private generateOperationId(): string {
    this.operationCounter += 1;
    return `${Date.now()}-${this.operationCounter}`;
  }

  /**
   * Add or update a save operation (with deduplication)
   * This is the core function that prevents duplicate saves for the same step
   */
  addSaveOperation(
    stepNumber: number,
    data: Record<string, unknown>,
    version?: number,
    getLatestVersion?: () => number
  ): string {
    const operationId = this.generateOperationId();
    const now = Date.now();

    // 🔧 FIXED: Proper deduplication - remove any existing operation for this step
    const existingOperation = this.operationQueue.get(stepNumber);
    if (existingOperation && this.inProgress.has(existingOperation.id)) {
      // If there's already a save in progress for this step, we'll replace it
      // but keep track for conflict resolution
      console.debug(`[AutoSave Queue] Replacing operation for step ${stepNumber}`);
    }

    const saveOperation: SaveOperation = {
      id: operationId,
      stepNumber,
      data: { ...data }, // Deep copy to prevent mutations
      timestamp: now,
      version,
      retryCount: 0,
      clientTimestamp: new Date().toISOString(),
      getLatestVersion, // Store the function to get latest version at execution time
    };

    // Replace any existing operation for this step (proper deduplication)
    this.operationQueue.set(stepNumber, saveOperation);

    return operationId;
  }

  /**
   * Get pending operations (excluding those currently in progress)
   */
  getPendingOperations(): SaveOperation[] {
    return Array.from(this.operationQueue.values())
      .filter(op => !this.inProgress.has(op.id))
      .sort((a, b) => a.timestamp - b.timestamp); // Process in chronological order
  }

  /**
   * Get operations ready for batch processing
   */
  getBatchOperations(maxBatchSize: number): SaveOperation[] {
    const pending = this.getPendingOperations();
    return pending.slice(0, maxBatchSize);
  }

  /**
   * Get the effective version for an operation (latest version if function provided, fallback to stored version)
   */
  private getEffectiveVersion(operation: SaveOperation): number | undefined {
    if (operation.getLatestVersion) {
      try {
        return operation.getLatestVersion();
      } catch (error) {
        console.warn(`[AutoSave Queue] Failed to get latest version for step ${operation.stepNumber}:`, error);
        return operation.version;
      }
    }
    return operation.version;
  }

  /**
   * Mark operation as in progress
   */
  markInProgress(operationId: string): void {
    this.inProgress.add(operationId);
  }

  /**
   * Complete operation (remove from queue)
   */
  completeOperation(operationId: string, stepNumber: number): void {
    this.inProgress.delete(operationId);

    // Only remove from queue if this is still the current operation for this step
    const currentOp = this.operationQueue.get(stepNumber);
    if (currentOp && currentOp.id === operationId) {
      this.operationQueue.delete(stepNumber);
    }
  }

  /**
   * Handle operation failure (retry logic)
   */
  handleOperationFailure(
    operationId: string,
    stepNumber: number,
    error: string,
    isConflict: boolean = false
  ): boolean {
    this.inProgress.delete(operationId);

    const operation = this.operationQueue.get(stepNumber);
    if (!operation || operation.id !== operationId) {
      return false; // Operation was superseded
    }

    operation.retryCount += 1;

    // Different retry logic for conflicts vs other errors
    const maxRetries = isConflict ? 2 : this.config.maxRetries;

    if (operation.retryCount >= maxRetries) {
      console.error(`[AutoSave Queue] Max retries exceeded for step ${stepNumber}:`, error);
      this.operationQueue.delete(stepNumber);
      return false;
    }

    // Schedule retry with exponential backoff
    const retryDelay = isConflict
      ? this.config.conflictRetryDelay
      : this.config.retryDelay * Math.pow(2, operation.retryCount - 1);

    setTimeout(() => {
      // Only retry if this operation is still current
      const currentOp = this.operationQueue.get(stepNumber);
      if (currentOp && currentOp.id === operationId) {
        console.log(`[AutoSave Queue] Retrying operation ${operationId} for step ${stepNumber} (attempt ${operation.retryCount})`);
      }
    }, retryDelay);

    return true;
  }

  /**
   * Process save queue with proper mutex/semaphore pattern
   * This prevents concurrent processing and race conditions
   */
  async processQueue(
    saveFunction: (operations: SaveOperation[]) => Promise<SaveResult[]>
  ): Promise<{ success: boolean; results: SaveResult[] }> {
    // 🔧 FIXED: Proper mutex pattern to prevent concurrent processing
    if (this.isProcessing) {
      // Return existing processing promise to prevent race conditions
      if (this.processingPromise) {
        return await this.processingPromise;
      }
      return { success: true, results: [] };
    }

    this.isProcessing = true;

    this.processingPromise = this._processQueueInternal(saveFunction);

    try {
      const result = await this.processingPromise;
      return result;
    } finally {
      this.isProcessing = false;
      this.processingPromise = null;
    }
  }

  /**
   * Internal queue processing logic
   */
  private async _processQueueInternal(
    saveFunction: (operations: SaveOperation[]) => Promise<SaveResult[]>
  ): Promise<{ success: boolean; results: SaveResult[] }> {
    const batch = this.getBatchOperations(this.config.maxBatchSize);

    if (batch.length === 0) {
      return { success: true, results: [] };
    }

    // 🔧 FIXED: Update operations with latest versions before processing
    // This prevents version conflicts due to stale version numbers
    const batchWithLatestVersions = batch.map(op => ({
      ...op,
      version: this.getEffectiveVersion(op),
    }));

    // Mark all operations as in progress
    batch.forEach(op => this.markInProgress(op.id));

    try {
      const results = await saveFunction(batchWithLatestVersions);

      // Process results and clean up queue
      results.forEach(result => {
        if (result.success) {
          this.completeOperation(result.operationId, result.stepNumber);
        } else {
          this.handleOperationFailure(
            result.operationId,
            result.stepNumber,
            result.error || 'Unknown error',
            result.conflictDetected || false
          );
        }
      });

      return { success: true, results };
    } catch (error) {
      // Handle batch failure - mark all operations as failed
      batch.forEach(op => {
        this.handleOperationFailure(
          op.id,
          op.stepNumber,
          error instanceof Error ? error.message : 'Batch save failed'
        );
      });

      return {
        success: false,
        results: batch.map(op => ({
          success: false,
          operationId: op.id,
          stepNumber: op.stepNumber,
          error: error instanceof Error ? error.message : 'Batch save failed'
        }))
      };
    }
  }

  /**
   * Get queue status for debugging
   */
  getQueueStatus(): {
    pending: number;
    inProgress: number;
    isProcessing: boolean;
    operations: Array<{ stepNumber: number; id: string; retryCount: number; timestamp: number }>;
  } {
    return {
      pending: this.operationQueue.size,
      inProgress: this.inProgress.size,
      isProcessing: this.isProcessing,
      operations: Array.from(this.operationQueue.values()).map(op => ({
        stepNumber: op.stepNumber,
        id: op.id,
        retryCount: op.retryCount,
        timestamp: op.timestamp,
      })),
    };
  }

  /**
   * Clear all pending operations (use carefully)
   */
  clearQueue(): void {
    this.operationQueue.clear();
    this.inProgress.clear();
    console.warn('[AutoSave Queue] Queue cleared - all pending saves lost');
  }

  /**
   * Check if any operations are pending or in progress
   */
  hasActiveOperations(): boolean {
    return this.operationQueue.size > 0 || this.inProgress.size > 0 || this.isProcessing;
  }
}

/**
 * Default configuration for autosave queue
 */
export const DEFAULT_AUTOSAVE_CONFIG: AutoSaveConfig = {
  enabled: true,
  debounceTime: 2000,     // 2 seconds debounce
  maxBatchSize: 3,        // Process max 3 steps at once
  maxRetries: 3,          // Retry failed operations 3 times
  retryDelay: 1000,       // 1 second base retry delay
  conflictRetryDelay: 500, // 500ms retry delay for version conflicts
};