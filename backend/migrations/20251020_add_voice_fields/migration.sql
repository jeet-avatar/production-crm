-- Add voice fields to video_campaigns table
ALTER TABLE "video_campaigns" ADD COLUMN IF NOT EXISTS "voiceId" TEXT;
ALTER TABLE "video_campaigns" ADD COLUMN IF NOT EXISTS "customVoiceUrl" TEXT;
