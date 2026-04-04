-- CreateTable
CREATE TABLE "email_unsubscribes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "feedback" TEXT,
    "campaignId" TEXT,
    "contactId" TEXT,
    "unsubscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL UNIQUE,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "email_unsubscribes_email_key" ON "email_unsubscribes"("email");
CREATE INDEX "email_unsubscribes_email_idx" ON "email_unsubscribes"("email");
CREATE INDEX "email_unsubscribes_token_idx" ON "email_unsubscribes"("token");
CREATE INDEX "email_unsubscribes_campaignId_idx" ON "email_unsubscribes"("campaignId");
CREATE INDEX "email_unsubscribes_contactId_idx" ON "email_unsubscribes"("contactId");
CREATE INDEX "email_unsubscribes_confirmed_idx" ON "email_unsubscribes"("confirmed");
