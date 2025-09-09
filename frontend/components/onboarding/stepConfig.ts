import { StepHandle } from './steps/types';

export interface StepConfiguration {
  id: number;
  title: string;
  component: string;
  required: boolean;
  validationRules: ValidationRule[];
  dependencies?: number[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'url' | 'number' | 'min' | 'max' | 'pattern';
  value?: any;
  message: string;
}

export interface StepValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export const STEP_CONFIGURATIONS: Record<number, StepConfiguration> = {
  1: {
    id: 1,
    title: "Villa Information",
    component: "VillaInformationStepEnhanced",
    required: true,
    validationRules: [
      { field: 'villaName', type: 'required', message: 'Villa name is required' },
      { field: 'location', type: 'required', message: 'Location is required' },
      { field: 'address', type: 'required', message: 'Address is required' },
      { field: 'city', type: 'required', message: 'City is required' },
      { field: 'country', type: 'required', message: 'Country is required' },
      { field: 'bedrooms', type: 'number', message: 'Valid number of bedrooms required' },
      { field: 'bathrooms', type: 'number', message: 'Valid number of bathrooms required' },
      { field: 'maxGuests', type: 'number', message: 'Maximum guests must be a valid number' },
      { field: 'bedrooms', type: 'min', value: 1, message: 'At least 1 bedroom is required' },
      { field: 'bathrooms', type: 'min', value: 1, message: 'At least 1 bathroom is required' },
      { field: 'maxGuests', type: 'min', value: 1, message: 'Must accommodate at least 1 guest' }
    ]
  },
  2: {
    id: 2,
    title: "Owner Details",
    component: "OwnerDetailsStep",
    required: true,
    validationRules: [
      { field: 'firstName', type: 'required', message: 'First name is required' },
      { field: 'lastName', type: 'required', message: 'Last name is required' },
      { field: 'email', type: 'required', message: 'Email address is required' },
      { field: 'email', type: 'email', message: 'Valid email address is required' },
      { field: 'phone', type: 'required', message: 'Phone number is required' },
      { field: 'address', type: 'required', message: 'Owner address is required' },
      { field: 'city', type: 'required', message: 'Owner city is required' },
      { field: 'country', type: 'required', message: 'Owner country is required' }
    ]
  },
  3: {
    id: 3,
    title: "Contractual Details",
    component: "ContractualDetailsStep",
    required: true,
    validationRules: [
      { field: 'contractStartDate', type: 'required', message: 'Contract start date is required' },
      { field: 'contractEndDate', type: 'required', message: 'Contract end date is required' },
      { field: 'contractType', type: 'required', message: 'Contract type is required' },
      { field: 'commissionRate', type: 'required', message: 'Commission rate is required' },
      { field: 'commissionRate', type: 'number', message: 'Commission rate must be a valid number' },
      { field: 'commissionRate', type: 'min', value: 0, message: 'Commission rate cannot be negative' },
      { field: 'commissionRate', type: 'max', value: 50, message: 'Commission rate cannot exceed 50%' },
      { field: 'managementFee', type: 'number', message: 'Management fee must be a valid number' },
      { field: 'managementFee', type: 'min', value: 0, message: 'Management fee cannot be negative' }
    ]
  },
  4: {
    id: 4,
    title: "Bank Details",
    component: "BankDetailsStep",
    required: true,
    validationRules: [
      { field: 'accountName', type: 'required', message: 'Account holder name is required' },
      { field: 'bankName', type: 'required', message: 'Bank name is required' },
      { field: 'bankAccountNumber', type: 'required', message: 'Account number is required' },
      { field: 'currency', type: 'required', message: 'Currency is required' },
      { field: 'bankAccountNumber', type: 'pattern', value: '^[0-9A-Za-z\\-\\s]+$', message: 'Account number contains invalid characters' }
    ]
  },
  5: {
    id: 5,
    title: "OTA Credentials",
    component: "OTACredentialsStep",
    required: false,
    validationRules: [
      { field: 'bookingComUsername', type: 'email', message: 'Booking.com username should be a valid email' },
      { field: 'airbnbUsername', type: 'email', message: 'Airbnb username should be a valid email' },
      { field: 'vrboUsername', type: 'email', message: 'VRBO username should be a valid email' }
    ]
  },
  6: {
    id: 6,
    title: "Documents",
    component: "DocumentsUploadStep",
    required: false,
    validationRules: [
      { field: 'documents', type: 'min', value: 1, message: 'At least one document is recommended' }
    ]
  },
  7: {
    id: 7,
    title: "Staff",
    component: "StaffConfiguratorStep",
    required: false,
    validationRules: [
      { field: 'staff.*.firstName', type: 'required', message: 'Staff first name is required' },
      { field: 'staff.*.lastName', type: 'required', message: 'Staff last name is required' },
      { field: 'staff.*.position', type: 'required', message: 'Staff position is required' },
      { field: 'staff.*.email', type: 'email', message: 'Staff email must be valid if provided' }
    ]
  },
  8: {
    id: 8,
    title: "Facilities",
    component: "FacilitiesChecklistStep",
    required: false,
    validationRules: []
  },
  9: {
    id: 9,
    title: "Photos",
    component: "PhotoUploadStep",
    required: false,
    validationRules: [
      { field: 'photos', type: 'min', value: 3, message: 'At least 3 photos are recommended for better listing visibility' }
    ]
  },
  10: {
    id: 10,
    title: "Review & Submit",
    component: "ReviewSubmitStep",
    required: true,
    validationRules: [
      { field: 'agreedToTerms', type: 'required', message: 'You must agree to the terms and conditions' },
      { field: 'dataAccuracyConfirmed', type: 'required', message: 'Please confirm the accuracy of the provided data' }
    ]
  }
};

export const validateStepData = (stepNumber: number, data: any): StepValidationState => {
  const config = STEP_CONFIGURATIONS[stepNumber];
  if (!config) {
    return { isValid: true, errors: {}, warnings: {} };
  }

  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  for (const rule of config.validationRules) {
    // Handle nested staff validation (staff.*.fieldName)
    if (rule.field.startsWith('staff.*.')) {
      const fieldName = rule.field.replace('staff.*.', '');
      const staffArray = data.staff || [];
      
      if (Array.isArray(staffArray)) {
        staffArray.forEach((staff: any, index: number) => {
          const value = staff[fieldName];
          const errorKey = `staff[${index}].${fieldName}`;
          
          switch (rule.type) {
            case 'required':
              if (!value || (typeof value === 'string' && !value.trim())) {
                errors[errorKey] = rule.message;
              }
              break;
            case 'email':
              if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errors[errorKey] = rule.message;
              }
              break;
          }
        });
      }
      continue; // Skip the regular validation below
    }
    
    // Regular field validation
    const value = data[rule.field];

    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && !value.trim())) {
          errors[rule.field] = rule.message;
        }
        break;

      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[rule.field] = rule.message;
        }
        break;

      case 'url':
        if (value && !/^https?:\/\/.+$/.test(value)) {
          errors[rule.field] = rule.message;
        }
        break;

      case 'number':
        if (value && (isNaN(Number(value)) || Number(value) < 0)) {
          errors[rule.field] = rule.message;
        }
        break;

      case 'min':
        if (value && Number(value) < rule.value) {
          errors[rule.field] = rule.message;
        }
        break;

      case 'max':
        if (value && Number(value) > rule.value) {
          errors[rule.field] = rule.message;
        }
        break;

      case 'pattern':
        if (value && !new RegExp(rule.value).test(value)) {
          errors[rule.field] = rule.message;
        }
        break;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

export const canNavigateToStep = (
  targetStep: number, 
  completedSteps: number[], 
  stepValidations: Record<number, StepValidationState>
): boolean => {
  const config = STEP_CONFIGURATIONS[targetStep];
  if (!config) return false;

  // Allow free navigation to any step (for development)
  return true;
};

export const getStepProgress = (stepValidations: Record<number, StepValidationState>): {
  completed: number[];
  total: number;
  percentage: number;
} => {
  const completed = Object.entries(stepValidations)
    .filter(([, validation]) => validation.isValid)
    .map(([step]) => parseInt(step));
  
  const total = Object.keys(STEP_CONFIGURATIONS).length;
  const percentage = Math.round((completed.length / total) * 100);

  return { completed, total, percentage };
};