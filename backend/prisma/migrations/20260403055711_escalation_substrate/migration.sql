-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'EXPIRED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'POST');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "noticeStatus" "NoticeStatus" NOT NULL DEFAULT 'SENT';

-- CreateTable
CREATE TABLE "case_notice_deliveries" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "trackingId" TEXT,
    "error" TEXT,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_notice_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_notice_deliveries_caseId_idx" ON "case_notice_deliveries"("caseId");

-- CreateIndex
CREATE INDEX "case_notice_deliveries_trackingId_idx" ON "case_notice_deliveries"("trackingId");

-- CreateIndex
CREATE INDEX "case_notice_deliveries_status_idx" ON "case_notice_deliveries"("status");

-- CreateIndex
CREATE INDEX "cases_noticeStatus_idx" ON "cases"("noticeStatus");

-- AddForeignKey
ALTER TABLE "case_notice_deliveries" ADD CONSTRAINT "case_notice_deliveries_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
