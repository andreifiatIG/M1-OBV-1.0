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
  stepData: Record<string, any>;
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
  private api: ClientApiClient;
  private syncStatusCallbacks: Map<string, (status: SyncStatus) => void> = new Map();

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
      
      const response = await this.api.getOnboardingProgress(villaId);
      
      if (response.success && response.data) {
        const progressData: VillaProgressData = {
          villaId,
          currentStep: response.data.currentStep || 1,
          totalSteps: response.data.totalSteps || 10,
          completedSteps: response.data.completedSteps || [],
          stepData: response.data.stepData || {},
          progressPercentage: this.calculateProgressPercentage(
            response.data.completedSteps || [],
            response.data.totalSteps || 10
          ),
          lastUpdatedAt: new Date().toISOString(),
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
      console.log('🔄 Syncing villa profile for villa:', villaId);
      
      // Get both villa details and onboarding progress
      const [villaResponse, onboardingResponse] = await Promise.all([
        this.api.getVillaById(villaId),
        this.api.getOnboardingProgress(villaId)
      ]);

      if (villaResponse.success && onboardingResponse.success) {
        const villaData = villaResponse.data;
        const onboardingData = onboardingResponse.data;

        // Sync specific data points that might be out of sync
        const syncUpdates: any = {};
        let hasUpdates = false;

        // Check if basic villa info needs syncing
        if (onboardingData.stepData?.villaInfo) {
          const onboardingVillaInfo = onboardingData.stepData.villaInfo;
          
          if (villaData.villaName !== onboardingVillaInfo.villaName) {
            syncUpdates.villaName = onboardingVillaInfo.villaName;
            hasUpdates = true;
          }
          
          if (villaData.location !== onboardingVillaInfo.location) {
            syncUpdates.location = onboardingVillaInfo.location;
            hasUpdates = true;
          }
        }

        // Check if owner details need syncing
        if (onboardingData.stepData?.ownerDetails) {
          const onboardingOwnerDetails = onboardingData.stepData.ownerDetails;
          
          // Update owner details through separate API call
          await this.api.updateOwnerDetails(villaId, onboardingOwnerDetails);
        }

        // Apply villa updates if needed
        if (hasUpdates) {
          await this.api.updateVilla(villaId, syncUpdates);
        }

        console.log('✅ Villa profile synced successfully');
        this.notifySyncStatus({ 
          syncing: false, 
          success: true, 
          lastSyncAt: new Date().toISOString() 
        });
        return true;
      } else {
        throw new Error('Failed to fetch villa or onboarding data');
      }
    } catch (error) {
      console.error('❌ Failed to sync villa profile:', error);
      this.notifySyncStatus({ 
        syncing: false, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Sync owner data between dashboard and onboarding
   */
  async syncOwnerData(villaId: string): Promise<OwnerData | null> {
    this.notifySyncStatus({ syncing: true, success: false });

    try {
      console.log('🔄 Syncing owner data for villa:', villaId);
      
      // Get onboarding data which might have more recent owner info
      const onboardingResponse = await this.api.getOnboardingProgress(villaId);
      
      if (onboardingResponse.success && onboardingResponse.data?.stepData?.ownerDetails) {
        const ownerData = onboardingResponse.data.stepData.ownerDetails;
        
        // Update owner details in the main villa record
        const updateResponse = await this.api.updateOwnerDetails(villaId, ownerData);
        
        if (updateResponse.success) {
          const syncedOwnerData: OwnerData = {
            id: villaId, // Using villaId as owner reference
            firstName: ownerData.firstName,
            lastName: ownerData.lastName,
            email: ownerData.email,
            phone: ownerData.phone,
            nationality: ownerData.nationality,
            villaId,
            updatedAt: new Date().toISOString(),
          };

          console.log('✅ Owner data synced successfully');
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
      console.error('❌ Failed to sync owner data:', error);
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
    console.log('🔄 Starting complete data sync for villa:', villaId);
    
    const [progress, owner, profileSynced] = await Promise.all([
      this.syncOnboardingProgress(villaId),
      this.syncOwnerData(villaId),
      this.syncVillaProfile(villaId)
    ]);

    console.log('✅ Complete data sync finished for villa:', villaId);
    
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
      console.log('🔄 Fixing staff and documents visibility for villa:', villaId);
      
      const onboardingResponse = await this.api.getOnboardingProgress(villaId);
      
      if (onboardingResponse.success && onboardingResponse.data) {
        const stepData = onboardingResponse.data.stepData || {};
        
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

        console.log('✅ Staff and documents visibility fixed');
        this.notifySyncStatus({ 
          syncing: false, 
          success: true, 
          lastSyncAt: new Date().toISOString() 
        });
        
        return true;
      }
      
      throw new Error('Failed to get onboarding progress');
    } catch (error) {
      console.error('❌ Failed to fix staff and documents visibility:', error);
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