"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processVideoGeneration = processVideoGeneration;
const prisma_1 = require("../prisma");
const logger_1 = require("../utils/logger");
const node_fetch_1 = __importDefault(require("node-fetch"));
const VIDEO_GENERATOR_URL = process.env.VIDEO_GENERATOR_URL || process.env.VIDEO_GENERATOR_SERVICE_URL || 'http://localhost:5002';
async function processVideoGeneration() {
    const startTime = Date.now();
    logger_1.logger.info('🎬 Starting video generation job...');
    try {
        const pendingVideos = await prisma_1.prisma.videoCampaign.findMany({
            where: {
                status: 'DRAFT',
                videoUrl: null
            },
            include: {
                user: true,
                template: true
            },
            orderBy: {
                createdAt: 'asc'
            },
            take: 5
        });
        if (pendingVideos.length === 0) {
            logger_1.logger.info('✓ No pending video campaigns to process');
            return { processed: 0, succeeded: 0, failed: 0 };
        }
        logger_1.logger.info(`🎥 Found ${pendingVideos.length} pending video(s) to generate`);
        let succeeded = 0;
        let failed = 0;
        for (const video of pendingVideos) {
            try {
                logger_1.logger.info(`Processing video campaign: ${video.name} (${video.id})`);
                await prisma_1.prisma.videoCampaign.update({
                    where: { id: video.id },
                    data: {
                        status: 'GENERATING',
                        processingStartedAt: new Date(),
                        progressPercent: 0
                    }
                });
                const videoRequest = {
                    campaignId: video.id,
                    narrationScript: video.narrationScript,
                    templateUrl: video.template?.videoUrl || video.customVideoUrl,
                    voiceId: video.voiceId,
                    customVoiceUrl: video.customVoiceUrl,
                    clientLogoUrl: video.clientLogoUrl,
                    userLogoUrl: video.userLogoUrl,
                    bgmUrl: video.bgmUrl,
                    textOverlays: video.textOverlays
                };
                logger_1.logger.info(`Calling video generator: ${VIDEO_GENERATOR_URL}/api/video/generate`);
                const response = await (0, node_fetch_1.default)(`${VIDEO_GENERATOR_URL}/api/video/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(videoRequest),
                    timeout: 300000
                });
                if (!response.ok) {
                    throw new Error(`Video generator returned ${response.status}: ${await response.text()}`);
                }
                const result = await response.json();
                if (result.videoUrl) {
                    await prisma_1.prisma.videoCampaign.update({
                        where: { id: video.id },
                        data: {
                            status: 'READY',
                            videoUrl: result.videoUrl,
                            thumbnailUrl: result.thumbnailUrl,
                            duration: result.duration,
                            generatedAt: new Date(),
                            progressPercent: 100,
                            generationTime: result.generationTime
                        }
                    });
                    logger_1.logger.info(`✅ Video generated successfully: ${result.videoUrl}`);
                    succeeded++;
                }
                else {
                    throw new Error('No video URL returned from generator');
                }
            }
            catch (error) {
                logger_1.logger.error(`❌ Failed to generate video ${video.id}:`, error);
                await prisma_1.prisma.videoCampaign.update({
                    where: { id: video.id },
                    data: {
                        status: 'FAILED',
                        generationError: error.message,
                        progressPercent: 0
                    }
                });
                failed++;
            }
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info(`✅ Video generation job completed in ${duration}ms`);
        logger_1.logger.info(`   Videos processed: ${pendingVideos.length}`);
        logger_1.logger.info(`   Succeeded: ${succeeded}`);
        logger_1.logger.info(`   Failed: ${failed}`);
        return {
            processed: pendingVideos.length,
            succeeded,
            failed
        };
    }
    catch (error) {
        logger_1.logger.error('❌ Video generation job failed:', error);
        throw error;
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
if (require.main === module) {
    processVideoGeneration()
        .then((result) => {
        logger_1.logger.info('Job result:', result);
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('Job failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=processVideoGeneration.js.map