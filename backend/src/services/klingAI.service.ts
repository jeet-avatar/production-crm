/**
 * Kling AI Video Generation Service
 *
 * Integrates with Kling AI API for text-to-video generation
 * Provides high-quality 1080p video generation from text prompts
 *
 * @see https://klingai.com/docs
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

export type KlingModel = 'kling-v1' | 'kling-v1-6' | 'kling-v2-master' | 'kling-v2-1-master' | 'kling-v2-5-turbo';

export interface KlingVideoConfig {
  prompt: string;
  duration?: 5 | 10; // Duration in seconds (5 or 10 only)
  aspectRatio?: '16:9' | '9:16' | '1:1';
  model?: KlingModel; // Model version to use
  negativePrompt?: string;
}

export interface KlingVideoResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
  progress?: number;
}

export class KlingAIService {
  private accessKey: string;
  private secretKey: string;
  private baseURL: string = 'https://api-singapore.klingai.com/v1'; // Updated to Singapore endpoint

  constructor() {
    this.accessKey = process.env.KLING_ACCESS_KEY || '';
    this.secretKey = process.env.KLING_SECRET_KEY || '';

    if (!this.accessKey || !this.secretKey) {
      logger.warn('⚠️  Kling AI API keys not configured');
    }

    logger.info('🌏 Kling AI service initialized with Singapore endpoint:', this.baseURL);
  }

  /**
   * Generate JWT token for Kling AI authentication
   */
  private generateJWT(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.accessKey,  // Access Key as issuer
      exp: now + 1800,      // Expires in 30 minutes
      nbf: now - 5,         // Valid after 5 seconds ago
    };

    const token = jwt.sign(payload, this.secretKey, {
      algorithm: 'HS256',
      header: {
        alg: 'HS256',
        typ: 'JWT',
      },
    });

    return token;
  }

  /**
   * Generate video from text prompt
   */
  async generateVideo(config: KlingVideoConfig): Promise<string> {
    try {
      logger.info('🎬 Starting Kling AI video generation', {
        prompt: config.prompt.substring(0, 50) + '...',
        duration: config.duration || 15,
      });

      // Step 1: Create video generation task
      const taskId = await this.createTask(config);
      logger.info(`📝 Kling AI task created: ${taskId}`);

      // Step 2: Poll for completion
      const videoUrl = await this.pollTask(taskId);
      logger.info(`✅ Kling AI video generated: ${videoUrl}`);

      return videoUrl;
    } catch (error: any) {
      logger.error('❌ Kling AI video generation failed:', error);
      throw new Error(`Kling AI generation failed: ${error.message}`);
    }
  }

  /**
   * Create video generation task
   */
  private async createTask(config: KlingVideoConfig): Promise<string> {
    try {
      // Generate JWT token for authentication
      const jwtToken = this.generateJWT();

      // Kling AI only supports 5 or 10 second videos
      const validDuration = config.duration === 5 ? 5 : 10;

      const response = await axios.post(
        `${this.baseURL}/videos/text2video`,
        {
          model_name: config.model || 'kling-v1',  // Use specified model or default to v1
          prompt: config.prompt,
          negative_prompt: config.negativePrompt || '',
          cfg_scale: 0.5,
          aspect_ratio: config.aspectRatio || '16:9',
          duration: String(validDuration), // API expects string type
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
          },
        }
      );

      // Response structure per API docs: { code: 0, data: { task_id, task_status, ... } }
      // NOTE: Create task returns data as a single OBJECT, not an array
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from Kling AI API');
      }

      const taskData = response.data.data; // Single object
      if (!taskData.task_id) {
        throw new Error('No task_id in response');
      }

      return taskData.task_id;
    } catch (error: any) {
      console.error('🔴 KLING AI CREATE TASK ERROR:');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Has response?:', !!error.response);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response statusText:', error.response.statusText);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));

        logger.error('Kling AI API error:', {
          status: error.response.status,
          data: error.response.data,
        });
        throw new Error(
          `Kling AI API error: ${error.response.data?.message || error.response.statusText}`
        );
      }

      console.error('Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  /**
   * Poll task status until completion
   */
  private async pollTask(taskId: string, maxAttempts: number = 60): Promise<string> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await this.getTaskStatus(taskId);

        logger.info(`🔄 Kling AI task status: ${status.status} (${status.progress || 0}%)`);

        if (status.status === 'completed' && status.videoUrl) {
          return status.videoUrl;
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'Video generation failed');
        }

        // Wait 5 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      } catch (error: any) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        // Continue polling on transient errors
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      }
    }

    throw new Error('Video generation timed out after 5 minutes');
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<KlingVideoResponse> {
    try {
      // Generate JWT token for authentication
      const jwtToken = this.generateJWT();

      const response = await axios.get(`${this.baseURL}/videos/text2video/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      });

      // Response structure per API docs: { code: 0, data: { task_id, task_status, task_result, ... } }
      // NOTE: Query task (single) returns data as a single OBJECT, not an array
      const taskData = response.data.data;

      if (!taskData) {
        throw new Error('No task data in response');
      }

      return {
        taskId,
        status: this.mapStatus(taskData.task_status),
        videoUrl: taskData.task_status === 'succeed' ? taskData.task_result?.videos?.[0]?.url : undefined,
        error: taskData.task_status === 'failed' ? taskData.task_status_msg : undefined,
        progress: this.calculateProgress(taskData.task_status),
      };
    } catch (error: any) {
      logger.error('Failed to get Kling AI task status:', error);
      throw new Error(`Failed to get task status: ${error.message}`);
    }
  }

  /**
   * Map Kling AI status to our status
   */
  private mapStatus(klingStatus: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (klingStatus) {
      case 'submitted':
      case 'processing':
        return 'processing';
      case 'succeed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgress(status: string): number {
    switch (status) {
      case 'submitted':
        return 10;
      case 'processing':
        return 50;
      case 'succeed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.accessKey && !!this.secretKey;
  }
}

export const klingAIService = new KlingAIService();
