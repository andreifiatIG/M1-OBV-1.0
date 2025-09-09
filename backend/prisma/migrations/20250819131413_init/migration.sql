-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('VILLA', 'APARTMENT', 'PENTHOUSE', 'TOWNHOUSE', 'CHALET', 'BUNGALOW', 'ESTATE');

-- CreateEnum
CREATE TYPE "VillaStyle" AS ENUM ('MODERN', 'TRADITIONAL', 'MEDITERRANEAN', 'CONTEMPORARY', 'BALINESE', 'MINIMALIST', 'LUXURY', 'RUSTIC');

-- CreateEnum
CREATE TYPE "VillaStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommunicationPreference" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('EXCLUSIVE', 'NON_EXCLUSIVE', 'SEASONAL', 'LONG_TERM');

-- CreateEnum
CREATE TYPE "PaymentSchedule" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT', 'SUPER_STRICT', 'NON_REFUNDABLE');

-- CreateEnum
CREATE TYPE "OTAPlatform" AS ENUM ('BOOKING_COM', 'AIRBNB', 'VRBO', 'EXPEDIA', 'AGODA', 'HOTELS_COM', 'TRIPADVISOR', 'HOMEAWAY', 'FLIPKEY', 'DIRECT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "StaffPosition" AS ENUM ('VILLA_MANAGER', 'HOUSEKEEPER', 'GARDENER', 'POOL_MAINTENANCE', 'SECURITY', 'CHEF', 'DRIVER', 'CONCIERGE', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffDepartment" AS ENUM ('MANAGEMENT', 'HOUSEKEEPING', 'MAINTENANCE', 'SECURITY', 'HOSPITALITY', 'ADMINISTRATION');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'SEASONAL', 'FREELANCE');

-- CreateEnum
CREATE TYPE "SalaryFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('EXTERIOR_VIEWS', 'INTERIOR_LIVING_SPACES', 'BEDROOMS', 'BATHROOMS', 'KITCHEN', 'DINING_AREAS', 'POOL_OUTDOOR_AREAS', 'GARDEN_LANDSCAPING', 'AMENITIES_FACILITIES', 'VIEWS_SURROUNDINGS', 'STAFF_AREAS', 'UTILITY_AREAS', 'LOGO', 'FLOOR_PLAN', 'VIDEOS', 'DRONE_SHOTS', 'VIRTUAL_TOUR', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PROPERTY_CONTRACT', 'INSURANCE_CERTIFICATE', 'PROPERTY_TITLE', 'TAX_DOCUMENTS', 'UTILITY_BILLS', 'MAINTENANCE_RECORDS', 'INVENTORY_LIST', 'HOUSE_RULES', 'EMERGENCY_CONTACTS', 'STAFF_CONTRACTS', 'LICENSES_PERMITS', 'FLOOR_PLANS', 'OTHER');

-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('PROPERTY_MANAGEMENT', 'OWNER_SERVICE', 'STAFF_EMPLOYMENT', 'MAINTENANCE_SERVICE', 'MARKETING', 'PARTNERSHIP', 'VENDOR_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'SENT', 'NEGOTIATING', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FacilityCategory" AS ENUM ('KITCHEN_EQUIPMENT', 'BATHROOM_AMENITIES', 'BEDROOM_AMENITIES', 'LIVING_ROOM', 'OUTDOOR_FACILITIES', 'POOL_AREA', 'ENTERTAINMENT', 'SAFETY_SECURITY', 'UTILITIES', 'ACCESSIBILITY', 'BUSINESS_FACILITIES', 'CHILDREN_FACILITIES', 'PET_FACILITIES', 'OTHER');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');

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
    "tags" TEXT[],
    "status" "VillaStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Villa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
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

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractualDetails" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "contractEndDate" TIMESTAMP(3),
    "contractType" "ContractType" NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "managementFee" DOUBLE PRECISION,
    "marketingFee" DOUBLE PRECISION,
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

    CONSTRAINT "ContractualDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetails" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "iban" TEXT,
    "swiftCode" TEXT,
    "branchCode" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "bankAddress" TEXT,
    "bankCountry" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "salary" DOUBLE PRECISION NOT NULL,
    "salaryFrequency" "SalaryFrequency" NOT NULL DEFAULT 'MONTHLY',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "hasAccommodation" BOOLEAN NOT NULL DEFAULT false,
    "hasMeals" BOOLEAN NOT NULL DEFAULT false,
    "hasTransport" BOOLEAN NOT NULL DEFAULT false,
    "hasHealthInsurance" BOOLEAN NOT NULL DEFAULT false,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "sharepointId" TEXT,
    "sharepointPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "sharepointId" TEXT,
    "sharepointPath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "agreementType" "AgreementType" NOT NULL,
    "agreementNumber" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "partyEmail" TEXT,
    "partyPhone" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "value" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "documentUrl" TEXT,
    "signedDocumentUrl" TEXT,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityChecklist" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "category" "FacilityCategory" NOT NULL,
    "subcategory" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER,
    "condition" TEXT,
    "notes" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
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
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvalNotes" TEXT,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Owner_villaId_key" ON "Owner"("villaId");

-- CreateIndex
CREATE INDEX "Owner_email_idx" ON "Owner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ContractualDetails_villaId_key" ON "ContractualDetails"("villaId");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_villaId_key" ON "BankDetails"("villaId");

-- CreateIndex
CREATE INDEX "OTACredentials_platform_idx" ON "OTACredentials"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "OTACredentials_villaId_platform_key" ON "OTACredentials"("villaId", "platform");

-- CreateIndex
CREATE INDEX "Staff_villaId_idx" ON "Staff"("villaId");

-- CreateIndex
CREATE INDEX "Staff_position_idx" ON "Staff"("position");

-- CreateIndex
CREATE INDEX "Photo_villaId_category_idx" ON "Photo"("villaId", "category");

-- CreateIndex
CREATE INDEX "Photo_isMain_idx" ON "Photo"("isMain");

-- CreateIndex
CREATE INDEX "Document_villaId_documentType_idx" ON "Document"("villaId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_agreementNumber_key" ON "Agreement"("agreementNumber");

-- CreateIndex
CREATE INDEX "Agreement_villaId_agreementType_idx" ON "Agreement"("villaId", "agreementType");

-- CreateIndex
CREATE INDEX "Agreement_status_idx" ON "Agreement"("status");

-- CreateIndex
CREATE INDEX "FacilityChecklist_villaId_category_idx" ON "FacilityChecklist"("villaId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityChecklist_villaId_category_subcategory_itemName_key" ON "FacilityChecklist"("villaId", "category", "subcategory", "itemName");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_villaId_key" ON "OnboardingProgress"("villaId");

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
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityChecklist" ADD CONSTRAINT "FacilityChecklist_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
