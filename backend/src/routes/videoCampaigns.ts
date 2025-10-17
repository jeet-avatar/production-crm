import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, getAIMessageConfig } from '../config/ai';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: AI_CONFIG.apiKey });

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: fromEnv(),
});

const S3_BUCKET = process.env.S3_BUCKET_NAME || 'suiteflow-demo';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'd26e2s8btupe4a.cloudfront.net';

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, AVI, and WEBM are allowed.'));
    }
  },
});

// Enable authentication for all routes
router.use(authenticate);

// ===================================
// VIDEO TEMPLATES
// ===================================

// GET /api/video-campaigns/templates - List all templates
router.get('/templates', async (req, res, next) => {
  try {
    const { category, search, system } = req.query;

    const where: any = {
      OR: [
        { isSystem: true },
        { userId: req.user!.id },
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
    } else if (system === 'false') {
      where.isSystem = false;
      where.userId = req.user!.id;
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
  } catch (error) {
    return next(error);
  }
});

// GET /api/video-campaigns/templates/:id - Get single template
router.get('/templates/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await prisma.videoTemplate.findFirst({
      where: {
        id,
        OR: [
          { isSystem: true },
          { userId: req.user!.id },
        ],
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json({ template });
  } catch (error) {
    return next(error);
  }
});

// POST /api/video-campaigns/templates - Create custom template
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
        userId: req.user!.id,
        isSystem: false,
      },
    });

    return res.status(201).json({ template });
  } catch (error) {
    return next(error);
  }
});

// POST /api/video-campaigns/templates/upload - Upload video file
router.post('/templates/upload', upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { name, description, category } = req.body;
    const file = req.file;

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop();
    const s3Key = `video-templates/${req.user!.id}/${timestamp}.${fileExtension}`;

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(uploadCommand);

    const videoUrl = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;

    // Create template
    const template = await prisma.videoTemplate.create({
      data: {
        name: name || file.originalname,
        description,
        videoUrl,
        category: category || 'Business',
        fileSize: file.size,
        userId: req.user!.id,
        isSystem: false,
      },
    });

    return res.status(201).json({ template, videoUrl });
  } catch (error) {
    logger.error('Template upload error:', error);
    return next(error);
  }
});

// PUT /api/video-campaigns/templates/:id - Update template
router.put('/templates/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, category, tags, isFavorite } = req.body;

    const template = await prisma.videoTemplate.findFirst({
      where: {
        id,
        userId: req.user!.id,
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
  } catch (error) {
    return next(error);
  }
});

// POST /api/video-campaigns/templates/:id/favorite - Toggle favorite
router.post('/templates/:id/favorite', async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await prisma.videoTemplate.findFirst({
      where: {
        id,
        OR: [
          { isSystem: true },
          { userId: req.user!.id },
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
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/video-campaigns/templates/:id - Delete custom template
router.delete('/templates/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await prisma.videoTemplate.findFirst({
      where: {
        id,
        userId: req.user!.id,
        isSystem: false, // Can't delete system templates
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete from S3 if it's a user-uploaded file
    if (template.videoUrl.includes(S3_BUCKET)) {
      const key = template.videoUrl.split(`${CLOUDFRONT_DOMAIN}/`)[1];
      if (key) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
          });
          await s3Client.send(deleteCommand);
        } catch (s3Error) {
          logger.error('S3 delete error:', s3Error);
        }
      }
    }

    await prisma.videoTemplate.delete({ where: { id } });

    return res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    return next(error);
  }
});

// ===================================
// VIDEO CAMPAIGNS
// ===================================

// GET /api/video-campaigns - List all campaigns
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const where: any = {
      userId: req.user!.id,
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
  } catch (error) {
    return next(error);
  }
});

// GET /api/video-campaigns/:id - Get single campaign
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.videoCampaign.findFirst({
      where: {
        id,
        userId: req.user!.id,
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
  } catch (error) {
    return next(error);
  }
});

// POST /api/video-campaigns - Create new campaign
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      narrationScript,
      tone,
      videoSource,
      templateId,
      customVideoUrl,
      clientLogoUrl,
      userLogoUrl,
      bgmUrl,
      bgmVolume,
      textOverlays,
      companyIds,
    } = req.body;

    if (!name || !narrationScript) {
      return res.status(400).json({ error: 'Name and narration script are required' });
    }

    // Validate video source
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
        tone: tone || 'professional',
        videoSource: videoSource || 'TEMPLATE',
        templateId,
        customVideoUrl,
        clientLogoUrl,
        userLogoUrl,
        bgmUrl,
        bgmVolume: bgmVolume !== undefined ? bgmVolume : 0.1,
        textOverlays,
        userId: req.user!.id,
        status: 'DRAFT',
      },
    });

    // Add companies if provided
    if (companyIds && Array.isArray(companyIds) && companyIds.length > 0) {
      await prisma.videoCampaignCompany.createMany({
        data: companyIds.map((companyId: string) => ({
          campaignId: campaign.id,
          companyId,
        })),
        skipDuplicates: true,
      });
    }

    return res.status(201).json({ campaign });
  } catch (error) {
    return next(error);
  }
});

// PUT /api/video-campaigns/:id - Update campaign
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      narrationScript,
      tone,
      clientLogoUrl,
      userLogoUrl,
      bgmUrl,
      bgmVolume,
      textOverlays,
    } = req.body;

    const campaign = await prisma.videoCampaign.findFirst({
      where: {
        id,
        userId: req.user!.id,
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
        clientLogoUrl,
        userLogoUrl,
        bgmUrl,
        bgmVolume,
        textOverlays,
      },
    });

    return res.json({ campaign: updated });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/video-campaigns/:id - Delete campaign
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.videoCampaign.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Delete generated video from S3 if exists
    if (campaign.videoUrl && campaign.videoUrl.includes(S3_BUCKET)) {
      const key = campaign.videoUrl.split(`${CLOUDFRONT_DOMAIN}/`)[1];
      if (key) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
          });
          await s3Client.send(deleteCommand);
        } catch (s3Error) {
          logger.error('S3 delete error:', s3Error);
        }
      }
    }

    await prisma.videoCampaign.delete({ where: { id } });

    return res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    return next(error);
  }
});

// POST /api/video-campaigns/:id/companies/:companyId - Add company to campaign
router.post('/:id/companies/:companyId', async (req, res, next) => {
  try {
    const { id, companyId } = req.params;

    const campaign = await prisma.videoCampaign.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId: req.user!.id,
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
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/video-campaigns/:id/companies/:companyId - Remove company from campaign
router.delete('/:id/companies/:companyId', async (req, res, next) => {
  try {
    const { id, companyId } = req.params;

    const campaign = await prisma.videoCampaign.findFirst({
      where: {
        id,
        userId: req.user!.id,
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
  } catch (error) {
    return next(error);
  }
});

// ===================================
// AI ASSISTANCE
// ===================================

// POST /api/video-campaigns/ai/generate-script - Generate AI script
router.post('/ai/generate-script', async (req, res, next) => {
  try {
    const { companyName, companyIndustry, tone, goal } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const prompt = `You are an expert video marketing script writer. Generate a compelling 30-60 second video narration script for a business video.

Company Name: ${companyName}
Industry: ${companyIndustry || 'Not specified'}
Tone: ${tone || 'professional'}
Goal: ${goal || 'Welcome and introduce our company'}

Generate a personalized, engaging script that:
1. Welcomes the company by name
2. Introduces our company and value proposition
3. Highlights potential benefits or solutions
4. Ends with a call to action

Keep it between 100-150 words (30-60 seconds when spoken).
Use a ${tone || 'professional'} tone.

Return ONLY valid JSON with this structure:
{"script": "Your complete narration script here..."}`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('content'),
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
  } catch (error) {
    logger.error('AI script generation error:', error);
    return next(error);
  }
});

// POST /api/video-campaigns/ai/suggest-overlays - Suggest text overlays
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
      ...getAIMessageConfig('basic'),
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
  } catch (error) {
    logger.error('AI overlay suggestion error:', error);
    return next(error);
  }
});

// ===================================
// VIDEO GENERATION (Placeholder - will integrate Python)
// ===================================

// POST /api/video-campaigns/:id/generate - Start video generation
router.post('/:id/generate', async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.videoCampaign.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      include: {
        template: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Update campaign status
    await prisma.videoCampaign.update({
      where: { id },
      data: { status: 'GENERATING' },
    });

    // Create generation job
    const job = await prisma.videoGenerationJob.create({
      data: {
        campaignId: id,
        status: 'pending',
        currentStep: 'Initializing',
      },
    });

    // TODO: Queue video generation job
    // For now, return mock response
    logger.info(`Video generation queued for campaign ${id}`);

    return res.json({
      message: 'Video generation started',
      jobId: job.id,
      campaign,
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/video-campaigns/:id/status - Get generation status
router.get('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.videoCampaign.findFirst({
      where: {
        id,
        userId: req.user!.id,
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
  } catch (error) {
    return next(error);
  }
});

export default router;
