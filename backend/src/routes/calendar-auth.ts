import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import axios from 'axios';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR OAUTH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initiate Google Calendar OAuth flow
 * GET /api/calendar/google/connect
 */
router.get('/google/connect', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/calendar/google/callback`;

    if (!clientId || !clientSecret) {
      throw new AppError('Google OAuth not configured. Please contact administrator.', 500);
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: scopes,
      state: userId, // Pass user ID for callback
      prompt: 'consent', // Force consent to get refresh token
    });

    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Handle Google Calendar OAuth callback
 * GET /api/calendar/google/callback
 */
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const userId = state as string;

    if (!code || !userId) {
      throw new AppError('Invalid OAuth callback', 400);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/calendar/google/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new AppError('Failed to obtain Google Calendar tokens', 500);
    }

    // Get user's Google email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Save tokens to database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarRefreshToken: tokens.refresh_token,
        googleCalendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleCalendarConnected: true,
        googleCalendarEmail: userInfo.data.email || null,
      },
    });

    // Redirect to frontend settings page with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/settings?calendar=google&status=connected`);
  } catch (error) {
    console.error('[Google OAuth Callback Error]:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/settings?calendar=google&status=error`);
  }
});

/**
 * Disconnect Google Calendar
 * POST /api/calendar/google/disconnect
 */
router.post('/google/disconnect', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Revoke Google OAuth token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarRefreshToken: true },
    });

    if (user?.googleCalendarRefreshToken) {
      try {
        await axios.post(
          'https://oauth2.googleapis.com/revoke',
          `token=${user.googleCalendarRefreshToken}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
      } catch (error) {
        console.error('[Google Token Revoke Error]:', error);
        // Continue even if revoke fails
      }
    }

    // Remove tokens from database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleCalendarAccessToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarTokenExpiry: null,
        googleCalendarConnected: false,
        googleCalendarEmail: null,
      },
    });

    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ZOOM OAUTH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initiate Zoom OAuth flow
 * GET /api/calendar/zoom/connect
 */
router.get('/zoom/connect', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const clientId = process.env.ZOOM_USER_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/calendar/zoom/callback`;

    if (!clientId) {
      throw new AppError('Zoom OAuth not configured. Please contact administrator.', 500);
    }

    const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;

    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Handle Zoom OAuth callback
 * GET /api/calendar/zoom/callback
 */
router.get('/zoom/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const userId = state as string;

    if (!code || !userId) {
      throw new AppError('Invalid OAuth callback', 400);
    }

    const clientId = process.env.ZOOM_USER_CLIENT_ID;
    const clientSecret = process.env.ZOOM_USER_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/calendar/zoom/callback`;

    if (!clientId || !clientSecret) {
      throw new AppError('Zoom OAuth not configured', 500);
    }

    // Exchange code for tokens
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await axios.post(
      'https://zoom.us/oauth/token',
      `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    if (!access_token || !refresh_token) {
      throw new AppError('Failed to obtain Zoom tokens', 500);
    }

    // Get Zoom user info
    const userResponse = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const zoomUser = userResponse.data;

    // Save tokens to database
    const expiryDate = new Date(Date.now() + expires_in * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        zoomAccessToken: access_token,
        zoomRefreshToken: refresh_token,
        zoomTokenExpiry: expiryDate,
        zoomConnected: true,
        zoomUserId: zoomUser.id,
        zoomUserEmail: zoomUser.email,
      },
    });

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/settings?calendar=zoom&status=connected`);
  } catch (error) {
    console.error('[Zoom OAuth Callback Error]:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/settings?calendar=zoom&status=error`);
  }
});

/**
 * Disconnect Zoom
 * POST /api/calendar/zoom/disconnect
 */
router.post('/zoom/disconnect', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Revoke Zoom token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { zoomAccessToken: true },
    });

    if (user?.zoomAccessToken) {
      try {
        const clientId = process.env.ZOOM_USER_CLIENT_ID;
        const clientSecret = process.env.ZOOM_USER_CLIENT_SECRET;
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        await axios.post(
          `https://zoom.us/oauth/revoke?token=${user.zoomAccessToken}`,
          {},
          {
            headers: {
              'Authorization': `Basic ${credentials}`,
            },
          }
        );
      } catch (error) {
        console.error('[Zoom Token Revoke Error]:', error);
        // Continue even if revoke fails
      }
    }

    // Remove tokens from database
    await prisma.user.update({
      where: { id: userId },
      data: {
        zoomAccessToken: null,
        zoomRefreshToken: null,
        zoomTokenExpiry: null,
        zoomConnected: false,
        zoomUserId: null,
        zoomUserEmail: null,
      },
    });

    res.json({
      success: true,
      message: 'Zoom disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR STATUS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get calendar connection status for current user
 * GET /api/calendar/status
 */
router.get('/status', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleCalendarConnected: true,
        googleCalendarEmail: true,
        zoomConnected: true,
        zoomUserEmail: true,
        outlookConnected: true,
        outlookEmail: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      calendars: {
        google: {
          connected: user.googleCalendarConnected,
          email: user.googleCalendarEmail,
        },
        zoom: {
          connected: user.zoomConnected,
          email: user.zoomUserEmail,
        },
        outlook: {
          connected: user.outlookConnected,
          email: user.outlookEmail,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
