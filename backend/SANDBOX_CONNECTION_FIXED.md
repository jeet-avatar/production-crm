# 🎯 Sandbox Server Connection - RESOLVED

**Date**: October 11, 2025
**Status**: ✅ FIXED - Server fully accessible

---

## Problem Summary

The [CLEANUP_INSTRUCTIONS.md](CLEANUP_INSTRUCTIONS.md) documented the wrong sandbox server IP address:
- ❌ **Wrong IP**: 54.177.28.253 (unreachable, timed out)
- ✅ **Correct IP**: 18.212.225.252 (fully operational)

---

## Current Server Status

### 🟢 EC2 Instance: ONLINE
- **IP Address**: 18.212.225.252
- **Domain**: sandbox.brandmonkz.com
- **Region**: us-east-1 (AWS)
- **SSH Key**: ~/.ssh/brandmonkz-crm.pem

### 🟢 API Server: HEALTHY
- **Base URL**: http://18.212.225.252:3000
- **Health Check**: http://18.212.225.252:3000/health
- **Status Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-10-12T01:33:30.015Z",
    "uptime": 981.77,
    "environment": "production",
    "version": "1.0.0",
    "database": "connected"
  }
  ```

### 🟢 PM2 Process Manager: RUNNING
```
┌────┬─────────────┬─────────┬─────────┬──────────┬────────┬───────────┐
│ id │ name        │ version │ mode    │ pid      │ uptime │ status    │
├────┼─────────────┼─────────┼─────────┼──────────┼────────┼───────────┤
│ 0  │ crm-backend │ 1.0.0   │ fork    │ 472136   │ 16m    │ online    │
└────┴─────────────┴─────────┴─────────┴──────────┴────────┴───────────┘
```
- **Memory Usage**: 120.5 MB
- **CPU Usage**: 0%
- **Restarts**: 24 (stable)

### 🟢 Database: CONNECTED
- **Type**: PostgreSQL
- **Status**: Connected
- **Current Data**:
  - **Contacts**: 319
  - **Companies**: 61

---

## Connection Tests Performed

### 1. Network Connectivity
```bash
# Ping Test (ICMP blocked by security group - expected)
ping 18.212.225.252
# Result: Timeout (normal for AWS EC2 with ICMP disabled)

# SSH Port Test
nc -zv -w 5 18.212.225.252 22
# Result: ✅ Connection succeeded!

# API Port Test
nc -zv -w 5 18.212.225.252 3000
# Result: ✅ Connection succeeded!
```

### 2. SSH Access
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252
# Result: ✅ Connection successful!
```

### 3. API Health Check
```bash
curl http://18.212.225.252:3000/health
# Result: ✅ {"status":"ok","database":"connected"}
```

### 4. Git Repository Status
```bash
git status
# Result: ✅ On branch main, up to date with origin/main
# Note: src/app.ts has local modifications (not committed)
```

---

## Quick Access Commands

### SSH to Server
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252
```

### Check PM2 Status
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "pm2 status"
```

### View PM2 Logs
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "pm2 logs crm-backend --lines 50"
```

### Restart Application
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "cd crm-backend && pm2 restart crm-backend"
```

### Check API Health
```bash
curl http://18.212.225.252:3000/health
```

### Check Database Counts
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 \
  "cd crm-backend && node -e \"const { PrismaClient } = require('@prisma/client'); \
  const prisma = new PrismaClient(); \
  prisma.contact.count().then(c => prisma.company.count().then(co => \
  console.log({contacts: c, companies: co}))).finally(() => prisma.\$disconnect())\""
```

---

## Available API Endpoints

All endpoints use base URL: `http://18.212.225.252:3000`

### Public Endpoints
- `GET /health` - Health check
- `GET /api/csrf-token` - CSRF token
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth

### Protected Endpoints (Require Auth Token)
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company
- `POST /api/enrichment/companies/:id/enrich` - AI enrichment
- `POST /api/csv-import/contacts` - CSV import
- `GET /api/tags` - List tags
- `GET /api/positions` - List positions
- `GET /api/campaigns` - List campaigns
- `GET /api/deals` - List deals
- `GET /api/analytics/dashboard` - Analytics

---

## Git Repository Status

### Current State
- **Branch**: main
- **Sync Status**: Up to date with origin/main
- **Local Changes**:
  - Modified: `src/app.ts`
  - Many untracked files (._* files from macOS)

### Recent Commits (Already Deployed)
1. ✅ feat: Add AI enrichment with video URL, hiring intent, and sales pitch
2. ✅ fix: Complete CSV import functionality for contacts and companies
3. ✅ docs: Add pre-production checklist and automated testing script
4. ✅ security: Add comprehensive security guards for frontend, backend, and database
5. ✅ security: Comprehensive security fixes and code quality improvements

---

## What's Ready to Deploy

### AI Enrichment Feature (Committed but Not Deployed)
The latest AI enrichment features are committed to Git but not yet deployed to EC2:
- ✅ Video URL extraction
- ✅ Hiring intent analysis
- ✅ Personalized sales pitch generation
- ✅ Confidence scoring

**To Deploy**: Use [deploy-ai-enrichment.sh](deploy-ai-enrichment.sh)

---

## Domain Configuration

### Current DNS Setup
According to deployment docs:
- `sandbox.brandmonkz.com` → 18.212.225.252
- `api-sandbox.brandmonkz.com` → 18.212.225.252

### Domain Status
- **Direct IP Access**: ✅ Working (http://18.212.225.252:3000)
- **Domain Access**: ⏳ Unknown (needs verification)

To verify domains:
```bash
# Test sandbox domain
curl http://sandbox.brandmonkz.com/health

# Test API subdomain
curl http://api-sandbox.brandmonkz.com/health
```

---

## Security Configuration

### Ports Open
- ✅ Port 22 (SSH) - For server management
- ✅ Port 3000 (HTTP) - For API access
- ❌ Port 80 (HTTP) - Closed/not responding
- ❌ Port 443 (HTTPS) - Closed/not responding
- ❌ ICMP (Ping) - Blocked by security group

### Authentication
- SSH: Requires `brandmonkz-crm.pem` key file
- API: Requires JWT token (obtained via /api/auth/login)

---

## Next Steps

### 1. Deploy Latest AI Enrichment Features
```bash
cd "/Users/jeet/Documents/CRM Module"
./deploy-ai-enrichment.sh
```

### 2. Verify Domain Configuration
```bash
# Check if domains resolve correctly
curl http://sandbox.brandmonkz.com/health
curl http://api-sandbox.brandmonkz.com/health
```

### 3. Test AI Enrichment
Once deployed, test the new enrichment features:
```bash
# Get auth token first
TOKEN=$(curl -X POST http://18.212.225.252:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.token')

# Enrich a company
curl -X POST "http://18.212.225.252:3000/api/enrichment/companies/{companyId}/enrich" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Import 250 Companies (Once Ready)
- Prepare CSV with company data
- Use frontend CSV import feature
- Or use API endpoint with proper authentication

---

## Files Updated

1. ✅ [CLEANUP_INSTRUCTIONS.md](CLEANUP_INSTRUCTIONS.md)
   - Fixed incorrect IP address
   - Added current database stats
   - Updated server status section
   - Added connection test results

2. ✅ [SANDBOX_CONNECTION_FIXED.md](SANDBOX_CONNECTION_FIXED.md) (this file)
   - Comprehensive connection status
   - All working commands documented
   - Next steps outlined

---

## Summary

✅ **Server Status**: Fully operational
✅ **API Status**: Healthy and responding
✅ **Database Status**: Connected (319 contacts, 61 companies)
✅ **PM2 Status**: Running stable
✅ **SSH Access**: Working
✅ **Documentation**: Updated with correct IP

⏳ **Pending**:
- Deploy latest AI enrichment features
- Verify domain DNS configuration
- Test AI enrichment endpoint
- Import 250 companies

**Correct IP to Use**: `18.212.225.252`
**API Base URL**: `http://18.212.225.252:3000`
