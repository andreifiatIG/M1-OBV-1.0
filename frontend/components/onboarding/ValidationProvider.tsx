"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { validateStepData } from './stepConfig';

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
          // Create validation data with current field value
          const validationData = { [fieldName]: value };
          
          // Use the existing step validation system
          const stepValidation = validateStepData(stepNumber, validationData);
          const fieldError = stepValidation.errors[fieldName];
          const fieldWarning = stepValidation.warnings[fieldName];

          if (fieldError) {
            const error: FieldError = {
              message: fieldError,
              code: 'VALIDATION_ERROR',
              timestamp: Date.now(),
            };

            // Update errors state
            setErrors(prev => ({
              ...prev,
              [stepNumber]: {
                ...prev[stepNumber],
                [fieldName]: error,
              },
            }));

            resolve(error);
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

            // Handle warnings
            if (fieldWarning) {
              const warning: FieldError = {
                message: fieldWarning,
                code: 'VALIDATION_WARNING',
                timestamp: Date.now(),
              };

              setWarnings(prev => ({
                ...prev,
                [stepNumber]: {
                  ...prev[stepNumber],
                  [fieldName]: warning,
                },
              }));
            } else {
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
      const stepValidation = validateStepData(stepNumber, data);
      
      const errors: Record<string, FieldError> = {};
      const warnings: Record<string, FieldError> = {};

      // Convert validation results to FieldError format
      Object.entries(stepValidation.errors).forEach(([field, message]) => {
        errors[field] = {
          message,
          code: 'VALIDATION_ERROR',
          timestamp: Date.now(),
        };
      });

      Object.entries(stepValidation.warnings).forEach(([field, message]) => {
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

      // Show toast for step validation results
      if (!stepValidation.isValid) {
        const errorCount = Object.keys(errors).length;
        toast.error(`${errorCount} validation error${errorCount !== 1 ? 's' : ''} found in current step`);
      }

      return {
        isValid: stepValidation.isValid,
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