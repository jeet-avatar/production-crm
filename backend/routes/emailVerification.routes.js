"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app_1 = require("../app");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const emailVerification_1 = require("../services/emailVerification");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * Get email verification service status
 */
router.get('/status', async (req, res) => {
    const provider = emailVerification_1.emailVerificationService.getProviderName();
    res.json({
        success: true,
        provider,
        available: true,
        message: provider === 'Basic'
            ? 'Using basic verification (syntax check only). Add HUNTER_API_KEY, ZEROBOUNCE_API_KEY, or ABSTRACTAPI_KEY for full verification.'
            : `Using ${provider} for email verification`
    });
});
/**
 * Verify a single email address
 */
router.post('/verify-email', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw new errorHandler_1.AppError('Email address is required', 400);
        }
        logger_1.logger.info(`Manual email verification requested: ${email}`);
        const result = await emailVerification_1.emailVerificationService.verifyEmail(email);
        res.json({
            success: true,
            result
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Verify a single contact by ID
 */
router.post('/contacts/:id/verify', async (req, res, next) => {
    try {
        const { id } = req.params;
        // Get contact and verify ownership
        const contact = await app_1.prisma.contact.findFirst({
            where: {
                id,
                userId: req.user?.id
            }
        });
        if (!contact) {
            throw new errorHandler_1.AppError('Contact not found', 404);
        }
        if (!contact.email) {
            throw new errorHandler_1.AppError('Contact has no email address', 400);
        }
        logger_1.logger.info(`Verifying contact: ${contact.email}`);
        // Verify email
        const result = await emailVerification_1.emailVerificationService.verifyEmail(contact.email);
        // Update contact with verification result
        const updatedContact = await app_1.prisma.contact.update({
            where: { id },
            data: {
                emailVerified: result.isValid,
                emailVerificationMethod: result.provider.toLowerCase(),
                emailVerificationScore: result.score,
                emailVerificationStatus: result.status,
                emailVerifiedAt: result.isValid ? new Date() : null,
                emailVerificationDetails: result,
            }
        });
        // Create audit log
        await app_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'EMAIL_VERIFIED',
                entityType: 'Contact',
                entityId: contact.id,
                metadata: {
                    email: contact.email,
                    result: result.status,
                    score: result.score,
                    provider: result.provider,
                }
            }
        });
        logger_1.logger.info(`Contact email verified: ${contact.email} - ${result.status} (${result.score}%)`);
        res.json({
            success: true,
            message: `Email ${result.status}: ${contact.email}`,
            contact: updatedContact,
            verification: result
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Bulk verify all unverified contacts for a company
 */
router.post('/companies/:id/verify-contacts', async (req, res, next) => {
    try {
        const { id } = req.params;
        // Verify company ownership
        const company = await app_1.prisma.company.findFirst({
            where: {
                id,
                userId: req.user?.id
            }
        });
        if (!company) {
            throw new errorHandler_1.AppError('Company not found', 404);
        }
        // Get all unverified contacts for this company
        const contacts = await app_1.prisma.contact.findMany({
            where: {
                companyId: id,
                userId: req.user?.id,
                emailVerified: false,
                email: {
                    not: null
                }
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
            }
        });
        if (contacts.length === 0) {
            return res.json({
                success: true,
                message: 'No unverified contacts to verify',
                stats: {
                    total: 0,
                    verified: 0,
                    invalid: 0,
                    risky: 0,
                    unknown: 0
                }
            });
        }
        logger_1.logger.info(`Starting bulk verification for ${contacts.length} contacts`);
        const emails = contacts.map(c => c.email);
        const results = await emailVerification_1.emailVerificationService.verifyBulk(emails, (completed, total) => {
            logger_1.logger.info(`Verification progress: ${completed}/${total}`);
        });
        // Update contacts with verification results
        let verified = 0;
        let invalid = 0;
        let risky = 0;
        let unknown = 0;
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const result = results[i];
            await app_1.prisma.contact.update({
                where: { id: contact.id },
                data: {
                    emailVerified: result.isValid,
                    emailVerificationMethod: result.provider.toLowerCase(),
                    emailVerificationScore: result.score,
                    emailVerificationStatus: result.status,
                    emailVerifiedAt: result.isValid ? new Date() : null,
                    emailVerificationDetails: result,
                }
            });
            // Count stats
            if (result.status === 'valid')
                verified++;
            else if (result.status === 'invalid')
                invalid++;
            else if (result.status === 'risky')
                risky++;
            else
                unknown++;
        }
        // Create audit log
        await app_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'BULK_EMAIL_VERIFICATION',
                entityType: 'Company',
                entityId: company.id,
                metadata: {
                    companyName: company.name,
                    totalContacts: contacts.length,
                    verified,
                    invalid,
                    risky,
                    unknown,
                    provider: emailVerification_1.emailVerificationService.getProviderName()
                }
            }
        });
        logger_1.logger.info(`Bulk verification complete: ${verified}/${contacts.length} verified`);
        res.json({
            success: true,
            message: `Verified ${contacts.length} contacts`,
            stats: {
                total: contacts.length,
                verified,
                invalid,
                risky,
                unknown,
                provider: emailVerification_1.emailVerificationService.getProviderName()
            },
            results: results.map((r, i) => ({
                email: r.email,
                contactName: `${contacts[i].firstName} ${contacts[i].lastName}`,
                status: r.status,
                score: r.score,
                reason: r.reason
            }))
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Bulk verify all unverified contacts (all companies)
 */
router.post('/verify-all-unverified', async (req, res, next) => {
    try {
        const { limit = 100 } = req.body; // Limit to prevent abuse
        // Get all unverified contacts for this user
        const contacts = await app_1.prisma.contact.findMany({
            where: {
                userId: req.user?.id,
                emailVerified: false,
                email: {
                    not: null
                }
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                companyId: true
            },
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        });
        if (contacts.length === 0) {
            return res.json({
                success: true,
                message: 'No unverified contacts found',
                stats: {
                    total: 0,
                    verified: 0,
                    invalid: 0,
                    risky: 0,
                    unknown: 0
                }
            });
        }
        logger_1.logger.info(`Starting bulk verification for ${contacts.length} contacts (user: ${req.user?.id})`);
        const emails = contacts.map(c => c.email);
        const results = await emailVerification_1.emailVerificationService.verifyBulk(emails, (completed, total) => {
            logger_1.logger.info(`Verification progress: ${completed}/${total}`);
        });
        // Update contacts with verification results
        let verified = 0;
        let invalid = 0;
        let risky = 0;
        let unknown = 0;
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const result = results[i];
            await app_1.prisma.contact.update({
                where: { id: contact.id },
                data: {
                    emailVerified: result.isValid,
                    emailVerificationMethod: result.provider.toLowerCase(),
                    emailVerificationScore: result.score,
                    emailVerificationStatus: result.status,
                    emailVerifiedAt: result.isValid ? new Date() : null,
                    emailVerificationDetails: result,
                }
            });
            // Count stats
            if (result.status === 'valid')
                verified++;
            else if (result.status === 'invalid')
                invalid++;
            else if (result.status === 'risky')
                risky++;
            else
                unknown++;
        }
        // Create audit log
        await app_1.prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'BULK_EMAIL_VERIFICATION',
                entityType: 'User',
                entityId: req.user.id,
                metadata: {
                    totalContacts: contacts.length,
                    verified,
                    invalid,
                    risky,
                    unknown,
                    provider: emailVerification_1.emailVerificationService.getProviderName()
                }
            }
        });
        logger_1.logger.info(`Bulk verification complete: ${verified}/${contacts.length} verified`);
        res.json({
            success: true,
            message: `Verified ${contacts.length} contacts`,
            stats: {
                total: contacts.length,
                verified,
                invalid,
                risky,
                unknown,
                provider: emailVerification_1.emailVerificationService.getProviderName()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
