-- AlterTable
ALTER TABLE "video_campaigns" ADD COLUMN "emailTemplateId" TEXT;

-- CreateIndex
CREATE INDEX "video_campaigns_emailTemplateId_idx" ON "video_campaigns"("emailTemplateId");

-- AddForeignKey
ALTER TABLE "video_campaigns" ADD CONSTRAINT "video_campaigns_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
