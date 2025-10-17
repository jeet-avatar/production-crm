import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
  from?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

/**
 * Google Workspace SMTP Email Service
 * Uses support@brandmonkz.com for all outgoing emails
 * NO AWS SES dependency - production ready
 */
export class GoogleSMTPService {
  private transporter: Transporter;
  private readonly DEFAULT_FROM = 'support@brandmonkz.com';

  constructor() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      throw new Error(
        'Google Workspace SMTP credentials not configured. ' +
        'Please set SMTP_USER and SMTP_PASS environment variables.'
      );
    }

    console.log('✅ Initializing Google Workspace SMTP');
    console.log(`   Host: ${smtpHost}:${smtpPort}`);
    console.log(`   User: ${smtpUser}`);
    console.log(`   Default From: ${this.DEFAULT_FROM}`);

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // Use STARTTLS
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Send email via Google Workspace SMTP
   * @param options - Email options
   * @returns Email info with messageId
   */
  async sendEmail(options: EmailOptions) {
    try {
      // Validate email addresses
      if (!options.to || options.to.length === 0) {
        throw new Error('At least one recipient (to) is required');
      }

      if (!options.subject || options.subject.trim() === '') {
        throw new Error('Email subject is required');
      }

      if (!options.html && !options.text) {
        throw new Error('Email body (html or text) is required');
      }

      // Always use support@brandmonkz.com as sender
      const fromAddress = this.DEFAULT_FROM;

      // Send email
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
    } catch (error: any) {
      console.error('❌ Google SMTP Error:', error);
      throw new Error(`Failed to send email via Google SMTP: ${error.message}`);
    }
  }

  /**
   * Send email with template variables
   * @param options - Email options
   * @param templateVariables - Variables to replace in template
   */
  async sendTemplatedEmail(
    options: EmailOptions,
    templateVariables: Record<string, string>
  ) {
    // Replace variables in HTML content
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

  /**
   * Verify SMTP connection
   * @returns true if connection is successful
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Google Workspace SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ Google Workspace SMTP connection failed:', error);
      return false;
    }
  }

  /**
   * Strip HTML tags from string
   * @param html - HTML string
   * @returns Plain text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Generate 6-digit OTP code
   * @returns 6-digit numeric string
   */
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Calculate OTP expiry time (15 minutes from now)
   * @returns Date object for expiry time
   */
  static getOTPExpiry(): Date {
    return new Date(Date.now() + 15 * 60 * 1000);
  }

  /**
   * Generate HTML email template
   * @param body - Email body content
   * @param title - Email title
   * @returns Formatted HTML email
   */
  static generateHtmlTemplate(body: string, title?: string): string {
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

  /**
   * Send email verification with OTP
   * @param email - Recipient email
   * @param firstName - User's first name
   * @param otp - 6-digit OTP code
   * @returns Promise<boolean> - Success status
   */
  async sendVerificationEmail(email: string, firstName: string, otp: string): Promise<boolean> {
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
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetUrl: string,
    token: string
  ): Promise<boolean> {
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
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitationEmail(
    email: string,
    inviterName: string,
    teamName: string,
    inviteUrl: string
  ): Promise<boolean> {
    try {
      const htmlContent = GoogleSMTPService.generateHtmlTemplate(
        `
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> has invited you to join the team <strong>${teamName}</strong> on BrandMonkz CRM.</p>
        <p>Click the link below to accept the invitation and create your account:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; display: inline-block;">Accept Invitation</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; font-family: monospace; background: #f3f4f6; padding: 12px; border-radius: 4px;">${inviteUrl}</p>
        <p>This invitation link will expire in 7 days.</p>
        `,
        'Team Invitation'
      );

      await this.sendEmail({
        to: [email],
        subject: `${inviterName} invited you to ${teamName} on BrandMonkz CRM`,
        html: htmlContent,
      });

      console.log(`✅ Team invitation sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending team invitation:', error);
      return false;
    }
  }
}

// Export singleton instance
export const googleSMTPService = new GoogleSMTPService();

// Backward compatibility: Export as EmailService
export { GoogleSMTPService as EmailService };
export const emailService = googleSMTPService;
