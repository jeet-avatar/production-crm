"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendScheduledCampaigns = sendScheduledCampaigns;
const prisma_1 = require("../prisma");
const logger_1 = require("../utils/logger");
async function sendScheduledCampaigns() {
    const startTime = Date.now();
    logger_1.logger.info('🕐 Starting scheduled campaign check...');
    try {
        const now = new Date();
        const scheduledCampaigns = await prisma_1.prisma.campaign.findMany({
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
            logger_1.logger.info('✓ No campaigns to send at this time');
            return { processed: 0, sent: 0, failed: 0 };
        }
        logger_1.logger.info(`📧 Found ${scheduledCampaigns.length} campaign(s) to process`);
        let totalSent = 0;
        let totalFailed = 0;
        for (const campaign of scheduledCampaigns) {
            try {
                logger_1.logger.info(`Processing campaign: ${campaign.name} (${campaign.id})`);
                const videoCampaigns = await prisma_1.prisma.videoCampaign.findMany({
                    where: {
                        userId: campaign.userId,
                        name: {
                            contains: campaign.name.split(' - ')[0]
                        },
                        status: 'READY'
                    },
                    include: {
                        user: true
                    }
                });
                if (videoCampaigns.length === 0) {
                    logger_1.logger.warn(`⚠️ No ready videos found for campaign ${campaign.id}`);
                    await prisma_1.prisma.campaign.update({
                        where: { id: campaign.id },
                        data: {
                            status: 'PAUSED'
                        }
                    });
                    totalFailed++;
                    continue;
                }
                logger_1.logger.info(`Found ${videoCampaigns.length} ready video(s) for campaign`);
                const contactIds = videoCampaigns.map(vc => {
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
                await prisma_1.prisma.campaign.update({
                    where: { id: campaign.id },
                    data: {
                        status: 'SENT',
                        sentAt: new Date(),
                        totalSent: videoCampaigns.length
                    }
                });
                logger_1.logger.info(`✅ Campaign ${campaign.id} marked as SENT (${videoCampaigns.length} recipients)`);
                totalSent += videoCampaigns.length;
            }
            catch (error) {
                logger_1.logger.error(`❌ Failed to process campaign ${campaign.id}:`, error);
                await prisma_1.prisma.campaign.update({
                    where: { id: campaign.id },
                    data: {
                        status: 'PAUSED'
                    }
                });
                totalFailed++;
            }
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info(`✅ Scheduled campaign job completed in ${duration}ms`);
        logger_1.logger.info(`   Campaigns processed: ${scheduledCampaigns.length}`);
        logger_1.logger.info(`   Emails sent: ${totalSent}`);
        logger_1.logger.info(`   Failed: ${totalFailed}`);
        return {
            processed: scheduledCampaigns.length,
            sent: totalSent,
            failed: totalFailed
        };
    }
    catch (error) {
        logger_1.logger.error('❌ Scheduled campaign job failed:', error);
        throw error;
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
if (require.main === module) {
    sendScheduledCampaigns()
        .then((result) => {
        logger_1.logger.info('Job result:', result);
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('Job failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=sendScheduledCampaigns.js.map