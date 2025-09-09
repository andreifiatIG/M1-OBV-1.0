-- Optional: Drop SkippedItem table (ensure related endpoints are removed)
-- Before running, remove or disable routes calling onboardingProgressService.skipField/unskipField.

BEGIN;

DROP TABLE IF EXISTS "SkippedItem" CASCADE;

COMMIT;

