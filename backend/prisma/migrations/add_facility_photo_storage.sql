-- Add photo storage fields to FacilityChecklist table
ALTER TABLE "FacilityChecklist"
ADD COLUMN IF NOT EXISTS "photoData" BYTEA,
ADD COLUMN IF NOT EXISTS "photoMimeType" TEXT,
ADD COLUMN IF NOT EXISTS "photoSize" INTEGER,
ADD COLUMN IF NOT EXISTS "photoWidth" INTEGER,
ADD COLUMN IF NOT EXISTS "photoHeight" INTEGER;

-- Update existing text fields to support longer content
ALTER TABLE "FacilityChecklist"
ALTER COLUMN "notes" TYPE TEXT,
ALTER COLUMN "specifications" TYPE TEXT;

-- Set defaults for better consistency
ALTER TABLE "FacilityChecklist"
ALTER COLUMN "quantity" SET DEFAULT 1,
ALTER COLUMN "condition" SET DEFAULT 'good',
ALTER COLUMN "lastCheckedAt" SET DEFAULT NOW();

-- Add index for performance when filtering by availability
CREATE INDEX IF NOT EXISTS "FacilityChecklist_villaId_isAvailable_idx" 
ON "FacilityChecklist"("villaId", "isAvailable");

-- Add comment for documentation
COMMENT ON COLUMN "FacilityChecklist"."photoData" IS 'Local bytea storage for facility photo thumbnails';
COMMENT ON COLUMN "FacilityChecklist"."photoUrl" IS 'SharePoint URL for full quality photo backup';
COMMENT ON COLUMN "FacilityChecklist"."photoMimeType" IS 'MIME type of locally stored photo';
COMMENT ON COLUMN "FacilityChecklist"."photoSize" IS 'Size in bytes of locally stored photo';
COMMENT ON COLUMN "FacilityChecklist"."photoWidth" IS 'Width in pixels for UI optimization';
COMMENT ON COLUMN "FacilityChecklist"."photoHeight" IS 'Height in pixels for UI optimization';