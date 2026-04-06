/*
  Warnings:

  - You are about to drop the column `contactEmail` on the `advisory_services` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `advisory_services` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `advisory_services` table. All the data in the column will be lost.
  - You are about to drop the column `error` on the `case_notice_deliveries` table. All the data in the column will be lost.
  - You are about to drop the column `aiProcessingError` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `auditAction` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `claimAmount` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `consumerAddress` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `consumerEmail` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `consumerName` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `consumerPhone` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `emailDeliveryStatus` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `emailMessageId` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `emailSent` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `emailSentAt` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `fileHash` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `cases` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `cases` table. All the data in the column will be lost.
  - The `noticeStatus` column on the `cases` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADVOCATE';

-- DropIndex
DROP INDEX "advisory_services_category_idx";

-- DropIndex
DROP INDEX "advisory_services_type_idx";

-- DropIndex
DROP INDEX "case_notice_deliveries_trackingId_idx";

-- DropIndex
DROP INDEX "cases_aiCategory_idx";

-- DropIndex
DROP INDEX "cases_aiSeverity_idx";

-- DropIndex
DROP INDEX "cases_noticeStatus_idx";

-- AlterTable
ALTER TABLE "advisory_services" DROP COLUMN "contactEmail",
DROP COLUMN "contactPhone",
DROP COLUMN "website";

-- AlterTable
ALTER TABLE "case_notice_deliveries" DROP COLUMN "error",
ADD COLUMN     "awarenessLevel" TEXT DEFAULT 'LOW',
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "cases" DROP COLUMN "aiProcessingError",
DROP COLUMN "auditAction",
DROP COLUMN "claimAmount",
DROP COLUMN "consumerAddress",
DROP COLUMN "consumerEmail",
DROP COLUMN "consumerName",
DROP COLUMN "consumerPhone",
DROP COLUMN "emailDeliveryStatus",
DROP COLUMN "emailMessageId",
DROP COLUMN "emailSent",
DROP COLUMN "emailSentAt",
DROP COLUMN "fileHash",
DROP COLUMN "filePath",
DROP COLUMN "severity",
ADD COLUMN     "caseNumber" TEXT,
ADD COLUMN     "considerationPaid" DOUBLE PRECISION,
ADD COLUMN     "expectedCompensationClient" DOUBLE PRECISION,
ADD COLUMN     "filingMode" TEXT DEFAULT 'BOTH',
ADD COLUMN     "finalCourtClaimValue" DOUBLE PRECISION,
ADD COLUMN     "hearingDates" JSONB,
ADD COLUMN     "nextHearingAt" TIMESTAMP(3),
ADD COLUMN     "proposedCompensationAdvocate" DOUBLE PRECISION,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "statutoryFee" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "category" SET DEFAULT 'Other',
ALTER COLUMN "jurisdiction" DROP NOT NULL,
DROP COLUMN "noticeStatus",
ADD COLUMN     "noticeStatus" TEXT;

-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "barCouncilId" TEXT,
ADD COLUMN     "isVerifiedProfessional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialization" TEXT;

-- DropEnum
DROP TYPE "NoticeStatus";

-- CreateTable
CREATE TABLE "notaries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "contact" TEXT,
    "fees" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_events" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "actor" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_ledger_hashes" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rootHash" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_ledger_hashes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notaries_jurisdiction_idx" ON "notaries"("jurisdiction");

-- CreateIndex
CREATE INDEX "case_events_caseId_idx" ON "case_events"("caseId");

-- CreateIndex
CREATE INDEX "case_events_eventType_idx" ON "case_events"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "daily_ledger_hashes_date_key" ON "daily_ledger_hashes"("date");

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
