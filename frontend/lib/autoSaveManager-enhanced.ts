import { useCallback, useEffect, useRef, useState } from 'react';
import debounce from 'lodash/debounce';

interface EnhancedAutoSaveConfig {
  interval?: number; // Auto-save interval in milliseconds
  debounceDelay?: number; // Debounce delay for data changes
  maxRetries?: number; // Maximum retry attempts for failed saves
  enableLocalStorage?: boolean; // Enable local storage backup
  batchSize?: number; // Maximum number of items to save in one batch
  compressionEnabled?: boolean; // Enable data compression
  priorityLevels?: boolean; // Enable priority-based saving
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  pendingChanges: boolean;
  retryCount: number;
  queueSize: number;
  compressionRatio?: number;
  lastBatchSize?: number;
}

interface SaveItem {
  key: string;
  data: any;
  priority: number;
  timestamp: number;
  retries: number;
  size: number; // Estimated size in bytes
}

export class EnhancedAutoSaveManager {
  private config: Required<EnhancedAutoSaveConfig>;
  private saveTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private pendingItems: Map<string, SaveItem> = new Map();
  private listeners: Set<(state: AutoSaveState) => void> = new Set();
  private state: AutoSaveState = {
    isSaving: false,
    lastSaved: null,
    error: null,
    pendingChanges: false,
    retryCount: 0,
    queueSize: 0,
  };

  // Performance monitoring
  private performanceMetrics = {
    totalSaves: 0,
    totalFailures: 0,
    averageSaveTime: 0,
    compressionSavings: 0,
  };

  constructor(config: EnhancedAutoSaveConfig = {}) {
    this.config = {
      interval: config.interval || 30000, // 30 seconds default
      debounceDelay: config.debounceDelay || 2000, // 2 seconds default
      maxRetries: config.maxRetries || 3,
      enableLocalStorage: config.enableLocalStorage !== false,
      batchSize: config.batchSize || 10,
      compressionEnabled: config.compressionEnabled || true,
      priorityLevels: config.priorityLevels !== false,
    };

    // Setup periodic cleanup
    setInterval(() => this.cleanupExpiredItems(), 60000); // Every minute
  }

  // Subscribe to state changes
  subscribe(listener: (state: AutoSaveState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Update state and notify listeners
  private updateState(updates: Partial<AutoSaveState>) {
    this.state = { ...this.state, ...updates, queueSize: this.pendingItems.size };
    this.listeners.forEach(listener => listener(this.state));
  }

  // Queue data for saving with priority and size estimation
  queueSave(key: string, data: any, priority: number = 1) {
    const serializedData = JSON.stringify(data);
    const dataSize = new Blob([serializedData]).size;

    const item: SaveItem = {
      key,
      data,
      priority: Math.max(1, Math.min(5, priority)), // Clamp between 1-5
      timestamp: Date.now(),
      retries: 0,
      size: dataSize,
    };

    // Compress data if enabled and size > 1KB
    if (this.config.compressionEnabled && dataSize > 1024) {
      try {
        const compressed = this.compressData(serializedData);
        if (compressed.length < serializedData.length * 0.8) { // Only use if >20% savings
          item.data = { _compressed: true, _data: compressed };
          this.performanceMetrics.compressionSavings += (dataSize - compressed.length);
        }
      } catch (error) {
        console.warn('⚠️ Compression failed, using original data:', error);
      }
    }

    this.pendingItems.set(key, item);
    this.updateState({ pendingChanges: true });
    
    // Save to localStorage immediately for backup
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage(key, data);
    }
    
    // Schedule save
    this.scheduleSave();
  }

  // Intelligent batching based on size and priority
  private getBatchItems(): SaveItem[] {
    const items = Array.from(this.pendingItems.values());
    
    if (!this.config.priorityLevels) {
      return items.slice(0, this.config.batchSize);
    }

    // Sort by priority (higher first), then by age (older first)
    items.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

    const batch: SaveItem[] = [];
    let totalSize = 0;
    const maxBatchSize = 1024 * 1024; // 1MB max batch size

    for (const item of items) {
      if (batch.length >= this.config.batchSize) break;
      if (totalSize + item.size > maxBatchSize) break;
      
      batch.push(item);
      totalSize += item.size;
    }

    return batch;
  }

  // Schedule auto-save with adaptive timing
  private scheduleSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    // Adaptive delay based on queue size and priority
    const queueSize = this.pendingItems.size;
    const hasHighPriority = Array.from(this.pendingItems.values()).some(item => item.priority >= 4);
    
    let delay = this.config.debounceDelay;
    
    if (hasHighPriority) {
      delay = Math.min(delay, 500); // High priority items save faster
    }
    
    if (queueSize > this.config.batchSize) {
      delay = Math.min(delay, 1000); // Large queue saves faster
    }
    
    this.saveTimer = setTimeout(() => {
      this.executeSave();
    }, delay);
  }

  // Execute intelligent batch save
  async executeSave(saveFunction?: (data: Map<string, any>) => Promise<void>) {
    if (this.pendingItems.size === 0 || this.state.isSaving) {
      return;
    }

    const startTime = Date.now();
    const batchItems = this.getBatchItems();
    
    if (batchItems.length === 0) return;

    this.updateState({ isSaving: true, error: null, lastBatchSize: batchItems.length });

    try {
      // Prepare data for saving
      const dataMap = new Map<string, any>();
      for (const item of batchItems) {
        let dataToSave = item.data;
        
        // Decompress if needed
        if (dataToSave._compressed) {
          dataToSave = JSON.parse(this.decompressData(dataToSave._data));
        }
        
        dataMap.set(item.key, dataToSave);
      }

      // Execute save function
      if (saveFunction) {
        await saveFunction(dataMap);
      }

      // Remove successfully saved items
      for (const item of batchItems) {
        this.pendingItems.delete(item.key);
        if (this.config.enableLocalStorage) {
          this.removeFromLocalStorage(item.key);
        }
      }

      // Update performance metrics
      const saveTime = Date.now() - startTime;
      this.performanceMetrics.totalSaves++;
      this.performanceMetrics.averageSaveTime = 
        (this.performanceMetrics.averageSaveTime * (this.performanceMetrics.totalSaves - 1) + saveTime) / 
        this.performanceMetrics.totalSaves;

      // Update state on success
      this.updateState({
        isSaving: false,
        lastSaved: new Date(),
        pendingChanges: this.pendingItems.size > 0,
        retryCount: 0,
        error: null,
      });

      console.log(`✅ Auto-save completed: ${batchItems.length} items in ${saveTime}ms`);

      // Schedule next save if there are more items
      if (this.pendingItems.size > 0) {
        this.scheduleSave();
      }

    } catch (error: any) {
      this.performanceMetrics.totalFailures++;
      console.error('❌ Auto-save failed:', error);

      // Handle retry logic for failed items
      const failedItems = batchItems.filter(item => item.retries < this.config.maxRetries);
      
      for (const item of failedItems) {
        item.retries++;
        // Exponential backoff: increase delay for retried items
        setTimeout(() => {
          if (this.pendingItems.has(item.key)) {
            this.scheduleSave();
          }
        }, Math.pow(2, item.retries) * 1000);
      }

      // Remove items that exceeded retry limit
      for (const item of batchItems) {
        if (item.retries >= this.config.maxRetries) {
          this.pendingItems.delete(item.key);
          console.error(`❌ Item ${item.key} exceeded retry limit and was discarded`);
        }
      }

      this.updateState({
        isSaving: false,
        error: error.message || 'Auto-save failed',
        retryCount: this.state.retryCount + 1,
      });
    }
  }

  // Compress data using simple string compression
  private compressData(data: string): string {
    // Simple LZ-string style compression for demonstration
    // In production, consider using a proper compression library
    return btoa(encodeURIComponent(data));
  }

  // Decompress data
  private decompressData(compressed: string): string {
    return decodeURIComponent(atob(compressed));
  }

  // Clean up expired items (older than 1 hour)
  private cleanupExpiredItems() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const expiredKeys: string[] = [];

    for (const [key, item] of this.pendingItems) {
      if (item.timestamp < oneHourAgo) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.pendingItems.delete(key);
      console.warn(`⚠️ Expired unsaved item removed: ${key}`);
    }

    if (expiredKeys.length > 0) {
      this.updateState({ pendingChanges: this.pendingItems.size > 0 });
    }
  }

  // Enhanced localStorage operations
  private saveToLocalStorage(key: string, data: any) {
    try {
      const backupKey = `onboarding_backup_${key}`;
      const backupData = {
        data,
        timestamp: Date.now(),
        version: '2.0',
      };
      localStorage.setItem(backupKey, JSON.stringify(backupData));
    } catch (error) {
      console.warn('⚠️ Failed to save backup to localStorage:', error);
    }
  }

  private removeFromLocalStorage(key: string) {
    try {
      localStorage.removeItem(`onboarding_backup_${key}`);
    } catch (error) {
      console.warn('⚠️ Failed to remove backup from localStorage:', error);
    }
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      compressionRatio: this.performanceMetrics.compressionSavings > 0 
        ? (this.performanceMetrics.compressionSavings / (this.performanceMetrics.compressionSavings + 1000000)) * 100 
        : 0,
      successRate: this.performanceMetrics.totalSaves > 0 
        ? ((this.performanceMetrics.totalSaves - this.performanceMetrics.totalFailures) / this.performanceMetrics.totalSaves) * 100 
        : 0,
    };
  }

  // Get current state
  getState(): AutoSaveState {
    return { ...this.state };
  }

  // Force save all pending items
  async forceSave(saveFunction?: (data: Map<string, any>) => Promise<void>) {
    while (this.pendingItems.size > 0 && !this.state.isSaving) {
      await this.executeSave(saveFunction);
      // Small delay to prevent overwhelming the system
      if (this.pendingItems.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Clear all pending items
  clearQueue() {
    this.pendingItems.clear();
    this.updateState({ pendingChanges: false });
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  // Destroy instance
  destroy() {
    this.clearQueue();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    this.listeners.clear();
  }
}

// React hook for enhanced auto-save
export function useEnhancedAutoSave(config?: EnhancedAutoSaveConfig) {
  const [manager] = useState(() => new EnhancedAutoSaveManager(config));
  const [state, setState] = useState<AutoSaveState>(manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return () => {
      unsubscribe();
      manager.destroy();
    };
  }, [manager]);

  const queueSave = useCallback((key: string, data: any, priority: number = 1) => {
    manager.queueSave(key, data, priority);
  }, [manager]);

  const forceSave = useCallback(async (saveFunction?: (data: Map<string, any>) => Promise<void>) => {
    await manager.forceSave(saveFunction);
  }, [manager]);

  return {
    state,
    queueSave,
    forceSave,
    clearQueue: manager.clearQueue.bind(manager),
    getPerformanceMetrics: manager.getPerformanceMetrics.bind(manager),
  };
}