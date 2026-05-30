-- Add video template tracking fields to email_templates table
ALTER TABLE "email_templates" ADD COLUMN "videoTemplateId" TEXT;
ALTER TABLE "email_templates" ADD COLUMN "videoTemplateName" TEXT;

-- Create index for video template ID for faster lookups
CREATE INDEX "email_templates_videoTemplateId_idx" ON "email_templates"("videoTemplateId");
