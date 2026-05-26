-- Add contact enrichment tracking fields to Company model
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "contactsEnriched" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "contactsEnrichedAt" TIMESTAMP(3);
