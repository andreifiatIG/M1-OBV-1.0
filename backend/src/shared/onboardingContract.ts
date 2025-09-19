import { z } from 'zod';

/**
 * Canonical enumerations shared between onboarding frontend and backend.
 */
export const PROPERTY_TYPES = [
  'VILLA',
  'APARTMENT',
  'PENTHOUSE',
  'TOWNHOUSE',
  'CHALET',
  'BUNGALOW',
  'ESTATE',
  'HOUSE',
] as const;

export const VILLA_STYLES = [
  'MODERN',
  'TRADITIONAL',
  'MEDITERRANEAN',
  'CONTEMPORARY',
  'BALINESE',
  'MINIMALIST',
  'LUXURY',
  'RUSTIC',
] as const;

export const VILLA_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;

export const OWNER_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;

export const COMMUNICATION_PREFERENCES = ['EMAIL', 'PHONE', 'WHATSAPP', 'SMS'] as const;

export const CONTRACT_TYPES = ['EXCLUSIVE', 'NON_EXCLUSIVE', 'SEASONAL', 'LONG_TERM'] as const;

export const PAYMENT_SCHEDULES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'] as const;

export const CANCELLATION_POLICIES = ['FLEXIBLE', 'MODERATE', 'STRICT', 'SUPER_STRICT', 'NON_REFUNDABLE'] as const;

export const OTA_PLATFORMS = [
  'BOOKING_COM',
  'AIRBNB',
  'VRBO',
  'EXPEDIA',
  'AGODA',
  'HOTELS_COM',
  'TRIPADVISOR',
  'MARRIOTT_HOMES_VILLAS',
  'HOMEAWAY',
  'FLIPKEY',
  'DIRECT',
] as const;

export const STAFF_POSITIONS = [
  'VILLA_MANAGER',
  'HOUSEKEEPER',
  'GARDENER',
  'POOL_MAINTENANCE',
  'SECURITY',
  'CHEF',
  'DRIVER',
  'CONCIERGE',
  'MAINTENANCE',
  'OTHER',
] as const;

export const STAFF_DEPARTMENTS = [
  'MANAGEMENT',
  'HOUSEKEEPING',
  'MAINTENANCE',
  'SECURITY',
  'HOSPITALITY',
  'ADMINISTRATION',
] as const;

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'SEASONAL', 'FREELANCE'] as const;

export const SALARY_FREQUENCIES = ['HOURLY', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ANNUALLY'] as const;

const emptyToUndefined = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const toTrimmedString = (value: unknown) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return value;
};

const stringField = (max?: number) => {
  const base = max ? z.string().max(max) : z.string();
  return z.preprocess((value) => {
    const next = emptyToUndefined(value);
    if (next === undefined) return undefined;
    return toTrimmedString(next);
  }, base);
};

const emailField = () =>
  z.preprocess((value) => {
    const next = emptyToUndefined(value);
    if (next === undefined) return undefined;
    if (typeof next === 'string') return next.trim();
    return next;
  }, z.string().email());

const optionalString = (max?: number) => stringField(max).optional();

const requiredString = (max?: number) => stringField(max);

const optionalRichText = () => z
  .preprocess((value) => {
    const next = emptyToUndefined(value);
    if (next === undefined) return undefined;
    if (typeof next === 'string') return next.trim();
    return String(next);
  }, z.string().max(10000))
  .optional();

const numberField = (isInt = false) => {
  const base = isInt ? z.number().int() : z.number();
  return z.preprocess((value) => {
    const next = emptyToUndefined(value);
    if (next === undefined) return undefined;

    if (typeof next === 'number') {
      if (Number.isFinite(next)) return next;
      return next;
    }

    if (typeof next === 'string') {
      const normalized = next.trim();
      if (normalized.length === 0) return undefined;
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
      return next; // let Zod raise the error
    }

    return next;
  }, base);
};

const optionalNumber = (isInt = false) => numberField(isInt).optional();

const optionalBoolean = () =>
  z
    .preprocess((value) => {
      const next = emptyToUndefined(value);
      if (next === undefined) return undefined;

      if (typeof next === 'boolean') return next;
      if (typeof next === 'string') {
        const lowered = next.trim().toLowerCase();
        if (['true', '1', 'yes'].includes(lowered)) return true;
        if (['false', '0', 'no'].includes(lowered)) return false;
      }
      if (typeof next === 'number') {
        if (next === 1) return true;
        if (next === 0) return false;
      }
      return next;
    }, z.boolean())
    .optional();

const optionalEmail = () => emailField().optional();

const optionalUrl = () =>
  z
    .preprocess((value) => {
      const next = emptyToUndefined(value);
      if (next === undefined) return undefined;
      if (typeof next === 'string') {
        const trimmed = next.trim();
        if (!trimmed) return undefined;
        if (!/^https?:\/\//i.test(trimmed) && trimmed.includes('.') && !trimmed.includes(' ')) {
          return `https://${trimmed}`;
        }
        return trimmed;
      }
      return value;
    }, z.string().url())
    .optional();

const partialEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .preprocess((value) => {
      const next = emptyToUndefined(value);
      if (next === undefined) return undefined;
      if (typeof next === 'string') return next.trim().toUpperCase();
      return next;
    }, z.enum(values))
    .optional();

const optionalDateString = () =>
  z
    .preprocess((value) => {
      const next = emptyToUndefined(value);
      if (next === undefined) return undefined;
      if (next instanceof Date) return next.toISOString();
      if (typeof next === 'number' && Number.isFinite(next)) {
        return new Date(next).toISOString();
      }
      if (typeof next === 'string') {
        const trimmed = next.trim();
        if (!trimmed) return undefined;
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) {
          return trimmed;
        }
        return parsed.toISOString();
      }
      return next;
    }, z.string().min(5))
    .optional();

const optionalStringArray = () =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null) return undefined;
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : undefined;
        } catch {
          return [trimmed];
        }
      }
      return undefined;
    }, z.array(stringField(200)))
    .optional();

const Step1SchemaBase = z
  .object({
    villaName: requiredString(200),
    address: requiredString(400),
    city: requiredString(120),
    country: requiredString(120),
    zipCode: optionalString(30),
    latitude: optionalNumber(),
    longitude: optionalNumber(),
    bedrooms: optionalNumber(true),
    bathrooms: optionalNumber(true),
    maxGuests: optionalNumber(true),
    propertySize: optionalNumber(),
    plotSize: optionalNumber(),
    yearBuilt: optionalNumber(true),
    renovationYear: optionalNumber(true),
    propertyType: partialEnum(PROPERTY_TYPES),
    villaStyle: partialEnum(VILLA_STYLES),
    locationType: optionalString(120),
    description: optionalRichText(),
    shortDescription: optionalRichText(),
    propertyEmail: optionalEmail(),
    propertyWebsite: optionalUrl(),
    googleMapsLink: optionalUrl(),
    googleCoordinates: optionalString(120),
    oldRatesCardLink: optionalUrl(),
    iCalCalendarLink: optionalUrl(),
    status: partialEnum(VILLA_STATUSES),
    isActive: optionalBoolean(),
    tags: optionalStringArray(),
    skipped: optionalBoolean(),
  })
  .strict();

const Step2SchemaBase = z
  .object({
    ownerType: partialEnum(OWNER_TYPES),
    firstName: requiredString(120),
    lastName: requiredString(120),
    email: emailField(),
    phone: requiredString(60),
    phoneCountryCode: optionalString(8),
    phoneDialCode: optionalString(8),
    alternativePhone: optionalString(60),
    alternativePhoneCountryCode: optionalString(8),
    alternativePhoneDialCode: optionalString(8),
    nationality: optionalString(80),
    passportNumber: optionalString(80),
    idNumber: optionalString(80),
    address: requiredString(400),
    city: requiredString(120),
    country: requiredString(120),
    zipCode: optionalString(30),
    companyName: optionalString(200),
    companyAddress: optionalString(400),
    companyTaxId: optionalString(80),
    companyVat: optionalString(80),
    managerName: optionalString(160),
    managerEmail: optionalEmail(),
    managerPhone: optionalString(60),
    managerPhoneCountryCode: optionalString(8),
    managerPhoneDialCode: optionalString(8),
    preferredLanguage: optionalString(10),
    communicationPreference: partialEnum(COMMUNICATION_PREFERENCES),
    notes: optionalRichText(),
    propertyEmail: optionalEmail(),
    propertyWebsite: optionalUrl(),
    skipped: optionalBoolean(),
  })
  .strict();

const Step3SchemaBase = z
  .object({
    contractStartDate: optionalDateString(),
    contractEndDate: optionalDateString(),
    contractType: partialEnum(CONTRACT_TYPES),
    commissionRate: optionalNumber(),
    managementFee: optionalNumber(),
    marketingFee: optionalNumber(),
    paymentTerms: optionalRichText(),
    paymentSchedule: partialEnum(PAYMENT_SCHEDULES),
    minimumStayNights: optionalNumber(true),
    cancellationPolicy: partialEnum(CANCELLATION_POLICIES),
    checkInTime: optionalString(20),
    checkOutTime: optionalString(20),
    insuranceProvider: optionalString(160),
    insurancePolicyNumber: optionalString(160),
    insuranceExpiry: optionalDateString(),
    specialTerms: optionalRichText(),
    payoutDay1: optionalNumber(true),
    payoutDay2: optionalNumber(true),
    dbdNumber: optionalString(80),
    paymentThroughIPL: optionalBoolean(),
    vatPaymentTerms: optionalRichText(),
    vatRegistrationNumber: optionalString(120),
    skipped: optionalBoolean(),
  })
  .strict();

const Step4SchemaBase = z
  .object({
    accountHolderName: requiredString(200),
    bankName: requiredString(200),
    accountNumber: requiredString(80),
    iban: optionalString(34),
    swiftCode: optionalString(11),
    branchName: optionalString(200),
    branchCode: optionalString(80),
    branchAddress: optionalString(400),
    bankAddress: optionalString(400),
    bankCountry: optionalString(120),
    currency: optionalString(8),
    accountType: optionalString(40),
    notes: optionalRichText(),
    isVerified: optionalBoolean(),
    routingNumber: optionalString(40),
    taxId: optionalString(80),
    skipped: optionalBoolean(),
  })
  .strict();

const OtaCredentialSchema = z
  .object({
    platform: z.preprocess((value) => {
      const next = emptyToUndefined(value);
      if (next === undefined) return undefined;
      if (typeof next === 'string') return next.trim().toUpperCase();
      return next;
    }, z.enum(OTA_PLATFORMS)),
    username: optionalString(160),
    password: optionalString(160),
    propertyId: optionalString(160),
    apiKey: optionalString(160),
    apiSecret: optionalString(160),
    listingUrl: optionalUrl(),
    accountUrl: optionalUrl(),
    propertyUrl: optionalUrl(),
    isActive: optionalBoolean(),
  })
  .strict();

const Step5SchemaBase = z
  .object({
    platforms: z.array(OtaCredentialSchema).optional(),
    skipped: optionalBoolean(),
  })
  .strict();

const DocumentSchema = z
  .object({
    type: optionalString(120),
    category: optionalString(120),
    filename: optionalString(260),
    originalName: optionalString(260),
    mimeType: optionalString(120),
    size: optionalNumber(),
    sharePointUrl: optionalUrl(),
    sharePointFileId: optionalString(160),
    sharePointPath: optionalString(400),
    uploadedAt: optionalDateString(),
    isRequired: optionalBoolean(),
    isActive: optionalBoolean(),
    validated: optionalBoolean(),
    validatedAt: optionalDateString(),
    validatedBy: optionalString(160),
    description: optionalRichText(),
    notes: optionalRichText(),
  })
  .strict();

const Step6SchemaBase = z
  .object({
    documents: z.array(DocumentSchema).optional(),
    skipped: optionalBoolean(),
  })
  .strict();

const EmergencyContactSchema = z
  .object({
    firstName: optionalString(120),
    lastName: optionalString(120),
    phone: optionalString(60),
    phoneCountryCode: optionalString(8),
    phoneDialCode: optionalString(8),
    email: optionalEmail(),
    relationship: optionalString(40),
  })
  .strict();

const StaffSchema = z
  .object({
    firstName: requiredString(120),
    lastName: requiredString(120),
    nickname: optionalString(120),
    email: optionalEmail(),
    phone: requiredString(60),
    phoneCountryCode: optionalString(8),
    phoneDialCode: optionalString(8),
    idNumber: optionalString(120),
    passportNumber: optionalString(120),
    nationality: optionalString(80),
    dateOfBirth: optionalDateString(),
    maritalStatus: optionalBoolean(),
    position: partialEnum(STAFF_POSITIONS),
    department: partialEnum(STAFF_DEPARTMENTS),
    employmentType: partialEnum(EMPLOYMENT_TYPES),
    startDate: optionalDateString(),
    endDate: optionalDateString(),
    salary: optionalNumber(),
    salaryFrequency: partialEnum(SALARY_FREQUENCIES),
    currency: optionalString(8),
    numberOfDaySalary: optionalNumber(true),
    serviceCharge: optionalNumber(),
    totalIncome: optionalNumber(),
    totalNetIncome: optionalNumber(),
    otherDeductions: optionalNumber(),
    hasAccommodation: optionalBoolean(),
    hasTransport: optionalBoolean(),
    hasHealthInsurance: optionalBoolean(),
    hasWorkInsurance: optionalBoolean(),
    foodAllowance: optionalBoolean(),
    transportation: optionalString(160),
    emergencyContacts: z.array(EmergencyContactSchema).optional(),
    notes: optionalRichText(),
  })
  .strict();

const Step7SchemaBase = z
  .object({
    staff: z.array(StaffSchema).optional(),
    skipped: optionalBoolean(),
  })
  .strict();

const FacilitySchema = z
  .object({
    category: requiredString(120),
    subcategory: optionalString(120),
    itemName: requiredString(200),
    isAvailable: optionalBoolean(),
    quantity: optionalNumber(true),
    condition: optionalString(40),
    notes: optionalRichText(),
    specifications: optionalRichText(),
    photoUrl: optionalUrl(),
    productLink: optionalUrl(),
    checkedBy: optionalString(160),
    lastCheckedAt: optionalDateString(),
    photoData: optionalString(),
    photoMimeType: optionalString(80),
    photoSize: optionalNumber(),
    databaseId: optionalString(120),
    id: optionalString(120),
    _fromDatabase: optionalBoolean(),
  })
  .strict();

const Step8SchemaBase = z
  .object({
    facilities: z.array(FacilitySchema).optional(),
    skipped: optionalBoolean(),
  })
  .strict();

const PhotoSchema = z
  .object({
    id: optionalString(160),
    url: optionalUrl(),
    caption: optionalString(400),
    category: optionalString(120),
    subcategory: optionalString(120),
    isMain: optionalBoolean(),
    order: optionalNumber(true),
    filename: optionalString(260),
    originalName: optionalString(260),
    mimeType: optionalString(160),
    size: optionalNumber(),
    sharePointFileId: optionalString(200),
    sharePointPath: optionalString(400),
    fileUrl: optionalUrl(),
    thumbnailUrl: optionalUrl(),
    altText: optionalString(260),
    sortOrder: optionalNumber(true),
    uploaded: optionalBoolean(),
  })
  .strict();

const BedroomSchema = z
  .object({
    name: optionalString(160),
    size: optionalString(160),
    bedConfiguration: optionalStringArray(),
    amenities: optionalStringArray(),
    id: optionalString(160),
    bedType: optionalString(160),
    bedCount: optionalNumber(true),
    hasEnsuite: optionalBoolean(),
    hasAircon: optionalBoolean(),
    photos: z.array(PhotoSchema).optional(),
  })
  .strict();

const Step9SchemaBase = z
  .object({
    photos: z.array(PhotoSchema).optional(),
    bedrooms: z.array(BedroomSchema).optional(),
    skipped: optionalBoolean(),
  })
  .strict();

const Step10SchemaBase = z
  .object({
    reviewNotes: optionalRichText(),
    agreedToTerms: optionalBoolean(),
    dataAccuracyConfirmed: optionalBoolean(),
    skipped: optionalBoolean(),
  })
  .strict();

export const ONBOARDING_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_SCHEMAS = {
  1: Step1SchemaBase,
  2: Step2SchemaBase,
  3: Step3SchemaBase,
  4: Step4SchemaBase,
  5: Step5SchemaBase,
  6: Step6SchemaBase,
  7: Step7SchemaBase,
  8: Step8SchemaBase,
  9: Step9SchemaBase,
  10: Step10SchemaBase,
} as const satisfies Record<OnboardingStep, z.ZodTypeAny>;

export type Step1DTO = z.infer<typeof Step1SchemaBase>;
export type Step2DTO = z.infer<typeof Step2SchemaBase>;
export type Step3DTO = z.infer<typeof Step3SchemaBase>;
export type Step4DTO = z.infer<typeof Step4SchemaBase>;
export type Step5DTO = z.infer<typeof Step5SchemaBase>;
export type Step6DTO = z.infer<typeof Step6SchemaBase>;
export type Step7DTO = z.infer<typeof Step7SchemaBase>;
export type Step8DTO = z.infer<typeof Step8SchemaBase>;
export type Step9DTO = z.infer<typeof Step9SchemaBase>;
export type Step10DTO = z.infer<typeof Step10SchemaBase>;

export type StepDTOMap = {
  1: Step1DTO;
  2: Step2DTO;
  3: Step3DTO;
  4: Step4DTO;
  5: Step5DTO;
  6: Step6DTO;
  7: Step7DTO;
  8: Step8DTO;
  9: Step9DTO;
  10: Step10DTO;
};

type FieldAliasDefinition = {
  aliases?: string[];
};

export const STEP_FIELD_ALIASES: Record<OnboardingStep, Record<string, FieldAliasDefinition>> = {
  1: {
    villaName: { aliases: ['name'] },
    address: { aliases: ['villaAddress'] },
    city: { aliases: ['villaCity'] },
    country: { aliases: ['villaCountry'] },
    zipCode: { aliases: ['villaPostalCode', 'postalCode', 'zip'] },
    latitude: {},
    longitude: {},
    bedrooms: {},
    bathrooms: {},
    maxGuests: {},
    propertySize: { aliases: ['villaArea'] },
    plotSize: { aliases: ['landArea'] },
    yearBuilt: {},
    renovationYear: {},
    propertyType: { aliases: ['type'] },
    villaStyle: {},
    locationType: { aliases: ['location'] },
    description: {},
    shortDescription: {},
    propertyEmail: {},
    propertyWebsite: {},
    googleMapsLink: {},
    googleCoordinates: {},
    oldRatesCardLink: {},
    iCalCalendarLink: {},
    status: {},
    isActive: {},
    tags: {},
    skipped: {},
  },
  2: {
    ownerType: {},
    firstName: { aliases: ['ownerFirstName'] },
    lastName: { aliases: ['ownerLastName'] },
    email: { aliases: ['ownerEmail'] },
    phone: { aliases: ['ownerPhone'] },
    phoneCountryCode: {},
    phoneDialCode: {},
    alternativePhone: {},
    alternativePhoneCountryCode: {},
    alternativePhoneDialCode: {},
    nationality: {},
    passportNumber: {},
    idNumber: { aliases: ['idCard'] },
    address: { aliases: ['ownerAddress'] },
    city: { aliases: ['ownerCity'] },
    country: { aliases: ['ownerCountry'] },
    zipCode: { aliases: ['ownerZipCode'] },
    companyName: {},
    companyAddress: {},
    companyTaxId: {},
    companyVat: {},
    managerName: {},
    managerEmail: {},
    managerPhone: {},
    managerPhoneCountryCode: {},
    managerPhoneDialCode: {},
    preferredLanguage: {},
    communicationPreference: {},
    notes: {},
    propertyEmail: {},
    propertyWebsite: {},
    skipped: {},
  },
  3: {
    contractStartDate: { aliases: ['contractSignatureDate'] },
    contractEndDate: { aliases: ['contractRenewalDate'] },
    contractType: {},
    commissionRate: { aliases: ['serviceCharge'] },
    managementFee: {},
    marketingFee: {},
    paymentTerms: {},
    paymentSchedule: {},
    minimumStayNights: {},
    cancellationPolicy: {},
    checkInTime: {},
    checkOutTime: {},
    insuranceProvider: {},
    insurancePolicyNumber: {},
    insuranceExpiry: {},
    specialTerms: {},
    payoutDay1: {},
    payoutDay2: {},
    dbdNumber: {},
    paymentThroughIPL: {},
    vatPaymentTerms: {},
    vatRegistrationNumber: {},
    skipped: {},
  },
  4: {
    accountHolderName: {},
    bankName: {},
    accountNumber: { aliases: ['bankAccountNumber'] },
    iban: {},
    swiftCode: {},
    branchName: {},
    branchCode: {},
    branchAddress: {},
    bankAddress: {},
    bankCountry: {},
    currency: {},
    accountType: {},
    notes: {},
    isVerified: {},
    routingNumber: {},
    taxId: {},
    skipped: {},
  },
  5: {
    platforms: {},
    skipped: {},
  },
  6: {
    documents: {},
    skipped: {},
  },
  7: {
    staff: {},
    skipped: {},
  },
  8: {
    facilities: {},
    skipped: {},
  },
  9: {
    photos: {},
    bedrooms: {},
    skipped: {},
  },
  10: {
    reviewNotes: {},
    agreedToTerms: {},
    dataAccuracyConfirmed: {},
    skipped: {},
  },
};

type RequiredFieldsMap = {
  [Step in OnboardingStep]?: (keyof StepDTOMap[Step])[];
};

export const REQUIRED_FIELDS_BY_STEP: RequiredFieldsMap = {
  1: ['villaName', 'address', 'city', 'country', 'bedrooms', 'bathrooms', 'maxGuests', 'propertyType'],
  2: ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'country'],
  3: ['contractStartDate', 'contractType', 'commissionRate'],
  4: ['accountHolderName', 'bankName', 'accountNumber'],
};

export const canonicalizeStepData = (
  step: OnboardingStep,
  input: unknown,
): Partial<StepDTOMap[typeof step]> => {
  if (!input || typeof input !== 'object') {
    return {} as Partial<StepDTOMap[typeof step]>;
  }

  const aliases = STEP_FIELD_ALIASES[step] ?? {};
  const output: Record<string, unknown> = {};

  for (const [field, definition] of Object.entries(aliases)) {
    const searchKeys = [field, ...(definition.aliases ?? [])];
    for (const key of searchKeys) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        const value = (input as Record<string, unknown>)[key];
        if (value !== undefined) {
          output[field] = value;
        }
        break;
      }
    }
  }

  // Preserve canonical keys that may not have alias definitions yet
  for (const key of Object.keys(input)) {
    if (aliases[key as keyof typeof aliases] && output[key] === undefined) {
      output[key] = (input as Record<string, unknown>)[key];
    }
  }

  return output as Partial<StepDTOMap[typeof step]>;
};

export const validateStepPayload = <TStep extends OnboardingStep>(
  step: TStep,
  data: unknown,
  completed: boolean,
): StepDTOMap[TStep] => {
  const schema = ONBOARDING_STEP_SCHEMAS[step];
  if (!schema) {
    throw new Error(`Unsupported onboarding step: ${step}`);
  }

  const result = completed ? schema.parse(data) : schema.partial().parse(data);

  if (completed) {
    const required = REQUIRED_FIELDS_BY_STEP[step];
    if (required) {
      for (const field of required) {
        if ((result as Record<string, unknown>)[field as string] === undefined) {
          throw new z.ZodError([
            {
              path: [field as string],
              message: `${String(field)} is required`,
              code: z.ZodIssueCode.custom,
            },
          ]);
        }
      }
    }
  }

  return result as StepDTOMap[TStep];
};

export const safeValidateStepPayload = <TStep extends OnboardingStep>(
  step: TStep,
  data: unknown,
  completed: boolean,
): { success: true; data: StepDTOMap[TStep] } | { success: false; errors: string[] } => {
  try {
    const canonical = canonicalizeStepData(step, data);
    const parsed = validateStepPayload(step, canonical, completed);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((issue) => `${issue.path.join('.') || 'data'}: ${issue.message}`),
      };
    }
    return { success: false, errors: [(error as Error).message] };
  }
};
