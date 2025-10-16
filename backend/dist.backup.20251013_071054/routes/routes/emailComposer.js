"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const app_1 = require("../app");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Get all email drafts
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const emails = await app_1.prisma.emailComposer.findMany({
            where: { userId },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ emails });
    }
    catch (error) {
        next(error);
    }
});
// Get email by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const email = await app_1.prisma.emailComposer.findFirst({
            where: { id, userId },
            include: {
                contact: true,
            },
        });
        if (!email) {
            throw new errorHandler_1.AppError('Email not found', 404);
        }
        res.json({ email });
    }
    catch (error) {
        next(error);
    }
});
// Create or save draft
router.post('/', [
    (0, express_validator_1.body)('subject').notEmpty().withMessage('Subject is required'),
    (0, express_validator_1.body)('htmlBody').notEmpty().withMessage('Email body is required'),
    (0, express_validator_1.body)('toEmails').isArray().notEmpty().withMessage('At least one recipient is required'),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.AppError('Validation failed', 400);
        }
        const userId = req.user.id;
        const { subject, htmlBody, textBody, toEmails, ccEmails = [], bccEmails = [], attachments, contactId, scheduledAt, } = req.body;
        const email = await app_1.prisma.emailComposer.create({
            data: {
                userId,
                contactId,
                subject,
                htmlBody,
                textBody,
                toEmails,
                ccEmails,
                bccEmails,
                attachments,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                isDraft: true,
                isSent: false,
            },
            include: {
                contact: true,
            },
        });
        logger_1.logger.info(`Email draft created: ${email.id}`);
        res.status(201).json({
            message: 'Email draft saved',
            email,
        });
    }
    catch (error) {
        next(error);
    }
});
// Update email draft
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const existingEmail = await app_1.prisma.emailComposer.findFirst({
            where: { id, userId },
        });
        if (!existingEmail) {
            throw new errorHandler_1.AppError('Email not found', 404);
        }
        if (existingEmail.isSent) {
            throw new errorHandler_1.AppError('Cannot edit sent email', 400);
        }
        const { subject, htmlBody, textBody, toEmails, ccEmails, bccEmails, attachments, scheduledAt, } = req.body;
        const email = await app_1.prisma.emailComposer.update({
            where: { id },
            data: {
                subject,
                htmlBody,
                textBody,
                toEmails,
                ccEmails,
                bccEmails,
                attachments,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            },
            include: {
                contact: true,
            },
        });
        logger_1.logger.info(`Email draft updated: ${email.id}`);
        res.json({
            message: 'Email draft updated',
            email,
        });
    }
    catch (error) {
        next(error);
    }
});
// Send email
router.post('/:id/send', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const email = await app_1.prisma.emailComposer.findFirst({
            where: { id, userId },
        });
        if (!email) {
            throw new errorHandler_1.AppError('Email not found', 404);
        }
        if (email.isSent) {
            throw new errorHandler_1.AppError('Email already sent', 400);
        }
        // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
        // For now, we'll just mark it as sent
        const sentEmail = await app_1.prisma.emailComposer.update({
            where: { id },
            data: {
                isDraft: false,
                isSent: true,
                sentAt: new Date(),
            },
            include: {
                contact: true,
            },
        });
        logger_1.logger.info(`Email sent: ${sentEmail.id} to ${sentEmail.toEmails.join(', ')}`);
        res.json({
            message: 'Email sent successfully',
            email: sentEmail,
        });
    }
    catch (error) {
        next(error);
    }
});
// Delete email
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const email = await app_1.prisma.emailComposer.findFirst({
            where: { id, userId },
        });
        if (!email) {
            throw new errorHandler_1.AppError('Email not found', 404);
        }
        await app_1.prisma.emailComposer.delete({
            where: { id },
        });
        logger_1.logger.info(`Email deleted: ${id}`);
        res.json({ message: 'Email deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
