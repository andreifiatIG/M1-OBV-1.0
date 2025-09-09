-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED', 'ERROR');

-- CreateEnum
CREATE TYPE "FieldStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "SkippedItemType" AS ENUM ('STEP', 'FIELD', 'SECTION');

-- CreateEnum
CREATE TYPE "SkipCategory" AS ENUM ('NOT_APPLICABLE', 'DATA_UNAVAILABLE', 'LATER', 'OPTIONAL', 'PRIVACY_CONCERNS', 'OTHER');

-- AlterTable
ALTER TABLE "ContractualDetails" ADD COLUMN     "payoutDay1" INTEGER,
ADD COLUMN     "payoutDay2" INTEGER;

-- AlterTable
ALTER TABLE "OTACredentials" ADD COLUMN     "accountUrl" TEXT,
ADD COLUMN     "propertyUrl" TEXT;

-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "alternativePhoneCountryCode" TEXT,
ADD COLUMN     "alternativePhoneDialCode" TEXT,
ADD COLUMN     "phoneCountryCode" TEXT,
ADD COLUMN     "phoneDialCode" TEXT;

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

-- AddForeignKey
ALTER TABLE "OnboardingStepProgress" ADD CONSTRAINT "OnboardingStepProgress_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepFieldProgress" ADD CONSTRAINT "StepFieldProgress_stepProgressId_fkey" FOREIGN KEY ("stepProgressId") REFERENCES "OnboardingStepProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkippedItem" ADD CONSTRAINT "SkippedItem_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
