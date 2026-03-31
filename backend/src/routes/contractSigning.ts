import crypto from 'crypto';
import express, { Router } from 'express';
import { PrismaClient, ContractStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  sendOtpEmail,
  sendClientSignedNotification,
} from '../services/contractEmailService';

const router = Router();
const prisma = new PrismaClient();

// Allow up to 1 MB body for base64 signature data
router.use(express.json({ limit: '1mb' }));

// ─── In-memory OTP rate limiter ───────────────────────────────────────────────
// Maps contractId → array of request timestamps (prunes automatically)
const otpRateLimitMap = new Map<string, number[]>();
const OTP_RATE_LIMIT_MAX = 3;
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isOtpRateLimited(contractId: string): boolean {
  const now = Date.now();
  const windowStart = now - OTP_RATE_WINDOW_MS;
  const timestamps = (otpRateLimitMap.get(contractId) ?? []).filter(t => t > windowStart);
  if (timestamps.length >= OTP_RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  otpRateLimitMap.set(contractId, timestamps);
  return false;
}

// ─── Email masking helper ─────────────────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.charAt(0) + '***';
  return `${masked}@${domain}`;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET!;

// ─── GET /:token — retrieve contract info for signing page ───────────────────
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { signingToken: token },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status === ContractStatus.VOIDED || contract.status === ContractStatus.SIGNED) {
      return res.status(410).json({ error: `Contract is ${contract.status.toLowerCase()}` });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Signing link has expired' });
    }

    const senderName = contract.user
      ? `${contract.user.firstName} ${contract.user.lastName}`.trim()
      : 'TechCloudPro';

    // Only include content if OTP has been verified (status past SENT_FOR_SIGNATURE)
    const pastSent =
      contract.status !== ContractStatus.DRAFT &&
      contract.status !== ContractStatus.SENT_FOR_SIGNATURE;

    return res.json({
      id: contract.id,
      title: contract.title,
      contractType: 'Service Agreement',
      senderName,
      signerName: contract.signerName,
      signerEmail: contract.signerEmail ? maskEmail(contract.signerEmail) : null,
      status: contract.status,
      expiresAt: contract.tokenExpiresAt,
      ...(pastSent ? { content: contract.content } : {}),
    });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /:token/request-otp — send OTP to signer ───────────────────────────
router.post('/:token/request-otp', async (req, res, next) => {
  try {
    const { token } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { signingToken: token },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status === ContractStatus.VOIDED || contract.status === ContractStatus.SIGNED) {
      return res.status(410).json({ error: `Contract is ${contract.status.toLowerCase()}` });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Signing link has expired' });
    }

    if (!contract.signerEmail || !contract.signerName) {
      return res.status(400).json({ error: 'Contract is missing signer information' });
    }

    // Rate limit: 3 OTP requests per hour per contract
    if (isOtpRateLimited(contract.id)) {
      return res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
    }

    // Generate 6-digit OTP
    const otpCode = String(crypto.randomInt(100000, 999999));
    const hashedCode = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.contractOTP.create({
      data: {
        contractId: contract.id,
        email: contract.signerEmail,
        code: hashedCode,
        expiresAt,
      },
    });

    sendOtpEmail({
      to: contract.signerEmail,
      clientName: contract.signerName,
      otp: otpCode,
      contractTitle: contract.title,
      expiresInMinutes: 10,
    }).catch((err: any) => console.error('Failed to send OTP email:', err.message));

    return res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /:token/verify-otp — verify OTP, return session token ──────────────
router.post('/:token/verify-otp', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { otp } = req.body as { otp?: string };

    if (!otp) {
      return res.status(400).json({ error: 'otp is required' });
    }

    const contract = await prisma.contract.findUnique({
      where: { signingToken: token },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status === ContractStatus.VOIDED || contract.status === ContractStatus.SIGNED) {
      return res.status(410).json({ error: `Contract is ${contract.status.toLowerCase()}` });
    }

    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Signing link has expired' });
    }

    // Find the latest non-expired, non-verified OTP
    const otpRecord = await prisma.contractOTP.findFirst({
      where: {
        contractId: contract.id,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'No valid OTP found. Please request a new one.' });
    }

    // Increment attempt count
    await prisma.contractOTP.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    // Max 5 attempts
    if (otpRecord.attempts + 1 >= 5) {
      // Invalidate the OTP by expiring it
      await prisma.contractOTP.update({
        where: { id: otpRecord.id },
        data: { expiresAt: new Date() },
      });
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.code);

    if (!isValid) {
      const remaining = 5 - (otpRecord.attempts + 1);
      return res.status(400).json({ error: `Invalid OTP. ${remaining} attempt(s) remaining.` });
    }

    // Mark OTP as verified
    await prisma.contractOTP.update({
      where: { id: otpRecord.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verifiedIp: req.ip || null,
      },
    });

    // Transition to VIEWED if still at SENT_FOR_SIGNATURE
    if (contract.status === ContractStatus.SENT_FOR_SIGNATURE) {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: ContractStatus.VIEWED, updatedAt: new Date() },
      });
    }

    // Issue a 30-minute JWT session token
    const sessionToken = jwt.sign(
      {
        contractId: contract.id,
        email: contract.signerEmail,
        otpId: otpRecord.id,
        type: 'contract-signing',
      },
      JWT_SECRET,
      { expiresIn: '30m' },
    );

    return res.json({
      sessionToken,
      content: contract.content,
    });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /:token/submit — submit client signature ────────────────────────────
router.post('/:token/submit', async (req, res, next) => {
  try {
    const { token } = req.params;
    const {
      signatureData,
      signatureType,
      signerName,
      sessionToken,
      agreedToTerms,
    } = req.body as {
      signatureData?: string;
      signatureType?: string;
      signerName?: string;
      sessionToken?: string;
      agreedToTerms?: boolean;
    };

    // Validate required fields
    if (!signatureData) return res.status(400).json({ error: 'signatureData is required' });
    if (!signatureType || !['typed', 'drawn'].includes(signatureType)) {
      return res.status(400).json({ error: "signatureType must be 'typed' or 'drawn'" });
    }
    if (!signerName) return res.status(400).json({ error: 'signerName is required' });
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken is required' });
    if (!agreedToTerms) return res.status(400).json({ error: 'agreedToTerms must be true' });

    // Validate signature data size
    if (signatureData.length > 700000) {
      return res.status(400).json({ error: 'Signature data exceeds maximum allowed size' });
    }

    // Verify JWT session token
    let sessionPayload: {
      contractId: string;
      email: string;
      otpId: string;
      type: string;
    };

    try {
      sessionPayload = jwt.verify(sessionToken, JWT_SECRET) as typeof sessionPayload;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session token. Please re-verify your identity.' });
    }

    if (sessionPayload.type !== 'contract-signing') {
      return res.status(401).json({ error: 'Invalid session token type' });
    }

    // Fetch contract by signing token
    const contract = await prisma.contract.findUnique({
      where: { signingToken: token },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Verify session token contractId matches this contract
    if (sessionPayload.contractId !== contract.id) {
      return res.status(401).json({ error: 'Session token does not match this contract' });
    }

    // Contract must be SENT_FOR_SIGNATURE or VIEWED
    if (
      contract.status !== ContractStatus.SENT_FOR_SIGNATURE &&
      contract.status !== ContractStatus.VIEWED
    ) {
      return res.status(409).json({
        error: `Contract cannot be signed in its current status (${contract.status})`,
      });
    }

    // Verify OTP record exists and is verified
    const otpRecord = await prisma.contractOTP.findUnique({
      where: { id: sessionPayload.otpId },
    });

    if (!otpRecord || !otpRecord.verified) {
      return res.status(401).json({ error: 'OTP verification record not found or not verified' });
    }

    const ip = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';
    const signedAt = new Date();

    // Update contract to AWAITING_COUNTERSIGN
    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: ContractStatus.AWAITING_COUNTERSIGN,
        signatureData,
        signatureType,
        signerName,
        signatureIp: ip,
        signatureAgent: userAgent,
        signerOtpId: otpRecord.id,
        signedAt,
        signedBy: signerName,
        updatedAt: new Date(),
      },
    });

    // Notify contract owner
    const ownerEmail = contract.user?.email;
    const ownerName = contract.user
      ? `${contract.user.firstName} ${contract.user.lastName}`.trim()
      : 'TechCloudPro';

    if (ownerEmail) {
      sendClientSignedNotification({
        to: ownerEmail,
        ownerName,
        clientName: signerName,
        clientEmail: contract.signerEmail || '',
        contractTitle: contract.title,
        contractId: contract.id,
        signedAt,
      }).catch((err: any) => console.error('Failed to send signed notification:', err.message));
    }

    return res.json({
      message: 'Signature submitted successfully',
      status: updated.status,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
