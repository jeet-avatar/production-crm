"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const nodemailer_1 = __importDefault(require("nodemailer"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticateToken);
router.use(auth_1.requireSuperAdmin);
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;
        const templates = await prisma.emailTemplate.findMany({
            where: type ? { templateType: type } : undefined,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                subject: true,
                templateType: true,
                fromEmail: true,
                fromName: true,
                isActive: true,
                variables: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        res.json({ templates, total: templates.length });
    }
    catch (error) {
        console.error('Error fetching email templates:', error);
        res.status(500).json({ error: 'Failed to fetch email templates' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const template = await prisma.emailTemplate.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json({ template });
    }
    catch (error) {
        console.error('Error fetching email template:', error);
        res.status(500).json({ error: 'Failed to fetch email template' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, subject, htmlContent, textContent, variables, templateType, fromEmail, fromName, } = req.body;
        if (!name || !subject || !htmlContent) {
            return res.status(400).json({ error: 'Name, subject, and HTML content are required' });
        }
        const template = await prisma.emailTemplate.create({
            data: {
                name,
                subject,
                htmlContent,
                textContent: textContent || '',
                variables: variables || [],
                templateType: templateType || 'custom',
                fromEmail: fromEmail || 'support@brandmonkz.com',
                fromName: fromName || 'BrandMonkz',
                userId: req.user.id,
            },
        });
        res.status(201).json({ template, message: 'Email template created successfully' });
    }
    catch (error) {
        console.error('Error creating email template:', error);
        res.status(500).json({ error: 'Failed to create email template' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subject, htmlContent, textContent, variables, templateType, fromEmail, fromName, isActive, } = req.body;
        const template = await prisma.emailTemplate.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(subject && { subject }),
                ...(htmlContent && { htmlContent }),
                ...(textContent !== undefined && { textContent }),
                ...(variables && { variables }),
                ...(templateType && { templateType }),
                ...(fromEmail && { fromEmail }),
                ...(fromName && { fromName }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json({ template, message: 'Email template updated successfully' });
    }
    catch (error) {
        console.error('Error updating email template:', error);
        res.status(500).json({ error: 'Failed to update email template' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.emailTemplate.delete({
            where: { id },
        });
        res.json({ message: 'Email template deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting email template:', error);
        res.status(500).json({ error: 'Failed to delete email template' });
    }
});
router.post('/:id/send', async (req, res) => {
    try {
        const { id } = req.params;
        const { to, variables: replacementVars } = req.body;
        if (!to || !Array.isArray(to) || to.length === 0) {
            return res.status(400).json({ error: 'Recipient email(s) required' });
        }
        const template = await prisma.emailTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        let htmlContent = template.htmlContent;
        let textContent = template.textContent || '';
        let subject = template.subject;
        if (replacementVars) {
            Object.keys(replacementVars).forEach((key) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                htmlContent = htmlContent.replace(regex, replacementVars[key]);
                textContent = textContent.replace(regex, replacementVars[key]);
                subject = subject.replace(regex, replacementVars[key]);
            });
        }
        const results = [];
        for (const recipient of to) {
            try {
                await transporter.sendMail({
                    from: `${template.fromName} <${template.fromEmail}>`,
                    to: recipient,
                    subject,
                    html: htmlContent,
                    text: textContent,
                });
                results.push({ email: recipient, status: 'sent' });
                try {
                    await prisma.emailLog.create({
                        data: {
                            toEmail: recipient,
                            fromEmail: template.fromEmail,
                            status: 'SENT',
                            sentAt: new Date(),
                            metadata: {
                                subject,
                                templateId: template.id
                            },
                        },
                    });
                }
                catch (logError) {
                }
            }
            catch (error) {
                console.error(`Failed to send email to ${recipient}:`, error);
                results.push({ email: recipient, status: 'failed', error: error.message });
            }
        }
        const successCount = results.filter((r) => r.status === 'sent').length;
        const failCount = results.filter((r) => r.status === 'failed').length;
        res.json({
            message: `Sent ${successCount} email(s), ${failCount} failed`,
            results,
            successCount,
            failCount,
        });
    }
    catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});
router.post('/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        const { testEmail, variables: replacementVars } = req.body;
        if (!testEmail) {
            return res.status(400).json({ error: 'Test email address required' });
        }
        const template = await prisma.emailTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        let htmlContent = template.htmlContent;
        let textContent = template.textContent || '';
        let subject = `[TEST] ${template.subject}`;
        if (replacementVars) {
            Object.keys(replacementVars).forEach((key) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                htmlContent = htmlContent.replace(regex, replacementVars[key]);
                textContent = textContent.replace(regex, replacementVars[key]);
                subject = subject.replace(regex, replacementVars[key]);
            });
        }
        await transporter.sendMail({
            from: `${template.fromName} <${template.fromEmail}>`,
            to: testEmail,
            subject,
            html: htmlContent,
            text: textContent,
        });
        res.json({ message: 'Test email sent successfully' });
    }
    catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});
exports.default = router;
//# sourceMappingURL=email-templates.js.map