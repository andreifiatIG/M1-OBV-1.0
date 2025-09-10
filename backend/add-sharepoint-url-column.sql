-- Migration to add SharePoint URL column to photos table
-- This column will store the direct SharePoint URL for each photo

-- Add the new column
ALTER TABLE "Photo" 
ADD COLUMN IF NOT EXISTS "sharePointUrl" TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS "idx_photo_sharepoint_url" ON "Photo"("sharePointUrl");

-- Update existing photos that have SharePoint File ID but no SharePoint URL
-- This will need to be populated by the backend service
COMMENT ON COLUMN "Photo"."sharePointUrl" IS 'Direct URL to the file in SharePoint for frontend display';

-- Show current state
SELECT 
  COUNT(*) as total_photos,
  COUNT("sharePointFileId") as photos_with_sharepoint_id,
  COUNT("sharePointPath") as photos_with_sharepoint_path,
  COUNT("sharePointUrl") as photos_with_sharepoint_url
FROM "Photo";