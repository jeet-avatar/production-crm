"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../utils/logger");
const sendScheduledCampaigns_1 = require("../jobs/sendScheduledCampaigns");
const processVideoGeneration_1 = require("../jobs/processVideoGeneration");
class CronScheduler {
    constructor() {
        this.jobs = new Map();
        this.setupJobs();
    }
    setupJobs() {
        const sendCampaignsJob = node_cron_1.default.schedule('* * * * *', async () => {
            logger_1.logger.info('⏰ [CRON] Running: Send Scheduled Campaigns');
            try {
                await (0, sendScheduledCampaigns_1.sendScheduledCampaigns)();
            }
            catch (error) {
                logger_1.logger.error('❌ [CRON] Send Scheduled Campaigns failed:', error);
            }
        });
        this.jobs.set('send-campaigns', sendCampaignsJob);
        const processVideoJob = node_cron_1.default.schedule('*/5 * * * *', async () => {
            logger_1.logger.info('⏰ [CRON] Running: Process Video Generation');
            try {
                await (0, processVideoGeneration_1.processVideoGeneration)();
            }
            catch (error) {
                logger_1.logger.error('❌ [CRON] Process Video Generation failed:', error);
            }
        });
        this.jobs.set('process-videos', processVideoJob);
        logger_1.logger.info('✅ Cron jobs configured:');
        logger_1.logger.info('   - Send Scheduled Campaigns: Every minute (* * * * *)');
        logger_1.logger.info('   - Process Video Generation: Every 5 minutes (*/5 * * * *)');
    }
    start() {
        logger_1.logger.info('🚀 Starting cron scheduler...');
        this.jobs.forEach((job, name) => {
            job.start();
            logger_1.logger.info(`   ✓ Started: ${name}`);
        });
        logger_1.logger.info('✅ All cron jobs started');
    }
    stop() {
        logger_1.logger.info('🛑 Stopping cron scheduler...');
        this.jobs.forEach((job, name) => {
            job.stop();
            logger_1.logger.info(`   ✓ Stopped: ${name}`);
        });
        logger_1.logger.info('✅ All cron jobs stopped');
    }
    getStatus() {
        const status = {};
        this.jobs.forEach((job, name) => {
            status[name] = 'active';
        });
        return status;
    }
    startJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.start();
            logger_1.logger.info(`✅ Started job: ${jobName}`);
        }
        else {
            logger_1.logger.error(`❌ Job not found: ${jobName}`);
        }
    }
    stopJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.stop();
            logger_1.logger.info(`✅ Stopped job: ${jobName}`);
        }
        else {
            logger_1.logger.error(`❌ Job not found: ${jobName}`);
        }
    }
}
exports.cronScheduler = new CronScheduler();
//# sourceMappingURL=cronScheduler.js.map