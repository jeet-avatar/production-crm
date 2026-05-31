-- Phase 05 Plan 01: Personalized email send audit table
-- Isolated from email_logs (which has campaignId NOT NULL FK that Phase 4 doesn't populate).
CREATE TABLE "personalized_email_sends" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "testRecipient" TEXT,
    "subject" TEXT NOT NULL,
    "renderedBody" TEXT NOT NULL,
    "aiTokens" JSONB,
    "aiWarning" TEXT,
    "claudeInputTokens" INTEGER NOT NULL DEFAULT 0,
    "claudeOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "webSearchUses" INTEGER NOT NULL DEFAULT 0,
    "claudeCostUSD" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "resendMessageId" TEXT,
    "resendError" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "personalized_email_sends_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "personalized_email_sends_contactId_idx" ON "personalized_email_sends"("contactId");
CREATE INDEX "personalized_email_sends_templateId_idx" ON "personalized_email_sends"("templateId");
CREATE INDEX "personalized_email_sends_userId_idx" ON "personalized_email_sends"("userId");
CREATE INDEX "personalized_email_sends_status_idx" ON "personalized_email_sends"("status");
CREATE INDEX "personalized_email_sends_createdAt_idx" ON "personalized_email_sends"("createdAt");

ALTER TABLE "personalized_email_sends"
  ADD CONSTRAINT "personalized_email_sends_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "personalized_email_sends"
  ADD CONSTRAINT "personalized_email_sends_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "personalized_email_sends"
  ADD CONSTRAINT "personalized_email_sends_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
