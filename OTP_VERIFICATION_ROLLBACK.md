# Email Verification with OTP - Rollback Guide

## ✅ What Was Deployed

**Date**: October 13, 2025
**Feature**: Email verification with 6-digit OTP codes
**Status**: **DISABLED** by default (Feature flag: `ENABLE_EMAIL_VERIFICATION=false`)

### Changes Made:

1. **Database Schema**:
   - Added `emailVerified` (Boolean, default `true` for backward compatibility)
   - Added `verificationToken` (String, nullable)
   - Added `verificationTokenExpiry` (DateTime, nullable)

2. **Backend**:
   - `EmailService.generateOTP()` - Generate 6-digit OTP
   - `EmailService.getOTPExpiry()` - Calculate 15-minute expiry
   - `EmailService.sendVerificationEmail()` - Send OTP email
   - `POST /api/auth/verify-email` - Verify OTP code
   - `POST /api/auth/resend-verification` - Resend OTP

3. **Frontend**:
   - `VerifyEmailPage.tsx` - OTP input UI with timer
   - Route: `/verify-email?email=user@example.com`

4. **Environment**:
   - Feature flag: `ENABLE_EMAIL_VERIFICATION=false` (DISABLED)

---

## 🔥 EMERGENCY ROLLBACK (If Needed)

### Option 1: Quick Rollback (5 minutes)

**On your local machine:**

```bash
cd /Users/jeet/Documents/production-crm

# Find the rollback tag
git tag | grep production-stable-before-otp

# Reset to stable version (use the tag from above)
git reset --hard production-stable-before-otp-<timestamp>

# Rebuild and deploy backend
cd backend
scp -i ~/.ssh/brandmonkz-crm.pem src/services/email.service.ts ec2-user@100.24.213.224:/var/www/crm-backend/backend/src/services/
scp -i ~/.ssh/brandmonkz-crm.pem src/routes/auth.ts ec2-user@100.24.213.224:/var/www/crm-backend/backend/src/routes/
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "cd /var/www/crm-backend/backend && npm run build && pm2 restart crm-backend"

# Rebuild and deploy frontend
cd ../frontend
npm run build
scp -i ~/.ssh/brandmonkz-crm.pem -r dist/* ec2-user@100.24.213.224:/tmp/frontend-rollback/
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "sudo cp -r /tmp/frontend-rollback/* /usr/share/nginx/html/ && sudo systemctl reload nginx"
```

### Option 2: Database Rollback (If needed)

**ONLY if email verification is causing database issues:**

```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224

cd /var/www/crm-backend/backend

# Remove the verification fields (SAFE - they're nullable)
npx prisma db execute --stdin << 'EOF'
ALTER TABLE users DROP COLUMN IF EXISTS "emailVerified";
ALTER TABLE users DROP COLUMN IF EXISTS "verificationToken";
ALTER TABLE users DROP COLUMN IF EXISTS "verificationTokenExpiry";
EOF

# Regenerate Prisma client
npx prisma generate

# Restart backend
pm2 restart crm-backend
```

---

## 🧪 Testing Checklist

### ✅ Critical Tests (Run After Deployment)

1. **Existing User Login** (MOST IMPORTANT):
   ```
   - Go to https://brandmonkz.com/login
   - Login with existing user credentials
   - ✅ Should work normally (no OTP required)
   ```

2. **New User Registration** (Feature flag OFF):
   ```
   - Go to https://brandmonkz.com/signup
   - Register new user
   - ✅ Should create account immediately (no OTP)
   - ✅ Should redirect to dashboard
   ```

3. **Verify Email Page Exists**:
   ```
   - Go to https://brandmonkz.com/verify-email
   - ✅ Page should load (even if feature is OFF)
   ```

4. **API Endpoints**:
   ```bash
   # Test verification endpoint exists
   curl https://brandmonkz.com/api/auth/verify-email \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","token":"123456"}'

   # Should return 404 (user not found) or 400 (invalid token)
   # NOT 500 or endpoint not found
   ```

---

## 🚀 Enabling Email Verification (When Ready)

### Step 1: Test in Development First

Update `.env` on production:
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224
cd /var/www/crm-backend/backend
nano .env

# Change this line:
ENABLE_EMAIL_VERIFICATION=true

# Restart backend
pm2 restart crm-backend
```

### Step 2: Test with New User

1. Create a new test account
2. Verify OTP email is received
3. Verify OTP code works
4. Verify redirect after success

### Step 3: Monitor Logs

```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224
pm2 logs crm-backend --lines 100
```

Look for:
- `✅ Verification email sent to [email]`
- `Email verified for user: [email]`
- Any errors or warnings

---

## 📊 Current Status

- **Feature Flag**: `ENABLE_EMAIL_VERIFICATION=false` ✅ DISABLED
- **Database**: Updated with nullable fields ✅ SAFE
- **Backend**: Deployed with verification endpoints ✅ DEPLOYED
- **Frontend**: Deployed with VerifyEmailPage ✅ DEPLOYED
- **Backward Compatibility**: ✅ PRESERVED (existing users auto-verified)

---

## 🆘 Support

If you encounter issues:

1. **Check logs**: `pm2 logs crm-backend`
2. **Check database**: Existing users should have `emailVerified=true`
3. **Test existing login**: MUST work without changes
4. **Rollback if needed**: Use Option 1 above

---

## 📝 Git Commits

- **Checkpoint**: `production-stable-before-otp-<timestamp>`
- **Feature Commit**: `fe43332 - feat: Add email verification with OTP`

To view changes:
```bash
git diff production-stable-before-otp-<timestamp> HEAD
```

---

## ✨ Success Criteria

- ✅ Existing users can login normally
- ✅ New users can register without OTP (feature OFF)
- ✅ No 500 errors in logs
- ✅ Database fields added successfully
- ✅ Rollback procedure tested and works
- ✅ Feature can be enabled with single env variable change
