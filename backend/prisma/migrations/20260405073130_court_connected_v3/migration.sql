/*
  Warnings:

  - A unique constraint covering the columns `[caseId,eventType,sourceRef]` on the table `case_events` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "case_events" ADD COLUMN     "sourceRef" TEXT;

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "certificateHash" TEXT,
ADD COLUMN     "registryStatus" TEXT DEFAULT 'DRAFT',
ADD COLUMN     "signatureProvider" TEXT,
ADD COLUMN     "signatureTxnId" TEXT,
ADD COLUMN     "signed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "evidence_integrity_ledger" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "metadataHash" TEXT NOT NULL,
    "previousHash" TEXT,
    "signature" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustedTimestamp" TEXT,
    "timestampAuthority" TEXT,
    "actor" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "evidence_integrity_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_trail" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changes" JSONB,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "integrityHash" TEXT NOT NULL,
    "blockHash" TEXT,

    CONSTRAINT "audit_trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrity_verifications" (
    "id" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "expectedHash" TEXT NOT NULL,
    "actualHash" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedBy" TEXT NOT NULL,

    CONSTRAINT "integrity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_of_custody" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromActor" TEXT,
    "toActor" TEXT NOT NULL,
    "reason" TEXT,
    "transferMethod" TEXT,
    "digitalSignature" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustedTimestamp" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT,

    CONSTRAINT "chain_of_custody_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packages" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contents" JSONB NOT NULL,
    "masterHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "trustedTimestamp" TEXT,
    "sealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sealedBy" TEXT NOT NULL,
    "packageUrl" TEXT,
    "isCourtAdmissible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "evidence_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "deviceInfo" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_kyc" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kycData" JSONB NOT NULL,
    "status" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "user_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates_65b" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "computerSystem" TEXT NOT NULL,
    "computerOutput" TEXT NOT NULL,
    "generatedBySystem" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "hashValue" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "certificateText" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "pdfHash" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "digitalSignature" TEXT NOT NULL,
    "trustedTimestamp" TEXT,

    CONSTRAINT "certificates_65b_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timestamp_anchors" (
    "id" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "globalHash" TEXT NOT NULL,
    "trustedTimestamp" TEXT NOT NULL,
    "timestampAuthority" TEXT,
    "activitySummary" JSONB NOT NULL,
    "anchoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timestamp_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_integrity_ledger_caseId_idx" ON "evidence_integrity_ledger"("caseId");

-- CreateIndex
CREATE INDEX "evidence_integrity_ledger_evidenceId_idx" ON "evidence_integrity_ledger"("evidenceId");

-- CreateIndex
CREATE INDEX "evidence_integrity_ledger_timestamp_idx" ON "evidence_integrity_ledger"("timestamp");

-- CreateIndex
CREATE INDEX "audit_trail_entityType_entityId_idx" ON "audit_trail"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_trail_actorId_idx" ON "audit_trail"("actorId");

-- CreateIndex
CREATE INDEX "audit_trail_timestamp_idx" ON "audit_trail"("timestamp");

-- CreateIndex
CREATE INDEX "integrity_verifications_verificationType_idx" ON "integrity_verifications"("verificationType");

-- CreateIndex
CREATE INDEX "integrity_verifications_targetId_idx" ON "integrity_verifications"("targetId");

-- CreateIndex
CREATE INDEX "chain_of_custody_caseId_idx" ON "chain_of_custody"("caseId");

-- CreateIndex
CREATE INDEX "chain_of_custody_evidenceId_idx" ON "chain_of_custody"("evidenceId");

-- CreateIndex
CREATE INDEX "chain_of_custody_timestamp_idx" ON "chain_of_custody"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packages_packageId_key" ON "evidence_packages"("packageId");

-- CreateIndex
CREATE INDEX "evidence_packages_caseId_idx" ON "evidence_packages"("caseId");

-- CreateIndex
CREATE INDEX "evidence_packages_packageId_idx" ON "evidence_packages"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_fingerprint_key" ON "user_devices"("fingerprint");

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE INDEX "user_devices_fingerprint_idx" ON "user_devices"("fingerprint");

-- CreateIndex
CREATE INDEX "user_kyc_userId_idx" ON "user_kyc"("userId");

-- CreateIndex
CREATE INDEX "user_kyc_status_idx" ON "user_kyc"("status");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_65b_certificateNumber_key" ON "certificates_65b"("certificateNumber");

-- CreateIndex
CREATE INDEX "certificates_65b_caseId_idx" ON "certificates_65b"("caseId");

-- CreateIndex
CREATE INDEX "certificates_65b_certificateNumber_idx" ON "certificates_65b"("certificateNumber");

-- CreateIndex
CREATE INDEX "certificates_65b_generatedAt_idx" ON "certificates_65b"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "timestamp_anchors_anchorId_key" ON "timestamp_anchors"("anchorId");

-- CreateIndex
CREATE INDEX "timestamp_anchors_anchoredAt_idx" ON "timestamp_anchors"("anchoredAt");

-- CreateIndex
CREATE INDEX "timestamp_anchors_anchorId_idx" ON "timestamp_anchors"("anchorId");

-- CreateIndex
CREATE UNIQUE INDEX "case_events_caseId_eventType_sourceRef_key" ON "case_events"("caseId", "eventType", "sourceRef");

-- AddForeignKey
ALTER TABLE "evidence_integrity_ledger" ADD CONSTRAINT "evidence_integrity_ledger_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_of_custody" ADD CONSTRAINT "chain_of_custody_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packages" ADD CONSTRAINT "evidence_packages_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc" ADD CONSTRAINT "user_kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates_65b" ADD CONSTRAINT "certificates_65b_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
