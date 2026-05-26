-- Add enrichment fields to contacts table
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "linkedin" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "skills" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "enriched" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "enrichedAt" TIMESTAMP(3);
