-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "claimAmount" DOUBLE PRECISION,
ADD COLUMN     "consumerAddress" TEXT,
ADD COLUMN     "consumerEmail" TEXT,
ADD COLUMN     "consumerName" TEXT,
ADD COLUMN     "consumerPhone" TEXT;

-- CreateTable
CREATE TABLE "case_documents" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'evidence',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_documents_caseId_idx" ON "case_documents"("caseId");

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
