-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('Pending', 'Review', 'Resolved');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('consumer', 'admin');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('ADVISORY', 'LEGAL_AID', 'PRIVATE_ADVOCATE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'consumer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'Pending',
    "filePath" TEXT,
    "aiCategory" TEXT,
    "aiSeverity" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiKeyIssues" TEXT[],
    "aiSuggestedAction" TEXT,
    "aiRelevantLaws" TEXT[],
    "aiProcessedAt" TIMESTAMP(3),
    "aiProcessingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reporterId" TEXT,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisory_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL DEFAULT 'ADVISORY',
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "specialization" TEXT[],
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "isProBono" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisory_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "cases_company_idx" ON "cases"("company");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_createdAt_idx" ON "cases"("createdAt");

-- CreateIndex
CREATE INDEX "cases_aiCategory_idx" ON "cases"("aiCategory");

-- CreateIndex
CREATE INDEX "cases_aiSeverity_idx" ON "cases"("aiSeverity");

-- CreateIndex
CREATE INDEX "advisory_services_category_idx" ON "advisory_services"("category");

-- CreateIndex
CREATE INDEX "advisory_services_type_idx" ON "advisory_services"("type");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
