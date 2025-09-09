export interface StepHandle {
  validate: () => boolean;
  getData: () => any;
}

// New declarative interface for steps
export interface StepProps {
  data: any;
  onUpdate: (data: any) => void;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}