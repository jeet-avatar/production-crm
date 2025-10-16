"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const app_1 = require("../app");
const errorHandler_1 = require("../middleware/errorHandler");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
router.get('/verify-invite/:token', async (req, res, next) => {
    try {
        const { token } = req.params;
        if (!token) {
            throw new errorHandler_1.AppError('Invite token is required', 400);
        }
        const user = await app_1.prisma.user.findUnique({
            where: { inviteToken: token },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                inviteAccepted: true,
                invitedAt: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('Invalid invite token', 404);
        }
        if (user.inviteAccepted) {
            throw new errorHandler_1.AppError('Invitation already accepted', 400);
        }
        const invitedAt = new Date(user.invitedAt);
        const expiresAt = new Date(invitedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (new Date() > expiresAt) {
            throw new errorHandler_1.AppError('Invitation has expired', 400);
        }
        res.json({
            message: 'Valid invitation',
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/accept-invite', async (req, res, next) => {
    try {
        const { inviteToken, password } = req.body;
        if (!inviteToken || !password) {
            throw new errorHandler_1.AppError('Invite token and password are required', 400);
        }
        if (password.length < 8) {
            throw new errorHandler_1.AppError('Password must be at least 8 characters long', 400);
        }
        const user = await app_1.prisma.user.findUnique({
            where: { inviteToken },
        });
        if (!user) {
            throw new errorHandler_1.AppError('Invalid invite token', 400);
        }
        if (user.inviteAccepted) {
            throw new errorHandler_1.AppError('Invitation already accepted', 400);
        }
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(password, 10);
        const updatedUser = await app_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                inviteAccepted: true,
                acceptedAt: new Date(),
                inviteToken: null,
                requirePasswordChange: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                teamRole: true,
                inviteAccepted: true,
                acceptedAt: true,
            },
        });
        res.json({
            message: 'Invitation accepted successfully. Please log in with your new password.',
            user: updatedUser,
        });
    }
    catch (error) {
        next(error);
    }
});
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        if (req.user?.teamRole !== 'OWNER') {
            throw new errorHandler_1.AppError('Only account owners can view team members', 403);
        }
        const teamMembers = await app_1.prisma.user.findMany({
            where: {
                accountOwnerId: userId,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                teamRole: true,
                inviteAccepted: true,
                invitedAt: true,
                acceptedAt: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({
            teamMembers,
            count: teamMembers.length,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/invite', async (req, res, next) => {
    try {
        console.log('🎯 Team invite endpoint called');
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        if (req.user?.teamRole !== 'OWNER') {
            throw new errorHandler_1.AppError('Only account owners can invite team members', 403);
        }
        let { email, firstName, lastName } = req.body;
        email = email ? email.toLowerCase().trim() : email;
        console.log(`🎯 Inviting ${email} (${firstName} ${lastName})`);
        if (!email || !firstName || !lastName) {
            throw new errorHandler_1.AppError('Email, first name, and last name are required', 400);
        }
        console.log('🎯 Checking if user exists...');
        const existingUser = await app_1.prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
        });
        if (existingUser) {
            console.log('🎯 User already exists');
            throw new errorHandler_1.AppError('A user with this email already exists', 400);
        }
        console.log('🎯 Generating invite token...');
        const inviteToken = crypto_1.default.randomBytes(32).toString('hex');
        const tempPassword = crypto_1.default.randomBytes(16).toString('hex');
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        console.log('🎯 Creating new user in database...');
        const newUser = await app_1.prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                passwordHash,
                role: 'USER',
                teamRole: 'MEMBER',
                accountOwnerId: userId,
                invitedById: userId,
                inviteToken,
                inviteAccepted: false,
                invitedAt: new Date(),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                teamRole: true,
                inviteAccepted: true,
                invitedAt: true,
            },
        });
        console.log(`📧 Starting email invitation for ${email}...`);
        console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
        console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '***configured***' : 'NOT SET'}`);
        try {
            const { EmailService } = await Promise.resolve().then(() => __importStar(require('../services/email.service')));
            console.log('EmailService imported successfully');
            const emailService = new EmailService();
            console.log('EmailService instance created');
            const inviteUrl = `${process.env.FRONTEND_URL || 'https://brandmonkz.com'}/accept-invite?token=${inviteToken}`;
            const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>${req.user?.firstName || 'Your team lead'} has invited you to join their team on <strong>Brandmonkz CRM</strong>!</p>
              <p>Click the button below to accept the invitation and set up your password:</p>
              <p style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </p>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:<br>${inviteUrl}</p>
              <p><strong>This invitation will expire in 7 days.</strong></p>
              <p>Once you accept, you'll have access to:</p>
              <ul>
                <li>View and manage shared contacts and companies</li>
                <li>Collaborate on deals and activities</li>
                <li>Access team analytics and reports</li>
              </ul>
              <p>If you have any questions, please reach out to your team lead.</p>
            </div>
            <div class="footer">
              <p>© 2025 Brandmonkz CRM. All rights reserved.</p>
              <p>If you didn't expect this invitation, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;
            await emailService.sendEmail({
                from: process.env.SMTP_USER || 'noreply@brandmonkz.com',
                to: [email],
                subject: `You're invited to join ${req.user?.firstName || 'the'} team on Brandmonkz CRM`,
                html: emailHtml,
            });
            console.log(`✉️  Invitation email sent to ${email}`);
        }
        catch (emailError) {
            console.error('Failed to send invitation email:', emailError.message);
        }
        res.status(201).json({
            message: 'Team member invited successfully. An invitation email has been sent.',
            teamMember: newUser,
            inviteUrl: `${process.env.FRONTEND_URL || 'https://brandmonkz.com'}/accept-invite?token=${inviteToken}`,
        });
    }
    catch (error) {
        const fs = require('fs');
        fs.appendFileSync('/tmp/team-invite-error.log', `${new Date().toISOString()} - ERROR: ${error.message}\n${error.stack}\n\n`);
        console.error('🚨 Team invite error:', error.message, error.stack);
        next(error);
    }
});
router.delete('/:userId', async (req, res, next) => {
    try {
        const ownerId = req.user?.id;
        if (!ownerId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        if (req.user?.teamRole !== 'OWNER') {
            throw new errorHandler_1.AppError('Only account owners can remove team members', 403);
        }
        const { userId } = req.params;
        const teamMember = await app_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                accountOwnerId: true,
                teamRole: true,
            },
        });
        if (!teamMember) {
            throw new errorHandler_1.AppError('Team member not found', 404);
        }
        if (teamMember.accountOwnerId !== ownerId) {
            throw new errorHandler_1.AppError('You can only remove members from your own team', 403);
        }
        if (teamMember.teamRole === 'OWNER') {
            throw new errorHandler_1.AppError('Cannot remove account owners', 400);
        }
        await app_1.prisma.user.update({
            where: { id: userId },
            data: {
                isActive: false,
            },
        });
        res.json({
            message: 'Team member removed successfully',
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=team.js.map