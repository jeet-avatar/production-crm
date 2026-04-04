import { Response } from 'express';
import { logger } from './logger';

export interface CampaignProgress {
  stepId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  message?: string;
  timestamp: string;
}

export interface ActiveCampaign {
  clients: Response[];
  currentStep?: string;
  startedAt: Date;
}

// In-memory store for active campaign progress
export const activeCampaigns = new Map<string, ActiveCampaign>();

export class CampaignProgressEmitter {
  private campaignId: string;

  constructor(campaignId: string) {
    this.campaignId = campaignId;

    // Initialize campaign in active campaigns map
    if (!activeCampaigns.has(campaignId)) {
      activeCampaigns.set(campaignId, {
        clients: [],
        startedAt: new Date()
      });
    }
  }

  /**
   * Emit a progress update for a specific step
   */
  async emitProgress(stepId: string, progress: number, message?: string): Promise<void> {
    const campaign = activeCampaigns.get(this.campaignId);
    if (!campaign) {
      logger.warn(`[Progress] Campaign ${this.campaignId} not found in active campaigns`);
      return;
    }

    const event = {
      type: 'progress',
      stepId,
      progress: Math.min(100, Math.max(0, progress)), // Clamp between 0-100
      message,
      timestamp: new Date().toISOString()
    };

    logger.info(`[Progress] Campaign ${this.campaignId} - Step ${stepId}: ${progress}%`, { message });

    campaign.clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        logger.error('[Progress] Failed to write to SSE client:', error);
      }
    });
  }

  /**
   * Mark a step as started
   */
  async emitStepStart(stepId: string, message?: string): Promise<void> {
    const campaign = activeCampaigns.get(this.campaignId);
    if (!campaign) return;

    campaign.currentStep = stepId;

    const event = {
      type: 'step_start',
      stepId,
      message: message || `Starting ${stepId}`,
      timestamp: new Date().toISOString()
    };

    logger.info(`[Progress] Campaign ${this.campaignId} - Starting step: ${stepId}`);

    campaign.clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        logger.error('[Progress] Failed to write to SSE client:', error);
      }
    });
  }

  /**
   * Mark a step as completed
   */
  async emitStepComplete(stepId: string, message?: string): Promise<void> {
    const campaign = activeCampaigns.get(this.campaignId);
    if (!campaign) return;

    const event = {
      type: 'step_complete',
      stepId,
      message: message || `Completed ${stepId}`,
      timestamp: new Date().toISOString()
    };

    logger.info(`[Progress] Campaign ${this.campaignId} - Completed step: ${stepId}`);

    campaign.clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        logger.error('[Progress] Failed to write to SSE client:', error);
      }
    });
  }

  /**
   * Emit an error for a specific step
   */
  async emitError(stepId: string, errorMessage: string): Promise<void> {
    const campaign = activeCampaigns.get(this.campaignId);
    if (!campaign) return;

    const event = {
      type: 'error',
      stepId,
      message: errorMessage,
      timestamp: new Date().toISOString()
    };

    logger.error(`[Progress] Campaign ${this.campaignId} - Error in step ${stepId}:`, errorMessage);

    campaign.clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        logger.error('[Progress] Failed to write to SSE client:', error);
      }
    });
  }

  /**
   * Mark the entire campaign as complete
   */
  async emitComplete(): Promise<void> {
    const campaign = activeCampaigns.get(this.campaignId);
    if (!campaign) return;

    const event = {
      type: 'complete',
      message: 'Campaign completed successfully',
      timestamp: new Date().toISOString()
    };

    logger.info(`[Progress] Campaign ${this.campaignId} - Completed`);

    campaign.clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        logger.error('[Progress] Failed to write to SSE client:', error);
      }
    });

    // Clean up after a delay to allow final message to be sent
    setTimeout(() => {
      this.cleanup();
    }, 2000);
  }

  /**
   * Clean up campaign from active campaigns
   */
  cleanup(): void {
    const campaign = activeCampaigns.get(this.campaignId);
    if (campaign) {
      // Close all SSE connections
      campaign.clients.forEach(client => {
        try {
          client.end();
        } catch (error) {
          logger.error('[Progress] Failed to close SSE client:', error);
        }
      });

      activeCampaigns.delete(this.campaignId);
      logger.info(`[Progress] Cleaned up campaign ${this.campaignId}`);
    }
  }

  /**
   * Register a new SSE client for this campaign
   */
  static registerClient(campaignId: string, client: Response): void {
    let campaign = activeCampaigns.get(campaignId);

    if (!campaign) {
      campaign = {
        clients: [],
        startedAt: new Date()
      };
      activeCampaigns.set(campaignId, campaign);
    }

    campaign.clients.push(client);
    logger.info(`[Progress] Registered SSE client for campaign ${campaignId}. Total clients: ${campaign.clients.length}`);
  }

  /**
   * Unregister an SSE client
   */
  static unregisterClient(campaignId: string, client: Response): void {
    const campaign = activeCampaigns.get(campaignId);
    if (campaign) {
      campaign.clients = campaign.clients.filter(c => c !== client);
      logger.info(`[Progress] Unregistered SSE client for campaign ${campaignId}. Remaining clients: ${campaign.clients.length}`);

      // Clean up campaign if no more clients
      if (campaign.clients.length === 0) {
        const age = Date.now() - campaign.startedAt.getTime();
        // Only clean up if campaign is older than 5 minutes
        if (age > 5 * 60 * 1000) {
          activeCampaigns.delete(campaignId);
          logger.info(`[Progress] Cleaned up inactive campaign ${campaignId}`);
        }
      }
    }
  }
}
