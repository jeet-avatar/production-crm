"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const ai_1 = require("../config/ai");
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const logger_1 = require("../utils/logger");
const videoValidation_1 = require("../utils/videoValidation");
const router = (0, express_1.Router)();
const anthropic = new sdk_1.default({ apiKey: ai_1.AI_CONFIG.apiKey });
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
});
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'suiteflow-demo';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'd26e2s8btupe4a.cloudfront.net';
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024,
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
const audioUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/mp4'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only MP3, WAV, OGG, WEBM, and M4A audio files are allowed.'));
        }
    },
});
const imageUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WEBP images are allowed.'));
        }
    },
});
router.post('/synthesize-voice', async (req, res, next) => {
    try {
        const { text, voice_id, language = 'en' } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        if (!voice_id) {
            return res.status(400).json({ error: 'Voice ID is required' });
        }
        const isInternalCall = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
        let normalizedVoiceId = voice_id;
        if (!voice_id.includes(':') && !voice_id.includes('/')) {
            normalizedVoiceId = `elevenlabs:${voice_id}`;
            logger_1.logger.info(`Normalized voice ID from "${voice_id}" to "${normalizedVoiceId}"`);
        }
        logger_1.logger.info('Synthesizing speech:', {
            textLength: text.length,
            voice_id: normalizedVoiceId,
            language,
            isInternalCall,
            ip: req.ip,
        });
        if (normalizedVoiceId.startsWith('elevenlabs:')) {
            const elevenLabsVoiceId = normalizedVoiceId.replace('elevenlabs:', '');
            const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
            if (!ELEVENLABS_API_KEY) {
                return res.status(500).json({
                    error: 'ElevenLabs API not configured',
                    details: 'Please add ELEVENLABS_API_KEY to environment variables'
                });
            }
            logger_1.logger.info('Using ElevenLabs TTS:', { elevenLabsVoiceId });
            const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            });
            if (!elevenLabsResponse.ok) {
                const errorText = await elevenLabsResponse.text();
                logger_1.logger.error('ElevenLabs TTS error:', { status: elevenLabsResponse.status, error: errorText });
                return res.status(elevenLabsResponse.status).json({
                    error: 'ElevenLabs TTS failed',
                    details: errorText
                });
            }
            const audioBuffer = await elevenLabsResponse.arrayBuffer();
            const audioData = Buffer.from(audioBuffer);
            const timestamp = Date.now();
            const s3Key = `synthesized-voices/elevenlabs/${elevenLabsVoiceId}_${timestamp}.mp3`;
            const uploadCommand = new client_s3_1.PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: s3Key,
                Body: audioData,
                ContentType: 'audio/mpeg',
            });
            await s3Client.send(uploadCommand);
            const audio_url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
            logger_1.logger.info('ElevenLabs TTS successful, uploaded to S3:', { audio_url });
            return res.json({
                success: true,
                audio_url,
                text_length: text.length,
                voice_id,
                method: 'elevenlabs',
                message: 'Successfully synthesized speech with ElevenLabs!',
            });
        }
        logger_1.logger.error('Invalid voice_id format. Only ElevenLabs voices are supported:', { voice_id, normalizedVoiceId });
        return res.status(400).json({
            error: 'Invalid voice selection',
            details: 'Only ElevenLabs professional voices are supported. Please select a voice from the ElevenLabs voice selector.',
            voice_id: normalizedVoiceId,
        });
    }
    catch (error) {
        logger_1.logger.error('Speech synthesis error:', error);
        if (error.response) {
            return res.status(error.response.status).json({
                error: error.response.data?.error || 'Speech synthesis failed'
            });
        }
        return res.status(500).json({
            error: 'Speech synthesis failed',
            details: error.message || 'An unexpected error occurred during voice synthesis'
        });
    }
});
router.use(auth_1.authenticate);
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
        const templates = await prisma_1.prisma.videoTemplate.findMany({
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
        const template = await prisma_1.prisma.videoTemplate.findFirst({
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
        const template = await prisma_1.prisma.videoTemplate.create({
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
        const template = await prisma_1.prisma.videoTemplate.create({
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
router.put('/templates/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, category, tags, isFavorite } = req.body;
        const template = await prisma_1.prisma.videoTemplate.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        const updated = await prisma_1.prisma.videoTemplate.update({
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
router.post('/templates/generate-from-prompt', async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({
                error: 'Prompt is required',
                details: 'Please provide a description for the video you want to create'
            });
        }
        logger_1.logger.info('Generating video from prompt:', { prompt: prompt.substring(0, 100), user: req.user?.email });
        const aiPrompt = `You are an expert video content creator specializing in tech videos.

User wants to create a 30-second tech video with this description: "${prompt}"

Your task:
1. Extract 3-5 relevant keywords for finding stock footage (focus on: technology, cloud, data, software, coding, AI, etc.)
2. Generate a compelling 30-second narration script
3. Suggest video structure (intro, main, outro timing)

Respond in JSON format:
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "script": "Full narration script here...",
  "title": "Short title for the video",
  "structure": {
    "intro": "0-5s",
    "main": "5-25s",
    "outro": "25-30s"
  }
}`;
        const aiResponse = await anthropic.messages.create({
            model: ai_1.AI_CONFIG.model,
            max_tokens: ai_1.AI_CONFIG.maxTokens,
            messages: [{ role: 'user', content: aiPrompt }],
            ...(0, ai_1.getAIMessageConfig)(),
        });
        const aiContent = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '';
        let videoData;
        try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }
            videoData = JSON.parse(jsonMatch[0]);
        }
        catch (parseError) {
            logger_1.logger.error('Failed to parse AI response:', parseError);
            return res.status(500).json({
                error: 'Failed to generate video structure',
                details: 'AI response could not be parsed'
            });
        }
        const PEXELS_API_KEY = process.env.PEXELS_API_KEY || 'YOUR_PEXELS_API_KEY';
        const searchQuery = videoData.keywords.join(' ');
        let stockVideos = [];
        try {
            const pexelsResponse = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=landscape`, {
                headers: {
                    Authorization: PEXELS_API_KEY,
                },
            });
            if (pexelsResponse.ok) {
                const pexelsData = await pexelsResponse.json();
                stockVideos = pexelsData.videos || [];
                logger_1.logger.info('Fetched stock videos:', { count: stockVideos.length, query: searchQuery });
            }
            else {
                logger_1.logger.warn('Pexels API failed, using fallback');
            }
        }
        catch (pexelsError) {
            logger_1.logger.error('Pexels API error:', pexelsError);
        }
        const selectedClips = stockVideos
            .filter((v) => v.video_files && v.video_files.length > 0)
            .slice(0, 3)
            .map((v) => {
            const hdFile = v.video_files.find((f) => f.quality === 'hd' || f.quality === 'sd') || v.video_files[0];
            return {
                url: hdFile.link,
                duration: v.duration,
                width: hdFile.width,
                height: hdFile.height,
            };
        });
        if (selectedClips.length === 0) {
            return res.status(500).json({
                error: 'No suitable video clips found',
                details: 'Try using different keywords or check Pexels API configuration'
            });
        }
        const template = await prisma_1.prisma.videoTemplate.create({
            data: {
                name: videoData.title || `AI Generated: ${prompt.substring(0, 30)}...`,
                description: `Generated from prompt: ${prompt}`,
                category: 'Tech',
                tags: videoData.keywords,
                userId: req.user.id,
                isSystem: false,
                isFavorite: false,
                videoUrl: selectedClips[0].url,
                metadata: {
                    aiGenerated: true,
                    prompt,
                    script: videoData.script,
                    structure: videoData.structure,
                    clips: selectedClips,
                    keywords: videoData.keywords,
                },
            },
        });
        logger_1.logger.info('Created AI-generated template:', { templateId: template.id, name: template.name });
        return res.status(201).json({
            template,
            videoData: {
                script: videoData.script,
                keywords: videoData.keywords,
                clips: selectedClips,
                message: 'Video template generated! You can now use this to create a campaign.',
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Prompt-to-video generation error:', error);
        return res.status(500).json({
            error: 'Failed to generate video from prompt',
            details: error.message,
        });
    }
});
router.get('/pexels/search', auth_1.authenticate, async (req, res, next) => {
    try {
        const { query, page = '1', per_page = '12' } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                error: 'Search query is required',
                details: 'Please provide a search query parameter'
            });
        }
        const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
        if (!PEXELS_API_KEY) {
            return res.status(500).json({
                error: 'Pexels API not configured',
                details: 'Please add PEXELS_API_KEY to environment variables'
            });
        }
        const pexelsResponse = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${per_page}&page=${page}&orientation=landscape`, {
            headers: {
                Authorization: PEXELS_API_KEY,
            },
        });
        if (!pexelsResponse.ok) {
            const errorText = await pexelsResponse.text();
            logger_1.logger.error('Pexels API error:', { status: pexelsResponse.status, error: errorText });
            return res.status(pexelsResponse.status).json({
                error: 'Pexels API request failed',
                details: errorText
            });
        }
        const data = await pexelsResponse.json();
        logger_1.logger.info('Pexels search successful:', {
            query,
            page,
            resultsCount: data.videos?.length || 0,
            totalResults: data.total_results
        });
        return res.status(200).json({
            videos: data.videos || [],
            page: data.page || 1,
            per_page: data.per_page || 12,
            total_results: data.total_results || 0,
            next_page: data.next_page,
        });
    }
    catch (error) {
        logger_1.logger.error('Pexels search error:', error);
        return res.status(500).json({
            error: 'Failed to search Pexels videos',
            details: error.message,
        });
    }
});
router.post('/analyze-script', auth_1.authenticate, async (req, res, next) => {
    try {
        const { script, voiceId } = req.body;
        if (!script || !script.trim()) {
            return res.status(400).json({
                error: 'Script is required',
                details: 'Please provide a script to analyze'
            });
        }
        logger_1.logger.info('Analyzing script for template matching:', {
            scriptLength: script.length,
            user: req.user?.email
        });
        const aiPrompt = `You are an expert video production analyst. Analyze this narration script for a business video:

"${script}"

Provide a comprehensive analysis in JSON format:
{
  "estimatedDuration": <number in seconds, based on average speech rate of 150 words per minute>,
  "wordCount": <number of words>,
  "tone": "<professional|casual|energetic|calm|inspiring>",
  "pacing": "<fast|moderate|slow>",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "themes": ["theme1", "theme2"],
  "visualSuggestions": ["suggestion1", "suggestion2"],
  "recommendedDurationRange": {
    "min": <minimum seconds>,
    "max": <maximum seconds>
  },
  "complexity": "<simple|moderate|complex>",
  "callToAction": <boolean>,
  "technicalLevel": "<beginner|intermediate|advanced>"
}

Be precise with duration calculation. A typical speaking pace is 150 words per minute (2.5 words per second).`;
        const aiResponse = await anthropic.messages.create({
            model: ai_1.AI_CONFIG.model,
            max_tokens: 2000,
            messages: [{ role: 'user', content: aiPrompt }],
            ...(0, ai_1.getAIMessageConfig)(),
        });
        const aiContent = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '';
        let analysis;
        try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }
            analysis = JSON.parse(jsonMatch[0]);
        }
        catch (parseError) {
            logger_1.logger.error('Failed to parse script analysis:', parseError);
            const words = script.trim().split(/\s+/).length;
            const estimatedDuration = Math.ceil((words / 150) * 60);
            analysis = {
                estimatedDuration,
                wordCount: words,
                tone: 'professional',
                pacing: 'moderate',
                keywords: [],
                themes: [],
                visualSuggestions: [],
                recommendedDurationRange: {
                    min: Math.max(10, estimatedDuration - 5),
                    max: estimatedDuration + 10
                },
                complexity: 'moderate',
                callToAction: false,
                technicalLevel: 'intermediate'
            };
        }
        const templates = await prisma_1.prisma.videoTemplate.findMany({
            where: {
                OR: [
                    { isSystem: true },
                    { userId: req.user.id }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        const scoredTemplates = templates.map(template => {
            let score = 100;
            const reasons = [];
            const templateMetadata = template.metadata;
            const templateDuration = templateMetadata?.duration || 30;
            const durationDiff = Math.abs(templateDuration - analysis.estimatedDuration);
            if (durationDiff <= 5) {
                score += 20;
                reasons.push(`Perfect duration match (${templateDuration}s)`);
            }
            else if (durationDiff <= 10) {
                score += 10;
                reasons.push(`Good duration (${templateDuration}s, script needs ~${analysis.estimatedDuration}s)`);
            }
            else if (durationDiff <= 15) {
                score -= 10;
                reasons.push(`Acceptable duration (${templateDuration}s, script needs ~${analysis.estimatedDuration}s)`);
            }
            else {
                score -= 30;
                reasons.push(`Duration mismatch (${templateDuration}s vs ${analysis.estimatedDuration}s needed)`);
            }
            const templateTags = template.tags || [];
            const matchingKeywords = analysis.keywords.filter((kw) => templateTags.some((tag) => tag.toLowerCase().includes(kw.toLowerCase()) || kw.toLowerCase().includes(tag.toLowerCase())));
            if (matchingKeywords.length > 0) {
                score += matchingKeywords.length * 5;
                reasons.push(`Matches keywords: ${matchingKeywords.join(', ')}`);
            }
            if (template.category && analysis.themes) {
                const categoryMatch = analysis.themes.some((theme) => template.category?.toLowerCase().includes(theme.toLowerCase()));
                if (categoryMatch) {
                    score += 10;
                    reasons.push(`Category matches theme`);
                }
            }
            const daysSinceCreated = (Date.now() - new Date(template.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceCreated < 7) {
                score += 5;
                reasons.push('Recently created');
            }
            if (template.isFavorite) {
                score += 15;
                reasons.push('User favorite');
            }
            return {
                ...template,
                matchScore: Math.max(0, Math.min(150, score)),
                matchReasons: reasons,
                durationCompatibility: durationDiff <= 10 ? 'excellent' : durationDiff <= 15 ? 'good' : 'poor'
            };
        });
        const rankedTemplates = scoredTemplates.sort((a, b) => b.matchScore - a.matchScore);
        logger_1.logger.info('Script analysis complete:', {
            duration: analysis.estimatedDuration,
            templatesAnalyzed: templates.length,
            topScore: rankedTemplates[0]?.matchScore
        });
        return res.status(200).json({
            analysis,
            recommendations: {
                topTemplates: rankedTemplates.slice(0, 5),
                shouldGenerateNew: rankedTemplates[0]?.matchScore < 80,
                totalAnalyzed: templates.length
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Script analysis error:', error);
        return res.status(500).json({
            error: 'Failed to analyze script',
            details: error.message,
        });
    }
});
router.get('/elevenlabs/voices', auth_1.authenticate, async (req, res, next) => {
    try {
        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!ELEVENLABS_API_KEY) {
            return res.status(500).json({
                error: 'ElevenLabs API not configured',
                details: 'Please add ELEVENLABS_API_KEY to environment variables'
            });
        }
        const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
            },
        });
        if (!elevenLabsResponse.ok) {
            const errorText = await elevenLabsResponse.text();
            logger_1.logger.error('ElevenLabs API error:', { status: elevenLabsResponse.status, error: errorText });
            return res.status(elevenLabsResponse.status).json({
                error: 'ElevenLabs API request failed',
                details: errorText
            });
        }
        const data = await elevenLabsResponse.json();
        const formattedVoices = (data.voices || []).map((voice) => ({
            voice_id: `elevenlabs:${voice.voice_id}`,
            name: voice.name,
            preview_url: voice.preview_url,
            category: voice.category || 'generated',
            labels: voice.labels || {},
            description: voice.description || '',
        }));
        logger_1.logger.info('ElevenLabs voices fetched successfully:', {
            voicesCount: formattedVoices.length
        });
        return res.status(200).json({
            voices: formattedVoices,
        });
    }
    catch (error) {
        logger_1.logger.error('ElevenLabs voices error:', error);
        return res.status(500).json({
            error: 'Failed to fetch ElevenLabs voices',
            details: error.message,
        });
    }
});
router.post('/templates/:id/favorite', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await prisma_1.prisma.videoTemplate.findFirst({
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
        const updated = await prisma_1.prisma.videoTemplate.update({
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
        const template = await prisma_1.prisma.videoTemplate.findFirst({
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
        await prisma_1.prisma.videoTemplate.delete({ where: { id } });
        return res.json({ message: 'Template deleted successfully' });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/upload-logo', imageUpload.single('logo'), async (req, res, next) => {
    try {
        logger_1.logger.info('Logo upload request received:', {
            hasFile: !!req.file,
            contentType: req.headers['content-type'],
            user: req.user?.email,
        });
        if (!req.file) {
            logger_1.logger.error('Logo upload: No file provided');
            return res.status(400).json({
                error: 'Logo file is required',
                details: 'Please upload an image file (PNG, JPG, or SVG)'
            });
        }
        const file = req.file;
        const fileName = `logos/${req.user.id}/${Date.now()}-${file.originalname}`;
        logger_1.logger.info('Uploading logo to S3:', {
            fileName,
            size: file.size,
            bucket: S3_BUCKET,
            mimetype: file.mimetype,
        });
        const uploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await s3Client.send(uploadCommand);
        const logoUrl = `https://${CLOUDFRONT_DOMAIN}/${fileName}`;
        logger_1.logger.info('Logo file uploaded successfully:', {
            user: req.user?.email,
            fileName,
            size: file.size,
            logoUrl,
        });
        return res.json({ logoUrl });
    }
    catch (error) {
        logger_1.logger.error('Logo upload error:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack,
        });
        if (error.name === 'NoSuchBucket') {
            return res.status(500).json({
                error: 'Storage configuration error',
                details: 'S3 bucket not found. Contact support.'
            });
        }
        if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
            return res.status(500).json({
                error: 'Storage authentication error',
                details: 'Invalid AWS credentials. Contact support.'
            });
        }
        return res.status(500).json({
            error: 'Logo upload failed',
            details: error.message || 'An unknown error occurred'
        });
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
        const campaigns = await prisma_1.prisma.videoCampaign.findMany({
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
        const total = await prisma_1.prisma.videoCampaign.count({ where });
        return res.json({ campaigns, total });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/embed-in-template', (req, res, next) => {
    logger_1.logger.info('🚀 [EMBED] Route handler ENTERED - BEFORE authenticate middleware');
    logger_1.logger.info(`🚀 [EMBED] Method: ${req.method}, Path: ${req.path}, OriginalUrl: ${req.originalUrl}`);
    logger_1.logger.info(`🚀 [EMBED] Params:`, req.params);
    logger_1.logger.info(`🚀 [EMBED] Body:`, req.body);
    logger_1.logger.info(`🚀 [EMBED] Auth header present: ${!!req.headers.authorization}`);
    next();
}, auth_1.authenticate, async (req, res, next) => {
    logger_1.logger.info('🎬 [EMBED] AFTER authenticate middleware - Starting embed process');
    try {
        logger_1.logger.info('🎬 EMBED ROUTE HIT - Starting embed process');
        const { id } = req.params;
        const { emailTemplateId } = req.body;
        logger_1.logger.info(`📋 Campaign ID: ${id}`);
        logger_1.logger.info(`📧 Email Template ID: ${emailTemplateId}`);
        logger_1.logger.info(`👤 User ID: ${req.user?.id}`);
        if (!emailTemplateId) {
            logger_1.logger.warn('⚠️ No email template ID provided');
            return res.status(400).json({ error: 'Email template ID is required' });
        }
        logger_1.logger.info('🔍 Step 1: Fetching video campaign from database...');
        const campaign = await prisma_1.prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
            include: {
                template: true,
            },
        });
        if (!campaign) {
            logger_1.logger.error('❌ Campaign not found');
            return res.status(404).json({ error: 'Video campaign not found' });
        }
        logger_1.logger.info(`✅ Campaign found: ${campaign.name}, Status: ${campaign.status}`);
        if (campaign.status !== 'READY') {
            logger_1.logger.warn(`⚠️ Campaign status is ${campaign.status}, not READY`);
            return res.status(400).json({ error: 'Video campaign is not ready yet' });
        }
        const videoUrl = campaign.videoUrl || campaign.customVideoUrl;
        if (!videoUrl) {
            logger_1.logger.error('❌ No video URL found in campaign');
            return res.status(400).json({ error: 'Video URL not found' });
        }
        logger_1.logger.info(`🎥 Video URL: ${videoUrl}`);
        logger_1.logger.info(`🎬 Video Template: ${campaign.template?.name || 'None'}`);
        logger_1.logger.info('🔍 Step 2: Fetching email template from database...');
        const emailTemplate = await prisma_1.prisma.emailTemplate.findFirst({
            where: {
                id: emailTemplateId,
                userId: req.user.id,
            },
        });
        if (!emailTemplate) {
            logger_1.logger.error('❌ Email template not found');
            return res.status(404).json({ error: 'Email template not found' });
        }
        logger_1.logger.info(`✅ Email template found: ${emailTemplate.name}`);
        logger_1.logger.info('🔧 Step 3: Processing HTML content...');
        let updatedHtmlContent = emailTemplate.htmlContent;
        logger_1.logger.info(`📊 Original HTML analysis:`);
        logger_1.logger.info(`  - Has <video> tags: ${emailTemplate.htmlContent.includes('<video>')}`);
        logger_1.logger.info(`  - Has .mp4 URLs: ${emailTemplate.htmlContent.includes('.mp4')}`);
        logger_1.logger.info(`  - Has <img> tags: ${emailTemplate.htmlContent.includes('<img')}`);
        logger_1.logger.info(`  - Template length: ${emailTemplate.htmlContent.length} characters`);
        const videoTagMatches = (emailTemplate.htmlContent.match(/(<video[^>]*>\s*<source\s+src=")[^"]*(")/gi) || []).length;
        const campaignImgMatches = (emailTemplate.htmlContent.match(/<img\s+src="https:\/\/[^"]*campaign-[^"]*\.mp4"[^>]*>/gi) || []).length;
        const mp4ImgMatches = (emailTemplate.htmlContent.match(/(<img\s+src=")https:\/\/[^"]*\.mp4(")/gi) || []).length;
        logger_1.logger.info(`📝 Regex matches found:`);
        logger_1.logger.info(`  - <video> tags to replace: ${videoTagMatches}`);
        logger_1.logger.info(`  - <img> with campaign-*.mp4: ${campaignImgMatches}`);
        logger_1.logger.info(`  - <img> with any .mp4: ${mp4ImgMatches}`);
        updatedHtmlContent = updatedHtmlContent.replace(/(<video[^>]*>\s*<source\s+src=")[^"]*(")/gi, `$1${videoUrl}$2`);
        updatedHtmlContent = updatedHtmlContent.replace(/<img\s+src="https:\/\/[^"]*campaign-[^"]*\.mp4"[^>]*>/gi, `<video controls style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; border-radius: 8px;">
        <source src="${videoUrl}" type="video/mp4">
        Your email client doesn't support video playback. <a href="${videoUrl}" style="color: #7c3aed;">Click here to watch the video</a>.
      </video>`);
        updatedHtmlContent = updatedHtmlContent.replace(/(<img\s+src=")https:\/\/[^"]*\.mp4(")/gi, `<video controls style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; border-radius: 8px;">
        <source src="${videoUrl}" type="video/mp4">
        Your email client doesn't support video playback. <a href="${videoUrl}" style="color: #7c3aed;">Click here to watch the video</a>.
      </video>`);
        const updatedTextContent = emailTemplate.textContent
            ? emailTemplate.textContent.replace(/Watch the video: .*/, `Watch the video: ${videoUrl}`)
            : `Watch the video: ${videoUrl}`;
        const htmlChanged = updatedHtmlContent !== emailTemplate.htmlContent;
        logger_1.logger.info(`✏️ HTML content changed: ${htmlChanged}`);
        if (!htmlChanged) {
            logger_1.logger.warn('⚠️ No video placeholders found in template - inserting new video section');
            const videoPlayerHtml = `
<div style="text-align: center; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
  <h2 style="color: white; margin-bottom: 15px; font-family: Arial, sans-serif;">📹 Watch Our Video</h2>
  <video controls style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <source src="${videoUrl}" type="video/mp4">
    Your email client doesn't support video playback. <a href="${videoUrl}" style="color: #ffd700;">Click here to watch the video</a>.
  </video>
</div>
`;
            if (updatedHtmlContent.includes('<body')) {
                updatedHtmlContent = updatedHtmlContent.replace(/(<body[^>]*>)/i, `$1\n${videoPlayerHtml}\n`);
                logger_1.logger.info('✅ Inserted video after <body> tag');
            }
            else {
                updatedHtmlContent = videoPlayerHtml + '\n' + updatedHtmlContent;
                logger_1.logger.info('✅ Inserted video at the beginning of template');
            }
            logger_1.logger.info(`📐 New HTML length after insertion: ${updatedHtmlContent.length} characters`);
            logger_1.logger.info(`📐 Added: ${updatedHtmlContent.length - emailTemplate.htmlContent.length} characters`);
        }
        else {
            logger_1.logger.info(`📐 New HTML length: ${updatedHtmlContent.length} characters`);
            logger_1.logger.info(`📐 Difference: ${updatedHtmlContent.length - emailTemplate.htmlContent.length} characters`);
        }
        logger_1.logger.info('💾 Step 4: Updating email template in database...');
        logger_1.logger.info(`  - Setting videoTemplateId: ${campaign.templateId || campaign.id}`);
        logger_1.logger.info(`  - Setting videoTemplateName: ${campaign.template?.name || campaign.name}`);
        const updateStartTime = Date.now();
        const updatedTemplate = await prisma_1.prisma.emailTemplate.update({
            where: { id: emailTemplateId },
            data: {
                htmlContent: updatedHtmlContent,
                textContent: updatedTextContent,
                videoTemplateId: campaign.templateId || campaign.id,
                videoTemplateName: campaign.template?.name || campaign.name,
                updatedAt: new Date(),
            },
        });
        const updateDuration = Date.now() - updateStartTime;
        logger_1.logger.info(`✅ Database update completed in ${updateDuration}ms`);
        logger_1.logger.info(`✅ Successfully embedded video from campaign "${campaign.name}" into email template "${emailTemplate.name}"`);
        logger_1.logger.info(`📧 Updated template ID: ${updatedTemplate.id}`);
        logger_1.logger.info(`🎬 Video template name set to: ${updatedTemplate.videoTemplateName}`);
        logger_1.logger.info('🏁 EMBED PROCESS COMPLETE - Sending response to client');
        return res.json({
            success: true,
            emailTemplate: updatedTemplate,
            message: 'Video successfully embedded in email template',
        });
    }
    catch (error) {
        logger_1.logger.error('❌ ERROR in embed-in-template endpoint:', error);
        logger_1.logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        return next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma_1.prisma.videoCampaign.findFirst({
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
        logger_1.logger.info('Create campaign request:', {
            user: req.user?.email,
            body: { ...req.body, narrationScript: req.body.narrationScript?.substring(0, 50) + '...' },
        });
        logger_1.logger.info('🎤 VOICE DEBUG - voiceId from request:', req.body.voiceId);
        const { name, narrationScript, tone, videoSource, templateId, customVideoUrl, voiceId, customVoiceUrl, clientLogoUrl, userLogoUrl, bgmUrl, bgmVolume, textOverlays, companyIds, emailTemplateId, } = req.body;
        if (!name || !name.trim()) {
            logger_1.logger.error('Campaign creation: Missing name');
            return res.status(400).json({
                error: 'Campaign name is required',
                details: 'Please provide a name for your video campaign',
                field: 'name'
            });
        }
        if (!narrationScript || !narrationScript.trim()) {
            logger_1.logger.error('Campaign creation: Missing narration script');
            return res.status(400).json({
                error: 'Narration script is required',
                details: 'Please provide a script or generate one using AI',
                field: 'narrationScript'
            });
        }
        if (videoSource === 'TEMPLATE' && !templateId) {
            logger_1.logger.error('Campaign creation: Template source but no templateId');
            return res.status(400).json({
                error: 'Template ID is required when using template source',
                details: 'Please select a video template',
                field: 'templateId'
            });
        }
        if ((videoSource === 'CUSTOM_UPLOAD' || videoSource === 'URL') && !customVideoUrl) {
            logger_1.logger.error('Campaign creation: Custom source but no URL');
            return res.status(400).json({
                error: 'Custom video URL is required',
                details: 'Please upload a video or provide a URL',
                field: 'customVideoUrl'
            });
        }
        logger_1.logger.info('Creating campaign in database...');
        const campaign = await prisma_1.prisma.videoCampaign.create({
            data: {
                name,
                narrationScript,
                tone: tone || 'professional',
                videoSource: videoSource || 'TEMPLATE',
                templateId,
                customVideoUrl,
                voiceId,
                customVoiceUrl,
                clientLogoUrl,
                userLogoUrl,
                bgmUrl,
                bgmVolume: bgmVolume !== undefined ? bgmVolume : 0.1,
                textOverlays,
                emailTemplateId: emailTemplateId || null,
                userId: req.user.id,
                status: 'DRAFT',
            },
        });
        logger_1.logger.info('Campaign created successfully:', { campaignId: campaign.id });
        if (companyIds && Array.isArray(companyIds) && companyIds.length > 0) {
            await prisma_1.prisma.videoCampaignCompany.createMany({
                data: companyIds.map((companyId) => ({
                    campaignId: campaign.id,
                    companyId,
                })),
                skipDuplicates: true,
            });
            logger_1.logger.info('Added companies to campaign:', { count: companyIds.length });
        }
        return res.status(201).json({ campaign });
    }
    catch (error) {
        logger_1.logger.error('Campaign creation error:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
        });
        if (error.code === 'P2002') {
            return res.status(400).json({
                error: 'Campaign with this name already exists',
                details: 'Please use a different campaign name'
            });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({
                error: 'Invalid reference',
                details: 'Template or company ID not found'
            });
        }
        return res.status(500).json({
            error: 'Failed to create campaign',
            details: error.message
        });
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, narrationScript, tone, voiceId, customVoiceUrl, clientLogoUrl, userLogoUrl, bgmUrl, bgmVolume, textOverlays, } = req.body;
        const campaign = await prisma_1.prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const updated = await prisma_1.prisma.videoCampaign.update({
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
        const campaign = await prisma_1.prisma.videoCampaign.findFirst({
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
        await prisma_1.prisma.videoCampaign.delete({ where: { id } });
        return res.json({ message: 'Campaign deleted successfully' });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/companies/:companyId', async (req, res, next) => {
    try {
        const { id, companyId } = req.params;
        const campaign = await prisma_1.prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const company = await prisma_1.prisma.company.findFirst({
            where: {
                id: companyId,
                userId: req.user.id,
            },
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const existing = await prisma_1.prisma.videoCampaignCompany.findUnique({
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
        const campaignCompany = await prisma_1.prisma.videoCampaignCompany.create({
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
        const campaign = await prisma_1.prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        await prisma_1.prisma.videoCampaignCompany.delete({
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
        const { companyName, companyIndustry, tone, goal, userCompanyName } = req.body;
        logger_1.logger.info('Video AI script generation request:', {
            user: req.user?.email,
            userId: req.user?.id,
            companyName,
            userCompanyName,
            model: ai_1.AI_CONFIG.model,
            maxTokens: ai_1.AI_CONFIG.maxTokens.content,
            apiKeyConfigured: !!ai_1.AI_CONFIG.apiKey,
            apiKeyLength: ai_1.AI_CONFIG.apiKey?.length,
        });
        if (!ai_1.AI_CONFIG.apiKey) {
            logger_1.logger.error('Anthropic API key not configured!');
            return res.status(500).json({
                error: 'AI service not configured',
                details: 'Anthropic API key is missing. Please contact administrator.',
            });
        }
        if (!companyName) {
            return res.status(400).json({ error: 'Company name is required' });
        }
        const senderCompany = userCompanyName || 'our company';
        const prompt = `You are an expert video marketing script writer. Generate a compelling 30-60 second video narration script for a business video.

Target Company Name: ${companyName}
Target Company Industry: ${companyIndustry || 'Not specified'}
Sender Company Name: ${senderCompany}
Tone: ${tone || 'professional'}
Goal: ${goal || 'Welcome and introduce our company'}

Generate a personalized, engaging script that:
1. Welcomes the target company (${companyName}) by name
2. Introduces the sender company (${senderCompany}) and its value proposition
3. Highlights potential benefits or solutions for ${companyName}
4. Ends with a call to action

Keep it between 100-150 words (30-60 seconds when spoken).
Use a ${tone || 'professional'} tone.

IMPORTANT: Return ONLY properly escaped JSON. The script should be a single string without line breaks.
Return in this exact format:
{"script": "Your complete narration script in one continuous line without newlines..."}`;
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
            let result;
            try {
                result = JSON.parse(jsonText);
            }
            catch (parseError) {
                logger_1.logger.error('JSON parse error in video AI response:', {
                    error: parseError.message,
                    rawResponse: jsonText.substring(0, 500),
                    responseLength: jsonText.length,
                });
                const scriptMatch = jsonText.match(/"script"\s*:\s*"([^"]*)"/s);
                if (scriptMatch) {
                    result = { script: scriptMatch[1] };
                }
                else {
                    throw new Error(`AI returned invalid JSON: ${parseError.message}. Response: ${jsonText.substring(0, 200)}...`);
                }
            }
            logger_1.logger.info('Video AI script generation SUCCESS:', {
                user: req.user?.email,
                model: ai_1.AI_CONFIG.model,
                scriptLength: result.script?.length || 0,
            });
            return res.json(result);
        }
        return res.status(500).json({ error: 'Unexpected response format' });
    }
    catch (error) {
        logger_1.logger.error('AI script generation error:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            statusCode: error.status || error.statusCode,
            errorType: error.type,
            model: ai_1.AI_CONFIG.model,
            apiKeyPresent: !!ai_1.AI_CONFIG.apiKey,
            apiKeyPrefix: ai_1.AI_CONFIG.apiKey?.substring(0, 15),
        });
        let details = error.message;
        if (error.status === 429) {
            details = 'AI service rate limit exceeded. Please try again in a few moments.';
        }
        else if (error.status === 401) {
            details = 'AI service authentication failed. Invalid API key.';
        }
        else if (error.status === 404) {
            details = `AI model '${ai_1.AI_CONFIG.model}' not found or not available with this API key.`;
        }
        return res.status(500).json({
            error: 'Failed to generate script',
            details,
            model: ai_1.AI_CONFIG.model,
            errorType: error.name,
            statusCode: error.status || error.statusCode,
        });
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
async function pollVideoStatus(jobId, externalJobId, campaignId) {
    const videoServiceUrl = process.env.VIDEO_GENERATOR_SERVICE_URL || 'http://localhost:5002';
    const axios = require('axios');
    const maxAttempts = 120;
    let attempts = 0;
    const poll = async () => {
        try {
            logger_1.logger.info(`[POLL] Checking status for job ${externalJobId}, campaign ${campaignId}`);
            const response = await axios.get(`${videoServiceUrl}/api/video/status/${externalJobId}`);
            const status = response.data;
            logger_1.logger.info(`[POLL] Received status:`, {
                status: status.status,
                progress: status.progress,
                videoUrl: status.videoUrl,
                hasVideoUrl: !!status.videoUrl,
            });
            await prisma_1.prisma.videoGenerationJob.update({
                where: { id: jobId },
                data: {
                    status: status.status,
                    progress: status.progress || 0,
                    currentStep: status.currentStep || 'Processing...',
                    errorMessage: status.error,
                },
            });
            if (status.status === 'completed' && status.videoUrl) {
                logger_1.logger.info(`[POLL] Updating campaign ${campaignId} to READY with URL: ${status.videoUrl}`);
                const now = new Date();
                const campaign = await prisma_1.prisma.videoCampaign.findUnique({
                    where: { id: campaignId },
                    include: {
                        companies: {
                            include: {
                                company: true,
                            },
                        },
                        template: true,
                    },
                });
                if (!campaign) {
                    logger_1.logger.error(`Campaign ${campaignId} not found for completion`);
                    return;
                }
                await prisma_1.prisma.videoCampaign.update({
                    where: { id: campaignId },
                    data: {
                        status: 'READY',
                        videoUrl: status.videoUrl,
                        generatedAt: now,
                    },
                });
                logger_1.logger.info(`✅ Video generation completed for campaign ${campaignId}: ${status.videoUrl}`);
                try {
                    const formattedDate = now.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    });
                    const formattedTime = now.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                    const companyNames = campaign.companies.map((cc) => cc.company.name).join(', ');
                    const templateName = companyNames
                        ? `${campaign.name} - ${companyNames} - ${formattedDate} ${formattedTime}`
                        : `${campaign.name} - ${formattedDate} ${formattedTime}`;
                    if (campaign.emailTemplateId) {
                        const existingTemplate = await prisma_1.prisma.emailTemplate.findUnique({
                            where: { id: campaign.emailTemplateId },
                        });
                        if (existingTemplate) {
                            const updatedHtmlContent = existingTemplate.htmlContent.replace(/src="[^"]*"/g, `src="${status.videoUrl}"`);
                            const updatedTextContent = existingTemplate.textContent
                                ? existingTemplate.textContent.replace(/Watch the video: .*/, `Watch the video: ${status.videoUrl}`)
                                : `Hi {{recipientName}}!\n\nI created this personalized video just for you and {{companyName}}.\n\nWatch the video: ${status.videoUrl}\n\n{{ctaText}}: {{ctaLink}}\n\nCreated on ${formattedDate} at ${formattedTime}`;
                            await prisma_1.prisma.emailTemplate.update({
                                where: { id: campaign.emailTemplateId },
                                data: {
                                    htmlContent: updatedHtmlContent,
                                    textContent: updatedTextContent,
                                    videoTemplateId: campaign.templateId,
                                    videoTemplateName: campaign.template?.name || null,
                                    updatedAt: now,
                                },
                            });
                            logger_1.logger.info(`📧 Updated linked email template ${campaign.emailTemplateId} with video URL and template info for campaign ${campaignId}`);
                        }
                        else {
                            logger_1.logger.warn(`⚠️ Linked email template ${campaign.emailTemplateId} not found for campaign ${campaignId}, creating new template`);
                        }
                    }
                    if (!campaign.emailTemplateId) {
                        const emailTemplate = await prisma_1.prisma.emailTemplate.create({
                            data: {
                                name: templateName,
                                subject: `Personalized Video for {{companyName}}`,
                                videoTemplateId: campaign.templateId,
                                videoTemplateName: campaign.template?.name || null,
                                htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 20px 0; color: #333333; font-size: 28px;">Hi {{recipientName}}!</h1>
              <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 24px;">I created this personalized video just for you and {{companyName}}.</p>

              <!-- Video Player -->
              <div style="margin: 0 0 30px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <video controls style="width: 100%; height: auto; display: block;" poster="">
                  <source src="${status.videoUrl}" type="video/mp4">
                  Your email client doesn't support video playback. <a href="${status.videoUrl}" style="color: #7c3aed;">Click here to watch the video</a>.
                </video>
              </div>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 22px;">This video was created specifically for {{companyName}} using AI-powered personalization.</p>

              <a href="{{ctaLink}}" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">{{ctaText}}</a>

              <p style="margin: 30px 0 0 0; color: #999999; font-size: 12px;">
                Created on ${formattedDate} at ${formattedTime}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
                                textContent: `Hi {{recipientName}}!\n\nI created this personalized video just for you and {{companyName}}.\n\nWatch the video: ${status.videoUrl}\n\n{{ctaText}}: {{ctaLink}}\n\nCreated on ${formattedDate} at ${formattedTime}`,
                                variables: ['recipientName', 'companyName', 'ctaText', 'ctaLink'],
                                variableValues: {
                                    ctaText: 'Schedule a Demo',
                                    ctaLink: 'https://brandmonkz.com/demo',
                                },
                                isActive: true,
                                userId: campaign.userId,
                            },
                        });
                        logger_1.logger.info(`📧 Auto-created email template ${emailTemplate.id} for campaign ${campaignId}`);
                    }
                }
                catch (emailError) {
                    logger_1.logger.error(`⚠️ Failed to handle email template for campaign ${campaignId}:`, emailError);
                }
                return;
            }
            if (status.status === 'failed') {
                await prisma_1.prisma.videoCampaign.update({
                    where: { id: campaignId },
                    data: {
                        status: 'FAILED',
                        generationError: status.error || 'Video generation failed',
                    },
                });
                logger_1.logger.error(`Video generation failed for campaign ${campaignId}: ${status.error}`);
                return;
            }
            if (status.status === 'processing' || status.status === 'pending') {
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 10000);
                }
                else {
                    await prisma_1.prisma.videoCampaign.update({
                        where: { id: campaignId },
                        data: {
                            status: 'FAILED',
                            generationError: 'Video generation timed out',
                        },
                    });
                    logger_1.logger.error(`Video generation timed out for campaign ${campaignId}`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Poll video status error:', error);
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(poll, 10000);
            }
            else {
                await prisma_1.prisma.videoCampaign.update({
                    where: { id: campaignId },
                    data: {
                        status: 'FAILED',
                        generationError: 'Failed to check video generation status',
                    },
                });
            }
        }
    };
    setTimeout(poll, 5000);
}
router.post('/:id/generate', async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma_1.prisma.videoCampaign.findFirst({
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
        await prisma_1.prisma.videoCampaign.update({
            where: { id },
            data: { status: 'GENERATING' },
        });
        const job = await prisma_1.prisma.videoGenerationJob.create({
            data: {
                campaignId: id,
                status: 'pending',
                currentStep: 'Initializing',
            },
        });
        const videoServiceUrl = process.env.VIDEO_GENERATOR_SERVICE_URL || 'http://localhost:5002';
        const axios = require('axios');
        try {
            const videoGenResponse = await axios.post(`${videoServiceUrl}/api/video/generate`, {
                campaignId: campaign.id,
                narrationScript: campaign.narrationScript,
                templateUrl: campaign.template?.videoUrl || campaign.customVideoUrl,
                voiceId: campaign.voiceId,
                customVoiceUrl: campaign.customVoiceUrl,
                clientLogoUrl: campaign.clientLogoUrl,
                userLogoUrl: campaign.userLogoUrl,
                bgmUrl: campaign.bgmUrl,
                textOverlays: campaign.textOverlays,
            }, {
                timeout: 10000,
            });
            logger_1.logger.info(`Video generation job created: ${videoGenResponse.data.jobId}`);
            await prisma_1.prisma.videoGenerationJob.update({
                where: { id: job.id },
                data: {
                    queueId: videoGenResponse.data.jobId,
                    status: 'processing',
                    currentStep: 'Video generation queued',
                    startedAt: new Date(),
                },
            });
            pollVideoStatus(job.id, videoGenResponse.data.jobId, campaign.id).catch((err) => {
                logger_1.logger.error('Poll video status error:', err);
            });
            return res.json({
                message: 'Video generation started',
                jobId: job.id,
                campaign,
            });
        }
        catch (videoError) {
            logger_1.logger.error('Video service error:', videoError);
            await prisma_1.prisma.videoGenerationJob.update({
                where: { id: job.id },
                data: {
                    status: 'failed',
                    errorMessage: videoError.message || 'Video service unavailable',
                },
            });
            await prisma_1.prisma.videoCampaign.update({
                where: { id: campaign.id },
                data: {
                    status: 'FAILED',
                    generationError: 'Video generation service unavailable. Please try again later.',
                },
            });
            return res.status(503).json({
                error: 'Video generation service unavailable',
                details: videoError.message,
            });
        }
    }
    catch (error) {
        return next(error);
    }
});
router.get('/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma_1.prisma.videoCampaign.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
            include: {
                emailTemplate: true,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const latestJob = await prisma_1.prisma.videoGenerationJob.findFirst({
            where: { campaignId: id },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({
            status: campaign.status,
            progress: latestJob?.progress || 0,
            currentStep: latestJob?.currentStep,
            videoUrl: campaign.videoUrl,
            error: campaign.generationError || latestJob?.errorMessage,
            emailTemplate: campaign.emailTemplate ? {
                id: campaign.emailTemplate.id,
                name: campaign.emailTemplate.name,
                wasUpdated: !!campaign.emailTemplateId,
            } : null,
            campaignId: campaign.id,
            campaignName: campaign.name,
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/complete', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { videoUrl, status } = req.body;
        logger_1.logger.info(`📹 Video completion callback for campaign ${id}`, { videoUrl, status });
        const campaign = await prisma_1.prisma.videoCampaign.findUnique({
            where: { id },
        });
        if (!campaign) {
            logger_1.logger.warn(`Campaign ${id} not found for completion callback`);
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const now = new Date();
        await prisma_1.prisma.videoCampaign.update({
            where: { id },
            data: {
                status: 'READY',
                videoUrl: videoUrl,
                generatedAt: now,
            },
        });
        logger_1.logger.info(`✅ Campaign ${id} marked as READY`, { videoUrl });
        try {
            const formattedDate = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
            const formattedTime = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
            });
            const emailTemplate = await prisma_1.prisma.emailTemplate.create({
                data: {
                    name: `${campaign.name} - Email Template`,
                    subject: `Personalized Video for {{companyName}}`,
                    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 20px 0; color: #333333; font-size: 28px;">Hi {{recipientName}}!</h1>
              <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 24px;">I created this personalized video just for you and {{companyName}}.</p>

              <!-- Video Player -->
              <div style="margin: 0 0 30px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <video controls style="width: 100%; height: auto; display: block;" poster="">
                  <source src="${videoUrl}" type="video/mp4">
                  Your email client doesn't support video playback. <a href="${videoUrl}" style="color: #7c3aed;">Click here to watch the video</a>.
                </video>
              </div>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 22px;">This video was created specifically for {{companyName}} using AI-powered personalization.</p>

              <a href="{{ctaLink}}" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">{{ctaText}}</a>

              <p style="margin: 30px 0 0 0; color: #999999; font-size: 12px;">
                Created on ${formattedDate} at ${formattedTime}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
                    textContent: `Hi {{recipientName}}!\n\nI created this personalized video just for you and {{companyName}}.\n\nWatch the video: ${videoUrl}\n\n{{ctaText}}: {{ctaLink}}\n\nCreated on ${formattedDate} at ${formattedTime}`,
                    variables: ['recipientName', 'companyName', 'ctaText', 'ctaLink'],
                    variableValues: {
                        ctaText: 'Schedule a Demo',
                        ctaLink: 'https://brandmonkz.com/demo',
                    },
                    isActive: true,
                    userId: campaign.userId,
                },
            });
            logger_1.logger.info(`📧 Auto-created email template ${emailTemplate.id} for campaign ${id}`);
        }
        catch (emailError) {
            logger_1.logger.error(`⚠️ Failed to auto-create email template for campaign ${id}:`, emailError);
        }
        return res.json({
            success: true,
            message: 'Campaign status updated to READY',
            campaignId: id,
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Error updating campaign status:', error);
        next(error);
    }
});
router.post('/:id/create-email-template', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { templateName, emailSubject, emailBody, ctaText, ctaLink, fromName, fromEmail } = req.body;
        const campaign = await prisma_1.prisma.videoCampaign.findFirst({
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
        const safeEmailBody = escapeHtml(emailBody || campaign.narrationScript || '');
        const safeSubject = escapeHtml(emailSubject || '');
        const safeVideoUrl = escapeHtml(campaign.videoUrl || '');
        const safeThumbnailUrl = escapeHtml(campaign.thumbnailUrl || '');
        const safeCtaText = escapeHtml(ctaText || '');
        const safeCtaLink = escapeHtml(ctaLink || '');
        const htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + safeSubject + '</title></head><body style="margin: 0; padding: 0; font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;"><tr><td align="center"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;"><tr><td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"><h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">{{companyName}}</h1></td></tr><tr><td style="padding: 40px 30px;"><p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Hi {{firstName}},</p><p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">' + safeEmailBody + '</p><div style="margin: 30px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"><video controls width="100%" style="display: block; max-width: 100%; height: auto;" poster="' + safeThumbnailUrl + '"><source src="' + safeVideoUrl + '" type="video/mp4">Your email client doesn\'t support video playback. <a href="' + safeVideoUrl + '" style="color: #667eea;">Click here to watch the video</a>.</video></div>' + (ctaText && ctaLink ? '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="padding: 30px 0;"><a href="' + safeCtaLink + '" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">' + safeCtaText + '</a></td></tr></table>' : '') + '<p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">This video was created specifically for you using advanced AI technology.</p></td></tr><tr><td style="padding: 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;"><p style="margin: 0 0 10px; color: #666666; font-size: 14px;">Best regards,<br><strong style="color: #333333;">{{fromName}}</strong></p><p style="margin: 10px 0 0; color: #999999; font-size: 12px;">Powered by BrandMonkz Video Marketing</p></td></tr></table></td></tr></table></body></html>';
        const textContent = 'Hi {{firstName}},\n\n' + safeEmailBody + '\n\nWatch your personalized video: ' + safeVideoUrl + '\n\n' + (ctaText && ctaLink ? safeCtaText + ': ' + safeCtaLink + '\n\n' : '') + 'Best regards,\n{{fromName}}\n\n---\nPowered by BrandMonkz Video Marketing';
        const emailTemplate = await prisma_1.prisma.emailTemplate.create({
            data: {
                name: templateName || `Video Campaign: ${campaign.name}`,
                subject: emailSubject || `Personalized Video from ${fromName || '{{companyName}}'}`,
                htmlContent,
                textContent,
                variables: ['firstName', 'companyName', 'fromName'],
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
router.post('/preview-script', auth_1.authenticate, async (req, res, next) => {
    try {
        const { companyName, additionalContext } = req.body;
        if (!companyName) {
            return res.status(400).json({ error: 'Company name is required' });
        }
        logger_1.logger.info(`📝 Generating script preview for company: ${companyName}`);
        if (!ai_1.AI_CONFIG.enabled || !ai_1.AI_CONFIG.apiKey) {
            logger_1.logger.error('❌ ANTHROPIC_API_KEY not configured');
            return res.status(500).json({
                error: 'AI service not configured',
                details: 'ANTHROPIC_API_KEY environment variable is missing'
            });
        }
        const AI_MODEL = ai_1.AI_CONFIG.model;
        const AI_MAX_TOKENS = ai_1.AI_CONFIG.maxTokens.campaign || 2048;
        const AI_TEMPERATURE = ai_1.AI_CONFIG.temperature;
        const SCRIPT_LENGTH = process.env.AI_SCRIPT_LENGTH || '30-45 second';
        const prompt = `Analyze the company name "${companyName}" and any additional context provided, then generate a compelling marketing video script.

${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Your task:
1. Determine the most likely industry/sector for this company
2. Create a personalized, compelling ${SCRIPT_LENGTH} marketing message
3. Suggest 3-4 text overlays that highlight key value propositions

Return ONLY valid JSON in this exact format:
{
  "industry": "detected industry",
  "targetAudience": "who this company serves",
  "narrationScript": "full script for voice narration (${SCRIPT_LENGTH} when spoken)",
  "keyMessage": "main value proposition",
  "overlays": [
    {"text": "First overlay text", "timing": "00:02"},
    {"text": "Second overlay text", "timing": "00:10"},
    {"text": "Third overlay text", "timing": "00:18"}
  ],
  "callToAction": "compelling call to action"
}`;
        logger_1.logger.info(`🤖 Calling Anthropic API with model: ${AI_MODEL}`);
        const message = await anthropic.messages.create({
            model: AI_MODEL,
            max_tokens: AI_MAX_TOKENS,
            temperature: AI_TEMPERATURE,
            messages: [{
                    role: 'user',
                    content: prompt
                }]
        });
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        logger_1.logger.info(`🤖 AI Response length: ${responseText.length} characters`);
        let videoData;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            videoData = JSON.parse(jsonMatch[0]);
        }
        catch (parseError) {
            logger_1.logger.error('Failed to parse AI response:', parseError);
            return res.status(500).json({
                error: 'Failed to parse AI response',
                details: parseError instanceof Error ? parseError.message : 'Unknown error'
            });
        }
        logger_1.logger.info(`✅ Script preview generated for ${companyName}`);
        return res.json({
            success: true,
            preview: {
                companyName,
                industry: videoData.industry,
                targetAudience: videoData.targetAudience,
                narrationScript: videoData.narrationScript,
                keyMessage: videoData.keyMessage,
                overlays: videoData.overlays || [],
                callToAction: videoData.callToAction
            }
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Error generating script preview:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : '';
        logger_1.logger.error('Error details:', { message: errorMessage, stack: errorStack });
        return res.status(500).json({
            error: 'Failed to generate script preview',
            details: errorMessage
        });
    }
});
router.post('/regenerate-script', auth_1.authenticate, async (req, res, next) => {
    try {
        const { companyName, additionalContext, currentScript } = req.body;
        if (!companyName) {
            return res.status(400).json({ error: 'Company name is required' });
        }
        logger_1.logger.info(`🔄 Regenerating script for company: ${companyName}`);
        if (!ai_1.AI_CONFIG.enabled || !ai_1.AI_CONFIG.apiKey) {
            logger_1.logger.error('❌ ANTHROPIC_API_KEY not configured');
            return res.status(500).json({
                error: 'AI service not configured',
                details: 'ANTHROPIC_API_KEY environment variable is missing'
            });
        }
        const AI_MODEL = ai_1.AI_CONFIG.model;
        const AI_MAX_TOKENS = ai_1.AI_CONFIG.maxTokens.campaign || 2048;
        const SCRIPT_LENGTH = process.env.AI_SCRIPT_LENGTH || '30-45 second';
        const prompt = `Generate a NEW and DIFFERENT marketing video script for the company "${companyName}".

${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Previous script (create something different):
${currentScript}

Requirements:
1. Create a completely different angle/approach than the previous script
2. Same ${SCRIPT_LENGTH} length
3. Focus on different value propositions
4. Use different messaging and tone

Return ONLY valid JSON in this exact format:
{
  "industry": "detected industry",
  "targetAudience": "who this company serves",
  "narrationScript": "NEW script for voice narration",
  "keyMessage": "main value proposition",
  "overlays": [
    {"text": "First overlay text", "timing": "00:02"},
    {"text": "Second overlay text", "timing": "00:10"},
    {"text": "Third overlay text", "timing": "00:18"}
  ],
  "callToAction": "compelling call to action"
}`;
        logger_1.logger.info(`🤖 Calling Anthropic API for regeneration with model: ${AI_MODEL}`);
        const message = await anthropic.messages.create({
            model: AI_MODEL,
            max_tokens: AI_MAX_TOKENS,
            temperature: 0.9,
            messages: [{
                    role: 'user',
                    content: prompt
                }]
        });
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        logger_1.logger.info(`🤖 AI Response length: ${responseText.length} characters`);
        let videoData;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            videoData = JSON.parse(jsonMatch[0]);
        }
        catch (parseError) {
            logger_1.logger.error('Failed to parse AI response:', parseError);
            return res.status(500).json({
                error: 'Failed to parse AI response',
                details: parseError instanceof Error ? parseError.message : 'Unknown error'
            });
        }
        logger_1.logger.info(`✅ Script regenerated for ${companyName}`);
        return res.json({
            success: true,
            preview: {
                companyName,
                industry: videoData.industry,
                targetAudience: videoData.targetAudience,
                narrationScript: videoData.narrationScript,
                keyMessage: videoData.keyMessage,
                overlays: videoData.overlays || [],
                callToAction: videoData.callToAction
            }
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Error regenerating script:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : '';
        logger_1.logger.error('Error details:', { message: errorMessage, stack: errorStack });
        return res.status(500).json({
            error: 'Failed to regenerate script',
            details: errorMessage
        });
    }
});
router.post('/auto-generate', auth_1.authenticate, async (req, res, next) => {
    console.error('🟢 [DEBUG] auto-generate endpoint HIT, req.body:', JSON.stringify(req.body));
    try {
        const { companyName, voiceId, customVoiceUrl, templateId, additionalContext, narrationScript, industry, targetAudience, keyMessage, overlays, callToAction } = req.body;
        console.error('🟢 [DEBUG] Extracted params - companyName:', companyName, 'voiceId:', voiceId, 'templateId:', templateId);
        if (!companyName) {
            console.error('🟢 [DEBUG] Missing companyName');
            return res.status(400).json({ error: 'Company name is required' });
        }
        if (!voiceId && !customVoiceUrl) {
            console.error('🟢 [DEBUG] Missing voiceId and customVoiceUrl');
            return res.status(400).json({ error: 'Voice selection is required' });
        }
        if (templateId) {
            logger_1.logger.info(`🎨 Template selected: ${templateId}`);
        }
        else {
            logger_1.logger.info(`🎬 No template selected - will use Pexels for automatic footage generation`);
        }
        logger_1.logger.info(`🤖 Starting automated video generation for company: ${companyName}`);
        let videoData;
        if (narrationScript && industry) {
            logger_1.logger.info('✅ Using pre-generated script data from preview');
            videoData = {
                industry,
                targetAudience,
                narrationScript,
                keyMessage,
                overlays: overlays || [],
                callToAction
            };
        }
        else {
            logger_1.logger.info('🔍 No pre-generated script provided, generating now...');
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                logger_1.logger.error('❌ ANTHROPIC_API_KEY not found in environment');
                return res.status(500).json({
                    error: 'AI service not configured',
                    details: 'ANTHROPIC_API_KEY environment variable is missing',
                    message: 'Please contact support'
                });
            }
            const anthropicClient = new sdk_1.default({ apiKey });
            const AI_MODEL = process.env.ANTHROPIC_MODEL || ai_1.AI_CONFIG.model || 'claude-3-7-sonnet-20250219';
            const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS_CAMPAIGN || '2048');
            const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7');
            const SCRIPT_LENGTH = process.env.AI_SCRIPT_LENGTH || '30-45 second';
            const industryDetectionPrompt = `Analyze the company name "${companyName}" and any additional context provided, then generate a compelling marketing video script.

${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Your task:
1. Determine the most likely industry/sector for this company
2. Create a personalized, compelling ${SCRIPT_LENGTH} marketing message
3. Suggest 3-4 text overlays that highlight key value propositions

Return ONLY valid JSON in this exact format:
{
  "industry": "detected industry",
  "targetAudience": "who this company serves",
  "narrationScript": "full script for voice narration (${SCRIPT_LENGTH} when spoken)",
  "keyMessage": "main value proposition",
  "overlays": [
    {"text": "First overlay text", "timing": "00:02"},
    {"text": "Second overlay text", "timing": "00:10"},
    {"text": "Third overlay text", "timing": "00:20"}
  ],
  "callToAction": "suggested CTA"
}`;
            logger_1.logger.info('🔍 Detecting industry and generating script...');
            logger_1.logger.info(`Using AI Model: ${AI_MODEL}, API Key length: ${apiKey.length}`);
            let aiResponse;
            try {
                aiResponse = await anthropicClient.messages.create({
                    model: AI_MODEL,
                    max_tokens: AI_MAX_TOKENS,
                    temperature: AI_TEMPERATURE,
                    system: 'You are an expert marketing strategist and copywriter. Generate compelling, professional marketing content that resonates with the target audience.',
                    messages: [{
                            role: 'user',
                            content: industryDetectionPrompt
                        }]
                });
                logger_1.logger.info('✅ AI API call successful');
            }
            catch (aiError) {
                logger_1.logger.error('❌ AI API call failed:', aiError);
                logger_1.logger.error('API Key exists:', !!apiKey, 'Length:', apiKey?.length);
                return res.status(500).json({
                    error: 'AI service unavailable',
                    details: aiError instanceof Error ? aiError.message : 'Failed to connect to AI service',
                    message: 'Please try again later or contact support'
                });
            }
            const aiText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '';
            logger_1.logger.info(`✅ AI Response received (length: ${aiText.length})`);
            let videoData;
            try {
                const cleanedResponse = aiText.trim();
                const firstBrace = cleanedResponse.indexOf('{');
                const lastBrace = cleanedResponse.lastIndexOf('}');
                if (firstBrace === -1 || lastBrace === -1) {
                    throw new Error('No JSON found in AI response');
                }
                const jsonString = cleanedResponse.substring(firstBrace, lastBrace + 1);
                videoData = JSON.parse(jsonString);
                logger_1.logger.info('✅ Parsed AI response successfully');
            }
            catch (parseError) {
                logger_1.logger.error('Failed to parse AI response:', parseError);
                return res.status(500).json({
                    error: 'Failed to parse AI response',
                    details: parseError instanceof Error ? parseError.message : 'Unknown error'
                });
            }
        }
        const OVERLAY_DURATION = parseInt(process.env.VIDEO_OVERLAY_DURATION || '3');
        const OVERLAY_FONT_SIZE = parseInt(process.env.VIDEO_OVERLAY_FONT_SIZE || '100');
        const OVERLAY_COLOR = process.env.VIDEO_OVERLAY_COLOR || '#FFFFFF';
        const OVERLAY_STROKE_COLOR = process.env.VIDEO_OVERLAY_STROKE_COLOR || '#000000';
        const OVERLAY_STROKE_WIDTH = parseInt(process.env.VIDEO_OVERLAY_STROKE_WIDTH || '3');
        const OVERLAY_POSITION = process.env.VIDEO_OVERLAY_POSITION || 'center';
        const OVERLAY_INTERVAL = parseInt(process.env.VIDEO_OVERLAY_INTERVAL || '10');
        const transformedOverlays = (videoData.overlays || []).map((overlay, index) => {
            const timingMatch = overlay.timing?.match(/(\d+):(\d+)/);
            const startTime = timingMatch
                ? parseInt(timingMatch[1]) * 60 + parseInt(timingMatch[2])
                : index * OVERLAY_INTERVAL;
            return {
                text: overlay.text,
                startTime: startTime,
                duration: OVERLAY_DURATION,
                fontSize: OVERLAY_FONT_SIZE,
                color: OVERLAY_COLOR,
                strokeColor: OVERLAY_STROKE_COLOR,
                strokeWidth: OVERLAY_STROKE_WIDTH,
                position: OVERLAY_POSITION
            };
        });
        let selectedTemplate = null;
        let pexelsVideoUrl = null;
        if (templateId) {
            logger_1.logger.info(`🎨 Loading user-selected template: ${templateId}`);
            try {
                selectedTemplate = await prisma_1.prisma.videoTemplate.findUnique({
                    where: { id: templateId },
                });
                if (!selectedTemplate) {
                    return res.status(400).json({ error: 'Selected template not found' });
                }
                logger_1.logger.info(`✅ Using template: ${selectedTemplate.name} (Category: ${selectedTemplate.category})`);
                await prisma_1.prisma.videoTemplate.update({
                    where: { id: selectedTemplate.id },
                    data: { usageCount: { increment: 1 } },
                });
            }
            catch (templateError) {
                logger_1.logger.error('Error querying templates:', templateError);
                return res.status(500).json({ error: 'Failed to load template' });
            }
        }
        else {
            logger_1.logger.info(`🎬 Auto-generating video footage from Pexels API...`);
            const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
            if (!PEXELS_API_KEY) {
                return res.status(500).json({
                    error: 'Pexels API not configured',
                    details: 'Please add PEXELS_API_KEY to environment variables'
                });
            }
            try {
                const searchQuery = `${videoData.industry} ${videoData.targetAudience} business professional`.trim();
                logger_1.logger.info(`🔍 Searching Pexels for: "${searchQuery}"`);
                const pexelsResponse = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=landscape`, {
                    headers: { Authorization: PEXELS_API_KEY }
                });
                if (!pexelsResponse.ok) {
                    throw new Error(`Pexels API failed with status ${pexelsResponse.status}`);
                }
                const pexelsData = await pexelsResponse.json();
                if (!pexelsData.videos || pexelsData.videos.length === 0) {
                    logger_1.logger.warn(`No Pexels videos found for "${searchQuery}", trying generic search...`);
                    const fallbackResponse = await fetch(`https://api.pexels.com/videos/search?query=business%20corporate%20office&per_page=5&orientation=landscape`, {
                        headers: { Authorization: PEXELS_API_KEY }
                    });
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.videos && fallbackData.videos.length > 0) {
                        const bestVideo = fallbackData.videos[0];
                        const hdFile = bestVideo.video_files.find((f) => f.quality === 'hd' && f.width >= 1920) || bestVideo.video_files[0];
                        pexelsVideoUrl = hdFile.link;
                        logger_1.logger.info(`✅ Using fallback Pexels video: ${pexelsVideoUrl}`);
                    }
                    else {
                        throw new Error('No suitable video clips found from Pexels');
                    }
                }
                else {
                    const bestVideo = pexelsData.videos[0];
                    const hdFile = bestVideo.video_files.find((f) => f.quality === 'hd' && f.width >= 1920) || bestVideo.video_files[0];
                    pexelsVideoUrl = hdFile.link;
                    logger_1.logger.info(`✅ Found ${pexelsData.videos.length} Pexels videos, using: ${pexelsVideoUrl}`);
                }
            }
            catch (pexelsError) {
                logger_1.logger.error('Pexels API error:', pexelsError);
                return res.status(500).json({
                    error: 'Failed to fetch video footage from Pexels',
                    details: pexelsError instanceof Error ? pexelsError.message : 'Unknown error',
                    message: 'Please try selecting a template manually or contact support'
                });
            }
        }
        logger_1.logger.info(`🎤 Using user-selected voice: ${voiceId || 'Custom Voice'}`);
        logger_1.logger.info('📊 Analyzing script for intelligent overlay timing...');
        const scriptWords = videoData.narrationScript.split(/\s+/).length;
        const wordsPerMinute = parseInt(process.env.VIDEO_WORDS_PER_MINUTE || '150');
        const estimatedDurationSeconds = Math.ceil((scriptWords / wordsPerMinute) * 60);
        logger_1.logger.info(`📝 Script: ${scriptWords} words, estimated duration: ${estimatedDurationSeconds}s at ${wordsPerMinute} WPM`);
        const overlayCount = transformedOverlays.length;
        const intelligentOverlays = transformedOverlays.map((overlay, index) => {
            const usableDuration = estimatedDurationSeconds - 5;
            const intervalPercent = usableDuration / (overlayCount + 1);
            const startTime = Math.floor(2 + (intervalPercent * (index + 1)));
            const textLength = overlay.text.length;
            const baseDuration = parseInt(process.env.VIDEO_OVERLAY_DURATION || '3');
            const duration = textLength > 40 ? baseDuration + 1 : baseDuration;
            return {
                ...overlay,
                startTime,
                duration,
            };
        });
        logger_1.logger.info(`⏱️  Redistributed ${overlayCount} overlays across ${estimatedDurationSeconds}s duration`);
        logger_1.logger.info(`📹 Creating video campaign with user selections...`);
        let campaign;
        try {
            campaign = await prisma_1.prisma.videoCampaign.create({
                data: {
                    name: `${companyName} - Auto Generated`,
                    userId: req.user.id,
                    narrationScript: videoData.narrationScript,
                    voiceId: voiceId || undefined,
                    customVoiceUrl: customVoiceUrl || undefined,
                    status: 'DRAFT',
                    textOverlays: intelligentOverlays,
                    templateId: selectedTemplate?.id || undefined,
                    customVideoUrl: pexelsVideoUrl || selectedTemplate?.videoUrl || undefined,
                    videoSource: pexelsVideoUrl ? 'URL' : 'TEMPLATE',
                },
            });
            logger_1.logger.info(`✅ Campaign created successfully: ${campaign.id}`);
            logger_1.logger.info(`   Template: ${selectedTemplate?.name || 'Auto-generated from Pexels'}`);
            logger_1.logger.info(`   Video URL: ${pexelsVideoUrl || selectedTemplate?.videoUrl}`);
            logger_1.logger.info(`   Voice: ${voiceId || 'Custom Voice'}`);
            logger_1.logger.info(`   Overlays: ${overlayCount} intelligently timed`);
        }
        catch (dbError) {
            logger_1.logger.error('❌ Database creation failed:', dbError);
            return res.status(500).json({
                error: 'Failed to create video campaign',
                details: dbError instanceof Error ? dbError.message : 'Database error',
                message: 'Please check the campaign data and try again'
            });
        }
        logger_1.logger.info('🎬 Triggering video generation...');
        try {
            const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
            const generationResponse = await fetch(`${baseUrl}/api/video-campaigns/${campaign.id}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization || '',
                },
                body: JSON.stringify({}),
            });
            if (!generationResponse.ok) {
                const errorData = await generationResponse.json();
                throw new Error(errorData.error || 'Video generation failed');
            }
            const generationResult = await generationResponse.json();
            logger_1.logger.info('✅ Video generation started:', generationResult);
            return res.json({
                success: true,
                message: 'Automated video generation started successfully',
                campaign: {
                    id: campaign.id,
                    name: campaign.name,
                    industry: videoData.industry,
                    targetAudience: videoData.targetAudience,
                    narrationScript: videoData.narrationScript,
                    keyMessage: videoData.keyMessage,
                    callToAction: videoData.callToAction,
                    overlays: videoData.overlays,
                    status: 'GENERATING',
                },
                userSelections: {
                    template: selectedTemplate ? {
                        id: selectedTemplate.id,
                        name: selectedTemplate.name,
                        category: selectedTemplate.category,
                    } : {
                        id: 'auto-generated',
                        name: 'Auto-generated from Pexels',
                        category: 'AI-Generated',
                        source: 'Pexels API',
                        query: `${videoData.industry} ${videoData.targetAudience}`,
                    },
                    voice: {
                        id: voiceId || customVoiceUrl,
                        type: voiceId ? 'ElevenLabs' : 'Custom',
                    },
                    overlayTiming: {
                        count: overlayCount,
                        estimatedDuration: `${estimatedDurationSeconds}s`,
                        method: 'Intelligently distributed based on script analysis',
                    },
                },
                estimatedCompletionTime: `${Math.ceil(estimatedDurationSeconds / 60)} minutes`,
            });
        }
        catch (genError) {
            logger_1.logger.error('Error triggering video generation:', genError);
            await prisma_1.prisma.videoCampaign.update({
                where: { id: campaign.id },
                data: { status: 'FAILED' },
            });
            return res.status(500).json({
                error: 'Failed to generate video',
                details: genError instanceof Error ? genError.message : 'Unknown error',
                campaignId: campaign.id,
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Error in automated video generation:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : '';
        logger_1.logger.error('Error details:', { errorMessage, errorStack });
        return res.status(500).json({
            error: 'Automated video generation failed',
            details: errorMessage,
            message: 'Please check the server logs for more information'
        });
    }
});
const klingAI_service_1 = require("../services/klingAI.service");
const scriptEnhancement_service_1 = require("../services/scriptEnhancement.service");
router.post('/ai/generate-complete', auth_1.authenticate, async (req, res, next) => {
    try {
        const { videoDescription, voiceoverScript, industry, targetAudience, tone = 'professional', style = 'professional', duration = 15, voiceId, customVoiceUrl, bgmUrl, textOverlays = [], clientLogoUrl, userLogoUrl, } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!voiceoverScript) {
            return res.status(400).json({
                error: 'voiceoverScript is required',
            });
        }
        logger_1.logger.info('🔍 Validating video campaign inputs...');
        const validation = await (0, videoValidation_1.validateVideoCampaignInput)({
            voiceId,
            narrationScript: voiceoverScript,
            companyName: industry || targetAudience || 'Video Campaign'
        });
        if (!validation.valid) {
            logger_1.logger.error('❌ Validation failed:', validation.errors);
            return res.status(400).json({
                error: 'Validation failed',
                errors: validation.errors,
                warnings: validation.warnings
            });
        }
        const sanitizedScript = validation.sanitizedScript || voiceoverScript;
        logger_1.logger.info('✅ Validation passed, using sanitized script');
        logger_1.logger.info('🎬 Starting complete AI video generation', {
            userId,
            industry,
            duration,
        });
        logger_1.logger.info('✨ Enhancing script with GPT-4...');
        const enhancement = await scriptEnhancement_service_1.scriptEnhancementService.enhanceScript({
            script: sanitizedScript,
            industry,
            targetAudience,
            tone: tone,
            maxLength: duration === 15 ? 50 : duration * 3,
        });
        logger_1.logger.info('✅ Script enhanced', {
            originalWords: voiceoverScript.split(' ').length,
            enhancedWords: enhancement.enhancedScript.split(' ').length,
            estimatedDuration: enhancement.estimatedDuration,
        });
        logger_1.logger.info('🎬 Generating video with Kling AI...');
        const klingVideoUrl = await klingAI_service_1.klingAIService.generateVideo({
            prompt: enhancement.videoPrompt,
            duration: duration === 5 ? 5 : 10,
            aspectRatio: '16:9',
        });
        logger_1.logger.info('✅ Kling AI video generated', { videoUrl: klingVideoUrl });
        const campaign = await prisma_1.prisma.videoCampaign.create({
            data: {
                userId,
                name: `AI Generated - ${industry || 'Video'}`,
                narrationScript: enhancement.enhancedScript,
                customVideoUrl: klingVideoUrl,
                voiceId: voiceId || undefined,
                customVoiceUrl: customVoiceUrl || undefined,
                bgmUrl: bgmUrl || undefined,
                clientLogoUrl: clientLogoUrl || undefined,
                userLogoUrl: userLogoUrl || undefined,
                textOverlays: textOverlays,
                status: 'GENERATING',
            },
        });
        logger_1.logger.info('📝 Campaign created in database', { campaignId: campaign.id });
        const VIDEO_GENERATOR_SERVICE_URL = process.env.VIDEO_GENERATOR_SERVICE_URL || 'http://localhost:5002';
        try {
            const axios = require('axios');
            const videoGenResponse = await axios.post(`${VIDEO_GENERATOR_SERVICE_URL}/api/video/generate`, {
                campaignId: campaign.id,
                narrationScript: enhancement.enhancedScript,
                templateUrl: klingVideoUrl,
                voiceId: voiceId,
                customVoiceUrl: customVoiceUrl,
                clientLogoUrl: clientLogoUrl,
                userLogoUrl: userLogoUrl,
                bgmUrl: bgmUrl,
                textOverlays: textOverlays,
            }, {
                timeout: 10000,
            });
            logger_1.logger.info('✅ Video generation job queued', {
                jobId: videoGenResponse.data.jobId,
            });
            return res.json({
                success: true,
                campaign: {
                    id: campaign.id,
                    name: campaign.name,
                    narrationScript: campaign.narrationScript,
                    customVideoUrl: campaign.customVideoUrl,
                    status: campaign.status,
                },
                enhancement: {
                    originalScript: voiceoverScript,
                    enhancedScript: enhancement.enhancedScript,
                    improvements: enhancement.improvements,
                    estimatedDuration: enhancement.estimatedDuration,
                },
                videoPrompt: enhancement.videoPrompt,
                message: 'AI video generation started. Video will be ready in ~2-3 minutes.',
            });
        }
        catch (videoError) {
            logger_1.logger.error('❌ Video service error:', videoError);
            await prisma_1.prisma.videoCampaign.update({
                where: { id: campaign.id },
                data: {
                    status: 'FAILED',
                    generationError: 'Video composition service unavailable',
                },
            });
            return res.status(503).json({
                error: 'Video generation service unavailable',
                details: videoError.message,
                campaign: {
                    id: campaign.id,
                    customVideoUrl: klingVideoUrl,
                },
            });
        }
    }
    catch (error) {
        console.error('❌❌❌ COMPLETE AI VIDEO GENERATION FAILED ❌❌❌');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error:', JSON.stringify(error, null, 2));
        logger_1.logger.error('❌ Complete AI video generation failed:', error);
        return res.status(500).json({
            error: 'AI video generation failed',
            details: error.message,
            stack: error.stack,
            message: 'Please try again or contact support if the issue persists',
        });
    }
});
router.post('/ai/kling-video-only', auth_1.authenticate, async (req, res, next) => {
    try {
        const { prompt, duration = 10, aspectRatio = '16:9', mode = 'standard' } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!prompt) {
            return res.status(400).json({
                error: 'prompt is required',
            });
        }
        logger_1.logger.info('🎬 Starting Kling AI video generation (video-only mode)', {
            userId,
            promptLength: prompt.length,
            duration,
        });
        const videoUrl = await klingAI_service_1.klingAIService.generateVideo({
            prompt,
            duration: duration === 5 ? 5 : 10,
            aspectRatio: aspectRatio,
        });
        logger_1.logger.info('✅ Kling AI video generated successfully', { videoUrl });
        return res.json({
            success: true,
            videoUrl,
            duration,
            message: 'Video generated successfully with Kling AI',
        });
    }
    catch (error) {
        console.error('❌❌❌ KLING AI VIDEO-ONLY GENERATION FAILED ❌❌❌');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        logger_1.logger.error('❌ Kling AI video-only generation failed:', error);
        return res.status(500).json({
            error: 'Kling AI video generation failed',
            details: error.message,
            message: 'Please try again or contact support if the issue persists',
        });
    }
});
router.post('/ai/enhance-script', auth_1.authenticate, async (req, res, next) => {
    try {
        const { script, industry, targetAudience, tone, maxLength } = req.body;
        if (!script) {
            return res.status(400).json({ error: 'script is required' });
        }
        logger_1.logger.info('✨ Enhancing script...', { scriptLength: script.length });
        const enhancement = await scriptEnhancement_service_1.scriptEnhancementService.enhanceScript({
            script,
            industry,
            targetAudience,
            tone,
            maxLength,
        });
        return res.json({
            success: true,
            original: script,
            enhanced: enhancement.enhancedScript,
            improvements: enhancement.improvements,
            estimatedDuration: enhancement.estimatedDuration,
            videoPrompt: enhancement.videoPrompt,
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Script enhancement failed:', error);
        return res.status(500).json({
            error: 'Script enhancement failed',
            details: error.message,
        });
    }
});
router.get('/ai/status', auth_1.authenticate, async (req, res) => {
    return res.json({
        klingAI: {
            configured: klingAI_service_1.klingAIService.isConfigured(),
            available: klingAI_service_1.klingAIService.isConfigured(),
        },
        scriptEnhancement: {
            configured: scriptEnhancement_service_1.scriptEnhancementService.isConfigured(),
            available: scriptEnhancement_service_1.scriptEnhancementService.isConfigured(),
        },
        message: klingAI_service_1.klingAIService.isConfigured() && scriptEnhancement_service_1.scriptEnhancementService.isConfigured()
            ? 'All AI services are ready'
            : 'Some AI services are not configured. Please check environment variables.',
    });
});
router.get('/company/:companyId/existing', auth_1.authenticate, async (req, res, next) => {
    try {
        const { companyId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const campaignCompanies = await prisma_1.prisma.videoCampaignCompany.findMany({
            where: {
                companyId,
                campaign: {
                    userId
                }
            },
            include: {
                campaign: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        createdAt: true,
                        videoUrl: true,
                    }
                }
            },
            orderBy: { addedAt: 'desc' }
        });
        const campaigns = campaignCompanies.map(cc => cc.campaign);
        const readyCampaigns = campaigns.filter(c => c.status === 'READY');
        const generatingCampaigns = campaigns.filter(c => c.status === 'GENERATING');
        const response = {
            hasExistingVideos: campaigns.length > 0,
            readyCount: readyCampaigns.length,
            generatingCount: generatingCampaigns.length,
            latestReady: readyCampaigns.length > 0 ? readyCampaigns[0] : null,
            latestGenerating: generatingCampaigns.length > 0 ? generatingCampaigns[0] : null,
        };
        return res.json(response);
    }
    catch (error) {
        logger_1.logger.error(`Error checking existing videos:`, error);
        return next(error);
    }
});
router.post('/generate-script-from-intent', auth_1.authenticate, async (req, res, next) => {
    console.error('🔴 [DEBUG] generate-script-from-intent endpoint HIT');
    try {
        console.error('🔴 [DEBUG] Inside try block, req.body:', JSON.stringify(req.body));
        const { companyId, voiceId, templateId } = req.body;
        if (!companyId) {
            console.error('🔴 [DEBUG] No companyId provided');
            return res.status(400).json({ error: 'Company ID is required' });
        }
        console.error('🔴 [DEBUG] companyId:', companyId);
        logger_1.logger.info(`🎯 Generating script from intent signals for company: ${companyId}`);
        if (voiceId) {
            logger_1.logger.info(`🔍 Validating voice ID: ${voiceId}`);
            const voiceValidation = await (0, videoValidation_1.validateVoiceId)(voiceId);
            if (!voiceValidation.valid) {
                logger_1.logger.error(`❌ Voice validation failed: ${voiceValidation.error}`);
                return res.status(400).json({
                    error: voiceValidation.error,
                    details: voiceValidation.details,
                    field: 'voiceId'
                });
            }
            logger_1.logger.info(`✅ Voice ID validated successfully`);
        }
        if (templateId) {
            logger_1.logger.info(`🔍 Validating template ID: ${templateId}`);
            const templateValidation = await (0, videoValidation_1.validateEmailTemplate)(templateId);
            if (!templateValidation.valid) {
                logger_1.logger.error(`❌ Template validation failed: ${templateValidation.error}`);
                return res.status(400).json({
                    error: templateValidation.error,
                    details: templateValidation.details,
                    field: 'templateId'
                });
            }
            logger_1.logger.info(`✅ Template validated successfully: ${templateValidation.template?.name}`);
        }
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            include: {
                contacts: { take: 1 },
            },
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'AI service not configured' });
        }
        const anthropicClient = new sdk_1.default({ apiKey });
        const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219';
        const intentContext = `
Company Name: ${company.name}
Industry: ${company.industry || 'Unknown'}
Website: ${company.website || 'Unknown'}

INTENT SIGNALS:
- Business Intent: ${company.intent || 'Not available'}
- Hiring Info: ${company.hiringInfo || 'Not available'}
- Job Postings: ${company.jobPostings || 'Not available'}
- Recent News: ${company.aiRecentNews || 'Not available'}
- Tech Stack: ${company.techStack || 'Not available'}

Primary Contact: ${company.contacts[0]?.firstName || 'Decision Maker'} ${company.contacts[0]?.lastName || ''}
`;
        const scriptPrompt = `You are an expert marketing copywriter creating a personalized video script for a sales outreach campaign.

${intentContext}

Create a compelling 30-45 second video narration script that:
1. Addresses the company's specific business intent and current focus
2. References relevant hiring needs or job postings (shows you did research)
3. Mentions recent news/developments (demonstrates awareness)
4. Connects their tech stack to your solution (technical relevance)
5. Speaks directly to the decision-maker
6. Has a clear call-to-action

The script should sound natural, conversational, and personalized - NOT generic.
Use the contact's first name if available.

Return ONLY valid JSON in this exact format:
{
  "industry": "the company's industry",
  "targetAudience": "the decision-maker/role",
  "narrationScript": "the full 30-45 second script for voice narration",
  "keyMessage": "main value proposition",
  "overlays": [
    {"text": "First key point", "timing": "00:02"},
    {"text": "Second key point", "timing": "00:15"},
    {"text": "Third key point", "timing": "00:28"}
  ],
  "callToAction": "specific next step for this company"
}`;
        logger_1.logger.info('🤖 Calling Claude AI to generate personalized script...');
        const response = await anthropicClient.messages.create({
            model: AI_MODEL,
            max_tokens: 2048,
            temperature: 0.7,
            messages: [
                {
                    role: 'user',
                    content: scriptPrompt,
                },
            ],
        });
        const rawContent = response.content[0].type === 'text' ? response.content[0].text : '';
        logger_1.logger.info(`📝 AI Response: ${rawContent.substring(0, 200)}...`);
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }
        const scriptData = JSON.parse(jsonMatch[0]);
        logger_1.logger.info(`✅ Generated personalized script for ${company.name}`);
        return res.json({
            script: scriptData.narrationScript,
            scriptData,
            company: {
                id: company.id,
                name: company.name,
            },
        });
    }
    catch (error) {
        console.error('🔴 [DEBUG] CATCH BLOCK HIT - Error occurred:', error);
        console.error('🔴 [DEBUG] Error stack:', error.stack);
        console.error('🔴 [DEBUG] Error message:', error.message);
        logger_1.logger.error('❌ Failed to generate script from intent:', error);
        return res.status(500).json({
            error: 'Failed to generate script',
            details: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=videoCampaigns.js.map