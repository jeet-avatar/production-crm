"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.post('/', async (req, res) => {
    try {
        const { email, reason, feedback, campaignId, contactId } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const existing = await prisma.emailUnsubscribe.findUnique({
            where: { email }
        });
        if (existing && existing.confirmed) {
            return res.status(200).json({
                message: 'This email is already unsubscribed',
                alreadyUnsubscribed: true
            });
        }
        const unsubscribe = await prisma.emailUnsubscribe.upsert({
            where: { email },
            update: {
                reason,
                feedback,
                campaignId,
                contactId,
                token,
                tokenExpiry,
                ipAddress,
                userAgent,
                confirmed: false
            },
            create: {
                email,
                reason,
                feedback,
                campaignId,
                contactId,
                token,
                tokenExpiry,
                ipAddress,
                userAgent,
                confirmed: false
            }
        });
        res.status(200).json({
            message: 'Unsubscribe request created',
            token: unsubscribe.token,
            email: unsubscribe.email
        });
    }
    catch (error) {
        console.error('Unsubscribe request error:', error);
        res.status(500).json({ error: 'Failed to process unsubscribe request' });
    }
});
router.get('/confirm/:token', async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        const unsubscribe = await prisma.emailUnsubscribe.findUnique({
            where: { token }
        });
        if (!unsubscribe) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }
        if (new Date() > unsubscribe.tokenExpiry) {
            return res.status(400).json({ error: 'Token has expired. Please submit a new unsubscribe request.' });
        }
        if (unsubscribe.confirmed) {
            return res.status(200).json({
                message: 'This email is already unsubscribed',
                email: unsubscribe.email,
                alreadyConfirmed: true
            });
        }
        await prisma.emailUnsubscribe.update({
            where: { token },
            data: { confirmed: true }
        });
        if (unsubscribe.contactId) {
            await prisma.contact.update({
                where: { id: unsubscribe.contactId },
                data: { isActive: false }
            });
        }
        await prisma.emailLog.updateMany({
            where: { toEmail: unsubscribe.email },
            data: { status: 'UNSUBSCRIBED' }
        });
        res.status(200).json({
            message: 'Successfully unsubscribed',
            email: unsubscribe.email,
            confirmed: true
        });
    }
    catch (error) {
        console.error('Unsubscribe confirmation error:', error);
        res.status(500).json({ error: 'Failed to confirm unsubscribe' });
    }
});
router.get('/check/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const unsubscribe = await prisma.emailUnsubscribe.findUnique({
            where: { email }
        });
        res.status(200).json({
            isUnsubscribed: unsubscribe?.confirmed || false,
            email
        });
    }
    catch (error) {
        console.error('Check unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to check unsubscribe status' });
    }
});
exports.default = router;
//# sourceMappingURL=unsubscribe.js.map