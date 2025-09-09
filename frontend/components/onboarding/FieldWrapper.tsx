"use client";

import React from 'react';
import SkipButton from './SkipButton';
import { useOnboarding } from './OnboardingContext';

interface FieldWrapperProps {
  stepNumber: number;
  fieldName: string;
  label: string;
  children: React.ReactNode;
  showSkipButton?: boolean;
  skipButtonSize?: 'sm' | 'md' | 'lg';
  skipButtonVariant?: 'subtle' | 'prominent';
  className?: string;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({
  stepNumber,
  fieldName,
  label,
  children,
  showSkipButton = true,
  skipButtonSize = 'sm',
  skipButtonVariant = 'subtle',
  className = ''
}) => {
  const { isFieldSkipped } = useOnboarding();
  const isSkipped = isFieldSkipped(stepNumber, fieldName);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {showSkipButton && (
          <SkipButton
            stepNumber={stepNumber}
            fieldName={fieldName}
            type="field"
            size={skipButtonSize}
            variant={skipButtonVariant}
          />
        )}
      </div>
      
      {/* Field Content */}
      <div className={`transition-all duration-300 ${
        isSkipped ? 'opacity-50 pointer-events-none' : 'opacity-100'
      }`}>
        {children}
      </div>
      
      {/* Skipped Overlay */}
      {isSkipped && (
        <div className="absolute inset-0 bg-amber-50/30 backdrop-filter backdrop-blur-sm rounded-lg border-2 border-dashed border-amber-300/50 flex items-center justify-center mt-8">
          <div className="bg-amber-100/80 backdrop-filter backdrop-blur-10 px-3 py-2 rounded-lg border border-amber-200">
            <p className="text-amber-700 text-sm font-medium">Field Skipped</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldWrapper;