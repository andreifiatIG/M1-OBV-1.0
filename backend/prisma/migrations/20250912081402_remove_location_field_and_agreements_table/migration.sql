/*
  Warnings:

  - You are about to drop the column `location` on the `Villa` table. All the data in the column will be lost.
  - You are about to drop the `Agreement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Agreement" DROP CONSTRAINT "Agreement_villaId_fkey";

-- AlterTable
ALTER TABLE "Villa" DROP COLUMN "location";

-- DropTable
DROP TABLE "Agreement";

-- DropEnum
DROP TYPE "AgreementStatus";

-- DropEnum
DROP TYPE "AgreementType";
