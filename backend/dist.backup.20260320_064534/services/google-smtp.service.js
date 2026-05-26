"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = exports.googleSMTPService = exports.GoogleSMTPService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class GoogleSMTPService {
    constructor() {
        this.DEFAULT_FROM = 'support@brandmonkz.com';
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        if (!smtpUser || !smtpPass) {
            throw new Error('Google Workspace SMTP credentials not configured. ' +
                'Please set SMTP_USER and SMTP_PASS environment variables.');
        }
        console.log('✅ Initializing Google Workspace SMTP');
        console.log(`   Host: ${smtpHost}:${smtpPort}`);
        console.log(`   User: ${smtpUser}`);
        console.log(`   Default From: ${this.DEFAULT_FROM}`);
        this.transporter = nodemailer_1.default.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: false,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });
    }
    async sendEmail(options) {
        try {
            if (!options.to || options.to.length === 0) {
                throw new Error('At least one recipient (to) is required');
            }
            if (!options.subject || options.subject.trim() === '') {
                throw new Error('Email subject is required');
            }
            if (!options.html && !options.text) {
                throw new Error('Email body (html or text) is required');
            }
            const fromAddress = this.DEFAULT_FROM;
            const info = await this.transporter.sendMail({
                from: fromAddress,
                to: options.to.join(', '),
                cc: options.cc?.join(', '),
                bcc: options.bcc?.join(', '),
                subject: options.subject,
                html: options.html,
                text: options.text || this.stripHtml(options.html),
                attachments: options.attachments,
            });
            console.log(`✅ Email sent via Google SMTP to ${options.to.join(', ')}`);
            console.log(`   Message ID: ${info.messageId}`);
            return {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
                response: info.response,
                envelope: info.envelope,
            };
        }
        catch (error) {
            console.error('❌ Google SMTP Error:', error);
            throw new Error(`Failed to send email via Google SMTP: ${error.message}`);
        }
    }
    async sendTemplatedEmail(options, templateVariables) {
        let html = options.html;
        for (const [key, value] of Object.entries(templateVariables)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            html = html.replace(regex, value);
        }
        return this.sendEmail({
            ...options,
            html,
        });
    }
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Google Workspace SMTP connection verified');
            return true;
        }
        catch (error) {
            console.error('❌ Google Workspace SMTP connection failed:', error);
            return false;
        }
    }
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    static generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    static getOTPExpiry() {
        return new Date(Date.now() + 15 * 60 * 1000);
    }
    static generateHtmlTemplate(body, title) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Email from BrandMonkz CRM'}</title>
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
      padding: 30px 20px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      padding: 30px 20px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .footer {
      background: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-radius: 0 0 10px 10px;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">${title || 'BrandMonkz CRM'}</h1>
  </div>
  <div class="content">
    ${body}
  </div>
  <div class="footer">
    <p style="margin: 0;">Sent from BrandMonkz CRM</p>
    <p style="margin: 5px 0 0 0;">
      <a href="https://brandmonkz.com">brandmonkz.com</a>
    </p>
  </div>
</body>
</html>
    `.trim();
    }
    async sendVerificationEmail(email, firstName, otp) {
        try {
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .otp { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; letter-spacing: 8px; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Email Verification</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Thank you for signing up for BrandMonkz CRM! Please use the code below to verify your email address:</p>
      <div class="otp">${otp}</div>
      <p><strong>This code expires in 15 minutes.</strong></p>
      <p>If you didn't create an account with BrandMonkz, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BrandMonkz CRM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;
            await this.sendEmail({
                to: [email],
                subject: 'Verify your BrandMonkz CRM account',
                html: htmlContent,
                text: `Hi ${firstName},\n\nThank you for signing up for BrandMonkz CRM! Your verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you didn't create an account, please ignore this email.`,
            });
            console.log(`✅ Verification email sent to ${email}`);
            return true;
        }
        catch (error) {
            console.error('❌ Error sending verification email:', error);
            return false;
        }
    }
    async sendPasswordResetEmail(email, firstName, resetUrl, token) {
        try {
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .token { font-family: monospace; background: #f3f4f6; padding: 12px; border-radius: 4px; font-size: 14px; word-break: break-all; margin: 15px 0; border-left: 4px solid #667eea; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>We received a request to reset your password for your BrandMonkz CRM account. Click the button below to reset your password:</p>

      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>

      <p>Or copy and paste this link into your browser:</p>
      <div class="token">${resetUrl}</div>

      <div class="warning">
        <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.
      </div>

      <p><strong>If you didn't request a password reset</strong>, you can safely ignore this email. Your password will not be changed.</p>

      <p>For security reasons, we recommend:</p>
      <ul>
        <li>Use a strong, unique password</li>
        <li>Don't share your password with anyone</li>
        <li>Enable two-factor authentication</li>
      </ul>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BrandMonkz CRM. All rights reserved.</p>
      <p>If you need help, contact us at support@brandmonkz.com</p>
    </div>
  </div>
</body>
</html>
      `;
            const textContent = `
Hi ${firstName},

We received a request to reset your password for your BrandMonkz CRM account.

Click this link to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

© ${new Date().getFullYear()} BrandMonkz CRM. All rights reserved.
      `;
            await this.sendEmail({
                to: [email],
                subject: 'Reset your BrandMonkz CRM password',
                html: htmlContent,
                text: textContent,
            });
            console.log(`✅ Password reset email sent to ${email}`);
            return true;
        }
        catch (error) {
            console.error('❌ Error sending password reset email:', error);
            return false;
        }
    }
    async sendTeamInvitationEmail(email, inviterName, teamName, inviteUrl) {
        try {
            const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to BrandMonkz!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">

          <!-- Hero Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 48px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 12px 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">🎉 You're Invited!</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 18px; font-weight: 500;">Join ${teamName} on BrandMonkz CRM</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <!-- Personalized Greeting -->
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0;">
                Hi there! 👋
              </p>

              <p style="font-size: 16px; line-height: 1.7; color: #4a5568; margin: 0 0 32px 0;">
                <strong style="color: #667eea;">${inviterName}</strong> has invited you to collaborate on <strong>${teamName}</strong>.
                You're about to experience a whole new way to manage customer relationships!
              </p>

              <!-- Value Proposition Card -->
              <div style="background: linear-gradient(135deg, #f6f8fb 0%, #f0f4f8 100%); border-left: 4px solid #FF6B35; padding: 24px; margin: 32px 0; border-radius: 8px;">
                <h3 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">🚀 What You'll Get:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4a5568; line-height: 2;">
                  <li><strong>Smart Contact Management</strong> – Organize customers effortlessly</li>
                  <li><strong>Video Campaigns</strong> – Create engaging AI-powered videos</li>
                  <li><strong>Email Automation</strong> – Save time with intelligent workflows</li>
                  <li><strong>Real-time Analytics</strong> – Track performance at a glance</li>
                  <li><strong>Team Collaboration</strong> – Work together seamlessly</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" style="background: linear-gradient(135deg, #FF6B35 0%, #f54d23 100%); color: white; text-decoration: none; padding: 18px 48px; border-radius: 12px; font-weight: 700; font-size: 18px; display: inline-block; box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4); transition: transform 0.2s;">
                  Accept Invitation →
                </a>
              </div>

              <p style="font-size: 14px; color: #718096; text-align: center; margin: 24px 0 0 0;">
                Or copy this link to your browser:
              </p>
              <div style="background: #f7fafc; border: 2px dashed #e2e8f0; padding: 16px; border-radius: 8px; margin: 12px 0 32px 0; text-align: center;">
                <a href="${inviteUrl}" style="color: #667eea; word-break: break-all; font-size: 13px; text-decoration: none;">${inviteUrl}</a>
              </div>

              <!-- Urgency Note -->
              <div style="background: #fff8e1; border-left: 4px solid #ffd54f; padding: 16px 20px; margin: 32px 0; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⏰ Act Fast!</strong> This invitation expires in <strong>7 days</strong>. Don't miss out!
                </p>
              </div>

              <!-- Social Proof / Trust -->
              <p style="font-size: 15px; line-height: 1.7; color: #4a5568; margin: 32px 0 0 0; text-align: center;">
                Join thousands of teams already using BrandMonkz to grow their business. <br>
                <strong style="color: #667eea;">Start collaborating today!</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #718096; text-align: center;">
                <strong style="color: #1a1a1a;">BrandMonkz CRM</strong><br>
                Empowering teams to build better customer relationships
              </p>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #a0aec0; text-align: center;">
                Need help? Contact us at <a href="mailto:support@brandmonkz.com" style="color: #667eea; text-decoration: none;">support@brandmonkz.com</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 11px; color: #cbd5e0; text-align: center;">
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
            const textContent = `
🎉 You're Invited to ${teamName}!

Hi there!

${inviterName} has invited you to collaborate on ${teamName} using BrandMonkz CRM.

What You'll Get:
• Smart Contact Management – Organize customers effortlessly
• Video Campaigns – Create engaging AI-powered videos
• Email Automation – Save time with intelligent workflows
• Real-time Analytics – Track performance at a glance
• Team Collaboration – Work together seamlessly

Accept your invitation now:
${inviteUrl}

⏰ This invitation expires in 7 days.

Join thousands of teams already using BrandMonkz to grow their business!

Need help? Contact us at support@brandmonkz.com

© ${new Date().getFullYear()} BrandMonkz. All rights reserved.
      `;
            await this.sendEmail({
                to: [email],
                subject: `🎉 ${inviterName} invited you to ${teamName}!`,
                html: htmlContent,
                text: textContent,
            });
            console.log(`✅ Team invitation sent to ${email}`);
            return true;
        }
        catch (error) {
            console.error('❌ Error sending team invitation:', error);
            return false;
        }
    }
}
exports.GoogleSMTPService = GoogleSMTPService;
exports.EmailService = GoogleSMTPService;
exports.googleSMTPService = new GoogleSMTPService();
exports.emailService = exports.googleSMTPService;
//# sourceMappingURL=google-smtp.service.js.map