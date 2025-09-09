-- Phase 2 Actual Cleanup: Drop unused columns/tables per latest usage analysis
-- Review and run after ensuring schema and code are consistent.

BEGIN;

-- Villa: remove tags (no longer used in mapping)
ALTER TABLE "Villa" DROP COLUMN IF EXISTS "tags";

-- AdminAction: remove entire table (no longer used)
DROP TABLE IF EXISTS "AdminAction" CASCADE;

-- Agreement: remove entire table (no longer used)
DROP TABLE IF EXISTS "Agreement" CASCADE;

-- Document: remove validity dates (not used)
ALTER TABLE "Document" DROP COLUMN IF EXISTS "validFrom";
ALTER TABLE "Document" DROP COLUMN IF EXISTS "validUntil";

-- OTACredentials: remove sync fields (not used)
ALTER TABLE "OTACredentials" DROP COLUMN IF EXISTS "lastSyncAt";
ALTER TABLE "OTACredentials" DROP COLUMN IF EXISTS "syncStatus";

-- Staff: remove notes (confirmed unused; mapping updated)
ALTER TABLE "Staff" DROP COLUMN IF EXISTS "notes";

COMMIT;

