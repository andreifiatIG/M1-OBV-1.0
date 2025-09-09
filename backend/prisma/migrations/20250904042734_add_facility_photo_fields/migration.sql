/*
  Warnings:

  - You are about to alter the column `accountHolderName` on the `BankDetails` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `bankName` on the `BankDetails` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `accountNumber` on the `BankDetails` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `iban` on the `BankDetails` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(34)`.
  - You are about to alter the column `swiftCode` on the `BankDetails` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(11)`.
  - You are about to alter the column `commissionRate` on the `ContractualDetails` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to alter the column `managementFee` on the `ContractualDetails` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to alter the column `marketingFee` on the `ContractualDetails` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to alter the column `firstName` on the `Owner` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `lastName` on the `Owner` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `email` on the `Owner` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `phone` on the `Owner` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the column `emergencyContact` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyPhone` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `hasMeals` on the `Staff` table. All the data in the column will be lost.
  - You are about to alter the column `salary` on the `Staff` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `currency` on the `Staff` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.

*/
-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "EmergencyContactRelationship" AS ENUM ('SPOUSE', 'PARTNER', 'PARENT', 'CHILD', 'SIBLING', 'FRIEND', 'COLLEAGUE', 'NEIGHBOR', 'RELATIVE', 'OTHER');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'MAINTENANCE_CONTRACTS';

-- AlterEnum
ALTER TYPE "PropertyType" ADD VALUE 'HOUSE';

-- AlterTable
ALTER TABLE "BankDetails" ALTER COLUMN "accountHolderName" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "bankName" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "accountNumber" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "iban" SET DATA TYPE VARCHAR(34),
ALTER COLUMN "swiftCode" SET DATA TYPE VARCHAR(11);

-- AlterTable
ALTER TABLE "ContractualDetails" ADD COLUMN     "dbdNumber" TEXT,
ADD COLUMN     "paymentThroughIPL" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vatPaymentTerms" TEXT,
ADD COLUMN     "vatRegistrationNumber" TEXT,
ALTER COLUMN "commissionRate" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "managementFee" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "marketingFee" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "FacilityChecklist" ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "productLink" TEXT,
ADD COLUMN     "specifications" TEXT;

-- AlterTable
ALTER TABLE "OTACredentials" ADD COLUMN     "listingUrl" TEXT;

-- AlterTable
ALTER TABLE "OnboardingProgress" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectionNotes" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyTaxId" TEXT,
ADD COLUMN     "companyVat" TEXT,
ADD COLUMN     "managerEmail" TEXT,
ADD COLUMN     "managerName" TEXT,
ADD COLUMN     "managerPhone" TEXT,
ADD COLUMN     "managerPhoneCountryCode" TEXT,
ADD COLUMN     "managerPhoneDialCode" TEXT,
ADD COLUMN     "ownerType" "OwnerType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "propertyEmail" TEXT,
ADD COLUMN     "propertyWebsite" TEXT,
ALTER COLUMN "firstName" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "lastName" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "Staff" DROP COLUMN "emergencyContact",
DROP COLUMN "emergencyPhone",
DROP COLUMN "hasMeals",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContacts" JSONB,
ADD COLUMN     "foodAllowance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasWorkInsurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maritalStatus" BOOLEAN,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "numberOfDaySalary" INTEGER,
ADD COLUMN     "otherDeductions" DECIMAL(65,30),
ADD COLUMN     "passportNumber" TEXT,
ADD COLUMN     "serviceCharge" DECIMAL(65,30),
ADD COLUMN     "totalIncome" DECIMAL(65,30),
ADD COLUMN     "totalNetIncome" DECIMAL(65,30),
ADD COLUMN     "transportation" TEXT,
ALTER COLUMN "salary" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "Villa" ADD COLUMN     "googleMapsLink" TEXT,
ADD COLUMN     "iCalCalendarLink" TEXT,
ADD COLUMN     "oldRatesCardLink" TEXT;

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
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT,
    "actionType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingBackup_userId_villaId_idx" ON "OnboardingBackup"("userId", "villaId");

-- CreateIndex
CREATE INDEX "OnboardingBackup_lastSaved_idx" ON "OnboardingBackup"("lastSaved");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingBackup_userId_sessionId_key" ON "OnboardingBackup"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "AdminAction_adminId_idx" ON "AdminAction"("adminId");

-- CreateIndex
CREATE INDEX "AdminAction_targetId_targetType_idx" ON "AdminAction"("targetId", "targetType");

-- CreateIndex
CREATE INDEX "AdminAction_actionType_idx" ON "AdminAction"("actionType");

-- CreateIndex
CREATE INDEX "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");

-- CreateIndex
CREATE INDEX "OnboardingProgress_status_submittedAt_idx" ON "OnboardingProgress"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "OnboardingProgress_status_currentStep_idx" ON "OnboardingProgress"("status", "currentStep");

-- CreateIndex
CREATE INDEX "OnboardingProgress_villaId_status_idx" ON "OnboardingProgress"("villaId", "status");

-- CreateIndex
CREATE INDEX "OnboardingProgress_updatedAt_idx" ON "OnboardingProgress"("updatedAt");

-- CreateIndex
CREATE INDEX "Owner_villaId_firstName_lastName_idx" ON "Owner"("villaId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "Owner_nationality_idx" ON "Owner"("nationality");

-- CreateIndex
CREATE INDEX "Staff_villaId_isActive_idx" ON "Staff"("villaId", "isActive");

-- CreateIndex
CREATE INDEX "Staff_position_department_idx" ON "Staff"("position", "department");

-- CreateIndex
CREATE INDEX "Villa_city_country_idx" ON "Villa"("city", "country");

-- CreateIndex
CREATE INDEX "Villa_propertyType_status_idx" ON "Villa"("propertyType", "status");

-- CreateIndex
CREATE INDEX "Villa_bedrooms_bathrooms_maxGuests_idx" ON "Villa"("bedrooms", "bathrooms", "maxGuests");

-- AddForeignKey
ALTER TABLE "OnboardingBackup" ADD CONSTRAINT "OnboardingBackup_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
