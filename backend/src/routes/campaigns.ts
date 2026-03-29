import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, getAIMessageConfig } from '../config/ai';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const router = Router();
const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: AI_CONFIG.apiKey });

// Enable authentication for all campaign routes
router.use(authenticate);

// GET /api/campaigns - Get all campaigns
router.get('/', async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: req.user?.id, // ✅ Data isolation - only user's campaigns
      },
      include: {
        _count: {
          select: {
            emailLogs: true,
            companies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ campaigns });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', async (req, res, next) => {
  try {
    const { name, subject, status, htmlContent, scheduledAt } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    // ✅ Always use authenticated user - no demo user fallback
    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject: subject || `Campaign: ${name}`,
        status: status || 'DRAFT',
        htmlContent: htmlContent || '<p>Email content goes here</p>',
        userId: req.user!.id,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    return res.status(201).json({ campaign });
  } catch (error) {
    return next(error);
  }
});

// GET /api/campaigns/:id - Get single campaign
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user?.id, // ✅ Data isolation
      },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true,
                  },
                },
                _count: {
                  select: { contacts: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            emailLogs: true,
            companies: true,
          },
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

// POST /api/campaigns/:id/companies/:companyId - Add company to campaign
router.post('/:id/companies/:companyId', async (req, res, next) => {
  try {
    const { id, companyId } = req.params;

    // ✅ Verify campaign exists and user owns it
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // ✅ Verify company exists and user owns it
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId: req.user?.id,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if already added
    const existing = await prisma.campaignCompany.findUnique({
      where: {
        campaignId_companyId: {
          campaignId: id,
          companyId: companyId,
        },
      },
    });

    if (existing) {
      return res.json({
        message: 'Company already in campaign',
        campaignCompany: existing
      });
    }

    // Add company to campaign
    const campaignCompany = await prisma.campaignCompany.create({
      data: {
        campaignId: id,
        companyId: companyId,
      },
      include: {
        company: true,
      },
    });

    return res.json({
      message: 'Company added to campaign successfully',
      campaignCompany
    });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/campaigns/:id/companies/:companyId - Remove company from campaign
router.delete('/:id/companies/:companyId', async (req, res, next) => {
  try {
    const { id, companyId } = req.params;

    // ✅ Verify campaign exists and user owns it
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Remove company from campaign
    await prisma.campaignCompany.delete({
      where: {
        campaignId_companyId: {
          campaignId: id,
          companyId: companyId,
        },
      },
    });

    return res.json({ message: 'Company removed from campaign' });
  } catch (error) {
    return next(error);
  }
});

// GET /api/campaigns/:id/companies - Get companies in campaign
router.get('/:id/companies', async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user?.id, // ✅ Data isolation
      },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  take: 5,
                },
                _count: {
                  select: { contacts: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const companies = campaign.companies.map((cc) => ({
      ...cc.company,
      addedAt: cc.addedAt,
    }));

    return res.json({ companies });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/ai/generate-basics - Generate campaign name and goal
router.post('/ai/generate-basics', async (req, res, next) => {
  try {
    const { tone, description } = req.body;

    const prompt = `You are an expert email marketer. Generate a creative campaign name and compelling goal for an email marketing campaign.

Tone: ${tone || 'professional'}
Campaign Brief: ${description || 'a general marketing campaign'}

Generate a campaign name and goal that is directly relevant to the campaign brief above.

Return ONLY valid JSON with this structure:
{"name": "Campaign Name Here", "goal": "Detailed campaign goal describing what you want to achieve with this campaign..."}`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('basic'),
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      // Strip markdown code blocks if present
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
      }
      const result = JSON.parse(jsonText);
      return res.json(result);
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/ai/generate-subject - Generate AI-powered subject lines
router.post('/ai/generate-subject', async (req, res, next) => {
  try {
    const { goal, tone, campaignName } = req.body;

    if (!goal || !tone || !campaignName) {
      return res.status(400).json({
        error: 'goal, tone, and campaignName are required'
      });
    }

    const prompt = `You are an expert email marketer. Generate compelling email subject lines for this campaign.
Campaign Goal: ${goal}
Tone: ${tone}
Campaign Name: ${campaignName}

Generate 5 different subject line variants optimized for A/B testing. Each should use different psychological triggers:
1. Curiosity-based
2. Value-driven
3. Urgency/scarcity
4. Social proof
5. Direct benefit

Return ONLY valid JSON with this structure:
{"variants": ["variant 1", "variant 2", "variant 3", "variant 4", "variant 5"]}`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('subject'),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      // Strip markdown code blocks if present
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
      }
      const result = JSON.parse(jsonText);
      return res.json(result);
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/ai/generate-content - Generate AI-powered email content
router.post('/ai/generate-content', async (req, res, next) => {
  try {
    const { goal, subject, tone, personalization } = req.body;

    if (!goal || !subject || !tone) {
      return res.status(400).json({
        error: 'goal, subject, and tone are required'
      });
    }

    const prompt = `You are an expert email marketer. Generate professional HTML email content for this campaign.
Campaign Goal: ${goal}
Subject Line: ${subject}
Tone: ${tone}
Personalization: ${personalization || 'None'}

Create a compelling email body in HTML format. Include a preview text (the first line that appears in inbox previews).

IMPORTANT: Return ONLY valid JSON. Make sure all quotes inside the HTML are properly escaped.
Use this exact structure:
{"content": "<html>...</html>", "previewText": "..."}

The HTML should be professional, mobile-responsive, and include:
- A clear headline
- Engaging body copy aligned with the goal
- A call-to-action button
- Professional styling with inline CSS
- Use single quotes for HTML attributes to avoid JSON escaping issues`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('content'),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      try {
        // Strip markdown code blocks if present
        let jsonText = content.text.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
        }

        // Try to parse the JSON
        const result = JSON.parse(jsonText);
        return res.json(result);
      } catch (parseError: any) {
        console.error('JSON Parse Error:', parseError);
        console.error('AI Response:', content.text.substring(0, 500));
        return res.status(500).json({
          error: 'Failed to parse AI response. Please try again.',
          details: parseError?.message || 'Unknown error'
        });
      }
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/ai/optimize-send-time - Get optimal send time
router.post('/ai/optimize-send-time', async (req, res, next) => {
  try {
    // Calculate optimal time as Tuesday at 10 AM (next Tuesday)
    const now = new Date();
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7;
    const optimalDate = new Date(now);
    optimalDate.setDate(now.getDate() + daysUntilTuesday);
    optimalDate.setHours(10, 0, 0, 0);

    return res.json({
      optimalTime: optimalDate.toISOString()
    });
  } catch (error) {
    return next(error);
  }
});

// AWS SES for sending campaign emails (verified: support@brandmonkz.com)
const ses = new SESClient({ region: 'us-east-1' });
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'support@brandmonkz.com';
const FROM_NAME = process.env.SES_FROM_NAME || 'BrandMonkz';

async function sendEmail(to: string, subject: string, html: string) {
  return ses.send(new SendEmailCommand({
    Source: `${FROM_NAME} <${FROM_EMAIL}>`,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  }));
}

// POST /api/campaigns/:id/send - Send campaign emails to all linked contacts
router.post('/:id/send', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get campaign with linked companies and their contacts
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!campaign.subject || !campaign.htmlContent) {
      return res.status(400).json({ error: 'Campaign must have a subject and content' });
    }

    // Collect all unique contacts from linked companies
    const contactMap = new Map<string, { id: string; email: string; firstName: string; lastName: string; companyName: string }>();
    for (const cc of campaign.companies) {
      for (const contact of cc.company.contacts) {
        if (contact.email && !contactMap.has(contact.email)) {
          contactMap.set(contact.email, {
            ...contact,
            companyName: cc.company.name || '',
          });
        }
      }
    }

    const contacts = Array.from(contactMap.values());
    let sent = 0;
    let failed = 0;
    const fromEmail = process.env.SMTP_USER || 'noreply@brandmonkz.com';
    const fromName = 'BrandMonkz';

    for (const contact of contacts) {
      try {
        // Replace template variables
        let subject = campaign.subject;
        let html = campaign.htmlContent;
        const vars: Record<string, string> = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          companyName: contact.companyName || '',
        };
        for (const [key, val] of Object.entries(vars)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, val);
          html = html.replace(regex, val);
        }

        await sendEmail(contact.email, subject, html);

        // Create email log
        try {
          await prisma.emailLog.create({
            data: {
              toEmail: contact.email,
              fromEmail,
              status: 'SENT',
              sentAt: new Date(),
              campaignId: campaign.id,
              contactId: contact.id,
            } as any,
          });
        } catch {
          // Log creation failure is non-blocking
        }

        sent++;
      } catch (err) {
        console.error(`Failed to send to ${contact.email}:`, err);
        failed++;
      }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalSent: sent,
      },
    });

    return res.json({ sent, total: contacts.length, failed });
  } catch (error) {
    return next(error);
  }
});

// POST /api/campaigns/:id/mock-send - Queue campaign without sending (SES sandbox mode)
router.post('/:id/mock-send', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!campaign.subject || !campaign.htmlContent) {
      return res.status(400).json({ error: 'Campaign must have a subject and content' });
    }

    // Collect unique contacts
    const contactMap = new Map<string, any>();
    for (const cc of campaign.companies) {
      for (const contact of cc.company.contacts) {
        if (contact.email && !contactMap.has(contact.email)) {
          contactMap.set(contact.email, { ...contact, companyName: cc.company.name });
        }
      }
    }

    const contacts = Array.from(contactMap.values());

    // Log as QUEUED (not sent)
    for (const contact of contacts) {
      try {
        await prisma.emailLog.create({
          data: {
            toEmail: contact.email,
            fromEmail: process.env.SES_FROM_EMAIL || 'campaigns@brandmonkz.com',
            status: 'QUEUED',
            campaignId: campaign.id,
            contactId: contact.id,
          } as any,
        });
      } catch {
        // Non-blocking
      }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalSent: contacts.length,
      },
    });

    return res.json({
      success: true,
      sent: contacts.length,
      total: contacts.length,
      failed: 0,
      mode: 'queued',
      message: `Campaign queued for ${contacts.length} contacts. Emails will be delivered when SES production access is active.`,
      recipients: contacts.map((c: any) => ({
        email: c.email,
        name: `${c.firstName} ${c.lastName}`,
        company: c.companyName,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
