/**
 * Unified Field Mapping System
 * Single source of truth for all field transformations between frontend and backend
 * This solves the field mapping chaos identified in the production readiness report
 */

// Frontend field names (what UI components use)
export interface FrontendVillaFields {
  villaName?: string;
  villaCode?: string;
  villaAddress?: string;
  villaCity?: string;
  villaCountry?: string;
  villaPostalCode?: string;
  villaArea?: string | number;
  landArea?: string | number;
  bedrooms?: string | number;
  bathrooms?: string | number;
  maxGuests?: string | number;
  propertyType?: string;
  yearBuilt?: string | number;
  renovationYear?: string | number;
  villaStyle?: string;
  description?: string;
  shortDescription?: string;
  latitude?: string | number;
  longitude?: string | number;
  googleMapsLink?: string;
  iCalCalendarLink?: string;
  oldRatesCardLink?: string;
  propertyEmail?: string;
  propertyWebsite?: string;
  status?: string;
  locationType?: string;
  [key: string]: unknown; // Add index signature for compatibility
}

// Backend field names (what database expects - matches Prisma schema)
export interface BackendVillaFields {
  villaName?: string;
  villaCode?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  propertySize?: number;
  plotSize?: number;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  propertyType?: string;
  yearBuilt?: number;
  renovationYear?: number;
  villaStyle?: string;
  description?: string;
  shortDescription?: string;
  latitude?: number;
  longitude?: number;
  googleMapsLink?: string;
  iCalCalendarLink?: string;
  oldRatesCardLink?: string;
  propertyEmail?: string;
  propertyWebsite?: string;
  status?: string;
  locationType?: string;
  [key: string]: unknown; // Add index signature for compatibility
}

export interface FrontendOwnerFields {
  ownerType?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneDialCode?: string;
  alternativePhone?: string;
  alternativePhoneCountryCode?: string;
  alternativePhoneDialCode?: string;
  nationality?: string;
  passportNumber?: string;
  idNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  companyName?: string;
  companyAddress?: string;
  companyTaxId?: string;
  companyVat?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  [key: string]: unknown; // Add index signature for compatibility
}

export interface BackendOwnerFields {
  ownerType?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneDialCode?: string;
  alternativePhone?: string;
  alternativePhoneCountryCode?: string;
  alternativePhoneDialCode?: string;
  nationality?: string;
  passportNumber?: string;
  idNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  companyName?: string;
  companyAddress?: string;
  companyTaxId?: string;
  companyVat?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  [key: string]: unknown; // Add index signature for compatibility
}

/**
 * Villa Field Mapping Rules
 * Maps frontend field names to backend field names
 */
export const VILLA_FIELD_MAPPINGS = {
  // Direct mappings (same field names)
  villaName: 'villaName',
  villaCode: 'villaCode',
  propertyType: 'propertyType',
  villaStyle: 'villaStyle',
  description: 'description',
  shortDescription: 'shortDescription',
  googleMapsLink: 'googleMapsLink',
  iCalCalendarLink: 'iCalCalendarLink',
  oldRatesCardLink: 'oldRatesCardLink',
  propertyEmail: 'propertyEmail',
  propertyWebsite: 'propertyWebsite',
  status: 'status',
  locationType: 'locationType',

  // Field name transformations (critical fixes)
  villaAddress: 'address',
  villaCity: 'city',
  villaCountry: 'country',
  villaPostalCode: 'zipCode',
  villaArea: 'propertySize',
  landArea: 'plotSize',

  // Numeric fields (no transformation needed)
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  maxGuests: 'maxGuests',
  yearBuilt: 'yearBuilt',
  renovationYear: 'renovationYear',
  latitude: 'latitude',
  longitude: 'longitude',
} as const;

/**
 * Owner Field Mappings (mostly direct since they already align)
 */
export const OWNER_FIELD_MAPPINGS = {
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
} as const;

/**
 * Safe number conversion utility
 */
const safeToNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? undefined : num;
};

/**
 * Safe string conversion utility
 */
const safeToString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str === '' ? undefined : str;
};

/**
 * Safe integer conversion utility
 */
const safeToInteger = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(Number(value));
  return isNaN(num) ? undefined : num;
};

/**
 * Safe float conversion utility
 */
const safeToFloat = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? undefined : num;
};

/**
 * Transform frontend villa data to backend format
 * This is the critical function that fixes the field mapping chaos
 */
export function mapVillaFrontendToBackend(frontendData: FrontendVillaFields): BackendVillaFields {
  const backendData: BackendVillaFields = {};

  if (!frontendData || typeof frontendData !== 'object') {
    console.warn('[Field Mapping] Invalid frontend data provided:', frontendData);
    return backendData;
  }

  // Apply field mappings with proper type conversion
  Object.entries(VILLA_FIELD_MAPPINGS).forEach(([frontendKey, backendKey]) => {
    const value = frontendData[frontendKey as keyof FrontendVillaFields];

    if (value !== undefined && value !== null && value !== '') {
      // Integer fields (require exact integers)
      if (['bedrooms', 'bathrooms', 'maxGuests', 'yearBuilt', 'renovationYear'].includes(backendKey)) {
        const intValue = safeToInteger(value);
        if (intValue !== undefined) {
          (backendData as any)[backendKey] = intValue;
        }
      }
      // Float fields (allow decimals)
      else if (['propertySize', 'plotSize', 'latitude', 'longitude'].includes(backendKey)) {
        const floatValue = safeToFloat(value);
        if (floatValue !== undefined) {
          (backendData as any)[backendKey] = floatValue;
        }
      }
      // String fields
      else {
        const strValue = safeToString(value);
        if (strValue !== undefined) {
          (backendData as any)[backendKey] = strValue;
        }
      }
    }
  });

  return backendData;
}

/**
 * Transform backend villa data to frontend format
 * For loading data from backend to display in UI
 */
export function mapVillaBackendToFrontend(backendData: BackendVillaFields): FrontendVillaFields {
  const frontendData: FrontendVillaFields = {};

  if (!backendData || typeof backendData !== 'object') {
    console.warn('[Field Mapping] Invalid backend data provided:', backendData);
    return frontendData;
  }

  // Reverse the mappings
  Object.entries(VILLA_FIELD_MAPPINGS).forEach(([frontendKey, backendKey]) => {
    const value = backendData[backendKey as keyof BackendVillaFields];

    if (value !== undefined && value !== null) {
      // For frontend, we often need to convert numbers to strings for form fields
      if (typeof value === 'number') {
        (frontendData as any)[frontendKey] = value.toString();
      } else {
        (frontendData as any)[frontendKey] = value;
      }
    }
  });

  return frontendData;
}

/**
 * Transform frontend owner data to backend format
 */
export function mapOwnerFrontendToBackend(frontendData: FrontendOwnerFields): BackendOwnerFields {
  const backendData: BackendOwnerFields = {};

  if (!frontendData || typeof frontendData !== 'object') {
    console.warn('[Field Mapping] Invalid owner frontend data provided:', frontendData);
    return backendData;
  }

  Object.entries(OWNER_FIELD_MAPPINGS).forEach(([frontendKey, backendKey]) => {
    const value = frontendData[frontendKey as keyof FrontendOwnerFields];

    if (value !== undefined && value !== null && value !== '') {
      const strValue = safeToString(value);
      if (strValue !== undefined) {
        (backendData as any)[backendKey] = strValue;
      }
    }
  });

  return backendData;
}

/**
 * Transform backend owner data to frontend format
 */
export function mapOwnerBackendToFrontend(backendData: BackendOwnerFields): FrontendOwnerFields {
  const frontendData: FrontendOwnerFields = {};

  if (!backendData || typeof backendData !== 'object') {
    console.warn('[Field Mapping] Invalid owner backend data provided:', backendData);
    return frontendData;
  }

  Object.entries(OWNER_FIELD_MAPPINGS).forEach(([frontendKey, backendKey]) => {
    const value = backendData[backendKey as keyof BackendOwnerFields];

    if (value !== undefined && value !== null) {
      (frontendData as any)[frontendKey] = value;
    }
  });

  return frontendData;
}

/**
 * Validate field mapping completeness
 * Helps identify if any fields are missing from mappings
 */
export function validateFieldMapping(frontendData: Record<string, unknown>, mappings: Record<string, string>): {
  isValid: boolean;
  unmappedFields: string[];
} {
  const frontendKeys = Object.keys(frontendData).filter(key => frontendData[key] !== undefined);
  const mappedKeys = Object.keys(mappings);
  const unmappedFields = frontendKeys.filter(key => !mappedKeys.includes(key));

  return {
    isValid: unmappedFields.length === 0,
    unmappedFields
  };
}

/**
 * Comprehensive field mapping validation
 * Validates completeness and correctness of field transformations
 */
export function validateFieldMappingCompleteness(): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check if all expected database fields are mapped
  const expectedVillaFields = [
    'villaName', 'villaCode', 'address', 'city', 'country', 'zipCode',
    'propertySize', 'plotSize', 'bedrooms', 'bathrooms', 'maxGuests',
    'propertyType', 'yearBuilt', 'renovationYear', 'villaStyle',
    'description', 'shortDescription', 'latitude', 'longitude',
    'googleMapsLink', 'iCalCalendarLink', 'oldRatesCardLink',
    'propertyEmail', 'propertyWebsite', 'status', 'locationType'
  ];

  const mappedBackendFields = Object.values(VILLA_FIELD_MAPPINGS);
  const unmappedFields = expectedVillaFields.filter(field => !mappedBackendFields.includes(field as any));

  if (unmappedFields.length > 0) {
    issues.push(`Unmapped backend villa fields: ${unmappedFields.join(', ')}`);
    recommendations.push('Add missing field mappings to VILLA_FIELD_MAPPINGS');
  }

  // Check for bidirectional mapping consistency
  const frontendKeys = Object.keys(VILLA_FIELD_MAPPINGS);
  const duplicateBackendMappings = mappedBackendFields.filter((field, index, arr) =>
    arr.indexOf(field) !== index
  );

  if (duplicateBackendMappings.length > 0) {
    issues.push(`Duplicate backend field mappings: ${duplicateBackendMappings.join(', ')}`);
    recommendations.push('Ensure each backend field maps to only one frontend field');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Debug utility to log field transformations in development
 */
export function debugFieldMapping(frontendData: Record<string, unknown>, backendData: Record<string, unknown>, context: string) {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
    console.group(`🗺️ Field Mapping Debug: ${context}`);
    console.log('Frontend Data:', frontendData);
    console.log('Backend Data:', backendData);
    console.log('Transformation:', {
      frontendFields: Object.keys(frontendData),
      backendFields: Object.keys(backendData),
      fieldCount: {
        frontend: Object.keys(frontendData).length,
        backend: Object.keys(backendData).length
      }
    });

    // Validate the mapping in development
    const validation = validateFieldMappingCompleteness();
    if (!validation.isValid) {
      console.warn('Field Mapping Issues:', validation.issues);
      console.info('Recommendations:', validation.recommendations);
    }

    console.groupEnd();
  }
}

/**
 * Get field mapping statistics for monitoring
 */
export function getFieldMappingStats(): {
  villa: { frontendFields: number; backendFields: number; mapped: number };
  owner: { frontendFields: number; backendFields: number; mapped: number };
} {
  return {
    villa: {
      frontendFields: Object.keys(VILLA_FIELD_MAPPINGS).length,
      backendFields: new Set(Object.values(VILLA_FIELD_MAPPINGS)).size,
      mapped: Object.keys(VILLA_FIELD_MAPPINGS).length
    },
    owner: {
      frontendFields: Object.keys(OWNER_FIELD_MAPPINGS).length,
      backendFields: new Set(Object.values(OWNER_FIELD_MAPPINGS)).size,
      mapped: Object.keys(OWNER_FIELD_MAPPINGS).length
    }
  };
}