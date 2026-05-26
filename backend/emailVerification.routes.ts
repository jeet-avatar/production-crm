import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { emailVerificationService } from '../services/emailVerification';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Get email verification service status
 */
router.get('/status', async (req: Request, res: Response) => {
  const provider = emailVerificationService.getProviderName();

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
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email address is required', 400);
    }

    logger.info(`Manual email verification requested: ${email}`);

    const result = await emailVerificationService.verifyEmail(email);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Verify a single contact by ID
 */
router.post('/contacts/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get contact and verify ownership
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: req.user?.id
      }
    });

    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    if (!contact.email) {
      throw new AppError('Contact has no email address', 400);
    }

    logger.info(`Verifying contact: ${contact.email}`);

    // Verify email
    const result = await emailVerificationService.verifyEmail(contact.email);

    // Update contact with verification result
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        emailVerified: result.isValid,
        emailVerificationMethod: result.provider.toLowerCase(),
        emailVerificationScore: result.score,
        emailVerificationStatus: result.status,
        emailVerifiedAt: result.isValid ? new Date() : null,
        emailVerificationDetails: result as any,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
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

    logger.info(`Contact email verified: ${contact.email} - ${result.status} (${result.score}%)`);

    res.json({
      success: true,
      message: `Email ${result.status}: ${contact.email}`,
      contact: updatedContact,
      verification: result
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Bulk verify all unverified contacts for a company
 */
router.post('/companies/:id/verify-contacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id
      }
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Get all unverified contacts for this company
    const contacts = await prisma.contact.findMany({
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

    logger.info(`Starting bulk verification for ${contacts.length} contacts`);

    const emails = contacts.map(c => c.email!);
    const results = await emailVerificationService.verifyBulk(
      emails,
      (completed, total) => {
        logger.info(`Verification progress: ${completed}/${total}`);
      }
    );

    // Update contacts with verification results
    let verified = 0;
    let invalid = 0;
    let risky = 0;
    let unknown = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const result = results[i];

      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          emailVerified: result.isValid,
          emailVerificationMethod: result.provider.toLowerCase(),
          emailVerificationScore: result.score,
          emailVerificationStatus: result.status,
          emailVerifiedAt: result.isValid ? new Date() : null,
          emailVerificationDetails: result as any,
        }
      });

      // Count stats
      if (result.status === 'valid') verified++;
      else if (result.status === 'invalid') invalid++;
      else if (result.status === 'risky') risky++;
      else unknown++;
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
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
          provider: emailVerificationService.getProviderName()
        }
      }
    });

    logger.info(`Bulk verification complete: ${verified}/${contacts.length} verified`);

    res.json({
      success: true,
      message: `Verified ${contacts.length} contacts`,
      stats: {
        total: contacts.length,
        verified,
        invalid,
        risky,
        unknown,
        provider: emailVerificationService.getProviderName()
      },
      results: results.map((r, i) => ({
        email: r.email,
        contactName: `${contacts[i].firstName} ${contacts[i].lastName}`,
        status: r.status,
        score: r.score,
        reason: r.reason
      }))
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Bulk verify all unverified contacts (all companies)
 */
router.post('/verify-all-unverified', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 100 } = req.body; // Limit to prevent abuse

    // Get all unverified contacts for this user
    const contacts = await prisma.contact.findMany({
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

    logger.info(`Starting bulk verification for ${contacts.length} contacts (user: ${req.user?.id})`);

    const emails = contacts.map(c => c.email!);
    const results = await emailVerificationService.verifyBulk(
      emails,
      (completed, total) => {
        logger.info(`Verification progress: ${completed}/${total}`);
      }
    );

    // Update contacts with verification results
    let verified = 0;
    let invalid = 0;
    let risky = 0;
    let unknown = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const result = results[i];

      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          emailVerified: result.isValid,
          emailVerificationMethod: result.provider.toLowerCase(),
          emailVerificationScore: result.score,
          emailVerificationStatus: result.status,
          emailVerifiedAt: result.isValid ? new Date() : null,
          emailVerificationDetails: result as any,
        }
      });

      // Count stats
      if (result.status === 'valid') verified++;
      else if (result.status === 'invalid') invalid++;
      else if (result.status === 'risky') risky++;
      else unknown++;
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'BULK_EMAIL_VERIFICATION',
        entityType: 'User',
        entityId: req.user!.id,
        metadata: {
          totalContacts: contacts.length,
          verified,
          invalid,
          risky,
          unknown,
          provider: emailVerificationService.getProviderName()
        }
      }
    });

    logger.info(`Bulk verification complete: ${verified}/${contacts.length} verified`);

    res.json({
      success: true,
      message: `Verified ${contacts.length} contacts`,
      stats: {
        total: contacts.length,
        verified,
        invalid,
        risky,
        unknown,
        provider: emailVerificationService.getProviderName()
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
