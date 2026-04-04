const express = require('express');
const router = express.Router();

// Simple test endpoint that doesn't require authentication
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Calendar routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Google OAuth connect - will add auth later
router.get('/google/connect', (req, res) => {
  const { google } = require('googleapis');
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.BACKEND_URL || 'https://brandmonkz.com'}/api/calendar/google/callback`;
  
  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: 'Google OAuth not configured',
      message: 'Please contact administrator'
    });
  }
  
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent',
    state: req.query.userId || 'test-user'
  });
  
  res.redirect(authUrl);
});

// Status endpoint
router.get('/status', (req, res) => {
  res.json({
    google: {
      connected: false,
      message: 'Connect your Google Calendar first'
    }
  });
});

module.exports = router;
