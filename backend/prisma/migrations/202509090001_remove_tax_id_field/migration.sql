-- Remove taxId field from BankDetails table

ALTER TABLE "BankDetails" DROP COLUMN IF EXISTS "taxId";