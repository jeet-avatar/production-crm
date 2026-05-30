-- AlterTable
ALTER TABLE "video_templates" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "video_templates_isActive_idx" ON "video_templates"("isActive");
