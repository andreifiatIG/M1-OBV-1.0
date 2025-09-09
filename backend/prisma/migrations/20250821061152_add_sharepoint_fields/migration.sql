/*
  Warnings:

  - You are about to drop the column `sharepointId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `sharepointPath` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `sharepointId` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `sharepointPath` on the `Photo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "sharepointId",
DROP COLUMN "sharepointPath",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "sharePointFileId" TEXT,
ADD COLUMN     "sharePointPath" TEXT;

-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "sharepointId",
DROP COLUMN "sharepointPath",
ADD COLUMN     "sharePointFileId" TEXT,
ADD COLUMN     "sharePointPath" TEXT;

-- AlterTable
ALTER TABLE "Villa" ADD COLUMN     "documentsPath" TEXT,
ADD COLUMN     "photosPath" TEXT,
ADD COLUMN     "sharePointPath" TEXT;
