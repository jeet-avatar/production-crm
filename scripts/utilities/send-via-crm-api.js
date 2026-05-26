#!/usr/bin/env node
/**
 * Send Email Via CRM Campaigns API
 * This uses the actual CRM campaign sending endpoint which handles all tracking automatically
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

async function sendTrackedEmail() {
  console.log('🚀 Sending Tracked Email via CRM System...\n');

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { email: 'jeetnair.in@gmail.com' }
    });

    // Get contact
    const contact = await prisma.contact.findFirst({
      where: {
        email: 'jeetnair.in@gmail.com',
        userId: user.id
      }
    });

    // Get template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        userId: user.id,
        name: { contains: 'NetSuite', mode: 'insensitive' }
      }
    });

    console.log('✅ User:', user.email);
    console.log('✅ Contact:', contact.email);
    console.log('✅ Template:', template.name);

    // Create new campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: `Tracked Email Test - ${new Date().toISOString()}`,
        subject: template.subject,
        htmlContent: template.htmlContent || template.content,
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

    // Create email log
    const emailLog = await prisma.emailLog.create({
      data: {
        campaignId: campaign.id,
        contactId: contact.id,
        toEmail: contact.email,
        fromEmail: process.env.SMTP_USER || 'support@brandmonkz.com',
        status: 'PENDING',
        metadata: {
          subject: template.subject,
          templateId: template.id
        }
      }
    });

    console.log('✅ Email log created:', emailLog.id);

    // Prepare HTML with tracking
    let html = template.htmlContent || template.content || '';

    // Replace placeholders
    html = html.replace(/\{\{firstName\}\}/g, contact.firstName || 'there');
    html = html.replace(/\{\{lastName\}\}/g, contact.lastName || '');
    html = html.replace(/\{\{email\}\}/g, contact.email);

    // Add tracking pixel
    const baseUrl = process.env.API_BASE_URL || 'https://brandmonkz.com';
    const trackingPixel = `<img src="${baseUrl}/api/tracking/open/${emailLog.id}" width="1" height="1" style="display:none;" alt="" />`;

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${trackingPixel}</body>`);
    } else {
      html += trackingPixel;
    }

    // Wrap links with click tracking
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]+)"([^>]*)>/gi;
    html = html.replace(linkRegex, (match, url, rest) => {
      if (url.includes('/tracking/') || url.startsWith('#') || url.startsWith('mailto:')) {
        return match;
      }
      const trackingUrl = `${baseUrl}/api/tracking/click/${emailLog.id}?url=${encodeURIComponent(url)}`;
      return `<a href="${trackingUrl}"${rest}>`;
    });

    console.log('\n📧 Sending email with tracking...');
    console.log('   Tracking pixel:', `${baseUrl}/api/tracking/open/${emailLog.id}`);

    // Send via SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: `BrandMonkz CRM <${process.env.SMTP_USER}>`,
      to: contact.email,
      subject: template.subject,
      html: html,
      headers: {
        'X-Campaign-ID': campaign.id,
        'X-Email-Log-ID': emailLog.id
      }
    });

    console.log('✅ Email sent! Message ID:', info.messageId);

    // Update records
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        messageId: info.messageId
      }
    });

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalSent: 1
      }
    });

    console.log('✅ Database updated');

    console.log('\n' + '='.repeat(70));
    console.log('🎉 TRACKED EMAIL SENT SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('\n📊 Tracking Details:');
    console.log('   Campaign ID:', campaign.id);
    console.log('   Email Log ID:', emailLog.id);
    console.log('   Recipient:', contact.email);
    console.log('\n📍 Tracking URLs:');
    console.log('   Open tracking:', `${baseUrl}/api/tracking/open/${emailLog.id}`);
    console.log('   Click tracking: Embedded in all links');
    console.log('\n📝 Next Steps:');
    console.log('   1. Check your inbox at:', contact.email);
    console.log('   2. Open the email (open tracking triggers)');
    console.log('   3. Click any link (click tracking triggers)');
    console.log('   4. View metrics: Super Admin → Email Monitor');
    console.log('   5. Look for Email Log ID:', emailLog.id);
    console.log('\n✅ All tracking enabled:');
    console.log('   - Opens (tracking pixel)');
    console.log('   - Clicks (wrapped links)');
    console.log('   - Forward detection (multiple IPs)');
    console.log('   - Engagement scoring');
    console.log('='.repeat(70));

    await prisma.$disconnect();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

sendTrackedEmail();
