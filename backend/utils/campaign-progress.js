"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignProgressEmitter = exports.activeCampaigns = void 0;
const logger_1 = require("./logger");
exports.activeCampaigns = new Map();
class CampaignProgressEmitter {
    constructor(campaignId) {
        this.campaignId = campaignId;
        if (!exports.activeCampaigns.has(campaignId)) {
            exports.activeCampaigns.set(campaignId, {
                clients: [],
                startedAt: new Date()
            });
        }
    }
    async emitProgress(stepId, progress, message) {
        const campaign = exports.activeCampaigns.get(this.campaignId);
        if (!campaign) {
            logger_1.logger.warn(`[Progress] Campaign ${this.campaignId} not found in active campaigns`);
            return;
        }
        const event = {
            type: 'progress',
            stepId,
            progress: Math.min(100, Math.max(0, progress)),
            message,
            timestamp: new Date().toISOString()
        };
        logger_1.logger.info(`[Progress] Campaign ${this.campaignId} - Step ${stepId}: ${progress}%`, { message });
        campaign.clients.forEach(client => {
            try {
                client.write(`data: ${JSON.stringify(event)}\n\n`);
            }
            catch (error) {
                logger_1.logger.error('[Progress] Failed to write to SSE client:', error);
            }
        });
    }
    async emitStepStart(stepId, message) {
        const campaign = exports.activeCampaigns.get(this.campaignId);
        if (!campaign)
            return;
        campaign.currentStep = stepId;
        const event = {
            type: 'step_start',
            stepId,
            message: message || `Starting ${stepId}`,
            timestamp: new Date().toISOString()
        };
        logger_1.logger.info(`[Progress] Campaign ${this.campaignId} - Starting step: ${stepId}`);
        campaign.clients.forEach(client => {
            try {
                client.write(`data: ${JSON.stringify(event)}\n\n`);
            }
            catch (error) {
                logger_1.logger.error('[Progress] Failed to write to SSE client:', error);
            }
        });
    }
    async emitStepComplete(stepId, message) {
        const campaign = exports.activeCampaigns.get(this.campaignId);
        if (!campaign)
            return;
        const event = {
            type: 'step_complete',
            stepId,
            message: message || `Completed ${stepId}`,
            timestamp: new Date().toISOString()
        };
        logger_1.logger.info(`[Progress] Campaign ${this.campaignId} - Completed step: ${stepId}`);
        campaign.clients.forEach(client => {
            try {
                client.write(`data: ${JSON.stringify(event)}\n\n`);
            }
            catch (error) {
                logger_1.logger.error('[Progress] Failed to write to SSE client:', error);
            }
        });
    }
    async emitError(stepId, errorMessage) {
        const campaign = exports.activeCampaigns.get(this.campaignId);
        if (!campaign)
            return;
        const event = {
            type: 'error',
            stepId,
            message: errorMessage,
            timestamp: new Date().toISOString()
        };
        logger_1.logger.error(`[Progress] Campaign ${this.campaignId} - Error in step ${stepId}:`, errorMessage);
        campaign.clients.forEach(client => {
            try {
                client.write(`data: ${JSON.stringify(event)}\n\n`);
            }
            catch (error) {
                logger_1.logger.error('[Progress] Failed to write to SSE client:', error);
            }
        });
    }
    async emitComplete() {
        const campaign = exports.activeCampaigns.get(this.campaignId);
        if (!campaign)
            return;
        const event = {
            type: 'complete',
            message: 'Campaign completed successfully',
            timestamp: new Date().toISOString()
        };
        logger_1.logger.info(`[Progress] Campaign ${this.campaignId} - Completed`);
        campaign.clients.forEach(client => {
            try {
                client.write(`data: ${JSON.stringify(event)}\n\n`);
            }
            catch (error) {
                logger_1.logger.error('[Progress] Failed to write to SSE client:', error);
            }
        });
        setTimeout(() => {
            this.cleanup();
        }, 2000);
    }
    cleanup() {
        const campaign = exports.activeCampaigns.get(this.campaignId);
        if (campaign) {
            campaign.clients.forEach(client => {
                try {
                    client.end();
                }
                catch (error) {
                    logger_1.logger.error('[Progress] Failed to close SSE client:', error);
                }
            });
            exports.activeCampaigns.delete(this.campaignId);
            logger_1.logger.info(`[Progress] Cleaned up campaign ${this.campaignId}`);
        }
    }
    static registerClient(campaignId, client) {
        let campaign = exports.activeCampaigns.get(campaignId);
        if (!campaign) {
            campaign = {
                clients: [],
                startedAt: new Date()
            };
            exports.activeCampaigns.set(campaignId, campaign);
        }
        campaign.clients.push(client);
        logger_1.logger.info(`[Progress] Registered SSE client for campaign ${campaignId}. Total clients: ${campaign.clients.length}`);
    }
    static unregisterClient(campaignId, client) {
        const campaign = exports.activeCampaigns.get(campaignId);
        if (campaign) {
            campaign.clients = campaign.clients.filter(c => c !== client);
            logger_1.logger.info(`[Progress] Unregistered SSE client for campaign ${campaignId}. Remaining clients: ${campaign.clients.length}`);
            if (campaign.clients.length === 0) {
                const age = Date.now() - campaign.startedAt.getTime();
                if (age > 5 * 60 * 1000) {
                    exports.activeCampaigns.delete(campaignId);
                    logger_1.logger.info(`[Progress] Cleaned up inactive campaign ${campaignId}`);
                }
            }
        }
    }
}
exports.CampaignProgressEmitter = CampaignProgressEmitter;
//# sourceMappingURL=campaign-progress.js.map