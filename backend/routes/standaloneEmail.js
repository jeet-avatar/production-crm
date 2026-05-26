"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const nodemailer_1 = require("nodemailer");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Send standalone email with optional tracking
router.post('/send', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { to, cc, bcc, subject, html, text, tracking } = req.body;
        const userId = req.user.id;
        // Validate required fields
        if (!to || !Array.isArray(to) || to.length === 0) {
            return res.status(400).json({ error: 'Recipient email(s) required' });
        }
        if (!subject || !html) {
            return res.status(400).json({ error: 'Subject and HTML content required' });
        }
        // Create SMTP transporter
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        // Send email
        const result = yield transporter.sendMail({
            from: `${process.env.SMTP_FROM_NAME || 'CRM System'} <${process.env.SMTP_FROM_EMAIL}>`,
            to: to.join(', '),
            cc: cc === null || cc === void 0 ? void 0 : cc.join(', '),
            bcc: bcc === null || bcc === void 0 ? void 0 : bcc.join(', '),
            subject,
            html,
            text,
        });
        // Track if tracking info provided
        if (tracking) {
            yield prisma.standaloneEmailLog.create({
                data: {
                    fromEmail: process.env.SMTP_FROM_EMAIL,
                    fromName: process.env.SMTP_FROM_NAME || 'CRM System',
                    toEmail: to[0],
                    ccEmails: cc || [],
                    bccEmails: bcc || [],
                    subject,
                    htmlContent: html,
                    textContent: text || '',
                    videoUrl: tracking.videoUrl,
                    videoName: tracking.videoName,
                    videoCampaignId: tracking.videoCampaignId,
                    status: 'SENT',
                    sentAt: new Date(),
                    messageId: result.messageId,
                    userId,
                    metadata: {
                        provider: 'nodemailer',
                        response: result.response,
                    },
                },
            });
            console.log('✅ Email sent and tracked successfully');
        }
        else {
            console.log('✅ Email sent (no tracking)');
        }
        res.json({
            success: true,
            message: 'Email sent successfully',
            messageId: result.messageId
        });
    }
    catch (error) {
        console.error('❌ Error sending standalone email:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Get all sent emails for current user
router.get('/list', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0, status, hasVideo, } = req.query;
        const where = { userId };
        if (status) {
            where.status = status;
        }
        if (hasVideo === 'true') {
            where.videoUrl = { not: null };
        }
        const [emails, total] = yield Promise.all([
            prisma.standaloneEmailLog.findMany({
                where,
                orderBy: { sentAt: 'desc' },
                take: Number(limit),
                skip: Number(offset),
            }),
            prisma.standaloneEmailLog.count({ where }),
        ]);
        res.json({
            success: true,
            emails,
            total,
            limit: Number(limit),
            offset: Number(offset),
        });
    }
    catch (error) {
        console.error('❌ Error fetching sent emails:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Get single email details
router.get('/:id', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const email = yield prisma.standaloneEmailLog.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!email) {
            return res.status(404).json({ error: 'Email not found' });
        }
        res.json({ success: true, email });
    }
    catch (error) {
        console.error('❌ Error fetching email:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Get analytics summary for sent emails
router.get('/analytics/summary', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const [totalSent, totalWithVideo, totalOpens, totalClicks] = yield Promise.all([
            prisma.standaloneEmailLog.count({
                where: { userId, status: 'SENT' }
            }),
            prisma.standaloneEmailLog.count({
                where: { userId, videoUrl: { not: null } }
            }),
            prisma.standaloneEmailLog.aggregate({
                where: { userId },
                _sum: { totalOpens: true },
            }),
            prisma.standaloneEmailLog.aggregate({
                where: { userId },
                _sum: { totalClicks: true },
            }),
        ]);
        res.json({
            success: true,
            analytics: {
                totalSent,
                totalWithVideo,
                totalOpens: (totalOpens._sum.totalOpens) || 0,
                totalClicks: (totalClicks._sum.totalClicks) || 0,
            },
        });
    }
    catch (error) {
        console.error('❌ Error fetching analytics:', error);
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
