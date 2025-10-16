# 🚀 QUICK START - Production Deployment
## BrandMonkz CRM → brandmonkz.com

**Total Time:** ~4-6 hours
**Prerequisites:** All API keys generated (see API_KEYS_GENERATION_CHECKLIST.md)

---

## 📋 PRE-FLIGHT CHECKLIST

Before you start, make sure you have:

- [ ] Completed `API_KEYS_GENERATION_CHECKLIST.md` (ALL 8 steps)
- [ ] AWS account with admin access
- [ ] Domain `brandmonkz.com` ready
- [ ] Password manager with all credentials
- [ ] 4-6 hours of uninterrupted time
- [ ] Read `PRODUCTION_DEPLOYMENT_SOC2.md`

---

## 🎯 DEPLOYMENT PHASES

### Phase 1: AWS Infrastructure (90 min)

**What you'll create:**
- VPC with public/private subnets
- Security groups
- RDS PostgreSQL database
- Application Load Balancer
- EC2 instance
- S3 bucket for frontend
- CloudFront distribution
- SSL certificate

**Action:** Follow Section 2 of `PRODUCTION_DEPLOYMENT_SOC2.md`

---

### Phase 2: Database Setup (30 min)

**What you'll do:**
- Create production database
- Set up database user
- Configure backup retention
- Enable encryption
- Run migrations

**Commands:**
```bash
# Connect to RDS
psql -h brandmonkz-prod-db.xxxxx.rds.amazonaws.com \
     -U postgres \
     -d postgres

# Create database and user (use password from Step 1)
CREATE USER crm_prod_app WITH PASSWORD 'YOUR_GENERATED_PASSWORD';
CREATE DATABASE brandmonkz_crm_production;
GRANT ALL PRIVILEGES ON DATABASE brandmonkz_crm_production TO crm_prod_app;
```

---

### Phase 3: Backend Deployment (60 min)

**What you'll do:**
- SSH to EC2
- Install dependencies
- Clone repository
- Configure environment variables
- Run migrations
- Start application with PM2

**Key Commands:**
```bash
# SSH to EC2
ssh -i brandmonkz-prod-key.pem ec2-user@<EC2-IP>

# Clone repo
git clone https://github.com/jeet-avatar/production-crm.git
cd production-crm/backend

# Install and build
npm install --production
npm run build

# Configure environment (use your generated keys!)
nano .env

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Start with PM2
pm2 start dist/server.js --name brandmonkz-crm
pm2 save
pm2 startup
```

---

### Phase 4: Frontend Deployment (30 min)

**What you'll do:**
- Build frontend with production config
- Upload to S3
- Configure CloudFront
- Set up cache invalidation

**Key Commands:**
```bash
# On your local machine
cd /Users/jeet/Documents/production-crm/frontend

# Create production config
echo "VITE_API_URL=https://api.brandmonkz.com" > .env.production

# Build
npm run build

# Deploy to S3
aws s3 sync dist/ s3://brandmonkz-crm-frontend/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id EXXXXX \
  --paths "/*"
```

---

### Phase 5: DNS Configuration (30 min)

**What you'll do:**
- Point domain to CloudFront
- Configure API subdomain
- Set up SSL
- Verify HTTPS

**DNS Records to Create:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | CloudFront Distribution | 300 |
| A | www | CloudFront Distribution | 300 |
| A | api | ALB DNS Name | 300 |
| CNAME | _acm-validation | ACM Validation Value | 300 |

---

### Phase 6: Security Configuration (45 min)

**What you'll do:**
- Configure security headers
- Set up WAF rules
- Enable CloudWatch logs
- Configure GuardDuty
- Test security

**Security Headers to Verify:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

---

### Phase 7: Testing & Validation (60 min)

**What you'll test:**
- [ ] Frontend loads at https://brandmonkz.com
- [ ] Backend API responds at https://api.brandmonkz.com/health
- [ ] SSL certificate valid (A+ rating)
- [ ] User can sign up and log in
- [ ] Google OAuth works
- [ ] AI enrichment functions
- [ ] Email campaigns send
- [ ] Database writes work
- [ ] All pages load
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile responsive

**Test Commands:**
```bash
# Health check
curl https://api.brandmonkz.com/health

# SSL test
curl -I https://brandmonkz.com | grep -i strict-transport

# Test login
curl -X POST https://api.brandmonkz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

### Phase 8: Monitoring Setup (30 min)

**What you'll configure:**
- CloudWatch dashboards
- Alarms for errors
- Uptime monitoring
- Performance metrics

**Critical Alarms:**
- CPU utilization > 80%
- Memory utilization > 80%
- API error rate > 5%
- Database connections > 80%
- Disk space < 20%

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue: "502 Bad Gateway"
**Cause:** Backend not running or security group blocking
**Fix:**
```bash
pm2 status  # Check if running
pm2 logs    # Check for errors
# Verify security group allows ALB → EC2 on port 3000
```

### Issue: "Database connection failed"
**Cause:** Wrong credentials or security group
**Fix:**
```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check security group allows EC2 → RDS on port 5432
```

### Issue: "CORS errors"
**Cause:** FRONTEND_URL mismatch
**Fix:**
```bash
# In backend .env, ensure:
FRONTEND_URL=https://brandmonkz.com

# Restart PM2
pm2 restart brandmonkz-crm
```

### Issue: "SSL certificate not trusted"
**Cause:** Certificate not fully propagated
**Fix:**
- Wait 15-30 minutes for DNS propagation
- Verify ACM certificate status is "Issued"
- Check CloudFront uses correct certificate ARN

---

## ✅ POST-DEPLOYMENT CHECKLIST

After deployment is complete:

### Functional Tests
- [ ] Can access https://brandmonkz.com
- [ ] Can sign up new user
- [ ] Can log in
- [ ] Google OAuth works
- [ ] Can create contact
- [ ] Can create company
- [ ] Can run AI enrichment
- [ ] Can create campaign
- [ ] Email sending works
- [ ] CSV import works
- [ ] All pages render correctly

### Security Tests
- [ ] HTTPS enforced (no HTTP access)
- [ ] Security headers present
- [ ] No exposed .env files
- [ ] No exposed secrets in logs
- [ ] MFA enabled on AWS
- [ ] Security groups configured correctly
- [ ] WAF enabled
- [ ] GuardDuty active
- [ ] CloudTrail logging

### Performance Tests
- [ ] Page load < 3 seconds
- [ ] API response < 500ms
- [ ] Database queries < 100ms
- [ ] No memory leaks
- [ ] PM2 running stable

### Compliance Tests
- [ ] GDPR cookie consent working
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Data encryption verified
- [ ] Backup tested
- [ ] Logs retention 90 days

---

## 📊 SUCCESS METRICS

Deployment is successful when:

| Metric | Target | Status |
|--------|--------|--------|
| Uptime | 99.9% | [ ] |
| Response Time (p95) | < 500ms | [ ] |
| Error Rate | < 0.1% | [ ] |
| SSL Rating | A+ | [ ] |
| Database Connections | < 50 | [ ] |
| CPU Usage | < 70% | [ ] |
| Memory Usage | < 70% | [ ] |

---

## 🎉 YOU'RE LIVE!

Once all checks pass:

1. [ ] Announce to team
2. [ ] Update status page
3. [ ] Monitor for 24 hours
4. [ ] Schedule SOC 2 audit
5. [ ] Document any issues
6. [ ] Celebrate! 🎊

---

## 📞 EMERGENCY CONTACTS

**If something goes wrong:**

- Technical Issues: jeetnair.in@gmail.com
- AWS Support: Create Premium Support Case
- Database Issues: Check RDS CloudWatch logs
- Frontend Issues: Check CloudFront + S3
- Security Issues: Isolate immediately, document, notify

**Rollback Plan:**
```bash
# Rollback backend
pm2 stop brandmonkz-crm
git checkout previous-working-commit
npm run build
pm2 restart brandmonkz-crm

# Rollback frontend
aws s3 sync s3://brandmonkz-crm-frontend-backup/ \
  s3://brandmonkz-crm-frontend/ --delete
```

---

## 📚 ADDITIONAL RESOURCES

- Full Deployment Guide: `PRODUCTION_DEPLOYMENT_SOC2.md`
- API Keys Guide: `API_KEYS_GENERATION_CHECKLIST.md`
- Main README: `README.md`
- GitHub Repository: https://github.com/jeet-avatar/production-crm

---

**GOOD LUCK!** 🚀

**Remember:** Take your time, follow the checklist, and don't skip security steps!

---

**Deployment Log:**

| Phase | Start Time | End Time | Status | Notes |
|-------|------------|----------|--------|-------|
| 1. Infrastructure | | | [ ] | |
| 2. Database | | | [ ] | |
| 3. Backend | | | [ ] | |
| 4. Frontend | | | [ ] | |
| 5. DNS | | | [ ] | |
| 6. Security | | | [ ] | |
| 7. Testing | | | [ ] | |
| 8. Monitoring | | | [ ] | |

**Total Time:** ________ hours

**Deployed by:** ________________

**Date:** ________________

**Production URL:** https://brandmonkz.com
