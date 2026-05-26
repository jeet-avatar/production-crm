/**
 * Cron Scheduler Service
 *
 * Manages all scheduled background jobs for the CRM system
 */

import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger';
import { sendScheduledCampaigns } from '../jobs/sendScheduledCampaigns';
import { processVideoGeneration } from '../jobs/processVideoGeneration';

class CronScheduler {
  private jobs: Map<string, ScheduledTask> = new Map();

  constructor() {
    this.setupJobs();
  }

  private setupJobs() {
    // Job 1: Send Scheduled Campaigns - Every minute
    const sendCampaignsJob = cron.schedule('* * * * *', async () => {
      logger.info('⏰ [CRON] Running: Send Scheduled Campaigns');
      try {
        await sendScheduledCampaigns();
      } catch (error: any) {
        logger.error('❌ [CRON] Send Scheduled Campaigns failed:', error);
      }
    });

    this.jobs.set('send-campaigns', sendCampaignsJob);

    // Job 2: Process Video Generation - Every 5 minutes
    const processVideoJob = cron.schedule('*/5 * * * *', async () => {
      logger.info('⏰ [CRON] Running: Process Video Generation');
      try {
        await processVideoGeneration();
      } catch (error: any) {
        logger.error('❌ [CRON] Process Video Generation failed:', error);
      }
    });

    this.jobs.set('process-videos', processVideoJob);

    logger.info('✅ Cron jobs configured:');
    logger.info('   - Send Scheduled Campaigns: Every minute (* * * * *)');
    logger.info('   - Process Video Generation: Every 5 minutes (*/5 * * * *)');
  }

  /**
   * Start all cron jobs
   */
  start() {
    logger.info('🚀 Starting cron scheduler...');

    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`   ✓ Started: ${name}`);
    });

    logger.info('✅ All cron jobs started');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    logger.info('🛑 Stopping cron scheduler...');

    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`   ✓ Stopped: ${name}`);
    });

    logger.info('✅ All cron jobs stopped');
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    const status: Record<string, string> = {};

    this.jobs.forEach((job, name) => {
      status[name] = 'active'; // node-cron doesn't have a getStatus method
    });

    return status;
  }

  /**
   * Start a specific job
   */
  startJob(jobName: string) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      logger.info(`✅ Started job: ${jobName}`);
    } else {
      logger.error(`❌ Job not found: ${jobName}`);
    }
  }

  /**
   * Stop a specific job
   */
  stopJob(jobName: string) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      logger.info(`✅ Stopped job: ${jobName}`);
    } else {
      logger.error(`❌ Job not found: ${jobName}`);
    }
  }
}

// Export singleton instance
export const cronScheduler = new CronScheduler();
