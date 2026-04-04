"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableVideoDiffusionService = exports.StableVideoDiffusionService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class StableVideoDiffusionService {
    constructor() {
        this.baseURL = 'https://api-inference.huggingface.co/models';
        this.modelId = 'stabilityai/stable-video-diffusion-img2vid-xt';
        this.textToVideoModel = 'ali-vilab/text-to-video-ms-1.7b';
        this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
        if (!this.apiKey) {
            logger_1.logger.warn('⚠️  Hugging Face API key not configured');
        }
        logger_1.logger.info('🤗 Stable Video Diffusion service initialized with Hugging Face');
    }
    async generateVideo(config) {
        try {
            logger_1.logger.info('🎬 Starting Stable Video Diffusion generation', {
                prompt: config.prompt.substring(0, 50) + '...',
                model: this.textToVideoModel,
            });
            const videoBlob = await this.callTextToVideoAPI(config);
            const videoUrl = await this.uploadVideo(videoBlob);
            logger_1.logger.info(`✅ Stable Video Diffusion video generated: ${videoUrl}`);
            return videoUrl;
        }
        catch (error) {
            logger_1.logger.error('❌ Stable Video Diffusion failed:', error);
            throw new Error(`SVD generation failed: ${error.message}`);
        }
    }
    async callTextToVideoAPI(config) {
        try {
            const response = await axios_1.default.post(`${this.baseURL}/${this.textToVideoModel}`, {
                inputs: config.prompt,
                parameters: {
                    num_frames: config.numFrames || 16,
                    fps: config.fps || 7,
                },
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
                timeout: 120000,
            });
            if (response.status === 503) {
                throw new Error('Model is loading, please try again in 20 seconds');
            }
            return Buffer.from(response.data);
        }
        catch (error) {
            if (error.response) {
                logger_1.logger.error('Hugging Face API error:', {
                    status: error.response.status,
                    data: error.response.data ? error.response.data.toString() : 'No data',
                });
                if (error.response.status === 503) {
                    throw new Error('Model is currently loading. Please try again in 20-30 seconds.');
                }
                throw new Error(`Hugging Face API error: ${error.response.status} - ${error.response.statusText}`);
            }
            throw error;
        }
    }
    async uploadVideo(videoBlob) {
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
            logger_1.logger.info(`✅ Video uploaded to S3: ${videoUrl}`);
            return videoUrl;
        }
        catch (error) {
            logger_1.logger.error('Failed to upload video to S3:', error);
            throw new Error(`Video upload failed: ${error.message}`);
        }
    }
    isConfigured() {
        return !!this.apiKey;
    }
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
exports.StableVideoDiffusionService = StableVideoDiffusionService;
exports.stableVideoDiffusionService = new StableVideoDiffusionService();
//# sourceMappingURL=stableVideoDiffusion.service.js.map