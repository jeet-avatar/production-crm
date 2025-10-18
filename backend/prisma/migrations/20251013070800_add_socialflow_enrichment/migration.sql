-- Add SocialFlow premium enrichment fields to companies table
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "socialFlowEnriched" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "socialFlowEnrichedAt" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "socialFlowData" JSONB;
