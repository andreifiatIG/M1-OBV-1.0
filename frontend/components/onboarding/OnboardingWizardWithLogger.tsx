'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { loggedApiClient } from '@/lib/api-client-logged';
import { OnboardingPersistence } from '@/lib/onboarding-persistence';
import { logger, LogCategory, configureLogger, LogLevel } from '@/lib/logger';
import { mapOnboardingDataToBackend, mapOnboardingDataFromBackend } from '@/lib/data-mapper';
import ProgressTracker from './ProgressTracker';
import { ProgressIndicator } from './ProgressIndicator';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { StepHandle } from './steps/types';
import ErrorBoundary, { WizardErrorBoundary, StepErrorBoundary } from './ErrorBoundary';
import OnboardingBackupService, { BackupData } from './OnboardingBackupService';
import RecoveryModal from './RecoveryModal';
import ValidationProvider from './ValidationProvider';
import ValidationSummary from './ValidationSummary';

// Direct imports to avoid chunk loading issues
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

// Configure logger for production
if (process.env.NODE_ENV === 'production') {
  configureLogger({
    level: LogLevel.WARN,
    categories: [LogCategory.API, LogCategory.DATABASE, LogCategory.ONBOARDING],
  });
} else {
  configureLogger({
    level: LogLevel.INFO,
    categories: [
      LogCategory.API,
      LogCategory.AUTOSAVE,
      LogCategory.DATABASE,
      LogCategory.ONBOARDING,
      LogCategory.FILEUPLOAD,
    ],
  });
}

const OnboardingWizardWithLogger: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [localStepData, setLocalStepData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [autoSaveEnabled] = useState(true);
  const [lastSavedData, setLastSavedData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [villaId, setVillaId] = useState<string>('');
  
  // Persistence handler
  const persistenceRef = useRef<OnboardingPersistence | null>(null);
  
  // Backup and recovery state
  const [backupService] = useState(() => OnboardingBackupService.getInstance());
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<BackupData | null>(null);
  
  const stepRefs = useRef<(StepHandle | null)[]>([]);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<Record<string, any>>({});

  // Initialize logger session
  useEffect(() => {
    logger.startGroup('onboarding-session', 'Onboarding Wizard Session');
    logger.info(LogCategory.ONBOARDING, 'Session started', { userId: user?.id });
    
    return () => {
      logger.info(LogCategory.ONBOARDING, 'Session ended', { userId: user?.id });
      logger.endGroup('onboarding-session');
    };
  }, [user]);

  // Initialize API client with auth token
  useEffect(() => {
    const initAuth = async () => {
      if (!user) return;
      
      const token = await getToken();
      if (token) {
        loggedApiClient.setToken(token);
        logger.info(LogCategory.AUTH, 'Authentication initialized', { userId: user.id });
      }
    };
    
    initAuth();
  }, [user, getToken]);

  // Create or retrieve villa ID
  useEffect(() => {
    const initVilla = async () => {
      if (!user || villaId) return;
      
      try {
        logger.onboardingStep('Initialization', 'Creating villa', { userId: user.id });
        
        // Try to get existing villa or create new one
        const response = await loggedApiClient.startOnboarding(user.id, {
          ownerEmail: user.emailAddresses[0]?.emailAddress,
        });
        
        if (response.success && response.data?.villaId) {
          setVillaId(response.data.villaId);
          logger.info(LogCategory.ONBOARDING, 'Villa initialized', { 
            villaId: response.data.villaId,
            isNew: response.data.isNew 
          });
          
          // Initialize persistence handler
          persistenceRef.current = new OnboardingPersistence({
            villaId: response.data.villaId,
            userId: user.id,
            autoSave: autoSaveEnabled,
            debounceMs: 2000,
          });
          
          // Load existing data
          await loadExistingData(response.data.villaId);
        }
      } catch (error) {
        logger.error(LogCategory.ONBOARDING, 'Failed to initialize villa', { error });
        toast.error('Failed to initialize onboarding session');
      }
    };
    
    initVilla();
  }, [user, villaId, autoSaveEnabled]);

  // Load existing onboarding data
  const loadExistingData = async (villaId: string) => {
    try {
      logger.startGroup('load-existing', 'Loading existing onboarding data');
      
      const data = await persistenceRef.current?.loadAllData();
      
      if (data && Object.keys(data).length > 0) {
        setLocalStepData(data);
        setLastSavedData(data);
        logger.info(LogCategory.DATABASE, 'Existing data loaded', {
          villaId,
          steps: Object.keys(data),
        });
        
        // Check for recovery data
        const backups = backupService.getAllBackups();
        const latestBackup = backups
          .filter(b => b.userId === user?.id && b.villaId === villaId)
          .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())[0];
          
        if (latestBackup) {
          setRecoveryData(latestBackup);
          setShowRecoveryModal(true);
        }
      }
      
      setHasLoadedInitialData(true);
      logger.endGroup('load-existing');
    } catch (error) {
      logger.error(LogCategory.DATABASE, 'Failed to load existing data', { error });
      setHasLoadedInitialData(true);
    }
  };

  // Handle step data updates
  const handleStepUpdate = useCallback(async (stepData: any) => {
    const stepKey = `step-${currentStep}`;
    logger.onboardingStep(stepKey, 'Updated', { dataKeys: Object.keys(stepData) });
    
    setLocalStepData(prev => ({
      ...prev,
      [stepKey]: stepData,
    }));
    
    // Handle specific stage persistence
    if (persistenceRef.current) {
      try {
        switch (currentStep) {
          case 6: // Documents
            if (stepData.documents) {
              await persistenceRef.current.saveDocuments(stepData.documents);
            }
            break;
          case 7: // Staff
            if (stepData.staff) {
              await persistenceRef.current.saveStaff(stepData.staff);
            }
            break;
          case 8: // Facilities
            if (stepData.facilities) {
              await persistenceRef.current.saveFacilities(stepData.facilities);
            }
            break;
          case 9: // Photos
            if (stepData.photos) {
              await persistenceRef.current.savePhotos(stepData.photos);
            }
            break;
          default:
            // Generic save for other steps
            await loggedApiClient.saveOnboardingStep(villaId, stepKey, stepData);
        }
      } catch (error) {
        logger.error(LogCategory.AUTOSAVE, 'Failed to save step data', { 
          step: stepKey, 
          error 
        });
      }
    }
    
    // Create backup
    if (user) {
      backupService.createBackup({
        userId: user.id,
        villaId,
        stepData: { ...localStepData, [stepKey]: stepData },
        currentStep,
        lastModified: new Date().toISOString(),
      });
    }
  }, [currentStep, localStepData, user, villaId, backupService]);

  // Auto-save functionality with debounce
  const performAutoSave = useCallback(async () => {
    if (!autoSaveEnabled || !villaId || Object.keys(pendingSaveRef.current).length === 0) {
      return;
    }
    
    const timer = logger.startTimer('Auto-save operation');
    setIsSaving(true);
    
    try {
      const dataToSave = { ...pendingSaveRef.current };
      pendingSaveRef.current = {};
      
      logger.autoSave('Executing', Object.keys(dataToSave).length, true);
      
      // Save each step's data
      const savePromises = Object.entries(dataToSave).map(([stepKey, stepData]) => 
        loggedApiClient.saveOnboardingStep(villaId, stepKey, mapOnboardingDataToBackend(stepData, stepKey))
      );
      
      const results = await Promise.allSettled(savePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      logger.autoSave('Completed', Object.keys(dataToSave).length, successCount === results.length);
      
      if (successCount < results.length) {
        toast.warning('Some data could not be saved. It will be retried.');
      }
      
      setLastSavedData(prev => ({ ...prev, ...dataToSave }));
      
    } catch (error) {
      logger.error(LogCategory.AUTOSAVE, 'Auto-save failed', { error });
      toast.error('Auto-save failed. Your data is backed up locally.');
    } finally {
      setIsSaving(false);
      timer();
    }
  }, [autoSaveEnabled, villaId]);

  // Debounced auto-save trigger
  useEffect(() => {
    if (!autoSaveEnabled || Object.keys(localStepData).length === 0) {
      return;
    }
    
    // Check for changes
    const hasChanges = Object.keys(localStepData).some(key => 
      JSON.stringify(localStepData[key]) !== JSON.stringify(lastSavedData[key])
    );
    
    if (hasChanges) {
      pendingSaveRef.current = localStepData;
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave();
      }, 2000); // 2 second debounce
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [localStepData, lastSavedData, autoSaveEnabled, performAutoSave]);

  // Navigation handlers
  const handleNextStep = useCallback(async () => {
    const currentStepRef = stepRefs.current[currentStep - 1];
    
    if (currentStepRef?.validate) {
      const isValid = await currentStepRef.validate();
      if (!isValid) {
        logger.warn(LogCategory.VALIDATION, 'Step validation failed', { step: currentStep });
        toast.error('Please complete all required fields before proceeding');
        return;
      }
    }
    
    // Save current step before moving
    if (persistenceRef.current) {
      await persistenceRef.current.saveAllPending();
    }
    
    if (currentStep < 10) {
      logger.onboardingStep(`Step ${currentStep}`, 'Completed', { nextStep: currentStep + 1 });
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 1) {
      logger.onboardingStep(`Step ${currentStep}`, 'Navigating back', { previousStep: currentStep - 1 });
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Final submission
  const handleFinalSubmit = useCallback(async () => {
    setIsLoading(true);
    const timer = logger.startTimer('Final submission');
    
    try {
      // Save all pending data first
      if (persistenceRef.current) {
        await persistenceRef.current.saveAllPending();
      }
      
      logger.onboardingStep('Submission', 'Submitting for review', { villaId });
      
      const response = await loggedApiClient.request(`/api/onboarding/${villaId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          finalData: localStepData,
          submissionTime: new Date().toISOString(),
        }),
      });
      
      if (response.success) {
        logger.info(LogCategory.ONBOARDING, 'Onboarding submitted successfully', { villaId });
        
        // Clear backup
        if (user) {
          backupService.deleteBackup(user.id, villaId);
        }
        
        toast.success('Onboarding completed successfully!');
      } else {
        throw new Error(response.error || 'Submission failed');
      }
    } catch (error) {
      logger.error(LogCategory.ONBOARDING, 'Submission failed', { error });
      toast.error('Submission failed. Please try again.');
    } finally {
      setIsLoading(false);
      timer();
    }
  }, [villaId, localStepData, user, backupService]);

  // Recovery handlers
  const handleRecoveryAccept = useCallback((backupData: BackupData) => {
    logger.info(LogCategory.ONBOARDING, 'Recovery accepted', { 
      villaId: backupData.villaId,
      stepCount: Object.keys(backupData.stepData).length 
    });
    
    setLocalStepData(backupData.stepData);
    setCurrentStep(backupData.currentStep);
    setVillaId(backupData.villaId);
    setShowRecoveryModal(false);
    toast.success('Previous session restored successfully');
  }, []);

  const handleRecoveryReject = useCallback(() => {
    logger.info(LogCategory.ONBOARDING, 'Recovery rejected');
    setShowRecoveryModal(false);
    if (recoveryData) {
      backupService.deleteBackup(recoveryData.userId, recoveryData.villaId);
    }
  }, [backupService, recoveryData]);

  // Render step component
  const renderStep = () => {
    const commonProps = {
      data: localStepData,
      onUpdate: handleStepUpdate,
      isLoading,
      villaId,
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (persistenceRef.current) {
        persistenceRef.current.destroy();
      }
    };
  }, []);

  return (
    <ValidationProvider>
      <WizardErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
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
              />
            </div>

            {/* Progress Tracker */}
            <div className="mb-6">
              <ProgressTracker 
                currentStep={currentStep}
                stepData={localStepData}
                isAutoSaveEnabled={autoSaveEnabled}
                lastSaved={lastSavedData}
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
                {isSaving && (
                  <span className="text-sm text-gray-600">
                    Saving...
                  </span>
                )}
                
                <button
                  onClick={currentStep === 10 ? handleFinalSubmit : handleNextStep}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {currentStep === 10 ? 'Submit for Review' : 'Next Step'}
                </button>
              </div>
            </div>

            {/* Debug Logger Control (Development only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Logger Controls</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => console.log(logger.getLogBuffer())}
                    className="px-3 py-1 bg-gray-200 rounded text-sm"
                  >
                    Show Logs
                  </button>
                  <button
                    onClick={() => logger.clearBuffer()}
                    className="px-3 py-1 bg-gray-200 rounded text-sm"
                  >
                    Clear Logs
                  </button>
                  <button
                    onClick={() => {
                      const logs = logger.exportLogs();
                      const blob = new Blob([logs], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `onboarding-logs-${Date.now()}.json`;
                      a.click();
                    }}
                    className="px-3 py-1 bg-gray-200 rounded text-sm"
                  >
                    Export Logs
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </WizardErrorBoundary>
    </ValidationProvider>
  );
};

export default OnboardingWizardWithLogger;