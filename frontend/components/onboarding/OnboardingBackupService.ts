"use client";

import { toast } from 'sonner';

interface BackupData {
  sessionId: string;
  villaId?: string;
  currentStep: number;
  stepData: Record<number, any>;
  lastSaved: string;
  userAgent: string;
  version: string;
}

interface BackupOptions {
  debounceMs?: number;
  maxRetries?: number;
  enableLocalStorage?: boolean;
  enableServerBackup?: boolean;
}

class OnboardingBackupService {
  private static instance: OnboardingBackupService;
  private sessionId: string;
  private saveTimeout?: NodeJS.Timeout;
  private options: Required<BackupOptions>;
  private isOnline: boolean = true;
  private retryQueue: (() => Promise<void>)[] = [];

  private constructor(options: BackupOptions = {}) {
    this.sessionId = this.generateSessionId();
    this.options = {
      debounceMs: options.debounceMs ?? 2000,
      maxRetries: options.maxRetries ?? 3,
      enableLocalStorage: options.enableLocalStorage ?? true,
      enableServerBackup: options.enableServerBackup ?? true,
    };

    this.setupOnlineDetection();
    this.setupBeforeUnloadHandler();
    this.setupStorageCleanup();
  }

  public static getInstance(options?: BackupOptions): OnboardingBackupService {
    if (!OnboardingBackupService.instance) {
      OnboardingBackupService.instance = new OnboardingBackupService(options);
    }
    return OnboardingBackupService.instance;
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `onboarding_${timestamp}_${random}`;
  }

  public async saveProgress(
    villaId: string | undefined,
    currentStep: number,
    stepData: Record<number, any>
  ): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      await this.performSave(villaId, currentStep, stepData);
    }, this.options.debounceMs);
  }

  public async saveProgressImmediate(
    villaId: string | undefined,
    currentStep: number,
    stepData: Record<number, any>
  ): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;
    }
    
    await this.performSave(villaId, currentStep, stepData);
  }

  private async performSave(
    villaId: string | undefined,
    currentStep: number,
    stepData: Record<number, any>
  ): Promise<void> {
    const backupData: BackupData = {
      sessionId: this.sessionId,
      villaId,
      currentStep,
      stepData,
      lastSaved: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
      version: '1.0',
    };

    const promises: Promise<void>[] = [];

    if (this.options.enableLocalStorage) {
      promises.push(this.saveToLocalStorage(backupData));
    }

    if (this.options.enableServerBackup && this.isOnline) {
      promises.push(this.saveToServer(backupData));
    } else if (this.options.enableServerBackup && !this.isOnline) {
      // Queue for later when back online
      this.retryQueue.push(() => this.saveToServer(backupData));
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Backup save error:', error);
      // Don't throw - backup failures shouldn't interrupt user flow
    }
  }

  private async saveToLocalStorage(data: BackupData): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      const key = `onboarding_backup_${data.villaId || 'new'}`;
      localStorage.setItem(key, JSON.stringify(data));
      
      // Also save to a general key for recovery without villaId
      localStorage.setItem('onboarding_latest_backup', JSON.stringify(data));
    } catch (error) {
      console.warn('LocalStorage backup failed:', error);
      throw error;
    }
  }

  private async saveToServer(data: BackupData): Promise<void> {
    let retries = 0;
    
    while (retries < this.options.maxRetries) {
      try {
        const response = await fetch('/api/onboarding/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Server backup failed: ${response.status}`);
        }

        return; // Success
      } catch (error) {
        retries++;
        console.warn(`Server backup attempt ${retries} failed:`, error);
        
        if (retries < this.options.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      }
    }
    
    throw new Error('Server backup failed after all retries');
  }

  public async recoverLatestSession(): Promise<BackupData | null> {
    try {
      // Try server recovery first if online
      if (this.isOnline && this.options.enableServerBackup) {
        const serverData = await this.recoverFromServer();
        if (serverData) return serverData;
      }

      // Fallback to localStorage
      if (this.options.enableLocalStorage) {
        return this.recoverFromLocalStorage();
      }

      return null;
    } catch (error) {
      console.error('Recovery failed:', error);
      return null;
    }
  }

  public async recoverSession(villaId: string): Promise<BackupData | null> {
    try {
      // Try server recovery first if online
      if (this.isOnline && this.options.enableServerBackup) {
        const serverData = await this.recoverFromServer(villaId);
        if (serverData) return serverData;
      }

      // Fallback to localStorage
      if (this.options.enableLocalStorage) {
        return this.recoverFromLocalStorage(villaId);
      }

      return null;
    } catch (error) {
      console.error('Recovery failed:', error);
      return null;
    }
  }

  private async recoverFromServer(villaId?: string): Promise<BackupData | null> {
    try {
      const url = villaId 
        ? `/api/onboarding/backup/${villaId}`
        : '/api/onboarding/backup/latest';
        
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Server recovery failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Server recovery failed:', error);
      return null;
    }
  }

  private recoverFromLocalStorage(villaId?: string): BackupData | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const key = villaId 
        ? `onboarding_backup_${villaId}`
        : 'onboarding_latest_backup';
        
      const data = localStorage.getItem(key);
      if (!data) return null;

      const backupData = JSON.parse(data) as BackupData;
      
      // Validate data structure
      if (!backupData.sessionId || !backupData.stepData) {
        return null;
      }

      return backupData;
    } catch (error) {
      console.warn('LocalStorage recovery failed:', error);
      return null;
    }
  }

  public async clearBackup(villaId?: string): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.options.enableLocalStorage) {
      promises.push(this.clearFromLocalStorage(villaId));
    }

    if (this.options.enableServerBackup && this.isOnline) {
      promises.push(this.clearFromServer(villaId));
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Backup cleanup error:', error);
    }
  }

  private async clearFromLocalStorage(villaId?: string): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      if (villaId) {
        localStorage.removeItem(`onboarding_backup_${villaId}`);
      } else {
        // Clear all onboarding backups
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('onboarding_backup_')) {
            localStorage.removeItem(key);
          }
        });
        localStorage.removeItem('onboarding_latest_backup');
      }
    } catch (error) {
      console.warn('LocalStorage cleanup failed:', error);
    }
  }

  private async clearFromServer(villaId?: string): Promise<void> {
    try {
      const url = villaId 
        ? `/api/onboarding/backup/${villaId}`
        : '/api/onboarding/backup';
        
      await fetch(url, { method: 'DELETE' });
    } catch (error) {
      console.warn('Server cleanup failed:', error);
    }
  }

  private setupOnlineDetection(): void {
    if (typeof window === 'undefined') return;

    this.isOnline = navigator.onLine;

    const handleOnline = async () => {
      this.isOnline = true;
      
      // Process retry queue
      if (this.retryQueue.length > 0) {
        toast.info('Connection restored - syncing data...');
        
        const queue = [...this.retryQueue];
        this.retryQueue = [];
        
        for (const retry of queue) {
          try {
            await retry();
          } catch (error) {
            console.warn('Retry failed:', error);
          }
        }
        
        toast.success('Data synchronized successfully');
      }
    };

    const handleOffline = () => {
      this.isOnline = false;
      toast.warning('Connection lost - data will be saved locally');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  private setupBeforeUnloadHandler(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', (event) => {
      // Force immediate save if there's pending data
      if (this.saveTimeout) {
        event.preventDefault();
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    });
  }

  private setupStorageCleanup(): void {
    if (typeof window === 'undefined') return;

    // Clean up old backups periodically (older than 7 days)
    const cleanupOldBackups = () => {
      try {
        const keys = Object.keys(localStorage);
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

        keys.forEach(key => {
          if (key.startsWith('onboarding_backup_')) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');
              const savedTime = new Date(data.lastSaved || 0).getTime();
              
              if (savedTime < cutoff) {
                localStorage.removeItem(key);
              }
            } catch {
              // If we can't parse it, remove it
              localStorage.removeItem(key);
            }
          }
        });
      } catch (error) {
        console.warn('Backup cleanup failed:', error);
      }
    };

    // Run cleanup on initialization and periodically
    cleanupOldBackups();
    setInterval(cleanupOldBackups, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public isBackupAvailable(): boolean {
    return this.options.enableLocalStorage || (this.options.enableServerBackup && this.isOnline);
  }
}

export default OnboardingBackupService;
export type { BackupData, BackupOptions };