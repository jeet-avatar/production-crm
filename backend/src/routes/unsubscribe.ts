import express from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/unsubscribe - Request unsubscribe (step 1)
router.post('/', async (req, res) => {
  try {
    const { email, reason, feedback, campaignId, contactId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Get IP and user agent
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Check if already unsubscribed
    const existing = await prisma.emailUnsubscribe.findUnique({
      where: { email }
    });

    if (existing && existing.confirmed) {
      return res.status(200).json({
        message: 'This email is already unsubscribed',
        alreadyUnsubscribed: true
      });
    }

    // Create or update unsubscribe request
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
  } catch (error) {
    console.error('Unsubscribe request error:', error);
    res.status(500).json({ error: 'Failed to process unsubscribe request' });
  }
});

// GET /api/unsubscribe/confirm/:token - Confirm unsubscribe (step 2)
router.get('/confirm/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find unsubscribe request
    const unsubscribe = await prisma.emailUnsubscribe.findUnique({
      where: { token }
    });

    if (!unsubscribe) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    // Check if token expired
    if (new Date() > unsubscribe.tokenExpiry) {
      return res.status(400).json({ error: 'Token has expired. Please submit a new unsubscribe request.' });
    }

    // Check if already confirmed
    if (unsubscribe.confirmed) {
      return res.status(200).json({
        message: 'This email is already unsubscribed',
        email: unsubscribe.email,
        alreadyConfirmed: true
      });
    }

    // Confirm unsubscribe
    await prisma.emailUnsubscribe.update({
      where: { token },
      data: { confirmed: true }
    });

    // Update contact status if exists
    if (unsubscribe.contactId) {
      await prisma.contact.update({
        where: { id: unsubscribe.contactId },
        data: { isActive: false }
      });
    }

    // Update email logs
    await prisma.emailLog.updateMany({
      where: { toEmail: unsubscribe.email },
      data: { status: 'UNSUBSCRIBED' }
    });

    res.status(200).json({
      message: 'Successfully unsubscribed',
      email: unsubscribe.email,
      confirmed: true
    });
  } catch (error) {
    console.error('Unsubscribe confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm unsubscribe' });
  }
});

// GET /api/unsubscribe/check/:email - Check if email is unsubscribed
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
  } catch (error) {
    console.error('Check unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to check unsubscribe status' });
  }
});

export default router;
