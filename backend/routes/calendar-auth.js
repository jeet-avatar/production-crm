"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const googleapis_1 = require("googleapis");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Calendar routes are working!',
        timestamp: new Date().toISOString()
    });
});
router.get('/google/connect', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'https://brandmonkz.com'}/api/calendar/google/callback`;
    if (!clientId || !clientSecret) {
        return res.status(500).json({
            error: 'Google OAuth not configured',
            message: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET'
        });
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const userId = req.query.userId || 'test-user';
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ],
        prompt: 'consent',
        state: userId
    });
    console.log('[GOOGLE OAUTH] Initiating connection for user:', userId);
    res.redirect(authUrl);
});
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;
        if (error) {
            console.error('[GOOGLE OAUTH] User denied access:', error);
            return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Calendar Connection Failed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 100px auto;
              padding: 20px;
              text-align: center;
            }
            .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 30px; }
            .button {
              background: #007bff;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="error">❌ Calendar Connection Cancelled</div>
          <div class="message">You denied access to your Google Calendar.</div>
          <a href="https://brandmonkz.com" class="button">Back to CRM</a>
        </body>
        </html>
      `);
        }
        if (!code) {
            return res.status(400).json({
                error: 'No authorization code received'
            });
        }
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${process.env.BACKEND_URL || 'https://brandmonkz.com'}/api/calendar/google/callback`;
        if (!clientId || !clientSecret) {
            return res.status(500).json({
                error: 'Google OAuth not configured'
            });
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        console.log('[GOOGLE OAUTH] Exchanging code for tokens...');
        const { tokens } = await oauth2Client.getToken(code);
        console.log('[GOOGLE OAUTH] Tokens received:', {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiryDate: tokens.expiry_date
        });
        oauth2Client.setCredentials(tokens);
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const userEmail = userInfo.data.email;
        console.log('[GOOGLE OAUTH] User email:', userEmail);
        const userId = state || 'test-user';
        let user;
        if (userId === 'test-user') {
            user = await prisma.user.findFirst({
                where: {
                    email: userEmail
                }
            });
            if (!user) {
                user = await prisma.user.findFirst({
                    where: {
                        role: 'admin'
                    }
                });
            }
        }
        else {
            user = await prisma.user.findUnique({
                where: {
                    id: parseInt(userId)
                }
            });
        }
        if (!user) {
            console.error('[GOOGLE OAUTH] No user found for:', { userId, userEmail });
            return res.status(404).json({
                error: 'User not found',
                message: 'Could not find user to save tokens'
            });
        }
        console.log('[GOOGLE OAUTH] Saving tokens for user:', user.id, user.email);
        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                googleCalendarAccessToken: tokens.access_token,
                googleCalendarRefreshToken: tokens.refresh_token,
                googleCalendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                googleCalendarConnected: true,
                googleCalendarEmail: userEmail
            }
        });
        console.log('[GOOGLE OAUTH] ✅ Successfully connected Google Calendar for user:', user.email);
        res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Calendar Connected Successfully</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            padding: 20px;
            text-align: center;
          }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 30px; }
          .details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: left;
          }
          .details h3 { margin-top: 0; color: #333; }
          .details p { margin: 8px 0; color: #666; }
          .button {
            background: #28a745;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="success">✅ Google Calendar Connected!</div>
        <div class="message">Your Google Calendar has been successfully connected to BrandMonkz CRM.</div>

        <div class="details">
          <h3>What's Next?</h3>
          <p>✓ Your calendar is now synced</p>
          <p>✓ When you create meetings in CRM, they'll appear in your Google Calendar</p>
          <p>✓ Meeting invitations will be sent automatically</p>
          <p><strong>Connected Email:</strong> ${userEmail}</p>
        </div>

        <a href="https://brandmonkz.com" class="button">Back to CRM</a>

        <script>
          // Auto-redirect after 5 seconds
          setTimeout(() => {
            window.location.href = 'https://brandmonkz.com';
          }, 5000);
        </script>
      </body>
      </html>
    `);
    }
    catch (error) {
        console.error('[GOOGLE OAUTH] Error in callback:', error);
        res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Calendar Connection Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            padding: 20px;
            text-align: center;
          }
          .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 20px; }
          .details {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 30px;
            font-family: monospace;
            text-align: left;
            font-size: 12px;
          }
          .button {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="error">❌ Connection Failed</div>
        <div class="message">There was an error connecting your Google Calendar.</div>
        <div class="details">${error.message}</div>
        <a href="https://brandmonkz.com/api/calendar/google/connect" class="button">Try Again</a>
      </body>
      </html>
    `);
    }
});
router.post('/google/disconnect', async (req, res) => {
    try {
        const userId = req.body.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User ID required'
            });
        }
        await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                googleCalendarAccessToken: null,
                googleCalendarRefreshToken: null,
                googleCalendarTokenExpiry: null,
                googleCalendarConnected: false,
                googleCalendarEmail: null
            }
        });
        res.json({
            success: true,
            message: 'Google Calendar disconnected successfully'
        });
    }
    catch (error) {
        console.error('[GOOGLE OAUTH] Error disconnecting:', error);
        res.status(500).json({
            error: 'Failed to disconnect',
            message: error.message
        });
    }
});
router.get('/status', async (req, res) => {
    try {
        const userId = req.query.userId || req.user?.id;
        if (!userId) {
            return res.json({
                google: {
                    connected: false,
                    message: 'Not authenticated'
                }
            });
        }
        const user = await prisma.user.findUnique({
            where: {
                id: parseInt(userId)
            },
            select: {
                googleCalendarConnected: true,
                googleCalendarEmail: true,
                googleCalendarTokenExpiry: true
            }
        });
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        res.json({
            google: {
                connected: user.googleCalendarConnected || false,
                email: user.googleCalendarEmail || null,
                tokenExpiry: user.googleCalendarTokenExpiry || null
            }
        });
    }
    catch (error) {
        console.error('[GOOGLE OAUTH] Error getting status:', error);
        res.status(500).json({
            error: 'Failed to get status',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=calendar-auth.js.map