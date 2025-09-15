-- Schema fixes for missing database fields
-- Applied on: 2025-09-11
-- Purpose: Fix compilation errors due to missing database fields

-- 1. Add missing lastSyncAt field to OTACredentials model
ALTER TABLE "OTACredentials" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);

-- 2. Add missing fields to Document model
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "sharePointUrl" TEXT;

-- 3. Add missing submittedAt field to OnboardingProgress model
ALTER TABLE "OnboardingProgress" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

-- 4. Create Agreement table (was missing entirely)
CREATE TABLE IF NOT EXISTS "Agreement" (
    "id" TEXT NOT NULL,
    "villaId" TEXT NOT NULL,
    "agreementType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
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

-- 5. Add Agreement table constraints and indexes
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Agreement_villaId_agreementType_idx" ON "Agreement"("villaId", "agreementType");
CREATE INDEX IF NOT EXISTS "Agreement_status_idx" ON "Agreement"("status");
CREATE INDEX IF NOT EXISTS "Agreement_expiresAt_idx" ON "Agreement"("expiresAt");
CREATE INDEX IF NOT EXISTS "Agreement_createdBy_idx" ON "Agreement"("createdBy");

-- Note: After applying these changes, run:
-- npx prisma generate
-- to regenerate the Prisma client with updated types