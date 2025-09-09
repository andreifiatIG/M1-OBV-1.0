-- Phase 1 Migration: Remove approval-related fields from OnboardingProgress
-- Safe to run: these fields are no longer used after removing the admin approval system.

BEGIN;

ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "submittedAt";
ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "submittedBy";
ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "approvedAt";
ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "approvedBy";
ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "approvalNotes";
ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "rejectedAt";
ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "rejectedBy";
ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "rejectionCount";
ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "rejectionNotes";
ALTER TABLE "OnboardingProgress" DROP COLUMN IF EXISTS "rejectionReason";

COMMIT;

