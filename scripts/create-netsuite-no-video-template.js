/**
 * Migration Script: Create NetSuite Template Without Video
 *
 * This script creates a new email template based on "Critical River - NetSuite AI Automation (Copy)"
 * but removes the video section and adds a timestamp variable.
 *
 * Variables in new template:
 * - firstName
 * - companyName
 * - senderName
 * - calendarLink
 * - timestamp (NEW)
 *
 * Run with: node scripts/create-netsuite-no-video-template.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createNoVideoTemplate() {
  try {
    console.log('🔍 Finding source template...');

    // Get the fixed NetSuite template (Copy)
    const sourceTemplate = await prisma.emailTemplate.findFirst({
      where: {
        name: { contains: 'NetSuite AI Automation (Copy)' }
      }
    });

    if (!sourceTemplate) {
      console.error('❌ Source template not found');
      process.exit(1);
    }

    console.log('✓ Found source template:', sourceTemplate.name);
    console.log('');

    // Check if template already exists
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        name: 'Critical River - NetSuite AI (No Video)'
      }
    });

    if (existing) {
      console.log('⚠️  Template already exists, deleting old version...');
      await prisma.emailTemplate.delete({
        where: { id: existing.id }
      });
    }

    // Process HTML: Remove video section
    let htmlWithoutVideo = sourceTemplate.htmlContent;

    console.log('🔧 Removing video section from HTML...');

    // Find the video section by looking for the emoji and surrounding table
    const videoTitleIndex = htmlWithoutVideo.indexOf('🎯 Watch how {{companyName}} can');

    if (videoTitleIndex > -1) {
      // Find the table opening before this text
      let searchPos = videoTitleIndex;
      let tableOpenCount = 0;
      let sectionStart = -1;

      // Search backwards for the table containing the video
      while (searchPos > 0) {
        const prevTableOpen = htmlWithoutVideo.lastIndexOf('<table', searchPos - 1);
        const prevTableClose = htmlWithoutVideo.lastIndexOf('</table>', searchPos - 1);

        if (prevTableOpen > prevTableClose) {
          // Found opening table tag
          sectionStart = prevTableOpen;
          break;
        }
        searchPos = prevTableOpen;
      }

      if (sectionStart > -1) {
        // Find the matching closing tag
        const videoContentEnd = htmlWithoutVideo.indexOf('Personalized for {{companyName}}', videoTitleIndex);
        if (videoContentEnd > -1) {
          const sectionEnd = htmlWithoutVideo.indexOf('</table>', videoContentEnd) + 8;

          // Remove the entire video section
          htmlWithoutVideo = htmlWithoutVideo.substring(0, sectionStart) +
                           '\n\n' +
                           htmlWithoutVideo.substring(sectionEnd);

          console.log('✓ Removed video section (characters', sectionStart, 'to', sectionEnd, ')');
        }
      }
    }

    // Add timestamp after greeting
    console.log('🔧 Adding timestamp variable after greeting...');

    const greetingEnd = htmlWithoutVideo.indexOf('Hi <strong>{{firstName}}</strong>,</p>');
    if (greetingEnd > -1) {
      const insertPosition = greetingEnd + 39; // After </p>

      const timestampHtml = `
                            <p style="margin: 0 0 24px 0; color: #666; font-size: 13px; font-style: italic;">
                                {{timestamp}}
                            </p>`;

      htmlWithoutVideo = htmlWithoutVideo.substring(0, insertPosition) +
                        timestampHtml +
                        htmlWithoutVideo.substring(insertPosition);

      console.log('✓ Added timestamp placeholder');
    }

    // Extract variables from the modified HTML
    const variableMatches = htmlWithoutVideo.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    const variables = [...new Set(variableMatches.map(v => v.replace(/[{}]/g, '')))];

    console.log('');
    console.log('📋 Variables in new template:', variables);
    console.log('');

    // Create the new template with the same owner as the source template
    const newTemplate = await prisma.emailTemplate.create({
      data: {
        name: 'Critical River - NetSuite AI (No Video)',
        subject: sourceTemplate.subject,
        htmlContent: htmlWithoutVideo,
        textContent: sourceTemplate.textContent?.replace(/video/gi, 'personalized message') ||
                    'Transform your NetSuite operations with AI automation.',
        variables: variables,
        variableValues: {},
        isActive: true,
        user: {
          connect: { id: sourceTemplate.userId }
        }
      }
    });

    console.log('✅ SUCCESS: Created new template');
    console.log('');
    console.log('Template Details:');
    console.log('  Name:', newTemplate.name);
    console.log('  ID:', newTemplate.id);
    console.log('  Subject:', newTemplate.subject);
    console.log('  Variables:', newTemplate.variables);
    console.log('  Active:', newTemplate.isActive);
    console.log('');
    console.log('Variables for users to edit:');
    console.log('  - firstName: Recipient first name');
    console.log('  - companyName: Recipient company name');
    console.log('  - senderName: Your name (sender)');
    console.log('  - calendarLink: Your calendar booking link');
    console.log('  - timestamp: Email send date/time');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
createNoVideoTemplate();
