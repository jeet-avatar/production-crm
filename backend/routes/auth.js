"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../utils/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const app_1 = require("../app");
const logger_1 = require("../utils/logger");
const passport_1 = __importDefault(require("../config/passport"));
const router = (0, express_1.Router)();
const validateRegistration = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
];
const validateLogin = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 1 }).withMessage('Password is required'),
];
router.post('/register', validateRegistration, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.AppError('Validation failed', 400);
        }
        const { email, password, firstName, lastName, role = 'USER' } = req.body;
        const existingUser = await app_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new errorHandler_1.AppError('User already exists with this email', 409);
        }
        const passwordHash = await auth_1.AuthUtils.hashPassword(password);
        const user = await app_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName,
                lastName,
                role,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });
        const token = auth_1.AuthUtils.generateToken(user);
        logger_1.logger.info(`New user registered: ${email}`);
        res.status(201).json({
            message: 'User registered successfully',
            user,
            token,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/login', validateLogin, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.AppError('Validation failed', 400);
        }
        const { email, password } = req.body;
        const user = await app_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new errorHandler_1.AppError('Invalid credentials', 401);
        }
        if (!user.isActive) {
            throw new errorHandler_1.AppError('Account is deactivated', 401);
        }
        const isValidPassword = await auth_1.AuthUtils.comparePassword(password, user.passwordHash);
        if (!isValidPassword) {
            throw new errorHandler_1.AppError('Invalid credentials', 401);
        }
        await app_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const token = auth_1.AuthUtils.generateToken(user);
        logger_1.logger.info(`User logged in: ${email}`);
        const requirePasswordChange = user.requirePasswordChange || false;
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                teamRole: user.teamRole,
                isActive: user.isActive,
                createdAt: user.createdAt.toISOString(),
            },
            token,
            requirePasswordChange,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await app_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            res.json({
                message: 'If an account with that email exists, a password reset link has been sent.',
            });
            return;
        }
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
        await app_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpiry: resetExpiry,
            },
        });
        const EmailService = require('../services/email.service').EmailService;
        const emailService = new EmailService();
        const resetUrl = `${process.env.FRONTEND_URL || 'https://brandmonkz.com'}/reset-password?token=${resetToken}`;
        await emailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl, resetToken);
        logger_1.logger.info(`Password reset email sent to: ${email}`);
        res.json({
            message: 'If an account with that email exists, a password reset link has been sent.',
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            throw new errorHandler_1.AppError('Token and password are required', 400);
        }
        if (password.length < 8) {
            throw new errorHandler_1.AppError('Password must be at least 8 characters long', 400);
        }
        const user = await app_1.prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpiry: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('Invalid or expired reset token', 400);
        }
        const passwordHash = await auth_1.AuthUtils.hashPassword(password);
        await app_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpiry: null,
            },
        });
        logger_1.logger.info(`Password reset successful for: ${user.email}`);
        res.json({
            message: 'Password reset successfully',
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/refresh', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = auth_1.AuthUtils.extractTokenFromHeader(authHeader);
        if (!token) {
            throw new errorHandler_1.AppError('Token is required', 401);
        }
        const payload = auth_1.AuthUtils.verifyToken(token);
        const user = await app_1.prisma.user.findUnique({
            where: { id: payload.userId },
        });
        if (!user || !user.isActive) {
            throw new errorHandler_1.AppError('Invalid token', 401);
        }
        const newToken = auth_1.AuthUtils.generateToken(user);
        res.json({
            message: 'Token refreshed successfully',
            token: newToken,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/change-password', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = auth_1.AuthUtils.extractTokenFromHeader(authHeader);
        if (!token) {
            throw new errorHandler_1.AppError('Authentication required', 401);
        }
        const payload = auth_1.AuthUtils.verifyToken(token);
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            throw new errorHandler_1.AppError('Current password and new password are required', 400);
        }
        if (newPassword.length < 8) {
            throw new errorHandler_1.AppError('New password must be at least 8 characters long', 400);
        }
        const user = await app_1.prisma.user.findUnique({
            where: { id: payload.userId },
        });
        if (!user || !user.isActive) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        const isValidPassword = await auth_1.AuthUtils.comparePassword(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            throw new errorHandler_1.AppError('Current password is incorrect', 401);
        }
        const newPasswordHash = await auth_1.AuthUtils.hashPassword(newPassword);
        await app_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newPasswordHash,
                requirePasswordChange: false,
            },
        });
        logger_1.logger.info(`Password changed for user: ${user.email}`);
        res.json({
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/verify-email', async (req, res, next) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) {
            throw new errorHandler_1.AppError('Email and verification code are required', 400);
        }
        const user = await app_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        if (user.emailVerified) {
            throw new errorHandler_1.AppError('Email already verified', 400);
        }
        if (user.verificationToken !== token) {
            throw new errorHandler_1.AppError('Invalid verification code', 400);
        }
        if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
            throw new errorHandler_1.AppError('Verification code expired. Please request a new one.', 400);
        }
        await app_1.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
                verificationTokenExpiry: null,
            },
        });
        const jwtToken = auth_1.AuthUtils.generateToken(user);
        logger_1.logger.info(`Email verified for user: ${email}`);
        res.json({
            success: true,
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                emailVerified: true,
            },
            message: 'Email verified successfully',
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/resend-verification', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw new errorHandler_1.AppError('Email is required', 400);
        }
        const user = await app_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        if (user.emailVerified) {
            throw new errorHandler_1.AppError('Email already verified', 400);
        }
        const { EmailService } = require('../services/email.service');
        const emailService = new EmailService();
        const otp = EmailService.generateOTP();
        const otpExpiry = EmailService.getOTPExpiry();
        await app_1.prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken: otp,
                verificationTokenExpiry: otpExpiry,
            },
        });
        await emailService.sendVerificationEmail(email, user.firstName, otp);
        logger_1.logger.info(`Verification code resent to: ${email}`);
        res.json({
            success: true,
            message: 'New verification code sent',
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
}));
router.get('/google/callback', passport_1.default.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`
}), async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new errorHandler_1.AppError('Authentication failed', 401);
        }
        const token = auth_1.AuthUtils.generateToken(user);
        if (!process.env.FRONTEND_URL) {
            throw new errorHandler_1.AppError('FRONTEND_URL environment variable is required', 500);
        }
        const frontendUrl = process.env.FRONTEND_URL;
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        }))}`);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map