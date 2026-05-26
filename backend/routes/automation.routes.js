"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const logger_1 = require("../utils/logger");
const axios_1 = __importDefault(require("axios"));
const campaign_progress_1 = require("../utils/campaign-progress");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/campaign-progress/:campaignId', (req, res) => {
    const { campaignId } = req.params;
    logger_1.logger.info(`[SSE] Client connecting to campaign progress: ${campaignId}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    campaign_progress_1.CampaignProgressEmitter.registerClient(campaignId, res);
    res.write(`data: ${JSON.stringify({ type: 'connected', campaignId })}\n\n`);
    req.on('close', () => {
        logger_1.logger.info(`[SSE] Client disconnected from campaign: ${campaignId}`);
        campaign_progress_1.CampaignProgressEmitter.unregisterClient(campaignId, res);
    });
});
async function pollVideoStatus(externalJobId, campaignId) {
    const videoServiceUrl = process.env.VIDEO_GENERATOR_SERVICE_URL || 'http://localhost:5002';
    const maxAttempts = 120;
    let attempts = 0;
    const poll = async () => {
        try {
            attempts++;
            logger_1.logger.info(`[AUTOMATION-POLL] Checking status for job ${externalJobId}, campaign ${campaignId} (attempt ${attempts}/${maxAttempts})`);
            const response = await axios_1.default.get(`${videoServiceUrl}/api/video/status/${externalJobId}`);
            const status = response.data;
            logger_1.logger.info(`[AUTOMATION-POLL] Status: ${status.status}, Progress: ${status.progress}%`);
            await prisma_1.prisma.videoCampaign.update({
                where: { id: campaignId },
                data: {
                    progressPercent: status.progress || 0
                }
            });
            if (status.status === 'completed' && status.videoUrl) {
                logger_1.logger.info(`[AUTOMATION-POLL] Video ready! Updating campaign ${campaignId}`);
                const campaign = await prisma_1.prisma.videoCampaign.findUnique({
                    where: { id: campaignId },
                    include: {
                        emailTemplate: true
                    }
                });
                await prisma_1.prisma.videoCampaign.update({
                    where: { id: campaignId },
                    data: {
                        status: 'READY',
                        videoUrl: status.videoUrl,
                        thumbnailUrl: status.thumbnailUrl,
                        duration: status.duration,
                        generatedAt: new Date(),
                        progressPercent: 100
                    }
                });
                if (campaign?.emailTemplateId && campaign.emailTemplate) {
                    logger_1.logger.info(`[AUTO-EMBED] Embedding video into email template ${campaign.emailTemplateId}`);
                    const videoEmbedHtml = `
<!-- Auto-embedded video from campaign: ${campaign.name} -->
<div style="margin: 20px 0; text-align: center; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 30px; border-radius: 12px;">
  <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
    <video controls style="width: 100%; display: block;" poster="${status.thumbnailUrl || ''}">
      <source src="${status.videoUrl}" type="video/mp4">
      Your email client doesn't support video playback.
    </video>
    <div style="padding: 15px; text-align: center;">
      <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;">Can't play the video?</p>
      <a href="${status.videoUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Watch in Browser</a>
    </div>
  </div>
</div>
<!-- End auto-embedded video -->
`;
                    const currentHtmlContent = campaign.emailTemplate.htmlContent || '';
                    const currentTextContent = campaign.emailTemplate.textContent || '';
                    let updatedHtmlContent;
                    if (currentHtmlContent.includes('{{VIDEO_PLACEHOLDER}}')) {
                        updatedHtmlContent = currentHtmlContent.replace('{{VIDEO_PLACEHOLDER}}', videoEmbedHtml);
                        logger_1.logger.info(`[AUTO-EMBED] Replaced {{VIDEO_PLACEHOLDER}} in email template`);
                    }
                    else {
                        updatedHtmlContent = `${videoEmbedHtml}\n\n${currentHtmlContent || currentTextContent}`;
                        logger_1.logger.info(`[AUTO-EMBED] Prepended video to email template`);
                    }
                    await prisma_1.prisma.emailTemplate.update({
                        where: { id: campaign.emailTemplateId },
                        data: {
                            htmlContent: updatedHtmlContent
                        }
                    });
                    logger_1.logger.info(`✅ [AUTO-EMBED] Video successfully embedded into email template ${campaign.emailTemplateId}`);
                }
                else {
                    logger_1.logger.info(`[AUTO-EMBED] No email template linked to campaign ${campaignId} - skipping auto-embed`);
                }
                logger_1.logger.info(`✅ [AUTOMATION-POLL] Campaign ${campaignId} completed successfully`);
                return;
            }
            if (status.status === 'failed') {
                logger_1.logger.error(`[AUTOMATION-POLL] Video generation failed for campaign ${campaignId}`);
                await prisma_1.prisma.videoCampaign.update({
                    where: { id: campaignId },
                    data: {
                        status: 'FAILED',
                        generationError: status.error || 'Video generation failed'
                    }
                });
                return;
            }
            if (attempts < maxAttempts) {
                setTimeout(poll, 10000);
            }
            else {
                logger_1.logger.error(`[AUTOMATION-POLL] Max polling attempts reached for campaign ${campaignId}`);
                await prisma_1.prisma.videoCampaign.update({
                    where: { id: campaignId },
                    data: {
                        status: 'FAILED',
                        generationError: 'Video generation timeout - exceeded maximum wait time'
                    }
                });
            }
        }
        catch (error) {
            logger_1.logger.error(`[AUTOMATION-POLL] Error polling status:`, error.message);
            if (attempts < maxAttempts) {
                setTimeout(poll, 10000);
            }
        }
    };
    setTimeout(poll, 10000);
}
router.post('/launch-video-campaign', async (req, res) => {
    logger_1.logger.info('🎯 [AUTOMATION] Route handler called - ENTRY POINT');
    logger_1.logger.info('🎯 [AUTOMATION] req.user exists:', !!req.user);
    logger_1.logger.info('🎯 [AUTOMATION] req.body:', JSON.stringify(req.body));
    try {
        logger_1.logger.info('🎯 [AUTOMATION] Inside try block');
        const userId = req.user?.id;
        logger_1.logger.info('🎯 [AUTOMATION] userId:', userId);
        if (!userId) {
            logger_1.logger.error('❌ [AUTOMATION] No userId - returning 401');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { contactIds = [], campaignName = 'NetSuite AI Automation Demo', maxContacts = 10, message, videoType, existingVideoId, emailTemplateId, emailTemplateType, sendTime, scheduledDate, scheduledTime } = req.body;
        const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const progress = new campaign_progress_1.CampaignProgressEmitter(campaignId);
        logger_1.logger.info('🚀 [AUTOMATION] Starting one-click video campaign automation', {
            userId,
            campaignId,
            contactCount: contactIds.length,
            contactIds: contactIds,
            wizardConfig: {
                campaignName,
                message: message ? `${message.substring(0, 50)}...` : 'default',
                videoType,
                existingVideoId,
                emailTemplateType,
                emailTemplateId,
                sendTime,
                scheduledDate,
                scheduledTime
            }
        });
        if (!contactIds || contactIds.length === 0) {
            logger_1.logger.error('❌ [AUTOMATION] No contact IDs provided');
            return res.status(400).json({ error: 'At least one contact must be selected' });
        }
        if (contactIds.length > maxContacts) {
            logger_1.logger.error(`❌ [AUTOMATION] Too many contacts (${contactIds.length} > ${maxContacts})`);
            return res.status(400).json({
                error: `Maximum ${maxContacts} contacts allowed per campaign`
            });
        }
        res.json({
            success: true,
            campaignId,
            message: 'Campaign started. Connect to SSE endpoint for progress updates.',
            contactCount: contactIds.length
        });
        (async () => {
            try {
                await progress.emitStepStart('init', 'Validating contacts and preparing campaign...');
                await new Promise(resolve => setTimeout(resolve, 500));
                const accountOwnerId = req.user?.teamRole === 'OWNER'
                    ? req.user.id
                    : (req.user?.accountOwnerId || userId);
                logger_1.logger.info(`[AUTOMATION] Team collaboration check - userId: ${userId}, teamRole: ${req.user?.teamRole}, accountOwnerId: ${accountOwnerId}`);
                const contacts = await prisma_1.prisma.contact.findMany({
                    where: {
                        id: { in: contactIds },
                        OR: [
                            { userId },
                            { userId: accountOwnerId }
                        ],
                        isActive: true,
                        email: { not: null }
                    },
                    include: {
                        company: true
                    }
                });
                logger_1.logger.info(`✅ [AUTOMATION] Found ${contacts.length} valid contact(s)`, {
                    requestedIds: contactIds,
                    foundContacts: contacts.map(c => ({ id: c.id, email: c.email, ownerId: c.userId }))
                });
                if (contacts.length === 0) {
                    logger_1.logger.error('❌ [AUTOMATION] No valid contacts found');
                    await progress.emitError('init', 'No valid contacts found. Contacts must be active and have email addresses.');
                    return;
                }
                await progress.emitStepComplete('init', `${contacts.length} contacts validated`);
                await progress.emitStepStart('video_generation', 'Starting AI video generation...');
                const criticalRiverVideoUrl = 'https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/demo-videos/criticalriver-demo.mp4';
                const videoCampaigns = [];
                const errors = [];
                for (let i = 0; i < contacts.length; i++) {
                    const contact = contacts[i];
                    const progressPercent = ((i / contacts.length) * 100);
                    await progress.emitProgress('video_generation', progressPercent, `Generating video ${i + 1} of ${contacts.length} for ${contact.firstName} ${contact.lastName}`);
                    try {
                        const companyName = contact.company?.name || 'your company';
                        logger_1.logger.info(`📹 [AUTOMATION] Creating video campaign for ${contact.firstName} ${contact.lastName} (${contact.email})`);
                        let emailTemplate;
                        if (emailTemplateType === 'existing' && emailTemplateId) {
                            logger_1.logger.info(`📧 [AUTOMATION] Using existing email template ${emailTemplateId}`);
                            emailTemplate = await prisma_1.prisma.emailTemplate.findUnique({
                                where: { id: emailTemplateId }
                            });
                            if (!emailTemplate) {
                                throw new Error(`Email template ${emailTemplateId} not found`);
                            }
                        }
                        else {
                            const personalizedMessage = message
                                ? message
                                    .replace(/\{\{firstName\}\}/g, contact.firstName || 'there')
                                    .replace(/\{\{lastName\}\}/g, contact.lastName || '')
                                    .replace(/\{\{companyName\}\}/g, companyName)
                                : `Hi ${contact.firstName},\n\nI noticed ${companyName} uses NetSuite for financial operations.\n\nOur AI-powered automation solution can help you cut month-end close time by 50%, eliminate manual data entry errors, and automate recurring journal entries.\n\nWatch this demo to see how ${companyName} can benefit.\n\nReady to transform your NetSuite workflow? Book a demo at your convenience.\n\nBest regards, BrandMonkz Team`;
                            logger_1.logger.info(`📧 [AUTOMATION] Auto-generating email template from wizard message`);
                            emailTemplate = await prisma_1.prisma.emailTemplate.create({
                                data: {
                                    name: `${campaignName} - ${contact.firstName} ${contact.lastName}`,
                                    subject: `${contact.firstName}, ${campaignName}`,
                                    htmlContent: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  ${personalizedMessage.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('\n')}

  {{VIDEO_PLACEHOLDER}}

  <p>Best regards,<br>BrandMonkz Team</p>
</div>`,
                                    textContent: personalizedMessage,
                                    userId,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            });
                        }
                        logger_1.logger.info(`📧 [AUTOMATION] Email template ready: ${emailTemplate.id}`);
                        let videoUrl = criticalRiverVideoUrl;
                        let shouldGenerateVideo = true;
                        if (videoType === 'existing' && existingVideoId) {
                            logger_1.logger.info(`📹 [AUTOMATION] Using existing video campaign ${existingVideoId}`);
                            const existingVideoCampaign = await prisma_1.prisma.videoCampaign.findUnique({
                                where: { id: existingVideoId }
                            });
                            if (existingVideoCampaign && existingVideoCampaign.videoUrl) {
                                videoUrl = existingVideoCampaign.videoUrl;
                                shouldGenerateVideo = false;
                                logger_1.logger.info(`📹 [AUTOMATION] Using existing video URL: ${videoUrl}`);
                            }
                        }
                        const narrationScript = message
                            ? message
                                .replace(/\{\{firstName\}\}/g, contact.firstName || 'there')
                                .replace(/\{\{lastName\}\}/g, contact.lastName || '')
                                .replace(/\{\{companyName\}\}/g, companyName)
                            : `Hi ${contact.firstName},\n\nI noticed ${companyName} uses NetSuite for financial operations.\n\nOur AI-powered automation solution can help you cut month-end close time by 50%, eliminate manual data entry errors, and automate recurring journal entries.\n\nWatch this demo to see how ${companyName} can benefit.\n\nReady to transform your NetSuite workflow? Book a demo at your convenience.\n\nBest regards, BrandMonkz Team`;
                        const videoCampaign = await prisma_1.prisma.videoCampaign.create({
                            data: {
                                name: `${campaignName} - ${contact.firstName} ${contact.lastName}`,
                                narrationScript,
                                tone: 'professional',
                                videoSource: 'URL',
                                customVideoUrl: videoType === 'existing' ? videoUrl : criticalRiverVideoUrl,
                                voiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
                                userLogoUrl: 'https://brandmonkz.com/logo.png',
                                bgmUrl: 'https://d19p5y1qdvfz0x.cloudfront.net/bgm.mp3',
                                bgmVolume: 0.1,
                                textOverlays: [
                                    {
                                        text: companyName,
                                        position: 'top',
                                        duration: 5,
                                        fontSize: 60,
                                        color: 'white'
                                    }
                                ],
                                userId,
                                status: shouldGenerateVideo ? 'DRAFT' : 'READY',
                                videoUrl: shouldGenerateVideo ? null : videoUrl,
                                emailTemplateId: emailTemplate.id
                            }
                        });
                        videoCampaigns.push({
                            campaignId: videoCampaign.id,
                            contactId: contact.id,
                            contactName: `${contact.firstName} ${contact.lastName}`,
                            contactEmail: contact.email,
                            companyName
                        });
                        logger_1.logger.info(`✅ [AUTOMATION] Video campaign created: ${videoCampaign.id} for ${contact.email}`);
                        if (shouldGenerateVideo && videoType === 'ai-generate') {
                            try {
                                const videoServiceUrl = process.env.VIDEO_GENERATOR_SERVICE_URL || 'http://localhost:5002';
                                logger_1.logger.info(`📹 [AUTOMATION] Triggering AI video generation for campaign ${videoCampaign.id}`);
                                const videoGenResponse = await axios_1.default.post(`${videoServiceUrl}/api/video/generate`, {
                                    campaignId: videoCampaign.id,
                                    narrationScript: videoCampaign.narrationScript,
                                    templateUrl: criticalRiverVideoUrl,
                                    voiceId: videoCampaign.voiceId,
                                    userLogoUrl: videoCampaign.userLogoUrl,
                                    bgmUrl: videoCampaign.bgmUrl,
                                    textOverlays: videoCampaign.textOverlays
                                }, {
                                    timeout: 10000
                                });
                                logger_1.logger.info(`✅ [AUTOMATION] Video generation started: ${videoGenResponse.data.jobId}`);
                                await prisma_1.prisma.videoCampaign.update({
                                    where: { id: videoCampaign.id },
                                    data: {
                                        status: 'PROCESSING',
                                        processingStartedAt: new Date(),
                                        progressPercent: 0
                                    }
                                });
                                pollVideoStatus(videoGenResponse.data.jobId, videoCampaign.id).catch((err) => {
                                    logger_1.logger.error('[AUTOMATION] Poll video status error:', err);
                                });
                            }
                            catch (videoError) {
                                logger_1.logger.error(`⚠️ [AUTOMATION] Video generation failed for campaign ${videoCampaign.id}:`, videoError.message);
                                await prisma_1.prisma.videoCampaign.update({
                                    where: { id: videoCampaign.id },
                                    data: {
                                        status: 'FAILED',
                                        generationError: `Video generation failed: ${videoError.message}`
                                    }
                                });
                            }
                        }
                        else if (videoType === 'existing') {
                            logger_1.logger.info(`📹 [AUTOMATION] Using existing video - skipping generation for campaign ${videoCampaign.id}`);
                            if (emailTemplate && videoUrl) {
                                const videoEmbedHtml = `
<!-- Existing video embedded from campaign -->
<div style="margin: 20px 0; text-align: center; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 30px; border-radius: 12px;">
  <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
    <video controls style="width: 100%; display: block;">
      <source src="${videoUrl}" type="video/mp4">
      Your email client doesn't support video playback.
    </video>
    <div style="padding: 15px; text-align: center;">
      <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;">Can't play the video?</p>
      <a href="${videoUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Watch in Browser</a>
    </div>
  </div>
</div>`;
                                const currentHtmlContent = emailTemplate.htmlContent || '';
                                let updatedHtmlContent;
                                if (currentHtmlContent.includes('{{VIDEO_PLACEHOLDER}}')) {
                                    updatedHtmlContent = currentHtmlContent.replace('{{VIDEO_PLACEHOLDER}}', videoEmbedHtml);
                                }
                                else {
                                    updatedHtmlContent = `${videoEmbedHtml}\n\n${currentHtmlContent}`;
                                }
                                await prisma_1.prisma.emailTemplate.update({
                                    where: { id: emailTemplate.id },
                                    data: { htmlContent: updatedHtmlContent }
                                });
                                logger_1.logger.info(`✅ [AUTOMATION] Existing video embedded into email template ${emailTemplate.id}`);
                            }
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`❌ [AUTOMATION] Failed to create campaign for contact ${contact.id}:`, error);
                        errors.push({
                            contactId: contact.id,
                            contactEmail: contact.email,
                            error: error.message
                        });
                    }
                }
                await progress.emitStepComplete('video_generation', `Created ${videoCampaigns.length} video campaigns`);
                await progress.emitStepStart('email_preparation', 'Preparing email campaign content...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                await progress.emitProgress('email_preparation', 50, 'Crafting personalized email content');
                await new Promise(resolve => setTimeout(resolve, 500));
                await progress.emitStepComplete('email_preparation', 'Email content ready');
                await progress.emitStepStart('sending', 'Queuing campaigns for delivery...');
                await new Promise(resolve => setTimeout(resolve, 500));
                await progress.emitProgress('sending', 100, 'All campaigns queued');
                await progress.emitStepComplete('sending', `${videoCampaigns.length} campaigns queued for delivery`);
                logger_1.logger.info(`✅ [AUTOMATION] Campaign automation complete: ${videoCampaigns.length} campaigns created, ${errors.length} errors`);
                await progress.emitComplete();
            }
            catch (asyncError) {
                logger_1.logger.error('❌ [AUTOMATION] Async campaign automation error:', asyncError);
                await progress.emitError('video_generation', `Campaign failed: ${asyncError.message}`);
            }
        })();
    }
    catch (error) {
        logger_1.logger.error('❌ [AUTOMATION] Campaign automation error:', error);
        logger_1.logger.error('❌ [AUTOMATION] Error stack:', error.stack);
        logger_1.logger.error('❌ [AUTOMATION] Error details:', {
            message: error.message,
            name: error.name,
            code: error.code
        });
        return res.status(500).json({
            error: 'Campaign automation failed',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
exports.default = router;
//# sourceMappingURL=automation.routes.js.map