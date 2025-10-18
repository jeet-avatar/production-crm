-- Create enum for lead types
CREATE TYPE "LeadType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- Create enum for lead status
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'IMPORTED', 'REJECTED', 'ARCHIVED');

-- Create Leads table to store discovered leads from API
CREATE TABLE "leads" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "type" "LeadType" NOT NULL,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',

  -- Lead Information
  "leadName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "jobTitle" TEXT,
  "company" TEXT,
  "location" TEXT,
  "headquarters" TEXT,
  "industry" TEXT,
  "website" TEXT,
  "linkedinLink" TEXT,
  "leadScore" INTEGER,

  -- Search Context
  "searchQuery" TEXT,
  "searchMode" TEXT,
  "searchLocation" TEXT,
  "searchIndustry" TEXT,
  "searchTechStack" TEXT,

  -- Raw Data from API
  "rawData" JSONB,

  -- Import tracking
  "imported" BOOLEAN NOT NULL DEFAULT false,
  "importedAt" TIMESTAMP(3),
  "importedAsContactId" TEXT,
  "importedAsCompanyId" TEXT,

  -- Metadata
  "notes" TEXT,
  "tags" TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  "userId" TEXT NOT NULL,

  CONSTRAINT "leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX "leads_userId_idx" ON "leads"("userId");
CREATE INDEX "leads_type_idx" ON "leads"("type");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_imported_idx" ON "leads"("imported");
CREATE INDEX "leads_leadScore_idx" ON "leads"("leadScore");
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");
CREATE INDEX "leads_email_idx" ON "leads"("email");
CREATE INDEX "leads_company_idx" ON "leads"("company");
CREATE INDEX "leads_searchQuery_idx" ON "leads"("searchQuery");

-- Add unique constraint for email per user (optional, prevents duplicate leads)
CREATE UNIQUE INDEX "leads_userId_email_key" ON "leads"("userId", "email") WHERE "email" IS NOT NULL;

-- Create trigger to update updatedAt
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "leads_updated_at_trigger"
BEFORE UPDATE ON "leads"
FOR EACH ROW
EXECUTE FUNCTION update_leads_updated_at();
