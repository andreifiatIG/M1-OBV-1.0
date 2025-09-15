-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OTAPlatform" ADD VALUE 'HOTELS_COM';
ALTER TYPE "OTAPlatform" ADD VALUE 'TRIPADVISOR';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "fileContent" BYTEA,
ADD COLUMN     "isCompressed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalFileSize" INTEGER,
ADD COLUMN     "sharePointUrl" TEXT,
ADD COLUMN     "storageLocation" TEXT NOT NULL DEFAULT 'database',
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FacilityChecklist" ADD COLUMN     "photoData" BYTEA,
ADD COLUMN     "photoHeight" INTEGER,
ADD COLUMN     "photoMimeType" TEXT,
ADD COLUMN     "photoSize" INTEGER,
ADD COLUMN     "photoWidth" INTEGER,
ALTER COLUMN "quantity" SET DEFAULT 1,
ALTER COLUMN "condition" SET DEFAULT 'good',
ALTER COLUMN "lastCheckedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "OTACredentials" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "OnboardingProgress" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionNotes" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "fileContent" BYTEA,
ADD COLUMN     "isCompressed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalFileSize" INTEGER,
ADD COLUMN     "sharePointUrl" TEXT,
ADD COLUMN     "storageLocation" TEXT NOT NULL DEFAULT 'database',
ADD COLUMN     "thumbnailContent" BYTEA;

-- AlterTable
ALTER TABLE "Villa" ADD COLUMN     "locationType" TEXT;

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
CREATE INDEX "SkippedItem_villaId_itemType_idx" ON "SkippedItem"("villaId", "itemType");

-- CreateIndex
CREATE INDEX "SkippedItem_villaId_stepNumber_idx" ON "SkippedItem"("villaId", "stepNumber");

-- CreateIndex
CREATE INDEX "SkippedItem_isActive_idx" ON "SkippedItem"("isActive");

-- CreateIndex
CREATE INDEX "Agreement_villaId_agreementType_idx" ON "Agreement"("villaId", "agreementType");

-- CreateIndex
CREATE INDEX "Agreement_status_idx" ON "Agreement"("status");

-- CreateIndex
CREATE INDEX "Agreement_expiresAt_idx" ON "Agreement"("expiresAt");

-- CreateIndex
CREATE INDEX "Agreement_createdBy_idx" ON "Agreement"("createdBy");

-- CreateIndex
CREATE INDEX "Document_validUntil_idx" ON "Document"("validUntil");

-- CreateIndex
CREATE INDEX "FacilityChecklist_villaId_isAvailable_idx" ON "FacilityChecklist"("villaId", "isAvailable");

-- CreateIndex
CREATE INDEX "OTACredentials_syncStatus_idx" ON "OTACredentials"("syncStatus");

-- CreateIndex
CREATE INDEX "OnboardingProgress_submittedAt_idx" ON "OnboardingProgress"("submittedAt");

-- AddForeignKey
ALTER TABLE "SkippedItem" ADD CONSTRAINT "SkippedItem_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
