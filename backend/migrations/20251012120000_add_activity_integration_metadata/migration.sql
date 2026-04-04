-- AlterTable: Add activity integration metadata fields for SMS, Email, Meeting, and Task management

-- SMS Metadata (Twilio Integration)
ALTER TABLE "activities" ADD COLUMN "smsTo" TEXT;
ALTER TABLE "activities" ADD COLUMN "smsFrom" TEXT;
ALTER TABLE "activities" ADD COLUMN "smsSid" TEXT;
ALTER TABLE "activities" ADD COLUMN "smsStatus" TEXT;
ALTER TABLE "activities" ADD COLUMN "smsSentAt" TIMESTAMP(3);

-- Email Metadata (SMTP Integration)
ALTER TABLE "activities" ADD COLUMN "emailTo" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "activities" ADD COLUMN "emailFrom" TEXT;
ALTER TABLE "activities" ADD COLUMN "emailCc" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "activities" ADD COLUMN "emailBcc" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "activities" ADD COLUMN "emailMessageId" TEXT;
ALTER TABLE "activities" ADD COLUMN "emailStatus" TEXT;
ALTER TABLE "activities" ADD COLUMN "emailSentAt" TIMESTAMP(3);

-- Meeting Metadata (Google Meet & Calendar Integration)
ALTER TABLE "activities" ADD COLUMN "meetingLink" TEXT;
ALTER TABLE "activities" ADD COLUMN "meetingEventId" TEXT;
ALTER TABLE "activities" ADD COLUMN "meetingStartTime" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN "meetingEndTime" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN "meetingAttendees" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "activities" ADD COLUMN "meetingLocation" TEXT;
ALTER TABLE "activities" ADD COLUMN "meetingTimezone" TEXT;

-- Task Metadata
ALTER TABLE "activities" ADD COLUMN "taskAssignedTo" TEXT;
ALTER TABLE "activities" ADD COLUMN "taskStatus" TEXT;
ALTER TABLE "activities" ADD COLUMN "taskCheckbox" BOOLEAN;

-- Generic metadata for extensibility
ALTER TABLE "activities" ADD COLUMN "metadata" JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "activities_smsStatus_idx" ON "activities"("smsStatus");
CREATE INDEX IF NOT EXISTS "activities_emailStatus_idx" ON "activities"("emailStatus");
CREATE INDEX IF NOT EXISTS "activities_taskStatus_idx" ON "activities"("taskStatus");
