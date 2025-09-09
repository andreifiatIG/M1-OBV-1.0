'use client';

import React, { useMemo } from 'react';
import { Check, Circle, AlertCircle, Clock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepInfo {
  number: number;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming' | 'error' | 'saving';
  required?: boolean;
  validationErrors?: string[];
}

interface ProgressIndicatorProps {
  steps: StepInfo[];
  currentStep: number;
  completedSteps: number[];
  autoSaveStatus?: {
    isSaving: boolean;
    lastSaved: Date | null;
    error: string | null;
    pendingChanges: boolean;
  };
  onStepClick?: (stepNumber: number) => void;
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'compact';
  showDetails?: boolean;
}

export function ProgressIndicator({
  steps,
  currentStep,
  completedSteps = [],
  autoSaveStatus,
  onStepClick,
  className,
  variant = 'horizontal',
  showDetails = true,
}: ProgressIndicatorProps) {
  // Calculate overall progress percentage
  const progressPercentage = useMemo(() => {
    const requiredSteps = steps.filter(s => s.required !== false);
    const completedRequired = requiredSteps.filter(s => 
      completedSteps.includes(s.number)
    ).length;
    return (completedRequired / requiredSteps.length) * 100;
  }, [steps, completedSteps]);

  // Get step icon based on status
  const getStepIcon = (step: StepInfo) => {
    switch (step.status) {
      case 'completed':
        return <Check className="w-4 h-4 text-white" />;
      case 'current':
        if (autoSaveStatus?.isSaving) {
          return <Save className="w-4 h-4 text-white animate-pulse" />;
        }
        return <Circle className="w-4 h-4 text-white" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-white" />;
      case 'saving':
        return <Save className="w-4 h-4 text-white animate-spin" />;
      default:
        return <span className="text-xs text-gray-500">{step.number}</span>;
    }
  };

  // Get step color based on status
  const getStepColor = (step: StepInfo) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-500 border-green-500';
      case 'current':
        return 'bg-blue-500 border-blue-500';
      case 'error':
        return 'bg-red-500 border-red-500';
      case 'saving':
        return 'bg-yellow-500 border-yellow-500';
      default:
        return 'bg-gray-200 border-gray-300';
    }
  };

  // Auto-save status indicator
  const AutoSaveIndicator = () => {
    if (!autoSaveStatus) return null;

    const { isSaving, lastSaved, error, pendingChanges } = autoSaveStatus;

    return (
      <div className="flex items-center gap-2 text-sm">
        {isSaving && (
          <div className="flex items-center gap-1 text-blue-600">
            <Save className="w-4 h-4 animate-pulse" />
            <span>Saving...</span>
          </div>
        )}
        
        {!isSaving && lastSaved && !error && (
          <div className="flex items-center gap-1 text-green-600">
            <Check className="w-4 h-4" />
            <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>Save failed</span>
          </div>
        )}
        
        {pendingChanges && !isSaving && (
          <div className="flex items-center gap-1 text-yellow-600">
            <Clock className="w-4 h-4" />
            <span>Unsaved changes</span>
          </div>
        )}
      </div>
    );
  };

  // Render horizontal variant
  if (variant === 'horizontal') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Progress bar */}
        <div className="relative">
          <div className="absolute left-0 right-0 top-5 h-1 bg-gray-200">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => onStepClick?.(step.number)}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all',
                    getStepColor(step),
                    onStepClick && 'hover:scale-110',
                    step.status === 'upcoming' && 'bg-white'
                  )}
                >
                  {getStepIcon(step)}
                </div>
                
                {/* Step info */}
                {showDetails && (
                  <div className="mt-2 text-center">
                    <p className={cn(
                      'text-sm font-medium',
                      step.status === 'current' ? 'text-blue-600' : 'text-gray-700'
                    )}>
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-xs text-gray-500 mt-1 max-w-[120px]">
                        {step.description}
                      </p>
                    )}
                    {step.validationErrors && step.validationErrors.length > 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        {step.validationErrors.length} error(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Auto-save status */}
        {showDetails && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {Math.round(progressPercentage)}% Complete
            </div>
            <AutoSaveIndicator />
          </div>
        )}
      </div>
    );
  }

  // Render vertical variant
  if (variant === 'vertical') {
    return (
      <div className={cn('space-y-2', className)}>
        {steps.map((step, index) => (
          <div
            key={step.number}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all',
              step.status === 'current' && 'bg-blue-50',
              onStepClick && 'hover:bg-gray-50'
            )}
            onClick={() => onStepClick?.(step.number)}
          >
            {/* Step indicator */}
            <div
              className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                getStepColor(step),
                step.status === 'upcoming' && 'bg-white'
              )}
            >
              {getStepIcon(step)}
            </div>
            
            {/* Step content */}
            <div className="flex-1">
              <h4 className={cn(
                'font-medium',
                step.status === 'current' ? 'text-blue-600' : 'text-gray-700'
              )}>
                Step {step.number}: {step.title}
              </h4>
              {step.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {step.description}
                </p>
              )}
              {step.validationErrors && step.validationErrors.length > 0 && (
                <div className="mt-2">
                  {step.validationErrors.map((error, i) => (
                    <p key={i} className="text-xs text-red-500">
                      • {error}
                    </p>
                  ))}
                </div>
              )}
            </div>
            
            {/* Required badge */}
            {step.required && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Required
              </span>
            )}
          </div>
        ))}
        
        {/* Footer with progress and auto-save */}
        {showDetails && (
          <div className="border-t pt-3 mt-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {Math.round(progressPercentage)}% Complete
              </div>
              <AutoSaveIndicator />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render compact variant
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Progress circle */}
      <div className="relative w-16 h-16">
        <svg className="transform -rotate-90 w-16 h-16">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${progressPercentage * 1.76} 176`}
            className="text-blue-500 transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      </div>
      
      {/* Current step info */}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">
          Step {currentStep} of {steps.length}
        </p>
        <p className="text-xs text-gray-500">
          {steps.find(s => s.number === currentStep)?.title}
        </p>
      </div>
      
      {/* Auto-save status */}
      <AutoSaveIndicator />
    </div>
  );
}

export default ProgressIndicator;