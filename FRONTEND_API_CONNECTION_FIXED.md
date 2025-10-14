# Frontend API Connection Fixed ✅

**Date**: October 14, 2025
**Issue**: Backend connection error on production
**Status**: ✅ RESOLVED

---

## Problem Summary

The user reported "backend is not connect" on the production website (https://brandmonkz.com).

### Root Cause

The frontend bundle contained **hardcoded `http://localhost:3000` URLs** in 26 TypeScript/TSX files, instead of using the `VITE_API_URL` environment variable.

**Evidence**:
```bash
# Old bundle had localhost URLs:
$ strings /var/www/brandmonkz/assets/index-CXPKkKPy.js | grep localhost:3000
localhost:3000  # Found multiple occurrences

# Backend was actually working fine:
$ curl http://localhost:3000/health
{"status":"ok","database":"connected"}
```

---

## Solution Applied

### 1. Fixed Hardcoded URLs in Source Code

Created automated Python script to replace hardcoded URLs with environment variable pattern:

**Before**:
```typescript
const response = await fetch('http://localhost:3000/api/contacts');
```

**After**:
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const response = await fetch(`${apiUrl}/api/contacts`);
```

**Files Fixed** (26 files):
- `src/components/CampaignEmailReport.tsx`
- `src/components/CSVImportModal.tsx`
- `src/components/RemoveDuplicatesModal.tsx`
- `src/components/CreateCampaignModal.tsx`
- `src/components/EditCampaignModal.tsx`
- `src/components/PositionCampaignBuilder.tsx`
- `src/components/EmailServerManagement.tsx`
- `src/components/CampaignSelectModal.tsx`
- `src/components/ImportCompaniesModal.tsx`
- `src/components/ApolloImportModal.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/Settings/SettingsPage.tsx`
- `src/pages/Auth/LoginPage.tsx`
- `src/pages/Auth/ForgotPasswordPage.tsx`
- `src/pages/Auth/AcceptInvitePage.tsx`
- `src/pages/Auth/ResetPasswordPage.tsx`
- `src/pages/Auth/SignupPage.tsx`
- `src/pages/Tags/TagsPage.tsx`
- `src/pages/Subscription/SubscriptionSuccess.tsx`
- `src/pages/Activities/ActivitiesPage.tsx`
- `src/pages/Campaigns/CampaignsPage.tsx`
- `src/pages/Campaigns/CampaignAnalytics.tsx`
- `src/pages/Pricing/PricingPage.tsx`
- `src/pages/Analytics/AnalyticsPage.tsx`
- `src/services/stripe.ts`
- `src/services/api.ts`

### 2. Rebuilt Frontend with Production API URL

```bash
VITE_API_URL=https://brandmonkz.com npm run build
```

**Result**:
- New bundle: `index-C5__kI-L.js` (different hash from old bundle)
- Contains 48 instances of `https://brandmonkz.com`
- Contains 0 instances of `localhost:3000` ✅

### 3. Deployed to Production

```bash
# Packaged and uploaded
tar -czf /tmp/frontend-build.tar.gz -C dist .
scp frontend-build.tar.gz ec2-user@100.24.213.224:/tmp/

# Deployed to /var/www/brandmonkz/
sudo rm -rf /var/www/brandmonkz/*
sudo tar -xzf /tmp/frontend-build.tar.gz
sudo chown -R nginx:nginx /var/www/brandmonkz
```

---

## Verification

### Frontend Bundle Check
```bash
$ ls -lh /var/www/brandmonkz/assets/
-rw-r--r--. 1 nginx nginx 1.3M Oct 14 05:36 index-C5__kI-L.js  ✅ NEW
-rw-r--r--. 1 nginx nginx  32K Oct 14 05:36 index-vg0aljZR.css
```

### API URL Check
```bash
# New bundle contains correct production URL
$ grep -o "https://brandmonkz.com" index-C5__kI-L.js | wc -l
48  ✅

# No localhost URLs
$ grep -o "localhost:3000" index-C5__kI-L.js | wc -l
0  ✅
```

### Backend Status
```bash
$ curl https://brandmonkz.com/health
{"status":"ok","database":"connected"}  ✅
```

---

## Testing Instructions

1. **Clear Browser Cache**:
   - Chrome: `Cmd + Shift + Delete` → Clear cached images and files
   - Or use Incognito/Private mode

2. **Visit Production Site**:
   ```
   https://brandmonkz.com
   ```

3. **Check Network Tab**:
   - Open DevTools → Network tab
   - Verify API calls go to `https://brandmonkz.com/api/*`
   - Should NOT see any `localhost:3000` URLs

4. **Test Features**:
   - Login
   - View Dashboard
   - View Contacts/Companies
   - Try Lead Discovery
   - All API calls should work ✅

---

## Environment Variables

### Frontend (`.env.production`)
```env
VITE_API_URL=https://brandmonkz.com
```

### Backend
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
FRONTEND_URL=https://brandmonkz.com
```

---

## Files Modified

### Production CRM Frontend
- 26 TypeScript/TSX files with hardcoded URLs fixed
- New production build deployed to `/var/www/brandmonkz/`

### No Changes Needed
- Backend code (already working correctly)
- Nginx configuration (correct)
- Database (no schema changes)
- Environment variables (correct)

---

## Issue Timeline

1. **5:15 AM** - User reported "backend is not connect"
2. **5:16 AM** - Investigated PM2, backend health checks (all passing)
3. **5:18 AM** - Discovered hardcoded localhost URLs in frontend bundle
4. **5:20 AM** - Created automated script to fix all 26 source files
5. **5:25 AM** - Rebuilt frontend with `VITE_API_URL=https://brandmonkz.com`
6. **5:28 AM** - Deployed new bundle to production
7. **5:30 AM** - Verified new bundle contains correct URLs
8. **5:32 AM** - Issue resolved ✅

---

## Prevention

To prevent this issue in the future:

1. **Always use environment variables**:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
   ```

2. **Never hardcode URLs** like:
   ```typescript
   // ❌ BAD
   fetch('http://localhost:3000/api/...')

   // ✅ GOOD
   const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
   fetch(`${apiUrl}/api/...`)
   ```

3. **Build verification script**:
   ```bash
   # Check bundle before deploying
   npm run build
   grep -q "localhost:3000" dist/assets/*.js && echo "❌ FAIL: Bundle contains localhost" || echo "✅ PASS"
   ```

4. **Use GitHub Actions** with proper environment variables set

---

## Contact

For questions or issues, check:
- Production logs: `pm2 logs crm-backend`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Backend health: `curl https://brandmonkz.com/health`

---

**Status**: ✅ **RESOLVED AND DEPLOYED**

The frontend now correctly uses `https://brandmonkz.com` for all API calls.
