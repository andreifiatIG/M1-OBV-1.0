-- Update FacilityCategory enum to match frontend categories exactly
-- This migration updates the enum to use underscore names that match the frontend (converted from kebab-case)

-- First, add all the new enum values (using underscores as required by PostgreSQL)
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'property_layout_spaces';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'occupancy_sleeping';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'bathrooms';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'kitchen_dining';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'service_staff';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'living_spaces';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'outdoor_facilities';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'home_office';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'entertainment_gaming';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'technology';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'wellness_spa';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'accessibility';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'safety_security';
ALTER TYPE "FacilityCategory" ADD VALUE IF NOT EXISTS 'child_friendly';

-- Note: PostgreSQL doesn't allow removing enum values in a simple migration
-- Existing values will remain for backward compatibility:
-- KITCHEN_EQUIPMENT, BATHROOM_AMENITIES, BEDROOM_AMENITIES, LIVING_ROOM,
-- OUTDOOR_FACILITIES, POOL_AREA, ENTERTAINMENT, SAFETY_SECURITY,
-- UTILITIES, ACCESSIBILITY, BUSINESS_FACILITIES, CHILDREN_FACILITIES,
-- PET_FACILITIES, OTHER