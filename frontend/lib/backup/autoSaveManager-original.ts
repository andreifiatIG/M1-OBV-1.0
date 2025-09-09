import { useCallback, useEffect, useRef, useState } from 'react';
import debounce from 'lodash/debounce';

interface AutoSaveConfig {
  interval?: number; // Auto-save interval in milliseconds
  debounceDelay?: number; // Debounce delay for data changes
  maxRetries?: number; // Maximum retry attempts for failed saves
  enableLocalStorage?: boolean; // Enable local storage backup
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  pendingChanges: boolean;
  retryCount: number;
}

export class AutoSaveManager {
  private config: Required<AutoSaveConfig>;
  private saveTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private pendingData: Map<string, any> = new Map();
  private listeners: Set<(state: AutoSaveState) => void> = new Set();
  private state: AutoSaveState = {
    isSaving: false,
    lastSaved: null,
    error: null,
    pendingChanges: false,
    retryCount: 0,
  };

  constructor(config: AutoSaveConfig = {}) {
    this.config = {
      interval: config.interval || 30000, // 30 seconds default
      debounceDelay: config.debounceDelay || 2000, // 2 seconds default
      maxRetries: config.maxRetries || 3,
      enableLocalStorage: config.enableLocalStorage !== false,
    };
  }

  // Add state listener
  subscribe(listener: (state: AutoSaveState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Update state and notify listeners
  private updateState(updates: Partial<AutoSaveState>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  // Queue data for saving
  queueSave(key: string, data: any) {
    this.pendingData.set(key, data);
    this.updateState({ pendingChanges: true });
    
    // Save to localStorage immediately for backup
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage(key, data);
    }
    
    // Reset save timer
    this.scheduleSave();
  }

  // Schedule auto-save
  private scheduleSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.executeSave();
    }, this.config.debounceDelay);
  }

  // Execute save operation
  async executeSave(saveFunction?: (data: Map<string, any>) => Promise<void>) {
    if (this.pendingData.size === 0 || this.state.isSaving) {
      return;
    }

    this.updateState({ isSaving: true, error: null });

    try {
      // Get pending data and clear the queue
      const dataToSave = new Map(this.pendingData);
      this.pendingData.clear();

      // Execute save if function provided
      if (saveFunction) {
        await saveFunction(dataToSave);
      }

      // Update state on success
      this.updateState({
        isSaving: false,
        lastSaved: new Date(),
        pendingChanges: false,
        retryCount: 0,
        error: null,
      });

      // Clear localStorage backup on successful save
      if (this.config.enableLocalStorage) {
        this.clearLocalStorage(dataToSave);
      }
    } catch (error) {
      // Restore pending data on failure
      this.pendingData = new Map([...this.pendingData, ...this.pendingData]);
      
      this.updateState({
        isSaving: false,
        error: error instanceof Error ? error.message : 'Auto-save failed',
        retryCount: this.state.retryCount + 1,
      });

      // Schedule retry if under max retries
      if (this.state.retryCount < this.config.maxRetries) {
        this.scheduleRetry(saveFunction);
      }
    }
  }

  // Schedule retry for failed saves
  private scheduleRetry(saveFunction?: (data: Map<string, any>) => Promise<void>) {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 30000);
    
    this.retryTimer = setTimeout(() => {
      this.executeSave(saveFunction);
    }, retryDelay);
  }

  // Save to localStorage for backup
  private saveToLocalStorage(key: string, data: any) {
    try {
      const storageKey = `autosave_${key}`;
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  // Clear localStorage backup
  private clearLocalStorage(data: Map<string, any>) {
    data.forEach((_, key) => {
      try {
        localStorage.removeItem(`autosave_${key}`);
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
    });
  }

  // Recover from localStorage
  recoverFromLocalStorage(key: string): any | null {
    try {
      const storageKey = `autosave_${key}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        const age = Date.now() - new Date(timestamp).getTime();
        
        // Only recover if less than 24 hours old
        if (age < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to recover from localStorage:', error);
    }
    
    return null;
  }

  // Force save immediately
  async forceSave(saveFunction: (data: Map<string, any>) => Promise<void>) {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    await this.executeSave(saveFunction);
  }

  // Clean up timers
  destroy() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    
    this.listeners.clear();
  }
}

// React hook for auto-save functionality
export function useAutoSave(
  saveFunction: (data: any) => Promise<void>,
  config?: AutoSaveConfig
) {
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    pendingChanges: false,
    retryCount: 0,
  });
  
  const managerRef = useRef<AutoSaveManager>();
  const saveIntervalRef = useRef<NodeJS.Timeout>();
  
  // Initialize manager
  useEffect(() => {
    managerRef.current = new AutoSaveManager(config);
    
    // Subscribe to state changes
    const unsubscribe = managerRef.current.subscribe(setState);
    
    // Set up periodic save
    if (config?.interval) {
      saveIntervalRef.current = setInterval(() => {
        if (managerRef.current) {
          managerRef.current.executeSave(async (data) => {
            // Convert Map to object for easier handling
            const dataObject: any = {};
            data.forEach((value, key) => {
              dataObject[key] = value;
            });
            
            await saveFunction(dataObject);
          });
        }
      }, config.interval);
    }
    
    return () => {
      unsubscribe();
      if (managerRef.current) {
        managerRef.current.destroy();
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, []);
  
  // Queue data for saving
  const queueSave = useCallback((key: string, data: any) => {
    if (managerRef.current) {
      managerRef.current.queueSave(key, data);
    }
  }, []);
  
  // Force immediate save
  const forceSave = useCallback(async () => {
    if (managerRef.current) {
      await managerRef.current.forceSave(async (data) => {
        const dataObject: any = {};
        data.forEach((value, key) => {
          dataObject[key] = value;
        });
        
        await saveFunction(dataObject);
      });
    }
  }, [saveFunction]);
  
  // Recover data from localStorage
  const recoverData = useCallback((key: string) => {
    if (managerRef.current) {
      return managerRef.current.recoverFromLocalStorage(key);
    }
    return null;
  }, []);
  
  return {
    ...state,
    queueSave,
    forceSave,
    recoverData,
  };
}

// Debounced auto-save hook
export function useDebouncedAutoSave<T>(
  value: T,
  saveFunction: (value: T) => Promise<void>,
  delay: number = 2000
) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const debouncedSave = useRef(
    debounce(async (value: T) => {
      setIsSaving(true);
      setError(null);
      
      try {
        await saveFunction(value);
        setLastSaved(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setIsSaving(false);
      }
    }, delay)
  ).current;
  
  useEffect(() => {
    if (value !== undefined && value !== null) {
      debouncedSave(value);
    }
    
    return () => {
      debouncedSave.cancel();
    };
  }, [value, debouncedSave]);
  
  return { isSaving, error, lastSaved };
}