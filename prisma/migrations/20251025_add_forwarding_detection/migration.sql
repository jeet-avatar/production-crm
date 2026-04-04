-- AlterTable: Add forwarding detection fields to email_logs
ALTER TABLE "email_logs" ADD COLUMN "wasForwarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email_logs" ADD COLUMN "suspectedForwards" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "email_logs" ADD COLUMN "uniqueIPs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "email_logs" ADD COLUMN "uniqueUserAgents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "email_logs" ADD COLUMN "lastForwardDetectedAt" TIMESTAMP(3);

-- Create index for forwarded emails
CREATE INDEX "email_logs_wasForwarded_idx" ON "email_logs"("wasForwarded");
