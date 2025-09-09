"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useValidation } from './ValidationProvider';

interface ValidationInputProps {
  stepNumber: number;
  fieldName: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'password';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  autoComplete?: string;
  className?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showValidationIcon?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

export const ValidationInput: React.FC<ValidationInputProps> = ({
  stepNumber,
  fieldName,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  helperText,
  autoComplete,
  className = '',
  validateOnChange = true,
  validateOnBlur = true,
  showValidationIcon = true,
  maxLength,
  minLength,
  pattern,
}) => {
  const {
    validateField,
    clearFieldError,
    getFieldError,
    isFieldValid,
    isValidating,
  } = useValidation();

  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const fieldKey = `${stepNumber}-${fieldName}`;
  const fieldError = getFieldError(stepNumber, fieldName);
  const isValid = isFieldValid(stepNumber, fieldName);
  const isFieldValidating = isValidating[fieldKey];

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(async (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
    setHasBeenTouched(true);

    // Clear error immediately on change if field becomes valid
    if (fieldError && newValue.trim()) {
      clearFieldError(stepNumber, fieldName);
    }

    // Validate on change if enabled
    if (validateOnChange && hasBeenTouched) {
      await validateField(stepNumber, fieldName, newValue);
    }
  }, [
    onChange,
    fieldError,
    clearFieldError,
    stepNumber,
    fieldName,
    validateOnChange,
    validateField,
    hasBeenTouched,
  ]);

  const handleBlur = useCallback(async () => {
    setHasBeenTouched(true);
    setIsFocused(false);

    if (validateOnBlur) {
      await validateField(stepNumber, fieldName, localValue);
    }

    onBlur?.();
  }, [validateOnBlur, validateField, stepNumber, fieldName, localValue, onBlur]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Validation status
  const validationStatus = isFieldValidating 
    ? 'validating' 
    : fieldError 
    ? fieldError.code === 'VALIDATION_WARNING' ? 'warning' : 'error'
    : hasBeenTouched && isValid 
    ? 'valid' 
    : 'neutral';

  // Styles based on validation status
  const inputStyles = {
    neutral: 'border-slate-300 focus:border-blue-500 focus:ring-blue-500',
    validating: 'border-blue-400 focus:border-blue-500 focus:ring-blue-500',
    valid: 'border-green-500 focus:border-green-600 focus:ring-green-500',
    warning: 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500',
    error: 'border-red-500 focus:border-red-600 focus:ring-red-500',
  };

  const iconStyles = {
    neutral: '',
    validating: 'text-blue-500',
    valid: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
  };

  const ValidationIcon = () => {
    if (!showValidationIcon || validationStatus === 'neutral') return null;

    switch (validationStatus) {
      case 'validating':
        return <Loader2 className={`w-4 h-4 animate-spin ${iconStyles.validating}`} />;
      case 'valid':
        return <CheckCircle className={`w-4 h-4 ${iconStyles.valid}`} />;
      case 'warning':
        return <AlertTriangle className={`w-4 h-4 ${iconStyles.warning}`} />;
      case 'error':
        return <AlertCircle className={`w-4 h-4 ${iconStyles.error}`} />;
      default:
        return null;
    }
  };

  const inputId = `${stepNumber}-${fieldName}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label 
        htmlFor={inputId}
        className={`block text-sm font-medium transition-colors duration-200 ${
          validationStatus === 'error' 
            ? 'text-red-700' 
            : validationStatus === 'warning'
            ? 'text-yellow-700'
            : 'text-slate-700'
        }`}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        )}
      </label>

      {/* Input Container */}
      <div className="relative">
        <input
          id={inputId}
          type={type}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          aria-invalid={validationStatus === 'error'}
          aria-describedby={`${fieldError ? errorId : ''} ${helperText ? helperId : ''}`.trim()}
          className={`
            w-full px-3 py-2 pr-10 text-sm border rounded-lg
            transition-all duration-200
            placeholder-slate-400
            disabled:bg-slate-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            ${inputStyles[validationStatus]}
            ${isFocused ? 'shadow-sm' : ''}
          `}
        />
        
        {/* Validation Icon */}
        {showValidationIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ValidationIcon />
          </div>
        )}
      </div>

      {/* Helper Text */}
      {helperText && !fieldError && (
        <p 
          id={helperId}
          className="text-xs text-slate-500"
        >
          {helperText}
        </p>
      )}

      {/* Error/Warning Message */}
      {fieldError && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className={`flex items-start space-x-2 text-xs ${
            fieldError.code === 'VALIDATION_WARNING' ? 'text-yellow-600' : 'text-red-600'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {fieldError.code === 'VALIDATION_WARNING' ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
          </div>
          <span>{fieldError.message}</span>
        </div>
      )}

      {/* Character Counter */}
      {maxLength && (
        <div className="text-xs text-slate-500 text-right">
          {localValue.length}/{maxLength}
        </div>
      )}
    </div>
  );
};

export default ValidationInput;