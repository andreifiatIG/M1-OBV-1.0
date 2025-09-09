"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { clientApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { useDebouncedCallback } from 'use-debounce';
import { 
  STEP_CONFIGURATIONS, 
  validateStepData, 
  canNavigateToStep, 
  getStepProgress,
  StepValidationState 
} from './stepConfig';

// Types
interface OnboardingState {
  currentStep: number;
  stepData: Record<string, any>;
  stepValidations: Record<number, StepValidationState>;
  skippedFields: Record<number, string[]>; // step -> array of skipped field names
  skippedSteps: number[]; // completely skipped steps
  isLoading: boolean;
  hasLoadedInitialData: boolean;
  autoSaveEnabled: boolean;
  lastAutoSave: Date | null;
  optimisticUpdates: Record<string, any>;
}

type OnboardingAction =
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_STEP_DATA'; payload: { step: number; data: any } }
  | { type: 'SET_OPTIMISTIC_UPDATE'; payload: { step: number; data: any } }
  | { type: 'CLEAR_OPTIMISTIC_UPDATE'; payload: number }
  | { type: 'SET_VALIDATION'; payload: { step: number; validation: StepValidationState } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIAL_DATA'; payload: { currentStep: number; stepData: Record<string, any> } }
  | { type: 'SET_AUTO_SAVE'; payload: { enabled?: boolean; lastSave?: Date } }
  | { type: 'SKIP_FIELD'; payload: { step: number; fieldName: string } }
  | { type: 'UNSKIP_FIELD'; payload: { step: number; fieldName: string } }
  | { type: 'SKIP_STEP'; payload: number }
  | { type: 'UNSKIP_STEP'; payload: number }
  | { type: 'RESET_STATE' };

// Context interface
interface OnboardingContextType {
  state: OnboardingState;
  
  // Navigation
  goToStep: (step: number) => void;
  goNext: () => Promise<void>;
  goPrevious: () => void;
  
  // Data management
  updateStepData: (step: number, data: any) => void;
  getStepData: (step: number) => any;
  validateCurrentStep: () => boolean;
  
  // Skip functionality
  skipField: (step: number, fieldName: string) => void;
  unskipField: (step: number, fieldName: string) => void;
  skipStep: (step: number) => void;
  unskipStep: (step: number) => void;
  isFieldSkipped: (step: number, fieldName: string) => boolean;
  isStepSkipped: (step: number) => boolean;
  getSkippedFields: (step: number) => string[];
  getSkippedSummary: () => { skippedFields: Record<number, string[]>; skippedSteps: number[] };
  
  // Progress
  getProgress: () => { completed: number[]; total: number; percentage: number };
  canNavigateTo: (step: number) => boolean;
  
  // Auto-save
  toggleAutoSave: () => void;
  performAutoSave: (step: number, data: any) => Promise<void>;
  
  // Completion
  completeOnboarding: () => Promise<void>;
}

// Initial state
const initialState: OnboardingState = {
  currentStep: 1,
  stepData: {},
  stepValidations: {},
  skippedFields: {},
  skippedSteps: [],
  isLoading: false,
  hasLoadedInitialData: false,
  autoSaveEnabled: true,
  lastAutoSave: null,
  optimisticUpdates: {}
};

// Reducer
const onboardingReducer = (state: OnboardingState, action: OnboardingAction): OnboardingState => {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };
      
    case 'SET_STEP_DATA':
      return {
        ...state,
        stepData: {
          ...state.stepData,
          [`step${action.payload.step}`]: action.payload.data
        }
      };
      
    case 'SET_OPTIMISTIC_UPDATE':
      return {
        ...state,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          [`step${action.payload.step}`]: action.payload.data
        }
      };
      
    case 'CLEAR_OPTIMISTIC_UPDATE':
      const newOptimisticUpdates = { ...state.optimisticUpdates };
      delete newOptimisticUpdates[`step${action.payload}`];
      return { ...state, optimisticUpdates: newOptimisticUpdates };
      
    case 'SET_VALIDATION':
      return {
        ...state,
        stepValidations: {
          ...state.stepValidations,
          [action.payload.step]: action.payload.validation
        }
      };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        currentStep: action.payload.currentStep,
        stepData: action.payload.stepData,
        hasLoadedInitialData: true
      };
      
    case 'SET_AUTO_SAVE':
      return {
        ...state,
        autoSaveEnabled: action.payload.enabled ?? state.autoSaveEnabled,
        lastAutoSave: action.payload.lastSave ?? state.lastAutoSave
      };
      
    case 'SKIP_FIELD':
      return {
        ...state,
        skippedFields: {
          ...state.skippedFields,
          [action.payload.step]: [
            ...(state.skippedFields[action.payload.step] || []),
            action.payload.fieldName
          ].filter((field, index, arr) => arr.indexOf(field) === index) // Remove duplicates
        }
      };
      
    case 'UNSKIP_FIELD':
      return {
        ...state,
        skippedFields: {
          ...state.skippedFields,
          [action.payload.step]: (state.skippedFields[action.payload.step] || [])
            .filter(field => field !== action.payload.fieldName)
        }
      };
      
    case 'SKIP_STEP':
      return {
        ...state,
        skippedSteps: [...state.skippedSteps, action.payload]
          .filter((step, index, arr) => arr.indexOf(step) === index) // Remove duplicates
      };
      
    case 'UNSKIP_STEP':
      return {
        ...state,
        skippedSteps: state.skippedSteps.filter(step => step !== action.payload)
      };
    
    case 'RESET_STATE':
      return initialState;
      
    default:
      return state;
  }
};

// Context
const OnboardingContext = createContext<OnboardingContextType | null>(null);

// Provider component
export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const { user } = useUser();
  const userId = user?.id || 'test-user-123';

  // Placeholder functions - this context is not used in the current app
  const saveOnboardingStep = async (data: any) => {
    console.log('SaveOnboardingStep placeholder:', data);
    return { success: true };
  };
  const completeOnboardingMutation = async () => {
    console.log('CompleteOnboarding placeholder');
    return { success: true };
  };
  const getOnboardingProgressRealtime = null;

  // Load initial data
  useEffect(() => {
    if (getOnboardingProgressRealtime && !state.hasLoadedInitialData) {
      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: {
          currentStep: (getOnboardingProgressRealtime as any)?.currentStep || 1,
          stepData: (getOnboardingProgressRealtime as any)?.stepData || {}
        }
      });
    }
  }, [getOnboardingProgressRealtime, state.hasLoadedInitialData]);

  // Combined step data with optimistic updates
  const combinedStepData = useMemo(() => {
    return { ...state.stepData, ...state.optimisticUpdates };
  }, [state.stepData, state.optimisticUpdates]);

  // Debounced step data update
  const debouncedUpdate = useDebouncedCallback(
    (step: number, data: any) => {
      dispatch({ type: 'SET_STEP_DATA', payload: { step, data } });
      
      // Validate step data
      const validation = validateStepData(step, data);
      dispatch({ type: 'SET_VALIDATION', payload: { step, validation } });
    },
    1000
  );

  // Auto-save functionality
  const performAutoSave = useCallback(async (step: number, data: any) => {
    if (!state.autoSaveEnabled || !userId) return;
    
    try {
      await saveOnboardingStep({
        userId,
        stepNumber: step,
        stepData: data,
      });
      dispatch({ type: 'SET_AUTO_SAVE', payload: { lastSave: new Date() } });
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  }, [state.autoSaveEnabled, userId, saveOnboardingStep]);

  // Auto-save effect
  useEffect(() => {
    if (!state.autoSaveEnabled || state.currentStep > 10) return;
    
    const timeoutId = setTimeout(() => {
      const currentStepData = combinedStepData[`step${state.currentStep}`];
      if (currentStepData && Object.keys(currentStepData).length > 0) {
        performAutoSave(state.currentStep, currentStepData);
      }
    }, 30000);
    
    return () => clearTimeout(timeoutId);
  }, [state.currentStep, combinedStepData, state.autoSaveEnabled, performAutoSave]);

  // Context methods
  const updateStepData = useCallback((step: number, data: any) => {
    // Immediate optimistic update
    dispatch({ type: 'SET_OPTIMISTIC_UPDATE', payload: { step, data } });
    
    // Debounced actual update
    debouncedUpdate(step, data);
  }, [debouncedUpdate]);

  const getStepData = useCallback((step: number) => {
    return combinedStepData[`step${step}`] || {};
  }, [combinedStepData]);

  const validateCurrentStep = useCallback(() => {
    const currentStepData = getStepData(state.currentStep);
    const validation = validateStepData(state.currentStep, currentStepData);
    dispatch({ type: 'SET_VALIDATION', payload: { step: state.currentStep, validation } });
    return validation.isValid;
  }, [state.currentStep, getStepData]);

  const goToStep = useCallback((step: number) => {
    // Allow free navigation for development
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  }, []);

  const goNext = useCallback(async () => {
    // Disable validation for development - allow free navigation
    // if (!validateCurrentStep()) {
    //   toast.error('Please fill in all required fields correctly.');
    //   return;
    // }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_OPTIMISTIC_UPDATE', payload: state.currentStep });

    try {
      const dataToSave = getStepData(state.currentStep);
      
      // Optimistic UI update
      if (state.currentStep < 10) {
        dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep + 1 });
      }

      await saveOnboardingStep({
        userId,
        stepNumber: state.currentStep,
        stepData: dataToSave,
      });

      if (state.currentStep >= 10) {
        await completeOnboardingMutation();
        toast.success('Onboarding completed successfully! Redirecting to dashboard...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      }
    } catch (error) {
      // Revert optimistic update on error
      if (state.currentStep < 10) {
        dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep });
      }
      toast.error(`Failed to save step: ${(error as Error).message}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentStep, userId, validateCurrentStep, getStepData, saveOnboardingStep, completeOnboardingMutation]);

  const goPrevious = useCallback(() => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep - 1 });
    }
  }, [state.currentStep]);

  const getProgress = useCallback(() => {
    return getStepProgress(state.stepValidations);
  }, [state.stepValidations]);

  const canNavigateTo = useCallback((step: number) => {
    // Allow free navigation for development
    return true;
  }, []);

  const toggleAutoSave = useCallback(() => {
    dispatch({ 
      type: 'SET_AUTO_SAVE', 
      payload: { enabled: !state.autoSaveEnabled } 
    });
  }, [state.autoSaveEnabled]);

  const completeOnboarding = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await completeOnboardingMutation();
      toast.success('Onboarding completed successfully!');
    } catch (error) {
      toast.error(`Failed to complete onboarding: ${(error as Error).message}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [userId, completeOnboardingMutation]);

  // Skip functionality methods
  const skipField = useCallback((step: number, fieldName: string) => {
    dispatch({ type: 'SKIP_FIELD', payload: { step, fieldName } });
    toast.info(`Skipped field: ${fieldName}`);
  }, []);

  const unskipField = useCallback((step: number, fieldName: string) => {
    dispatch({ type: 'UNSKIP_FIELD', payload: { step, fieldName } });
    toast.info(`Unskipped field: ${fieldName}`);
  }, []);

  const skipStep = useCallback((step: number) => {
    dispatch({ type: 'SKIP_STEP', payload: step });
    toast.info(`Skipped step: ${STEP_CONFIGURATIONS[step]?.title || `Step ${step}`}`);
  }, []);

  const unskipStep = useCallback((step: number) => {
    dispatch({ type: 'UNSKIP_STEP', payload: step });
    toast.info(`Unskipped step: ${STEP_CONFIGURATIONS[step]?.title || `Step ${step}`}`);
  }, []);

  const isFieldSkipped = useCallback((step: number, fieldName: string) => {
    return (state.skippedFields[step] || []).includes(fieldName);
  }, [state.skippedFields]);

  const isStepSkipped = useCallback((step: number) => {
    return state.skippedSteps.includes(step);
  }, [state.skippedSteps]);

  const getSkippedFields = useCallback((step: number) => {
    return state.skippedFields[step] || [];
  }, [state.skippedFields]);

  const getSkippedSummary = useCallback(() => {
    return {
      skippedFields: state.skippedFields,
      skippedSteps: state.skippedSteps
    };
  }, [state.skippedFields, state.skippedSteps]);

  const contextValue: OnboardingContextType = {
    state,
    goToStep,
    goNext,
    goPrevious,
    updateStepData,
    getStepData,
    validateCurrentStep,
    skipField,
    unskipField,
    skipStep,
    unskipStep,
    isFieldSkipped,
    isStepSkipped,
    getSkippedFields,
    getSkippedSummary,
    getProgress,
    canNavigateTo,
    toggleAutoSave,
    performAutoSave,
    completeOnboarding
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Hook to use the context
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};