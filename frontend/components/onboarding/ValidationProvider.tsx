"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { validateStepData } from './stepConfig';
// Temporarily disable shared validation to fix build
// import {
//   validateStep as validateStepWithSharedSchema,
//   validateField as validateFieldWithSharedSchema,
//   isStepComplete,
//   getRequiredFields
// } from '@/lib/validation/shared-validation';

interface FieldError {
  message: string;
  code?: string;
  timestamp?: number;
}

interface ValidationContextType {
  errors: Record<string, Record<string, FieldError>>;
  warnings: Record<string, Record<string, FieldError>>;
  isValidating: Record<string, boolean>;
  validateField: (stepNumber: number, fieldName: string, value: any) => Promise<FieldError | null>;
  validateStep: (stepNumber: number, data: any) => Promise<{ isValid: boolean; errors: Record<string, FieldError>; warnings: Record<string, FieldError> }>;
  clearFieldError: (stepNumber: number, fieldName: string) => void;
  clearStepErrors: (stepNumber: number) => void;
  applyBackendErrors: (stepNumber: number, backendErrors: Record<string, string | string[]>) => void;
  applyBackendWarnings: (stepNumber: number, backendWarnings: Record<string, string | string[]>) => void;
  getFieldError: (stepNumber: number, fieldName: string) => FieldError | null;
  getStepErrors: (stepNumber: number) => Record<string, FieldError>;
  isFieldValid: (stepNumber: number, fieldName: string) => boolean;
  isStepValid: (stepNumber: number) => boolean;
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export const useValidation = () => {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
};

interface ValidationProviderProps {
  children: React.ReactNode;
  debounceMs?: number;
  enableRealTimeValidation?: boolean;
}

export const ValidationProvider: React.FC<ValidationProviderProps> = ({
  children,
  debounceMs = 500,
  enableRealTimeValidation = true,
}) => {
  const [errors, setErrors] = useState<Record<string, Record<string, FieldError>>>({});
  const [warnings, setWarnings] = useState<Record<string, Record<string, FieldError>>>({});
  const [isValidating, setIsValidating] = useState<Record<string, boolean>>({});
  
  const validationTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const validateField = useCallback(async (
    stepNumber: number,
    fieldName: string,
    value: any
  ): Promise<FieldError | null> => {
    if (!enableRealTimeValidation) return null;

    const fieldKey = `${stepNumber}-${fieldName}`;

    // Clear existing timeout
    if (validationTimeouts.current[fieldKey]) {
      clearTimeout(validationTimeouts.current[fieldKey]);
    }

    // Set validation loading state
    setIsValidating(prev => ({ ...prev, [fieldKey]: true }));

    return new Promise((resolve) => {
      validationTimeouts.current[fieldKey] = setTimeout(async () => {
        try {
          // Temporarily use legacy validation only until shared validation is fixed
          const validationData = { [fieldName]: value };
          const stepValidation = validateStepData(stepNumber, validationData);
          const legacyFieldError = stepValidation.errors[fieldName];

          let fieldError: FieldError | null = null;

          if (legacyFieldError) {
            fieldError = {
              message: legacyFieldError,
              code: 'LEGACY_VALIDATION_ERROR',
              timestamp: Date.now(),
            };
          }

          if (fieldError) {
            // Update errors state
            setErrors(prev => ({
              ...prev,
              [stepNumber]: {
                ...prev[stepNumber],
                [fieldName]: fieldError,
              },
            }));

            resolve(fieldError);
          } else {
            // Clear field error if validation passes
            setErrors(prev => {
              const stepErrors = { ...prev[stepNumber] };
              delete stepErrors[fieldName];
              return {
                ...prev,
                [stepNumber]: stepErrors,
              };
            });

            // Clear warnings if validation passes
            {
              // Clear field warning
              setWarnings(prev => {
                const stepWarnings = { ...prev[stepNumber] };
                delete stepWarnings[fieldName];
                return {
                  ...prev,
                  [stepNumber]: stepWarnings,
                };
              });
            }

            resolve(null);
          }
        } catch (error) {
          console.error('Field validation error:', error);
          const validationError: FieldError = {
            message: 'Validation failed',
            code: 'VALIDATION_SYSTEM_ERROR',
            timestamp: Date.now(),
          };

          setErrors(prev => ({
            ...prev,
            [stepNumber]: {
              ...prev[stepNumber],
              [fieldName]: validationError,
            },
          }));

          resolve(validationError);
        } finally {
          // Clear validation loading state
          setIsValidating(prev => ({ ...prev, [fieldKey]: false }));
        }
      }, debounceMs);
    });
  }, [enableRealTimeValidation, debounceMs]);

  const validateStep = useCallback(async (stepNumber: number, data: any) => {
    setIsValidating(prev => ({ ...prev, [`step-${stepNumber}`]: true }));

    try {
      // Temporarily use legacy validation only until shared validation is fixed
      const legacyValidation = validateStepData(stepNumber, data);

      const errors: Record<string, FieldError> = {};
      const warnings: Record<string, FieldError> = {};

      // Convert validation results to FieldError format
      Object.entries(legacyValidation.errors).forEach(([field, message]) => {
        errors[field] = {
          message,
          code: 'LEGACY_VALIDATION_ERROR',
          timestamp: Date.now(),
        };
      });

      // Add warnings from legacy system
      Object.entries(legacyValidation.warnings).forEach(([field, message]) => {
        warnings[field] = {
          message,
          code: 'VALIDATION_WARNING',
          timestamp: Date.now(),
        };
      });

      // Update state
      setErrors(prev => ({
        ...prev,
        [stepNumber]: errors,
      }));

      setWarnings(prev => ({
        ...prev,
        [stepNumber]: warnings,
      }));

      const isValid = Object.keys(errors).length === 0;

      // Show toast for step validation results
      if (!isValid) {
        const errorCount = Object.keys(errors).length;
        toast.error(`${errorCount} validation error${errorCount !== 1 ? 's' : ''} found in current step`);
      }

      return {
        isValid,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Step validation error:', error);
      toast.error('Validation system error occurred');
      
      return {
        isValid: false,
        errors: {
          _system: {
            message: 'Validation system error',
            code: 'VALIDATION_SYSTEM_ERROR',
            timestamp: Date.now(),
          },
        },
        warnings: {},
      };
    } finally {
      setIsValidating(prev => ({ ...prev, [`step-${stepNumber}`]: false }));
    }
  }, []);

  const clearFieldError = useCallback((stepNumber: number, fieldName: string) => {
    setErrors(prev => {
      const stepErrors = { ...prev[stepNumber] };
      delete stepErrors[fieldName];
      return {
        ...prev,
        [stepNumber]: stepErrors,
      };
    });

    setWarnings(prev => {
      const stepWarnings = { ...prev[stepNumber] };
      delete stepWarnings[fieldName];
      return {
        ...prev,
        [stepNumber]: stepWarnings,
      };
    });
  }, []);

  const clearStepErrors = useCallback((stepNumber: number) => {
    setErrors(prev => ({
      ...prev,
      [stepNumber]: {},
    }));

    setWarnings(prev => ({
      ...prev,
      [stepNumber]: {},
    }));
  }, []);

  const applyBackendErrors = useCallback((stepNumber: number, backendErrors: Record<string, string | string[]>) => {
    const formatted: Record<string, FieldError> = {};

    Object.entries(backendErrors).forEach(([field, message]) => {
      if (message === undefined || message === null) {
        return;
      }

      const text = Array.isArray(message) ? message.join(', ') : message;
      const key = field && field.length > 0 ? field : '_step';

      formatted[key] = {
        message: text || 'Invalid value',
        code: 'BACKEND_VALIDATION_ERROR',
        timestamp: Date.now(),
      };
    });

    if (Object.keys(formatted).length === 0) {
      return;
    }

    setErrors(prev => ({
      ...prev,
      [stepNumber]: {
        ...(prev[stepNumber] || {}),
        ...formatted,
      },
    }));
  }, []);

  const applyBackendWarnings = useCallback((stepNumber: number, backendWarnings: Record<string, string | string[]>) => {
    const formatted: Record<string, FieldError> = {};

    Object.entries(backendWarnings).forEach(([field, message]) => {
      if (message === undefined || message === null) {
        return;
      }

      const text = Array.isArray(message) ? message.join(', ') : message;
      const key = field && field.length > 0 ? field : '_step';

      formatted[key] = {
        message: text || 'Additional information recommended',
        code: 'BACKEND_VALIDATION_WARNING',
        timestamp: Date.now(),
      };
    });

    if (Object.keys(formatted).length === 0) {
      return;
    }

    setWarnings(prev => ({
      ...prev,
      [stepNumber]: {
        ...(prev[stepNumber] || {}),
        ...formatted,
      },
    }));
  }, []);

  const getFieldError = useCallback((stepNumber: number, fieldName: string): FieldError | null => {
    return errors[stepNumber]?.[fieldName] || null;
  }, [errors]);

  const getStepErrors = useCallback((stepNumber: number): Record<string, FieldError> => {
    return errors[stepNumber] || {};
  }, [errors]);

  const isFieldValid = useCallback((stepNumber: number, fieldName: string): boolean => {
    return !errors[stepNumber]?.[fieldName];
  }, [errors]);

  const isStepValid = useCallback((stepNumber: number): boolean => {
    const stepErrors = errors[stepNumber] || {};
    return Object.keys(stepErrors).length === 0;
  }, [errors]);

  const contextValue: ValidationContextType = {
    errors,
    warnings,
    isValidating,
    validateField,
    validateStep,
    clearFieldError,
    clearStepErrors,
    applyBackendErrors,
    applyBackendWarnings,
    getFieldError,
    getStepErrors,
    isFieldValid,
    isStepValid,
  };

  return (
    <ValidationContext.Provider value={contextValue}>
      {children}
    </ValidationContext.Provider>
  );
};

export default ValidationProvider;
