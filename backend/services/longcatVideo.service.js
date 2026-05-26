"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.longcatVideoService = exports.LongCatVideoService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class LongCatVideoService {
    constructor() {
        this.isAvailable = false;
        this.serverUrl = process.env.LONGCAT_VIDEO_SERVER_URL || 'http://localhost:8080';
        this.checkAvailability();
        logger_1.logger.info('🐱 LongCat-Video service initialized', { serverUrl: this.serverUrl });
    }
    async checkAvailability() {
        try {
            const response = await axios_1.default.get(`${this.serverUrl}/health`, { timeout: 5000 });
            this.isAvailable = response.status === 200;
            if (this.isAvailable) {
                logger_1.logger.info('✅ LongCat-Video server is available');
            }
        }
        catch (error) {
            this.isAvailable = false;
            logger_1.logger.warn('⚠️  LongCat-Video server is not available (this is OK - will use fallback)');
        }
    }
    async generateVideo(config) {
        try {
            if (!this.isAvailable) {
                throw new Error('LongCat-Video server is not available');
            }
            logger_1.logger.info('🎬 Starting LongCat-Video generation', {
                prompt: config.prompt.substring(0, 50) + '...',
                duration: config.duration || 10,
            });
            const response = await axios_1.default.post(`${this.serverUrl}/api/text-to-video`, {
                prompt: config.prompt,
                duration: config.duration || 10,
                aspect_ratio: config.aspectRatio || '16:9',
                seed: config.seed || Math.floor(Math.random() * 1000000),
                guidance_scale: config.guidanceScale || 7.5,
                num_inference_steps: config.numInferenceSteps || 50,
            }, {
                timeout: 300000,
            });
            if (!response.data || !response.data.task_id) {
                throw new Error('Invalid response from LongCat-Video server');
            }
            const taskId = response.data.task_id;
            logger_1.logger.info(`📝 LongCat-Video task created: ${taskId}`);
            const videoUrl = await this.pollTask(taskId);
            logger_1.logger.info(`✅ LongCat-Video generated: ${videoUrl}`);
            return videoUrl;
        }
        catch (error) {
            logger_1.logger.error('❌ LongCat-Video generation failed:', error);
            throw new Error(`LongCat-Video generation failed: ${error.message}`);
        }
    }
    async pollTask(taskId, maxAttempts = 60) {
        let attempts = 0;
        while (attempts < maxAttempts) {
            try {
                const response = await axios_1.default.get(`${this.serverUrl}/api/task/${taskId}`);
                const status = response.data.status;
                const progress = response.data.progress || 0;
                logger_1.logger.info(`🔄 LongCat-Video task status: ${status} (${progress}%)`);
                if (status === 'completed' && response.data.video_url) {
                    return response.data.video_url;
                }
                if (status === 'failed') {
                    throw new Error(response.data.error || 'Video generation failed');
                }
                await new Promise((resolve) => setTimeout(resolve, 5000));
                attempts++;
            }
            catch (error) {
                if (attempts >= maxAttempts - 1) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, 5000));
                attempts++;
            }
        }
        throw new Error('Video generation timed out after 5 minutes');
    }
    async generateImageToVideo(imageUrl, prompt) {
        try {
            if (!this.isAvailable) {
                throw new Error('LongCat-Video server is not available');
            }
            logger_1.logger.info('🎬 Starting LongCat image-to-video generation');
            const response = await axios_1.default.post(`${this.serverUrl}/api/image-to-video`, {
                image_url: imageUrl,
                prompt: prompt,
            }, {
                timeout: 300000,
            });
            const taskId = response.data.task_id;
            const videoUrl = await this.pollTask(taskId);
            logger_1.logger.info(`✅ LongCat image-to-video generated: ${videoUrl}`);
            return videoUrl;
        }
        catch (error) {
            logger_1.logger.error('❌ LongCat image-to-video failed:', error);
            throw new Error(`LongCat image-to-video failed: ${error.message}`);
        }
    }
    isConfigured() {
        return this.isAvailable;
    }
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
exports.LongCatVideoService = LongCatVideoService;
exports.longcatVideoService = new LongCatVideoService();
//# sourceMappingURL=longcatVideo.service.js.map