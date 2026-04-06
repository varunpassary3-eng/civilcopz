-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "declarationAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "declaredName" TEXT,
ADD COLUMN     "emailDeliveryStatus" TEXT,
ADD COLUMN     "emailMessageId" TEXT,
ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "isDeclaredTrue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noticeDeadline" TIMESTAMP(3),
ADD COLUMN     "noticeHash" TEXT,
ADD COLUMN     "noticeSentAt" TIMESTAMP(3),
ADD COLUMN     "noticeUrl" TEXT,
ADD COLUMN     "userAgent" TEXT;
