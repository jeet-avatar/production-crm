"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_TYPES = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const app_1 = require("../app");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
const SUPER_ADMIN_EMAIL = 'ethan@brandmonkz.com';
const requireSuperAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await app_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (!user || user.email !== SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ error: 'Access denied - Super admin only' });
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
router.use(auth_1.authenticate);
router.use(requireSuperAdmin);
exports.TEMPLATE_TYPES = {
    WELCOME: 'welcome',
    SUBSCRIPTION_UPGRADE: 'subscription_upgrade',
    SUBSCRIPTION_DOWNGRADE: 'subscription_downgrade',
    SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
    SUBSCRIPTION_PAYMENT_FAILED: 'subscription_payment_failed',
    SUBSCRIPTION_TRIAL_ENDING: 'subscription_trial_ending',
    PASSWORD_RESET: 'password_reset',
    EMAIL_VERIFICATION: 'email_verification',
    TEAM_INVITATION: 'team_invitation',
    NOTIFICATION: 'notification',
    CUSTOM: 'custom',
};
router.get('/', async (req, res, next) => {
    try {
        const { type } = req.query;
        const where = type ? { type: type } : {};
        const templates = await app_1.prisma.systemEmailTemplate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                type: true,
                subject: true,
                htmlContent: true,
                textContent: true,
                variables: true,
                fromEmail: true,
                fromName: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json({ templates });
    }
    catch (error) {
        next(error);
    }
});
router.get('/types', async (req, res) => {
    const types = Object.entries(exports.TEMPLATE_TYPES).map(([key, value]) => ({
        key,
        value,
        label: key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
    }));
    res.json({ types });
});
router.get('/verified-emails', async (req, res, next) => {
    try {
        const verifiedEmails = [
            {
                email: process.env.SES_FROM_EMAIL || 'noreply@brandmonkz.com',
                name: process.env.SES_FROM_NAME || 'BrandMonkz',
                isDefault: true,
            },
            {
                email: process.env.SMTP_FROM_EMAIL || 'support@brandmonkz.com',
                name: 'BrandMonkz Support',
                isDefault: false,
            },
        ];
        res.json({ emails: verifiedEmails });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await app_1.prisma.systemEmailTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json({ template });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { name, type, subject, htmlContent, textContent, variables, fromEmail, fromName, isActive, } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Template name is required' });
        }
        if (!type || !type.trim()) {
            return res.status(400).json({ error: 'Template type is required' });
        }
        if (!subject || !subject.trim()) {
            return res.status(400).json({ error: 'Email subject is required' });
        }
        if (!htmlContent || !htmlContent.trim()) {
            return res.status(400).json({ error: 'Email content is required' });
        }
        if (!fromEmail || !fromEmail.trim()) {
            return res.status(400).json({ error: 'From email is required' });
        }
        if (type !== exports.TEMPLATE_TYPES.CUSTOM) {
            const existing = await app_1.prisma.systemEmailTemplate.findFirst({
                where: { type },
            });
            if (existing) {
                return res.status(400).json({
                    error: `A template for type "${type}" already exists. Please edit the existing template or use a different type.`,
                });
            }
        }
        const template = await app_1.prisma.systemEmailTemplate.create({
            data: {
                name: name.trim(),
                type: type.trim(),
                subject: subject.trim(),
                htmlContent: htmlContent.trim(),
                textContent: textContent?.trim() || null,
                variables: variables || [],
                fromEmail: fromEmail.trim(),
                fromName: fromName?.trim() || null,
                isActive: isActive !== undefined ? isActive : true,
            },
        });
        res.status(201).json({
            message: 'System template created successfully',
            template,
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, type, subject, htmlContent, textContent, variables, fromEmail, fromName, isActive, } = req.body;
        const existingTemplate = await app_1.prisma.systemEmailTemplate.findUnique({
            where: { id },
        });
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template not found' });
        }
        if (name !== undefined && (!name || !name.trim())) {
            return res.status(400).json({ error: 'Template name cannot be empty' });
        }
        if (subject !== undefined && (!subject || !subject.trim())) {
            return res.status(400).json({ error: 'Email subject cannot be empty' });
        }
        if (htmlContent !== undefined && (!htmlContent || !htmlContent.trim())) {
            return res.status(400).json({ error: 'Email content cannot be empty' });
        }
        if (fromEmail !== undefined && (!fromEmail || !fromEmail.trim())) {
            return res.status(400).json({ error: 'From email cannot be empty' });
        }
        if (type && type !== existingTemplate.type && type !== exports.TEMPLATE_TYPES.CUSTOM) {
            const duplicate = await app_1.prisma.systemEmailTemplate.findFirst({
                where: {
                    type,
                    id: { not: id },
                },
            });
            if (duplicate) {
                return res.status(400).json({
                    error: `A template for type "${type}" already exists.`,
                });
            }
        }
        const template = await app_1.prisma.systemEmailTemplate.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(type !== undefined && { type: type.trim() }),
                ...(subject !== undefined && { subject: subject.trim() }),
                ...(htmlContent !== undefined && { htmlContent: htmlContent.trim() }),
                ...(textContent !== undefined && { textContent: textContent?.trim() || null }),
                ...(variables !== undefined && { variables }),
                ...(fromEmail !== undefined && { fromEmail: fromEmail.trim() }),
                ...(fromName !== undefined && { fromName: fromName?.trim() || null }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json({
            message: 'System template updated successfully',
            template,
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existingTemplate = await app_1.prisma.systemEmailTemplate.findUnique({
            where: { id },
        });
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template not found' });
        }
        await app_1.prisma.systemEmailTemplate.delete({
            where: { id },
        });
        res.json({ message: 'System template deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/test', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { testEmail, variables } = req.body;
        const template = await app_1.prisma.systemEmailTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        if (!testEmail) {
            return res.status(400).json({ error: 'Test email address is required' });
        }
        const emailService = new email_service_1.EmailService();
        const fromName = template.fromName || 'BrandMonkz';
        const result = await emailService.sendTemplatedEmail({
            from: `${fromName} <${template.fromEmail}>`,
            to: [testEmail],
            subject: `[TEST] ${template.subject}`,
            html: template.htmlContent,
            text: template.textContent || undefined,
        }, variables || {});
        res.json({
            message: `Test email sent to ${testEmail}`,
            messageId: result.messageId,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/duplicate', async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await app_1.prisma.systemEmailTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        const duplicate = await app_1.prisma.systemEmailTemplate.create({
            data: {
                name: `${template.name} (Copy)`,
                type: exports.TEMPLATE_TYPES.CUSTOM,
                subject: template.subject,
                htmlContent: template.htmlContent,
                textContent: template.textContent,
                variables: template.variables,
                fromEmail: template.fromEmail,
                fromName: template.fromName,
                isActive: false,
            },
        });
        res.status(201).json({
            message: 'Template duplicated successfully',
            template: duplicate,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=systemTemplates.js.map