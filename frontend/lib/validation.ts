// Validation utilities for onboarding forms

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Step 1: Villa Information validation
export function validateVillaInformation(data: any): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Required fields
  if (!data.villaName?.trim()) {
    errors.villaName = 'Villa name is required';
  }
  
  if (!data.villaAddress?.trim()) {
    errors.villaAddress = 'Villa address is required';
  }
  
  if (!data.villaCity?.trim()) {
    errors.villaCity = 'City is required';
  }
  
  // Numeric validations
  const bedrooms = parseInt(data.bedrooms);
  if (!bedrooms || bedrooms < 1) {
    errors.bedrooms = 'At least 1 bedroom is required';
  } else if (bedrooms > 20) {
    errors.bedrooms = 'Please enter a valid number of bedrooms';
  }
  
  const bathrooms = parseInt(data.bathrooms);
  if (!bathrooms || bathrooms < 1) {
    errors.bathrooms = 'At least 1 bathroom is required';
  } else if (bathrooms > 20) {
    errors.bathrooms = 'Please enter a valid number of bathrooms';
  }
  
  const maxGuests = parseInt(data.maxGuests);
  if (!maxGuests || maxGuests < 1) {
    errors.maxGuests = 'Maximum guests must be at least 1';
  } else if (maxGuests > 50) {
    errors.maxGuests = 'Please enter a valid number of guests';
  }
  
  if (!data.propertyType) {
    errors.propertyType = 'Property type is required';
  }
  
  // Optional URL validations
  if (data.googleMapsLink && !isValidUrl(data.googleMapsLink)) {
    errors.googleMapsLink = 'Please enter a valid URL';
  }
  
  if (data.oldRatesCardLink && !isValidUrl(data.oldRatesCardLink)) {
    errors.oldRatesCardLink = 'Please enter a valid URL';
  }
  
  if (data.iCalCalendarLink && !isValidUrl(data.iCalCalendarLink)) {
    errors.iCalCalendarLink = 'Please enter a valid URL';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Step 2: Owner Details validation
export function validateOwnerDetails(data: any): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data.ownerFirstName?.trim()) {
    errors.ownerFirstName = 'First name is required';
  }
  
  if (!data.ownerLastName?.trim()) {
    errors.ownerLastName = 'Last name is required';
  }
  
  if (!data.ownerEmail?.trim()) {
    errors.ownerEmail = 'Email is required';
  } else if (!isValidEmail(data.ownerEmail)) {
    errors.ownerEmail = 'Please enter a valid email address';
  }
  
  if (!data.ownerPhone?.trim()) {
    errors.ownerPhone = 'Phone number is required';
  } else if (!isValidPhone(data.ownerPhone)) {
    errors.ownerPhone = 'Please enter a valid phone number';
  }
  
  if (!data.ownerAddress?.trim()) {
    errors.ownerAddress = 'Address is required';
  }
  
  if (!data.ownerCity?.trim()) {
    errors.ownerCity = 'City is required';
  }
  
  if (!data.ownerCountry?.trim()) {
    errors.ownerCountry = 'Country is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Step 3: Contractual Details validation
export function validateContractualDetails(data: any): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data.contractStartDate) {
    errors.contractStartDate = 'Contract start date is required';
  }
  
  if (!data.contractType) {
    errors.contractType = 'Contract type is required';
  }
  
  const commissionRate = parseFloat(data.commissionRate);
  if (isNaN(commissionRate) || commissionRate < 0) {
    errors.commissionRate = 'Commission rate is required';
  } else if (commissionRate > 100) {
    errors.commissionRate = 'Commission rate cannot exceed 100%';
  }
  
  // Validate payout days if provided
  if (data.payoutDay1) {
    const day1 = parseInt(data.payoutDay1);
    if (isNaN(day1) || day1 < 1 || day1 > 31) {
      errors.payoutDay1 = 'Payout day must be between 1 and 31';
    }
  }
  
  if (data.payoutDay2) {
    const day2 = parseInt(data.payoutDay2);
    if (isNaN(day2) || day2 < 1 || day2 > 31) {
      errors.payoutDay2 = 'Payout day must be between 1 and 31';
    }
  }
  
  // Validate times
  if (!data.checkInTime) {
    errors.checkInTime = 'Check-in time is required';
  }
  
  if (!data.checkOutTime) {
    errors.checkOutTime = 'Check-out time is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Step 4: Bank Details validation
export function validateBankDetails(data: any): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data.bankName?.trim()) {
    errors.bankName = 'Bank name is required';
  }
  
  if (!data.accountHolderName?.trim()) {
    errors.accountHolderName = 'Account holder name is required';
  }
  
  if (!data.accountNumber?.trim()) {
    errors.accountNumber = 'Account number is required';
  }
  
  if (!data.currency) {
    errors.currency = 'Currency is required';
  }
  
  // Optional but validate if provided
  if (data.swiftCode && !isValidSwiftCode(data.swiftCode)) {
    errors.swiftCode = 'Please enter a valid SWIFT code';
  }
  
  if (data.iban && !isValidIBAN(data.iban)) {
    errors.iban = 'Please enter a valid IBAN';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Step 5: OTA Credentials validation
export function validateOTACredentials(data: any): ValidationResult {
  const errors: Record<string, string> = {};
  
  // OTA credentials are optional, but validate if provided
  if (data.otaCredentials && Array.isArray(data.otaCredentials)) {
    data.otaCredentials.forEach((cred: any, index: number) => {
      if (cred.platform && !cred.username) {
        errors[`ota_${index}_username`] = `Username required for ${cred.platform}`;
      }
      if (cred.platform && !cred.password) {
        errors[`ota_${index}_password`] = `Password required for ${cred.platform}`;
      }
    });
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Steps 6-9: These steps are optional and don't require validation
export function validateOptionalStep(): ValidationResult {
  return {
    isValid: true,
    errors: {}
  };
}

// Step 10: Review & Submit validation
export function validateReviewSubmit(data: any): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!data.agreedToTerms) {
    errors.agreedToTerms = 'You must agree to the terms and conditions';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Main validation function
export function validateOnboardingStep(step: number, data: any): ValidationResult {
  switch (step) {
    case 1:
      return validateVillaInformation(data);
    case 2:
      return validateOwnerDetails(data);
    case 3:
      return validateContractualDetails(data);
    case 4:
      return validateBankDetails(data);
    case 5:
      return validateOTACredentials(data);
    case 6:
    case 7:
    case 8:
    case 9:
      return validateOptionalStep();
    case 10:
      return validateReviewSubmit(data);
    default:
      return { isValid: true, errors: {} };
  }
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

function isValidSwiftCode(swift: string): boolean {
  // SWIFT codes are 8 or 11 characters
  const swiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return swiftRegex.test(swift.toUpperCase());
}

function isValidIBAN(iban: string): boolean {
  // Basic IBAN validation (length varies by country)
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
  return ibanRegex.test(iban.replace(/\s/g, '').toUpperCase());
}