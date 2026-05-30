-- Phase 4 — Apollo import + stream classification
-- Generated 2026-05-30 — applied via `prisma db push` locally and `prisma migrate deploy` in CI
-- See .planning/phases/04-apollo-import-and-auto-campaign/04-RESEARCH.md Section 2 for design rationale.
--
-- Table names use the @@map() lowercase form ("contacts", "companies") to match the
-- production schema. The unquoted @@unique-derived index name is what Prisma generates.

ALTER TABLE "contacts" ADD COLUMN "stream" TEXT;
ALTER TABLE "contacts" ADD COLUMN "apolloPersonId" TEXT;
ALTER TABLE "contacts" ADD COLUMN "apolloRawData" JSONB;
CREATE UNIQUE INDEX "contacts_apolloPersonId_key" ON "contacts"("apolloPersonId");
CREATE INDEX "contacts_stream_idx" ON "contacts"("stream");
CREATE INDEX "contacts_apolloPersonId_idx" ON "contacts"("apolloPersonId");

ALTER TABLE "companies" ADD COLUMN "stream" TEXT;
ALTER TABLE "companies" ADD COLUMN "apolloOrgId" TEXT;
ALTER TABLE "companies" ADD COLUMN "apolloRawData" JSONB;
CREATE UNIQUE INDEX "companies_apolloOrgId_key" ON "companies"("apolloOrgId");
CREATE INDEX "companies_stream_idx" ON "companies"("stream");
CREATE INDEX "companies_apolloOrgId_idx" ON "companies"("apolloOrgId");
