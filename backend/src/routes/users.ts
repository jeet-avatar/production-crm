import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';

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

export default router;