// Comprehensive TypeScript interfaces for Onboarding System

export interface VillaInformation {
  villaName: string;
  villaAddress: string;
  villaCity: string;
  villaCountry: string;
  villaPostalCode: string;
  bedrooms: string;
  bathrooms: string;
  maxGuests: string;
  propertyType: string;
  landArea: string;
  villaArea: string;
  latitude: string;
  longitude: string;
  locationType: string;
  googleMapsLink: string;
  oldRatesCardLink: string;
  iCalCalendarLink: string;
  yearBuilt: string;
  renovationYear: string;
  villaStyle: string;
  description: string;
  shortDescription: string;
  propertyEmail: string;
  propertyWebsite: string;
}

export interface OwnerDetails {
  ownerType: 'INDIVIDUAL' | 'COMPANY';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  phoneDialCode: string;
  alternativePhone: string;
  alternativePhoneCountryCode: string;
  alternativePhoneDialCode: string;
  nationality: string;
  passportNumber: string;
  idNumber: string;
  address: string;
  city: string;
  country: string;
  zipCode: string;
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  companyVat: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  managerPhoneCountryCode: string;
  managerPhoneDialCode: string;
  preferredLanguage: string;
  communicationPreference: string;
  notes: string;
}

export interface ContractualDetails {
  contractSignatureDate: string;
  contractRenewalDate: string;
  contractStartDate: string;
  contractEndDate: string;
  contractType: string;
  serviceCharge: string;
  managementFee: string;
  marketingFee: string;
  paymentTerms: string;
  paymentSchedule: string;
  minimumStayNights: string;
  payoutDay1: string;
  payoutDay2: string;
  vatRegistrationNumber: string;
  dbdNumber: string;
  vatPaymentTerms: string;
  paymentThroughIPL: boolean;
  cancellationPolicy: string;
  checkInTime: string;
  checkOutTime: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  specialTerms: string;
}

export interface BankDetails {
  accountName: string;
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  accountNumber: string;
  swiftBicCode: string;
  swiftCode: string;
  iban: string;
  bankBranch: string;
  branchName: string;
  branchCode: string;
  bankAddress: string;
  branchAddress: string;
  bankCountry: string;
  currency: string;
  accountType: string;
  routingNumber: string;
  taxId: string;
  bankNotes: string;
  notes: string;
}

export interface OTACredentials {
  [key: string]: string | boolean;
  // Dynamic structure for different OTA platforms
}

export interface StaffMember {
  id?: string;
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone: string;
  emergencyContact: string;
  startDate: string;
  salary: string;
  notes: string;
  isActive: boolean;
}

export interface FacilityItem {
  id?: string;
  category: string;
  itemName: string;
  isAvailable: boolean;
  quantity: number;
  condition: 'new' | 'good' | 'fair' | 'poor';
  notes: string;
  specifications: string;
  photoUrl?: string;
  photoData?: string;
  photoMimeType?: string;
  photoSize?: number;
  productLink?: string;
  checkedBy?: string;
  lastCheckedAt?: string;
}

export interface PhotoData {
  id?: string;
  category: string;
  subcategory?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  sortOrder: number;
  isMain: boolean;
}

export interface BedroomData {
  id?: string;
  name: string;
  bedType: string;
  bedCount: number;
  hasEnsuite: boolean;
  hasAircon: boolean;
  photos: PhotoData[];
}

export interface DocumentData {
  id?: string;
  documentId?: string;
  type?: string;
  documentType?: string;
  category?: string;
  filename?: string;
  fileName?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  url?: string;
  sharePointUrl?: string;
  sharePointPath?: string;
  sharePointId?: string;
  sharePointFileId?: string;
  uploadedAt?: string;
  uploadedAtIso?: string;
  uploaded?: boolean;
  isRequired?: boolean;
  isActive?: boolean;
  description?: string;
  notes?: string;
  validated?: boolean;
  validatedAt?: string;
  validatedBy?: string;
}

export interface OnboardingStepData {
  step1?: VillaInformation;
  step2?: OwnerDetails;
  step3?: ContractualDetails;
  step4?: BankDetails;
  step5?: OTACredentials;
  step6?: DocumentData[];
  step7?: StaffMember[];
  step8?: FacilityItem[];
  step9?: {
    photos: PhotoData[];
    bedrooms: BedroomData[];
  };
  step10?: {
    reviewNotes: string;
    agreedToTerms: boolean;
  };
}

export interface OnboardingProgress {
  villaId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  completionPercentage: number;
  villaInfoCompleted: boolean;
  ownerDetailsCompleted: boolean;
  contractualDetailsCompleted: boolean;
  bankDetailsCompleted: boolean;
  otaCredentialsCompleted: boolean;
  documentsUploaded: boolean;
  staffConfigCompleted: boolean;
  facilitiesCompleted: boolean;
  photosUploaded: boolean;
  reviewCompleted: boolean;
  villa?: {
    id: string;
    villaName: string;
    address: string;
    city: string;
    country: string;
    zipCode: string;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    propertyType: string;
    propertySize: number;
    plotSize: number;
    latitude: number;
    longitude: number;
    locationType: string;
    googleMapsLink: string;
    oldRatesCardLink: string;
    iCalCalendarLink: string;
    yearBuilt: number;
    renovationYear: number;
    villaStyle: string;
    description: string;
    shortDescription: string;
    propertyEmail: string;
    propertyWebsite: string;
    owner?: OwnerDetails;
    contractualDetails?: ContractualDetails;
    bankDetails?: BankDetails;
    otaCredentials?: OTACredentials[];
    staff?: StaffMember[];
    facilities?: FacilityItem[];
    photos?: PhotoData[];
    documents?: DocumentData[];
  };
}

export interface StepHandle {
  validate: () => boolean;
  getData: () => any;
  focus: () => void;
}

export interface StepProps<T = any> {
  data: T;
  onUpdate: (stepData: T) => void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface AutoSaveConfig {
  enabled: boolean;
  debounceTime: number;
  minTimeBetweenSaves: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SaveOperation {
  stepNumber: number;
  data: any;
  completed: boolean;
  isAutoSave: boolean;
  timestamp: number;
  operationId: number;
}

export interface FieldProgressResult {
  step: number;
  data: any;
  success: boolean;
}

export interface OnboardingWizardProps {
  forceNewSession?: boolean;
  urlVillaId?: string;
}

export interface BackupData {
  villaId: string;
  timestamp: number;
  stepData: OnboardingStepData;
  currentStep: number;
}

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type AutoSaveStatus = 'idle' | 'saving' | 'error' | 'success';

export type LoadingState = 'loading' | 'success' | 'error' | 'idle';
