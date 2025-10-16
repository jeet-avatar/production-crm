"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        // Use existing Gmail SMTP configuration from .env
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        if (!smtpUser || !smtpPass) {
            throw new Error('Email credentials not configured. Please set SMTP_USER and SMTP_PASS in .env');
        }
        this.transporter = nodemailer_1.default.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use STARTTLS
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });
    }
    /**
     * Send email via SMTP
     * @param options - Email options including from, to, subject, body, etc.
     * @returns Email info with messageId
     */
    async sendEmail(options) {
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
            // Send email
            const info = await this.transporter.sendMail({
                from: options.from,
                to: options.to.join(', '),
                cc: options.cc?.join(', '),
                bcc: options.bcc?.join(', '),
                subject: options.subject,
                html: options.html,
                text: options.text || this.stripHtml(options.html),
                attachments: options.attachments,
            });
            return {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
                response: info.response,
                envelope: info.envelope,
            };
        }
        catch (error) {
            console.error('Email Service Error:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
    /**
     * Send email with template
     * @param options - Email options
     * @param templateVariables - Variables to replace in template
     */
    async sendTemplatedEmail(options, templateVariables) {
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
    async verifyConnection() {
        try {
            await this.transporter.verify();
            return true;
        }
        catch (error) {
            console.error('SMTP Connection Error:', error);
            return false;
        }
    }
    /**
     * Strip HTML tags from string
     * @param html - HTML string
     * @returns Plain text
     */
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }
    /**
     * Generate HTML email template
     * @param body - Email body content
     * @param title - Email title
     * @returns Formatted HTML email
     */
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
      <a href="http://brandmonkz.com">brandmonkz.com</a>
    </p>
  </div>
</body>
</html>
    `.trim();
    }
}
exports.EmailService = EmailService;
