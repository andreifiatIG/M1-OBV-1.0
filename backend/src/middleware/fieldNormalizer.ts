/**
 * Field Normalizer Middleware
 *
 * Normalizes frontend field names to database schema field names BEFORE sanitization.
 * This ensures StepFieldProgress and primary tables use consistent field names.
 *
 * CRITICAL: This solves the field mapping chaos where frontend sends villaAddress
 * but database expects address, causing data to be lost or not retrieved correctly.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Villa field mappings (Step 1)
 * Maps frontend field names → database field names
 *
 * ⚡ FIXED: Frontend now uses database field names directly
 * Supporting both old and new field name formats for compatibility
 */
const VILLA_FIELD_MAPPINGS: Record<string, string> = {
  // ========== LEGACY MAPPINGS (for backward compatibility) ==========
  // Address fields
  villaAddress: 'address',
  villaCity: 'city',
  villaCountry: 'country',
  villaPostalCode: 'zipCode',
  // Size fields
  villaArea: 'propertySize',
  landArea: 'plotSize',

  // ========== DIRECT MAPPINGS (current frontend uses these) ==========
  // All these fields are already using database names in frontend
  villaName: 'villaName',
  villaCode: 'villaCode',
  address: 'address',              // ⚡ FIXED: frontend now uses database names directly
  city: 'city',                    // ⚡ FIXED
  country: 'country',              // ⚡ FIXED
  zipCode: 'zipCode',              // ⚡ FIXED
  propertySize: 'propertySize',    // ⚡ FIXED
  plotSize: 'plotSize',            // ⚡ FIXED
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  maxGuests: 'maxGuests',
  yearBuilt: 'yearBuilt',          // ⚡ FIXED: was missing proper handling
  renovationYear: 'renovationYear', // ⚡ FIXED: was missing proper handling
  propertyType: 'propertyType',
  villaStyle: 'villaStyle',        // ⚡ FIXED: was missing proper handling
  description: 'description',
  shortDescription: 'shortDescription',
  latitude: 'latitude',            // ⚡ FIXED: was missing proper handling
  longitude: 'longitude',          // ⚡ FIXED: was missing proper handling
  locationType: 'locationType',    // ⚡ FIXED: was missing proper handling
  googleMapsLink: 'googleMapsLink',
  iCalCalendarLink: 'iCalCalendarLink',
  oldRatesCardLink: 'oldRatesCardLink',
  propertyEmail: 'propertyEmail',
  propertyWebsite: 'propertyWebsite',
  status: 'status',
};

/**
 * Owner field mappings (Step 2)
 * Most owner fields align already, but include for completeness
 */
const OWNER_FIELD_MAPPINGS: Record<string, string> = {
  ownerType: 'ownerType',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  phoneCountryCode: 'phoneCountryCode',
  phoneDialCode: 'phoneDialCode',
  alternativePhone: 'alternativePhone',
  alternativePhoneCountryCode: 'alternativePhoneCountryCode',
  alternativePhoneDialCode: 'alternativePhoneDialCode',
  nationality: 'nationality',
  passportNumber: 'passportNumber',
  idNumber: 'idNumber',
  address: 'address',
  city: 'city',
  country: 'country',
  zipCode: 'zipCode',
  companyName: 'companyName',
  companyAddress: 'companyAddress',
  companyTaxId: 'companyTaxId',
  companyVat: 'companyVat',
  managerName: 'managerName',
  managerEmail: 'managerEmail',
  managerPhone: 'managerPhone',
  managerPhoneCountryCode: 'managerPhoneCountryCode',
  managerPhoneDialCode: 'managerPhoneDialCode',
  preferredLanguage: 'preferredLanguage',
  communicationPreference: 'communicationPreference',
  notes: 'notes',
};

/**
 * Contractual Details field mappings (Step 3)
 * Mostly aligned already
 */
const CONTRACTUAL_FIELD_MAPPINGS: Record<string, string> = {
  contractStartDate: 'contractStartDate',
  contractEndDate: 'contractEndDate',
  contractType: 'contractType',
  commissionRate: 'commissionRate',
  managementFee: 'managementFee',
  marketingFee: 'marketingFee',
  paymentTerms: 'paymentTerms',
  paymentSchedule: 'paymentSchedule',
  minimumStayNights: 'minimumStayNights',
  payoutDay1: 'payoutDay1',
  payoutDay2: 'payoutDay2',
  vatRegistrationNumber: 'vatRegistrationNumber',
  dbdNumber: 'dbdNumber',
  vatPaymentTerms: 'vatPaymentTerms',
  paymentThroughIPL: 'paymentThroughIPL',
  cancellationPolicy: 'cancellationPolicy',
  checkInTime: 'checkInTime',
  checkOutTime: 'checkOutTime',
  insuranceProvider: 'insuranceProvider',
  insurancePolicyNumber: 'insurancePolicyNumber',
  insuranceExpiry: 'insuranceExpiry',
  specialTerms: 'specialTerms',
};

/**
 * Bank Details field mappings (Step 4)
 */
const BANK_FIELD_MAPPINGS: Record<string, string> = {
  accountHolderName: 'accountHolderName',
  accountName: 'accountHolderName',  // Alias
  bankName: 'bankName',
  accountNumber: 'accountNumber',
  bankAccountNumber: 'accountNumber',  // Alias
  iban: 'iban',
  swiftCode: 'swiftCode',
  swiftBicCode: 'swiftCode',  // Alias
  branchName: 'branchName',
  bankBranch: 'branchName',  // Alias
  branchCode: 'branchCode',
  bankAddress: 'bankAddress',
  branchAddress: 'branchAddress',
  bankCountry: 'bankCountry',
  currency: 'currency',
  accountType: 'accountType',
  notes: 'notes',
  bankNotes: 'notes',  // Alias
};

/**
 * Staff field mappings (Step 7)
 * Maps old frontend field names to unified database field names
 */
const STAFF_FIELD_MAPPINGS: Record<string, string> = {
  // Fixed field name mappings
  idCard: 'idNumber',                    // ⚡ FIXED: was idCard
  baseSalary: 'salary',                  // ⚡ FIXED: was baseSalary
  otherDeduct: 'otherDeductions',        // ⚡ FIXED: was otherDeduct
  healthInsurance: 'hasHealthInsurance', // ⚡ FIXED: was healthInsurance
  workInsurance: 'hasWorkInsurance',     // ⚡ FIXED: was workInsurance

  // Direct mappings (unified field names)
  firstName: 'firstName',
  lastName: 'lastName',
  nickname: 'nickname',
  position: 'position',
  department: 'department',
  employmentType: 'employmentType',
  idNumber: 'idNumber',
  passportNumber: 'passportNumber',
  nationality: 'nationality',
  dateOfBirth: 'dateOfBirth',
  email: 'email',
  phone: 'phone',
  phoneCountryCode: 'phoneCountryCode',
  phoneDialCode: 'phoneDialCode',
  maritalStatus: 'maritalStatus',
  emergencyContacts: 'emergencyContacts',
  salary: 'salary',
  salaryFrequency: 'salaryFrequency',
  currency: 'currency',
  startDate: 'startDate',
  endDate: 'endDate',
  numberOfDaySalary: 'numberOfDaySalary',
  serviceCharge: 'serviceCharge',
  foodAllowance: 'foodAllowance',
  hasAccommodation: 'hasAccommodation',
  hasTransport: 'hasTransport',
  transportation: 'transportation',
  hasHealthInsurance: 'hasHealthInsurance',
  hasWorkInsurance: 'hasWorkInsurance',
  totalIncome: 'totalIncome',
  totalNetIncome: 'totalNetIncome',
  otherDeductions: 'otherDeductions',
};

/**
 * Get field mappings for a specific step
 */
function getFieldMappingsForStep(step: number): Record<string, string> {
  switch (step) {
    case 1:
      return VILLA_FIELD_MAPPINGS;
    case 2:
      return OWNER_FIELD_MAPPINGS;
    case 3:
      return CONTRACTUAL_FIELD_MAPPINGS;
    case 4:
      return BANK_FIELD_MAPPINGS;
    case 5:
      return {}; // ⚡ OTA Credentials - handled specially as array structure
    case 7:
      return STAFF_FIELD_MAPPINGS;  // ⚡ ADDED: Staff Configuration
    default:
      return {}; // Steps 6, 8-10 don't need field normalization yet
  }
}

/**
 * Normalize field names in an object based on step
 */
export function normalizeFields(step: number, data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const mappings = getFieldMappingsForStep(step);
  if (Object.keys(mappings).length === 0) {
    return data;  // No normalization needed for this step
  }

  // Special handling for Step 5 (OTA Credentials) - convert flat to array format
  if (step === 5) {
    return convertOTACredentialsToArray(data);
  }

  // Special handling for Step 7 (Staff) - data.staff is an array
  if (step === 7 && data.staff && Array.isArray(data.staff)) {
    const normalizedStaff = data.staff.map((staffMember: any) => {
      return normalizeStaffMember(staffMember, mappings);
    });

    return {
      ...data,
      staff: normalizedStaff
    };
  }

  const normalized: any = {};
  const unmappedFields: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = mappings[key];

    if (normalizedKey) {
      // Use mapped field name
      normalized[normalizedKey] = value;
    } else if (key.startsWith('_') || key === 'step' || key === 'version' || key === 'operationId' || key === 'clientTimestamp') {
      // Pass through metadata fields
      normalized[key] = value;
    } else {
      // Field not in mapping - could be new field or typo
      unmappedFields.push(key);
      normalized[key] = value;  // Keep it anyway
    }
  }

  if (unmappedFields.length > 0 && process.env.NODE_ENV === 'development') {
    logger.debug(`[FIELD-NORMALIZER] Step ${step} has unmapped fields:`, {
      unmappedFields,
      hint: 'Add these to fieldNormalizer.ts if they are valid database fields'
    });
  }

  logger.debug(`[FIELD-NORMALIZER] Step ${step} normalization:`, {
    originalKeys: Object.keys(data),
    normalizedKeys: Object.keys(normalized),
    mappedCount: Object.keys(data).length - unmappedFields.length,
    unmappedCount: unmappedFields.length,
  });

  return normalized;
}

/**
 * Convert OTA Credentials from flat format to array format
 * Handles both old flat format and new array format
 */
function convertOTACredentialsToArray(data: any): any {
  // If already array format, return as-is
  if (Array.isArray(data)) {
    return data;
  }

  // Platform to enum mapping
  const platformEnumMap: Record<string, string> = {
    'bookingCom': 'BOOKING_COM',
    'airbnb': 'AIRBNB',
    'expedia': 'EXPEDIA',
    'vrbo': 'VRBO',
    'agoda': 'AGODA',
    'marriottHomesVillas': 'MARRIOTT_HOMES_VILLAS'
  };

  const credentials: any[] = [];

  // Convert from flat format to array format
  if (data && typeof data === 'object') {
    Object.keys(platformEnumMap).forEach(platformKey => {
      const isListedField = `${platformKey}Listed`;
      const isListed = data[isListedField];

      if (isListed) {
        credentials.push({
          platform: platformEnumMap[platformKey],
          propertyId: data[`${platformKey}PropertyId`] || null,
          username: data[`${platformKey}Username`] || null,
          password: data[`${platformKey}Password`] || null,
          apiKey: data[`${platformKey}ApiKey`] || null,
          apiSecret: data[`${platformKey}ApiSecret`] || null,
          accountUrl: data[`${platformKey}AccountUrl`] || null,
          propertyUrl: data[`${platformKey}PropertyUrl`] || null,
          listingUrl: data[`${platformKey}ListingUrl`] || null,
          isActive: true
        });
      }
    });
  }

  logger.debug('[FIELD-NORMALIZER] Converted OTA credentials:', {
    originalFormat: 'flat',
    newFormat: 'array',
    credentialsCount: credentials.length,
    platforms: credentials.map(c => c.platform)
  });

  return credentials;
}

/**
 * Normalize a single staff member object
 */
function normalizeStaffMember(staffMember: any, mappings: Record<string, string>): any {
  if (!staffMember || typeof staffMember !== 'object') {
    return staffMember;
  }

  const normalized: any = {};
  const unmappedFields: string[] = [];

  for (const [key, value] of Object.entries(staffMember)) {
    const normalizedKey = mappings[key];

    if (normalizedKey) {
      // Use mapped field name
      normalized[normalizedKey] = value;
    } else if (key.startsWith('_') || key === 'id') {
      // Pass through metadata and id fields
      normalized[key] = value;
    } else {
      // Field not in mapping - could be new field or typo
      unmappedFields.push(key);
      normalized[key] = value;  // Keep it anyway
    }
  }

  if (unmappedFields.length > 0 && process.env.NODE_ENV === 'development') {
    logger.debug(`[FIELD-NORMALIZER] Staff member has unmapped fields:`, {
      staffId: staffMember.id,
      unmappedFields,
      hint: 'Add these to STAFF_FIELD_MAPPINGS if they are valid database fields'
    });
  }

  return normalized;
}

/**
 * Express middleware to normalize onboarding step data
 * Apply this BEFORE sanitization middleware
 */
export const normalizeOnboardingFields = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only process if this is an onboarding step save request
    if (!req.body || !req.body.step || !req.body.data) {
      return next();
    }

    const step = req.body.step;
    const originalData = req.body.data;

    // Normalize the data
    const normalizedData = normalizeFields(step, originalData);

    // Replace req.body.data with normalized version
    req.body.data = normalizedData;

    logger.info(`[FIELD-NORMALIZER] Normalized step ${step} data for villa ${req.params.villaId}`);

    next();
  } catch (error) {
    logger.error('[FIELD-NORMALIZER] Error normalizing fields:', error);
    // Don't block the request, just log and continue
    next();
  }
};

/**
 * Utility function to reverse normalization (for responses)
 * Converts database field names back to frontend field names
 */
export function denormalizeFields(step: number, data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const mappings = getFieldMappingsForStep(step);
  if (Object.keys(mappings).length === 0) {
    return data;  // No denormalization needed
  }

  // Create reverse mapping
  const reverseMappings: Record<string, string> = {};
  for (const [frontendField, backendField] of Object.entries(mappings)) {
    if (!reverseMappings[backendField]) {
      reverseMappings[backendField] = frontendField;
    }
  }

  const denormalized: any = {};

  for (const [key, value] of Object.entries(data)) {
    const denormalizedKey = reverseMappings[key] || key;
    denormalized[denormalizedKey] = value;
  }

  return denormalized;
}