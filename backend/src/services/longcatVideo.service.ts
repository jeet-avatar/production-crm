/**
 * LongCat-Video Service
 *
 * Integrates with self-hosted LongCat-Video server for text-to-video generation
 * Open-source, state-of-the-art video generation (13.6B params)
 *
 * @see https://github.com/meituan-longcat/LongCat-Video
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import FormData from 'form-data';

export interface LongCatVideoConfig {
  prompt: string;
  duration?: number; // Duration in seconds (LongCat supports long videos)
  aspectRatio?: '16:9' | '9:16' | '1:1';
  seed?: number; // For reproducible results
  guidanceScale?: number; // CFG scale (default 7.5)
  numInferenceSteps?: number; // Number of diffusion steps (default 50)
}

export interface LongCatVideoResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
  progress?: number;
}

export class LongCatVideoService {
  private serverUrl: string;
  private isAvailable: boolean = false;

  constructor() {
    // LongCat-Video server URL (can be local or remote)
    this.serverUrl = process.env.LONGCAT_VIDEO_SERVER_URL || 'http://localhost:8080';

    // Check if server is available
    this.checkAvailability();

    logger.info('🐱 LongCat-Video service initialized', { serverUrl: this.serverUrl });
  }

  /**
   * Check if LongCat-Video server is available
   */
  private async checkAvailability(): Promise<void> {
    try {
      const response = await axios.get(`${this.serverUrl}/health`, { timeout: 5000 });
      this.isAvailable = response.status === 200;
      if (this.isAvailable) {
        logger.info('✅ LongCat-Video server is available');
      }
    } catch (error) {
      this.isAvailable = false;
      logger.warn('⚠️  LongCat-Video server is not available (this is OK - will use fallback)');
    }
  }

  /**
   * Generate video from text prompt using LongCat-Video
   */
  async generateVideo(config: LongCatVideoConfig): Promise<string> {
    try {
      if (!this.isAvailable) {
        throw new Error('LongCat-Video server is not available');
      }

      logger.info('🎬 Starting LongCat-Video generation', {
        prompt: config.prompt.substring(0, 50) + '...',
        duration: config.duration || 10,
      });

      // Call LongCat-Video text-to-video endpoint
      const response = await axios.post(
        `${this.serverUrl}/api/text-to-video`,
        {
          prompt: config.prompt,
          duration: config.duration || 10,
          aspect_ratio: config.aspectRatio || '16:9',
          seed: config.seed || Math.floor(Math.random() * 1000000),
          guidance_scale: config.guidanceScale || 7.5,
          num_inference_steps: config.numInferenceSteps || 50,
        },
        {
          timeout: 300000, // 5 minute timeout for video generation
        }
      );

      if (!response.data || !response.data.task_id) {
        throw new Error('Invalid response from LongCat-Video server');
      }

      const taskId = response.data.task_id;
      logger.info(`📝 LongCat-Video task created: ${taskId}`);

      // Poll for completion
      const videoUrl = await this.pollTask(taskId);
      logger.info(`✅ LongCat-Video generated: ${videoUrl}`);

      return videoUrl;
    } catch (error: any) {
      logger.error('❌ LongCat-Video generation failed:', error);
      throw new Error(`LongCat-Video generation failed: ${error.message}`);
    }
  }

  /**
   * Poll task status until completion
   */
  private async pollTask(taskId: string, maxAttempts: number = 60): Promise<string> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${this.serverUrl}/api/task/${taskId}`);

        const status = response.data.status;
        const progress = response.data.progress || 0;

        logger.info(`🔄 LongCat-Video task status: ${status} (${progress}%)`);

        if (status === 'completed' && response.data.video_url) {
          return response.data.video_url;
        }

        if (status === 'failed') {
          throw new Error(response.data.error || 'Video generation failed');
        }

        // Wait 5 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      } catch (error: any) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      }
    }

    throw new Error('Video generation timed out after 5 minutes');
  }

  /**
   * Generate image-to-video
   */
  async generateImageToVideo(imageUrl: string, prompt: string): Promise<string> {
    try {
      if (!this.isAvailable) {
        throw new Error('LongCat-Video server is not available');
      }

      logger.info('🎬 Starting LongCat image-to-video generation');

      const response = await axios.post(
        `${this.serverUrl}/api/image-to-video`,
        {
          image_url: imageUrl,
          prompt: prompt,
        },
        {
          timeout: 300000,
        }
      );

      const taskId = response.data.task_id;
      const videoUrl = await this.pollTask(taskId);

      logger.info(`✅ LongCat image-to-video generated: ${videoUrl}`);

      return videoUrl;
    } catch (error: any) {
      logger.error('❌ LongCat image-to-video failed:', error);
      throw new Error(`LongCat image-to-video failed: ${error.message}`);
    }
  }

  /**
   * Check if service is available
   */
  isConfigured(): boolean {
    return this.isAvailable;
  }

  /**
   * Get service info
   */
  getInfo() {
    return {
      service: 'LongCat-Video (Self-Hosted)',
      serverUrl: this.serverUrl,
      isAvailable: this.isAvailable,
      isFree: true,
      openSource: true,
      license: 'MIT',
      features: [
        'Text-to-Video',
        'Image-to-Video',
        'Video Continuation',
        'Long Video Generation',
      ],
      quality: 'State-of-the-art (13.6B params)',
    };
  }
}

export const longcatVideoService = new LongCatVideoService();
