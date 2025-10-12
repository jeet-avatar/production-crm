import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';
import { AuthUtils } from '../utils/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (admin only)
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    // TODO: Implement user listing with pagination
    res.json({ message: 'Users endpoint - to be implemented' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    res.json({
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
});

// Update current user profile
router.put('/me', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { firstName, lastName, phone, timezone, avatar } = req.body;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(timezone && { timezone }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        timezone: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put('/me/password', [
  body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await AuthUtils.comparePassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const newPasswordHash = await AuthUtils.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;