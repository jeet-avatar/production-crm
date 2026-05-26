"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticate);
const verificationCodes = new Map();
router.get('/', async (req, res, next) => {
    try {
        const servers = await prisma.emailServerConfig.findMany({
            where: { userId: req.user?.id },
            orderBy: { createdAt: 'desc' },
        });
        const sanitizedServers = servers.map(s => ({
            ...s,
            password: '********',
        }));
        return res.json({ servers: sanitizedServers });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { name, provider, host, port, secure, username, password, fromEmail, fromName, maxPerDay, maxPerHour, } = req.body;
        if (!name || !provider || !host || !port || !username || !password || !fromEmail) {
            return res.status(400).json({
                error: 'name, provider, host, port, username, password, and fromEmail are required',
            });
        }
        const encryptedPassword = Buffer.from(password).toString('base64');
        const server = await prisma.emailServerConfig.create({
            data: {
                userId: req.user.id,
                name,
                provider,
                host,
                port: Number.parseInt(port),
                secure: secure !== false,
                username,
                password: encryptedPassword,
                fromEmail,
                fromName,
                maxPerDay: maxPerDay ? Number.parseInt(maxPerDay) : null,
                maxPerHour: maxPerHour ? Number.parseInt(maxPerHour) : null,
                isActive: false,
                isVerified: false,
            },
        });
        return res.status(201).json({
            ...server,
            password: '********',
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/test', async (req, res, next) => {
    try {
        const { id } = req.params;
        const server = await prisma.emailServerConfig.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!server) {
            return res.status(404).json({ error: 'Email server not found' });
        }
        const decryptedPassword = Buffer.from(server.password, 'base64').toString();
        const transporter = nodemailer_1.default.createTransport({
            host: server.host,
            port: server.port,
            secure: server.secure,
            auth: {
                user: server.username,
                pass: decryptedPassword,
            },
        });
        try {
            await transporter.verify();
            await prisma.emailServerConfig.update({
                where: { id },
                data: { lastTested: new Date() },
            });
            return res.json({
                success: true,
                message: 'SMTP connection successful',
            });
        }
        catch (smtpError) {
            return res.status(400).json({
                success: false,
                error: 'SMTP connection failed',
                details: smtpError.message,
            });
        }
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/send-verification', async (req, res, next) => {
    try {
        const { id } = req.params;
        const server = await prisma.emailServerConfig.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!server) {
            return res.status(404).json({ error: 'Email server not found' });
        }
        const code = crypto_1.default.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        verificationCodes.set(id, { code, expiresAt });
        const decryptedPassword = Buffer.from(server.password, 'base64').toString();
        const transporter = nodemailer_1.default.createTransport({
            host: server.host,
            port: server.port,
            secure: server.secure,
            auth: {
                user: server.username,
                pass: decryptedPassword,
            },
        });
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { font-size: 32px; font-weight: bold; color: #667eea; background: white; padding: 20px; text-align: center; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Email Verification</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>You're setting up <strong>${server.fromEmail}</strong> as a sending email for campaigns in your CRM.</p>
            <p>Please enter this verification code to confirm:</p>
            <div class="code">${code}</div>
            <p><strong>This code expires in 15 minutes.</strong></p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>CRM Email Verification System</p>
          </div>
        </div>
      </body>
      </html>
    `;
        try {
            await transporter.sendMail({
                from: `"${server.fromName || 'CRM System'}" <${server.fromEmail}>`,
                to: server.fromEmail,
                subject: '🔐 Verify Your Email Address - CRM System',
                html: htmlContent,
            });
            return res.json({
                success: true,
                message: `Verification code sent to ${server.fromEmail}`,
                expiresAt,
            });
        }
        catch (emailError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to send verification email',
                details: emailError.message,
            });
        }
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/verify', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Verification code is required' });
        }
        const stored = verificationCodes.get(id);
        if (!stored) {
            return res.status(400).json({
                success: false,
                error: 'No verification code found. Please request a new code.',
            });
        }
        if (new Date() > stored.expiresAt) {
            verificationCodes.delete(id);
            return res.status(400).json({
                success: false,
                error: 'Verification code expired. Please request a new code.',
            });
        }
        if (stored.code !== code) {
            return res.status(400).json({
                success: false,
                error: 'Invalid verification code. Please try again.',
            });
        }
        await prisma.emailServerConfig.update({
            where: { id },
            data: {
                isVerified: true,
                isActive: true,
            },
        });
        verificationCodes.delete(id);
        return res.json({
            success: true,
            message: 'Email verified successfully! You can now use this email to send campaigns.',
        });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/verified', async (req, res, next) => {
    try {
        const servers = await prisma.emailServerConfig.findMany({
            where: {
                userId: req.user?.id,
                isVerified: true,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                fromEmail: true,
                fromName: true,
                provider: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ servers });
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.emailServerConfig.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Email server not found' });
        }
        await prisma.emailServerConfig.delete({
            where: { id },
        });
        return res.json({ success: true, message: 'Email server deleted' });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=emailServers.js.map