'use client';

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Step components with lazy loading
const stepComponents = {
  1: lazy(() => import('./steps/VillaInformationStepEnhanced')),
  2: lazy(() => import('./steps/OwnerDetailsStep')),
  3: lazy(() => import('./steps/ContractualDetailsStep')),
  4: lazy(() => import('./steps/BankDetailsStep')),
  5: lazy(() => import('./steps/OTACredentialsStep')),
  6: lazy(() => import('./steps/DocumentsUploadStep')),
  7: lazy(() => import('./steps/StaffConfiguratorStep')),
  8: lazy(() => import('./steps/FacilitiesChecklistStep')),
  9: lazy(() => import('./steps/PhotoUploadStep')),
  10: lazy(() => import('./steps/ReviewSubmitStep')),
};

// Preload nearby steps for better performance
const preloadSteps = (currentStep: number) => {
  const stepsToPreload = [
    currentStep - 1,
    currentStep,
    currentStep + 1,
  ].filter(step => step >= 1 && step <= 10);
  
  stepsToPreload.forEach(step => {
    const component = stepComponents[step as keyof typeof stepComponents];
    if (component && '_ctor' in component) {
      // Trigger lazy loading without rendering
      (component as any)._ctor();
    }
  });
};

interface LazyStepLoaderProps {
  stepNumber: number;
  data: any;
  onUpdate: (data: any) => void;
  stepRef?: React.Ref<any>;
}

// Loading skeleton component
const StepSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
    <div className="grid grid-cols-2 gap-4 mt-6">
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
    <div className="flex items-center justify-center mt-8">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="ml-2 text-sm text-gray-600">Loading step...</span>
    </div>
  </div>
);

// Error fallback component
const StepErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="text-center py-8">
    <div className="text-red-500 mb-4">
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load step</h3>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
    >
      Retry
    </button>
  </div>
);

export const LazyStepLoader: React.FC<LazyStepLoaderProps> = ({
  stepNumber,
  data,
  onUpdate,
  stepRef,
}) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Preload nearby steps when current step changes
  useEffect(() => {
    preloadSteps(stepNumber);
  }, [stepNumber]);
  
  // Get the component for the current step
  const StepComponent = stepComponents[stepNumber as keyof typeof stepComponents];
  
  if (!StepComponent) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Step {stepNumber} not found</p>
      </div>
    );
  }
  
  const handleRetry = () => {
    setHasError(false);
    setErrorMessage('');
  };
  
  if (hasError) {
    return <StepErrorFallback error={new Error(errorMessage)} retry={handleRetry} />;
  }
  
  return (
    <Suspense fallback={<StepSkeleton />}>
      <div
        onError={(event: any) => {
          setHasError(true);
          setErrorMessage(event.error?.message || 'Failed to load step component');
        }}
      >
        <StepComponent ref={stepRef} data={data} onUpdate={onUpdate} />
      </div>
    </Suspense>
  );
};

// Hook to prefetch steps
export const usePrefetchSteps = (currentStep: number) => {
  useEffect(() => {
    // Prefetch the next step when idle
    const timeoutId = setTimeout(() => {
      if (currentStep < 10) {
        const nextStep = stepComponents[(currentStep + 1) as keyof typeof stepComponents];
        if (nextStep && '_ctor' in nextStep) {
          (nextStep as any)._ctor();
        }
      }
    }, 1000); // Wait 1 second before prefetching
    
    return () => clearTimeout(timeoutId);
  }, [currentStep]);
};

// Utility to check if a step is loaded
export const isStepLoaded = (stepNumber: number): boolean => {
  const component = stepComponents[stepNumber as keyof typeof stepComponents];
  if (!component || !('_ctor' in component)) return false;
  
  const ctor = (component as any)._ctor;
  return ctor && ctor._result !== undefined;
};

export default LazyStepLoader;