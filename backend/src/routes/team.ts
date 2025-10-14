import { Router } from 'express';
import { authenticate, getAccountOwnerId } from '../middleware/auth';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/team/verify-invite/:token
 * Verify invitation token and get user info (PUBLIC - no auth required)
 */
router.get('/verify-invite/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError('Invite token is required', 400);
    }

    // Find user with this invite token
    const user = await prisma.user.findUnique({
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
      throw new AppError('Invalid invite token', 404);
    }

    if (user.inviteAccepted) {
      throw new AppError('Invitation already accepted', 400);
    }

    // Check if token is expired (7 days)
    const invitedAt = new Date(user.invitedAt!);
    const expiresAt = new Date(invitedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > expiresAt) {
      throw new AppError('Invitation has expired', 400);
    }

    res.json({
      message: 'Valid invitation',
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/team/accept-invite
 * Accept team invitation and set password (PUBLIC - no auth required)
 * Body: { inviteToken: string, password: string }
 */
router.post('/accept-invite', async (req, res, next) => {
  try {
    const { inviteToken, password } = req.body;

    // Validate input
    if (!inviteToken || !password) {
      throw new AppError('Invite token and password are required', 400);
    }

    // Validate password strength
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    // Find user with this invite token
    const user = await prisma.user.findUnique({
      where: { inviteToken },
    });

    if (!user) {
      throw new AppError('Invalid invite token', 400);
    }

    if (user.inviteAccepted) {
      throw new AppError('Invitation already accepted', 400);
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user - mark for password change on first login
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteAccepted: true,
        acceptedAt: new Date(),
        inviteToken: null, // Clear token after acceptance
        requirePasswordChange: true, // Force password change on first login
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
  } catch (error) {
    next(error);
  }
});

// All routes below require authentication
router.use(authenticate);

/**
 * GET /api/team
 * Get all team members for the current user's account
 * - OWNER: Returns all team members they've invited
 * - MEMBER: Returns error (only owners can view team)
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Only account owners can view team members
    if (req.user?.teamRole !== 'OWNER') {
      throw new AppError('Only account owners can view team members', 403);
    }

    // Get all team members for this account owner
    const teamMembers = await prisma.user.findMany({
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
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/team/invite
 * Invite a new team member
 * Body: { email: string, firstName: string, lastName: string }
 */
router.post('/invite', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Only account owners can invite team members
    if (req.user?.teamRole !== 'OWNER') {
      throw new AppError('Only account owners can invite team members', 403);
    }

    const { email, firstName, lastName } = req.body;

    // Validate input
    if (!email || !firstName || !lastName) {
      throw new AppError('Email, first name, and last name are required', 400);
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('A user with this email already exists', 400);
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Create temporary password (user will be required to change it on first login)
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create new user with MEMBER role
    const newUser = await prisma.user.create({
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

    // TODO: Send invitation email with invite token
    // This will be implemented in the email invitation system task

    res.status(201).json({
      message: 'Team member invited successfully',
      teamMember: newUser,
      inviteToken, // Temporary - will be sent via email in production
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/team/:userId
 * Remove a team member
 * Only account owners can remove team members
 */
router.delete('/:userId', async (req, res, next) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      throw new AppError('User not authenticated', 401);
    }

    // Only account owners can remove team members
    if (req.user?.teamRole !== 'OWNER') {
      throw new AppError('Only account owners can remove team members', 403);
    }

    const { userId } = req.params;

    // Find team member
    const teamMember = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountOwnerId: true,
        teamRole: true,
      },
    });

    if (!teamMember) {
      throw new AppError('Team member not found', 404);
    }

    // Verify this team member belongs to the current account owner
    if (teamMember.accountOwnerId !== ownerId) {
      throw new AppError('You can only remove members from your own team', 403);
    }

    // Cannot remove account owners
    if (teamMember.teamRole === 'OWNER') {
      throw new AppError('Cannot remove account owners', 400);
    }

    // Soft delete by deactivating user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    res.json({
      message: 'Team member removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
