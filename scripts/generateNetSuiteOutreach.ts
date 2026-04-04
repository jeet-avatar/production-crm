/**
 * NetSuite AI Business Outreach Generator
 *
 * This script automates the creation of personalized outreach campaigns:
 * 1. Selects a target company from the database
 * 2. Finds the right decision-maker contact
 * 3. Generates AI-powered personalized message
 * 4. Creates AI video with ElevenLabs voiceover
 * 5. Creates email template with embedded video
 *
 * Usage: npx ts-node scripts/generateNetSuiteOutreach.ts
 */

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  // Target industries for NetSuite outreach
  targetIndustries: ['Finance', 'Retail', 'Manufacturing', 'SaaS', 'Professional Services', 'Technology'],

  // Company size range (NetSuite sweet spot: mid-market)
  companySizeRange: ['51-200', '201-500', '501-1000'],

  // Contact title priorities (in order of preference)
  contactTitlePriority: [
    ['CFO', 'Chief Financial Officer', 'Finance Director', 'VP Finance'],
    ['CTO', 'Chief Technology Officer', 'IT Director', 'VP Technology'],
    ['COO', 'Chief Operating Officer', 'Operations Director', 'VP Operations'],
    ['CEO', 'Chief Executive Officer', 'President', 'Founder']
  ],

  // ElevenLabs voice settings
  defaultVoice: 'elevenlabs:21m00Tcm4TlvDq8ikWAM', // Rachel - Professional female
  videoLength: 60, // seconds

  // Message tone and focus
  messageTone: 'professional_consultative',
  valuePropositions: [
    'Reduce month-end close time by 40-50%',
    'Automate invoice processing & reconciliation',
    'AI-powered revenue recognition (perfect for SaaS)',
    'Real-time financial reporting & dashboards',
    'Automated journal entries & allocations'
  ]
};

// Types
interface SelectedCompany {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  location: string | null;
  description: string | null;
}

interface SelectedContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string | null;
  companyId: string;
}

interface GeneratedMessage {
  subject: string;
  body: string;
  summary: string;
}

interface GeneratedVideo {
  campaignId: string;
  videoUrl: string;
  thumbnailUrl: string;
  script: string;
  status: string;
}

interface OutreachResult {
  company: SelectedCompany;
  contact: SelectedContact;
  message: GeneratedMessage;
  video: GeneratedVideo;
  emailTemplateId: string;
  emailTemplateUrl: string;
}

// ============================================
// STEP 1: COMPANY SELECTION
// ============================================

async function selectTargetCompany(): Promise<SelectedCompany | null> {
  console.log('\n🎯 STEP 1: Selecting Target Company...\n');

  try {
    // Query companies matching NetSuite target profile
    const companies = await prisma.company.findMany({
      where: {
        AND: [
          {
            OR: [
              { industry: { in: CONFIG.targetIndustries, mode: 'insensitive' } },
              { industry: { contains: 'Finance', mode: 'insensitive' } },
              { industry: { contains: 'SaaS', mode: 'insensitive' } },
              { industry: { contains: 'Technology', mode: 'insensitive' } }
            ]
          },
          {
            OR: [
              { size: { in: CONFIG.companySizeRange } },
              { size: { contains: '51-', mode: 'insensitive' } },
              { size: { contains: '201-', mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        industry: true,
        size: true,
        location: true,
        description: true
      },
      take: 10 // Get top 10 candidates
    });

    if (companies.length === 0) {
      console.log('❌ No suitable companies found matching NetSuite target criteria');
      return null;
    }

    // Prioritize companies with NetSuite/ERP keywords in description
    const prioritized = companies.sort((a, b) => {
      const aHasKeyword = a.description?.toLowerCase().includes('netsuite') ||
                          a.description?.toLowerCase().includes('erp') ||
                          a.description?.toLowerCase().includes('accounting') ? 1 : 0;
      const bHasKeyword = b.description?.toLowerCase().includes('netsuite') ||
                          b.description?.toLowerCase().includes('erp') ||
                          b.description?.toLowerCase().includes('accounting') ? 1 : 0;
      return bHasKeyword - aHasKeyword;
    });

    // Select the top candidate
    const selected = prioritized[0];

    console.log(`✅ Selected Company: ${selected.name}`);
    console.log(`   Industry: ${selected.industry || 'N/A'}`);
    console.log(`   Size: ${selected.size || 'N/A'}`);
    console.log(`   Location: ${selected.location || 'N/A'}`);
    console.log(`   Description: ${selected.description?.substring(0, 100) || 'N/A'}...`);

    return selected;

  } catch (error) {
    console.error('❌ Error selecting company:', error);
    return null;
  }
}

// ============================================
// STEP 2: CONTACT SELECTION
// ============================================

async function selectDecisionMaker(companyId: string): Promise<SelectedContact | null> {
  console.log('\n👤 STEP 2: Finding Decision Maker...\n');

  try {
    // Get all contacts for the company
    const contacts = await prisma.contact.findMany({
      where: { companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        companyId: true
      }
    });

    if (contacts.length === 0) {
      console.log('❌ No contacts found for this company');
      return null;
    }

    // Prioritize by title
    for (const titleGroup of CONFIG.contactTitlePriority) {
      for (const contact of contacts) {
        if (contact.title) {
          for (const keyword of titleGroup) {
            if (contact.title.toLowerCase().includes(keyword.toLowerCase())) {
              console.log(`✅ Selected Contact: ${contact.firstName} ${contact.lastName}`);
              console.log(`   Title: ${contact.title}`);
              console.log(`   Email: ${contact.email}`);
              console.log(`   Priority: ${titleGroup[0]} level`);
              return contact;
            }
          }
        }
      }
    }

    // Fallback: Use first available contact
    const fallback = contacts[0];
    console.log(`⚠️  No exact title match found, using: ${fallback.firstName} ${fallback.lastName}`);
    console.log(`   Title: ${fallback.title || 'N/A'}`);
    console.log(`   Email: ${fallback.email}`);

    return fallback;

  } catch (error) {
    console.error('❌ Error selecting contact:', error);
    return null;
  }
}

// ============================================
// STEP 3: AI MESSAGE GENERATION
// ============================================

async function generatePersonalizedMessage(
  company: SelectedCompany,
  contact: SelectedContact
): Promise<GeneratedMessage | null> {
  console.log('\n✨ STEP 3: Generating AI-Powered Message...\n');

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const prompt = `You are a B2B sales expert specializing in AI automation for NetSuite ERP systems.

Generate a highly personalized email for the following prospect:

COMPANY DETAILS:
- Name: ${company.name}
- Industry: ${company.industry || 'Not specified'}
- Size: ${company.size || 'Not specified'} employees
- Location: ${company.location || 'Not specified'}
- Description: ${company.description || 'Not specified'}

CONTACT DETAILS:
- Name: ${contact.firstName} ${contact.lastName}
- Title: ${contact.title || 'Not specified'}

OUR OFFERING:
AI-powered automation for NetSuite workflows, specifically:
${CONFIG.valuePropositions.map(vp => `- ${vp}`).join('\n')}

REQUIREMENTS:
1. Subject line should be personalized and focused on a specific pain point
2. Email should be 150-200 words maximum
3. Tone: ${CONFIG.messageTone.replace('_', ' ')}
4. Mention that you've created a 60-second video showing how this works
5. Include industry-specific pain points
6. End with a low-pressure CTA (suggest 15-min call or demo)
7. Sign as "Jithesh, AI Solutions for NetSuite"

OUTPUT FORMAT (return as JSON):
{
  "subject": "Personalized subject line using their first name",
  "body": "Complete email body with video mention",
  "summary": "One-sentence summary of the email's value proposition"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Extract text and try to find JSON, handling markdown code blocks
      let jsonText = content.text;

      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Find the JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Sanitize the JSON string - parse with a more lenient approach
        let sanitizedJson = jsonMatch[0];

        // Use a try-catch with JSON5 or manual fixing
        try {
          const message: GeneratedMessage = JSON.parse(sanitizedJson);
          console.log(`✅ Message Generated Successfully`);
          console.log(`   Subject: ${message.subject}`);
          console.log(`   Summary: ${message.summary}`);
          console.log(`   Body length: ${message.body.length} characters`);
          return message;
        } catch (parseError) {
          // If JSON.parse fails, manually extract and rebuild the object
          const subjectMatch = sanitizedJson.match(/"subject"\s*:\s*"([^"]*)"/);
          const summaryMatch = sanitizedJson.match(/"summary"\s*:\s*"([^"]*)"/);
          const bodyMatch = sanitizedJson.match(/"body"\s*:\s*"([\s\S]*?)"\s*[,}]/);

          if (subjectMatch && bodyMatch && summaryMatch) {
            const message: GeneratedMessage = {
              subject: subjectMatch[1],
              body: bodyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
              summary: summaryMatch[1]
            };

            console.log(`✅ Message Generated Successfully (manual parse)`);
            console.log(`   Subject: ${message.subject}`);
            console.log(`   Summary: ${message.summary}`);
            console.log(`   Body length: ${message.body.length} characters`);
            return message;
          }
        }
      }
    }

    console.log('❌ Failed to parse AI response');
    return null;

  } catch (error) {
    console.error('❌ Error generating message:', error);
    return null;
  }
}

// ============================================
// STEP 4: AI VIDEO GENERATION
// ============================================

async function generateAIVideo(
  company: SelectedCompany,
  contact: SelectedContact
): Promise<GeneratedVideo | null> {
  console.log('\n🎬 STEP 4: Generating AI Video with ElevenLabs...\n');

  try {
    const API_URL = process.env.API_BASE_URL || 'https://brandmonkz.com';
    const token = process.env.CRM_AUTH_TOKEN; // Need auth token for API

    if (!token) {
      console.log('❌ CRM_AUTH_TOKEN not set in environment');
      console.log('⚠️  Skipping video generation - will create email template without video');
      return null;
    }

    // Prepare video generation request
    const videoContext = `We're reaching out to ${company.name}, a ${company.industry} company with ${company.size} employees. They use NetSuite and need AI automation for month-end close, invoice processing, and financial reporting.`;

    const requestData = {
      companyName: company.name,
      additionalContext: videoContext,
      voiceId: CONFIG.defaultVoice,
      // The backend will handle template selection and script generation
    };

    console.log('   📝 Sending video generation request...');
    console.log(`   Company: ${company.name}`);
    console.log(`   Voice: Rachel (Professional female)`);
    console.log(`   Context: NetSuite AI automation`);

    // Call the AI Auto-Generate Video API
    const response = await axios.post(
      `${API_URL}/api/video-campaigns/auto-generate`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 minutes timeout for video generation
      }
    );

    if (response.data && response.data.campaignId) {
      const video: GeneratedVideo = {
        campaignId: response.data.campaignId,
        videoUrl: response.data.videoUrl || `${API_URL}/video-campaigns/${response.data.campaignId}`,
        thumbnailUrl: response.data.thumbnailUrl || `${API_URL}/video-campaigns/${response.data.campaignId}/thumbnail`,
        script: response.data.script || '',
        status: response.data.status || 'completed'
      };

      console.log(`✅ Video Generated Successfully!`);
      console.log(`   Campaign ID: ${video.campaignId}`);
      console.log(`   Video URL: ${video.videoUrl}`);
      console.log(`   Status: ${video.status}`);

      return video;
    }

    console.log('❌ Video generation failed: No campaign ID returned');
    return null;

  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️  Video generation timed out (this is normal for first-time generation)');
      console.log('   Video may still be processing in the background');
    } else {
      console.error('❌ Error generating video:', error.message);
    }
    console.log('⚠️  Continuing without video - will create email template with text only');
    return null;
  }
}

// ============================================
// STEP 5: CREATE EMAIL TEMPLATE
// ============================================

async function createEmailTemplate(
  company: SelectedCompany,
  contact: SelectedContact,
  message: GeneratedMessage,
  video: GeneratedVideo | null
): Promise<{ id: string; url: string } | null> {
  console.log('\n📧 STEP 5: Creating Email Template...\n');

  try {
    // Get the first user (template owner)
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No user found to own the template');
      return null;
    }

    // Prepare email body with or without video
    let emailBody = message.body;

    if (video) {
      // Insert video embed after the greeting
      const videoEmbed = `\n\n🎥 **I created a quick 60-second video showing how this works:**\n\n[Watch Video: AI Automation for NetSuite](${video.videoUrl})\n_Click above to see how companies like ${company.name} are transforming their NetSuite workflows_\n\n`;

      // Insert after first paragraph (after greeting)
      const paragraphs = emailBody.split('\n\n');
      if (paragraphs.length > 1) {
        paragraphs.splice(1, 0, videoEmbed);
        emailBody = paragraphs.join('\n\n');
      } else {
        emailBody = emailBody + videoEmbed;
      }
    }

    // Replace placeholders with variables
    emailBody = emailBody.replace(contact.firstName, '{{firstName}}');
    emailBody = emailBody.replace(contact.lastName, '{{lastName}}');
    emailBody = emailBody.replace(company.name, '{{companyName}}');

    const subject = message.subject.replace(contact.firstName, '{{firstName}}');

    // Convert body to HTML (simple formatting)
    const htmlContent = emailBody
      .replace(/\n/g, '<br>')
      .replace(/•/g, '&bull;');

    // Create the email template
    const template = await prisma.emailTemplate.create({
      data: {
        name: `${company.name} - NetSuite AI Outreach`,
        subject: subject,
        textContent: emailBody,
        htmlContent: htmlContent,
        userId: user.id,
        isActive: true
      }
    });

    const templateUrl = `https://brandmonkz.com/email-templates`;

    console.log(`✅ Email Template Created!`);
    console.log(`   Template ID: ${template.id}`);
    console.log(`   Template Name: ${template.name}`);
    console.log(`   Subject: ${template.subject}`);
    console.log(`   Video Embedded: ${video ? 'Yes ✅' : 'No (text only)'}`);
    console.log(`   URL: ${templateUrl}`);

    return {
      id: template.id,
      url: templateUrl
    };

  } catch (error) {
    console.error('❌ Error creating email template:', error);
    return null;
  }
}

// ============================================
// MAIN EXECUTION FUNCTION
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NetSuite AI Business Outreach Generator');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    // Step 1: Select Company
    const company = await selectTargetCompany();
    if (!company) {
      console.log('\n❌ Cannot proceed without a target company');
      return;
    }

    // Step 2: Select Contact
    const contact = await selectDecisionMaker(company.id);
    if (!contact) {
      console.log('\n❌ Cannot proceed without a decision maker contact');
      return;
    }

    // Step 3: Generate Message
    const message = await generatePersonalizedMessage(company, contact);
    if (!message) {
      console.log('\n❌ Cannot proceed without generated message');
      return;
    }

    // Step 4: Generate AI Video (optional - continues if fails)
    const video = await generateAIVideo(company, contact);

    // Step 5: Create Email Template
    const emailTemplate = await createEmailTemplate(company, contact, message, video);
    if (!emailTemplate) {
      console.log('\n❌ Failed to create email template');
      return;
    }

    // ============================================
    // FINAL SUMMARY
    // ============================================

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ COMPLETE! NetSuite Outreach Package Ready');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📊 **SUMMARY:**\n');
    console.log(`   Company: ${company.name}`);
    console.log(`   Industry: ${company.industry}`);
    console.log(`   Size: ${company.size} employees`);
    console.log(`   Location: ${company.location}\n`);

    console.log(`   Contact: ${contact.firstName} ${contact.lastName}`);
    console.log(`   Title: ${contact.title}`);
    console.log(`   Email: ${contact.email}\n`);

    console.log(`   Message: ${message.summary}`);
    console.log(`   Subject: ${message.subject}\n`);

    if (video) {
      console.log(`   Video: ✅ Generated`);
      console.log(`   Campaign ID: ${video.campaignId}`);
      console.log(`   Video URL: ${video.videoUrl}\n`);
    } else {
      console.log(`   Video: ⚠️  Not generated (email will be text-only)\n`);
    }

    console.log(`   Email Template: ${emailTemplate.id}`);
    console.log(`   Template Name: "${company.name} - NetSuite AI Outreach"\n`);

    console.log('🎯 **NEXT STEPS:**\n');
    console.log(`   1. View template: ${emailTemplate.url}`);
    console.log(`   2. Review and customize if needed`);
    console.log(`   3. Send to: ${contact.email}`);
    if (video) {
      console.log(`   4. Track video engagement: ${video.videoUrl}`);
    }

    console.log(`\n⏱️  Total time: ${duration} seconds\n`);

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { main, selectTargetCompany, selectDecisionMaker, generatePersonalizedMessage };
