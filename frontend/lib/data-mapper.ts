// Data mapping utilities for converting between frontend and backend data structures
import {
  canonicalizeStepData,
  ONBOARDING_STEPS,
  validateStepPayload,
  type OnboardingStep,
  type StepDTOMap,
} from "@contract/onboardingContract";
import {
  mapVillaFrontendToBackend,
  mapVillaBackendToFrontend,
  mapOwnerFrontendToBackend,
  mapOwnerBackendToFrontend,
  debugFieldMapping,
  type FrontendVillaFields,
  type BackendVillaFields,
} from "./fieldMappings";


const DEBUG_LOG_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEBUG === "true";

const debugLog = (...args: Parameters<typeof console.log>) => {
  if (DEBUG_LOG_ENABLED) {
    console.log(...args);
  }
};

const debugWarn = (...args: Parameters<typeof console.warn>) => {
  if (DEBUG_LOG_ENABLED) {
    console.warn(...args);
  }
};

const debugError = (...args: Parameters<typeof console.error>) => {
  if (DEBUG_LOG_ENABLED) {
    console.error(...args);
  }
};

const debugDebug = (...args: Parameters<typeof console.debug>) => {
  if (DEBUG_LOG_ENABLED) {
    console.debug(...args);
  }
};

// Union type aliases for better code readability
type DateInput = string | number | Date;

// Type definitions for data mapping
interface VillaFrontendData {
  villaName?: string;
  villaCode?: string;
  location?: string;
  locationType?: string;
  villaAddress?: string;
  address?: string;
  villaCity?: string;
  city?: string;
  villaCountry?: string;
  country?: string;
  villaPostalCode?: string;
  zipCode?: string;
  bedrooms?: string | number;
  bathrooms?: string | number;
  maxGuests?: string | number;
  villaArea?: string | number;
  landArea?: string | number;
  propertyType?: string;
  yearBuilt?: string | number;
  renovationYear?: string | number;
  villaStyle?: string;
  description?: string;
  shortDescription?: string;
  googleCoordinates?: string;
  latitude?: string | number;
  longitude?: string | number;
  googleMapsLink?: string;
  oldRatesCardLink?: string;
  iCalCalendarLink?: string;
  propertyEmail?: string;
  propertyWebsite?: string;
  status?: string;
  [key: string]: unknown; // Add index signature for compatibility
}

interface OwnerFrontendData {
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
  managerPhoneCountryCode?: string;
  managerPhoneDialCode?: string;
  preferredLanguage?: string;
  communicationPreference?: string;
  notes?: string;
  [key: string]: unknown; // Add index signature for compatibility
}

interface ContractualDetailsFrontendData {
  contractSignatureDate?: string;
  contractStartDate?: string;
  contractRenewalDate?: string;
  contractEndDate?: string;
  contractType?: string;
  serviceCharge?: string | number;
  commissionRate?: string | number;
  managementFee?: string | number;
  marketingFee?: string | number;
  paymentTerms?: string;
  paymentSchedule?: string;
  minimumStayNights?: string | number;
  payoutDay1?: string | number;
  payoutDay2?: string | number;
  vatRegistrationNumber?: string;
  dbdNumber?: string;
  vatPaymentTerms?: string;
  paymentThroughIPL?: boolean;
  cancellationPolicy?: string;
  checkInTime?: string;
  checkOutTime?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  specialTerms?: string;
}

interface BankDetailsFrontendData {
  accountName?: string;
  accountHolderName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  accountNumber?: string;
  swiftBicCode?: string;
  swiftCode?: string;
  iban?: string;
  bankBranch?: string;
  branchName?: string;
  branchCode?: string;
  bankAddress?: string;
  branchAddress?: string;
  bankCountry?: string;
  currency?: string;
  accountType?: string;
  routingNumber?: string;
  taxId?: string;
  bankNotes?: string;
  notes?: string;
}

interface StaffFrontendData {
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneDialCode?: string;
  idCard?: string;
  idNumber?: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  maritalStatus?: boolean | string;
  position?: string;
  department?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  baseSalary?: string | number;
  salary?: string | number;
  salaryFrequency?: string;
  currency?: string;
  numberOfDaySalary?: string | number;
  serviceCharge?: string | number;
  totalIncome?: string | number;
  totalNetIncome?: string | number;
  otherDeduct?: string | number;
  otherDeductions?: string | number;
  hasAccommodation?: boolean;
  hasTransport?: boolean;
  transportation?: string;
  hasHealthInsurance?: boolean;
  healthInsurance?: boolean;
  hasWorkInsurance?: boolean;
  workInsurance?: boolean;
  foodAllowance?: boolean;
  emergencyContacts?: EmergencyContact[];
  isActive?: boolean;
}

interface EmergencyContact {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneDialCode?: string;
  email?: string;
  relationship?: string;
}

interface FacilityData {
  id?: string;
  databaseId?: string;
  category?: string;
  subcategory?: string;
  itemName?: string;
  available?: boolean;
  isAvailable?: boolean;
  quantity?: number | string;
  condition?: string;
  notes?: string;
  itemNotes?: string;
  specifications?: string;
  photoUrl?: string;
  photoData?: string | null;
  photoMimeType?: string | null;
  photoSize?: number | null;
  productLink?: string;
  checkedBy?: string;
  lastCheckedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  _fromDatabase?: boolean;
}

interface PhotoData {
  id?: string;
  category?: string;
  subcategory?: string;
  subfolder?: string;
  filename?: string;
  fileName?: string;
  originalName?: string;
  file?: { type?: string; size?: number };
  mimeType?: string;
  size?: number;
  sharePointId?: string;
  sharePointFileId?: string;
  sharePointPath?: string;
  fileUrl?: string;
  url?: string;
  thumbnailUrl?: string;
  isMain?: boolean;
  caption?: string;
  altText?: string;
  sortOrder?: number;
  uploaded?: boolean;
  preview?: string;
}

interface BedroomData {
  id?: string;
  name?: string;
  bedType?: string;
  bedCount?: number;
  hasEnsuite?: boolean;
  hasAircon?: boolean;
  photos?: PhotoData[];
}

interface DocumentData {
  id?: string;
  type?: string;
  documentType?: string;
  category?: string;
  filename?: string;
  fileName?: string;
  name?: string;
  displayName?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  sharePointUrl?: string;
  sharePointId?: string;
  sharePointFileId?: string;
  sharePointPath?: string;
  url?: string;
  uploadedAt?: string;
  uploadedAtIso?: string; // Add missing property
  createdAt?: string; // Add missing property
  updatedAt?: string; // Add missing property
  fileType?: string; // Add missing property
  uploaded?: boolean;
  isRequired?: boolean;
  isActive?: boolean;
  validated?: boolean;
  validatedAt?: string;
  validatedBy?: string;
  description?: string;
  notes?: string;
  uploading?: boolean;
  error?: string | null;
}

interface OTAPlatformData {
  platform: string;
  username?: string | null;
  password?: string | null;
  propertyId?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  listingUrl?: string | null;
  accountUrl?: string | null;
  propertyUrl?: string | null;
  isActive?: boolean;
  isListed?: boolean;
}

interface BackendVillaData {
  villaName?: string;
  villaCode?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  propertySize?: number;
  plotSize?: number;
  location?: string;
  locationType?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  yearBuilt?: number;
  renovationYear?: number;
  villaStyle?: string;
  googleMapsLink?: string;
  oldRatesCardLink?: string;
  iCalCalendarLink?: string;
  propertyEmail?: string;
  propertyWebsite?: string;
  website?: string;
  description?: string;
  shortDescription?: string;
  status?: string;
  [key: string]: unknown; // Add index signature for compatibility
}

interface BackendOwnerData {
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
  managerPhoneCountryCode?: string;
  managerPhoneDialCode?: string;
  preferredLanguage?: string;
  communicationPreference?: string;
  notes?: string;
}

interface BackendContractData {
  contractStartDate?: string;
  contractEndDate?: string;
  contractType?: string;
  commissionRate?: number;
  managementFee?: number;
  marketingFee?: number;
  paymentTerms?: string;
  paymentSchedule?: string;
  minimumStayNights?: number;
  payoutDay1?: number;
  payoutDay2?: number;
  vatRegistrationNumber?: string;
  dbdNumber?: string;
  vatPaymentTerms?: string;
  paymentThroughIPL?: boolean;
  cancellationPolicy?: string;
  checkInTime?: string;
  checkOutTime?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  specialTerms?: string;
}

interface BackendBankData {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  swiftCode?: string;
  iban?: string;
  branchName?: string;
  branchCode?: string;
  branchAddress?: string;
  bankAddress?: string;
  bankCountry?: string;
  currency?: string;
  accountType?: string;
  routingNumber?: string;
  taxId?: string;
  notes?: string;
}

interface BackendStaffData {
  id?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  phoneDialCode?: string;
  idNumber?: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  maritalStatus?: boolean | null;
  position?: string;
  department?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  salary?: number;
  salaryFrequency?: string;
  currency?: string;
  numberOfDaySalary?: number;
  serviceCharge?: number;
  totalIncome?: number;
  totalNetIncome?: number;
  otherDeductions?: number;
  hasAccommodation?: boolean;
  hasTransport?: boolean;
  hasHealthInsurance?: boolean;
  hasWorkInsurance?: boolean;
  foodAllowance?: boolean;
  transportation?: string;
  emergencyContacts?: string | EmergencyContact[];
  isActive?: boolean;
}

interface BackendFacilityData {
  id?: string;
  category?: string;
  subcategory?: string;
  itemName?: string;
  isAvailable?: boolean;
  quantity?: number;
  condition?: string;
  notes?: string;
  specifications?: string;
  photoUrl?: string;
  photoData?: string | ArrayBuffer;
  photoMimeType?: string;
  photoSize?: number;
  productLink?: string;
  checkedBy?: string;
  lastCheckedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendPhotoData {
  id?: string;
  category?: string;
  subfolder?: string;
  fileName?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  sharePointFileId?: string;
  sharePointPath?: string;
  isMain?: boolean;
  caption?: string;
  altText?: string;
}

interface BackendProgressData {
  villa?: {
    villaName?: string;
    villaCode?: string;
    address?: string;
    city?: string;
    country?: string;
    zipCode?: string;
    bedrooms?: number;
    bathrooms?: number;
    maxGuests?: number;
    propertySize?: number;
    plotSize?: number;
    location?: string;
    locationType?: string;
    latitude?: number;
    longitude?: number;
    propertyType?: string;
    yearBuilt?: number;
    renovationYear?: number;
    villaStyle?: string;
    googleMapsLink?: string;
    oldRatesCardLink?: string;
    iCalCalendarLink?: string;
    propertyEmail?: string;
    propertyWebsite?: string;
    website?: string;
    description?: string;
    shortDescription?: string;
    status?: string;
    owner?: BackendOwnerData;
    contractualDetails?: BackendContractData;
    bankDetails?: BackendBankData;
    otaCredentials?: OTAPlatformData[];
    documents?: DocumentData[];
    staff?: BackendStaffData[];
    facilities?: BackendFacilityData[];
    photos?: BackendPhotoData[];
    fieldProgress?: Record<string, unknown>;
  };
  fieldProgress?: Record<string, unknown>;
}

export type StepDataUnion =
  | VillaFrontendData
  | OwnerFrontendData
  | ContractualDetailsFrontendData
  | BankDetailsFrontendData
  | StaffFrontendData
  | FacilityData
  | PhotoData
  | DocumentData
  | { platforms?: OTAPlatformData[] }
  | { documents?: DocumentData[] }
  | { staff?: StaffFrontendData[] }
  | { facilities?: FacilityData[] }
  | { photos?: PhotoData[]; bedrooms?: BedroomData[] }
  | {
      reviewNotes?: string;
      agreedToTerms?: boolean;
      dataAccuracyConfirmed?: boolean;
    };

// Extended interface for backend data with dynamic fields
interface ExtendedBackendData {
  [key: string]: unknown;
  fieldProgress?: {
    [key: string]: unknown;
    bedrooms?: string | BedroomData[];
  };
}

// Type for dynamic OTA platform fields
interface OTAPlatformFields {
  [key: string]: unknown;
}

/**
 * Data sanitization utilities for facilities
 */
function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text.trim().substring(0, 1000); // Limit text to 1000 characters
}

function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";

  // Basic URL validation
  try {
    new URL(trimmedUrl);
    return trimmedUrl;
  } catch {
    // If not a valid URL, check if it starts with http/https
    if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
      return trimmedUrl;
    }
    // If it looks like a URL without protocol, add https
    if (trimmedUrl.includes(".") && !trimmedUrl.includes(" ")) {
      return `https://${trimmedUrl}`;
    }
    return ""; // Invalid URL
  }
}

function validateCondition(condition: string): string | null {
  const validConditions = ["new", "good", "fair", "poor"];
  if (!condition || !validConditions.includes(condition.toLowerCase())) {
    return null;
  }
  return condition.toLowerCase();
}

export const assertOnboardingStep = (step: number): OnboardingStep => {
  if (!ONBOARDING_STEPS.includes(step as OnboardingStep)) {
    throw new Error(`Unsupported onboarding step ${step}`);
  }
  return step as OnboardingStep;
};

const finalizeStepPayload = <TStep extends OnboardingStep>(
  step: TStep,
  raw: unknown,
  completed = false
): StepDTOMap[TStep] => {
  const canonical = canonicalizeStepData(step, raw);
  return validateStepPayload(step, canonical, completed);
};

function getSubcategoryFromItemName(itemName: string): string {
  if (!itemName) return "general";

  // Create subcategory from item name - normalize and clean
  return itemName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

/**
 * Convert camelCase to snake_case
 */

/**
 * Map frontend facility category IDs (kebab-case) to backend enum values (underscore_case)
 */
export function mapFacilityCategoryToBackend(
  frontendCategoryId: string
): string {
  // Direct mapping: convert kebab-case to underscore_case for new categories
  const directMapping = frontendCategoryId.replace(/-/g, "_");

  // New frontend categories that map directly after dash-to-underscore conversion
  const newCategories = [
    "property_layout_spaces",
    "occupancy_sleeping",
    "bathrooms",
    "kitchen_dining",
    "service_staff",
    "living_spaces",
    "outdoor_facilities",
    "home_office",
    "entertainment_gaming",
    "technology",
    "wellness_spa",
    "accessibility",
    "safety_security",
    "child_friendly",
  ];

  if (newCategories.includes(directMapping)) {
    return directMapping;
  }

  // Legacy mapping for backward compatibility
  const legacyMapping: Record<string, string> = {
    "basic-property": "OTHER",
    "kitchen-equipment": "KITCHEN_EQUIPMENT",
    "bathroom-amenities": "BATHROOM_AMENITIES",
    "bedroom-amenities": "BEDROOM_AMENITIES",
    "living-room": "LIVING_ROOM",
    "pool-area": "POOL_AREA",
    entertainment: "ENTERTAINMENT",
    utilities: "UTILITIES",
    "business-facilities": "BUSINESS_FACILITIES",
    "children-facilities": "CHILDREN_FACILITIES",
    "pet-facilities": "PET_FACILITIES",
    other: "OTHER",
  };

  return legacyMapping[frontendCategoryId] || "OTHER";
}

/**
 * Map backend facility category enum values to frontend category IDs (underscore_case to kebab-case)
 */
export function mapFacilityCategoryToFrontend(backendCategory: string): string {
  // New categories: convert underscore_case to kebab-case
  const newCategories = [
    "property_layout_spaces",
    "occupancy_sleeping",
    "bathrooms",
    "kitchen_dining",
    "service_staff",
    "living_spaces",
    "outdoor_facilities",
    "home_office",
    "entertainment_gaming",
    "technology",
    "wellness_spa",
    "accessibility",
    "safety_security",
    "child_friendly",
  ];

  if (newCategories.includes(backendCategory)) {
    return backendCategory.replace(/_/g, "-");
  }

  // Legacy mapping for backward compatibility → map to existing new category keys
  const legacyToNew: Record<string, string> = {
    KITCHEN_EQUIPMENT: "kitchen-dining",
    BATHROOM_AMENITIES: "bathrooms",
    BEDROOM_AMENITIES: "occupancy-sleeping",
    LIVING_ROOM: "living-spaces",
    OUTDOOR_FACILITIES: "outdoor-facilities",
    POOL_AREA: "outdoor-facilities",
    ENTERTAINMENT: "entertainment-gaming",
    SAFETY_SECURITY: "safety-security",
    UTILITIES: "service-staff",
    ACCESSIBILITY: "accessibility",
    BUSINESS_FACILITIES: "home-office",
    CHILDREN_FACILITIES: "child-friendly",
    PET_FACILITIES: "living-spaces",
    OTHER: "property-layout-spaces",
  };

  // If it's not in the legacy list, fall back to sanitized kebab-case
  return (
    legacyToNew[backendCategory] ||
    backendCategory.toLowerCase().replace(/_/g, "-")
  );
}

/**
 * Map frontend photo category IDs (snake_case) to backend enum values (SCREAMING_SNAKE_CASE)
 */
function mapPhotoCategoryToBackend(frontendCategoryId: string): string {
  // Convert to uppercase for database enum
  return frontendCategoryId.toUpperCase();
}

/**
 * Map backend photo category enum values (SCREAMING_SNAKE_CASE) to frontend category IDs (snake_case)
 */
function mapPhotoCategoryToFrontend(backendCategory: string): string {
  // Convert to lowercase for frontend
  return backendCategory.toLowerCase();
}

/**
 * Map frontend villa data to backend schema
 * 🔧 FIXED: Using unified field mapping system + handling field variations
 */
export function mapVillaDataToBackend(frontendData: VillaFrontendData) {
  if (!frontendData) {
    debugWarn('[Data Mapper] No villa data provided');
    return {};
  }

  // 🔧 FIXED: Normalize field variations before mapping
  // Handle cases where data might use either frontend or backend field names
  const normalizedData = { ...frontendData };

  // Handle address field variations
  if (frontendData.address && !frontendData.villaAddress) {
    normalizedData.villaAddress = frontendData.address;
  }
  if (frontendData.city && !frontendData.villaCity) {
    normalizedData.villaCity = frontendData.city;
  }
  if (frontendData.country && !frontendData.villaCountry) {
    normalizedData.villaCountry = frontendData.country;
  }
  if (frontendData.zipCode && !frontendData.villaPostalCode) {
    normalizedData.villaPostalCode = frontendData.zipCode;
  }
  if (frontendData.propertySize && !frontendData.villaArea) {
    normalizedData.villaArea = frontendData.propertySize;
  }
  if (frontendData.plotSize && !frontendData.landArea) {
    normalizedData.landArea = frontendData.plotSize;
  }

  // Use our unified field mapping system for basic transformations
  const mappedData = mapVillaFrontendToBackend(normalizedData as FrontendVillaFields);

  // Handle special cases that require additional processing
  const specialFields = {
    // Villa code generation if missing
    villaCode: frontendData.villaCode || generateVillaCode(frontendData.villaName || ""),

    // Coordinate parsing from googleCoordinates if individual lat/lng not provided
    ...(() => {
      const parsed = parseLatLngFromCoordinates(frontendData.googleCoordinates || "");
      const lat = mappedData.latitude ?? parsed?.lat;
      const lng = mappedData.longitude ?? parsed?.lng;

      return {
        latitude: Number.isFinite(Number(lat)) ? Number(lat) : undefined,
        longitude: Number.isFinite(Number(lng)) ? Number(lng) : undefined,
      };
    })(),

    // Ensure enum casing aligns with backend expectations
    propertyType: frontendData.propertyType
      ? String(frontendData.propertyType).toUpperCase()
      : undefined,
    villaStyle: frontendData.villaStyle
      ? String(frontendData.villaStyle).toUpperCase()
      : undefined,
  };

  // Merge mapped data with special fields, filter out undefined values
  const finalData = Object.fromEntries(
    Object.entries({ ...mappedData, ...specialFields })
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

  // Debug field mapping in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Data Mapper] Frontend→Backend transformation:`, {
      input: frontendData,
      normalized: normalizedData,
      mapped: mappedData,
      final: finalData
    });
  }

  debugFieldMapping(frontendData, finalData, "Villa Data Frontend → Backend");

  return finalData;
}

/**
 * Map backend villa data to frontend schema
 */
export function mapVillaDataToFrontend(backendData: BackendVillaData) {
  // 🔧 FIXED: Using unified field mapping system for consistent transformations
  // This eliminates the manual field mapping and potential inconsistencies

  // Use our unified field mapping system for basic transformations
  const mappedData = mapVillaBackendToFrontend(backendData as BackendVillaFields);

  // Handle special cases that require additional processing
  const result = {
    ...mappedData,

    // String conversions for numeric fields (UI expects strings)
    bedrooms: backendData.bedrooms?.toString() || "",
    bathrooms: backendData.bathrooms?.toString() || "",
    maxGuests: backendData.maxGuests?.toString() || "",
    villaArea: backendData.propertySize?.toString() || "",
    landArea: backendData.plotSize?.toString() || "",
    yearBuilt: backendData.yearBuilt?.toString() || "",
    renovationYear: backendData.renovationYear?.toString() || "",
    latitude: backendData.latitude?.toString() || "",
    longitude: backendData.longitude?.toString() || "",

    // Enum case conversion (backend uses uppercase, frontend prefers lowercase)
    propertyType: backendData.propertyType
      ? backendData.propertyType.toLowerCase()
      : "",
    villaStyle: backendData.villaStyle
      ? backendData.villaStyle.toLowerCase()
      : "",

    // Generate combined coordinates for Google Maps display
    googleCoordinates:
      backendData.latitude && backendData.longitude
        ? `${backendData.latitude}, ${backendData.longitude}`
        : "",

    // Backward compatibility for location fields
    location: backendData.locationType,
    locationType: backendData.locationType,

    // Ensure strings for optional fields
    description: backendData.description || "",
    shortDescription: backendData.shortDescription || "",
    googleMapsLink: backendData.googleMapsLink || "",
    oldRatesCardLink: backendData.oldRatesCardLink || "",
    iCalCalendarLink: backendData.iCalCalendarLink || "",
    propertyEmail: backendData.propertyEmail || "",
    propertyWebsite: backendData.propertyWebsite || "",
  };

  // Add debug logging in development
  debugFieldMapping(backendData, result, "Villa Data Backend → Frontend");

  return result;
}

/**
 * Map frontend owner data to backend schema
 */
export function mapOwnerDataToBackend(frontendData: OwnerFrontendData) {
  // 🔧 FIXED: Using unified field mapping system for owner data

  // Use our unified field mapping system for basic transformations
  const mappedData = mapOwnerFrontendToBackend(frontendData);

  // Handle special cases and additional fields
  const raw = {
    ...mappedData,

    // Default values and special handling
    ownerType: frontendData.ownerType || "INDIVIDUAL",
    firstName: frontendData.firstName || "",
    lastName: frontendData.lastName || "",

    // Additional fields not in basic mapping
    preferredLanguage: frontendData.preferredLanguage || "en",
    communicationPreference: frontendData.communicationPreference || "EMAIL",
    notes: frontendData.notes,

    // Manager phone fields (extended from basic mapping)
    managerPhoneCountryCode: frontendData.managerPhoneCountryCode,
    managerPhoneDialCode: frontendData.managerPhoneDialCode,
  };

  // Add debug logging in development
  debugFieldMapping(frontendData, raw, "Owner Data Frontend → Backend");

  return finalizeStepPayload(2, raw);
}

// Helper functions for contractual details mapping
function mapContractStartDate(
  frontendData: ContractualDetailsFrontendData
): string {
  if (frontendData.contractSignatureDate?.trim()) {
    return new Date(frontendData.contractSignatureDate).toISOString();
  }
  if (frontendData.contractStartDate?.trim()) {
    return new Date(frontendData.contractStartDate).toISOString();
  }
  return new Date().toISOString();
}

function mapContractEndDate(
  frontendData: ContractualDetailsFrontendData
): string | null {
  if (frontendData.contractRenewalDate?.trim()) {
    return new Date(frontendData.contractRenewalDate).toISOString();
  }
  if (frontendData.contractEndDate?.trim()) {
    return new Date(frontendData.contractEndDate).toISOString();
  }
  return null;
}

function mapCommissionRate(
  frontendData: ContractualDetailsFrontendData
): number {
  if (frontendData.serviceCharge?.toString().trim()) {
    return parseFloat(String(frontendData.serviceCharge));
  }
  if (frontendData.commissionRate?.toString().trim()) {
    return parseFloat(String(frontendData.commissionRate));
  }
  return 0;
}

function mapOptionalFloat(value: unknown): number | null {
  const stringValue = value?.toString().trim();
  if (stringValue) {
    const parsed = parseFloat(stringValue);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function mapOptionalInt(value: unknown): number | null {
  const stringValue = value?.toString().trim();
  if (stringValue) {
    const parsed = parseInt(stringValue, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function mapOptionalString(value: unknown): string | null {
  return value?.toString().trim() || null;
}

/**
 * Map frontend contractual details to backend schema
 */
export function mapContractualDetailsToBackend(
  frontendData: ContractualDetailsFrontendData
) {
  const raw = {
    // Contract Dates - Map contractSignatureDate to contractStartDate (frontend field -> backend field)
    contractStartDate: mapContractStartDate(frontendData),
    contractEndDate: mapContractEndDate(frontendData),
    contractType:
      frontendData.contractType?.trim().toUpperCase() || "EXCLUSIVE",

    // Commission and Fees - Map serviceCharge to commissionRate
    commissionRate: mapCommissionRate(frontendData),
    managementFee: mapOptionalFloat(frontendData.managementFee),
    marketingFee: mapOptionalFloat(frontendData.marketingFee),

    // Payment Terms
    paymentTerms: mapOptionalString(frontendData.paymentTerms),
    paymentSchedule: frontendData.paymentSchedule?.toUpperCase() || "MONTHLY",
    minimumStayNights:
      parseInt(String(frontendData.minimumStayNights), 10) || 1,
    payoutDay1: mapOptionalInt(frontendData.payoutDay1),
    payoutDay2: mapOptionalInt(frontendData.payoutDay2),

    // VAT Information - NEWLY ADDED FIELDS
    vatRegistrationNumber: mapOptionalString(
      frontendData.vatRegistrationNumber
    ),
    dbdNumber: mapOptionalString(frontendData.dbdNumber),
    vatPaymentTerms: mapOptionalString(frontendData.vatPaymentTerms),
    paymentThroughIPL: frontendData.paymentThroughIPL || false,

    // Policies
    cancellationPolicy:
      frontendData.cancellationPolicy?.toUpperCase() || "MODERATE",
    checkInTime: frontendData.checkInTime || "15:00",
    checkOutTime: frontendData.checkOutTime || "11:00",

    // Insurance
    insuranceProvider: mapOptionalString(frontendData.insuranceProvider),
    insurancePolicyNumber: mapOptionalString(
      frontendData.insurancePolicyNumber
    ),
    insuranceExpiry: frontendData.insuranceExpiry?.trim()
      ? new Date(frontendData.insuranceExpiry).toISOString()
      : null,

    // Special Terms
    specialTerms: mapOptionalString(frontendData.specialTerms),
  };

  return finalizeStepPayload(3, raw);
}

/**
 * Map frontend bank details to backend schema
 */
export function mapBankDetailsToBackend(frontendData: BankDetailsFrontendData) {
  const raw = {
    // Map frontend field names to database column names
    // Note: securityAcknowledged is not persisted - it's a session-only field
    accountHolderName:
      frontendData.accountName || frontendData.accountHolderName,
    bankName: frontendData.bankName,
    accountNumber: frontendData.bankAccountNumber || frontendData.accountNumber,
    swiftCode: frontendData.swiftBicCode || frontendData.swiftCode,
    iban: frontendData.iban,
    branchName: frontendData.bankBranch || frontendData.branchName,
    branchCode: frontendData.branchCode,
    branchAddress: frontendData.bankAddress || frontendData.branchAddress,
    bankAddress: frontendData.bankAddress, // Also map to bankAddress for compatibility
    bankCountry: frontendData.bankCountry,
    // Align with backend default USD to avoid inconsistency
    currency: frontendData.currency || "USD",
    accountType: frontendData.accountType
      ? frontendData.accountType.toUpperCase()
      : "CHECKING",
    routingNumber: frontendData.routingNumber,
    taxId: frontendData.taxId,
    notes: frontendData.bankNotes || frontendData.notes,
  };
  return finalizeStepPayload(4, raw);
}

// Helper function to get enum value or default
function getEnumValue(
  value: string | undefined,
  validValues: string[],
  defaultValue: string
): string {
  if (!value) return defaultValue;
  const upperValue = value.toString().toUpperCase();
  return validValues.includes(upperValue) ? upperValue : defaultValue;
}

// Helper function to determine department from position
function getDepartmentFromPosition(position: string): string {
  const positionToDepartment: Record<string, string> = {
    VILLA_MANAGER: "MANAGEMENT",
    HOUSEKEEPER: "HOUSEKEEPING",
    GARDENER: "MAINTENANCE",
    POOL_MAINTENANCE: "MAINTENANCE",
    SECURITY: "SECURITY",
    CHEF: "HOSPITALITY",
    DRIVER: "HOSPITALITY",
    CONCIERGE: "HOSPITALITY",
    MAINTENANCE: "MAINTENANCE",
    OTHER: "ADMINISTRATION",
  };
  const upperPosition = position?.toUpperCase() || "OTHER";
  return positionToDepartment[upperPosition] || "ADMINISTRATION";
}

// Helper function to get position display name (reverse mapping)
function getPositionDisplayName(enumValue: string): string {
  const positionMapping: Record<string, string> = {
    VILLA_MANAGER: "Villa Manager",
    HOUSEKEEPER: "Housekeeper",
    GARDENER: "Gardener",
    POOL_MAINTENANCE: "Pool Maintenance",
    SECURITY: "Security",
    CHEF: "Chef",
    DRIVER: "Driver",
    CONCIERGE: "Concierge",
    MAINTENANCE: "Maintenance",
    OTHER: "Other",
  };
  return positionMapping[enumValue] || enumValue;
}

// Helper functions to derive transportation from benefits
function getCompanyTransportation(): string {
  return "Company Vehicle";
}

function getWalkingDistanceTransportation(): string {
  return "Walking Distance";
}

function deriveTransportationFromBenefits(hasTransport: boolean): string {
  return hasTransport ? getCompanyTransportation() : getWalkingDistanceTransportation();
}

/**
 * Map frontend staff data to backend schema
 */
export function mapStaffDataToBackend(frontendData: StaffFrontendData) {
  debugLog("🔍 SHERLOCK: mapStaffDataToBackend called with:", frontendData);

  // Validate required fields
  if (!frontendData.firstName || !frontendData.lastName) {
    debugWarn("⚠️ Staff data missing required firstName or lastName:", {
      firstName: frontendData.firstName,
      lastName: frontendData.lastName,
    });
  }

  // Map position from display name to enum value
  let mappedPosition = frontendData.position;
  if (frontendData.position) {
    // Handle position mapping from frontend display names to backend enums
    const positionMap: Record<string, string> = {
      "Villa Manager": "VILLA_MANAGER",
      Housekeeper: "HOUSEKEEPER",
      Chef: "CHEF",
      Security: "SECURITY",
      "Pool Maintenance": "POOL_MAINTENANCE",
      Gardener: "GARDENER",
      Driver: "DRIVER",
      Concierge: "CONCIERGE",
      Maintenance: "MAINTENANCE",
      Other: "OTHER",
    };
    mappedPosition =
      positionMap[frontendData.position] || frontendData.position;
  }

  const mappedData = {
    // Personal Information - Fixed field mappings
    firstName: frontendData.firstName || "",
    lastName: frontendData.lastName || "",
    nickname: frontendData.nickname || null,
    email: frontendData.email || null,
    phone: frontendData.phone || "",
    // Fix: Frontend uses 'idCard', backend expects 'idNumber'
    idNumber: frontendData.idCard || frontendData.idNumber || null,
    passportNumber: frontendData.passportNumber || null,
    nationality: frontendData.nationality || null,
    dateOfBirth: frontendData.dateOfBirth
      ? new Date(frontendData.dateOfBirth).toISOString()
      : null,
    maritalStatus: frontendData.maritalStatus ?? null,

    // Employment Details - Ensure proper enum mapping
    position: getEnumValue(
      mappedPosition || "OTHER",
      [
        "VILLA_MANAGER",
        "HOUSEKEEPER",
        "GARDENER",
        "POOL_MAINTENANCE",
        "SECURITY",
        "CHEF",
        "DRIVER",
        "CONCIERGE",
        "MAINTENANCE",
        "OTHER",
      ],
      "OTHER"
    ),
    department: getDepartmentFromPosition(mappedPosition || ""),
    employmentType: getEnumValue(
      frontendData.employmentType || "FULL_TIME",
      ["FULL_TIME", "PART_TIME", "CONTRACT", "SEASONAL", "FREELANCE"],
      "FULL_TIME"
    ),
    startDate: frontendData.startDate
      ? new Date(frontendData.startDate).toISOString()
      : new Date().toISOString(),
    endDate: frontendData.endDate
      ? new Date(frontendData.endDate).toISOString()
      : null,

    // Compensation - Fixed field mappings from frontend form
    salary:
      parseFloat(
        String(frontendData.baseSalary || frontendData.salary || "0")
      ) || 0,
    salaryFrequency: getEnumValue(
      frontendData.salaryFrequency || "MONTHLY",
      ["HOURLY", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "ANNUALLY"],
      "MONTHLY"
    ),
    currency: frontendData.currency || "USD", // Fixed: Use USD as default instead of IDR
    numberOfDaySalary:
      parseInt(String(frontendData.numberOfDaySalary || "0"), 10) || null,
    serviceCharge:
      parseFloat(String(frontendData.serviceCharge || "0")) || null,
    totalIncome: parseFloat(String(frontendData.totalIncome || "0")) || null,
    totalNetIncome:
      parseFloat(String(frontendData.totalNetIncome || "0")) || null,
    otherDeductions:
      parseFloat(
        String(frontendData.otherDeduct || frontendData.otherDeductions || "0")
      ) || null,

    // Benefits - Fixed mapping to match database schema
    hasAccommodation: frontendData.hasAccommodation || false,
    hasTransport:
      frontendData.hasTransport ||
      (frontendData.transportation &&
        frontendData.transportation !== "Walking Distance") ||
      false,
    hasHealthInsurance: frontendData.hasHealthInsurance || frontendData.healthInsurance || false,
    hasWorkInsurance: frontendData.hasWorkInsurance || frontendData.workInsurance || false,
    foodAllowance: frontendData.foodAllowance || false,
    transportation: frontendData.transportation || null,

    // Emergency Contacts - Properly handle JSON structure
    emergencyContacts:
      frontendData.emergencyContacts &&
      Array.isArray(frontendData.emergencyContacts) &&
      frontendData.emergencyContacts.length > 0
        ? frontendData.emergencyContacts
            .filter(
              (contact: EmergencyContact) =>
                contact.firstName?.trim() ||
                contact.lastName?.trim() ||
                contact.phone?.trim()
            )
            .map((contact: EmergencyContact) => ({
              firstName: contact.firstName?.trim() || "",
              lastName: contact.lastName?.trim() || "",
              phone: contact.phone?.trim() || "",
              phoneCountryCode: contact.phoneCountryCode || "",
              phoneDialCode: contact.phoneDialCode || "",
              email: contact.email?.trim() || "",
              relationship: contact.relationship || "OTHER",
            }))
        : [],

    // Status
    isActive: frontendData.isActive ?? true,
  };

  // Log validation
  const hasRequiredFields =
    mappedData.firstName && mappedData.lastName && mappedData.position;
  debugLog("Mapped staff data for backend:", {
    ...mappedData,
    emergencyContacts: `${
      Array.isArray(mappedData.emergencyContacts)
        ? mappedData.emergencyContacts.length
        : 0
    } contacts`,
    hasRequiredFields,
  });

  if (!hasRequiredFields) {
    debugError("Staff data validation failed - missing required fields:", {
      firstName: !!mappedData.firstName,
      lastName: !!mappedData.lastName,
      position: !!mappedData.position,
    });
  }

  return mappedData;
}

/**
 * Map all onboarding step data to backend format
 */
export function mapOnboardingDataToBackend(
  step: number,
  frontendData: StepDataUnion
) {
  try {
    // Return empty object if no data
    if (!frontendData || Object.keys(frontendData).length === 0) {
      return {};
    }

    // Validate step number
    if (!Number.isInteger(step) || step < 1 || step > 10) {
      throw new Error(
        `Invalid step number: ${step}. Must be between 1 and 10.`
      );
    }

    const typedStep = assertOnboardingStep(step);

    switch (typedStep) {
      case 1: // Villa Information
        return mapVillaDataToBackend(frontendData as VillaFrontendData);
      case 2: // Owner Details
        return mapOwnerDataToBackend(frontendData as OwnerFrontendData);
      case 3: // Contractual Details
        return mapContractualDetailsToBackend(
          frontendData as ContractualDetailsFrontendData
        );
      case 4: // Bank Details
        return mapBankDetailsToBackend(frontendData as BankDetailsFrontendData);
      case 5: {
        // OTA Credentials - Fixed mapping to preserve all platforms
        // Convert flat frontend structure to array of platform objects
        const platforms = [];
        const otaPlatforms = [
          { key: "bookingCom", platform: "BOOKING_COM" },
          { key: "airbnb", platform: "AIRBNB" },
          { key: "vrbo", platform: "VRBO" },
          { key: "expedia", platform: "EXPEDIA" },
          { key: "agoda", platform: "AGODA" },
          { key: "marriottHomesVillas", platform: "MARRIOTT_HOMES_VILLAS" },
        ];

        // Process all platforms - include both listed and platforms with existing data
        for (const { key, platform } of otaPlatforms) {
          const frontendDataWithOTA = frontendData as OTAPlatformFields;
          const isListed = frontendDataWithOTA[`${key}Listed`];

          // Check if platform has any data (credentials, URLs, etc.)
          const hasAnyData =
            frontendDataWithOTA[`${key}Username`] ||
            frontendDataWithOTA[`${key}Password`] ||
            frontendDataWithOTA[`${key}PropertyId`] ||
            frontendDataWithOTA[`${key}ApiKey`] ||
            frontendDataWithOTA[`${key}ApiSecret`] ||
            frontendDataWithOTA[`${key}ListingUrl`] ||
            frontendDataWithOTA[`${key}AccountUrl`] ||
            frontendDataWithOTA[`${key}PropertyUrl`];

          // Log platform data processing for debugging in development only
          if (
            process.env.NODE_ENV === "development" &&
            process.env.NEXT_PUBLIC_DEBUG === "true"
          ) {
            debugLog(`OTA Platform ${key} (${platform}):`, {
              isListed,
              hasAnyData,
              fieldsPresent: {
                username: !!frontendDataWithOTA[`${key}Username`],
                password: !!frontendDataWithOTA[`${key}Password`],
                propertyId: !!frontendDataWithOTA[`${key}PropertyId`],
                apiKey: !!frontendDataWithOTA[`${key}ApiKey`],
                apiSecret: !!frontendDataWithOTA[`${key}ApiSecret`],
              },
            });
          }

          // Include platform if it's listed OR has existing data
          if (isListed || hasAnyData) {
            platforms.push({
              platform,
              username:
                (frontendDataWithOTA[`${key}Username`] as string) || null,
              password:
                (frontendDataWithOTA[`${key}Password`] as string) || null,
              propertyId:
                (frontendDataWithOTA[`${key}PropertyId`] as string) || null,
              apiKey: (frontendDataWithOTA[`${key}ApiKey`] as string) || null,
              apiSecret:
                (frontendDataWithOTA[`${key}ApiSecret`] as string) || null,
              listingUrl:
                (frontendDataWithOTA[`${key}ListingUrl`] as string) || null,
              accountUrl:
                (frontendDataWithOTA[`${key}AccountUrl`] as string) || null,
              propertyUrl:
                (frontendDataWithOTA[`${key}PropertyUrl`] as string) || null,
              isActive: isListed, // This will be true for listed, false for unlisted with data
            });
          }
        }

        return finalizeStepPayload(5, { platforms });
      }
      case 6: {
        // Documents Upload - Enhanced mapping with metadata
        // Handle both direct array and object with documents array
        let documentsInput: DocumentData[];
        if (Array.isArray(frontendData)) {
          documentsInput = frontendData;
        } else if (
          Array.isArray(
            (frontendData as { documents?: DocumentData[] })?.documents
          )
        ) {
          documentsInput = (frontendData as { documents: DocumentData[] })
            .documents;
        } else {
          documentsInput = [];
        }

        // Map frontend document structure to backend schema
        const mappedDocuments = documentsInput.map((doc: DocumentData) => {
          const uploadedAt =
            doc.uploadedAt ||
            doc.uploadedAtIso ||
            doc.updatedAt ||
            doc.createdAt ||
            null;

          return {
            // Core document fields
            type: doc.type || doc.documentType || "OTHER",
            category: doc.category || "other",
            filename: doc.filename || doc.fileName || doc.name,
            originalName:
              doc.originalName || doc.filename || doc.fileName || doc.name,
            mimeType:
              doc.mimeType || doc.type || doc.fileType || "application/octet-stream",
            size: doc.size ?? (doc as any).fileSize ?? 0,

            // SharePoint integration fields
            sharePointUrl: doc.sharePointUrl || doc.url,
            sharePointFileId: doc.sharePointId || doc.sharePointFileId,
            sharePointPath: doc.sharePointPath,

            // Upload status and metadata
            uploadedAt,
            isRequired: doc.isRequired ?? false,
            isActive: doc.isActive ?? true,
          };
        });

        return finalizeStepPayload(6, { documents: mappedDocuments });
      }
      case 7: {
        // Staff Configuration - Enhanced mapping
        // Handle both direct array and object with staff array
        let staffArray: StaffFrontendData[];
        if (Array.isArray(frontendData)) {
          staffArray = frontendData;
        } else if (
          Array.isArray(
            (frontendData as { staff?: StaffFrontendData[] })?.staff
          )
        ) {
          staffArray = (frontendData as { staff: StaffFrontendData[] }).staff;
        } else {
          staffArray = [];
        }
        debugLog(
          "🔄 Staff array for backend mapping:",
          staffArray.length,
          "members"
        );
        debugLog("🔄 Staff array content:", staffArray);
        const mappedStaffForBackend = staffArray.map(
          (staff: StaffFrontendData | BackendStaffData) =>
            mapStaffDataToBackend(staff as StaffFrontendData)
        );
        debugLog("🔄 Final staff data being sent to backend:", {
          staff: mappedStaffForBackend,
        });
        return finalizeStepPayload(7, { staff: mappedStaffForBackend });
      }
      case 8: {
        // Facilities Checklist - Enhanced mapping with comprehensive validation
        // Simplified facilities mapping

        // Handle both direct array and object with facilities array
        let facilitiesInput: FacilityData[];
        if (Array.isArray(frontendData)) {
          facilitiesInput = frontendData;
        } else if (
          Array.isArray(
            (frontendData as { facilities?: FacilityData[] })?.facilities
          )
        ) {
          facilitiesInput = (frontendData as { facilities: FacilityData[] })
            .facilities;
        } else {
          facilitiesInput = [];
        }

        if (facilitiesInput.length === 0) {
          return { facilities: [] };
        }

        // Filter and map facilities with meaningful data
        const mappedFacilities = facilitiesInput
          .filter((facility: FacilityData) => {
            // Include if facility is available/checked or has data or exists in database
            const isAvailable = facility.available || facility.isAvailable;
            const hasData =
              facility.notes?.trim() ||
              facility.specifications?.trim() ||
              facility.photoUrl ||
              facility.photoData ||
              (facility.quantity && Number(facility.quantity) > 1) ||
              (facility.condition && facility.condition !== "good") ||
              facility.productLink?.trim();
            const existsInDB =
              facility.databaseId || facility.id || facility._fromDatabase;

            return isAvailable || hasData || existsInDB;
          })

          .map((facility: FacilityData) => {
            try {
              // Map and sanitize facility data
              const mapped = {
                category: mapFacilityCategoryToBackend(
                  facility.category || "other"
                ),
                subcategory: (
                  facility.subcategory ||
                  getSubcategoryFromItemName(
                    facility.itemName || facility.category || ""
                  )
                ).substring(0, 100),
                itemName: (facility.itemName || "").substring(0, 200),
                // Handle both 'available' and 'isAvailable' field names
                isAvailable: Boolean(
                  facility.available ?? facility.isAvailable
                ),
                quantity: (() => {
                  if (typeof facility.quantity === "number") {
                    return facility.quantity;
                  }
                  if (
                    typeof facility.quantity === "string" &&
                    !isNaN(parseInt(facility.quantity))
                  ) {
                    return Math.max(1, parseInt(facility.quantity)); // Min quantity 1
                  }
                  return 1;
                })(),
                condition:
                  validateCondition(facility.condition || "") || "good",
                notes: sanitizeText(facility.notes || facility.itemNotes || ""),
                specifications: sanitizeText(facility.specifications || ""),
                photoUrl: facility.photoUrl
                  ? sanitizeUrl(facility.photoUrl)
                  : null,
                photoData: facility.photoData || null, // Include base64 photo data for backend storage
                photoMimeType: facility.photoMimeType || null,
                photoSize: facility.photoSize || null,
                productLink: facility.productLink
                  ? sanitizeUrl(facility.productLink)
                  : null,
                checkedBy: facility.checkedBy
                  ? facility.checkedBy.substring(0, 100)
                  : null,
                lastCheckedAt: facility.lastCheckedAt
                  ? new Date(facility.lastCheckedAt).toISOString()
                  : new Date().toISOString(),
              };

              return mapped;
            } catch (error) {
              debugError(`[MAPPER] Error mapping facility:`, error);
              return null;
            }
          })
          .filter(Boolean); // Remove null entries

        return finalizeStepPayload(8, { facilities: mappedFacilities });
      }
      case 9: {
        // Photo Upload - Enhanced mapping
        // Handle both direct arrays and nested object structure
        let photosInput: PhotoData[];
        if (Array.isArray((frontendData as { photos?: PhotoData[] }).photos)) {
          photosInput = (frontendData as { photos: PhotoData[] }).photos;
        } else if (Array.isArray(frontendData)) {
          photosInput = frontendData;
        } else {
          photosInput = [];
        }
        const bedroomsInput = Array.isArray(
          (frontendData as { bedrooms?: BedroomData[] }).bedrooms
        )
          ? (frontendData as { bedrooms: BedroomData[] }).bedrooms
          : [];

        // Map photos with proper SharePoint integration
        const mappedPhotos = photosInput.map((photo: PhotoData) => ({
          // Core photo identification
          id: photo.id,
          category: photo.category
            ? mapPhotoCategoryToBackend(photo.category)
            : "GENERAL",
          subcategory: photo.subcategory || photo.subfolder,

          // File metadata
          filename: photo.fileName || photo.filename,
          originalName: photo.fileName || photo.filename,
          mimeType: photo.file?.type || photo.mimeType || "image/jpeg",
          size: photo.file?.size || photo.size || 0,

          // SharePoint integration
          sharePointFileId: photo.sharePointId || photo.sharePointFileId,
          sharePointPath: photo.sharePointPath,
          fileUrl: photo.fileUrl || photo.url,
          thumbnailUrl: photo.thumbnailUrl,

          // Photo metadata
          isMain: photo.isMain || false,
          caption: photo.caption || "",
          altText: photo.altText || photo.caption || "",
          sortOrder: photo.sortOrder || 0,

          // Upload status
          uploaded: photo.uploaded || !!photo.sharePointId,
        }));

        // Map bedrooms data
        const mappedBedrooms = bedroomsInput.map((bedroom: BedroomData) => ({
          id: bedroom.id,
          name: bedroom.name,
          bedType: bedroom.bedType,
          bedCount: bedroom.bedCount || 1,
          hasEnsuite: bedroom.hasEnsuite ?? false,
          hasAircon: bedroom.hasAircon ?? false,
          // Include photos for each bedroom if they exist
          photos: Array.isArray(bedroom.photos) ? bedroom.photos : [],
        }));

        return finalizeStepPayload(9, {
          photos: mappedPhotos,
          bedrooms: mappedBedrooms,
        });
      }
      case 10: {
        // Review & Submit
        return finalizeStepPayload(10, {
          reviewNotes:
            (frontendData as { reviewNotes?: string }).reviewNotes || "",
          agreedToTerms:
            (frontendData as { agreedToTerms?: boolean }).agreedToTerms ||
            false,
          dataAccuracyConfirmed:
            (frontendData as { dataAccuracyConfirmed?: boolean })
              .dataAccuracyConfirmed || false,
        });
      }
      default:
        return finalizeStepPayload(typedStep, frontendData);
    }
  } catch (error) {
    debugError(
      `Error mapping frontend data to backend for step ${step}:`,
      error
    );

    // Return error information for debugging
    return {
      _mappingError: true,
      _step: step,
      _error: error instanceof Error ? error.message : "Unknown mapping error",
      _originalData: frontendData,
    };
  }
}

/**
 * Map complete backend progress response to frontend stepData format
 * This function extracts data from the villa object and related entities
 */
/**
 * Validates and normalizes step data to ensure consistent structure
 */
function validateStepDataStructure(
  stepData: Record<string, StepDataUnion>
): Record<string, StepDataUnion> {
  const validatedData: Record<string, StepDataUnion> = {};

  // Ensure all steps 1-10 have at least empty object structure
  for (let i = 1; i <= 10; i++) {
    const stepKey = `step${i}`;
    validatedData[stepKey] = stepData[stepKey] || {};

    // Ensure step data is always an object, not a primitive or array
    if (
      typeof validatedData[stepKey] !== "object" ||
      Array.isArray(validatedData[stepKey])
    ) {
      // Handle legacy array formats
      if (Array.isArray(validatedData[stepKey])) {
        switch (i) {
          case 6: // Documents
            validatedData[stepKey] = {
              documents: validatedData[stepKey] as DocumentData[],
            };
            break;
          case 7: // Staff
            validatedData[stepKey] = {
              staff: validatedData[stepKey] as StaffFrontendData[],
            };
            break;
          case 8: // Facilities
            validatedData[stepKey] = {
              facilities: validatedData[stepKey] as FacilityData[],
            };
            break;
          case 9: // Photos
            validatedData[stepKey] = {
              photos: validatedData[stepKey] as PhotoData[],
              bedrooms: [],
            };
            break;
          default:
            validatedData[stepKey] = {};
        }
      } else {
        validatedData[stepKey] = {};
      }
    }
  }

  return validatedData;
}

export function mapBackendProgressToStepData(
  progressData: BackendProgressData
): Record<string, StepDataUnion> {
  const stepData: Record<string, StepDataUnion> = {};

  if (!progressData?.villa) {
    return validateStepDataStructure(stepData);
  }

  const villa = progressData.villa;

  // Step 1: Villa Information - Map from villa object
  if (villa) {
    stepData.step1 = {
      villaName: villa.villaName || "",
      villaAddress: villa.address || "",
      villaCity: villa.city || "",
      villaCountry: villa.country || "",
      villaPostalCode: villa.zipCode || "",
      bedrooms: villa.bedrooms?.toString() || "",
      bathrooms: villa.bathrooms?.toString() || "",
      maxGuests: villa.maxGuests?.toString() || "",
      propertyType: villa.propertyType || "",
      villaArea: villa.propertySize?.toString() || "",
      landArea: villa.plotSize?.toString() || "",
      latitude: villa.latitude?.toString() || "",
      longitude: villa.longitude?.toString() || "",
      locationType: villa.locationType || villa.location || "",
      googleMapsLink: villa.googleMapsLink || "",
      oldRatesCardLink: villa.oldRatesCardLink || "",
      iCalCalendarLink: villa.iCalCalendarLink || "",
      yearBuilt: villa.yearBuilt?.toString() || "",
      renovationYear: villa.renovationYear?.toString() || "",
      villaStyle: villa.villaStyle || "",
      description: villa.description || "",
      shortDescription: villa.shortDescription || "",
      propertyEmail: villa.propertyEmail || "",
      propertyWebsite: villa.propertyWebsite || villa.website || "",
    };
  }

  // Step 2: Owner Details - Map from owner object
  if (villa.owner) {
    const owner = villa.owner;
    stepData.step2 = {
      ownerType: owner.ownerType || "INDIVIDUAL",
      firstName: owner.firstName || "",
      lastName: owner.lastName || "",
      email: owner.email || "",
      phone: owner.phone || "",
      phoneCountryCode: owner.phoneCountryCode || "",
      phoneDialCode: owner.phoneDialCode || "",
      alternativePhone: owner.alternativePhone || "",
      alternativePhoneCountryCode: owner.alternativePhoneCountryCode || "",
      alternativePhoneDialCode: owner.alternativePhoneDialCode || "",
      nationality: owner.nationality || "",
      passportNumber: owner.passportNumber || "",
      idNumber: owner.idNumber || "",
      address: owner.address || "",
      city: owner.city || "",
      country: owner.country || "",
      zipCode: owner.zipCode || "",
      companyName: owner.companyName || "",
      companyAddress: owner.companyAddress || "",
      companyTaxId: owner.companyTaxId || "",
      companyVat: owner.companyVat || "",
      managerName: owner.managerName || "",
      managerEmail: owner.managerEmail || "",
      managerPhone: owner.managerPhone || "",
      managerPhoneCountryCode: owner.managerPhoneCountryCode || "",
      managerPhoneDialCode: owner.managerPhoneDialCode || "",
      preferredLanguage: owner.preferredLanguage || "",
      communicationPreference: owner.communicationPreference || "",
      notes: owner.notes || "",
    };
  }

  // Step 3: Contractual Details - Map from contractualDetails object
  if (villa.contractualDetails) {
    const contract = villa.contractualDetails;
    stepData.step3 = {
      contractSignatureDate: contract.contractStartDate
        ? new Date(contract.contractStartDate).toISOString().split("T")[0]
        : "",
      contractRenewalDate: contract.contractEndDate
        ? new Date(contract.contractEndDate).toISOString().split("T")[0]
        : "",
      contractStartDate: contract.contractStartDate
        ? new Date(contract.contractStartDate).toISOString().split("T")[0]
        : "",
      contractEndDate: contract.contractEndDate
        ? new Date(contract.contractEndDate).toISOString().split("T")[0]
        : "",
      contractType: contract.contractType
        ? contract.contractType.toLowerCase()
        : "",
      serviceCharge: contract.commissionRate?.toString() || "",
      managementFee: contract.managementFee?.toString() || "",
      marketingFee: contract.marketingFee?.toString() || "",
      paymentTerms: contract.paymentTerms || "",
      paymentSchedule: contract.paymentSchedule
        ? contract.paymentSchedule.toLowerCase()
        : "monthly",
      minimumStayNights: contract.minimumStayNights?.toString() || "1",
      payoutDay1: contract.payoutDay1?.toString() || "",
      payoutDay2: contract.payoutDay2?.toString() || "",
      vatRegistrationNumber: contract.vatRegistrationNumber || "",
      dbdNumber: contract.dbdNumber || "",
      vatPaymentTerms: contract.vatPaymentTerms || "",
      paymentThroughIPL: contract.paymentThroughIPL || false,
      cancellationPolicy: contract.cancellationPolicy
        ? contract.cancellationPolicy.toLowerCase()
        : "moderate",
      checkInTime: contract.checkInTime || "15:00",
      checkOutTime: contract.checkOutTime || "11:00",
      insuranceProvider: contract.insuranceProvider || "",
      insurancePolicyNumber: contract.insurancePolicyNumber || "",
      insuranceExpiry: contract.insuranceExpiry
        ? new Date(contract.insuranceExpiry).toISOString().split("T")[0]
        : "",
      specialTerms: contract.specialTerms || "",
    };
  }

  // Step 4: Bank Details - Map from bankDetails object
  if (villa.bankDetails) {
    const bank = villa.bankDetails;
    stepData.step4 = {
      accountName: bank.accountHolderName || "",
      accountHolderName: bank.accountHolderName || "",
      bankName: bank.bankName || "",
      bankAccountNumber: bank.accountNumber || "",
      accountNumber: bank.accountNumber || "",
      swiftBicCode: bank.swiftCode || "",
      swiftCode: bank.swiftCode || "",
      iban: bank.iban || "",
      bankBranch: bank.branchName || "",
      branchName: bank.branchName || "",
      branchCode: bank.branchCode || "",
      bankAddress: bank.branchAddress || bank.bankAddress || "",
      branchAddress: bank.branchAddress || bank.bankAddress || "",
      bankCountry: bank.bankCountry || "",
      currency: bank.currency || "IDR",
      accountType: bank.accountType || "CHECKING",
      routingNumber: bank.routingNumber || "",
      taxId: bank.taxId || "",
      bankNotes: bank.notes || "",
      notes: bank.notes || "",
    };
  }

  // Step 5: OTA Credentials - Map from otaCredentials array
  if (villa.otaCredentials && Array.isArray(villa.otaCredentials)) {
    const otaData: Record<string, string | boolean> = {};
    villa.otaCredentials.forEach((cred: OTAPlatformData) => {
      const platformKey = mapOtaPlatformToFrontendKey(cred.platform);
      if (platformKey) {
        const isActive =
          typeof cred.isActive === "boolean" ? cred.isActive : cred.isListed;
        otaData[`${platformKey}Listed`] = Boolean(isActive);
        otaData[`${platformKey}Username`] = cred.username || "";
        otaData[`${platformKey}Password`] = cred.password || "";
        otaData[`${platformKey}PropertyId`] = cred.propertyId || "";
        otaData[`${platformKey}ApiKey`] = cred.apiKey || "";
        otaData[`${platformKey}ApiSecret`] = cred.apiSecret || "";
        otaData[`${platformKey}ListingUrl`] = cred.listingUrl || "";
        otaData[`${platformKey}AccountUrl`] = cred.accountUrl || "";
        otaData[`${platformKey}PropertyUrl`] = cred.propertyUrl || "";
      }
    });
    stepData.step5 = otaData;
  }

  // Steps 6-9: Use dedicated mapping helpers to ensure consistent structure
  const documentsData = mapOnboardingDataFromBackend(6, {
    documents: villa.documents || [],
  }) as StepDataUnion;
  stepData.step6 = documentsData;

  const staffData = mapOnboardingDataFromBackend(7, {
    staff: villa.staff || [],
  }) as StepDataUnion;
  stepData.step7 = staffData;

  const facilitiesData = mapOnboardingDataFromBackend(8, {
    facilities: villa.facilities || [],
  }) as StepDataUnion;
  stepData.step8 = facilitiesData;

  const villaFieldProgress =
    (villa as { fieldProgress?: Record<string, unknown> }).fieldProgress ||
    progressData.fieldProgress;
  const bedroomsFromProgress = Array.isArray(
    (villaFieldProgress as { bedrooms?: BedroomData[] })?.bedrooms
  )
    ? ((villaFieldProgress as { bedrooms?: BedroomData[] }).bedrooms as BedroomData[])
    : [];

  const photosData = mapOnboardingDataFromBackend(9, {
    photos: villa.photos || [],
    bedrooms: bedroomsFromProgress,
  }) as StepDataUnion;
  stepData.step9 = photosData;

  return validateStepDataStructure(stepData);
}

/**
 * Helper function to map OTA platform enum to frontend key
 */
function mapOtaPlatformToFrontendKey(platform: string): string | null {
  const mapping: Record<string, string> = {
    BOOKING_COM: "bookingCom",
    AIRBNB: "airbnb",
    VRBO: "vrbo",
    EXPEDIA: "expedia",
    AGODA: "agoda",
    HOTELS_COM: "hotelsCom",
    MARRIOTT_HOMES_VILLAS: "marriottHomesVillas",
    TRIPADVISOR: "tripadvisor",
  };
  return mapping[platform] || null;
}

/**
 * Map backend onboarding data to frontend format for each step
 */
export function mapOnboardingDataFromBackend(
  step: number,
  backendData: Record<string, unknown>
) {
  try {
    if (!backendData) return {};

    // Validate step number
    if (!Number.isInteger(step) || step < 1 || step > 10) {
      throw new Error(
        `Invalid step number: ${step}. Must be between 1 and 10.`
      );
    }

    switch (step) {
      case 1: // Villa Information
        return mapVillaDataToFrontend(backendData);
      case 2: {
        // Owner Details - Updated mapping to match new frontend structure
        const result = {
          // Owner Type
          ownerType: backendData.ownerType,

          // Personal Information - Updated field mappings
          firstName: backendData.firstName,
          lastName: backendData.lastName,
          email: backendData.email,
          phone: backendData.phone,
          phoneCountryCode: backendData.phoneCountryCode,
          phoneDialCode: backendData.phoneDialCode,
          alternativePhone: backendData.alternativePhone,
          alternativePhoneCountryCode: backendData.alternativePhoneCountryCode,
          alternativePhoneDialCode: backendData.alternativePhoneDialCode,
          nationality: backendData.nationality,
          passportNumber: backendData.passportNumber,
          idNumber: backendData.idNumber,
          address: backendData.address,
          city: backendData.city,
          country: backendData.country,
          zipCode: backendData.zipCode,

          // Company Information - Updated field mappings
          companyName: backendData.companyName,
          companyAddress: backendData.companyAddress,
          companyTaxId: backendData.companyTaxId,
          companyVat: backendData.companyVat,

          // Manager Information - Updated field mappings
          managerName: backendData.managerName,
          managerEmail: backendData.managerEmail,
          managerPhone: backendData.managerPhone,
          managerPhoneCountryCode: backendData.managerPhoneCountryCode,
          managerPhoneDialCode: backendData.managerPhoneDialCode,

          // Additional Info
          preferredLanguage: backendData.preferredLanguage,
          communicationPreference: backendData.communicationPreference,
          notes: backendData.notes,
        };

        return result;
      }
      case 3: {
        // Contractual Details - Enhanced mapping
        const contractResult = {
          // Contract Dates - Convert ISO dates to YYYY-MM-DD format for HTML date inputs
          contractSignatureDate: backendData.contractStartDate
            ? new Date(backendData.contractStartDate as DateInput)
                .toISOString()
                .split("T")[0]
            : "",
          contractRenewalDate: backendData.contractEndDate
            ? new Date(backendData.contractEndDate as DateInput)
                .toISOString()
                .split("T")[0]
            : "",
          contractStartDate: backendData.contractStartDate
            ? new Date(backendData.contractStartDate as DateInput)
                .toISOString()
                .split("T")[0]
            : "",
          contractEndDate: backendData.contractEndDate
            ? new Date(backendData.contractEndDate as DateInput)
                .toISOString()
                .split("T")[0]
            : "",
          contractType: backendData.contractType
            ? (backendData.contractType as string).toLowerCase()
            : "",

          // Commission and Fees - Map backend 'commissionRate' field to frontend 'serviceCharge' field
          serviceCharge: backendData.commissionRate?.toString() || "", // Backend field: commissionRate -> Frontend field: serviceCharge
          managementFee: backendData.managementFee?.toString() || "",
          marketingFee: backendData.marketingFee?.toString() || "",

          // Payment Terms
          paymentTerms: backendData.paymentTerms || "",
          paymentSchedule: backendData.paymentSchedule
            ? (backendData.paymentSchedule as string).toLowerCase()
            : "monthly",
          minimumStayNights: backendData.minimumStayNights?.toString() || "1",
          payoutDay1: backendData.payoutDay1?.toString() || "",
          payoutDay2: backendData.payoutDay2?.toString() || "",

          // VAT Information - Newly added fields
          vatRegistrationNumber: backendData.vatRegistrationNumber || "",
          dbdNumber: backendData.dbdNumber || "",
          vatPaymentTerms: backendData.vatPaymentTerms || "",
          paymentThroughIPL: backendData.paymentThroughIPL || false,

          // Policies
          cancellationPolicy: backendData.cancellationPolicy
            ? (backendData.cancellationPolicy as string).toLowerCase()
            : "moderate",
          checkInTime: backendData.checkInTime || "15:00",
          checkOutTime: backendData.checkOutTime || "11:00",

          // Insurance - Convert date to YYYY-MM-DD format
          insuranceProvider: backendData.insuranceProvider || "",
          insurancePolicyNumber: backendData.insurancePolicyNumber || "",
          insuranceExpiry: backendData.insuranceExpiry
            ? new Date(backendData.insuranceExpiry as DateInput)
                .toISOString()
                .split("T")[0]
            : "",

          // Special Terms
          specialTerms: backendData.specialTerms || "",
        };

        return contractResult;
      }
      case 4: {
        // Bank Details - Fixed frontend field mapping
        debugLog(
          "🏦 mapOnboardingDataFromBackend step 4 - Backend input:",
          backendData
        );
        const bankDetailsResult = {
          // Map database columns to frontend field names
          accountName: backendData.accountHolderName || "",
          accountHolderName: backendData.accountHolderName || "",
          bankName: backendData.bankName || "",
          bankAccountNumber: backendData.accountNumber || "",
          accountNumber: backendData.accountNumber || "",
          swiftBicCode: backendData.swiftCode || "",
          swiftCode: backendData.swiftCode || "",
          iban: backendData.iban || "",
          bankBranch: backendData.branchName || "",
          branchName: backendData.branchName || "",
          branchCode: backendData.branchCode || "",
          bankAddress:
            backendData.branchAddress || backendData.bankAddress || "",
          branchAddress:
            backendData.branchAddress || backendData.bankAddress || "",
          bankCountry: backendData.bankCountry || "",
          currency: backendData.currency || "IDR",
          accountType: backendData.accountType
            ? (backendData.accountType as string).toLowerCase()
            : "checking",
          routingNumber: backendData.routingNumber || "",
          taxId: backendData.taxId || "",
          bankNotes: backendData.notes || "",
          notes: backendData.notes || "",
        };
        debugLog(
          "🏦 mapOnboardingDataFromBackend step 4 - Frontend result:",
          bankDetailsResult
        );
        return bankDetailsResult;
      }
      case 5: {
        // OTA Credentials - Fixed backend data access
        // Convert backend array structure to flat frontend structure
        debugLog("🔄 Backend-to-frontend OTA mapping input:", backendData);
        const otaData: Record<string, string | boolean> = {};
        const platformMapping: Record<string, string> = {
          BOOKING_COM: "bookingCom",
          AIRBNB: "airbnb",
          VRBO: "vrbo",
          EXPEDIA: "expedia",
          AGODA: "agoda",
          HOTELS_COM: "hotelsCom",
          MARRIOTT_HOMES_VILLAS: "marriottHomesVillas",
          TRIPADVISOR: "tripadvisor",
        };

        // Initialize all platforms as not listed
        Object.values(platformMapping).forEach((key) => {
          otaData[`${key}Listed`] = false;
          otaData[`${key}Username`] = "";
          otaData[`${key}Password`] = "";
          otaData[`${key}ListingUrl`] = "";
          otaData[`${key}PropertyId`] = "";
          otaData[`${key}ApiKey`] = "";
          otaData[`${key}ApiSecret`] = "";
          otaData[`${key}AccountUrl`] = "";
          otaData[`${key}PropertyUrl`] = "";
        });

        // Populate data from backend - backendData is directly the otaCredentials array
        const platforms = Array.isArray(backendData) ? backendData : [];
        debugLog(
          "Processing platforms from backend:",
          platforms.length,
          "platforms"
        );
        platforms.forEach((platform: OTAPlatformData) => {
          const key = platformMapping[platform.platform];
          debugLog(
            `Processing platform ${platform.platform} -> key ${key}:`,
            {
              isActive: platform.isActive,
              username: platform.username,
              password: platform.password,
              hasData: !!(
                platform.username ||
                platform.password ||
                platform.propertyId ||
                platform.apiKey ||
                platform.apiSecret ||
                platform.listingUrl ||
                platform.accountUrl ||
                platform.propertyUrl
              ),
            }
          );
          if (key) {
            // If platform has any credentials data, show it as listed to make it visible
            const hasCredentials =
              platform.username ||
              platform.password ||
              platform.propertyId ||
              platform.apiKey ||
              platform.apiSecret ||
              platform.listingUrl ||
              platform.accountUrl ||
              platform.propertyUrl;

            debugLog(`Backend-to-frontend mapping for ${key}:`, {
              platform: platform.platform,
              isActive: platform.isActive,
              hasCredentials,
              willBeListed: platform.isActive || hasCredentials || false,
              fields: {
                username: platform.username || "",
                password: platform.password ? "[HIDDEN]" : "",
                propertyId: platform.propertyId || "",
                apiKey: platform.apiKey ? "[HIDDEN]" : "",
                apiSecret: platform.apiSecret ? "[HIDDEN]" : "",
              },
            });

            // Show as listed if either isActive OR has credentials data
            otaData[`${key}Listed`] =
              platform.isActive || hasCredentials || false;
            otaData[`${key}Username`] = platform.username || "";
            otaData[`${key}Password`] = platform.password || "";
            otaData[`${key}ListingUrl`] = platform.listingUrl || "";
            otaData[`${key}PropertyId`] = platform.propertyId || "";
            otaData[`${key}ApiKey`] = platform.apiKey || "";
            otaData[`${key}ApiSecret`] = platform.apiSecret || "";
            otaData[`${key}AccountUrl`] = platform.accountUrl || "";
            otaData[`${key}PropertyUrl`] = platform.propertyUrl || "";
          }
        });

        debugLog("🔄 Backend-to-frontend OTA mapping output:", otaData);
        return otaData;
      }
      case 6: {
        // Documents Upload - Enhanced backend to frontend mapping
        // Handle multiple backend data formats
        let backendDocuments: DocumentData[];
        if (Array.isArray(backendData)) {
          backendDocuments = backendData;
        } else if (Array.isArray(backendData?.documents)) {
          backendDocuments = backendData.documents;
        } else {
          backendDocuments = [];
        }

        // Map backend document structure to frontend expectations
        const mappedDocuments = backendDocuments.map((doc: DocumentData) => {
          const uploadedAt =
            doc.uploadedAt ||
            doc.uploadedAtIso ||
            doc.updatedAt ||
            doc.createdAt;

          return {
            // Core document identification
            id: doc.id,
            documentId: doc.id,
            name: doc.filename || doc.originalName || doc.name,
            displayName:
              doc.displayName || doc.originalName || doc.filename || doc.name,

            // Document type and categorization
            type: doc.type || doc.documentType || "OTHER",
            category: doc.category || "other",
            documentType: doc.type || doc.documentType || "OTHER",

            // File metadata
            filename: doc.filename || doc.originalName,
            originalName: doc.originalName || doc.filename,
            fileName: doc.filename || doc.originalName,
            mimeType: doc.mimeType || "application/octet-stream",
            size: doc.size ?? (doc as any).fileSize ?? 0,

            // SharePoint integration
            sharePointUrl: doc.sharePointUrl || doc.url,
            sharePointId: doc.sharePointFileId || doc.sharePointId,
            sharePointFileId: doc.sharePointFileId || doc.sharePointId,
            sharePointPath: doc.sharePointPath,
            url: doc.sharePointUrl || doc.url,

            // Upload metadata
            uploaded: !!uploadedAt,
            uploadedAt,
            uploadedAtIso: uploadedAt,
            isRequired: doc.isRequired ?? false,
            isActive: doc.isActive ?? true,

            // File state for UI
            uploading: false,
            error: null,
          };
        });

        return {
          documents: mappedDocuments,
        };
      }
      case 7: {
        // Staff Configuration - Enhanced mapping
        debugLog(
          "🔄 Processing backend staff data for step 7:",
          backendData
        );
        // Handle both direct array and nested staff array
        let staffArray: BackendStaffData[];
        if (Array.isArray(backendData)) {
          staffArray = backendData;
        } else if (Array.isArray(backendData.staff)) {
          staffArray = backendData.staff;
        } else {
          staffArray = [];
        }
        debugLog("🔄 Staff array from backend:", staffArray);
        const mappedStaff = staffArray.map((staff: BackendStaffData) =>
          mapStaffDataToFrontend(staff)
        );
        debugLog("🔄 Mapped staff for frontend:", mappedStaff);
        // FIX: Return staff array as expected by StaffConfiguratorStep
        return { staff: mappedStaff };
      }
      case 8: {
        // Facilities - Backend to frontend mapping
        // Accept multiple input formats for flexibility
        let backendFacilities;
        if (Array.isArray(backendData)) {
          backendFacilities = backendData;
        } else if (backendData && Array.isArray(backendData.facilities)) {
          backendFacilities = backendData.facilities;
        } else {
          backendFacilities = [];
        }

        if (backendFacilities.length === 0) {
          return { facilities: [] };
        }

        const mappingResults = {
          processed: 0,
          successful: 0,
          warnings: [] as string[],
        };

        const mappedFacilities = backendFacilities
          .map((facility: BackendFacilityData, index: number) => {
            mappingResults.processed++;

            try {
              // Validate required backend fields
              if (!facility.category || !facility.itemName) {
                debugWarn(
                  `🏭 [MAPPER] Backend facility ${
                    index + 1
                  } missing required fields:`,
                  {
                    category: facility.category,
                    itemName: facility.itemName,
                  }
                );
                mappingResults.warnings.push(
                  `Facility ${index + 1}: Missing category or itemName`
                );
                return null;
              }

              // Map backend structure to frontend expectations
              const mapped = {
                // Core identification - CRITICAL: Use database ID when available
                id:
                  facility.id ||
                  `${facility.category}-${facility.itemName}`
                    .replace(/[^a-zA-Z0-9-]/g, "-")
                    .toLowerCase(),
                databaseId: facility.id, // Store actual database ID for updates/deletes
                category: mapFacilityCategoryToFrontend(facility.category),
                subcategory: facility.subcategory || "",
                itemName: facility.itemName || "",

                // Availability (map 'isAvailable' to 'available' for frontend)
                available: Boolean(facility.isAvailable),

                // Quantity and condition
                quantity: facility.quantity || 1,
                condition: facility.condition || "good",

                // Notes (provide multiple aliases for compatibility)
                notes: facility.notes || "",
                itemNotes: facility.notes || "",
                specifications: facility.specifications || "",

                // URLs and photo data
                photoUrl: facility.photoUrl || "",
                productLink: facility.productLink || "",

                // Photo metadata for local storage
                photoData:
                  typeof facility.photoData === "string"
                    ? facility.photoData.startsWith("data:")
                      ? facility.photoData
                      : `data:${
                          facility.photoMimeType || "image/jpeg"
                        };base64,${facility.photoData}`
                    : null,
                photoMimeType: facility.photoMimeType,
                photoSize: facility.photoSize,

                // Metadata
                checkedBy: facility.checkedBy || "",
                lastCheckedAt: facility.lastCheckedAt || null,

                // Timestamps for reference
                createdAt: facility.createdAt || null,
                updatedAt: facility.updatedAt || null,

                // Flag to indicate this came from database
                _fromDatabase: true,
              };

              // Validate mapping results
              if (mapped.category === "unknown" && facility.category) {
                mappingResults.warnings.push(
                  `Facility "${facility.itemName}": Unknown backend category "${facility.category}"`
                );
              }

              mappingResults.successful++;

              debugDebug(
                `🏭 [MAPPER] Successfully mapped facility ${index + 1}:`,
                {
                  backend: `${facility.category}/${facility.itemName}`,
                  frontend: `${mapped.category}/${mapped.itemName}`,
                  available: mapped.available,
                  id: mapped.id,
                }
              );

              return mapped;
            } catch (error) {
              debugError(
                `🏭 [MAPPER] Error mapping facility ${index + 1}:`,
                error
              );
              debugError(
                `Facility mapping error:`,
                error instanceof Error ? error.message : "Unknown error"
              );
              return null;
            }
          })
          .filter(Boolean); // Remove failed mappings

        debugLog("🏭 [MAPPER] Backend→Frontend mapping completed:", {
          input: backendFacilities.length,
          processed: mappingResults.processed,
          successful: mappingResults.successful,
          output: mappedFacilities.length,
          warningCount: mappingResults.warnings.length,
        });

        if (mappingResults.warnings.length > 0) {
          debugWarn(
            "🏭 [MAPPER] Mapping warnings:",
            mappingResults.warnings
          );
        }

        // Show sample of mapped data
        if (mappedFacilities.length > 0) {
          debugLog(
            "🏭 [MAPPER] Sample mapped facilities:",
            mappedFacilities.slice(0, 2)
          );
        }

        return { facilities: mappedFacilities };
      }
      case 9: {
        // Photos
        // Map backend photo data to frontend format
        const mappedPhotos = (
          (backendData as { photos?: BackendPhotoData[] }).photos || []
        ).map((photo: BackendPhotoData) => {
          // Use the public photo endpoint for better compatibility (no auth required for images)
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
          const previewUrl = `${API_URL}/api/photos/public/${
            photo.id
          }?t=${Date.now()}`;

          return {
            id: photo.id,
            file: null, // No file object for loaded photos
            category: mapPhotoCategoryToFrontend(photo.category || ""),
            subfolder: photo.subfolder || undefined,
            preview: previewUrl, // Use public endpoint with cache buster
            uploaded: true, // Already uploaded to backend
            sharePointId: photo.sharePointFileId,
            sharePointPath: photo.sharePointPath,
            fileName: photo.fileName,
            fileUrl: photo.fileUrl,
            thumbnailUrl: photo.thumbnailUrl
              ? `${API_URL}/api/photos/public/${photo.id}`
              : undefined,
            isMain: photo.isMain,
            caption: photo.caption,
            altText: photo.altText,
          };
        });

        // Simplified bedroom data handling - single source of truth
        let bedroomsData = [];

        // Check for bedrooms data in order of preference
        if (Array.isArray(backendData.bedrooms)) {
          bedroomsData = backendData.bedrooms;
        } else if (typeof backendData.bedrooms === "string") {
          try {
            bedroomsData = JSON.parse(backendData.bedrooms);
          } catch {
            bedroomsData = [];
          }
        } else if (
          (backendData as ExtendedBackendData).fieldProgress?.bedrooms
        ) {
          try {
            const extendedData = backendData as ExtendedBackendData;
            const bedroomsField = extendedData.fieldProgress?.bedrooms;
            bedroomsData =
              typeof bedroomsField === "string"
                ? JSON.parse(bedroomsField)
                : (bedroomsField as BedroomData[]);
          } catch {
            bedroomsData = [];
          }
        }

        // Ensure bedrooms is always an array
        if (!Array.isArray(bedroomsData)) {
          bedroomsData = [];
        }

        return {
          photos: mappedPhotos,
          bedrooms: bedroomsData,
        };
      }
      case 10: {
        // Review
        return {
          reviewNotes: backendData.reviewNotes || "",
          agreedToTerms: backendData.agreedToTerms || false,
        };
      }
      default:
        return backendData;
    }
  } catch (error) {
    debugError(
      `Error mapping backend data to frontend for step ${step}:`,
      error
    );

    // Return error information for debugging
    return {
      _mappingError: true,
      _step: step,
      _error: error instanceof Error ? error.message : "Unknown mapping error",
      _originalData: backendData,
    };
  }
}

/**
 * Map backend staff data to frontend schema
 */
export function mapStaffDataToFrontend(backendData: BackendStaffData) {
  debugLog("🔄 Mapping backend staff data to frontend:", backendData);

  // Parse emergency contacts safely
  let parsedEmergencyContacts = [];
  try {
    if (backendData.emergencyContacts) {
      if (typeof backendData.emergencyContacts === "string") {
        parsedEmergencyContacts = JSON.parse(backendData.emergencyContacts);
      } else if (Array.isArray(backendData.emergencyContacts)) {
        parsedEmergencyContacts = backendData.emergencyContacts;
      }
    }
  } catch (error) {
    debugWarn("Failed to parse emergency contacts:", error);
    parsedEmergencyContacts = [];
  }

  // Ensure at least one empty emergency contact exists
  if (parsedEmergencyContacts.length === 0) {
    parsedEmergencyContacts = [
      {
        firstName: "",
        lastName: "",
        phone: "",
        phoneCountryCode: "",
        phoneDialCode: "",
        email: "",
        relationship: "OTHER",
      },
    ];
  }

  const mappedData = {
    // System fields
    id: backendData.id || Math.random().toString(),

    // Personal Information
    firstName: backendData.firstName || "",
    lastName: backendData.lastName || "",
    fullName: `${backendData.firstName || ""} ${
      backendData.lastName || ""
    }`.trim(),
    nickname: backendData.nickname || "",
    email: backendData.email || "",
    phone: backendData.phone || "",
    phoneCountryCode: backendData.phoneCountryCode || "",
    phoneDialCode: backendData.phoneDialCode || "",
    idCard: backendData.idNumber || "", // Frontend uses idCard field name
    passportNumber: backendData.passportNumber || "",
    nationality: backendData.nationality || "",
    dateOfBirth: backendData.dateOfBirth
      ? backendData.dateOfBirth.split("T")[0]
      : "", // Convert ISO to YYYY-MM-DD
    maritalStatus: Boolean(backendData.maritalStatus),

    // Employment Details
    position: getPositionDisplayName(backendData.position || "OTHER"),
    department: backendData.department || "MANAGEMENT",
    employmentType: backendData.employmentType || "FULL_TIME",
    startDate: backendData.startDate ? backendData.startDate.split("T")[0] : "", // Convert ISO to YYYY-MM-DD
    endDate: backendData.endDate ? backendData.endDate.split("T")[0] : "",

    // Compensation - Map backend fields to frontend field names
    baseSalary: (backendData.salary || 0).toString(),
    salary: (backendData.salary || 0).toString(),
    salaryFrequency: backendData.salaryFrequency || "MONTHLY",
    currency: backendData.currency || "IDR",
    numberOfDaySalary: (backendData.numberOfDaySalary || 0).toString(),
    serviceCharge: (backendData.serviceCharge || 0).toString(),
    foodAllowance: backendData.foodAllowance || false,
    transportation:
      backendData.transportation ||
      deriveTransportationFromBenefits(backendData.hasTransport || false),
    totalIncome: (backendData.totalIncome || 0).toString(),
    totalNetIncome: (backendData.totalNetIncome || 0).toString(),
    otherDeduct: (backendData.otherDeductions || 0).toString(),

    // Benefits
    hasAccommodation: backendData.hasAccommodation || false,
    hasTransport: backendData.hasTransport || false,
    healthInsurance: backendData.hasHealthInsurance || false,
    workInsurance: backendData.hasWorkInsurance || false,

    // Emergency Contacts - Parse from JSON and ensure proper structure
    emergencyContacts: parsedEmergencyContacts,

    // Status fields
    isActive: backendData.isActive !== false,
  };

  debugLog("🔄 Mapped staff data for frontend:", mappedData);
  return mappedData;
}

// Helper functions
function generateVillaCode(villaName: string): string {
  const prefix = villaName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix || "VLA"}-${suffix}`;
}

function parseLatLngFromCoordinates(
  coordinates: string
): { lat: number; lng: number } | null {
  if (!coordinates) return null;

  const parts = coordinates.split(",").map((s) => s.trim());
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  // Validate ranges: latitude must be -90 to 90, longitude -180 to 180
  if (
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}
