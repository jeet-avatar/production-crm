#!/usr/bin/env node
/**
 * Send Tracked Test Email - Complete Setup & Send
 *
 * This script:
 * 1. Creates self-contact for jeetnair.in@gmail.com
 * 2. Sets up SMTP configuration (if missing)
 * 3. Creates campaign with NetSuite AI template
 * 4. Sends email with full tracking (open/click detection)
 * 5. Shows tracking URL and EmailLog ID
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

const TEST_EMAIL = 'jeetnair.in@gmail.com';

async function main() {
  console.log('🚀 Starting Tracked Test Email Setup...\n');

  // Step 1: Get user
  console.log('📋 Step 1: Getting user account...');
  const user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    select: { id: true, email: true, firstName: true, lastName: true }
  });

  if (!user) {
    console.error('❌ User not found:', TEST_EMAIL);
    process.exit(1);
  }
  console.log('✅ User found:', user.email);

  // Step 2: Create or get self-contact
  console.log('\n📋 Step 2: Creating/getting self-contact...');
  let contact = await prisma.contact.findFirst({
    where: {
      email: TEST_EMAIL,
      userId: user.id
    }
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        email: TEST_EMAIL,
        firstName: user.firstName || 'Jitesh',
        lastName: user.lastName || 'Nair',
        userId: user.id,
        source: 'MANUAL'
      }
    });
    console.log('✅ Contact created:', contact.email);
  } else {
    console.log('✅ Contact already exists:', contact.email);
  }

  // Step 3: Use environment SMTP (skip database config for now)
  console.log('\n📋 Step 3: Using SMTP from environment...');
  const smtpConfig = {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || 'support@brandmonkz.com',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    fromEmail: process.env.SMTP_USER || 'support@brandmonkz.com',
    fromName: 'BrandMonkz CRM'
  };
  console.log('✅ SMTP configured:', smtpConfig.fromEmail);

  // Step 4: Get NetSuite AI template
  console.log('\n📋 Step 4: Getting NetSuite AI template...');
  const template = await prisma.emailTemplate.findFirst({
    where: {
      userId: user.id,
      name: { contains: 'NetSuite', mode: 'insensitive' }
    }
  });

  if (!template) {
    console.error('❌ NetSuite template not found');
    process.exit(1);
  }
  console.log('✅ Template found:', template.name);

  // Step 5: Create campaign
  console.log('\n📋 Step 5: Creating campaign...');
  const campaign = await prisma.campaign.create({
    data: {
      name: `Test Tracked Email - ${new Date().toLocaleString()}`,
      subject: template.subject || 'NetSuite AI Test',
      htmlContent: template.htmlContent || template.content || '',
      templateId: template.id,
      userId: user.id,
      status: 'DRAFT',
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalBounced: 0
    }
  });
  console.log('✅ Campaign created:', campaign.id);

  // Step 6: Create EmailLog with tracking
  console.log('\n📋 Step 6: Creating email log with tracking...');
  const emailLog = await prisma.emailLog.create({
    data: {
      campaignId: campaign.id,
      contactId: contact.id,
      toEmail: contact.email,
      fromEmail: smtpConfig.fromEmail,
      status: 'PENDING',
      metadata: {
        subject: template.subject,
        templateId: template.id,
        templateName: template.name
      }
    }
  });
  console.log('✅ Email log created:', emailLog.id);

  // Step 7: Prepare HTML with tracking
  console.log('\n📋 Step 7: Adding tracking to email...');
  let htmlContent = template.htmlContent || template.content || '';

  // Replace placeholders
  htmlContent = htmlContent.replace(/\{\{firstName\}\}/g, contact.firstName || 'there');
  htmlContent = htmlContent.replace(/\{\{lastName\}\}/g, contact.lastName || '');
  htmlContent = htmlContent.replace(/\{\{email\}\}/g, contact.email);

  // Add tracking pixel at the end of the email (invisible 1x1 image)
  const trackingPixelUrl = `${process.env.API_BASE_URL || 'https://brandmonkz.com'}/api/tracking/open/${emailLog.id}`;
  const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

  if (!htmlContent.includes('</body>')) {
    htmlContent += trackingPixel;
  } else {
    htmlContent = htmlContent.replace('</body>', `${trackingPixel}</body>`);
  }

  // Wrap all links with click tracking
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]+)"([^>]*)>/gi;
  htmlContent = htmlContent.replace(linkRegex, (match, url, rest) => {
    // Skip if already a tracking URL
    if (url.includes('/tracking/click')) {
      return match;
    }

    const trackingUrl = `${process.env.API_BASE_URL || 'https://brandmonkz.com'}/api/tracking/click/${emailLog.id}?url=${encodeURIComponent(url)}`;
    return `<a href="${trackingUrl}"${rest}>`;
  });

  console.log('✅ Tracking pixel added:', trackingPixelUrl);
  console.log('✅ Click tracking added to all links');

  // Step 8: Send email via SMTP
  console.log('\n📋 Step 8: Sending email via SMTP...');

  const transporter = nodemailer.createTransport({
    host: smtpConfig.smtpHost,
    port: smtpConfig.smtpPort,
    secure: smtpConfig.smtpPort === 465,
    auth: {
      user: smtpConfig.smtpUser,
      pass: smtpConfig.smtpPassword
    }
  });

  const mailOptions = {
    from: `${smtpConfig.fromName} <${smtpConfig.fromEmail}>`,
    to: contact.email,
    subject: template.subject || 'NetSuite AI Test',
    html: htmlContent,
    headers: {
      'List-Unsubscribe': `<${process.env.API_BASE_URL || 'https://brandmonkz.com'}/unsubscribe?email=${contact.email}>`,
      'X-Mailer': 'BrandMonkz CRM',
      'X-Campaign-ID': campaign.id,
      'X-Email-Log-ID': emailLog.id
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);

    // Update email log status
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        messageId: info.messageId
      }
    });

    // Update campaign stats
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalSent: 1
      }
    });

    console.log('✅ Email log updated to SENT');

  } catch (error) {
    console.error('❌ Email send failed:', error.message);

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'FAILED',
        errorMessage: error.message
      }
    });

    process.exit(1);
  }

  // Step 9: Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 TRACKED TEST EMAIL SENT SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n📊 Tracking Information:');
  console.log('   Campaign ID:', campaign.id);
  console.log('   Email Log ID:', emailLog.id);
  console.log('   Contact:', contact.email);
  console.log('\n📍 Tracking URLs:');
  console.log('   Open Tracking:', trackingPixelUrl);
  console.log('   Click Tracking: Links wrapped automatically');
  console.log('\n📈 How to View Metrics:');
  console.log('   1. Open the email in your inbox');
  console.log('   2. Email opens will be tracked automatically');
  console.log('   3. Click any link to track clicks');
  console.log('   4. View metrics in Super Admin → Email Monitor');
  console.log('   5. Expand the row to see detailed tracking');
  console.log('\n🔍 Check tracking now:');
  console.log('   Super Admin Dashboard → Email Monitor tab');
  console.log('   Look for:', contact.email);
  console.log('   Email Log ID:', emailLog.id);
  console.log('\n✅ All tracking features enabled:');
  console.log('   - Open tracking (1x1 pixel)');
  console.log('   - Click tracking (all links wrapped)');
  console.log('   - Forward detection (IP/device tracking)');
  console.log('   - Engagement scoring (auto-calculated)');
  console.log('   - Time to open/click metrics');
  console.log('\n' + '='.repeat(60));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('\n❌ ERROR:', error);
  await prisma.$disconnect();
  process.exit(1);
});
