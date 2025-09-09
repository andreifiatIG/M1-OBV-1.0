-- Add subfolder field to Photo table to support bedroom organization
ALTER TABLE "Photo" ADD COLUMN "subfolder" TEXT;

-- Add index for efficient queries by villa and subfolder
CREATE INDEX "Photo_villaId_subfolder_idx" ON "Photo"("villaId", "subfolder");

-- Update existing bedroom photos to extract subfolder from sharePointPath if possible
UPDATE "Photo" 
SET "subfolder" = CASE 
  WHEN "category" = 'BEDROOMS' AND "sharePointPath" ~ 'Photos/Bedrooms/[^/]+$' 
  THEN substring("sharePointPath" from 'Photos/Bedrooms/(.+)')
  ELSE NULL
END
WHERE "category" = 'BEDROOMS';