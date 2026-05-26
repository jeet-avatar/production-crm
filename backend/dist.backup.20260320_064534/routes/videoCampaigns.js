"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const ai_1 = require("../config/ai");
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const anthropic = new sdk_1.default({ apiKey: ai_1.AI_CONFIG.apiKey });
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: (0, credential_providers_1.fromEnv)(),
});
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'suiteflow-demo';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'd26e2s8btupe4a.cloudfront.net';
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only MP4, MOV, AVI, and WEBM are allowed.'));
        }
    },
});
router.post('/synthesize-voice', async (req, res, next) => {
    try {
        const serviceApiKey = req.headers['x-service-api-key'] || req.headers['x-api-key'];
        const expectedServiceKey = process.env.SERVICE_API_KEY || process.env.INTERNAL_API_KEY;
        if (!expectedServiceKey || serviceApiKey !== expectedServiceKey) {
            logger_1.logger.error('Unauthorized service-to-service call to synthesize-voice');
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Valid service API key required'
            });
        }
        const { text, voice_id, language } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        if (!voice_id) {
            return res.status(400).json({ error: 'Voice ID is required' });
        }
        logger_1.logger.info(`Voice synthesis requested: voice_id=${voice_id}, text_length=${text.length}`);
        if (voice_id.startsWith('elevenlabs:')) {
            const elevenLabsVoiceId = voice_id.replace('elevenlabs:', '');
            const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
            if (!ELEVENLABS_API_KEY) {
                return res.status(500).json({ error: 'ElevenLabs API key not configured' });
            }
            const sanitizedText = text
                .replace(/[^\w\s.,!?'\-]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            logger_1.logger.info(`Sanitized text length: ${sanitizedText.length}`);
            try {
                let response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': ELEVENLABS_API_KEY,
                    },
                    body: JSON.stringify({
                        text: sanitizedText,
                        model_id: 'eleven_turbo_v2',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                        },
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.text();
                    logger_1.logger.warn(`Turbo model failed: ${errorData}, trying multilingual model...`);
                    response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'audio/mpeg',
                            'Content-Type': 'application/json',
                            'xi-api-key': ELEVENLABS_API_KEY,
                        },
                        body: JSON.stringify({
                            text: sanitizedText,
                            model_id: 'eleven_multilingual_v2',
                            voice_settings: {
                                stability: 0.5,
                                similarity_boost: 0.75,
                            },
                        }),
                    });
                }
                if (!response.ok) {
                    const errorText = await response.text();
                    logger_1.logger.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
                    if (errorText.includes('malicious') || errorText.includes('Invalid input')) {
                        logger_1.logger.error('ElevenLabs content moderation rejected text');
                        return res.status(400).json({
                            error: 'Content moderation failed',
                            details: 'The text was rejected by ElevenLabs content moderation. Please try using simpler language or select a custom cloned voice instead.',
                            suggestion: 'Use custom voice cloning feature for more flexibility'
                        });
                    }
                    return res.status(response.status).json({
                        error: 'ElevenLabs synthesis failed',
                        details: errorText
                    });
                }
                const audioBuffer = await response.arrayBuffer();
                const timestamp = Date.now();
                const s3Key = `voice-synthesis/elevenlabs-${elevenLabsVoiceId}-${timestamp}.mp3`;
                const putCommand = new client_s3_1.PutObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: s3Key,
                    Body: Buffer.from(audioBuffer),
                    ContentType: 'audio/mpeg',
                });
                await s3Client.send(putCommand);
                const audio_url = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
                logger_1.logger.info(`✅ ElevenLabs voice synthesized: ${audio_url}`);
                return res.json({
                    success: true,
                    audio_url,
                    voice_id,
                    method: 'elevenlabs',
                });
            }
            catch (error) {
                logger_1.logger.error(`ElevenLabs synthesis error: ${error.message}`);
                return res.status(500).json({ error: 'Failed to synthesize with ElevenLabs' });
            }
        }
        else {
            const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:5001';
            try {
                const response = await fetch(`${VOICE_SERVICE_URL}/api/voice/synthesize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text,
                        voice_id,
                        language: language || 'en',
                    }),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    logger_1.logger.error(`Voice service error: ${response.status} - ${errorText}`);
                    return res.status(response.status).json({
                        error: 'Voice synthesis failed',
                        details: errorText
                    });
                }
                const data = await response.json();
                logger_1.logger.info(`✅ Custom voice synthesized: ${data.audio_url}`);
                return res.json(data);
            }
            catch (error) {
                logger_1.logger.error(`Voice service synthesis error: ${error.message}`);
                return res.status(500).json({ error: 'Failed to synthesize with custom voice' });
            }
        }
    }
    catch (error) {
        return next(error);
    }
});
router.use(auth_1.authenticate);
router.get('/elevenlabs/voices', async (req, res, next) => {
    try {
        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!ELEVENLABS_API_KEY) {
            return res.status(500).json({
                error: 'ElevenLabs API key not configured',
                voices: []
            });
        }
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            method: 'GET',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            logger_1.logger.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({
                error: 'Failed to fetch ElevenLabs voices',
                voices: []
            });
        }
        const data = await response.json();
        const formattedVoices = data.voices.map((voice) => ({
            voice_id: `elevenlabs:${voice.voice_id}`,
            name: voice.name,
            preview_url: voice.preview_url,
            category: voice.category || 'generated',
            labels: voice.labels || {},
            description: voice.description || '',
        }));
        return res.json({ voices: formattedVoices });
    }
    catch (error) {
        logger_1.logger.error('ElevenLabs voices fetch error:', error);
        return res.status(500).json({
            error: 'Failed to fetch ElevenLabs voices',
            voices: []
        });
    }
});
router.get('/templates', async (req, res, next) => {
    try {
        const { category, search, system } = req.query;
        const where = {
            OR: [
                { isSystem: true },
                { userId: req.user.id },
            ],
        };
        if (category && category !== 'all') {
            where.category = category;
        }
        if (search) {
            where.name = {
                contains: String(search),
                mode: 'insensitive',
            };
        }
        if (system === 'true') {
            where.isSystem = true;
            delete where.OR;
        }
        else if (system === 'false') {
            where.isSystem = false;
            where.userId = req.user.id;
            delete where.OR;
        }
        const templates = await prisma.videoTemplate.findMany({
            where,
            orderBy: [
                { isFavorite: 'desc' },
                { usageCount: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        return res.json({ templates });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/templates/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await prisma.videoTemplate.findFirst({
            where: {
                id,
                OR: [
                    { isSystem: true },
                    { userId: req.user.id },
                ],
            },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        return res.json({ template });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/templates', async (req, res, next) => {
    try {
        const { name, description, videoUrl, category, tags } = req.body;
        if (!name || !videoUrl) {
            return res.status(400).json({ error: 'Name and video URL are required' });
        }
        const template = await prisma.videoTemplate.create({
            data: {
                name,
                description,
                videoUrl,
                category: category || 'Business',
                tags: tags || [],
                userId: req.user.id,
                isSystem: false,
            },
        });
        return res.status(201).json({ template });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/templates/upload', upload.single('video'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }
        const { name, description, category } = req.body;
        const file = req.file;
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop();
        const s3Key = `video-templates/${req.user.id}/${timestamp}.${fileExtension}`;
        const uploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await s3Client.send(uploadCommand);
        const videoUrl = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
        const template = await prisma.videoTemplate.create({
            data: {
                name: name || file.originalname,
                description,
                videoUrl,
                category: category || 'Business',
                fileSize: file.size,
                userId: req.user.id,
                isSystem: false,
            },
        });
        return res.status(201).json({ template, videoUrl });
    }
    catch (error) {
        logger_1.logger.error('Template upload error:', error);
        return next(error);
    }
});
router.post('/upload-logo', upload.single('logo'), async (req, res, next) => {
    try {
        logger_1.logger.info('Logo upload request received', {
            hasFile: !!req.file,
            userId: req.user?.id,
            hasAuth: !!req.user,
        });
        if (!req.user) {
            logger_1.logger.error('Logo upload: No authenticated user');
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!req.file) {
            logger_1.logger.error('Logo upload: No file in request');
            return res.status(400).json({ error: 'No logo file uploaded' });
        }
        const file = req.file;
        logger_1.logger.info('Logo file received', {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        });
        const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
            logger_1.logger.error('Logo upload: Invalid file type', { mimetype: file.mimetype });
            return res.status(400).json({ error: `Invalid file type: ${file.mimetype}. Only PNG, JPG, GIF, WEBP, and SVG are allowed.` });
        }
        if (file.size > 5 * 1024 * 1024) {
            logger_1.logger.error('Logo upload: File too large', { size: file.size });
            return res.status(400).json({ error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 5MB.` });
        }
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop() || 'jpg';
        const s3Key = `logos/${req.user.id}/${timestamp}.${fileExtension}`;
        logger_1.logger.info('Uploading logo to S3', { s3Key, bucket: S3_BUCKET });
        const uploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await s3Client.send(uploadCommand);
        const logoUrl = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
        logger_1.logger.info('Logo uploaded successfully', { logoUrl });
        return res.status(201).json({ logoUrl });
    }
    catch (error) {
        logger_1.logger.error('Logo upload error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            name: error.name,
        });
        return res.status(500).json({
            error: 'Logo upload failed',
            details: error.message || 'Unknown error',
            code: error.code,
        });
    }
});
router.put('/templates/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, category, tags, isFavorite } = req.body;
        const template = await prisma.videoTemplate.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        const updated = await prisma.videoTemplate.update({
            where: { id },
            data: {
                name,
                description,
                category,
                tags,
                isFavorite,
            },
        });
        return res.json({ template: updated });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/templates/:id/favorite', async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await prisma.videoTemplate.findFirst({
            where: {
                id,
                OR: [
                    { isSystem: true },
                    { userId: req.user.id },
                ],
            },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        const updated = await prisma.videoTemplate.update({
            where: { id },
            data: {
                isFavorite: !template.isFavorite,
            },
        });
        return res.json({ template: updated });
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/templates/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await prisma.videoTemplate.findFirst({
            where: {
                id,
                userId: req.user.id,
                isSystem: false,
            },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        if (template.videoUrl.includes(S3_BUCKET)) {
            const key = template.videoUrl.split(`${CLOUDFRONT_DOMAIN}/`)[1];
            if (key) {
                try {
                    const deleteCommand = new client_s3_1.DeleteObjectCommand({
                        Bucket: S3_BUCKET,
                        Key: key,
                    });
                    await s3Client.send(deleteCommand);
                }
                catch (s3Error) {
                    logger_1.logger.error('S3 delete error:', s3Error);
                }
            }
        }
        await prisma.videoTemplate.delete({ where: { id } });
        return res.json({ message: 'Template deleted successfully' });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/', async (req, res, next) => {
    try {
        const { status, limit = '50', offset = '0' } = req.query;
        const where = {
            userId: req.user.id,
        };
        if (status && status !== 'all') {
            where.status = status;
        }
        const campaigns = await prisma.videoCampaign.findMany({
            where,
            include: {
                template: true,
                companies: {
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                                logo: true,
                            },
                        },
                    },
                },
                jobs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        status: true,
                        progress: true,
                        currentStep: true,
                        errorMessage: true,
                    },
                },
                _count: {
                    select: {
                        companies: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset),
        });
        const total = await prisma.videoCampaign.count({ where });
        return res.json({ campaigns, total });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
            include: {
                template: true,
                companies: {
                    include: {
                        company: true,
                    },
                },
                jobs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        return res.json({ campaign });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { name, narrationScript, tone, videoSource, templateId, customVideoUrl, voiceId, customVoiceUrl, clientLogoUrl, userLogoUrl, bgmUrl, bgmVolume, textOverlays, companyIds, } = req.body;
        if (!name || !narrationScript) {
            return res.status(400).json({ error: 'Name and narration script are required' });
        }
        if (videoSource === 'TEMPLATE' && !templateId) {
            return res.status(400).json({ error: 'Template ID is required when using template source' });
        }
        if (videoSource === 'CUSTOM_UPLOAD' && !customVideoUrl && videoSource === 'URL' && !customVideoUrl) {
            return res.status(400).json({ error: 'Custom video URL is required' });
        }
        const campaign = await prisma.videoCampaign.create({
            data: {
                name,
                narrationScript,
                tone: tone || undefined,
                videoSource: videoSource || 'TEMPLATE',
                templateId,
                customVideoUrl,
                voiceId: voiceId || undefined,
                customVoiceUrl,
                clientLogoUrl,
                userLogoUrl,
                bgmUrl,
                bgmVolume: bgmVolume !== undefined ? bgmVolume : 0.1,
                textOverlays,
                userId: req.user.id,
                status: 'DRAFT',
            },
        });
        if (companyIds && Array.isArray(companyIds) && companyIds.length > 0) {
            await prisma.videoCampaignCompany.createMany({
                data: companyIds.map((companyId) => ({
                    campaignId: campaign.id,
                    companyId,
                })),
                skipDuplicates: true,
            });
        }
        return res.status(201).json({ campaign });
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, narrationScript, tone, voiceId, customVoiceUrl, clientLogoUrl, userLogoUrl, bgmUrl, bgmVolume, textOverlays, } = req.body;
        const campaign = await prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const updated = await prisma.videoCampaign.update({
            where: { id },
            data: {
                name,
                narrationScript,
                tone,
                voiceId,
                customVoiceUrl,
                clientLogoUrl,
                userLogoUrl,
                bgmUrl,
                bgmVolume,
                textOverlays,
            },
        });
        return res.json({ campaign: updated });
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        if (campaign.videoUrl && campaign.videoUrl.includes(S3_BUCKET)) {
            const key = campaign.videoUrl.split(`${CLOUDFRONT_DOMAIN}/`)[1];
            if (key) {
                try {
                    const deleteCommand = new client_s3_1.DeleteObjectCommand({
                        Bucket: S3_BUCKET,
                        Key: key,
                    });
                    await s3Client.send(deleteCommand);
                }
                catch (s3Error) {
                    logger_1.logger.error('S3 delete error:', s3Error);
                }
            }
        }
        await prisma.videoCampaign.delete({ where: { id } });
        return res.json({ message: 'Campaign deleted successfully' });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/companies/:companyId', async (req, res, next) => {
    try {
        const { id, companyId } = req.params;
        const campaign = await prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const company = await prisma.company.findFirst({
            where: {
                id: companyId,
                userId: req.user.id,
            },
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const existing = await prisma.videoCampaignCompany.findUnique({
            where: {
                campaignId_companyId: {
                    campaignId: id,
                    companyId,
                },
            },
        });
        if (existing) {
            return res.json({ message: 'Company already in campaign', campaignCompany: existing });
        }
        const campaignCompany = await prisma.videoCampaignCompany.create({
            data: {
                campaignId: id,
                companyId,
            },
            include: {
                company: true,
            },
        });
        return res.json({ message: 'Company added to campaign', campaignCompany });
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id/companies/:companyId', async (req, res, next) => {
    try {
        const { id, companyId } = req.params;
        const campaign = await prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        await prisma.videoCampaignCompany.delete({
            where: {
                campaignId_companyId: {
                    campaignId: id,
                    companyId,
                },
            },
        });
        return res.json({ message: 'Company removed from campaign' });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/ai/generate-script', async (req, res, next) => {
    try {
        const { companyName, companyIndustry, tone, goal } = req.body;
        if (!companyName) {
            return res.status(400).json({ error: 'Company name is required' });
        }
        const prompt = `You are an expert video marketing script writer. Generate a compelling 30-60 second video narration script for a business video.

Company Name: ${companyName}
Industry: ${companyIndustry || 'Not specified'}
Tone: ${tone || 'appropriate for the context'}
Goal: ${goal || 'Welcome and introduce our company'}

Generate a personalized, engaging script that:
1. Welcomes the company by name
2. Introduces our company and value proposition
3. Highlights potential benefits or solutions
4. Ends with a call to action

Keep it between 100-150 words (30-60 seconds when spoken).
Use a ${tone || 'context-appropriate'} tone.

Return ONLY valid JSON with this structure:
{"script": "Your complete narration script here..."}`;
        const message = await anthropic.messages.create({
            ...(0, ai_1.getAIMessageConfig)('content'),
            messages: [{ role: 'user', content: prompt }],
        });
        const content = message.content[0];
        if (content && content.type === 'text') {
            let jsonText = content.text.trim();
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
            }
            const result = JSON.parse(jsonText);
            return res.json(result);
        }
        return res.status(500).json({ error: 'Unexpected response format' });
    }
    catch (error) {
        logger_1.logger.error('AI script generation error:', error);
        return next(error);
    }
});
router.post('/ai/suggest-overlays', async (req, res, next) => {
    try {
        const { narrationScript, duration } = req.body;
        if (!narrationScript) {
            return res.status(400).json({ error: 'Narration script is required' });
        }
        const prompt = `You are an expert video editor. Based on this narration script, suggest 2-3 text overlays that should appear at key moments in the video.

Narration Script:
${narrationScript}

Estimated Video Duration: ${duration || 30} seconds

Suggest 2-3 short, impactful text overlays (3-5 words each) that:
1. Emphasize key points
2. Are timed appropriately throughout the video
3. Add visual interest

Return ONLY valid JSON with this structure:
{
  "overlays": [
    {"text": "Innovation First", "startTime": 5, "duration": 3},
    {"text": "Transform Your Business", "startTime": 15, "duration": 3}
  ]
}`;
        const message = await anthropic.messages.create({
            ...(0, ai_1.getAIMessageConfig)('basic'),
            messages: [{ role: 'user', content: prompt }],
        });
        const content = message.content[0];
        if (content && content.type === 'text') {
            let jsonText = content.text.trim();
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
            }
            const result = JSON.parse(jsonText);
            return res.json(result);
        }
        return res.status(500).json({ error: 'Unexpected response format' });
    }
    catch (error) {
        logger_1.logger.error('AI overlay suggestion error:', error);
        return next(error);
    }
});
router.post('/ai/generate-from-prompt', async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        const analysisPrompt = `You are an AI video campaign assistant. Analyze this user's request and extract the necessary information to create a video campaign.

User Request: ${prompt}

Extract and generate the following information:
1. Campaign name (short, descriptive)
2. Target company/audience name (if mentioned, otherwise use "Prospective Client")
3. Video script (100-150 words, professional narration)
4. Tone (professional, friendly, enthusiastic, or persuasive)
5. Text overlay suggestions (2-3 key phrases)

Return ONLY valid JSON with this exact structure:
{
  "name": "Campaign Name",
  "targetCompanyName": "Company Name",
  "script": "Full narration script...",
  "tone": "professional",
  "overlays": [
    {"text": "Key Point 1", "startTime": 5, "duration": 3},
    {"text": "Key Point 2", "startTime": 15, "duration": 3}
  ]
}`;
        const message = await anthropic.messages.create({
            ...(0, ai_1.getAIMessageConfig)('content'),
            messages: [{ role: 'user', content: analysisPrompt }],
        });
        const content = message.content[0];
        if (!content || content.type !== 'text') {
            return res.status(500).json({ error: 'Unexpected AI response format' });
        }
        let jsonText = content.text.trim();
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
        }
        const aiResult = JSON.parse(jsonText);
        const defaultTemplate = await prisma.videoTemplate.findFirst({
            where: {
                isSystem: true,
                category: 'general',
            },
        });
        const defaultVoice = 'elevenlabs:21m00Tcm4TlvDq8ikWAM';
        const campaign = await prisma.videoCampaign.create({
            data: {
                userId: req.user.id,
                name: aiResult.name || 'AI Generated Campaign',
                narrationScript: aiResult.script,
                tone: aiResult.tone || 'professional',
                videoSource: 'TEMPLATE',
                templateId: defaultTemplate?.id,
                voiceId: defaultVoice,
                textOverlays: aiResult.overlays || [],
                status: 'DRAFT',
                bgmVolume: 0.3,
            },
        });
        logger_1.logger.info(`AI campaign created: ${campaign.id} for user ${req.user.id}`);
        return res.json({ campaign });
    }
    catch (error) {
        logger_1.logger.error('AI campaign generation error:', error);
        return next(error);
    }
});
router.post('/:id/generate', async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
            include: {
                template: true,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        if (!campaign.voiceId) {
            return res.status(400).json({ error: 'Voice ID is required for video generation' });
        }
        await prisma.videoCampaign.update({
            where: { id },
            data: { status: 'GENERATING' },
        });
        const job = await prisma.videoGenerationJob.create({
            data: {
                campaignId: id,
                status: 'pending',
                currentStep: 'Initializing',
            },
        });
        logger_1.logger.info(`🎬 Starting video generation for campaign ${id} with voice ${campaign.voiceId}`);
        const VIDEO_GENERATOR_URL = process.env.VIDEO_GENERATOR_URL || 'http://localhost:5002';
        const videoGenRequest = {
            campaignId: campaign.id,
            narrationScript: campaign.narrationScript,
            templateUrl: campaign.customVideoUrl || campaign.template?.videoUrl || undefined,
            voiceId: campaign.voiceId,
            customVoiceUrl: campaign.customVoiceUrl || undefined,
            clientLogoUrl: campaign.clientLogoUrl || undefined,
            userLogoUrl: campaign.userLogoUrl || undefined,
            bgmUrl: campaign.bgmUrl || undefined,
            bgmVolume: campaign.bgmVolume || 0.1,
            textOverlays: campaign.textOverlays || undefined,
        };
        fetch(`${VIDEO_GENERATOR_URL}/api/video/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(videoGenRequest),
        })
            .then(async (response) => {
            if (!response.ok) {
                const errorText = await response.text();
                logger_1.logger.error(`Video generation service error: ${response.status} - ${errorText}`);
                await prisma.videoGenerationJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'failed',
                        errorMessage: `Video service error: ${errorText}`,
                    },
                });
                await prisma.videoCampaign.update({
                    where: { id: campaign.id },
                    data: {
                        status: 'FAILED',
                        generationError: `Video service error: ${errorText}`,
                    },
                });
                return;
            }
            const data = await response.json();
            const videoJobId = data.jobId;
            logger_1.logger.info(`🎬 Video generation started with job ID: ${videoJobId}`);
            const pollInterval = setInterval(async () => {
                try {
                    const statusResponse = await fetch(`${VIDEO_GENERATOR_URL}/api/video/status/${videoJobId}`);
                    if (!statusResponse.ok) {
                        logger_1.logger.error(`Failed to check video status: ${statusResponse.status}`);
                        return;
                    }
                    const statusData = await statusResponse.json();
                    await prisma.videoGenerationJob.update({
                        where: { id: job.id },
                        data: {
                            progress: statusData.progress || 0,
                            currentStep: statusData.currentStep || 'Processing...',
                        },
                    });
                    if (statusData.status === 'completed' && statusData.videoUrl) {
                        clearInterval(pollInterval);
                        logger_1.logger.info(`✅ Video generation completed: ${statusData.videoUrl}`);
                        await prisma.videoCampaign.update({
                            where: { id: campaign.id },
                            data: {
                                status: 'READY',
                                videoUrl: statusData.videoUrl,
                            },
                        });
                        await prisma.videoGenerationJob.update({
                            where: { id: job.id },
                            data: {
                                status: 'completed',
                                progress: 100,
                                currentStep: 'Complete',
                            },
                        });
                    }
                    else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);
                        logger_1.logger.error(`❌ Video generation failed: ${statusData.error}`);
                        await prisma.videoGenerationJob.update({
                            where: { id: job.id },
                            data: {
                                status: 'failed',
                                errorMessage: statusData.error || 'Video generation failed',
                            },
                        });
                        await prisma.videoCampaign.update({
                            where: { id: campaign.id },
                            data: {
                                status: 'FAILED',
                                generationError: statusData.error || 'Video generation failed',
                            },
                        });
                    }
                }
                catch (pollError) {
                    logger_1.logger.error(`Polling error: ${pollError.message}`);
                }
            }, 5000);
            setTimeout(() => {
                clearInterval(pollInterval);
            }, 600000);
        })
            .catch(async (error) => {
            logger_1.logger.error(`Video generation service call failed: ${error.message}`);
            await prisma.videoGenerationJob.update({
                where: { id: job.id },
                data: {
                    status: 'failed',
                    errorMessage: error.message,
                },
            });
            await prisma.videoCampaign.update({
                where: { id: campaign.id },
                data: {
                    status: 'FAILED',
                    generationError: error.message,
                },
            });
        });
        return res.json({
            message: 'Video generation started',
            jobId: job.id,
            campaign,
        });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const latestJob = await prisma.videoGenerationJob.findFirst({
            where: { campaignId: id },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({
            status: campaign.status,
            progress: latestJob?.progress || 0,
            currentStep: latestJob?.currentStep,
            videoUrl: campaign.videoUrl,
            error: campaign.generationError || latestJob?.errorMessage,
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/create-email-template', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { templateName, emailSubject, emailBody, ctaText, ctaLink, fromName, fromEmail } = req.body;
        const campaign = await prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        if (campaign.status !== 'READY' || !campaign.videoUrl) {
            return res.status(400).json({ error: 'Video must be generated before creating email template' });
        }
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">{{companyName}}</h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi {{firstName}},
              </p>

              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                ${emailBody || campaign.narrationScript}
              </p>

              <!-- Video Section -->
              <div style="margin: 30px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                <video controls width="100%" style="display: block; max-width: 100%; height: auto;" poster="${campaign.thumbnailUrl || ''}">
                  <source src="${campaign.videoUrl}" type="video/mp4">
                  Your email client doesn't support video playback. <a href="${campaign.videoUrl}" style="color: #667eea;">Click here to watch the video</a>.
                </video>
              </div>

              <!-- CTA Button -->
              ${ctaText && ctaLink ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${ctaLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                This video was created specifically for you using advanced AI technology.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #333333;">{{fromName}}</strong>
              </p>
              <p style="margin: 10px 0 0; color: #999999; font-size: 12px;">
                Powered by BrandMonkz Video Marketing
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
        const textContent = `
Hi {{firstName}},

${emailBody || campaign.narrationScript}

Watch your personalized video: ${campaign.videoUrl}

${ctaText && ctaLink ? `${ctaText}: ${ctaLink}` : ''}

Best regards,
{{fromName}}

---
Powered by BrandMonkz Video Marketing
    `.trim();
        const emailTemplate = await prisma.emailTemplate.create({
            data: {
                name: templateName || `Video Campaign: ${campaign.name}`,
                subject: emailSubject || `Personalized Video from ${fromName || '{{companyName}}'}`,
                htmlContent,
                textContent,
                variables: ['firstName', 'companyName', 'fromName'],
                templateType: 'video-campaign',
                fromEmail: fromEmail || 'support@brandmonkz.com',
                fromName: fromName || 'BrandMonkz',
                isActive: true,
                userId: req.user.id,
            },
        });
        logger_1.logger.info(`Email template created from video campaign ${id}: ${emailTemplate.id}`);
        return res.json({
            success: true,
            emailTemplate: {
                id: emailTemplate.id,
                name: emailTemplate.name,
                subject: emailTemplate.subject,
                videoUrl: campaign.videoUrl,
            },
            message: 'Email template created successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating email template from video:', error);
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=videoCampaigns.js.map