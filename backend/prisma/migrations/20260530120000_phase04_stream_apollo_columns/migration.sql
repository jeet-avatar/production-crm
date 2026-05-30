-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "apolloPersonId" TEXT,
ADD COLUMN     "apolloRawData" JSONB,
ADD COLUMN     "stream" TEXT;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "apolloOrgId" TEXT,
ADD COLUMN     "apolloRawData" JSONB,
ADD COLUMN     "stream" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contacts_apolloPersonId_key" ON "contacts"("apolloPersonId");

-- CreateIndex
CREATE INDEX "contacts_stream_idx" ON "contacts"("stream");

-- CreateIndex
CREATE INDEX "contacts_apolloPersonId_idx" ON "contacts"("apolloPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_apolloOrgId_key" ON "companies"("apolloOrgId");

-- CreateIndex
CREATE INDEX "companies_stream_idx" ON "companies"("stream");

-- CreateIndex
CREATE INDEX "companies_apolloOrgId_idx" ON "companies"("apolloOrgId");

-- CreateIndex
CREATE INDEX "email_templates_category_idx" ON "email_templates"("category");

