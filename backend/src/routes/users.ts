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
        emailNotifications: true,
        dealUpdates: true,
        newContacts: true,
        weeklyReport: true,
        marketingEmails: true,
        language: true,
        dateFormat: true,
        timeFormat: true,
        theme: true,
        compactView: true,
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

// Update notification preferences
router.put('/me/preferences', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { emailNotifications, dealUpdates, newContacts, weeklyReport, marketingEmails } = req.body;

    // Update notification preferences
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(dealUpdates !== undefined && { dealUpdates }),
        ...(newContacts !== undefined && { newContacts }),
        ...(weeklyReport !== undefined && { weeklyReport }),
        ...(marketingEmails !== undefined && { marketingEmails }),
      },
      select: {
        id: true,
        emailNotifications: true,
        dealUpdates: true,
        newContacts: true,
        weeklyReport: true,
        marketingEmails: true,
      },
    });

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: {
        emailNotifications: updatedUser.emailNotifications,
        dealUpdates: updatedUser.dealUpdates,
        newContacts: updatedUser.newContacts,
        weeklyReport: updatedUser.weeklyReport,
        marketingEmails: updatedUser.marketingEmails,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update user display/app preferences
router.put('/me/display-preferences', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { language, dateFormat, timeFormat, theme, compactView, timezone } = req.body;

    // Update display preferences
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(language !== undefined && { language }),
        ...(dateFormat !== undefined && { dateFormat }),
        ...(timeFormat !== undefined && { timeFormat }),
        ...(theme !== undefined && { theme }),
        ...(compactView !== undefined && { compactView }),
        ...(timezone !== undefined && { timezone }),
      },
      select: {
        id: true,
        language: true,
        dateFormat: true,
        timeFormat: true,
        theme: true,
        compactView: true,
        timezone: true,
      },
    });

    res.json({
      message: 'Display preferences updated successfully',
      preferences: {
        language: updatedUser.language,
        dateFormat: updatedUser.dateFormat,
        timeFormat: updatedUser.timeFormat,
        theme: updatedUser.theme,
        compactView: updatedUser.compactView,
        timezone: updatedUser.timezone,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;