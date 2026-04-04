/**
 * Migration: Add Critical River NetSuite Email Template
 *
 * This migration adds the professionally designed Critical River NetSuite
 * email template with embedded video to the production database.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Critical River template migration...');

  // Read the HTML template
  const htmlContent = fs.readFileSync(
    path.join(__dirname, '../../NetSuite-FINAL-All-Variables.html'),
    'utf-8'
  );

  // Find the user (jeetnair.in@gmail.com) to assign this template to
  const user = await prisma.user.findFirst({
    where: {
      email: 'jeetnair.in@gmail.com'
    }
  });

  if (!user) {
    throw new Error('User jeetnair.in@gmail.com not found in production database');
  }

  console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

  // Check if template already exists
  const existingTemplate = await prisma.emailTemplate.findFirst({
    where: {
      userId: user.id,
      name: 'Critical River - NetSuite AI Automation'
    }
  });

  if (existingTemplate) {
    console.log('⚠️  Template already exists. Updating...');

    const updated = await prisma.emailTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        subject: 'Transform Your NetSuite Operations - Cut Month-End Close Time by 50%',
        htmlContent: htmlContent,
        textContent: 'Transform Your NetSuite Operations with AI-powered automation. Watch our personalized video to see how we can help.',
        variables: [
          'firstName',
          'companyName',
          'contactId',
          'email',
          'senderName',
          'calendarLink',
          'VIDEO_URL'
        ],
        isShared: true, // Make it visible to all team members
        updatedAt: new Date()
      }
    });

    console.log(`✅ Template updated successfully!`);
    console.log(`   - ID: ${updated.id}`);
    console.log(`   - Name: ${updated.name}`);
    console.log(`   - Link: https://brandmonkz.com/email-templates/${updated.id}`);

    return updated;
  }

  // Create new template
  console.log('📝 Creating new template...');

  const template = await prisma.emailTemplate.create({
    data: {
      userId: user.id,
      name: 'Critical River - NetSuite AI Automation',
      subject: 'Transform Your NetSuite Operations - Cut Month-End Close Time by 50%',
      htmlContent: htmlContent,
      textContent: 'Transform Your NetSuite Operations with AI-powered automation. Watch our personalized video to see how we can help.',
      variables: [
        'firstName',
        'companyName',
        'contactId',
        'email',
        'senderName',
        'calendarLink',
        'VIDEO_URL'
      ],
      isShared: true, // Make it visible to all team members
      isActive: true
    }
  });

  console.log('✅ Migration completed successfully!');
  console.log(`   - Template ID: ${template.id}`);
  console.log(`   - Template Name: ${template.name}`);
  console.log(`   - View at: https://brandmonkz.com/email-templates/${template.id}`);
  console.log(`   - Variables: ${JSON.stringify(template.variables)}`);

  return template;
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
