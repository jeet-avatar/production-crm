import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function sendTestEmail() {
  console.log('🚀 Starting test email campaign...\n');

  try {
    // Step 1: Check if test contact exists
    console.log('📧 Step 1: Ensuring test contact exists...');
    let contact = await prisma.contact.findUnique({
      where: { email: 'jeetnair.in@gmail.com' },
    });

    if (!contact) {
      // Get a user to associate with the contact
      const user = await prisma.user.findFirst();
      if (!user) {
        throw new Error('No user found in database. Please create a user first.');
      }

      contact = await prisma.contact.create({
        data: {
          email: 'jeetnair.in@gmail.com',
          firstName: 'Jeet',
          lastName: 'Nair',
          userId: user.id,
          status: 'LEAD',
        },
      });
      console.log('✓ Created test contact');
    } else {
      console.log('✓ Test contact already exists');
    }

    // Step 2: Create SMTP transporter
    console.log('\n📬 Step 2: Configuring email server...');

    // Get SMTP configuration from environment variables
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFromEmail = process.env.SMTP_FROM_EMAIL;
    const smtpFromName = process.env.SMTP_FROM_NAME || 'CRM System';

    if (!smtpUser || !smtpPass || !smtpFromEmail) {
      throw new Error('Missing SMTP credentials. Please set SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL in .env file');
    }

    console.log(`  Using SMTP: ${smtpHost}:${smtpPort}`);
    console.log(`  From: ${smtpFromName} <${smtpFromEmail}>`);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Test connection
    await transporter.verify();
    console.log('✓ SMTP connection verified');

    // Step 3: Create test campaign HTML
    console.log('\n📝 Step 3: Creating campaign content...');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 0; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { background: #ffffff; padding: 40px 20px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          h1 { margin: 0; font-size: 32px; }
          .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Test Campaign Email</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0; opacity: 0.9;">Welcome to our CRM System!</p>
          </div>

          <div class="content">
            <h2>Hello Jeet! 👋</h2>

            <p>This is a <span class="highlight">test email campaign</span> from your new CRM marketing automation system.</p>

            <p>This email demonstrates:</p>
            <ul>
              <li>✅ Email server configuration</li>
              <li>✅ Campaign creation and sending</li>
              <li>✅ HTML email templates</li>
              <li>✅ Personalization capabilities</li>
              <li>✅ Professional email design</li>
            </ul>

            <p>Your CRM system is now ready to:</p>
            <ul>
              <li>🚀 Send personalized email campaigns</li>
              <li>📊 Track opens, clicks, and conversions</li>
              <li>🎯 Target specific audiences</li>
              <li>🤖 Use AI-powered content generation</li>
              <li>📧 Manage multiple sending emails</li>
            </ul>

            <p style="text-align: center;">
              <a href="http://localhost:5173/campaigns" class="button">
                View Campaign Dashboard →
              </a>
            </p>

            <p>If you received this email, your email system is working perfectly! 🎊</p>

            <p>Best regards,<br>
            <strong>Your CRM System</strong></p>
          </div>

          <div class="footer">
            <p>This is a test email from your CRM Marketing Automation System</p>
            <p>Powered by AI • Built with ❤️</p>
            <p style="margin-top: 10px;">
              <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Step 4: Get or create campaign
    console.log('\n📋 Step 4: Creating campaign...');
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error('No user found');
    }

    let campaign = await prisma.campaign.findFirst({
      where: { name: 'Test Campaign - Welcome Email' },
    });

    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: {
          name: 'Test Campaign - Welcome Email',
          subject: '🎉 Welcome to Your CRM System - Test Email',
          htmlContent: htmlContent,
          textContent: 'Welcome to your CRM System! This is a test email.',
          status: 'DRAFT',
          userId: user.id,
        },
      });
      console.log('✓ Campaign created');
    } else {
      console.log('✓ Using existing campaign');
    }

    // Step 5: Send test email
    console.log('\n📤 Step 5: Sending email...');
    const info = await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: 'jeetnair.in@gmail.com',
      subject: '🎉 Welcome to Your CRM System - Test Email',
      html: htmlContent,
      text: 'Welcome to your CRM System! This is a test email.',
    });

    console.log('✓ Email sent successfully!');
    console.log('  Message ID:', info.messageId);

    // Step 6: Create email log
    console.log('\n📊 Step 6: Creating email log...');
    await prisma.emailLog.create({
      data: {
        campaignId: campaign.id,
        contactId: contact.id,
        status: 'SENT',
        sentAt: new Date(),
        fromEmail: smtpFromEmail,
        toEmail: 'jeetnair.in@gmail.com',
        messageId: info.messageId,
        serverUsed: `${smtpHost}:${smtpPort}`,
      },
    });
    console.log('✓ Email log created');

    // Step 7: Update campaign stats
    console.log('\n📈 Step 7: Updating campaign stats...');
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'SENT',
        totalSent: { increment: 1 },
        sentAt: new Date(),
      },
    });
    console.log('✓ Campaign stats updated');

    console.log('\n✅ Test email campaign completed successfully!');
    console.log('\n📧 Check jeetnair.in@gmail.com inbox for the test email.');
    console.log('\n🔗 View campaign in dashboard: http://localhost:5173/campaigns\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure .env file exists in the CRM Module root directory');
    console.error('   2. Add SMTP credentials to .env file:');
    console.error('      SMTP_HOST=smtp.gmail.com');
    console.error('      SMTP_PORT=587');
    console.error('      SMTP_SECURE=false');
    console.error('      SMTP_USER=your-email@gmail.com');
    console.error('      SMTP_PASS=your-16-char-app-password');
    console.error('      SMTP_FROM_EMAIL=your-email@gmail.com');
    console.error('      SMTP_FROM_NAME=CRM System');
    console.error('\n📚 Gmail App Password Guide:');
    console.error('   https://support.google.com/accounts/answer/185833');
    console.error('\n📖 Full Setup Guide:');
    console.error('   See SMTP_SETUP_GUIDE.md in the CRM Module directory\n');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
sendTestEmail();
