import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function sendTestEmails() {
  const recipients = [
    { email: 'jeetnair.in@gmail.com', firstName: 'Jeet', lastName: 'Nair' },
    { email: 'sharang@techcloudpro.com', firstName: 'Sharang', lastName: 'TechCloud' },
    { email: 'kedar@techcloudpro.com', firstName: 'Kedar', lastName: 'TechCloud' }
  ];

  // Get or create campaign
  let campaign = await prisma.campaign.findFirst({
    where: { name: 'Test Campaign - Analytics Tracking' }
  });

  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        name: 'Test Campaign - Analytics Tracking',
        subject: '🎯 Your CRM Now Has Advanced Email Analytics!',
        htmlContent: '<p>Email analytics tracking test</p>',
        status: 'SENT',
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        sentAt: new Date(),
        userId: 'demo-user-id'
      }
    });
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFromEmail = process.env.SMTP_FROM_EMAIL!;
  const smtpFromName = process.env.SMTP_FROM_NAME || 'CRM System';

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  for (const recipient of recipients) {
    // Get or create contact
    let contact = await prisma.contact.findUnique({
      where: { email: recipient.email }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          email: recipient.email,
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          status: 'LEAD',
          userId: 'demo-user-id'
        }
      });
    }

    // Create EmailLog entry
    const emailLog = await prisma.emailLog.create({
      data: {
        campaignId: campaign.id,
        contactId: contact.id,
        status: 'PENDING',
        fromEmail: smtpFromEmail,
        toEmail: recipient.email,
        serverUsed: `${smtpHost}:${smtpPort}`,
      },
    });

    const trackingPixelUrl = `http://localhost:3000/api/tracking/open/${emailLog.id}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
          .cta { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Advanced Email Analytics</h1>
            <p>Your CRM just got a major upgrade!</p>
          </div>

          <div class="content">
            <p>Hi <strong>${recipient.firstName}</strong>,</p>

            <p>We're excited to announce that your CRM now includes <strong>powerful email analytics tracking</strong>!</p>

            <div class="feature">
              <h3>✨ What's New:</h3>
              <ul>
                <li>📧 Real-time email open tracking</li>
                <li>🖱️ Click tracking on all links</li>
                <li>📱 Device & browser detection</li>
                <li>🌍 Geographic location tracking</li>
                <li>📊 Engagement scoring (0-100)</li>
                <li>⏱️ Read time analytics</li>
              </ul>
            </div>

            <div class="feature">
              <h3>🎯 How It Works:</h3>
              <p>Every email sent through your CRM now includes intelligent tracking pixels that capture detailed engagement metrics. You'll know exactly:</p>
              <ul>
                <li>When recipients open your emails</li>
                <li>What device they're using</li>
                <li>Which email client they prefer</li>
                <li>Where they're located</li>
                <li>How engaged they are with your content</li>
              </ul>
            </div>

            <a href="http://localhost:5173/campaigns/${campaign.id}/analytics" class="cta">
              View Analytics Dashboard →
            </a>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              This is a test email to demonstrate the tracking capabilities. The analytics dashboard will update in real-time as you read this email!
            </p>
          </div>
        </div>

        <!-- Invisible 1x1 tracking pixel -->
        <img src="${trackingPixelUrl}" alt="" width="1" height="1" style="display:block; border:0;" />
      </body>
      </html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: recipient.email,
      subject: campaign.subject,
      html: htmlContent,
    });

    // Update email log
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        messageId: info.messageId,
      },
    });

    // Update campaign stats
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { totalSent: { increment: 1 } },
    });

    console.log(`✅ Email sent to ${recipient.email}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Email Log ID: ${emailLog.id}`);
    console.log(`   Tracking URL: ${trackingPixelUrl}`);
    console.log('');
  }

  console.log(`\n✨ All emails sent successfully!`);
  console.log(`Campaign ID: ${campaign.id}`);
  console.log(`Analytics URL: http://localhost:5173/campaigns/${campaign.id}/analytics`);

  await prisma.$disconnect();
}

sendTestEmails().catch(console.error);
