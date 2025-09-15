-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('VILLA', 'APARTMENT', 'PENTHOUSE', 'TOWNHOUSE', 'CHALET', 'BUNGALOW', 'ESTATE', 'HOUSE');

-- CreateEnum
CREATE TYPE "VillaStyle" AS ENUM ('MODERN', 'TRADITIONAL', 'MEDITERRANEAN', 'CONTEMPORARY', 'BALINESE', 'MINIMALIST', 'LUXURY', 'RUSTIC');

-- CreateEnum
CREATE TYPE "VillaStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "CommunicationPreference" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('EXCLUSIVE', 'NON_EXCLUSIVE', 'SEASONAL', 'LONG_TERM');

-- CreateEnum
CREATE TYPE "PaymentSchedule" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT', 'SUPER_STRICT', 'NON_REFUNDABLE');

-- CreateEnum
CREATE TYPE "OTAPlatform" AS ENUM ('BOOKING_COM', 'AIRBNB', 'VRBO', 'EXPEDIA', 'AGODA', 'MARRIOTT_HOMES_VILLAS', 'HOMEAWAY', 'FLIPKEY', 'DIRECT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "StaffPosition" AS ENUM ('VILLA_MANAGER', 'HOUSEKEEPER', 'GARDENER', 'POOL_MAINTENANCE', 'SECURITY', 'CHEF', 'DRIVER', 'CONCIERGE', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffDepartment" AS ENUM ('MANAGEMENT', 'HOUSEKEEPING', 'MAINTENANCE', 'SECURITY', 'HOSPITALITY', 'ADMINISTRATION');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'SEASONAL', 'FREELANCE');

-- CreateEnum
CREATE TYPE "EmergencyContactRelationship" AS ENUM ('SPOUSE', 'PARTNER', 'PARENT', 'CHILD', 'SIBLING', 'FRIEND', 'COLLEAGUE', 'NEIGHBOR', 'RELATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "SalaryFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('EXTERIOR_VIEWS', 'INTERIOR_LIVING_SPACES', 'BEDROOMS', 'BATHROOMS', 'KITCHEN', 'DINING_AREAS', 'POOL_OUTDOOR_AREAS', 'GARDEN_LANDSCAPING', 'AMENITIES_FACILITIES', 'VIEWS_SURROUNDINGS', 'STAFF_AREAS', 'UTILITY_AREAS', 'LOGO', 'FLOOR_PLAN', 'VIDEOS', 'DRONE_SHOTS', 'ENTERTAINMENT', 'VIRTUAL_TOUR', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PROPERTY_CONTRACT', 'INSURANCE_CERTIFICATE', 'PROPERTY_TITLE', 'TAX_DOCUMENTS', 'UTILITY_BILLS', 'MAINTENANCE_RECORDS', 'INVENTORY_LIST', 'HOUSE_RULES', 'EMERGENCY_CONTACTS', 'STAFF_CONTRACTS', 'LICENSES_PERMITS', 'FLOOR_PLANS', 'OTHER', 'MAINTENANCE_CONTRACTS');

-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('PROPERTY_MANAGEMENT', 'OWNER_SERVICE', 'STAFF_EMPLOYMENT', 'MAINTENANCE_SERVICE', 'MARKETING', 'PARTNERSHIP', 'VENDOR_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'SENT', 'NEGOTIATING', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FacilityCategory" AS ENUM ('property_layout_spaces', 'occupancy_sleeping', 'bathrooms', 'kitchen_dining', 'service_staff', 'living_spaces', 'outdoor_facilities', 'home_office', 'entertainment_gaming', 'technology', 'wellness_spa', 'accessibility', 'safety_security', 'child_friendly', 'KITCHEN_EQUIPMENT', 'BATHROOM_AMENITIES', 'BEDROOM_AMENITIES', 'LIVING_ROOM', 'OUTDOOR_FACILITIES', 'POOL_AREA', 'ENTERTAINMENT', 'SAFETY_SECURITY', 'UTILITIES', 'ACCESSIBILITY', 'BUSINESS_FACILITIES', 'CHILDREN_FACILITIES', 'PET_FACILITIES', 'OTHER');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED', 'ERROR');

-- CreateEnum
CREATE TYPE "FieldStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "SkippedItemType" AS ENUM ('STEP', 'FIELD', 'SECTION');

-- CreateEnum
CREATE TYPE "SkipCategory" AS ENUM ('NOT_APPLICABLE', 'DATA_UNAVAILABLE', 'LATER', 'OPTIONAL', 'PRIVACY_CONCERNS', 'OTHER');

-- CreateTable
CREATE TABLE "Villa" (
    "id" TEXT NOT NULL,
    "villaCode" TEXT NOT NULL,
    "villaName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "maxGuests" INTEGER NOT NULL,
    "propertySize" DOUBLE PRECISION,
    "plotSize" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "renovationYear" INTEGER,
    "propertyType" "PropertyType" NOT NULL,
    "villaStyle" "VillaStyle",
    "description" TEXT,
    "shortDescription" TEXT,
    "status" "VillaStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentsPath" TEXT,
    "photosPath" TEXT,
    "sharePointPath" TEXT,
    "googleMapsLink" TEXT,
    "iCalCalendarLink" TEXT,
    "oldRatesCardLink" TEXT,
    "propertyEmail" TEXT,
    "propertyWebsite" TEXT,

    CONSTRAINT "Villa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "alternativePhone" TEXT,
    "nationality" TEXT,
    "passportNumber" TEXT,
    "idNumber" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "zipCode" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "communicationPreference" "CommunicationPreference" NOT NULL DEFAULT 'EMAIL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "alternativePhoneCountryCode" TEXT,
    "alternativePhoneDialCode" TEXT,
    "phoneCountryCode" TEXT,
    "phoneDialCode" TEXT,
    "companyAddress" TEXT,
    "companyName" TEXT,
    "companyTaxId" TEXT,
    "companyVat" TEXT,
    "managerEmail" TEXT,
    "managerName" TEXT,
    "managerPhone" TEXT,
    "managerPhoneCountryCode" TEXT,
    "managerPhoneDialCode" TEXT,
    "ownerType" "OwnerType" NOT NULL DEFAULT 'INDIVIDUAL',
    "propertyEmail" TEXT,
    "propertyWebsite" TEXT,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractualDetails" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "contractEndDate" TIMESTAMP(3),
    "contractType" "ContractType" NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "managementFee" DECIMAL(5,2),
    "marketingFee" DECIMAL(5,2),
    "paymentTerms" TEXT,
    "paymentSchedule" "PaymentSchedule" NOT NULL DEFAULT 'MONTHLY',
    "minimumStayNights" INTEGER NOT NULL DEFAULT 1,
    "cancellationPolicy" "CancellationPolicy" NOT NULL DEFAULT 'MODERATE',
    "checkInTime" TEXT NOT NULL DEFAULT '15:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "specialTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "payoutDay1" INTEGER,
    "payoutDay2" INTEGER,
    "dbdNumber" TEXT,
    "paymentThroughIPL" BOOLEAN NOT NULL DEFAULT false,
    "vatPaymentTerms" TEXT,
    "vatRegistrationNumber" TEXT,

    CONSTRAINT "ContractualDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetails" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "accountHolderName" VARCHAR(200) NOT NULL,
    "bankName" VARCHAR(200) NOT NULL,
    "accountNumber" VARCHAR(50) NOT NULL,
    "iban" VARCHAR(34),
    "swiftCode" VARCHAR(11),
    "branchCode" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "bankAddress" TEXT,
    "bankCountry" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "branchName" VARCHAR(200),
    "branchAddress" TEXT,
    "accountType" TEXT DEFAULT 'CHECKING',

    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTACredentials" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "platform" "OTAPlatform" NOT NULL,
    "propertyId" TEXT,
    "username" TEXT,
    "password" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountUrl" TEXT,
    "propertyUrl" TEXT,
    "listingUrl" TEXT,

    CONSTRAINT "OTACredentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "idNumber" TEXT,
    "nationality" TEXT,
    "position" "StaffPosition" NOT NULL,
    "department" "StaffDepartment" NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "salary" DECIMAL(10,2) NOT NULL,
    "salaryFrequency" "SalaryFrequency" NOT NULL DEFAULT 'MONTHLY',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "hasAccommodation" BOOLEAN NOT NULL DEFAULT false,
    "hasTransport" BOOLEAN NOT NULL DEFAULT false,
    "hasHealthInsurance" BOOLEAN NOT NULL DEFAULT false,
    "hasWorkInsurance" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "emergencyContacts" JSONB,
    "foodAllowance" BOOLEAN NOT NULL DEFAULT false,
    "maritalStatus" BOOLEAN,
    "nickname" TEXT,
    "numberOfDaySalary" INTEGER,
    "otherDeductions" DECIMAL(65,30),
    "serviceCharge" DECIMAL(65,30),
    "totalIncome" DECIMAL(65,30),
    "totalNetIncome" DECIMAL(65,30),
    "transportation" TEXT,
    "passportNumber" TEXT,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "category" "PhotoCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "caption" TEXT,
    "altText" TEXT,
    "tags" TEXT[],
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "subfolder" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sharePointFileId" TEXT,
    "sharePointPath" TEXT,
    "sharePointUrl" TEXT,
    "fileContent" BYTEA,
    "thumbnailContent" BYTEA,
    "isCompressed" BOOLEAN NOT NULL DEFAULT false,
    "originalFileSize" INTEGER,
    "storageLocation" TEXT NOT NULL DEFAULT 'database',

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "sharePointFileId" TEXT,
    "sharePointPath" TEXT,
    "sharePointUrl" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "fileContent" BYTEA,
    "isCompressed" BOOLEAN NOT NULL DEFAULT false,
    "originalFileSize" INTEGER,
    "storageLocation" TEXT NOT NULL DEFAULT 'database',

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityChecklist" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "category" "FacilityCategory" NOT NULL,
    "subcategory" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER DEFAULT 1,
    "condition" TEXT DEFAULT 'good',
    "notes" TEXT,
    "specifications" TEXT,
    "photoUrl" TEXT,
    "photoData" BYTEA,
    "photoMimeType" TEXT,
    "photoSize" INTEGER,
    "photoWidth" INTEGER,
    "photoHeight" INTEGER,
    "productLink" TEXT,
    "lastCheckedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "checkedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 10,
    "villaInfoCompleted" BOOLEAN NOT NULL DEFAULT false,
    "ownerDetailsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "contractualDetailsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "bankDetailsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "otaCredentialsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "staffConfigCompleted" BOOLEAN NOT NULL DEFAULT false,
    "facilitiesCompleted" BOOLEAN NOT NULL DEFAULT false,
    "photosUploaded" BOOLEAN NOT NULL DEFAULT false,
    "documentsUploaded" BOOLEAN NOT NULL DEFAULT false,
    "reviewCompleted" BOOLEAN NOT NULL DEFAULT false,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "submittedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingBackup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "villaId" TEXT,
    "currentStep" INTEGER NOT NULL,
    "stepData" JSONB NOT NULL,
    "lastSaved" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "autoSaveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastAutoSave" TIMESTAMP(3),

    CONSTRAINT "OnboardingBackup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStepProgress" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationErrors" JSONB,
    "dependsOnSteps" INTEGER[],
    "estimatedDuration" INTEGER,
    "actualDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingStepProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepFieldProgress" (
    "id" TEXT NOT NULL,
    "stepProgressId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldLabel" TEXT,
    "fieldType" TEXT NOT NULL,
    "status" "FieldStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "skipReason" TEXT,
    "value" JSONB,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "lastModifiedAt" TIMESTAMP(3) NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "dependsOnFields" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepFieldProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkippedItem" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "itemType" "SkippedItemType" NOT NULL,
    "stepNumber" INTEGER,
    "fieldName" TEXT,
    "sectionName" TEXT,
    "skipReason" TEXT,
    "skipCategory" "SkipCategory" NOT NULL,
    "skippedBy" TEXT NOT NULL,
    "skippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unskippedAt" TIMESTAMP(3),
    "unskippedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkippedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT,
    "sessionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionEndedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 10,
    "stepsCompleted" INTEGER NOT NULL DEFAULT 0,
    "stepsSkipped" INTEGER NOT NULL DEFAULT 0,
    "fieldsCompleted" INTEGER NOT NULL DEFAULT 0,
    "fieldsSkipped" INTEGER NOT NULL DEFAULT 0,
    "totalFields" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "submittedForReview" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "totalTimeSpent" INTEGER,
    "averageStepTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "agreementType" "AgreementType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT,
    "templateId" TEXT,
    "templateVersion" TEXT,
    "createdBy" TEXT NOT NULL,
    "signedBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "isAutoRenewal" BOOLEAN NOT NULL DEFAULT false,
    "renewalPeriod" INTEGER,
    "notes" TEXT,
    "documentUrl" TEXT,
    "sharePointFileId" TEXT,
    "sharePointPath" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Villa_villaCode_key" ON "Villa"("villaCode");

-- CreateIndex
CREATE INDEX "Villa_villaCode_idx" ON "Villa"("villaCode");

-- CreateIndex
CREATE INDEX "Villa_status_idx" ON "Villa"("status");

-- CreateIndex
CREATE INDEX "Villa_isActive_idx" ON "Villa"("isActive");

-- CreateIndex
CREATE INDEX "Villa_city_country_idx" ON "Villa"("city", "country");

-- CreateIndex
CREATE INDEX "Villa_propertyType_status_idx" ON "Villa"("propertyType", "status");

-- CreateIndex
CREATE INDEX "Villa_bedrooms_bathrooms_maxGuests_idx" ON "Villa"("bedrooms", "bathrooms", "maxGuests");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_villaId_key" ON "Owner"("villaId");

-- CreateIndex
CREATE INDEX "Owner_email_idx" ON "Owner"("email");

-- CreateIndex
CREATE INDEX "Owner_villaId_firstName_lastName_idx" ON "Owner"("villaId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "Owner_nationality_idx" ON "Owner"("nationality");

-- CreateIndex
CREATE UNIQUE INDEX "ContractualDetails_villaId_key" ON "ContractualDetails"("villaId");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_villaId_key" ON "BankDetails"("villaId");

-- CreateIndex
CREATE INDEX "OTACredentials_platform_idx" ON "OTACredentials"("platform");

-- CreateIndex
CREATE INDEX "OTACredentials_syncStatus_idx" ON "OTACredentials"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "OTACredentials_villaId_platform_key" ON "OTACredentials"("villaId", "platform");

-- CreateIndex
CREATE INDEX "Staff_villaId_idx" ON "Staff"("villaId");

-- CreateIndex
CREATE INDEX "Staff_position_idx" ON "Staff"("position");

-- CreateIndex
CREATE INDEX "Staff_villaId_isActive_idx" ON "Staff"("villaId", "isActive");

-- CreateIndex
CREATE INDEX "Staff_position_department_idx" ON "Staff"("position", "department");

-- CreateIndex
CREATE INDEX "Photo_villaId_category_idx" ON "Photo"("villaId", "category");

-- CreateIndex
CREATE INDEX "Photo_villaId_subfolder_idx" ON "Photo"("villaId", "subfolder");

-- CreateIndex
CREATE INDEX "Photo_isMain_idx" ON "Photo"("isMain");

-- CreateIndex
CREATE INDEX "Document_villaId_documentType_idx" ON "Document"("villaId", "documentType");

-- CreateIndex
CREATE INDEX "Document_validUntil_idx" ON "Document"("validUntil");

-- CreateIndex
CREATE INDEX "FacilityChecklist_villaId_category_idx" ON "FacilityChecklist"("villaId", "category");

-- CreateIndex
CREATE INDEX "FacilityChecklist_villaId_isAvailable_idx" ON "FacilityChecklist"("villaId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityChecklist_villaId_category_subcategory_itemName_key" ON "FacilityChecklist"("villaId", "category", "subcategory", "itemName");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_villaId_key" ON "OnboardingProgress"("villaId");

-- CreateIndex
CREATE INDEX "OnboardingProgress_status_currentStep_idx" ON "OnboardingProgress"("status", "currentStep");

-- CreateIndex
CREATE INDEX "OnboardingProgress_villaId_status_idx" ON "OnboardingProgress"("villaId", "status");

-- CreateIndex
CREATE INDEX "OnboardingProgress_updatedAt_idx" ON "OnboardingProgress"("updatedAt");

-- CreateIndex
CREATE INDEX "OnboardingProgress_submittedAt_idx" ON "OnboardingProgress"("submittedAt");

-- CreateIndex
CREATE INDEX "OnboardingBackup_userId_villaId_idx" ON "OnboardingBackup"("userId", "villaId");

-- CreateIndex
CREATE INDEX "OnboardingBackup_lastSaved_idx" ON "OnboardingBackup"("lastSaved");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingBackup_userId_sessionId_key" ON "OnboardingBackup"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "OnboardingStepProgress_villaId_status_idx" ON "OnboardingStepProgress"("villaId", "status");

-- CreateIndex
CREATE INDEX "OnboardingStepProgress_stepNumber_idx" ON "OnboardingStepProgress"("stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStepProgress_villaId_stepNumber_key" ON "OnboardingStepProgress"("villaId", "stepNumber");

-- CreateIndex
CREATE INDEX "StepFieldProgress_stepProgressId_status_idx" ON "StepFieldProgress"("stepProgressId", "status");

-- CreateIndex
CREATE INDEX "StepFieldProgress_isSkipped_idx" ON "StepFieldProgress"("isSkipped");

-- CreateIndex
CREATE UNIQUE INDEX "StepFieldProgress_stepProgressId_fieldName_key" ON "StepFieldProgress"("stepProgressId", "fieldName");

-- CreateIndex
CREATE INDEX "SkippedItem_villaId_itemType_idx" ON "SkippedItem"("villaId", "itemType");

-- CreateIndex
CREATE INDEX "SkippedItem_villaId_stepNumber_idx" ON "SkippedItem"("villaId", "stepNumber");

-- CreateIndex
CREATE INDEX "SkippedItem_isActive_idx" ON "SkippedItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingSession_villaId_key" ON "OnboardingSession"("villaId");

-- CreateIndex
CREATE INDEX "OnboardingSession_userId_idx" ON "OnboardingSession"("userId");

-- CreateIndex
CREATE INDEX "OnboardingSession_isCompleted_idx" ON "OnboardingSession"("isCompleted");

-- CreateIndex
CREATE INDEX "Agreement_villaId_agreementType_idx" ON "Agreement"("villaId", "agreementType");

-- CreateIndex
CREATE INDEX "Agreement_status_idx" ON "Agreement"("status");

-- CreateIndex
CREATE INDEX "Agreement_expiresAt_idx" ON "Agreement"("expiresAt");

-- CreateIndex
CREATE INDEX "Agreement_createdBy_idx" ON "Agreement"("createdBy");

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractualDetails" ADD CONSTRAINT "ContractualDetails_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTACredentials" ADD CONSTRAINT "OTACredentials_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityChecklist" ADD CONSTRAINT "FacilityChecklist_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingBackup" ADD CONSTRAINT "OnboardingBackup_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStepProgress" ADD CONSTRAINT "OnboardingStepProgress_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepFieldProgress" ADD CONSTRAINT "StepFieldProgress_stepProgressId_fkey" FOREIGN KEY ("stepProgressId") REFERENCES "OnboardingStepProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkippedItem" ADD CONSTRAINT "SkippedItem_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

