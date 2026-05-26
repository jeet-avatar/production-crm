# Google OAuth Setup Guide

Your CRM application now has Google OAuth authentication enabled! To make it fully functional, you'll need to set up Google OAuth credentials. This is **completely FREE** and takes about 5 minutes.

## Quick Summary
✅ Frontend: Google OAuth button is ready
✅ Backend: OAuth routes implemented
❌ Needs: Google Cloud Console credentials (FREE)

## Step-by-Step Setup

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Create a New Project (or use existing)
- Click "Select a project" at the top
- Click "New Project"
- Name it: "CRM Application" (or any name you prefer)
- Click "Create"

### 3. Enable Google+ API
- In the left sidebar, go to "APIs & Services" > "Library"
- Search for "Google+ API"
- Click on it and click "Enable"

### 4. Create OAuth 2.0 Credentials
- Go to "APIs & Services" > "Credentials"
- Click "+ CREATE CREDENTIALS" at the top
- Select "OAuth client ID"

### 5. Configure OAuth Consent Screen (if prompted)
- Choose "External" user type
- Click "Create"
- Fill in required fields:
  - App name: "CRM Application"
  - User support email: your email
  - Developer contact: your email
- Click "Save and Continue"
- Skip scopes (click "Save and Continue")
- Skip test users (click "Save and Continue")
- Click "Back to Dashboard"

### 6. Create OAuth Client ID
- Go back to "Credentials" > "+ CREATE CREDENTIALS" > "OAuth client ID"
- Application type: **Web application**
- Name: "CRM Web Client"
- Authorized JavaScript origins:
  ```
  http://localhost:5173
  http://localhost:3000
  ```
- Authorized redirect URIs:
  ```
  http://localhost:3000/api/auth/google/callback
  ```
- Click "Create"

### 7. Copy Your Credentials
You'll see a popup with:
- **Client ID** (looks like: 123456789-abc123def456.apps.googleusercontent.com)
- **Client Secret** (looks like: GOCSPX-abc123def456)

### 8. Update Your .env File
Open `/Users/jeet/Documents/CRM Module/.env` and update these lines:

```env
GOOGLE_CLIENT_ID=your-actual-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

Replace `your-actual-client-id-here` and `your-actual-client-secret-here` with the values from step 7.

### 9. Restart the Backend Server
```bash
# Kill the current server
lsof -ti:3000 | xargs kill -9

# Start it again
cd "/Users/jeet/Documents/CRM Module"
npm start
```

### 10. Test Google Login
1. Open your browser to: http://localhost:5173
2. Click "Continue with Google"
3. Select your Google account
4. You should be logged in!

## How It Works

### Login Flow:
1. User clicks "Continue with Google" on login page
2. User is redirected to Google's OAuth consent screen
3. User authorizes the app
4. Google redirects back to: `http://localhost:3000/api/auth/google/callback`
5. Backend creates/finds user account and generates JWT token
6. User is redirected to: `http://localhost:5173/auth/callback?token=...`
7. Frontend saves token to localStorage
8. User is logged in!

### User Data:
When a user signs in with Google for the first time, the system automatically:
- Creates a new user account
- Saves their email, first name, and last name
- Marks the account as active
- Generates a JWT token for authentication

Existing users (by email) will simply be logged in.

## Security Notes

1. **Client Secret**: Keep your `GOOGLE_CLIENT_SECRET` private. Never commit it to version control.
2. **HTTPS Required**: For production, you'll need HTTPS URLs in the OAuth configuration.
3. **Authorized Domains**: Only the domains you specify in Google Cloud Console can use OAuth.

## Production Setup

When deploying to production:

1. Add your production domain to Google Cloud Console:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`

2. Update your `.env.production`:
   ```env
   GOOGLE_CLIENT_ID=your-production-client-id
   GOOGLE_CLIENT_SECRET=your-production-client-secret
   GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
   FRONTEND_URL=https://yourdomain.com
   ```

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/auth/google/callback`
- Check for trailing slashes or typos

### Error: "Access blocked: This app's request is invalid"
- Complete the OAuth consent screen configuration in Google Cloud Console
- Make sure you added your email as a test user if the app is in testing mode

### Google button doesn't work
1. Check browser console for errors
2. Verify backend server is running on port 3000
3. Verify Google credentials are correctly set in `.env`
4. Restart the backend server after changing `.env`

## Cost
**Google OAuth is completely FREE** for standard use cases. You only pay if you exceed Google's generous API quotas (which is unlikely for a CRM application).

## Need Help?
- Google OAuth Documentation: https://developers.google.com/identity/protocols/oauth2
- Google Cloud Console: https://console.cloud.google.com/

---

## Current Status

✅ **Completed:**
- Modern login page with Google OAuth button
- Backend OAuth routes (`/api/auth/google`, `/api/auth/google/callback`)
- Passport.js Google Strategy configured
- OAuth callback handler in frontend
- Automatic user creation/login

⏳ **Waiting for:**
- Google Cloud Console credentials (FREE - follow steps above)

Once you complete the Google Cloud Console setup, your Google OAuth will be fully functional!
