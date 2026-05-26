import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function sendTestEmailWithTracking() {
  console.log('🚀 Starting test email campaign with analytics tracking...\n');

  try {
    // Step 1: Check if test contact exists
    console.log('📧 Step 1: Ensuring test contact exists...');
    let contact = await prisma.contact.findUnique({
      where: { email: 'raj.manohran@gmail.com' },
    });

    if (!contact) {
      const user = await prisma.user.findFirst();
      if (!user) {
        throw new Error('No user found in database. Please create a user first.');
      }

      contact = await prisma.contact.create({
        data: {
          email: 'raj.manohran@gmail.com',
          firstName: 'Raj',
          lastName: 'Manohran',
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

    await transporter.verify();
    console.log('✓ SMTP connection verified');

    // Step 3: Get or create campaign
    console.log('\n📋 Step 3: Creating campaign...');
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error('No user found');
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: 'Test Campaign - Analytics Tracking',
        subject: '🎯 Your CRM Now Has Advanced Email Analytics!',
        htmlContent: '', // Will be filled below
        textContent: 'Your CRM system now tracks email opens, clicks, read time, and more!',
        status: 'DRAFT',
        userId: user.id,
      },
    });
    console.log('✓ Campaign created');

    // Step 4: Create EmailLog entry FIRST (to get ID for tracking)
    console.log('\n📊 Step 4: Creating email log entry...');
    const emailLog = await prisma.emailLog.create({
      data: {
        campaignId: campaign.id,
        contactId: contact.id,
        status: 'PENDING',
        fromEmail: smtpFromEmail,
        toEmail: 'raj.manohran@gmail.com',
        serverUsed: `${smtpHost}:${smtpPort}`,
      },
    });
    console.log('✓ Email log created with ID:', emailLog.id);

    // Step 5: Build HTML with tracking pixel and tracked links
    console.log('\n🎨 Step 5: Building email with tracking...');
    
    const trackingPixelUrl = `http://localhost:3000/api/tracking/open/${emailLog.id}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 0; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { background: #ffffff; padding: 40px 20px; }
          .feature { background: #f8f9fa; padding: 20px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 5px; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          h1 { margin: 0; font-size: 32px; }
          h2 { color: #667eea; }
          .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; }
          .metric { display: inline-block; background: #e0e7ff; padding: 10px 20px; margin: 5px; border-radius: 5px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Advanced Email Analytics</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0; opacity: 0.9;">Real-time tracking is now live!</p>
          </div>

          <div class="content">
            <h2>Hello Raj! 👋</h2>

            <p>Great news! Your CRM system now has <span class="highlight">enterprise-grade email analytics</span> with real-time tracking capabilities.</p>

            <div class="feature">
              <h3>📈 What We're Tracking Right Now:</h3>
              <ul>
                <li><strong>Open Tracking:</strong> When you opened this email and how many times</li>
                <li><strong>Read Duration:</strong> How long you spend reading</li>
                <li><strong>Click Tracking:</strong> Which links you click</li>
                <li><strong>Device Detection:</strong> Mobile, tablet, or desktop</li>
                <li><strong>Email Client:</strong> Gmail, Outlook, Apple Mail, etc.</li>
                <li><strong>Browser & OS:</strong> Chrome, Safari, Windows, macOS, etc.</li>
                <li><strong>Geographic Location:</strong> Based on IP address</li>
                <li><strong>Engagement Score:</strong> Automatic 0-100 scoring</li>
              </ul>
            </div>

            <h3>🎯 Key Metrics You Can Track:</h3>
            
            <div style="text-align: center; margin: 20px 0;">
              <span class="metric">📧 Open Rate</span>
              <span class="metric">🖱️ Click Rate</span>
              <span class="metric">⏱️ Read Time</span>
              <span class="metric">📱 Device Type</span>
              <span class="metric">🌍 Location</span>
              <span class="metric">💯 Engagement Score</span>
            </div>

            <div class="feature">
              <h3>✨ Analytics Features:</h3>
              <ul>
                <li>Real-time tracking dashboard</li>
                <li>Individual recipient analytics</li>
                <li>Link-level click tracking</li>
                <li>Time-based engagement graphs</li>
                <li>Device and email client breakdown</li>
                <li>Engagement scoring algorithm</li>
                <li>Campaign comparison reports</li>
              </ul>
            </div>

            <p>Click the button below to test link tracking:</p>

            <p style="text-align: center;">
              <a href="http://localhost:5173/campaigns?email=${emailLog.id}" class="button">
                📊 View Analytics Dashboard →
              </a>
            </p>

            <p><strong>Try these test links to see click tracking in action:</strong></p>
            <ul>
              <li><a href="http://localhost:5173/campaigns?email=${emailLog.id}">Campaign Dashboard</a></li>
              <li><a href="http://localhost:5173/contacts?email=${emailLog.id}">View Contacts</a></li>
              <li><a href="https://github.com">External Link Test</a></li>
            </ul>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>🔬 This Email is Being Tracked!</strong></p>
              <p style="margin: 5px 0 0 0; font-size: 14px;">We're collecting analytics right now as you read this. Check the dashboard to see your engagement score!</p>
            </div>

            <p>Best regards,<br>
            <strong>Your CRM Analytics System</strong></p>
          </div>

          <div class="footer">
            <p>This is a test email demonstrating advanced analytics tracking</p>
            <p>Powered by AI • Built with ❤️ • Real-time Analytics</p>
            <p style="margin-top: 10px;">
              <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
            </p>
          </div>
        </div>
        
        <!-- Invisible 1x1 tracking pixel -->
        <img src="${trackingPixelUrl}" alt="" width="1" height="1" style="display:block; border:0;" />
      </body>
      </html>
    `;

    console.log('✓ Email HTML built with tracking pixel');

    // Update campaign with HTML content
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { htmlContent },
    });

    // Step 6: Send email
    console.log('\n📤 Step 6: Sending tracked email...');
    const info = await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: 'raj.manohran@gmail.com',
      subject: '🎯 Your CRM Now Has Advanced Email Analytics!',
      html: htmlContent,
      text: 'Your CRM system now tracks email opens, clicks, read time, and more!',
    });

    console.log('✓ Email sent successfully!');
    console.log('  Message ID:', info.messageId);
    console.log('  Tracking ID:', emailLog.id);

    // Step 7: Update email log
    console.log('\n📊 Step 7: Updating email log...');
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        messageId: info.messageId,
      },
    });
    console.log('✓ Email log updated');

    // Step 8: Update campaign stats
    console.log('\n📈 Step 8: Updating campaign stats...');
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'SENT',
        totalSent: 1,
        sentAt: new Date(),
      },
    });
    console.log('✓ Campaign stats updated');

    console.log('\n✅ Test email with analytics tracking sent successfully!');
    console.log('\n📧 Check raj.manohran@gmail.com inbox for the test email.');
    console.log('\n📊 Email Analytics:');
    console.log(`   - Email Log ID: ${emailLog.id}`);
    console.log(`   - Tracking Pixel URL: ${trackingPixelUrl}`);
    console.log(`   - Campaign ID: ${campaign.id}`);
    console.log('\n🔗 View analytics: http://localhost:3000/api/tracking/analytics/' + campaign.id);
    console.log('🔗 View events: http://localhost:3000/api/tracking/events/' + emailLog.id);
    console.log('\n💡 When the email is opened, the tracking pixel will automatically log:');
    console.log('   ✓ Open timestamp');
    console.log('   ✓ Device type (mobile/desktop)');
    console.log('   ✓ Email client (Gmail/Outlook/etc)');
    console.log('   ✓ Browser and OS');
    console.log('   ✓ IP address and location');
    console.log('   ✓ Engagement score calculation\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure .env file exists in the CRM Module root directory');
    console.error('   2. Verify SMTP credentials are correct');
    console.error('   3. Ensure backend server is running on port 3000');
  } finally {
    await prisma.$disconnect();
  }
}

sendTestEmailWithTracking();
