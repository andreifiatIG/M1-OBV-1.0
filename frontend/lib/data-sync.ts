// Data Synchronization Utilities for Villa Management System

import { ClientApiClient } from './api-client';

export interface SyncStatus {
  syncing: boolean;
  lastSyncAt?: string;
  error?: string;
  success: boolean;
}

export interface VillaProgressData {
  villaId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  stepData: Record<string, unknown>;
  progressPercentage: number;
  lastUpdatedAt: string;
}

export interface OwnerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality?: string;
  villaId: string;
  updatedAt: string;
}

export class DataSyncManager {
  private readonly api: ClientApiClient;
  private readonly syncStatusCallbacks: Map<string, (status: SyncStatus) => void> = new Map();

  constructor(apiClient: ClientApiClient) {
    this.api = apiClient;
  }

  // Subscribe to sync status updates
  onSyncStatusChange(key: string, callback: (status: SyncStatus) => void) {
    this.syncStatusCallbacks.set(key, callback);
  }

  // Unsubscribe from sync status updates
  offSyncStatusChange(key: string) {
    this.syncStatusCallbacks.delete(key);
  }

  private notifySyncStatus(status: SyncStatus) {
    this.syncStatusCallbacks.forEach(callback => callback(status));
  }

  /**
   * Sync onboarding progress with my-villas page
   */
  async syncOnboardingProgress(villaId: string): Promise<VillaProgressData | null> {
    this.notifySyncStatus({ syncing: true, success: false });

    try {
      console.log('🔄 Syncing onboarding progress for villa:', villaId);
      
      // Prefer lightweight summary endpoint for dashboard views
      let response = await this.api.getOnboardingProgressSummary(villaId);

      if (!response.success) {
        console.warn('Summary endpoint unavailable, falling back to full progress fetch');
        response = await this.api.getOnboardingProgress(villaId);
      }
      
      if (response.success && response.data) {
        const data = response.data as {
          currentStep?: number;
          totalSteps?: number;
          completedSteps?: number[];
          stepData?: Record<string, unknown>;
          completedStepsCount?: number;
          completionPercentage?: number;
          lastUpdatedAt?: string;
        };
        const completedSteps = Array.isArray(data.completedSteps) ? data.completedSteps : [];
        const totalSteps = data.totalSteps || 10;
        const progressPercentage = typeof data.completionPercentage === 'number'
          ? data.completionPercentage
          : this.calculateProgressPercentage(completedSteps, totalSteps);
        const progressData: VillaProgressData = {
          villaId,
          currentStep: data.currentStep || 1,
          totalSteps,
          completedSteps,
          stepData: data.stepData || {},
          progressPercentage,
          lastUpdatedAt: data.lastUpdatedAt || new Date().toISOString(),
        };

        console.log('✅ Onboarding progress synced successfully');
        this.notifySyncStatus({ 
          syncing: false, 
          success: true, 
          lastSyncAt: new Date().toISOString() 
        });
        
        return progressData;
      } else {
        throw new Error(response.error || 'Failed to fetch onboarding progress');
      }
    } catch (error) {
      console.error('❌ Failed to sync onboarding progress:', error);
      this.notifySyncStatus({ 
        syncing: false, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Sync villa profile data with onboarding session
   */
  async syncVillaProfile(villaId: string): Promise<boolean> {
    this.notifySyncStatus({ syncing: true, success: false });

    try {
      console.log('Syncing villa profile for villa:', villaId);

      const { villaData, onboardingData } = await this.fetchVillaAndOnboardingData(villaId);

      await this.syncVillaInfo(villaId, villaData, onboardingData);
      await this.syncOwnerDetails(villaId, onboardingData);

      console.log('Villa profile synced successfully');
      this.notifySyncStatus({
        syncing: false,
        success: true,
        lastSyncAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Failed to sync villa profile:', error);
      this.notifySyncStatus({
        syncing: false,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private async fetchVillaAndOnboardingData(villaId: string) {
    const [villaResponse, onboardingResponse] = await Promise.all([
      this.api.getVilla(villaId),
      this.api.getOnboardingProgress(villaId)
    ]);

    if (!villaResponse.success || !onboardingResponse.success) {
      throw new Error('Failed to fetch villa or onboarding data');
    }

    return {
      villaData: villaResponse.data as Record<string, unknown>,
      onboardingData: onboardingResponse.data as Record<string, unknown>
    };
  }

  private async syncVillaInfo(villaId: string, villaData: Record<string, unknown>, onboardingData: Record<string, unknown>) {
    const syncUpdates: Record<string, unknown> = {};
    let hasUpdates = false;

    const stepData = onboardingData.stepData as Record<string, unknown> | undefined;
    if (stepData?.villaInfo) {
      const onboardingVillaInfo = stepData.villaInfo as Record<string, unknown>;

      if (villaData.villaName !== onboardingVillaInfo.villaName) {
        syncUpdates.villaName = onboardingVillaInfo.villaName;
        hasUpdates = true;
      }

      if (villaData.location !== onboardingVillaInfo.location) {
        syncUpdates.location = onboardingVillaInfo.location;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await this.api.updateVilla(villaId, syncUpdates);
    }
  }

  private async syncOwnerDetails(villaId: string, onboardingData: Record<string, unknown>) {
    const stepData = onboardingData.stepData as Record<string, unknown> | undefined;
    if (stepData?.ownerDetails) {
      const onboardingOwnerDetails = stepData.ownerDetails;
      await this.api.updateOwnerDetails(villaId, onboardingOwnerDetails as Record<string, unknown>);
    }
  }

  /**
   * Sync owner data between dashboard and onboarding
   */
  async syncOwnerData(villaId: string): Promise<OwnerData | null> {
    this.notifySyncStatus({ syncing: true, success: false });

    try {
      console.log('Syncing owner data for villa:', villaId);
      
      // Get onboarding data which might have more recent owner info
      const onboardingResponse = await this.api.getOnboardingProgress(villaId);
      
      const responseData = onboardingResponse.data as { stepData?: { ownerDetails?: Record<string, unknown> } };
      if (onboardingResponse.success && responseData?.stepData?.ownerDetails) {
        const ownerData = responseData.stepData.ownerDetails;
        
        // Update owner details in the main villa record
        const updateResponse = await this.api.updateOwnerDetails(villaId, ownerData);
        
        if (updateResponse.success) {
          const syncedOwnerData: OwnerData = {
            id: villaId, // Using villaId as owner reference
            firstName: (ownerData.firstName as string) || '',
            lastName: (ownerData.lastName as string) || '',
            email: (ownerData.email as string) || '',
            phone: (ownerData.phone as string) || '',
            nationality: (ownerData.nationality as string) || undefined,
            villaId,
            updatedAt: new Date().toISOString(),
          };

          console.log('Owner data synced successfully');
          this.notifySyncStatus({ 
            syncing: false, 
            success: true, 
            lastSyncAt: new Date().toISOString() 
          });
          
          return syncedOwnerData;
        }
      }
      
      throw new Error('No owner data found in onboarding session');
    } catch (error) {
      console.error('Failed to sync owner data:', error);
      this.notifySyncStatus({ 
        syncing: false, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Batch sync all data for a villa
   */
  async syncAllVillaData(villaId: string): Promise<{
    progress: VillaProgressData | null;
    owner: OwnerData | null;
    profileSynced: boolean;
  }> {
    console.log('Starting complete data sync for villa:', villaId);
    
    const [progress, owner, profileSynced] = await Promise.all([
      this.syncOnboardingProgress(villaId),
      this.syncOwnerData(villaId),
      this.syncVillaProfile(villaId)
    ]);

    console.log('Complete data sync finished for villa:', villaId);
    
    return {
      progress,
      owner,
      profileSynced
    };
  }

  /**
   * Fix staff and documents visibility by ensuring proper data structure
   */
  async fixStaffDocumentsVisibility(villaId: string): Promise<boolean> {
    this.notifySyncStatus({ syncing: true, success: false });

    try {
      console.log('Fixing staff and documents visibility for villa:', villaId);
      
      const onboardingResponse = await this.api.getOnboardingProgress(villaId);
      
      if (onboardingResponse.success && onboardingResponse.data) {
        const stepData = (onboardingResponse.data as Record<string, unknown> & { stepData?: Record<string, unknown> }).stepData || {};
        
        // Ensure staff data structure exists
        if (!stepData.staffConfiguration) {
          stepData.staffConfiguration = {
            villaManager: { name: '', phone: '', email: '' },
            housekeeper: { name: '', phone: '', email: '' },
            gardener: { name: '', phone: '', email: '' },
            poolMaintenance: { name: '', phone: '', email: '' },
            emergencyContact: { name: '', phone: '', email: '', relationship: '' }
          };
        }

        // Ensure documents data structure exists
        if (!stepData.documents) {
          stepData.documents = {
            propertyTitle: null,
            businessLicense: null,
            taxCertificate: null,
            insurancePolicy: null,
            bankStatement: null
          };
        }

        // Update the onboarding session with proper structure
        await this.api.updateOnboardingProgress(villaId, {
          stepData,
          updatedAt: new Date().toISOString()
        });

        console.log('Staff and documents visibility fixed');
        this.notifySyncStatus({ 
          syncing: false, 
          success: true, 
          lastSyncAt: new Date().toISOString() 
        });
        
        return true;
      }
      
      throw new Error('Failed to get onboarding progress');
    } catch (error) {
      console.error('Failed to fix staff and documents visibility:', error);
      this.notifySyncStatus({ 
        syncing: false, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  private calculateProgressPercentage(completedSteps: number[], totalSteps: number): number {
    if (totalSteps === 0) return 0;
    return Math.round((completedSteps.length / totalSteps) * 100);
  }
}

// Create a singleton instance for global use
export const createDataSyncManager = (apiClient: ClientApiClient) => {
  return new DataSyncManager(apiClient);
};
