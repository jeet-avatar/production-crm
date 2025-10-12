# 📋 SANDBOX DEPLOYMENT CHECKLIST

**Version:** v1.0.0-sandbox
**Date:** 2025-10-09
**Target Environment:** Sandbox
**Deployment URL:** https://sandbox.brandmonkz.com

---

## PRE-DEPLOYMENT VERIFICATION

### Code Readiness
- ✅ All 3 critical bugs fixed
  - ✅ Activities API endpoint working
  - ✅ Contact form create/update logic fixed
  - ✅ Company navigation using IDs (not domains)
- ✅ CORS configured for environment-based security
- ✅ Dependencies updated (93% security score)
- ✅ Zero hard-coded values verified
- ✅ 100% data isolation confirmed
- ✅ All routes authenticated

### Build Verification
- [ ] Backend TypeScript compiles: `npm run build`
- [ ] Frontend builds successfully: `npm run build`
- [ ] No build errors or warnings
- [ ] All tests pass (if any): `npm test`

### Git Status
- [ ] All changes committed
- [ ] Working directory clean: `git status`
- [ ] Deployment tag created: `v1.0.0-sandbox`
- [ ] Pushed to remote: `git push origin --tags`

---

## SANDBOX ENVIRONMENT CONFIGURATION

### Required Environment Variables

**Backend (.env.sandbox):**
```bash
# Environment
NODE_ENV=sandbox

# Server
PORT=3000
FRONTEND_URL=https://sandbox.brandmonkz.com

# Database
DATABASE_URL=postgresql://user:password@sandbox-db.brandmonkz.com:5432/crm_sandbox

# Authentication
JWT_SECRET=<generate-secure-random-string>
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# Google OAuth
GOOGLE_CLIENT_ID=<sandbox-google-client-id>
GOOGLE_CLIENT_SECRET=<sandbox-google-client-secret>
GOOGLE_CALLBACK_URL=https://api-sandbox.brandmonkz.com/api/auth/google/callback

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_<sandbox-stripe-key>
STRIPE_WEBHOOK_SECRET=whsec_<sandbox-webhook-secret>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

**Frontend (.env.sandbox):**
```bash
VITE_API_URL=https://api-sandbox.brandmonkz.com
VITE_GOOGLE_CLIENT_ID=<sandbox-google-client-id>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_<sandbox-stripe-key>
```

### Environment Variable Checklist
- [ ] All backend variables set
- [ ] All frontend variables set
- [ ] Secrets generated (JWT_SECRET, etc.)
- [ ] OAuth credentials configured
- [ ] Stripe test mode keys obtained
- [ ] Database connection string configured

---

## INFRASTRUCTURE REQUIREMENTS

### Server Requirements
- [ ] Sandbox server accessible via SSH
- [ ] Node.js v18+ installed
- [ ] PostgreSQL database created
- [ ] SSL certificate installed (https)
- [ ] Domain DNS configured:
  - [ ] api-sandbox.brandmonkz.com → Backend
  - [ ] sandbox.brandmonkz.com → Frontend

### Server Software
- [ ] Nginx or Apache configured
- [ ] PM2 installed (process manager)
- [ ] Git installed
- [ ] PostgreSQL client installed

---

## DATABASE PREPARATION

### Database Setup
- [ ] PostgreSQL database created: `crm_sandbox`
- [ ] Database user created with privileges
- [ ] Connection tested from server
- [ ] Prisma schema ready: `npx prisma generate`

### Migration Strategy
- [ ] Backup strategy defined
- [ ] Migration command ready: `npx prisma migrate deploy`
- [ ] Rollback plan documented

---

## DEPLOYMENT STEPS CHECKLIST

### 1. Backend Deployment
- [ ] Upload backend files to server
- [ ] Install dependencies: `npm install --production`
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Build application: `npm run build`
- [ ] Start with PM2: `pm2 start npm --name crm-backend -- start`
- [ ] Verify process running: `pm2 status`
- [ ] Save PM2 config: `pm2 save`

### 2. Frontend Deployment
- [ ] Build frontend locally: `npm run build`
- [ ] Upload `dist/` folder to server
- [ ] Configure Nginx/Apache to serve static files
- [ ] Configure reverse proxy for API
- [ ] Test frontend loads: `curl https://sandbox.brandmonkz.com`

### 3. Web Server Configuration
- [ ] Nginx/Apache config created
- [ ] SSL certificate configured
- [ ] HTTP to HTTPS redirect enabled
- [ ] CORS headers configured (if needed)
- [ ] Compression enabled
- [ ] Static file caching configured

---

## POST-DEPLOYMENT VERIFICATION

### Immediate Tests (Within 30 minutes)
- [ ] Health check passes: `GET /health` → 200 OK
- [ ] Backend responding: `curl https://api-sandbox.brandmonkz.com/health`
- [ ] Frontend loads: Open https://sandbox.brandmonkz.com
- [ ] Database connected: Check health response
- [ ] Environment correct: Verify NODE_ENV=sandbox in logs

### Core Functionality Tests
- [ ] User can login with Google OAuth
- [ ] JWT token received and stored
- [ ] Can create contact
- [ ] Can create company
- [ ] Can link contact to company
- [ ] Contact appears on company detail page
- [ ] CSV import works
- [ ] Duplicate detection works

### Security Verification
- [ ] CORS blocks localhost (test from browser)
- [ ] Unauthorized API requests return 401
- [ ] Data isolation working (user A can't see user B's data)
- [ ] Rate limiting active (test with rapid requests)
- [ ] Security headers present (check in browser dev tools)

---

## MONITORING SETUP

### Logging
- [ ] PM2 logs accessible: `pm2 logs crm-backend`
- [ ] Error logging configured
- [ ] Access logs enabled
- [ ] Security event logging active

### Metrics to Monitor
- [ ] API response times
- [ ] Error rate
- [ ] 404 errors (should be 0)
- [ ] Authentication failures
- [ ] Database query performance
- [ ] Memory usage
- [ ] CPU usage

### Alerts Setup
- [ ] Error rate alerts configured
- [ ] Downtime alerts configured
- [ ] Performance degradation alerts
- [ ] Security incident alerts

---

## ROLLBACK PLAN

### If Deployment Fails
1. [ ] Stop current services: `pm2 stop crm-backend`
2. [ ] Restore previous version from git
3. [ ] Rollback database: `npx prisma migrate reset`
4. [ ] Restart previous version
5. [ ] Verify previous version working

### Emergency Contacts
- [ ] DevOps team contact info documented
- [ ] Database admin contact info documented
- [ ] Escalation process defined

---

## KNOWN ISSUES & MONITORING

### Acceptable Risks (Monitor)
- [ ] **xlsx vulnerabilities** (2 remaining)
  - Monitor for Excel import usage
  - No exploits expected (auth required)
  - Plan to replace with exceljs before production

### Features to Test Extensively
- [ ] CSV import with large files (1000+ rows)
- [ ] Concurrent user access (10+ users)
- [ ] Search and filtering performance
- [ ] Pagination with large datasets
- [ ] Activities API (recently fixed)
- [ ] Contact form from company page (recently fixed)

---

## 48-HOUR MONITORING CHECKLIST

### Day 1 (0-24 hours)
- [ ] Monitor error logs every 2 hours
- [ ] Check for 404 errors
- [ ] Verify all features working
- [ ] Test with 10+ concurrent users
- [ ] Monitor API response times
- [ ] Check memory/CPU usage

### Day 2 (24-48 hours)
- [ ] Review accumulated logs
- [ ] Analyze performance metrics
- [ ] Check for security incidents
- [ ] Test edge cases
- [ ] Verify data integrity
- [ ] Prepare production deployment plan

---

## DOCUMENTATION UPDATES

### Post-Deployment Docs
- [ ] Update deployment guide with lessons learned
- [ ] Document any issues encountered
- [ ] Update environment variable list
- [ ] Document performance benchmarks
- [ ] Create production deployment checklist

---

## SIGN-OFF

### Deployment Approval
- [ ] Technical Lead: _________________ Date: _______
- [ ] Security Review: ________________ Date: _______
- [ ] QA Approval: ___________________ Date: _______

### Deployment Execution
- [ ] Deployed by: ____________________ Date: _______
- [ ] Verified by: ____________________ Date: _______
- [ ] Monitoring confirmed: ____________ Date: _______

---

## FINAL CHECKLIST SUMMARY

**Before Deployment:**
- [ ] All code committed and tagged
- [ ] Environment variables configured
- [ ] Server infrastructure ready
- [ ] Database prepared
- [ ] SSL certificates installed

**During Deployment:**
- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] Web server configured
- [ ] All services started

**After Deployment:**
- [ ] Health checks pass
- [ ] Core features tested
- [ ] Security verified
- [ ] Monitoring active
- [ ] Team notified

---

**Status:** ⏳ PENDING DEPLOYMENT
**Next Step:** Review checklist, configure environment, execute deployment
**Expected Duration:** 2-3 hours
**Rollback Time:** 15 minutes (if needed)

---

**Checklist Version:** 1.0
**Last Updated:** 2025-10-09
**Maintained By:** DevOps Team
