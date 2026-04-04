/**
 * Stable Video Diffusion Service
 *
 * Integrates with Hugging Face Inference API for text-to-video generation
 * Uses Stable Video Diffusion - FREE and open-source alternative to Kling AI
 *
 * @see https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import FormData from 'form-data';

export interface SVDVideoConfig {
  prompt: string;
  duration?: number; // Duration in seconds
  aspectRatio?: '16:9' | '9:16' | '1:1';
  numFrames?: number; // Number of frames to generate (14-25 recommended)
  fps?: number; // Frames per second (default 7)
}

export interface SVDVideoResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
  progress?: number;
}

export class StableVideoDiffusionService {
  private apiKey: string;
  private baseURL: string = 'https://api-inference.huggingface.co/models';

  // Using Stable Video Diffusion XT model
  private modelId: string = 'stabilityai/stable-video-diffusion-img2vid-xt';

  // For text-to-video, we'll use ModelScope or AnimateDiff
  private textToVideoModel: string = 'ali-vilab/text-to-video-ms-1.7b';

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || '';

    if (!this.apiKey) {
      logger.warn('⚠️  Hugging Face API key not configured');
    }

    logger.info('🤗 Stable Video Diffusion service initialized with Hugging Face');
  }

  /**
   * Generate video from text prompt using ModelScope Text-to-Video
   */
  async generateVideo(config: SVDVideoConfig): Promise<string> {
    try {
      logger.info('🎬 Starting Stable Video Diffusion generation', {
        prompt: config.prompt.substring(0, 50) + '...',
        model: this.textToVideoModel,
      });

      // Use Hugging Face Inference API
      const videoBlob = await this.callTextToVideoAPI(config);

      // Upload to S3 or return temporary URL
      const videoUrl = await this.uploadVideo(videoBlob);

      logger.info(`✅ Stable Video Diffusion video generated: ${videoUrl}`);

      return videoUrl;
    } catch (error: any) {
      logger.error('❌ Stable Video Diffusion failed:', error);
      throw new Error(`SVD generation failed: ${error.message}`);
    }
  }

  /**
   * Call Hugging Face Text-to-Video API
   */
  private async callTextToVideoAPI(config: SVDVideoConfig): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.textToVideoModel}`,
        {
          inputs: config.prompt,
          parameters: {
            num_frames: config.numFrames || 16, // 16 frames for ~2 second video at 7fps
            fps: config.fps || 7,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer', // Get video as binary
          timeout: 120000, // 2 minute timeout
        }
      );

      if (response.status === 503) {
        // Model is loading
        throw new Error('Model is loading, please try again in 20 seconds');
      }

      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.response) {
        logger.error('Hugging Face API error:', {
          status: error.response.status,
          data: error.response.data ? error.response.data.toString() : 'No data',
        });

        if (error.response.status === 503) {
          throw new Error('Model is currently loading. Please try again in 20-30 seconds.');
        }

        throw new Error(
          `Hugging Face API error: ${error.response.status} - ${error.response.statusText}`
        );
      }

      throw error;
    }
  }

  /**
   * Upload video to S3 and return CloudFront URL
   */
  private async uploadVideo(videoBlob: Buffer): Promise<string> {
    try {
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
      });

      const S3_BUCKET = process.env.S3_BUCKET || '';
      const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

      if (!S3_BUCKET) {
        throw new Error('S3_BUCKET not configured');
      }

      const timestamp = Date.now();
      const s3Key = `ai-videos/svd/${timestamp}.mp4`;

      await s3
        .upload({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: videoBlob,
          ContentType: 'video/mp4',
        })
        .promise();

      const videoUrl = CLOUDFRONT_DOMAIN
        ? `https://${CLOUDFRONT_DOMAIN}/${s3Key}`
        : `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`;

      logger.info(`✅ Video uploaded to S3: ${videoUrl}`);

      return videoUrl;
    } catch (error: any) {
      logger.error('Failed to upload video to S3:', error);
      throw new Error(`Video upload failed: ${error.message}`);
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get service info
   */
  getInfo() {
    return {
      service: 'Stable Video Diffusion (Hugging Face)',
      model: this.textToVideoModel,
      isConfigured: this.isConfigured(),
      isFree: true,
      openSource: true,
    };
  }
}

export const stableVideoDiffusionService = new StableVideoDiffusionService();
