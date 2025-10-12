# Pre-Production Checklist
## Sandbox Testing → Production Deployment

**Date**: October 10, 2025
**Project**: CRM Marketing Automation Platform
**Current Status**: Security Hardened, Ready for Testing

---

## 📋 Table of Contents

1. [Environment Configuration](#1-environment-configuration)
2. [Security Verification](#2-security-verification)
3. [Database & Migrations](#3-database--migrations)
4. [API Testing](#4-api-testing)
5. [Frontend Integration](#5-frontend-integration)
6. [External Services](#6-external-services)
7. [Performance Testing](#7-performance-testing)
8. [Monitoring & Logging](#8-monitoring--logging)
9. [Backup & Recovery](#9-backup--recovery)
10. [Documentation](#10-documentation)
11. [Final Deployment](#11-final-deployment)

---

## 1. Environment Configuration

### ✅ Environment Variables

#### Backend (.env files)

**Required Variables**:
```bash
# Check all required environment variables exist
cd /Users/jeet/Documents/CRM\ Module

# Core Application
□ NODE_ENV=sandbox|production
□ PORT=5000
□ FRONTEND_URL=https://sandbox.brandmonkz.com

# Database
□ DATABASE_URL=postgresql://...
□ DB_HOST=localhost
□ DB_PORT=5432
□ DB_NAME=crm_db
□ DB_USER=postgres
□ DB_PASSWORD=***

# Authentication
□ JWT_SECRET=*** (256-bit minimum)
□ JWT_EXPIRES_IN=7d
□ BCRYPT_ROUNDS=12

# AWS Services
□ AWS_REGION=us-east-1
□ AWS_ACCESS_KEY_ID=***
□ AWS_SECRET_ACCESS_KEY=***
□ AWS_S3_BUCKET=crm-uploads
□ AWS_SES_FROM_EMAIL=noreply@brandmonkz.com

# Email Services
□ SMTP_HOST=***
□ SMTP_PORT=587
□ SMTP_USER=***
□ SMTP_PASSWORD=***

# Redis (if used)
□ REDIS_URL=redis://localhost:6379

# Stripe
□ STRIPE_SECRET_KEY=***
□ STRIPE_PUBLISHABLE_KEY=***
□ STRIPE_WEBHOOK_SECRET=***

# Rate Limiting
□ RATE_LIMIT_WINDOW_MS=900000
□ RATE_LIMIT_MAX_REQUESTS=1000

# GoDaddy (if used)
□ GODADDY_API_KEY=***
□ GODADDY_API_SECRET=***

# AI Services
□ ANTHROPIC_API_KEY=*** (for Claude)
```

**Verification Commands**:
```bash
# Check if .env files exist
ls -la .env .env.production .env.deploy

# Verify no hardcoded secrets in code
grep -r "sk_live_" src/
grep -r "pk_live_" src/
grep -r "password.*=.*['\"]" src/

# Test environment loading
npm run build
node -e "require('dotenv').config(); console.log('✅ Env loaded:', !!process.env.DATABASE_URL)"
```

**Status**: ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

## 2. Security Verification

### ✅ Security Guards Testing

**Test All Security Guards**:

```bash
cd /Users/jeet/Documents/CRM\ Module

# 1. Test Input Sanitization
curl -X POST http://localhost:5000/api/test \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(\"xss\")</script>"}'
# Expected: HTML entities escaped

# 2. Test SQL Injection Prevention
curl -X GET "http://localhost:5000/api/contacts?search='; DROP TABLE users--"
# Expected: 400 Bad Request with "Invalid input detected"

# 3. Test Email Validation
curl -X POST http://localhost:5000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid@localhost"}'
# Expected: 400 Bad Request with "Invalid email address"

# 4. Test URL Validation
curl -X POST http://localhost:5000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url":"file:///etc/passwd"}'
# Expected: 400 Bad Request with "Invalid URL protocol"

# 5. Test Rate Limiting
for i in {1..1001}; do curl http://localhost:5000/api/health; done
# Expected: 429 Too Many Requests after 1000 requests

# 6. Test CSRF Protection
curl -X POST http://localhost:5000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test"}'
# Expected: 403 CSRF token missing (if no JWT)

# 7. Test File Upload Validation
curl -X POST http://localhost:5000/api/contacts/csv-import \
  -F "files=@malicious.exe"
# Expected: 400 Bad Request with "Invalid file type"
```

**Checklist**:
- [ ] Input sanitization working
- [ ] SQL injection blocked
- [ ] Email validation enforced
- [ ] URL validation active
- [ ] File upload restrictions working
- [ ] Rate limiting functional
- [ ] CSRF protection active
- [ ] Security headers present
- [ ] JWT validation working
- [ ] Request size limits enforced
- [ ] Suspicious activity logging

### ✅ Security Scans

**Run All Security Scans**:
```bash
# Semgrep
npm run semgrep
# Expected: Known issues only, no new critical findings

# Trivy
npm run trivy:critical
# Expected: 0 CRITICAL in production dependencies

# npm audit
npm audit --production
# Expected: 0 vulnerabilities in production

# SonarQube (if configured)
npm run sonar
```

**Checklist**:
- [ ] Semgrep scan passed
- [ ] Trivy scan passed
- [ ] npm audit clean (production)
- [ ] No secrets in code
- [ ] No hardcoded credentials

---

## 3. Database & Migrations

### ✅ Database Setup

**Verify Database**:
```bash
# Check Prisma schema
npx prisma validate

# Generate Prisma Client
npx prisma generate

# Check migration status
npx prisma migrate status

# View pending migrations
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma

# Create database backup
pg_dump -U postgres crm_db > backup_$(date +%Y%m%d).sql
```

**Test Database Connection**:
```bash
# Test connection
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✅ Database connected'))
  .catch(e => console.error('❌ Connection failed:', e))
  .finally(() => prisma.\$disconnect());
"
```

**Checklist**:
- [ ] Prisma schema valid
- [ ] All migrations applied
- [ ] Database connection working
- [ ] Indexes created
- [ ] Constraints in place
- [ ] Seed data loaded (if needed)
- [ ] Backup created

### ✅ Data Migration

**If migrating from old database**:
- [ ] Export data from old system
- [ ] Transform data to new schema
- [ ] Validate data integrity
- [ ] Test import in sandbox
- [ ] Create rollback plan

---

## 4. API Testing

### ✅ Core API Endpoints

**Authentication Routes** (`/api/auth`):
```bash
# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!@#",
    "firstName":"Test",
    "lastName":"User"
  }'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Get token for subsequent requests
TOKEN="<jwt_token_from_login>"
```

**Test All Routes**:
```bash
# Health check
curl http://localhost:5000/health

# Contacts
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/contacts

# Companies
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/companies

# Deals
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/deals

# Campaigns
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/campaigns

# Email Templates
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/email-templates

# Dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/dashboard
```

**Checklist**:
- [ ] All GET endpoints working
- [ ] All POST endpoints working
- [ ] All PUT/PATCH endpoints working
- [ ] All DELETE endpoints working
- [ ] Proper error responses
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] Pagination working
- [ ] Filtering working
- [ ] Sorting working

---

## 5. Frontend Integration

### ✅ Frontend Testing

**Verify Frontend Connection**:
```bash
cd /Users/jeet/Documents/CRM\ Frontend/crm-app

# Check environment variables
cat .env
# Required:
# VITE_API_URL=https://api.sandbox.brandmonkz.com
# VITE_STRIPE_PUBLISHABLE_KEY=***

# Build frontend
npm run build

# Test build
npm run preview
```

**Test User Flows**:
- [ ] User registration works
- [ ] User login works
- [ ] Dashboard loads
- [ ] Contact management (CRUD)
- [ ] Company management (CRUD)
- [ ] Deal management (CRUD)
- [ ] Campaign creation
- [ ] Email sending
- [ ] File uploads (CSV, images)
- [ ] Search functionality
- [ ] Filters working
- [ ] Logout works

**Browser Testing**:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile responsive
- [ ] Tablet responsive

---

## 6. External Services

### ✅ AWS Services

**Test S3**:
```bash
# Test file upload
aws s3 cp test.txt s3://$AWS_S3_BUCKET/test.txt
aws s3 ls s3://$AWS_S3_BUCKET/

# Test from application
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg"
```

**Test SES**:
```bash
# Send test email
aws ses send-email \
  --from "noreply@brandmonkz.com" \
  --to "test@example.com" \
  --subject "Test Email" \
  --text "Testing SES"

# Check sending limits
aws ses get-send-quota
```

**Test SNS** (if used):
```bash
aws sns list-topics
aws sns publish --topic-arn <arn> --message "Test"
```

**Checklist**:
- [ ] S3 uploads working
- [ ] S3 downloads working
- [ ] SES sending emails
- [ ] SES verified sender
- [ ] SNS notifications working (if used)
- [ ] AWS credentials valid
- [ ] IAM permissions correct

### ✅ Stripe Integration

**Test Stripe**:
```bash
# Use Stripe CLI for testing
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# Test subscription creation
curl -X POST http://localhost:5000/api/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priceId":"price_xxx",
    "paymentMethodId":"pm_card_visa"
  }'
```

**Checklist**:
- [ ] Stripe connection working
- [ ] Test payment successful
- [ ] Webhook endpoint configured
- [ ] Webhook signature validation working
- [ ] Subscription creation working
- [ ] Invoice generation working
- [ ] Payment failed handling

### ✅ Email Service (SMTP/SendGrid/etc.)

**Test Email Sending**:
```bash
# Test via API
curl -X POST http://localhost:5000/api/campaigns/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId":"xxx",
    "testEmail":"test@example.com"
  }'
```

**Checklist**:
- [ ] SMTP connection working
- [ ] Email sending successful
- [ ] Email tracking working
- [ ] Unsubscribe links working
- [ ] Email templates rendering
- [ ] Attachments working

---

## 7. Performance Testing

### ✅ Load Testing

**Basic Load Test**:
```bash
# Install Apache Bench (if not installed)
# brew install apache-bench (macOS)

# Test with 100 concurrent users, 1000 requests
ab -n 1000 -c 100 http://localhost:5000/api/health

# Test authenticated endpoint
ab -n 1000 -c 100 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/contacts
```

**Performance Benchmarks**:
- [ ] API response time < 200ms (95th percentile)
- [ ] Database queries < 100ms
- [ ] File uploads < 5s (10MB)
- [ ] Campaign send < 1s per email
- [ ] Page load time < 2s
- [ ] No memory leaks
- [ ] CPU usage < 70% under load

### ✅ Database Performance

**Check Database Performance**:
```sql
-- Slow query log
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY abs(correlation) DESC;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Checklist**:
- [ ] All queries optimized
- [ ] Proper indexes created
- [ ] No N+1 queries
- [ ] Connection pooling configured
- [ ] Query timeout set

---

## 8. Monitoring & Logging

### ✅ Logging Setup

**Verify Logging**:
```bash
# Check log files
ls -lh logs/

# Test Winston logging
node -e "
const { logger } = require('./dist/utils/logger');
logger.info('✅ Info log test');
logger.warn('⚠️  Warn log test');
logger.error('❌ Error log test');
"

# Check log rotation
cat logs/app.log | wc -l
```

**Checklist**:
- [ ] Application logs working
- [ ] Error logs capturing errors
- [ ] Security logs recording threats
- [ ] Access logs tracking requests
- [ ] Log rotation configured
- [ ] Log aggregation setup (optional)

### ✅ Monitoring

**Health Checks**:
```bash
# Application health
curl http://localhost:5000/health

# Database health
curl http://localhost:5000/health/db

# Redis health (if used)
curl http://localhost:5000/health/redis
```

**Checklist**:
- [ ] Health endpoint working
- [ ] Metrics collection (optional)
- [ ] Error tracking (Sentry, etc.)
- [ ] Uptime monitoring
- [ ] Alert configuration

---

## 9. Backup & Recovery

### ✅ Backup Strategy

**Database Backup**:
```bash
# Create backup script
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
pg_dump -U postgres crm_db > $BACKUP_DIR/crm_db_$TIMESTAMP.sql
gzip $BACKUP_DIR/crm_db_$TIMESTAMP.sql
# Upload to S3
aws s3 cp $BACKUP_DIR/crm_db_$TIMESTAMP.sql.gz s3://crm-backups/
EOF

chmod +x scripts/backup.sh
./scripts/backup.sh
```

**Test Recovery**:
```bash
# Restore from backup
gunzip -c backup_20251010.sql.gz | psql -U postgres crm_db_test
```

**Checklist**:
- [ ] Automated daily backups
- [ ] Backup retention policy (30 days)
- [ ] Off-site backup storage (S3)
- [ ] Recovery procedure documented
- [ ] Recovery tested successfully
- [ ] File backup strategy
- [ ] Configuration backup

---

## 10. Documentation

### ✅ Documentation Checklist

**Required Documentation**:
- [ ] README.md updated
- [ ] API documentation complete
- [ ] Deployment guide written
- [ ] Environment setup guide
- [ ] Troubleshooting guide
- [ ] Security documentation
- [ ] Database schema documented
- [ ] Architecture diagrams
- [ ] User manual
- [ ] Admin guide

**Existing Documentation**:
- ✅ FINAL_SECURITY_VERIFICATION_REPORT.md
- ✅ SECURITY_FIXES_SUMMARY.md
- ✅ CODE_QUALITY_FIX_GUIDE.md
- ✅ TRIVY_SETUP_GUIDE.md
- ✅ This checklist

---

## 11. Final Deployment

### ✅ Sandbox Deployment

**Deploy to Sandbox**:
```bash
# 1. Build application
npm run build

# 2. Run deployment script
./scripts/deploy-to-sandbox.sh

# 3. Verify deployment
curl https://api.sandbox.brandmonkz.com/health

# 4. Check logs
ssh ec2-user@<sandbox-ip> "tail -f /var/www/crm-backend/logs/app.log"
```

**Checklist**:
- [ ] Code pushed to repository
- [ ] Build successful
- [ ] Deployed to sandbox
- [ ] Migrations applied
- [ ] Environment variables set
- [ ] Services restarted
- [ ] Health check passing
- [ ] SSL certificate valid

### ✅ Sandbox Testing

**Smoke Tests**:
- [ ] Application loads
- [ ] Login works
- [ ] Core features working
- [ ] No console errors
- [ ] No API errors
- [ ] Email sending works
- [ ] File uploads work
- [ ] Payments work (test mode)

**User Acceptance Testing (UAT)**:
- [ ] Business stakeholders tested
- [ ] All critical flows validated
- [ ] Edge cases tested
- [ ] Mobile tested
- [ ] Performance acceptable
- [ ] Security verified

### ✅ Production Deployment

**Pre-Production Final Checks**:
- [ ] All checklist items complete
- [ ] Sandbox testing passed
- [ ] UAT approved
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Team notified
- [ ] Maintenance window scheduled

**Production Deployment Steps**:
```bash
# 1. Create production backup
./scripts/backup.sh production

# 2. Deploy to production
./scripts/deploy-to-production.sh

# 3. Run migrations
npm run prisma:deploy

# 4. Verify deployment
curl https://api.brandmonkz.com/health

# 5. Monitor for 30 minutes
# Watch logs, metrics, errors
```

**Post-Deployment Verification**:
- [ ] Application running
- [ ] Health check passing
- [ ] No errors in logs
- [ ] Key features working
- [ ] Monitor for 24 hours
- [ ] Team notified of success

---

## 📊 Testing Status Dashboard

### Backend API
| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | ⬜ | Register, login, JWT |
| Contacts API | ⬜ | CRUD operations |
| Companies API | ⬜ | CRUD operations |
| Deals API | ⬜ | CRUD operations |
| Campaigns API | ⬜ | Send, track |
| File Uploads | ⬜ | CSV, images |
| Security Guards | ⬜ | All 11 guards |

### Frontend
| Component | Status | Notes |
|-----------|--------|-------|
| Login Page | ⬜ | |
| Dashboard | ⬜ | |
| Contacts | ⬜ | |
| Companies | ⬜ | |
| Deals | ⬜ | |
| Campaigns | ⬜ | |

### External Services
| Service | Status | Notes |
|---------|--------|-------|
| AWS S3 | ⬜ | File storage |
| AWS SES | ⬜ | Email sending |
| Stripe | ⬜ | Payments |
| Database | ⬜ | PostgreSQL |

### Security
| Check | Status | Notes |
|-------|--------|-------|
| Semgrep Scan | ⬜ | |
| Trivy Scan | ⬜ | |
| npm audit | ⬜ | |
| Security Guards | ⬜ | |

---

## 🚨 Known Issues / Blockers

| Issue | Severity | Status | Owner |
|-------|----------|--------|-------|
| - | - | - | - |

---

## 📝 Sign-Off

### Testing Team
- [ ] QA Lead: ___________________ Date: _______
- [ ] Developer: ___________________ Date: _______
- [ ] Security: ___________________ Date: _______

### Business Team
- [ ] Product Manager: ___________________ Date: _______
- [ ] Business Stakeholder: ___________________ Date: _______

### Deployment Team
- [ ] DevOps Lead: ___________________ Date: _______
- [ ] Production Approved: ___________________ Date: _______

---

## 🔧 Quick Commands Reference

```bash
# Start application
npm run dev

# Build application
npm run build

# Run tests
npm test

# Security scans
npm run semgrep
npm run trivy:critical
npm audit

# Database
npx prisma migrate deploy
npx prisma studio

# Deployment
./scripts/deploy-to-sandbox.sh
./scripts/deploy-to-production.sh

# Logs
tail -f logs/app.log
pm2 logs

# Backup
./scripts/backup.sh
```

---

**Created**: October 10, 2025
**Last Updated**: October 10, 2025
**Version**: 1.0
**Status**: Ready for Testing ✅

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
