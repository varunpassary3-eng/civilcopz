-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "consumerAddress" TEXT,
ADD COLUMN     "consumerEmail" TEXT,
ADD COLUMN     "consumerName" TEXT,
ADD COLUMN     "consumerPhone" TEXT;

-- CreateIndex
CREATE INDEX "cases_title_idx" ON "cases"("title");
