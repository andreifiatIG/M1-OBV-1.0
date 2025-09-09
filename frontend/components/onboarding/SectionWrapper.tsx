"use client";

import React from 'react';
import SkipButton from './SkipButton';
import { useOnboarding } from './OnboardingContext';

interface SectionWrapperProps {
  stepNumber: number;
  sectionName: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  showSkipButton?: boolean;
  skipButtonSize?: 'sm' | 'md' | 'lg';
  skipButtonVariant?: 'subtle' | 'prominent';
  className?: string;
  icon?: React.ReactNode;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  stepNumber,
  sectionName,
  title,
  description,
  children,
  showSkipButton = true,
  skipButtonSize = 'md',
  skipButtonVariant = 'prominent',
  className = '',
  icon
}) => {
  const { isFieldSkipped } = useOnboarding();
  const isSkipped = isFieldSkipped(stepNumber, sectionName);

  return (
    <div className={`glass-card-white-teal rounded-lg p-6 relative ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {icon && <div className="mr-3">{icon}</div>}
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
          </div>
        </div>
        {showSkipButton && (
          <SkipButton
            stepNumber={stepNumber}
            fieldName={sectionName}
            type="section"
            size={skipButtonSize}
            variant={skipButtonVariant}
          />
        )}
      </div>

      {/* Section Content */}
      <div className={`transition-all duration-300 ${
        isSkipped ? 'opacity-40 pointer-events-none' : 'opacity-100'
      }`}>
        {children}
      </div>

      {/* Skipped Overlay */}
      {isSkipped && (
        <div className="absolute inset-0 bg-amber-50/20 backdrop-filter backdrop-blur-sm rounded-lg border-2 border-dashed border-amber-300/50 flex items-center justify-center">
          <div className="bg-amber-100/90 backdrop-filter backdrop-blur-10 px-4 py-3 rounded-lg border border-amber-200 shadow-sm">
            <div className="text-center">
              <p className="text-amber-700 font-medium text-sm">Section Skipped</p>
              <p className="text-amber-600 text-xs mt-1">You can unskip this section at any time</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionWrapper;