-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "enriched" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "enrichmentData" JSONB,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "foundedYear" INTEGER,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "revenue" TEXT,
ADD COLUMN     "socialProfiles" JSONB,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "technologies" TEXT[],
ADD COLUMN     "ticker" TEXT,
ADD COLUMN     "twitter" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- CreateTable
CREATE TABLE "email_composer" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "toEmails" TEXT[],
    "ccEmails" TEXT[],
    "bccEmails" TEXT[],
    "attachments" JSONB,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "tracking" BOOLEAN NOT NULL DEFAULT true,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,

    CONSTRAINT "email_composer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csv_imports" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "mapping" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "csv_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_composer_userId_idx" ON "email_composer"("userId");

-- CreateIndex
CREATE INDEX "email_composer_contactId_idx" ON "email_composer"("contactId");

-- CreateIndex
CREATE INDEX "email_composer_isSent_idx" ON "email_composer"("isSent");

-- CreateIndex
CREATE INDEX "email_composer_createdAt_idx" ON "email_composer"("createdAt");

-- CreateIndex
CREATE INDEX "csv_imports_userId_idx" ON "csv_imports"("userId");

-- CreateIndex
CREATE INDEX "csv_imports_status_idx" ON "csv_imports"("status");

-- CreateIndex
CREATE INDEX "csv_imports_entityType_idx" ON "csv_imports"("entityType");

-- CreateIndex
CREATE INDEX "csv_imports_createdAt_idx" ON "csv_imports"("createdAt");

-- CreateIndex
CREATE INDEX "companies_enriched_idx" ON "companies"("enriched");

-- AddForeignKey
ALTER TABLE "email_composer" ADD CONSTRAINT "email_composer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_composer" ADD CONSTRAINT "email_composer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
