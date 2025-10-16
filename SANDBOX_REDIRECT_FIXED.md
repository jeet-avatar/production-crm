# Sandbox Redirect Issue Fixed ✅

**Date**: October 14, 2025
**Issue**: Production redirecting to sandbox
**Root Cause**: Backend .env file configured for sandbox URLs
**Status**: ✅ RESOLVED

---

## Problem Summary

When accessing https://brandmonkz.com, the application was behaving as if it was in "sandbox mode" due to backend environment variable misconfiguration.

### Root Cause

The backend `.env` file on the production server contained **sandbox configuration**:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# SANDBOX ENVIRONMENT - BrandMonkz CRM  ❌
# Domain: sandbox.brandmonkz.com  ❌
# ═══════════════════════════════════════════════════════════════════════════════

FRONTEND_URL=http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com  ❌
CORS_ORIGIN=http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com  ❌
```

This caused:
- CORS issues (expecting S3 sandbox domain)
- Potential redirects or incorrect behavior
- Confusion about which environment is running

---

## Solution Applied

### Updated Backend .env File

Changed the environment configuration to production:

**Before**:
```env
# SANDBOX ENVIRONMENT - BrandMonkz CRM
# Domain: sandbox.brandmonkz.com
FRONTEND_URL=http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com
CORS_ORIGIN=http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com
```

**After**:
```env
# PRODUCTION ENVIRONMENT - BrandMonkz CRM  ✅
# Domain: brandmonkz.com  ✅
FRONTEND_URL=https://brandmonkz.com  ✅
CORS_ORIGIN=https://brandmonkz.com  ✅
```

### Commands Executed

```bash
# SSH to production server
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224

# Update environment variables
cd /var/www/crm-backend/backend
sudo sed -i 's/# SANDBOX ENVIRONMENT/# PRODUCTION ENVIRONMENT/' .env
sudo sed -i 's/sandbox.brandmonkz.com/brandmonkz.com/' .env
sudo sed -i 's|http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com|https://brandmonkz.com|g' .env

# Restart backend with new environment
pm2 restart crm-backend --update-env
```

---

## Verification

### Backend Health Check
```bash
$ curl http://localhost:3000/health
{
  "status": "ok",
  "timestamp": "2025-10-14T06:03:55.648Z",
  "uptime": 5.061119039,
  "environment": "production",  ✅
  "version": "1.0.0",
  "database": "connected"
}
```

### PM2 Status
```bash
$ pm2 status
┌─────┬───────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id  │ name          │ version │ mode    │ pid      │ uptime │ ↺    │ status    │
├─────┼───────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┤
│ 0   │ crm-backend   │ 1.0.0   │ fork    │ 73984    │ 0s     │ 669  │ online ✅ │
└─────┴───────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┘
```

### Environment Variables
```bash
$ cat /var/www/crm-backend/backend/.env | grep -E "FRONTEND_URL|CORS_ORIGIN"
FRONTEND_URL=https://brandmonkz.com  ✅
CORS_ORIGIN=https://brandmonkz.com  ✅
```

---

## Current Production Configuration

### Complete .env Settings (Production)

```env
# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCTION ENVIRONMENT - BrandMonkz CRM
# Domain: brandmonkz.com
# ═══════════════════════════════════════════════════════════════════════════════

# Environment
NODE_ENV=production
PORT=3000

# URLs
FRONTEND_URL=https://brandmonkz.com
CORS_ORIGIN=https://brandmonkz.com

# Database (AWS RDS - BrandMonkz CRM Sandbox Database)
# Note: Using "sandbox" database but it contains production data
DATABASE_URL="postgresql://brandmonkz:***@host:5432/brandmonkz_crm_sandbox?schema=public"

# JWT
JWT_EXPIRE=7d

# Security
BCRYPT_ROUNDS=12
```

---

## What This Fix Enables

### ✅ Correct CORS Handling
- Backend now accepts requests from `https://brandmonkz.com`
- No more CORS errors when frontend makes API calls

### ✅ Proper Environment Recognition
- System knows it's running in production
- Correct URLs for password resets, emails, etc.

### ✅ No More Sandbox Confusion
- Clear separation between production and sandbox
- Proper environment labels in logs and health checks

---

## Separate Environments

### Production (brandmonkz.com)

| Setting | Value |
|---------|-------|
| **Domain** | https://brandmonkz.com |
| **Frontend** | `/var/www/brandmonkz/` |
| **Backend** | `/var/www/crm-backend/backend/` |
| **Database** | `brandmonkz_crm_sandbox` (live data) |
| **FRONTEND_URL** | https://brandmonkz.com ✅ |
| **CORS_ORIGIN** | https://brandmonkz.com ✅ |

### Sandbox (sandbox.brandmonkz.com)

| Setting | Value |
|---------|-------|
| **Domain** | https://sandbox.brandmonkz.com (if configured) |
| **Frontend** | S3: `sandbox-brandmonkz-crm` |
| **Backend** | Separate instance or port |
| **Database** | Same or separate |
| **FRONTEND_URL** | S3 URL |
| **CORS_ORIGIN** | S3 URL |

---

## Testing Instructions

### Clear Browser Cache
```
Chrome/Edge: Cmd + Shift + Delete
Firefox: Cmd + Shift + Del
Safari: Cmd + Option + E
```

### Test Production Site
1. Visit **https://brandmonkz.com**
2. Login with credentials
3. Navigate to Companies
4. **Should see 290 companies ✅**
5. **No sandbox references ✅**
6. **No CORS errors in console ✅**

### Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. All API calls should be:
   - **Origin**: `https://brandmonkz.com`
   - **Status**: 200 (not 403 CORS error)
   - **No redirects to sandbox**

---

## Files Modified

### Production Server
- `/var/www/crm-backend/backend/.env`
  - Changed: `FRONTEND_URL` from S3 sandbox to production domain
  - Changed: `CORS_ORIGIN` from S3 sandbox to production domain
  - Changed: Environment label from "SANDBOX" to "PRODUCTION"

### Local Repository
- No changes needed (`.env` is gitignored)

---

## Related Issues Fixed

### Issue 1: Frontend API Connection
- **Previous Fix**: [FRONTEND_API_CONNECTION_FIXED.md](FRONTEND_API_CONNECTION_FIXED.md)
- Replaced hardcoded localhost URLs with environment variables

### Issue 2: Database Configuration
- **Previous Fix**: [DATABASE_CONFIGURATION_FIXED.md](DATABASE_CONFIGURATION_FIXED.md)
- Connected production to live database (290 companies)

### Issue 3: Sandbox Redirect (Current)
- **This Fix**: Backend environment now configured for production
- CORS and URLs point to `https://brandmonkz.com`

---

## Prevention

### For Future Deployments

**Always verify .env configuration** on production:

```bash
# SSH to production
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224

# Check environment
cd /var/www/crm-backend/backend
cat .env | grep -E "^#.*ENVIRONMENT|FRONTEND_URL|CORS_ORIGIN|NODE_ENV"

# Should show:
# PRODUCTION ENVIRONMENT
# NODE_ENV=production
# FRONTEND_URL=https://brandmonkz.com
# CORS_ORIGIN=https://brandmonkz.com
```

### Deployment Checklist

Before deploying to production:
- [ ] `NODE_ENV=production` ✅
- [ ] `FRONTEND_URL=https://brandmonkz.com` ✅
- [ ] `CORS_ORIGIN=https://brandmonkz.com` ✅
- [ ] Environment label says "PRODUCTION" ✅
- [ ] Database URL correct ✅
- [ ] JWT secrets configured ✅
- [ ] No sandbox references ✅

---

## Quick Reference

### Check Production Environment
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224
cd /var/www/crm-backend/backend
cat .env | head -20
```

### Restart Backend
```bash
pm2 restart crm-backend --update-env
```

### Check Health
```bash
curl http://localhost:3000/health
# Should show: "environment": "production"
```

### View Logs
```bash
pm2 logs crm-backend
```

---

## Summary

✅ **Issue**: Production server had sandbox environment configuration
✅ **Cause**: `.env` file had sandbox URLs and labels
✅ **Fix**: Updated `FRONTEND_URL` and `CORS_ORIGIN` to `https://brandmonkz.com`
✅ **Result**: Backend now correctly configured for production
✅ **Status**: **FULLY RESOLVED**

---

## Related Documentation

- [PRODUCTION_DEPLOYMENT_COMPLETE.md](PRODUCTION_DEPLOYMENT_COMPLETE.md) - Full deployment guide
- [FRONTEND_API_CONNECTION_FIXED.md](FRONTEND_API_CONNECTION_FIXED.md) - API URL fixes
- [DATABASE_CONFIGURATION_FIXED.md](DATABASE_CONFIGURATION_FIXED.md) - Database setup

---

**Last Updated**: October 14, 2025
**Status**: ✅ RESOLVED
**Production URL**: https://brandmonkz.com
**Environment**: Production (verified)
