"use client";

import React from 'react';
import { SkipForward, Eye, EyeOff } from 'lucide-react';
import { useOnboarding } from './OnboardingContext';

interface SkipButtonProps {
  stepNumber: number;
  fieldName: string;
  type?: 'field' | 'section';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'subtle' | 'prominent';
  className?: string;
}

const SkipButton: React.FC<SkipButtonProps> = ({
  stepNumber,
  fieldName,
  type = 'field',
  size = 'sm',
  variant = 'subtle',
  className = ''
}) => {
  const { skipField, unskipField, isFieldSkipped } = useOnboarding();
  const isSkipped = isFieldSkipped(stepNumber, fieldName);

  const handleToggle = () => {
    if (isSkipped) {
      unskipField(stepNumber, fieldName);
    } else {
      skipField(stepNumber, fieldName);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-4 py-3 text-base';
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  const getVariantClasses = () => {
    if (isSkipped) {
      return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200';
    }
    
    switch (variant) {
      case 'subtle':
        return 'bg-transparent text-teal-600 border-teal-300 hover:bg-teal-50';
      case 'prominent':
        return 'bg-transparent text-teal-600 border-teal-300 hover:bg-teal-50';
      default:
        return 'bg-transparent text-teal-600 border-teal-300 hover:bg-teal-50';
    }
  };

  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`
        inline-flex items-center gap-2 rounded-xl border backdrop-filter backdrop-blur-10 
        font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50
        ${getSizeClasses()}
        ${getVariantClasses()}
        ${className}
      `}
      title={isSkipped ? `Unskip this ${type}` : `Skip this ${type}`}
    >
      {isSkipped ? (
        <>
          <Eye className={iconSize} />
          {size !== 'sm' && (type === 'field' ? 'Unskip Field' : 'Unskip Section')}
        </>
      ) : (
        <>
          <SkipForward className={iconSize} />
          {size !== 'sm' && (type === 'field' ? 'Skip Field' : 'Skip Section')}
        </>
      )}
    </button>
  );
};

export default SkipButton;