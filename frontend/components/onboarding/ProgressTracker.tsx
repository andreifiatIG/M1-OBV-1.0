"use client";

import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

interface Step {
  id: number;
  title: string;
  component?: React.ComponentType<any>;
}

interface ProgressTrackerProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  onStepClick: (stepNumber: number) => void;
  onboardingData?: any;
  validationSummary?: StepValidationSummary;
}

export interface StepValidationSummary {
  [stepId: number]: {
    errors: number;
    warnings: number;
    missingFields: string[];
    status: "complete" | "warning" | "pending";
  };
}

export default function ProgressTracker({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  onboardingData,
  validationSummary,
}: ProgressTrackerProps) {
  const getStepStatus = (stepId: number) => {
    const summary = validationSummary?.[stepId];
    if (!summary) {
      const isCompleted = completedSteps.includes(stepId);
      return {
        status: isCompleted ? "complete" : "pending",
        errors: 0,
        warnings: 0,
        missingFields: [] as string[],
      };
    }
    return summary;
  };

  return (
    <nav className="w-full" role="navigation" aria-label="Onboarding progress">
      {/* Mobile Progress Bar */}
      <div className="block lg:hidden mb-6" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={steps.length} aria-label={`Step ${currentStep} of ${steps.length}: ${steps[currentStep - 1]?.title}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-600">Progress</span>
          <span className="text-sm text-slate-600">
            {completedSteps.length} of {steps.length} completed
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-[#009990] to-[#007a6b] h-3 rounded-full transition-all duration-500 shadow-lg"
            style={{
              width: `${(completedSteps.length / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Desktop Step Tracker - Transparent Container */}
      <div className="hidden lg:block">
        <div className="flex justify-center mb-6">
          <div className="bg-transparent px-8 py-6">
            <ol className="flex items-start justify-center" role="list">
              {steps.map((step, index) => {
                const summary = getStepStatus(step.id);
                const hasErrors = summary.errors > 0;
                const hasWarnings = summary.warnings > 0 && summary.errors === 0;
                const isCompleted = summary.status === "complete";
                const isCurrent = currentStep === step.id;
                const isClickable = isCompleted || isCurrent || completedSteps.includes(step.id - 1);
                const isLastStep = step.id === steps.length;
                const shouldShowTealStyling = isCompleted || isCurrent || isLastStep;

                return (
                  <li key={step.id} className="flex items-start">
                    {/* Step Container */}
                    <div className="flex flex-col items-center" style={{ width: '80px' }}>
                      {/* Step Circle */}
                      <button
                        onClick={() => isClickable && onStepClick(step.id)}
                        disabled={!isClickable}
                        aria-label={`${isCompleted ? 'Completed step' : isCurrent ? 'Current step' : 'Step'} ${step.id}: ${step.title}`}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-describedby={`step-${step.id}-title`}
                        className={`
                          relative w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 shadow-sm flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform
                          ${hasErrors
                            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse'
                            : hasWarnings
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white'
                            : isCompleted
                            ? 'bg-gradient-to-br from-[#009990] to-[#007a6b] text-white hover:shadow-lg hover:scale-110'
                            : isCurrent
                            ? 'bg-gradient-to-br from-[#009990] to-[#007a6b] text-white ring-2 ring-[#009990]/30 hover:shadow-md hover:scale-105'
                            : shouldShowTealStyling
                            ? 'bg-gradient-to-br from-[#009990] to-[#007a6b] text-white hover:shadow-md hover:scale-105'
                            : 'bg-gradient-to-br from-slate-400 to-slate-500 text-white cursor-not-allowed opacity-60'
                          }
                        `}
                        >
                          {isCompleted ? (
                            <CheckIcon 
                              className="w-4 h-4 animate-in zoom-in duration-300" 
                              aria-hidden="true" 
                            style={{ animationDelay: '0.1s' }}
                          />
                        ) : (
                          <span 
                            aria-hidden="true"
                            className="transition-all duration-300"
                          >
                            {step.id}
                          </span>
                        )}
                        </button>
                        {summary && (summary.errors > 0 || summary.warnings > 0) && (
                          <span className={`mt-1 text-[10px] font-semibold ${summary.errors > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                            {summary.errors > 0
                              ? `${summary.errors} item${summary.errors > 1 ? 's' : ''} missing`
                              : `${summary.warnings} recommended`}
                          </span>
                        )}
                      
                      {/* Step Title */}
                      <div className="mt-2 h-8 flex items-center">
                        <span
                          id={`step-${step.id}-title`}
                          className={`
                            text-[10px] font-medium text-center leading-tight px-1
                            ${isCurrent
                              ? 'text-slate-800'
                              : isCompleted
                              ? 'text-slate-700'
                              : shouldShowTealStyling
                              ? 'text-slate-700'
                              : 'text-slate-500'
                            }
                          `}
                          style={{ wordBreak: 'break-word', hyphens: 'auto' }}
                        >
                          {step.title}
                        </span>
                     </div>
                   </div>

                   {/* Connector Line */}
                    {index < steps.length - 1 && (
                      <div className="flex items-center" style={{ marginTop: '20px', width: '16px' }}>
                        <div
                          className={`
                            w-4 h-0.5 rounded-full transition-all duration-500
                            ${completedSteps.includes(step.id)
                              ? 'bg-gradient-to-r from-[#009990] to-[#007a6b]'
                              : 'bg-slate-300'
                            }
                          `}
                        />
                      </div>
                    )}
                  </li>
               );
             })}
           </ol>
         </div>
       </div>
        {validationSummary && Object.keys(validationSummary).length > 0 && (
          <div className="mt-4 space-y-2">
            {steps
              .filter((step) => {
                const summary = validationSummary[step.id];
                return summary && (summary.errors > 0 || summary.warnings > 0);
              })
              .map((step) => {
                const summary = validationSummary[step.id]!;
                return (
                  <div
                    key={`summary-${step.id}`}
                    className={`rounded-lg border px-4 py-3 text-sm bg-white/80 backdrop-blur ${summary.errors > 0 ? 'border-red-200 text-red-700 bg-red-50/70' : 'border-amber-200 text-amber-700 bg-amber-50/70'}`}
                  >
                    <div className="font-semibold mb-1">
                      {step.title}: {summary.errors > 0
                        ? `${summary.errors} required field${summary.errors > 1 ? 's are' : ' is'} missing`
                        : `${summary.warnings} recommended item${summary.warnings > 1 ? 's are' : ' is'} missing`}
                    </div>
                    {summary.missingFields.length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5">
                        {summary.missingFields.map((field) => (
                          <li key={`${step.id}-${field}`}>{field}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </nav>
  );
}
