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

    const prompt = `You are the head of business development at BrandMonkz, a premium technology staffing company. Generate a campaign name and goal for an outreach email campaign.

Your company (BrandMonkz) provides pre-vetted technology talent to enterprise clients — AI/ML engineers, cloud architects, cybersecurity analysts, full-stack developers, data engineers, DevOps specialists, and more.

Tone: ${tone || 'professional'}
Campaign Brief: ${description || 'Reach out to enterprise companies about our technology staffing services'}

Generate a short, punchy campaign name and a clear business goal. The goal should focus on getting meetings/calls with hiring managers.

Return ONLY valid JSON:
{"name": "Short Campaign Name", "goal": "One sentence goal focused on business outcome"}`;

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

    const prompt = `You are a staffing sales executive at BrandMonkz writing subject lines for outreach emails to hiring managers at enterprise companies.

Campaign Goal: ${goal}
Tone: ${tone}
Campaign Name: ${campaignName}

Write 5 short, human subject lines (under 60 chars) that a real person would send. NOT marketing-speak. Think: what would you write to a VP of Engineering you want to grab coffee with?

Use {{companyName}} where the company name should go.

Examples of GOOD subject lines:
- "Quick question about {{companyName}}'s AI team"
- "{{companyName}} + BrandMonkz — 3 engineers ready this week"
- "Saw {{companyName}} is hiring cloud architects"

Examples of BAD subject lines (too salesy/generic):
- "Unlock Your Hiring Potential Today!"
- "Revolutionary Staffing Solutions Await"

Return ONLY valid JSON:
{"variants": ["line 1", "line 2", "line 3", "line 4", "line 5"]}`;

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

    const prompt = `You are a senior business development executive at BrandMonkz, a premium technology staffing firm. Write a professional outreach email to a hiring manager.

Campaign Goal: ${goal}
Subject Line: ${subject}
Tone: ${tone}
Personalization: Use {{firstName}} for the recipient's first name and {{companyName}} for their company name.

Write an email that:
1. Opens with "Hi {{firstName}}," — warm and personal
2. References {{companyName}} specifically — show you know their company
3. Gets to the point in 2-3 short paragraphs — what you offer and why they should care
4. Includes 3-5 bullet points of specific value (e.g. "48-hour candidate delivery", "Pre-vetted engineers", specific tech roles available)
5. Ends with a simple CTA: "Would you be open to a 15-minute call this week?"
6. Signs off as "Best, BrandMonkz Staffing Team"

DO NOT:
- Use marketing buzzwords like "synergy", "leverage", "revolutionize"
- Write more than 250 words
- Use ALL CAPS or excessive exclamation marks
- Sound like a mass email — this should feel like a personal note

Format as clean HTML with:
- A gradient header bar (background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)) with the campaign headline in white
- Body on white background (#ffffff) with dark text (#333333)
- Bullet points styled clearly
- A centered CTA button with the gradient background
- Professional font: 'Segoe UI', Arial, sans-serif
- Max width 600px, centered
- All CSS must be INLINE (no <style> tags)
- Use SINGLE QUOTES for all HTML attributes

IMPORTANT: Return ONLY valid JSON. Escape all quotes properly.
{"content": "<div style='...'>full HTML email here</div>", "previewText": "First line preview"}`;

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

    const TRACKING_BASE = process.env.FRONTEND_URL || 'https://brandmonkz.com';

    for (const contact of contacts) {
      try {
        // Replace template variables
        let subjectLine = campaign.subject;
        let html = campaign.htmlContent;
        const vars: Record<string, string> = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          companyName: contact.companyName || '',
        };
        for (const [key, val] of Object.entries(vars)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subjectLine = subjectLine.replace(regex, val);
          html = html.replace(regex, val);
        }

        // Create email log FIRST to get the ID for tracking pixel
        let emailLogId = '';
        try {
          const emailLog = await prisma.emailLog.create({
            data: {
              toEmail: contact.email,
              fromEmail,
              status: 'SENT',
              sentAt: new Date(),
              campaignId: campaign.id,
              contactId: contact.id,
            } as any,
          });
          emailLogId = emailLog.id;
        } catch {
          // Continue without tracking
        }

        // Inject tracking pixel into HTML
        if (emailLogId) {
          const trackingPixel = `<img src="${TRACKING_BASE}/api/tracking/open/${emailLogId}" alt="" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" />`;
          // Insert before closing </body> or </div> or append at end
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${trackingPixel}</body>`);
          } else if (html.includes('</div>')) {
            html = html.replace(/<\/div>\s*$/, `${trackingPixel}</div>`);
          } else {
            html += trackingPixel;
          }
        }

        await sendEmail(contact.email, subjectLine, html);
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
