'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { EnhancedApiClient } from '@/lib/api-client-enhanced';
import { useEnhancedAutoSave } from '@/lib/autoSaveManager-enhanced';
import { mapOnboardingDataToBackend, mapOnboardingDataFromBackend } from '@/lib/data-mapper';
import ProgressTracker from './ProgressTracker';
import { ProgressIndicator } from './ProgressIndicator';
import { toast } from 'sonner';
import { AlertCircle, Wifi, WifiOff, Database, Clock, Zap } from 'lucide-react';
import { StepHandle } from './steps/types';
import ErrorBoundary, { WizardErrorBoundary, StepErrorBoundary } from './ErrorBoundary';
import OnboardingBackupService, { BackupData } from './OnboardingBackupService';
import RecoveryModal from './RecoveryModal';
import ValidationProvider from './ValidationProvider';
import ValidationSummary from './ValidationSummary';

// Step imports
import VillaInformationStepEnhanced from './steps/VillaInformationStepEnhanced';
import OwnerDetailsStep from './steps/OwnerDetailsStep';
import ContractualDetailsStep from './steps/ContractualDetailsStep';
import BankDetailsStep from './steps/BankDetailsStep';
import OTACredentialsStep from './steps/OTACredentialsStep';
import DocumentsUploadStep from './steps/DocumentsUploadStep';
import StaffConfiguratorStep from './steps/StaffConfiguratorStep';
import FacilitiesChecklistStep from './steps/FacilitiesChecklistStep';
import PhotoUploadStep from './steps/PhotoUploadStep';
import ReviewSubmitStep from './steps/ReviewSubmitStep';

// Enhanced status indicators component
const EnhancedStatusIndicator: React.FC<{
  apiClient: EnhancedApiClient;
  autoSaveState: any;
  performanceMetrics: any;
}> = ({ apiClient, autoSaveState, performanceMetrics }) => {
  const [queueStatus, setQueueStatus] = useState(apiClient.getQueueStatus());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueStatus(apiClient.getQueueStatus());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [apiClient]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        queueStatus.online 
          ? 'bg-green-50 text-green-700 border border-green-200' 
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        {queueStatus.online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {queueStatus.online ? 'Online' : 'Offline'}
        {queueStatus.offlineQueue > 0 && (
          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
            {queueStatus.offlineQueue} queued
          </span>
        )}
      </div>

      {/* Auto-save Status */}
      {(autoSaveState.isSaving || autoSaveState.pendingChanges) && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
          autoSaveState.isSaving 
            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          {autoSaveState.isSaving ? (
            <>
              <Database className="w-4 h-4 animate-spin" />
              Saving...
              {autoSaveState.lastBatchSize && (
                <span className="text-xs opacity-75">({autoSaveState.lastBatchSize} items)</span>
              )}
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              {autoSaveState.queueSize} pending
            </>
          )}
        </div>
      )}

      {/* Performance Indicator */}
      {performanceMetrics.successRate < 90 && performanceMetrics.totalSaves > 5 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-50 text-orange-700 border border-orange-200">
          <AlertCircle className="w-4 h-4" />
          Low success rate: {Math.round(performanceMetrics.successRate)}%
        </div>
      )}

      {/* Last saved indicator */}
      {autoSaveState.lastSaved && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 bg-gray-50 border border-gray-200">
          <Zap className="w-3 h-3" />
          Saved {formatTimeAgo(autoSaveState.lastSaved)}
        </div>
      )}
    </div>
  );
};

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
};

const OnboardingWizardEnhancedV2: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [localStepData, setLocalStepData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<Record<string, any>>({});
  
  // Enhanced API Client
  const [apiClient] = useState(() => new EnhancedApiClient());
  
  // Enhanced Auto-save with optimized configuration
  const autoSave = useEnhancedAutoSave({
    debounceDelay: 1500, // 1.5 second debounce
    interval: 25000, // 25 second interval
    batchSize: 8, // Reasonable batch size
    compressionEnabled: true,
    priorityLevels: true,
    maxRetries: 2,
  });

  // Backup and recovery state
  const [backupService] = useState(() => OnboardingBackupService.getInstance());
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<BackupData | null>(null);
  
  const stepRefs = useRef<(StepHandle | null)[]>([]);
  const villaIdRef = useRef<string>('');
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState(autoSave.getPerformanceMetrics());

  // Update performance metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceMetrics(autoSave.getPerformanceMetrics());
    }, 5000); // Every 5 seconds
    
    return () => clearInterval(interval);
  }, [autoSave]);

  // Enhanced save function using the new API client
  const saveFunction = useCallback(async (dataMap: Map<string, any>) => {
    const operations = Array.from(dataMap.entries()).map(([key, data]) => {
      // Determine priority based on data type
      let priority = 1;
      if (key.includes('villa-information')) priority = 5; // Highest priority
      else if (key.includes('owner-details')) priority = 4;
      else if (key.includes('bank-details')) priority = 3;
      else if (key.includes('documents') || key.includes('photos')) priority = 2;

      return {
        endpoint: `/api/onboarding/${villaIdRef.current}/step`,
        data: {
          step: key,
          data: mapOnboardingDataToBackend(data, key),
        },
        priority,
      };
    });

    if (operations.length > 0) {
      await apiClient.batchSave(operations);
    }
  }, [apiClient]);

  // Initialize authentication and data loading
  useEffect(() => {
    const initializeAuth = async () => {
      if (!user) return;

      try {
        const token = await getToken();
        apiClient.setToken(token);
        
        // Check for recovery data
        const backups = backupService.getAllBackups();
        const latestBackup = backups
          .filter(b => b.userId === user.id)
          .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())[0];
          
        if (latestBackup && !hasLoadedInitialData) {
          setRecoveryData(latestBackup);
          setShowRecoveryModal(true);
        }

        setHasLoadedInitialData(true);
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
        toast.error('Failed to initialize authentication');
      }
    };

    initializeAuth();
  }, [user, getToken, apiClient, backupService, hasLoadedInitialData]);

  // Enhanced auto-save integration
  useEffect(() => {
    if (Object.keys(localStepData).length === 0) return;

    // Queue each step data for saving with appropriate priority
    Object.entries(localStepData).forEach(([stepKey, stepData]) => {
      if (JSON.stringify(stepData) !== JSON.stringify(lastSavedData[stepKey])) {
        let priority = 1;
        
        // Prioritize critical steps
        if (stepKey.includes('villa-information')) priority = 5;
        else if (stepKey.includes('owner-details')) priority = 4;
        else if (stepKey.includes('bank-details')) priority = 3;
        
        autoSave.queueSave(stepKey, stepData, priority);
      }
    });

    setLastSavedData({ ...localStepData });
  }, [localStepData, lastSavedData, autoSave]);

  // Auto-save execution
  useEffect(() => {
    if (autoSave.state.pendingChanges && !autoSave.state.isSaving) {
      const executeAutoSave = async () => {
        try {
          await autoSave.forceSave(saveFunction);
          
          // Success feedback (less intrusive)
          if (process.env.NODE_ENV === 'development') {
            console.log('[OK] Auto-save completed successfully');
          }
        } catch (error) {
          console.error('❌ Auto-save failed:', error);
          toast.error('Auto-save failed. Your progress is backed up locally.', {
            description: 'We\'ll retry automatically when connection is restored.',
          });
        }
      };

      executeAutoSave();
    }
  }, [autoSave.state.pendingChanges, autoSave.state.isSaving, saveFunction, autoSave]);

  // Enhanced step data update handler
  const handleStepUpdate = useCallback((stepKey: string, stepData: any) => {
    setLocalStepData(prev => ({
      ...prev,
      [stepKey]: stepData,
    }));

    // Create backup
    if (user) {
      backupService.createBackup({
        userId: user.id,
        villaId: villaIdRef.current,
        stepData: { ...localStepData, [stepKey]: stepData },
        currentStep,
        lastModified: new Date().toISOString(),
      });
    }
  }, [localStepData, currentStep, user, backupService]);

  // Recovery modal handlers
  const handleRecoveryAccept = useCallback((backupData: BackupData) => {
    setLocalStepData(backupData.stepData);
    setCurrentStep(backupData.currentStep);
    villaIdRef.current = backupData.villaId;
    setShowRecoveryModal(false);
    toast.success('Previous session restored successfully');
  }, []);

  const handleRecoveryReject = useCallback(() => {
    setShowRecoveryModal(false);
    if (recoveryData) {
      backupService.deleteBackup(recoveryData.userId, recoveryData.villaId);
    }
  }, [backupService, recoveryData]);

  // Step navigation with auto-save
  const handleNextStep = useCallback(async () => {
    if (currentStep < 10) {
      // Force save before moving to next step
      if (autoSave.state.pendingChanges) {
        await autoSave.forceSave(saveFunction);
      }
      
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, autoSave, saveFunction]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Final submission with enhanced error handling
  const handleFinalSubmit = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Force save all pending changes first
      await autoSave.forceSave(saveFunction);
      
      // Submit for review
      const response = await apiClient.request(`/api/onboarding/${villaIdRef.current}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          finalData: localStepData,
          submissionTime: new Date().toISOString(),
        }),
      });

      if (response.success) {
        // Clear backup on successful submission
        if (user) {
          backupService.deleteBackup(user.id, villaIdRef.current);
        }
        autoSave.clearQueue();
        
        toast.success('Onboarding submitted successfully!', {
          description: 'Your villa will be reviewed by our team.',
        });
      } else {
        throw new Error(response.error || 'Submission failed');
      }
    } catch (error) {
      console.error('❌ Final submission failed:', error);
      toast.error('Submission failed. Please try again.', {
        description: 'Your progress has been saved automatically.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, autoSave, saveFunction, localStepData, user, backupService]);

  // Render step component
  const renderStep = () => {
    const commonProps = {
      data: localStepData,
      onUpdate: (stepData: any) => handleStepUpdate(`step-${currentStep}`, stepData),
      isLoading,
      ref: (ref: StepHandle) => { stepRefs.current[currentStep - 1] = ref; },
    };

    switch (currentStep) {
      case 1: return <VillaInformationStepEnhanced {...commonProps} />;
      case 2: return <OwnerDetailsStep {...commonProps} />;
      case 3: return <ContractualDetailsStep {...commonProps} />;
      case 4: return <BankDetailsStep {...commonProps} />;
      case 5: return <OTACredentialsStep {...commonProps} />;
      case 6: return <DocumentsUploadStep {...commonProps} />;
      case 7: return <StaffConfiguratorStep {...commonProps} />;
      case 8: return <FacilitiesChecklistStep {...commonProps} />;
      case 9: return <PhotoUploadStep {...commonProps} />;
      case 10: return <ReviewSubmitStep {...commonProps} onSubmit={handleFinalSubmit} />;
      default: return null;
    }
  };

  return (
    <ValidationProvider>
      <WizardErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          {/* Enhanced Status Indicators */}
          <EnhancedStatusIndicator 
            apiClient={apiClient}
            autoSaveState={autoSave.state}
            performanceMetrics={performanceMetrics}
          />

          {/* Recovery Modal */}
          {showRecoveryModal && recoveryData && (
            <RecoveryModal
              backupData={recoveryData}
              onAccept={() => handleRecoveryAccept(recoveryData)}
              onReject={handleRecoveryReject}
            />
          )}

          <div className="container mx-auto px-4 py-8">
            {/* Progress Indicator */}
            <div className="mb-8">
              <ProgressIndicator 
                currentStep={currentStep} 
                totalSteps={10}
                autoSaveState={autoSave.state}
              />
            </div>

            {/* Progress Tracker */}
            <div className="mb-6">
              <ProgressTracker 
                currentStep={currentStep}
                stepData={localStepData}
                isAutoSaveEnabled={true}
                lastSaved={autoSave.state.lastSaved}
                performanceMetrics={performanceMetrics}
              />
            </div>

            {/* Validation Summary */}
            <ValidationSummary />

            {/* Main Step Content */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <StepErrorBoundary stepNumber={currentStep}>
                {renderStep()}
              </StepErrorBoundary>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
                className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center gap-4">
                {autoSave.state.pendingChanges && (
                  <span className="text-sm text-yellow-600 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Auto-saving...
                  </span>
                )}
                
                <button
                  onClick={handleNextStep}
                  disabled={currentStep === 10 || isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {currentStep === 10 ? 'Review & Submit' : 'Next Step'}
                </button>
              </div>
            </div>

            {/* Debug Info (Development only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Debug Info</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Queue Status: {JSON.stringify(apiClient.getQueueStatus(), null, 2)}</p>
                  <p>Auto-save State: {JSON.stringify(autoSave.state, null, 2)}</p>
                  <p>Performance: {JSON.stringify(performanceMetrics, null, 2)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </WizardErrorBoundary>
    </ValidationProvider>
  );
};

export default OnboardingWizardEnhancedV2;