"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../utils/logger");
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
            port: Number.parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'apikey',
                pass: process.env.SENDGRID_API_KEY,
            },
        });
    }
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: options.from || `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            };
            const result = await this.transporter.sendMail(mailOptions);
            logger_1.logger.info('Email sent successfully:', { messageId: result.messageId, to: options.to });
        }
        catch (error) {
            logger_1.logger.error('Failed to send email:', error);
            throw new Error('Failed to send email');
        }
    }
    async sendTemplateEmail(options) {
        logger_1.logger.info('Template email sending - to be implemented');
    }
    async sendBulkEmails(emails) {
        logger_1.logger.info('Bulk email sending - to be implemented');
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
//# sourceMappingURL=emailService.js.map