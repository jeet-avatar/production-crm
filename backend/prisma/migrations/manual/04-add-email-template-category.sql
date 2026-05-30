-- Phase 4 plan 04-03: Add `category` to email_templates.
--
-- The Apollo wizard (plan 04-05) routes imported batches to stream-specific
-- templates via `?category=Stream:<name>` (e.g., Stream:NetSuite). The column
-- is nullable so existing rows from prior phases stay valid; new seeded rows
-- created by /api/email-templates/seed-streams populate it.
--
-- Index on category speeds up the wizard's GET filter.
--
-- @@map("email_templates") in schema → lowercase table name.

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS email_templates_category_idx
  ON email_templates(category);
