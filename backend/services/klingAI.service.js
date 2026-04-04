"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.klingAIService = exports.KlingAIService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class KlingAIService {
    constructor() {
        this.baseURL = 'https://api-singapore.klingai.com/v1';
        this.accessKey = process.env.KLING_ACCESS_KEY || '';
        this.secretKey = process.env.KLING_SECRET_KEY || '';
        if (!this.accessKey || !this.secretKey) {
            logger_1.logger.warn('⚠️  Kling AI API keys not configured');
        }
        logger_1.logger.info('🌏 Kling AI service initialized with Singapore endpoint:', this.baseURL);
    }
    generateJWT() {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: this.accessKey,
            exp: now + 1800,
            nbf: now - 5,
        };
        const token = jsonwebtoken_1.default.sign(payload, this.secretKey, {
            algorithm: 'HS256',
            header: {
                alg: 'HS256',
                typ: 'JWT',
            },
        });
        return token;
    }
    async generateVideo(config) {
        try {
            logger_1.logger.info('🎬 Starting Kling AI video generation', {
                prompt: config.prompt.substring(0, 50) + '...',
                duration: config.duration || 15,
            });
            const taskId = await this.createTask(config);
            logger_1.logger.info(`📝 Kling AI task created: ${taskId}`);
            const videoUrl = await this.pollTask(taskId);
            logger_1.logger.info(`✅ Kling AI video generated: ${videoUrl}`);
            return videoUrl;
        }
        catch (error) {
            logger_1.logger.error('❌ Kling AI video generation failed:', error);
            throw new Error(`Kling AI generation failed: ${error.message}`);
        }
    }
    async createTask(config) {
        try {
            const jwtToken = this.generateJWT();
            const validDuration = config.duration === 5 ? 5 : 10;
            const response = await axios_1.default.post(`${this.baseURL}/videos/text2video`, {
                model_name: config.model || 'kling-v1',
                prompt: config.prompt,
                negative_prompt: config.negativePrompt || '',
                cfg_scale: 0.5,
                aspect_ratio: config.aspectRatio || '16:9',
                duration: String(validDuration),
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`,
                },
            });
            if (!response.data || !response.data.data) {
                throw new Error('Invalid response from Kling AI API');
            }
            const taskData = response.data.data;
            if (!taskData.task_id) {
                throw new Error('No task_id in response');
            }
            return taskData.task_id;
        }
        catch (error) {
            console.error('🔴 KLING AI CREATE TASK ERROR:');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Has response?:', !!error.response);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response statusText:', error.response.statusText);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
                console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
                logger_1.logger.error('Kling AI API error:', {
                    status: error.response.status,
                    data: error.response.data,
                });
                throw new Error(`Kling AI API error: ${error.response.data?.message || error.response.statusText}`);
            }
            console.error('Full error object:', JSON.stringify(error, null, 2));
            throw error;
        }
    }
    async pollTask(taskId, maxAttempts = 60) {
        let attempts = 0;
        while (attempts < maxAttempts) {
            try {
                const status = await this.getTaskStatus(taskId);
                logger_1.logger.info(`🔄 Kling AI task status: ${status.status} (${status.progress || 0}%)`);
                if (status.status === 'completed' && status.videoUrl) {
                    return status.videoUrl;
                }
                if (status.status === 'failed') {
                    throw new Error(status.error || 'Video generation failed');
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
    async getTaskStatus(taskId) {
        try {
            const jwtToken = this.generateJWT();
            const response = await axios_1.default.get(`${this.baseURL}/videos/text2video/${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                },
            });
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get Kling AI task status:', error);
            throw new Error(`Failed to get task status: ${error.message}`);
        }
    }
    mapStatus(klingStatus) {
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
    calculateProgress(status) {
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
    isConfigured() {
        return !!this.accessKey && !!this.secretKey;
    }
}
exports.KlingAIService = KlingAIService;
exports.klingAIService = new KlingAIService();
//# sourceMappingURL=klingAI.service.js.map