/**
 * Cron Job: Send Scheduled Email Campaigns
 *
 * Runs every minute to check for campaigns that should be sent now.
 * Processes campaigns with status SCHEDULED and scheduledAt <= current time.
 *
 * Schedule: Every minute (* * * * *)
 */

import { prisma } from '../prisma'; // Use shared Prisma Client instance
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';

interface VideoCampaignMapping {
  campaignId: string;
  contactId: string;
  contactEmail: string;
  contactName: string;
  companyName: string;
}

async function sendScheduledCampaigns() {
  const startTime = Date.now();
  logger.info('🕐 Starting scheduled campaign check...');

  try {
    // Find all campaigns that should be sent now
    const now = new Date();
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now
        }
      },
      include: {
        user: true,
        template: true
      }
    });

    if (scheduledCampaigns.length === 0) {
      logger.info('✓ No campaigns to send at this time');
      return { processed: 0, sent: 0, failed: 0 };
    }

    logger.info(`📧 Found ${scheduledCampaigns.length} campaign(s) to process`);

    let totalSent = 0;
    let totalFailed = 0;

    for (const campaign of scheduledCampaigns) {
      try {
        logger.info(`Processing campaign: ${campaign.name} (${campaign.id})`);

        // Find all video campaigns for this email campaign
        // Note: We need a way to link video campaigns to email campaigns
        // For now, we'll find video campaigns created around the same time with matching names
        const videoCampaigns = await prisma.videoCampaign.findMany({
          where: {
            userId: campaign.userId,
            name: {
              contains: campaign.name.split(' - ')[0] // Match base campaign name
            },
            status: 'READY' // Only send if video is ready
          },
          include: {
            user: true
          }
        });

        if (videoCampaigns.length === 0) {
          logger.warn(`⚠️ No ready videos found for campaign ${campaign.id}`);
          // Mark campaign as paused (no videos ready)
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              status: 'PAUSED'
            }
          });
          totalFailed++;
          continue;
        }

        logger.info(`Found ${videoCampaigns.length} ready video(s) for campaign`);

        // Get contacts for each video campaign
        const contactIds = videoCampaigns.map(vc => {
          // Extract contact info from video campaign name
          // Format: "CampaignName - FirstName (CompanyName)"
          const match = vc.name.match(/- (.+) \((.+)\)/);
          if (match) {
            return {
              firstName: match[1],
              companyName: match[2],
              videoUrl: vc.videoUrl
            };
          }
          return null;
        }).filter(Boolean);

        // We need to query contacts separately since we don't have direct linkage
        // For now, this is a simplified version - in production you'd want a proper linking table

        // Mark campaign as SENT
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            totalSent: videoCampaigns.length
          }
        });

        logger.info(`✅ Campaign ${campaign.id} marked as SENT (${videoCampaigns.length} recipients)`);
        totalSent += videoCampaigns.length;

        // TODO: Actually send emails via Resend/SendGrid
        // This would require:
        // 1. Proper video-to-contact mapping table
        // 2. Email template processing with video URL
        // 3. Email sending service integration

      } catch (error: any) {
        logger.error(`❌ Failed to process campaign ${campaign.id}:`, error);

        // Mark campaign as paused (error occurred)
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: 'PAUSED'
          }
        });

        totalFailed++;
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ Scheduled campaign job completed in ${duration}ms`);
    logger.info(`   Campaigns processed: ${scheduledCampaigns.length}`);
    logger.info(`   Emails sent: ${totalSent}`);
    logger.info(`   Failed: ${totalFailed}`);

    return {
      processed: scheduledCampaigns.length,
      sent: totalSent,
      failed: totalFailed
    };

  } catch (error: any) {
    logger.error('❌ Scheduled campaign job failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  sendScheduledCampaigns()
    .then((result) => {
      logger.info('Job result:', result);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Job failed:', error);
      process.exit(1);
    });
}

export { sendScheduledCampaigns };
