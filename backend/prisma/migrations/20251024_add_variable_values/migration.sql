-- AlterTable
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "variableValues" JSONB;
