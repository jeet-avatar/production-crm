-- AlterTable
ALTER TABLE "video_campaigns" 
ADD COLUMN "processingStartedAt" TIMESTAMP(3),
ADD COLUMN "progressPercent" INTEGER DEFAULT 0,
ADD COLUMN "estimatedCompletion" TIMESTAMP(3);
