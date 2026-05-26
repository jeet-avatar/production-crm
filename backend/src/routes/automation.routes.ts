import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import axios from 'axios';
import { CampaignProgressEmitter } from '../utils/campaign-progress';

const router = Router();

router.use(authenticate);

/**
 * SSE endpoint for real-time campaign progress updates
 * GET /api/automation/campaign-progress/:campaignId
 */
router.get('/campaign-progress/:campaignId', (req, res) => {
  const { campaignId } = req.params;

  logger.info(`[SSE] Client connecting to campaign progress: ${campaignId}`);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Register this client for progress updates
  CampaignProgressEmitter.registerClient(campaignId, res);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', campaignId })}\n\n`);

  // Clean up on client disconnect
  req.on('close', () => {
    logger.info(`[SSE] Client disconnected from campaign: ${campaignId}`);
    CampaignProgressEmitter.unregisterClient(campaignId, res);
  });
});

/**
 * Poll video generation status and update campaign when complete
 */
async function pollVideoStatus(externalJobId: string, campaignId: string) {
  const videoServiceUrl = process.env.VIDEO_GENERATOR_SERVICE_URL || 'http://localhost:5002';
  const maxAttempts = 120; // Poll for up to 20 minutes (120 * 10 seconds)
  let attempts = 0;

  const poll = async () => {
    try {
      attempts++;
      logger.info(`[AUTOMATION-POLL] Checking status for job ${externalJobId}, campaign ${campaignId} (attempt ${attempts}/${maxAttempts})`);

      const response = await axios.get(`${videoServiceUrl}/api/video/status/${externalJobId}`);
      const status = response.data;

      logger.info(`[AUTOMATION-POLL] Status: ${status.status}, Progress: ${status.progress}%`);

      // Update campaign progress
      await prisma.videoCampaign.update({
        where: { id: campaignId },
        data: {
          progressPercent: status.progress || 0
        }
      });

      // If completed, update campaign with video URL
      if (status.status === 'completed' && status.videoUrl) {
        logger.info(`[AUTOMATION-POLL] Video ready! Updating campaign ${campaignId}`);

        // First, fetch the campaign to check if it has a linked email template
        const campaign = await prisma.videoCampaign.findUnique({
          where: { id: campaignId },
          include: {
            emailTemplate: true
          }
        });

        // Update campaign with video URL
        await prisma.videoCampaign.update({
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

        // AUTO-EMBED: If campaign has a linked email template, embed the video
        if (campaign?.emailTemplateId && campaign.emailTemplate) {
          logger.info(`[AUTO-EMBED] Embedding video into email template ${campaign.emailTemplateId}`);

          // Generate video embed HTML
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

          // Get current email template content
          const currentHtmlContent = campaign.emailTemplate.htmlContent || '';
          const currentTextContent = campaign.emailTemplate.textContent || '';

          // Check if template has a {{VIDEO_PLACEHOLDER}} tag
          let updatedHtmlContent: string;
          if (currentHtmlContent.includes('{{VIDEO_PLACEHOLDER}}')) {
            // Replace placeholder with video embed
            updatedHtmlContent = currentHtmlContent.replace('{{VIDEO_PLACEHOLDER}}', videoEmbedHtml);
            logger.info(`[AUTO-EMBED] Replaced {{VIDEO_PLACEHOLDER}} in email template`);
          } else {
            // Prepend video at the top of the email
            updatedHtmlContent = `${videoEmbedHtml}\n\n${currentHtmlContent || currentTextContent}`;
            logger.info(`[AUTO-EMBED] Prepended video to email template`);
          }

          // Update the email template
          await prisma.emailTemplate.update({
            where: { id: campaign.emailTemplateId },
            data: {
              htmlContent: updatedHtmlContent
            }
          });

          logger.info(`✅ [AUTO-EMBED] Video successfully embedded into email template ${campaign.emailTemplateId}`);
        } else {
          logger.info(`[AUTO-EMBED] No email template linked to campaign ${campaignId} - skipping auto-embed`);
        }

        logger.info(`✅ [AUTOMATION-POLL] Campaign ${campaignId} completed successfully`);
        return; // Done polling
      }

      // If failed, update campaign with error
      if (status.status === 'failed') {
        logger.error(`[AUTOMATION-POLL] Video generation failed for campaign ${campaignId}`);

        await prisma.videoCampaign.update({
          where: { id: campaignId },
          data: {
            status: 'FAILED',
            generationError: status.error || 'Video generation failed'
          }
        });

        return; // Done polling
      }

      // Continue polling if not complete and haven't exceeded max attempts
      if (attempts < maxAttempts) {
        setTimeout(poll, 10000); // Poll every 10 seconds
      } else {
        logger.error(`[AUTOMATION-POLL] Max polling attempts reached for campaign ${campaignId}`);
        await prisma.videoCampaign.update({
          where: { id: campaignId },
          data: {
            status: 'FAILED',
            generationError: 'Video generation timeout - exceeded maximum wait time'
          }
        });
      }

    } catch (error: any) {
      logger.error(`[AUTOMATION-POLL] Error polling status:`, error.message);

      // Retry if we haven't exceeded max attempts
      if (attempts < maxAttempts) {
        setTimeout(poll, 10000);
      }
    }
  };

  // Start polling after 10 seconds (give video service time to start)
  setTimeout(poll, 10000);
}

/**
 * POST /api/automation/launch-video-campaign
 *
 * SIMPLIFIED One-click automation workflow with real-time progress tracking:
 * 1. Validates selected contacts
 * 2. Returns campaign ID immediately for SSE connection
 * 3. Runs video campaign creation asynchronously with progress updates
 * 4. Emits progress events via SSE for real-time UI updates
 *
 * This approach provides professional UX with transparent progress tracking.
 */
router.post('/launch-video-campaign', async (req, res) => {
  logger.info('🎯 [AUTOMATION] Route handler called - ENTRY POINT');
  logger.info('🎯 [AUTOMATION] req.user exists:', !!req.user);
  logger.info('🎯 [AUTOMATION] req.body:', JSON.stringify(req.body));

  try {
    logger.info('🎯 [AUTOMATION] Inside try block');
    const userId = req.user?.id;
    logger.info('🎯 [AUTOMATION] userId:', userId);

    if (!userId) {
      logger.error('❌ [AUTOMATION] No userId - returning 401');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      contactIds = [],
      campaignName = 'NetSuite AI Automation Demo',
      maxContacts = 10,
      message, // Custom message from wizard
      videoType, // 'ai-generate' or 'existing'
      existingVideoId, // If videoType is 'existing'
      emailTemplateId, // If emailTemplateType is 'existing'
      emailTemplateType, // 'auto-generate' or 'existing'
      sendTime, // 'immediate' or 'scheduled'
      scheduledDate,
      scheduledTime
    } = req.body;

    // Generate unique campaign ID for progress tracking
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const progress = new CampaignProgressEmitter(campaignId);

    logger.info('🚀 [AUTOMATION] Starting one-click video campaign automation', {
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

    // Validate contact IDs
    if (!contactIds || contactIds.length === 0) {
      logger.error('❌ [AUTOMATION] No contact IDs provided');
      return res.status(400).json({ error: 'At least one contact must be selected' });
    }

    if (contactIds.length > maxContacts) {
      logger.error(`❌ [AUTOMATION] Too many contacts (${contactIds.length} > ${maxContacts})`);
      return res.status(400).json({
        error: `Maximum ${maxContacts} contacts allowed per campaign`
      });
    }

    // Return campaign ID immediately for SSE connection
    res.json({
      success: true,
      campaignId,
      message: 'Campaign started. Connect to SSE endpoint for progress updates.',
      contactCount: contactIds.length
    });

    // Run campaign asynchronously with progress tracking
    (async () => {
      try {
        // Step 1: Initialize
        await progress.emitStepStart('init', 'Validating contacts and preparing campaign...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch selected contacts with validation criteria
        // Support team collaboration: get account owner ID
        const accountOwnerId = req.user?.teamRole === 'OWNER'
          ? req.user.id
          : (req.user?.accountOwnerId || userId);

        logger.info(`[AUTOMATION] Team collaboration check - userId: ${userId}, teamRole: ${req.user?.teamRole}, accountOwnerId: ${accountOwnerId}`);

        // Fetch contacts owned by user OR by account owner (team access)
        const contacts = await prisma.contact.findMany({
          where: {
            id: { in: contactIds },
            OR: [
              { userId }, // User's own contacts
              { userId: accountOwnerId } // Account owner's contacts (team access)
            ],
            isActive: true,
            email: { not: null }
          },
          include: {
            company: true
          }
        });

        logger.info(`✅ [AUTOMATION] Found ${contacts.length} valid contact(s)`, {
          requestedIds: contactIds,
          foundContacts: contacts.map(c => ({ id: c.id, email: c.email, ownerId: c.userId }))
        });

        if (contacts.length === 0) {
          logger.error('❌ [AUTOMATION] No valid contacts found');
          await progress.emitError('init', 'No valid contacts found. Contacts must be active and have email addresses.');
          return;
        }

        await progress.emitStepComplete('init', `${contacts.length} contacts validated`);

        // Step 2: Generate Videos
        await progress.emitStepStart('video_generation', 'Starting AI video generation...');

        // Critical River demo video URL (same as manual flow)
        const criticalRiverVideoUrl = 'https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/demo-videos/criticalriver-demo.mp4';

        const videoCampaigns = [];
        const errors = [];

        // For each contact, create a video campaign using the same parameters as manual flow
        for (let i = 0; i < contacts.length; i++) {
          const contact = contacts[i];
          const progressPercent = ((i / contacts.length) * 100);

          await progress.emitProgress('video_generation', progressPercent,
            `Generating video ${i + 1} of ${contacts.length} for ${contact.firstName} ${contact.lastName}`);

          try {
            const companyName = contact.company?.name || 'your company';

            logger.info(`📹 [AUTOMATION] Creating video campaign for ${contact.firstName} ${contact.lastName} (${contact.email})`);

            // Step 1: Handle email template based on wizard selection
            let emailTemplate;

            if (emailTemplateType === 'existing' && emailTemplateId) {
              // Use existing email template
              logger.info(`📧 [AUTOMATION] Using existing email template ${emailTemplateId}`);
              emailTemplate = await prisma.emailTemplate.findUnique({
                where: { id: emailTemplateId }
              });

              if (!emailTemplate) {
                throw new Error(`Email template ${emailTemplateId} not found`);
              }
            } else {
              // Auto-generate email template from wizard message
              const personalizedMessage = message
                ? message
                    .replace(/\{\{firstName\}\}/g, contact.firstName || 'there')
                    .replace(/\{\{lastName\}\}/g, contact.lastName || '')
                    .replace(/\{\{companyName\}\}/g, companyName)
                : `Hi ${contact.firstName},\n\nI noticed ${companyName} uses NetSuite for financial operations.\n\nOur AI-powered automation solution can help you cut month-end close time by 50%, eliminate manual data entry errors, and automate recurring journal entries.\n\nWatch this demo to see how ${companyName} can benefit.\n\nReady to transform your NetSuite workflow? Book a demo at your convenience.\n\nBest regards, BrandMonkz Team`;

              logger.info(`📧 [AUTOMATION] Auto-generating email template from wizard message`);

              emailTemplate = await prisma.emailTemplate.create({
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

            logger.info(`📧 [AUTOMATION] Email template ready: ${emailTemplate.id}`);

            // Step 2: Handle video selection based on wizard choice
            let videoUrl = criticalRiverVideoUrl; // Default
            let shouldGenerateVideo = true;

            if (videoType === 'existing' && existingVideoId) {
              // Use existing video campaign
              logger.info(`📹 [AUTOMATION] Using existing video campaign ${existingVideoId}`);
              const existingVideoCampaign = await prisma.videoCampaign.findUnique({
                where: { id: existingVideoId }
              });

              if (existingVideoCampaign && existingVideoCampaign.videoUrl) {
                videoUrl = existingVideoCampaign.videoUrl;
                shouldGenerateVideo = false;
                logger.info(`📹 [AUTOMATION] Using existing video URL: ${videoUrl}`);
              }
            }

            // Generate narration script from wizard message
            const narrationScript = message
              ? message
                  .replace(/\{\{firstName\}\}/g, contact.firstName || 'there')
                  .replace(/\{\{lastName\}\}/g, contact.lastName || '')
                  .replace(/\{\{companyName\}\}/g, companyName)
              : `Hi ${contact.firstName},\n\nI noticed ${companyName} uses NetSuite for financial operations.\n\nOur AI-powered automation solution can help you cut month-end close time by 50%, eliminate manual data entry errors, and automate recurring journal entries.\n\nWatch this demo to see how ${companyName} can benefit.\n\nReady to transform your NetSuite workflow? Book a demo at your convenience.\n\nBest regards, BrandMonkz Team`;

            // Step 3: Create video campaign linked to email template
            const videoCampaign = await prisma.videoCampaign.create({
              data: {
                name: `${campaignName} - ${contact.firstName} ${contact.lastName}`,
                narrationScript,
                tone: 'professional',
                videoSource: 'URL', // Always URL for automation
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
                emailTemplateId: emailTemplate.id // ✅ Link email template for auto-embedding
              }
            });

        videoCampaigns.push({
          campaignId: videoCampaign.id,
          contactId: contact.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          contactEmail: contact.email,
          companyName
        });

            logger.info(`✅ [AUTOMATION] Video campaign created: ${videoCampaign.id} for ${contact.email}`);

            // Only trigger video generation if using AI-generate mode
            if (shouldGenerateVideo && videoType === 'ai-generate') {
              try {
                const videoServiceUrl = process.env.VIDEO_GENERATOR_SERVICE_URL || 'http://localhost:5002';

                logger.info(`📹 [AUTOMATION] Triggering AI video generation for campaign ${videoCampaign.id}`);

                const videoGenResponse = await axios.post(`${videoServiceUrl}/api/video/generate`, {
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

                logger.info(`✅ [AUTOMATION] Video generation started: ${videoGenResponse.data.jobId}`);

                // Update campaign status to PROCESSING
                await prisma.videoCampaign.update({
                  where: { id: videoCampaign.id },
                  data: {
                    status: 'PROCESSING',
                    processingStartedAt: new Date(),
                    progressPercent: 0
                  }
                });

                // Start background polling for video completion
                pollVideoStatus(videoGenResponse.data.jobId, videoCampaign.id).catch((err) => {
                  logger.error('[AUTOMATION] Poll video status error:', err);
                });

              } catch (videoError: any) {
                logger.error(`⚠️ [AUTOMATION] Video generation failed for campaign ${videoCampaign.id}:`, videoError.message);
                // Don't fail the whole request - mark campaign as failed
                await prisma.videoCampaign.update({
                  where: { id: videoCampaign.id },
                  data: {
                    status: 'FAILED',
                    generationError: `Video generation failed: ${videoError.message}`
                  }
                });
              }
            } else if (videoType === 'existing') {
              logger.info(`📹 [AUTOMATION] Using existing video - skipping generation for campaign ${videoCampaign.id}`);

              // If using existing video, immediately embed into email template
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
                let updatedHtmlContent: string;

                if (currentHtmlContent.includes('{{VIDEO_PLACEHOLDER}}')) {
                  updatedHtmlContent = currentHtmlContent.replace('{{VIDEO_PLACEHOLDER}}', videoEmbedHtml);
                } else {
                  updatedHtmlContent = `${videoEmbedHtml}\n\n${currentHtmlContent}`;
                }

                await prisma.emailTemplate.update({
                  where: { id: emailTemplate.id },
                  data: { htmlContent: updatedHtmlContent }
                });

                logger.info(`✅ [AUTOMATION] Existing video embedded into email template ${emailTemplate.id}`);
              }
            }

          } catch (error: any) {
            logger.error(`❌ [AUTOMATION] Failed to create campaign for contact ${contact.id}:`, error);
            errors.push({
              contactId: contact.id,
              contactEmail: contact.email,
              error: error.message
            });
          }
        }

        await progress.emitStepComplete('video_generation', `${videoCampaigns.length} video ${videoCampaigns.length === 1 ? 'campaign' : 'campaigns'} created and queued for processing`);

        // Step 3: Email Preparation (actual template creation with realistic timing)
        await progress.emitStepStart('email_preparation', 'Preparing personalized email templates...');
        await new Promise(resolve => setTimeout(resolve, 800));
        await progress.emitProgress('email_preparation', 50, 'Email templates created with video placeholders');
        await new Promise(resolve => setTimeout(resolve, 700));
        await progress.emitStepComplete('email_preparation', `${videoCampaigns.length} email ${videoCampaigns.length === 1 ? 'template' : 'templates'} ready with embedded videos`);

        // Step 4: Campaign Status
        await progress.emitStepStart('sending', 'Finalizing campaign setup...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Determine realistic status message based on video type
        const statusMessage = videoType === 'ai-generate'
          ? `${videoCampaigns.length} campaigns queued. Videos will be generated and embedded automatically (2-5 min per video).`
          : `${videoCampaigns.length} campaigns ready with embedded videos. Check your campaigns page to send emails.`;

        await progress.emitProgress('sending', 100, statusMessage);
        await progress.emitStepComplete('sending', statusMessage);

        // Step 5: Complete
        logger.info(`✅ [AUTOMATION] Campaign automation complete: ${videoCampaigns.length} campaigns created, ${errors.length} errors`);
        await progress.emitComplete();

      } catch (asyncError: any) {
        logger.error('❌ [AUTOMATION] Async campaign automation error:', asyncError);
        await progress.emitError('video_generation', `Campaign failed: ${asyncError.message}`);
      }
    })(); // Run async immediately

  } catch (error: any) {
    logger.error('❌ [AUTOMATION] Campaign automation error:', error);
    logger.error('❌ [AUTOMATION] Error stack:', error.stack);
    logger.error('❌ [AUTOMATION] Error details:', {
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

export default router;
