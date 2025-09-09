-- Delete TRIPADVISOR entries first since we're removing this platform
DELETE FROM "OTACredentials" WHERE "platform" = 'TRIPADVISOR';

-- Create new enum with MARRIOTT_HOMES_VILLAS instead of HOTELS_COM and without TRIPADVISOR
ALTER TYPE "OTAPlatform" RENAME TO "OTAPlatform_old";

CREATE TYPE "OTAPlatform" AS ENUM (
    'BOOKING_COM',
    'AIRBNB', 
    'VRBO',
    'EXPEDIA',
    'AGODA',
    'MARRIOTT_HOMES_VILLAS',
    'HOMEAWAY',
    'FLIPKEY',
    'DIRECT'
);

-- Update HOTELS_COM to MARRIOTT_HOMES_VILLAS during the enum conversion
ALTER TABLE "OTACredentials" ALTER COLUMN "platform" TYPE "OTAPlatform" USING 
  CASE 
    WHEN "platform"::text = 'HOTELS_COM' THEN 'MARRIOTT_HOMES_VILLAS'
    ELSE "platform"::text
  END::"OTAPlatform";

-- Drop old enum
DROP TYPE "OTAPlatform_old";