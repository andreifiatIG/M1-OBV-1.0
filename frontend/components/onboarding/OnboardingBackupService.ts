"use client";

import { toast } from 'sonner';

interface BackupData {
  sessionId: string;
  villaId?: string;
  currentStep: number;
  stepData: Record<number, unknown>;
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
  private readonly sessionId: string;
  private saveTimeout?: NodeJS.Timeout;
  private readonly options: Required<BackupOptions>;
  private isOnline: boolean = true;
  private retryQueue: (() => Promise<void>)[] = [];
  private readonly apiUrl: string;
  private getAuthToken: (() => Promise<string | null>) | null = null;

  private constructor(options: BackupOptions = {}) {
    this.sessionId = this.generateSessionId();
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    this.options = {
      debounceMs: options.debounceMs ?? 2000,
      maxRetries: options.maxRetries ?? 3,
      enableLocalStorage: options.enableLocalStorage ?? true,
      // Temporarily disable server backup to isolate the issue
      enableServerBackup: process.env.NODE_ENV === 'production' ? (options.enableServerBackup ?? true) : false,
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

  public setAuthTokenProvider(getToken: () => Promise<string | null>): void {
    this.getAuthToken = getToken;
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `onboarding_${timestamp}_${random}`;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.getAuthToken) {
      try {
        const token = await this.getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('Failed to get auth token for backup service:', error);
      }
    }

    return headers;
  }

  public async saveProgress(
    villaId: string | undefined,
    currentStep: number,
    stepData: Record<number, unknown>
  ): Promise<void> {
    // Always save to localStorage immediately for instant persistence
    if (this.options.enableLocalStorage) {
      const backupData: BackupData = {
        sessionId: this.sessionId,
        villaId,
        currentStep,
        stepData,
        lastSaved: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
        version: '1.0',
      };
      await this.saveToLocalStorage(backupData);
    }

    // Debounce server backup
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
    stepData: Record<number, unknown>
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
    stepData: Record<number, unknown>
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
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${this.apiUrl}/api/onboarding/backup`, {
          method: 'POST',
          headers,
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
        ? `${this.apiUrl}/api/onboarding/backup/${villaId}`
        : `${this.apiUrl}/api/onboarding/backup/latest`;
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(url, { headers });
      
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

      let data: BackupData | null = null;

      if (villaId) {
        // Try to recover specific villa backup
        const villaKey = `onboarding_backup_${villaId}`;
        const villaStored = localStorage.getItem(villaKey);
        if (villaStored) {
          try {
            data = JSON.parse(villaStored) as BackupData;
          } catch (parseError) {
            console.warn('Failed to parse villa-specific backup:', parseError);
          }
        }
      }

      // If no villa-specific backup found, try latest backup
      if (!data) {
        const latestStored = localStorage.getItem('onboarding_latest_backup');
        if (latestStored) {
          try {
            data = JSON.parse(latestStored) as BackupData;
          } catch (parseError) {
            console.warn('Failed to parse latest backup:', parseError);
          }
        }
      }

      // If still no data, try to find any onboarding backup
      if (!data) {
        const allKeys = Object.keys(localStorage);
        const backupKeys = allKeys.filter(key => key.startsWith('onboarding_backup_'));

        for (const key of backupKeys) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const potentialData = JSON.parse(stored) as BackupData;
              if (potentialData.sessionId && potentialData.stepData) {
                data = potentialData;
                break;
              }
            }
          } catch (parseError) {
            console.warn(`Failed to parse backup from key ${key}:`, parseError);
          }
        }
      }

      if (!data) {
        return null;
      }

      // Validate the backup data
      if (!data.sessionId || !data.stepData) {
        console.warn('Invalid backup data found');
        return null;
      }

      // Check if backup is recent (within 24 hours)
      const backupAge = Date.now() - new Date(data.lastSaved).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (backupAge > maxAge) {
        console.warn('Backup data is too old, skipping recovery');
        return null;
      }

      console.log('✅ Recovered backup data:', {
        villaId: data.villaId,
        currentStep: data.currentStep,
        stepCount: Object.keys(data.stepData).length,
        lastSaved: data.lastSaved,
        age: Math.round(backupAge / 1000 / 60) + ' minutes ago'
      });

      return data;
    } catch (error) {
      console.error('LocalStorage recovery failed:', error);
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
        ? `${this.apiUrl}/api/onboarding/backup/${villaId}`
        : `${this.apiUrl}/api/onboarding/backup`;
      
      const headers = await this.getAuthHeaders();
      await fetch(url, { method: 'DELETE', headers });
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