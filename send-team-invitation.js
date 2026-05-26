#!/usr/bin/env node

/**
 * Send Team Invitation Email
 * Fetches invitation details and sends professional email to invited user
 */

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
require('dotenv').config();

const prisma = new PrismaClient();

const INVITATION_TOKEN = '9b1fc32eea1104cc417050d777d664414f3041ae8c908b582692b8de93d78b6d';

async function sendInvitationEmail() {
  try {
    console.log('\n🔍 Fetching invitation details...\n');

    // Find the invited user by token
    const invitedUser = await prisma.user.findUnique({
      where: { inviteToken: INVITATION_TOKEN },
      include: {
        invitedBy: true, // Get the person who invited them
      },
    });

    if (!invitedUser) {
      console.error('❌ No user found with this invitation token');
      process.exit(1);
    }

    console.log('📧 Invited User Details:');
    console.log(`   Name: ${invitedUser.firstName} ${invitedUser.lastName}`);
    console.log(`   Email: ${invitedUser.email}`);
    console.log(`   Role: ${invitedUser.teamRole}`);
    console.log(`   Invited By: ${invitedUser.invitedBy?.firstName} ${invitedUser.invitedBy?.lastName}`);
    console.log(`   Invited At: ${invitedUser.invitedAt}`);
    console.log('');

    // Get account owner for company name
    const accountOwner = await prisma.user.findUnique({
      where: { id: invitedUser.accountOwnerId || invitedUser.invitedById || '' },
    });

    const companyName = 'BrandMonkz CRM';
    const inviterName = invitedUser.invitedBy
      ? `${invitedUser.invitedBy.firstName} ${invitedUser.invitedBy.lastName}`
      : 'Your team';

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
      },
    });

    // Generate acceptance URL
    const acceptUrl = `https://brandmonkz.com/accept-invite?token=${INVITATION_TOKEN}`;

    // Create professional HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
      border-radius: 12px 12px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      background: #ffffff;
      padding: 40px 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #111827;
    }
    .message {
      font-size: 15px;
      color: #4b5563;
      margin-bottom: 30px;
      line-height: 1.7;
    }
    .invite-box {
      background: #f9fafb;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 25px;
      text-align: center;
      margin: 30px 0;
    }
    .invite-box h3 {
      margin: 0 0 15px 0;
      color: #374151;
      font-size: 16px;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 14px 40px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(102, 126, 234, 0.35);
    }
    .features {
      margin: 30px 0;
      padding: 0;
    }
    .feature {
      display: flex;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    .feature-icon {
      background: #eef2ff;
      color: #667eea;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 18px;
      flex-shrink: 0;
    }
    .feature-text {
      font-size: 14px;
      color: #4b5563;
      padding-top: 4px;
    }
    .alternative-link {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 15px;
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
      word-break: break-all;
    }
    .alternative-link strong {
      display: block;
      margin-bottom: 8px;
      color: #374151;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-radius: 0 0 12px 12px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .footer p {
      margin: 5px 0;
      font-size: 13px;
      color: #6b7280;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .security-note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 25px 0;
      border-radius: 4px;
      font-size: 13px;
      color: #92400e;
    }
    .security-note strong {
      display: block;
      margin-bottom: 5px;
      color: #78350f;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 You're Invited!</h1>
    <p>Join ${inviterName} on ${companyName}</p>
  </div>

  <div class="content">
    <div class="greeting">Hi ${invitedUser.firstName}! 👋</div>

    <div class="message">
      <strong>${inviterName}</strong> has invited you to join their team on <strong>${companyName}</strong>.
      You'll have access to powerful CRM tools to manage contacts, companies, deals, and email campaigns together.
    </div>

    <div class="invite-box">
      <h3>Your Role: ${invitedUser.teamRole === 'OWNER' ? '👑 Account Owner' : '👤 Team Member'}</h3>
      <a href="${acceptUrl}" class="cta-button">Accept Invitation & Get Started</a>
    </div>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">📊</div>
        <div class="feature-text"><strong>Manage Contacts & Companies</strong> - Organize your sales pipeline and track relationships</div>
      </div>
      <div class="feature">
        <div class="feature-icon">💼</div>
        <div class="feature-text"><strong>Track Deals & Revenue</strong> - Monitor opportunities and close more deals</div>
      </div>
      <div class="feature">
        <div class="feature-icon">📧</div>
        <div class="feature-text"><strong>Email Campaigns</strong> - Send targeted campaigns and track engagement</div>
      </div>
      <div class="feature">
        <div class="feature-icon">🤖</div>
        <div class="feature-text"><strong>AI-Powered Enrichment</strong> - Automatically enrich company and contact data</div>
      </div>
      <div class="feature">
        <div class="feature-icon">👥</div>
        <div class="feature-text"><strong>Team Collaboration</strong> - Work together with shared access to CRM data</div>
      </div>
    </div>

    <div class="security-note">
      <strong>🔒 Secure Signup Options</strong>
      When you accept this invitation, you can choose to:
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Sign up with your Google account (quick and secure)</li>
        <li>Create a password (you'll be asked to change it on first login)</li>
      </ul>
    </div>

    <div class="alternative-link">
      <strong>Can't click the button? Copy and paste this link:</strong>
      ${acceptUrl}
    </div>
  </div>

  <div class="footer">
    <p><strong>${companyName}</strong></p>
    <p>This invitation was sent to ${invitedUser.email}</p>
    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    <p style="margin-top: 15px;">
      <a href="https://brandmonkz.com">Visit Website</a> •
      <a href="mailto:${process.env.SMTP_USER}">Contact Support</a>
    </p>
    <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
      © ${new Date().getFullYear()} ${companyName}. All rights reserved.
    </p>
  </div>
</body>
</html>
    `;

    const textContent = `
Hi ${invitedUser.firstName}! 👋

${inviterName} has invited you to join their team on ${companyName}.

Your Role: ${invitedUser.teamRole === 'OWNER' ? 'Account Owner' : 'Team Member'}

Accept your invitation and get started:
${acceptUrl}

What you'll get access to:
• Manage Contacts & Companies - Organize your sales pipeline
• Track Deals & Revenue - Monitor opportunities
• Email Campaigns - Send targeted campaigns
• AI-Powered Enrichment - Automatically enrich data
• Team Collaboration - Work together seamlessly

This invitation was sent to ${invitedUser.email}. If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
    `;

    console.log('📤 Sending invitation email...\n');

    // Send email
    const info = await transporter.sendMail({
      from: `"${companyName}" <${process.env.SMTP_USER}>`,
      to: invitedUser.email,
      subject: `${inviterName} invited you to join ${companyName}! 🎉`,
      text: textContent,
      html: htmlContent,
    });

    console.log('✅ Invitation email sent successfully!');
    console.log('');
    console.log('📧 Email Details:');
    console.log(`   To: ${invitedUser.email}`);
    console.log(`   Subject: ${inviterName} invited you to join ${companyName}! 🎉`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log('');
    console.log('🔗 Acceptance URL:');
    console.log(`   ${acceptUrl}`);
    console.log('');
    console.log('✨ The invited user can now:');
    console.log('   1. Check their email');
    console.log('   2. Click "Accept Invitation & Get Started"');
    console.log('   3. Choose signup method (Google OAuth or Password)');
    console.log('   4. Access the CRM immediately');
    console.log('');

  } catch (error) {
    console.error('❌ Error sending invitation email:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
sendInvitationEmail();
