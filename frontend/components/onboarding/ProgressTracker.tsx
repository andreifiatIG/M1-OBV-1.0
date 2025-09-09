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
}

export default function ProgressTracker({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  onboardingData,
}: ProgressTrackerProps) {
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
                const stepHasData = onboardingData && (() => {
                  const stepConfig = steps.find(s => s.id === step.id);
                  if (!stepConfig) return false;
                  return completedSteps.includes(step.id);
                })();
                
                const isCompleted = completedSteps.includes(step.id) || stepHasData;
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
                          w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 shadow-sm flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform
                          ${isCompleted
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
      </div>
    </nav>
  );
}
