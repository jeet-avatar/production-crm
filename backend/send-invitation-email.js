#!/usr/bin/env node

/**
 * Send Team Invitation Email
 *
 * Usage: node send-invitation-email.js <email> <firstName> <lastName> <inviteToken>
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendInvitationEmail(email, firstName, lastName, inviteToken) {
  try {
    console.log('📧 Sending invitation email...');
    console.log(`To: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Token: ${inviteToken}`);

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Create acceptance URL
    const acceptUrl = `https://brandmonkz.com/accept-invite?token=${inviteToken}`;

    // Email HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - BrandMonkz CRM</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">You're Invited! 🎉</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Join the BrandMonkz CRM Team</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi <strong>${firstName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                You've been invited to join the <strong>BrandMonkz CRM</strong> team! This powerful platform will help you manage contacts, companies, deals, and campaigns with your team.
              </p>

              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 0 0 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #333333; font-size: 15px; font-weight: 600;">What you'll get access to:</p>
                <ul style="margin: 0; padding-left: 20px; color: #555555; font-size: 15px; line-height: 1.8;">
                  <li>Contact & Company Management</li>
                  <li>Deal Pipeline & Sales Tracking</li>
                  <li>Activity & Task Management</li>
                  <li>Email Campaigns & Analytics</li>
                  <li>AI-powered Company Enrichment</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 18px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(102,126,234,0.4);">
                      Accept Invitation & Set Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px 0; color: #667eea; font-size: 13px; line-height: 1.4; text-align: center; word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">
                ${acceptUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">

              <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px; line-height: 1.6;">
                <strong>Security Note:</strong> This invitation link is unique to you and expires in 7 days. Don't share it with anyone.
              </p>

              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; font-weight: 600;">
                BrandMonkz CRM
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                © ${new Date().getFullYear()} BrandMonkz. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: `🎉 You're invited to join BrandMonkz CRM - ${firstName}!`,
      html: html,
      text: `Hi ${firstName},\n\nYou've been invited to join BrandMonkz CRM!\n\nAccept your invitation here:\n${acceptUrl}\n\nThis invitation is unique to you and expires in 7 days.\n\nBest regards,\nBrandMonkz CRM Team`,
    });

    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);

  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

// Parse command line arguments
const [email, firstName, lastName, inviteToken] = process.argv.slice(2);

if (!email || !firstName || !lastName || !inviteToken) {
  console.error('Usage: node send-invitation-email.js <email> <firstName> <lastName> <inviteToken>');
  process.exit(1);
}

sendInvitationEmail(email, firstName, lastName, inviteToken)
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  });
