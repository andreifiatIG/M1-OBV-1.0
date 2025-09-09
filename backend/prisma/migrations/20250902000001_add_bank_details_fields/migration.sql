-- Add missing fields to BankDetails table
ALTER TABLE "BankDetails" ADD COLUMN "branchName" VARCHAR(200);
ALTER TABLE "BankDetails" ADD COLUMN "branchAddress" TEXT;
ALTER TABLE "BankDetails" ADD COLUMN "accountType" TEXT DEFAULT 'CHECKING';
ALTER TABLE "BankDetails" ADD COLUMN "routingNumber" VARCHAR(20);
ALTER TABLE "BankDetails" ADD COLUMN "taxId" VARCHAR(50);
ALTER TABLE "BankDetails" ADD COLUMN "notes" TEXT;