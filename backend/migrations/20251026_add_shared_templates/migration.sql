-- Add isShared field to email_templates table
-- This allows templates to be shared with all users

ALTER TABLE "email_templates" ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false;

-- Add index for faster queries on shared templates
CREATE INDEX "email_templates_isShared_idx" ON "email_templates"("isShared");

-- Mark the Critical River NetSuite template as shared
UPDATE "email_templates"
SET "isShared" = true
WHERE id = 'cmh73ze6r0001sohk3e57a6w2';

-- Add comment explaining shared templates
COMMENT ON COLUMN "email_templates"."isShared" IS 'When true, template is visible to all users. When false, only visible to owner (userId).';
