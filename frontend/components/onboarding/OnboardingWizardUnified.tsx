'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { ClientApiClient } from '@/lib/api-client';
import { mapOnboardingDataToBackend, mapBackendProgressToStepData } from '@/lib/data-mapper';
import OnboardingLogger from '@/lib/onboarding-logger';
import ProgressTracker from './ProgressTracker';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { StepHandle, OnboardingStepData, OnboardingProgress, AutoSaveStatus, OnboardingWizardProps, SaveOperation, FieldProgressResult, OnboardingStep } from './types';
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
import ReviewSubmitStepEnhanced from './steps/ReviewSubmitStepEnhanced';

// Enhanced auto-save configuration
const AUTO_SAVE_CONFIG = {
  enabled: true,
  debounceTime: 5000,      // 5 seconds
  minTimeBetweenSaves: 2000, // 2 seconds rate limit
  periodicSaveInterval: 30000, // 30 seconds
  maxRetries: 3,
  backoffMultiplier: 2,
  maxBackoffTime: 5000,
  batchingEnabled: true,     // NEW: Enable batching of saves
  maxBatchSize: 5           // NEW: Maximum saves per batch
};

// Production-ready status indicator

interface OnboardingWizardContentProps {
  forceNewSession?: boolean;
}

const OnboardingWizardContent: React.FC<OnboardingWizardContentProps> = ({ forceNewSession = false }) => {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [localStepData, setLocalStepData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [autoSaveEnabled] = useState(AUTO_SAVE_CONFIG.enabled);
  const [lastSavedData, setLastSavedData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [lastSaveTime, setLastSaveTime] = useState<Date>();
  
  // Performance and logging
  const [logger] = useState(() => OnboardingLogger.getInstance());
  
  // Backup and recovery state - TEMPORARILY DISABLED
  const [backupService] = useState<null>(() => null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<BackupData | null>(null);
  
  const stepRefs = useRef<(StepHandle | null)[]>([]);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveQueueRef = useRef<Set<number>>(new Set());
  const lastSaveTimeRef = useRef<number>(0);
  const batchedSavesRef = useRef<Map<number, any>>(new Map()); // NEW: Batched saves
  const saveInProgressRef = useRef<boolean>(false); // Prevent concurrent saves
  const saveOperationIdRef = useRef<number>(0); // Track save operations
  
  const totalSteps = 10;
  const userId = user?.id;
  const isMountedRef = useRef(true);

  // State for onboarding progress
  const [onboardingProgress, setOnboardingProgress] = useState<any>(null);
  const [villaId, setVillaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [criticalError, setCriticalError] = useState<boolean>(false);
  // Prevent double-initialization in development/StrictMode
  const initialLoadRef = useRef(false);

  // Connection monitoring and error handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      logger.log('SYSTEM', 'CONNECTION_RESTORED');
    };

    const handleOffline = () => {
      setIsOfflineMode(true);
      logger.log('SYSTEM', 'CONNECTION_LOST');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Remove console.error - handled by logger
      logger.trackError('SYSTEM', event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
        context: 'unhandled_promise_rejection'
      });
      // Prevent the error from bubbling up and causing the app to crash
      event.preventDefault();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [logger]);

  // OPTIMIZED: Enhanced field progress loading with batching
  const loadFieldProgress = useCallback(async (villaId: string, authenticatedApi: ClientApiClient, existingData?: Record<string, any>) => {
    try {
      logger.startDataFetch('field_progress_load');

      if (isSaving) {
        logger.endDataFetch('field_progress_load', false);
        return existingData;
      }

      // Load field progress for heavy steps that need it (steps 6-10: documents, staff, facilities, photos, review)
      const heavySteps = [6, 7, 8, 9, 10];

      // Use Promise.allSettled for concurrent loading instead of sequential
      const fieldProgressPromises = heavySteps.map(async (step) => {
        try {
          const result = await authenticatedApi.getFieldProgress(villaId, step);
          return { step, data: result, success: true };
        } catch (err) {
          logger.trackError(step, err as Error, { context: 'field_progress_load_single_step' });
          return { step, data: {}, success: false };
        }
      });

      // Execute all requests concurrently
      const fieldProgressResults = await Promise.allSettled(fieldProgressPromises);
      const processedResults = fieldProgressResults.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          logger.trackError('SYSTEM', new Error(String(result.reason)), { context: 'field_progress_batch_load' });
          return { step: 0, data: {}, success: false };
        }
      }).filter(result => result.step > 0);

      // Merge field progress into step data
      const enhancedStepData: Record<string, any> = existingData ? { ...existingData } : {};

      processedResults.forEach(({ step, data, success }) => {
        if (success && data && typeof data === 'object' && 'success' in data &&
            (data as any).success && (data as any).data &&
            Object.keys((data as any).data).length > 0) {

          const existingStepData = enhancedStepData[`step${step}`] || {};

          // Only merge non-empty field progress values
          const validFieldProgress: Record<string, any> = {};
          Object.entries((data as any).data).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
              // Parse JSON values if they look like JSON
              try {
                if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                  validFieldProgress[key] = JSON.parse(value);
                } else {
                  validFieldProgress[key] = value;
                }
              } catch {
                validFieldProgress[key] = value;
              }
            }
          });

          if (Object.keys(validFieldProgress).length > 0) {
            enhancedStepData[`step${step}`] = { ...existingStepData, ...validFieldProgress };
            logger.log(step, 'FIELD_PROGRESS_LOADED', { fieldsLoaded: Object.keys(validFieldProgress).length });
          }
        }
      });

      logger.endDataFetch('field_progress_load', true, heavySteps.length);
      return enhancedStepData;

    } catch (error) {
      logger.endDataFetch('field_progress_load', false);
      logger.trackError('SYSTEM', error as Error, { context: 'field_progress_load' });
      return existingData || {};
    }
  }, [isSaving, logger]);

  // Enhanced auto-save with batching and race condition prevention
  const performAutoSave = useCallback(async () => {
    // Authentication and permission checks
    if (!userLoaded || !authLoaded || !user || !villaId || !autoSaveEnabled || isSaving || batchedSavesRef.current.size === 0) {
      return;
    }

    // Prevent concurrent save operations
    if (saveInProgressRef.current) {
      logger.log('AUTOSAVE', 'SAVE_ALREADY_IN_PROGRESS');
      return;
    }

    saveInProgressRef.current = true;
    const currentOperationId = ++saveOperationIdRef.current;

    const now = Date.now();
    if (now - lastSaveTimeRef.current < AUTO_SAVE_CONFIG.minTimeBetweenSaves) {
      return;
    }

    setIsSaving(true);
    setAutoSaveStatus('saving');
    lastSaveTimeRef.current = now;
    
    logger.startAutoSave(currentStep);
    
    try {
      const token = await getToken();
      if (!token) {
        logger.trackError('AUTOSAVE', new Error('Authentication token unavailable'), {
          context: 'auto_save_authentication',
          villaId,
          currentStep
        });
        throw new Error('No authentication token available');
      }

      const authenticatedApi = new ClientApiClient(token);
      
      // Process batched saves
      const saveBatch = Array.from(batchedSavesRef.current.entries());
      const savePromises = saveBatch.map(async ([stepNum, stepData]) => {
        try {
          const backendData = mapOnboardingDataToBackend(Number(stepNum), stepData);
          // Mark this as an auto-save to prevent premature completion flags
          await authenticatedApi.saveOnboardingStep(villaId, Number(stepNum), backendData, true);
          return { stepNum, success: true };
        } catch (error) {
          logger.trackError(parseInt(String(stepNum)), error as Error, { context: 'batch_save' });
          return { stepNum, success: false, error };
        }
      });

      const results = await Promise.allSettled(savePromises);
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success);
      
      // Clear successfully saved items from batch
      successful.forEach(result => {
        if (result.status === 'fulfilled') {
          batchedSavesRef.current.delete((result.value as any).stepNum);
        }
      });

      // Update last saved data for successful saves
      if (successful.length > 0) {
        const updatedSavedData = { ...lastSavedData };
        successful.forEach(result => {
          if (result.status === 'fulfilled') {
            const stepNum = (result.value as any).stepNum;
            updatedSavedData[`step${stepNum}`] = localStepData[`step${stepNum}`];
          }
        });
        if (isMountedRef.current) {
          setLastSavedData(updatedSavedData);
          setLastSaveTime(new Date());
        }
      }

      // Create backup of current state (non-critical, don't fail on backup errors)
      try {
        if (backupService) {
          // await backupService.saveProgressImmediate(villaId || undefined, currentStep, localStepData);
        }
      } catch (backupError) {
        logger.trackError('BACKUP', backupError as Error, { context: 'auto_save_backup' });
        // Warning logged through logger.trackError above
      }

      if (successful.length < saveBatch.length) {
        toast.warning(`Saved ${successful.length}/${saveBatch.length} changes. Some changes may be retried.`);
      }

      logger.endAutoSave(currentStep, true, JSON.stringify(saveBatch).length);
      if (isMountedRef.current) {
        setAutoSaveStatus('idle');
      }

    } catch (error) {
      logger.endAutoSave(currentStep, false);
      logger.trackError('AUTOSAVE', error as Error, {
        villaId,
        currentStep,
        batchSize: batchedSavesRef.current.size
      });
      if (isMountedRef.current) {
        setAutoSaveStatus('error');
      }

      if (!isOfflineMode) {
        toast.error('Auto-save failed. Your changes are backed up locally.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
      // Always reset the save in progress flag
      if (saveOperationIdRef.current === currentOperationId) {
        saveInProgressRef.current = false;
      }
    }
  }, [userLoaded, authLoaded, user, villaId, autoSaveEnabled, isSaving, currentStep, localStepData, lastSavedData, getToken, userId, logger, isOfflineMode, backupService]);

  // Enhanced update handler with intelligent batching
  const handleUpdate = useCallback((stepNumber: number, data: any) => {
    logger.trackUserInteraction(stepNumber, 'data_update', Object.keys(data || {}).join(','));
    
    if (isMountedRef.current) {
      setLocalStepData(prev => {
        const updated = { ...prev, [`step${stepNumber}`]: data };

        // Add to batched saves
        if (data && typeof data === 'object') {
          batchedSavesRef.current.set(stepNumber, data);
        }

        return updated;
      });
    }
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout with batching
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave().catch(error => {
        logger.trackError('AUTOSAVE', error as Error, { context: 'timeout_autosave' });
        // Error logged through logger.trackError above
      });
    }, AUTO_SAVE_CONFIG.debounceTime);
    
  }, [performAutoSave, logger]);

  // Enhanced error recovery mechanism
  const handleErrorRecovery = useCallback(async (error: Error, context: string) => {
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      setCriticalError(true);
      logger.trackError('SYSTEM', new Error(`Critical error after ${maxRetries} retries: ${error.message}`), {
        context: `${context}_critical_failure`,
        retryCount,
        originalError: error.message
      });
      return false;
    }

    setRetryCount(prev => prev + 1);
    logger.log('SYSTEM', 'ERROR_RECOVERY_ATTEMPT', {
      context,
      retryCount: retryCount + 1,
      error: error.message
    });

    // Clear error state and attempt recovery
    if (isMountedRef.current) {
      setError(null);
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));

    return true;
  }, [retryCount, logger]);

  // Enhanced data loading with performance tracking
  const loadOnboardingData = useCallback(async (forceNewSession = false) => {
    if (!user?.id) {
      if (isMountedRef.current) {
        setError('Please sign in to access the onboarding wizard');
      }
      if (isMountedRef.current) {
        setIsLoading(false);
        setHasLoadedInitialData(true);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
    }
    logger.startDataFetch('initial_load');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      const authenticatedApi = new ClientApiClient(token);
      
      // If forcing a new session, skip checking for existing villa
      if (forceNewSession) {
        logger.log('SYSTEM', 'Force new session - skipping existing villa check');
        localStorage.removeItem('currentVillaId'); // Clear any existing session
        if (userId) {
          localStorage.removeItem(`onboarding_villa_${userId}`);
        }

        // Create a new villa directly
        const startResponse = await authenticatedApi.startOnboarding('My Villa');
        if (startResponse.success && startResponse.data?.villaId) {
          const newVillaId = startResponse.data.villaId;
          if (isMountedRef.current) {
            setVillaId(newVillaId);
          }
          localStorage.setItem('currentVillaId', newVillaId);
          if (userId) {
            localStorage.setItem(`onboarding_villa_${userId}`, newVillaId);
          }

          // Load the newly created villa's progress
          const progressResponse = await authenticatedApi.getOnboardingProgress(newVillaId);
          if (progressResponse.success && progressResponse.data && isMountedRef.current) {
            setOnboardingProgress(progressResponse.data);
            const mappedStepData = mapBackendProgressToStepData(progressResponse.data);
            setLocalStepData(mappedStepData);
            setLastSavedData(mappedStepData);
          } else {
            setLocalStepData({});
            setLastSavedData({});
          }

          if (isMountedRef.current) {
            setCurrentStep(1); // Start from step 1
          }
          logger.endDataFetch('initial_load', true, 0);
          return;
        } else {
          throw new Error('Failed to start new onboarding session');
        }
      }
      
      // Check for existing villa and progress
      // First check for user-specific villa ID (from dashboard), then fallback to generic key
      let persistedVillaId: string | null = null;
      let villaIdSource = 'none';
      if (typeof window !== 'undefined') {
        // Check user-specific key first (from dashboard)
        if (userId) {
          persistedVillaId = localStorage.getItem(`onboarding_villa_${userId}`);
          if (persistedVillaId) {
            villaIdSource = 'user-specific';
          }
        }
        // Fallback to generic key
        if (!persistedVillaId) {
          persistedVillaId = localStorage.getItem('currentVillaId');
          if (persistedVillaId) {
            villaIdSource = 'generic';
          }
        }
      }

      logger.log('SYSTEM', 'VILLA_ID_LOADING', {
        userId,
        persistedVillaId,
        source: villaIdSource
      });

      if (persistedVillaId) {
        // Validate villa ownership before proceeding
        logger.log('SESSION', 'VALIDATING_VILLA_ACCESS', {
          villaId: persistedVillaId,
          source: villaIdSource,
          userId
        });

        try {
          const progressResponse = await authenticatedApi.getOnboardingProgress(persistedVillaId);
          if (progressResponse.success && progressResponse.data) {
            logger.log('SESSION', 'VILLA_ACCESS_VALIDATED', { villaId: persistedVillaId });

            // Verify villa ID consistency before proceeding
            const currentGenericId = localStorage.getItem('currentVillaId');
            const currentUserSpecificId = userId ? localStorage.getItem(`onboarding_villa_${userId}`) : null;

            // If there's an inconsistency, log it and use the validated villa ID
            if (currentGenericId && currentGenericId !== persistedVillaId) {
              logger.log('SESSION', 'VILLA_ID_INCONSISTENCY_DETECTED', {
                persistedVillaId,
                currentGenericId,
                source: 'generic_localStorage'
              });
            }

            if (currentUserSpecificId && currentUserSpecificId !== persistedVillaId) {
              logger.log('SESSION', 'VILLA_ID_INCONSISTENCY_DETECTED', {
                persistedVillaId,
                currentUserSpecificId,
                source: 'user_specific_localStorage'
              });
            }

            if (isMountedRef.current) {
              setVillaId(persistedVillaId);
              setOnboardingProgress(progressResponse.data);
            }
            // Update both localStorage keys for consistency
            localStorage.setItem('currentVillaId', persistedVillaId);
            if (userId) {
              localStorage.setItem(`onboarding_villa_${userId}`, persistedVillaId);
            }

            // Determine current step
            const progress = progressResponse.data;
            let step = 1;

            // Prefer data-based completedSteps array from backend for accuracy
            if (Array.isArray(progress.completedSteps)) {
              const completedSet = new Set<number>(progress.completedSteps);
              for (let i = 1; i <= totalSteps; i++) {
                if (!completedSet.has(i)) { step = i; break; }
                if (i === totalSteps) step = totalSteps;
              }
            } else {
              // Fallback to legacy boolean flags
              const stepFlags = [
                progress.villaInfoCompleted,
                progress.ownerDetailsCompleted,
                progress.contractualDetailsCompleted,
                progress.bankDetailsCompleted,
                progress.otaCredentialsCompleted,
                progress.documentsUploaded,
                progress.staffConfigCompleted,
                progress.facilitiesCompleted,
                progress.photosUploaded,
                progress.reviewCompleted
              ];
              for (let i = 0; i < stepFlags.length; i++) {
                if (!stepFlags[i]) { step = i + 1; break; }
                if (i === stepFlags.length - 1) { step = totalSteps; }
              }
            }

            if (isMountedRef.current) {
              setCurrentStep(step);
            }

            // FIXED: Map villa data to stepData format using new mapping function
            logger.log('DATA_MAPPING', 'MAPPING_BACKEND_TO_FRONTEND', {
              villaId: persistedVillaId,
              hasVillaData: !!progressResponse.data.villa
            });
            const mappedStepData = mapBackendProgressToStepData(progressResponse.data);
            logger.log('DATA_MAPPING', 'MAPPING_COMPLETED', {
              villaId: persistedVillaId,
              stepsWithData: Object.keys(mappedStepData)
            });

            // Merge field progress for all steps (1–10) with mapped data
            const enhancedData = await loadFieldProgress(persistedVillaId, authenticatedApi, mappedStepData);

            if (isMountedRef.current) {
              setLocalStepData(enhancedData || mappedStepData);
              setLastSavedData(enhancedData || mappedStepData);
            }

            logger.endDataFetch('initial_load', true);
          } else {
            // Villa doesn't exist or user doesn't have access - clear and start new
            logger.log('SESSION', 'VILLA_ACCESS_DENIED', { villaId: persistedVillaId });
            localStorage.removeItem('currentVillaId');
            if (userId) {
              localStorage.removeItem(`onboarding_villa_${userId}`);
            }
            throw new Error('Villa not accessible');
          }
        } catch (error) {
          // If villa loading fails, start a new session
          logger.trackError('SESSION', error as Error, {
            context: 'villa_validation_failed',
            villaId: persistedVillaId,
            source: villaIdSource,
            userId
          });

          // Clear ALL villa ID references to prevent further issues
          localStorage.removeItem('currentVillaId');
          if (userId) {
            localStorage.removeItem(`onboarding_villa_${userId}`);
          }

          logger.log('SESSION', 'STARTING_NEW_SESSION_AFTER_VALIDATION_FAILURE', {
            previousVillaId: persistedVillaId
          });
          const startResponse = await authenticatedApi.startOnboarding('My Villa');
          if (startResponse.success && startResponse.data?.villaId) {
            const newVillaId = startResponse.data.villaId;
            if (isMountedRef.current) {
              if (isMountedRef.current) {
            setVillaId(newVillaId);
          }
            }
            localStorage.setItem('currentVillaId', newVillaId);
            if (userId) {
              localStorage.setItem(`onboarding_villa_${userId}`, newVillaId);
            }

            const pr = await authenticatedApi.getOnboardingProgress(newVillaId);
            if (pr.success && pr.data && isMountedRef.current) {
              setOnboardingProgress(pr.data);
              const mappedStepData = mapBackendProgressToStepData(pr.data);
              setLocalStepData(mappedStepData);
              setLastSavedData(mappedStepData);
            }
            if (isMountedRef.current) {
              setCurrentStep(1);
            }
            logger.endDataFetch('initial_load', true, 0);
          } else {
            throw new Error('Failed to start new onboarding session');
          }
        }
      } else {
        // No villa exists, start fresh - create a new villa
        logger.log('SYSTEM', 'No villa found, starting onboarding process');

        const startResponse = await authenticatedApi.startOnboarding('My Villa');
        if (startResponse.success && startResponse.data?.villaId) {
          const newVillaId = startResponse.data.villaId;
          if (isMountedRef.current) {
            setVillaId(newVillaId);
          }
          localStorage.setItem('currentVillaId', newVillaId);
          if (userId) {
            localStorage.setItem(`onboarding_villa_${userId}`, newVillaId);
          }

          // Load the newly created villa's progress
          const progressResponse = await authenticatedApi.getOnboardingProgress(newVillaId);
          if (progressResponse.success && progressResponse.data && isMountedRef.current) {
            setOnboardingProgress(progressResponse.data);
            const mappedStepData = mapBackendProgressToStepData(progressResponse.data);
            setLocalStepData(mappedStepData);
            setLastSavedData(mappedStepData);
          }

          if (isMountedRef.current) {
            setCurrentStep(1); // Start from step 1
          }
          logger.endDataFetch('initial_load', true, 0);
        } else {
          throw new Error('Failed to start onboarding process');
        }
      }
      
    } catch (error) {
      logger.endDataFetch('initial_load', false);
      logger.trackError('SYSTEM', error as Error, { context: 'initial_load' });

      // Attempt error recovery
      const canRetry = await handleErrorRecovery(error as Error, 'initial_load');
      if (canRetry && !criticalError) {
        // Retry loading data
        try {
          await loadOnboardingData(forceNewSession);
          return;
        } catch (retryError) {
          logger.trackError('SYSTEM', retryError as Error, { context: 'initial_load_retry' });
        }
      }

      // Set error message for display
      if (isMountedRef.current) {
        setError(`Failed to load onboarding data: ${(error as Error)?.message || 'Unknown error'}`);
      }
      
      // Try to check for recovery data, but don't let this fail the loading process
      try {
        if (backupService) {
          // const recoveryData = await backupService.recoverLatestSession();
          // if (recoveryData) {
          //   setRecoveryData(recoveryData);
          //   setShowRecoveryModal(true);
          // }
        }
      } catch (backupError) {
        logger.trackError('SYSTEM', backupError as Error, { context: 'backup_recovery_fallback' });
        // Backup service error logged through logger.trackError above
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setHasLoadedInitialData(true);
      }
    }
  }, [user?.id, getToken, loadFieldProgress, logger, handleErrorRecovery, criticalError]);

  // Load data on mount
  useEffect(() => {
    // Guard against double-initialization (StrictMode/dev)
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    loadOnboardingData(forceNewSession).catch(error => {
      logger.trackError('SYSTEM', error as Error, { context: 'initial_data_load' });
      // Error logged through logger.trackError above
    });
  }, [loadOnboardingData, logger, forceNewSession]);


  // Enhanced cleanup - Fix memory leaks
  useEffect(() => {
    return () => {
      // Mark component as unmounted to prevent state updates
      isMountedRef.current = false;

      // Clear all timeouts
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }

      // Clear all refs to prevent memory leaks
      if (batchedSavesRef.current) {
        batchedSavesRef.current.clear();
      }
      if (saveQueueRef.current) {
        saveQueueRef.current.clear();
      }

      // Clear step refs
      if (stepRefs.current) {
        stepRefs.current.forEach((ref, index) => {
          if (ref) {
            stepRefs.current[index] = null;
          }
        });
        stepRefs.current = [];
      }

      logger.log('SYSTEM', 'COMPONENT_CLEANUP_COMPLETE');
    };
  }, [logger]);

  // Optimized completedSteps calculation
  const completedSteps = useMemo(() => {
    if (!onboardingProgress) return [];
    
    if (Array.isArray(onboardingProgress.completedSteps)) {
      return onboardingProgress.completedSteps;
    }
    
    const steps: number[] = [];
    const stepFlags = [
      { flag: onboardingProgress.villaInfoCompleted, step: 1 },
      { flag: onboardingProgress.ownerDetailsCompleted, step: 2 },
      { flag: onboardingProgress.contractualDetailsCompleted, step: 3 },
      { flag: onboardingProgress.bankDetailsCompleted, step: 4 },
      { flag: onboardingProgress.otaCredentialsCompleted, step: 5 },
      { flag: onboardingProgress.documentsUploaded, step: 6 },
      { flag: onboardingProgress.staffConfigCompleted, step: 7 },
      { flag: onboardingProgress.facilitiesCompleted, step: 8 },
      { flag: onboardingProgress.photosUploaded, step: 9 },
      { flag: onboardingProgress.reviewCompleted, step: 10 }
    ];
    
    stepFlags.forEach(({ flag, step }) => {
      if (flag) steps.push(step);
    });
    
    return steps;
  }, [onboardingProgress]);
  
  const progressPercentage = useMemo(() => {
    return Math.round((completedSteps.length / totalSteps) * 100);
  }, [completedSteps.length, totalSteps]);
  
  const stepData = localStepData;

  // Step navigation with performance tracking
  const handleNext = useCallback(async () => {
    if (currentStep >= totalSteps) return;
    
    logger.startStepLoad(currentStep + 1);
    
    try {
      // Force save current step before moving
      await performAutoSave();
      
      if (isMountedRef.current) {
        setCurrentStep(prev => {
          const next = prev + 1;
          logger.endStepLoad(next, true);
          return next;
        });
      }
    } catch (error) {
      logger.trackError(currentStep, error as Error, { context: 'handleNext' });
      logger.endStepLoad(currentStep + 1, false);
      toast.error('Failed to save current step before proceeding');
    }
  }, [currentStep, totalSteps, performAutoSave, logger]);

  const handlePrevious = useCallback(() => {
    if (currentStep <= 1) return;
    
    logger.startStepLoad(currentStep - 1);
    if (isMountedRef.current) {
      setCurrentStep(prev => {
        const next = prev - 1;
        logger.endStepLoad(next, true);
        return next;
      });
    }
  }, [currentStep, logger]);

  const handleStepClick = useCallback((stepNumber: number) => {
    if (stepNumber === currentStep) return;
    
    logger.startStepLoad(stepNumber);
    if (isMountedRef.current) {
      setCurrentStep(stepNumber);
      logger.endStepLoad(stepNumber, true);
    }
  }, [currentStep, logger]);

  // Recovery handlers
  const handleRecoverData = useCallback((data: BackupData) => {
    setLocalStepData(data.stepData);
    setCurrentStep(data.currentStep);
    setVillaId(data.villaId || null);
    setShowRecoveryModal(false);
    toast.success('Data recovered successfully!');
    logger.log('SYSTEM', 'DATA_RECOVERED', { lastSaved: data.lastSaved });
  }, [logger]);

  const handleDiscardRecovery = useCallback(async () => {
    try {
      setShowRecoveryModal(false);
      setRecoveryData(null);
      
      // Try to clear backup, but don't fail if backup service is unavailable
      try {
        if (backupService) {
          // await backupService.clearBackup();
          logger.log('SYSTEM', 'RECOVERY_DISCARDED');
        } else {
          logger.log('SYSTEM', 'RECOVERY_DISCARDED_WITHOUT_BACKUP_CLEAR');
        }
      } catch (backupError) {
        logger.trackError('BACKUP', backupError as Error, { context: 'backup_clear_fallback' });
        // Backup service error logged through logger.trackError above
        logger.log('SYSTEM', 'RECOVERY_DISCARDED_WITHOUT_BACKUP_CLEAR');
      }
    } catch (error) {
      logger.trackError('SYSTEM', error as Error, { context: 'handleDiscardRecovery' });
      toast.error('Failed to discard recovery data');
    }
  }, [logger]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Also ignore if any modifier keys are pressed (to not interfere with browser shortcuts)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (currentStep > 1 && !isLoading) {
            handlePrevious();
          }
          break;
        
        case 'ArrowRight':
          event.preventDefault();
          if (currentStep < totalSteps && !isLoading) {
            handleNext().catch(error => {
              logger.trackError(currentStep, error as Error, { context: 'keyboard_navigation_right' });
            });
          }
          break;
        
        case 'Enter':
          // Only proceed if not in a form field and shift is not pressed
          if (!event.shiftKey) {
            event.preventDefault();
            if (currentStep < totalSteps && !isLoading) {
              handleNext().catch(error => {
                logger.trackError(currentStep, error as Error, { context: 'keyboard_navigation_enter' });
              });
            }
          }
          break;
        
        case 'Escape':
          // Close recovery modal if open
          if (showRecoveryModal) {
            event.preventDefault();
            setShowRecoveryModal(false);
          }
          break;

        // Number keys 1-9 and 0 for step 10
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          event.preventDefault();
          const stepNum = parseInt(event.key);
          if (!isLoading) {
            handleStepClick(stepNum);
          }
          break;
        
        case '0':
          event.preventDefault();
          if (!isLoading && totalSteps >= 10) {
            handleStepClick(10);
          }
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentStep, totalSteps, isLoading, handleNext, handlePrevious, handleStepClick, showRecoveryModal]);

  // Render step component
  const renderStepComponent = useCallback(() => {
    const commonProps = {
      ref: (ref: StepHandle | null) => {
        stepRefs.current[currentStep - 1] = ref;
      },
      data: stepData[`step${currentStep}`] || {},
      onUpdate: (data: any) => handleUpdate(currentStep, data),
      onNext: handleNext,
      onPrevious: handlePrevious,
      villaId: villaId || undefined,
      isLoading,
      userId,
    };

    const StepComponents = [
      VillaInformationStepEnhanced,
      OwnerDetailsStep,
      ContractualDetailsStep,
      BankDetailsStep,
      OTACredentialsStep,
      DocumentsUploadStep,
      StaffConfiguratorStep,
      FacilitiesChecklistStep,
      PhotoUploadStep,
      ReviewSubmitStepEnhanced,
    ];

    const StepComponent = StepComponents[currentStep - 1];
    
    return (
      <StepErrorBoundary stepName={`Step ${currentStep}`}>
        <StepComponent {...commonProps} />
      </StepErrorBoundary>
    );
  }, [currentStep, stepData, handleUpdate, handleNext, handlePrevious, villaId, isLoading, userId]);

  if (isLoading && !hasLoadedInitialData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#009990] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading your onboarding progress...</p>
        </div>
      </div>
    );
  }

  if ((error && !recoveryData) || criticalError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className={`mx-auto h-12 w-12 ${criticalError ? 'text-red-600' : 'text-red-500'}`} />
          <h2 className={`mt-4 text-xl font-semibold ${criticalError ? 'text-red-700' : 'text-slate-900'}`}>
            {criticalError ? 'Critical Error' : 'Loading Error'}
          </h2>
          <p className="mt-2 text-slate-600">
            {criticalError
              ? 'The application encountered a critical error and could not recover. Please refresh the page or contact support if the issue persists.'
              : error
            }
          </p>
          <div className="mt-4 space-x-2">
            {error?.includes('sign in') && !criticalError ? (
              <button
                onClick={() => window.location.href = '/sign-in'}
                className="bg-[#009990] text-white px-4 py-2 rounded hover:bg-[#007a6b] transition-colors"
              >
                Sign In
              </button>
            ) : null}
            {!criticalError && (
              <button
                onClick={() => {
                  setRetryCount(0);
                  setCriticalError(false);
                  loadOnboardingData(forceNewSession).catch(error => {
                    logger.trackError('SYSTEM', error as Error, { context: 'try_again_button' });
                  });
                }}
                className="bg-[#009990] text-white px-4 py-2 rounded hover:bg-[#007a6b] transition-colors"
              >
                Try Again {retryCount > 0 && `(${retryCount}/3)`}
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Recovery Modal */}
      {showRecoveryModal && recoveryData && (
        <RecoveryModal
          isOpen={showRecoveryModal}
          onClose={() => setShowRecoveryModal(false)}
          backupData={recoveryData}
          onRecover={() => handleRecoverData(recoveryData)}
          onDiscard={handleDiscardRecovery}
        />
      )}

      <div className="min-h-screen p-6" role="main">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto">
            <WizardErrorBoundary>
              <header className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  Villa Onboarding
                </h1>
                <p className="text-slate-600">
                  Complete all steps to set up your villa for management
                </p>
                {villaId && (
                  <p className="text-sm text-slate-500 mt-2">Villa ID: {villaId}</p>
                )}
              </header>

            <ErrorBoundary stepName="Progress Tracker">
              <ProgressTracker
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
                steps={[
                  { id: 1, title: "Villa Information" },
                  { id: 2, title: "Owner Details" },
                  { id: 3, title: "Contractual Details" },
                  { id: 4, title: "Bank Details" },
                  { id: 5, title: "OTA Credentials" },
                  { id: 6, title: "Documents Upload" },
                  { id: 7, title: "Staff Configuration" },
                  { id: 8, title: "Facilities Checklist" },
                  { id: 9, title: "Photo Upload" },
                  { id: 10, title: "Review & Submit" },
                ]}
              />
            </ErrorBoundary>

            <main className="bg-transparent rounded-xl p-6 mb-6" role="region" aria-labelledby="current-step-heading" aria-live="polite">
              <div className="sr-only" id="current-step-heading">
                Step {currentStep} of {totalSteps}
              </div>

              <ErrorBoundary stepName={`Step ${currentStep}`}>
                {renderStepComponent()}
              </ErrorBoundary>
            </main>

            {/* Navigation Controls */}
            <ErrorBoundary stepName="Navigation Controls">
              <nav className="flex justify-between items-center mt-8 mb-6" role="navigation" aria-label="Step navigation">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || isLoading}
                  aria-label={`Go to previous step`}
                  className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Previous
                </button>
                
                <button
                  onClick={() => {
                    handleNext().catch(error => {
                      logger.trackError(currentStep, error as Error, { context: 'next_button_click' });
                      // Error logged through logger.trackError above
                    });
                  }}
                  disabled={isLoading}
                  aria-label={currentStep === totalSteps ? 'Complete onboarding process' : 'Continue to next step'}
                  className="px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : (currentStep === totalSteps ? 'Complete Onboarding' : 'Next')}
                </button>
              </nav>
            </ErrorBoundary>

            {/* Progress Status */}
            <div className="mt-6 text-center text-sm text-slate-600 space-y-2">
              <div role="status" aria-live="polite">
                Step {currentStep} of {totalSteps} • {progressPercentage}% Complete
              </div>
              <div className="text-xs text-slate-500">
                <span className="inline-flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">←</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">→</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">Enter</kbd>
                    Next
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">1-9</kbd>
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded">0</kbd>
                    Jump
                  </span>
                </span>
              </div>
              {autoSaveEnabled && (
                <div className="flex items-center justify-center gap-2 text-xs">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      autoSaveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
                      autoSaveStatus === 'error' ? 'bg-red-500' :
                      'bg-green-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-slate-500" role="status">
                    {autoSaveStatus === 'saving' ? 'Saving...' :
                     autoSaveStatus === 'error' ? 'Save failed' :
                     'Auto-save enabled'}
                    {lastSaveTime && autoSaveStatus === 'idle' && 
                      ` • Last saved ${lastSaveTime.toLocaleTimeString()}`}
                  </span>
                </div>
              )}
            </div>

              <ErrorBoundary stepName="Validation Summary">
                <ValidationSummary
                  stepNumber={currentStep}
                />
              </ErrorBoundary>
            </WizardErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};

// Using the imported interface
// interface OnboardingWizardUnifiedProps {
//   forceNewSession?: boolean;
// }

const OnboardingWizardUnified: React.FC<OnboardingWizardProps> = ({ forceNewSession = false }) => {
  return (
    <ValidationProvider enableRealTimeValidation={true} debounceMs={300}>
      <OnboardingWizardContent forceNewSession={forceNewSession} />
    </ValidationProvider>
  );
};

export default OnboardingWizardUnified;