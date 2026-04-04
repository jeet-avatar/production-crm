/**
 * Cron Job: Process Video Campaign Generation
 *
 * Runs every 5 minutes to process pending video campaigns.
 * Picks up DRAFT status videos and triggers generation.
 *
 * Schedule: Every 5 minutes
 */

import { prisma } from '../prisma'; // Use shared Prisma Client instance
import { logger } from '../utils/logger';
import fetch from 'node-fetch';

const VIDEO_GENERATOR_URL = process.env.VIDEO_GENERATOR_URL || process.env.VIDEO_GENERATOR_SERVICE_URL || 'http://localhost:5002';

async function processVideoGeneration() {
  const startTime = Date.now();
  logger.info('🎬 Starting video generation job...');

  try {
    // Find all DRAFT video campaigns that need generation
    const pendingVideos = await prisma.videoCampaign.findMany({
      where: {
        status: 'DRAFT',
        videoUrl: null // Not yet generated
      },
      include: {
        user: true,
        template: true
      },
      orderBy: {
        createdAt: 'asc' // Process oldest first
      },
      take: 5 // Process max 5 at a time to avoid overwhelming the system
    });

    if (pendingVideos.length === 0) {
      logger.info('✓ No pending video campaigns to process');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    logger.info(`🎥 Found ${pendingVideos.length} pending video(s) to generate`);

    let succeeded = 0;
    let failed = 0;

    for (const video of pendingVideos) {
      try {
        logger.info(`Processing video campaign: ${video.name} (${video.id})`);

        // Mark as GENERATING
        await prisma.videoCampaign.update({
          where: { id: video.id },
          data: {
            status: 'GENERATING',
            processingStartedAt: new Date(),
            progressPercent: 0
          }
        });

        // Call video generator service
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

        logger.info(`Calling video generator: ${VIDEO_GENERATOR_URL}/api/video/generate`);

        const response = await fetch(`${VIDEO_GENERATOR_URL}/api/video/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(videoRequest),
          timeout: 300000 // 5 minute timeout
        });

        if (!response.ok) {
          throw new Error(`Video generator returned ${response.status}: ${await response.text()}`);
        }

        const result = await response.json() as any;

        if (result.videoUrl) {
          // Update with generated video URL
          await prisma.videoCampaign.update({
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

          logger.info(`✅ Video generated successfully: ${result.videoUrl}`);
          succeeded++;
        } else {
          throw new Error('No video URL returned from generator');
        }

      } catch (error: any) {
        logger.error(`❌ Failed to generate video ${video.id}:`, error);

        // Mark as FAILED
        await prisma.videoCampaign.update({
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
    logger.info(`✅ Video generation job completed in ${duration}ms`);
    logger.info(`   Videos processed: ${pendingVideos.length}`);
    logger.info(`   Succeeded: ${succeeded}`);
    logger.info(`   Failed: ${failed}`);

    return {
      processed: pendingVideos.length,
      succeeded,
      failed
    };

  } catch (error: any) {
    logger.error('❌ Video generation job failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  processVideoGeneration()
    .then((result) => {
      logger.info('Job result:', result);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Job failed:', error);
      process.exit(1);
    });
}

export { processVideoGeneration };
