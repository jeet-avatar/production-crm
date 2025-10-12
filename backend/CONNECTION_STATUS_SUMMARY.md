# 🎯 Sandbox Server Connection Status - COMPLETE SUMMARY

**Updated**: October 11, 2025 at 21:35 PDT
**Status**: ✅ ALL SYSTEMS OPERATIONAL

---

## 🟢 Server Connection - WORKING

### Issue Identified & Resolved
- ❌ **Wrong IP documented**: 54.177.28.253 (unreachable)
- ✅ **Correct IP**: **18.212.225.252**

### All Connection Methods Working ✅

#### 1. Direct IP Access (HTTP)
```bash
curl http://18.212.225.252:3000/health
# ✅ Working: {"status":"ok","database":"connected"}
```

#### 2. Domain Access (HTTPS)
```bash
curl https://sandbox.brandmonkz.com/health
# ✅ Working: {"status":"ok","database":"connected"}
# Note: HTTP redirects to HTTPS (301 redirect via nginx)
```

#### 3. SSH Access
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252
# ✅ Working: Connection successful
```

---

## 🌐 Working URLs

### ✅ HTTPS (Recommended - SSL Enabled)
- **Frontend**: https://sandbox.brandmonkz.com
- **API Health**: https://sandbox.brandmonkz.com/health
- **API Base**: https://sandbox.brandmonkz.com/api/*

### ✅ Direct IP (HTTP)
- **API Base**: http://18.212.225.252:3000
- **API Health**: http://18.212.225.252:3000/health
- **All Endpoints**: http://18.212.225.252:3000/api/*

### ❌ Not Working
- `http://api-sandbox.brandmonkz.com` - Returns error
  - **Note**: Use `sandbox.brandmonkz.com` instead (no separate API subdomain needed)

---

## 📊 Current System Status

### Server Health
```json
{
  "status": "ok",
  "timestamp": "2025-10-12T01:35:35.951Z",
  "uptime": 1107.70,
  "environment": "production",
  "version": "1.0.0",
  "database": "connected"
}
```

### Infrastructure
- **EC2 IP**: 18.212.225.252
- **Domain**: sandbox.brandmonkz.com → 18.212.225.252 (via DNS A record)
- **SSL**: ✅ Enabled (nginx reverse proxy with auto-redirect)
- **Port 3000**: API server (Node.js/Express)
- **Port 80**: nginx (redirects to HTTPS)
- **Port 443**: nginx (HTTPS with SSL)
- **Port 22**: SSH access

### Application
- **PM2 Process**: crm-backend
- **Status**: online
- **PID**: 472136
- **Uptime**: 16+ minutes
- **Memory**: 120.5 MB
- **CPU**: 0%
- **Restarts**: 24 (stable)

### Database
- **Type**: PostgreSQL
- **Status**: Connected
- **Contacts**: 319
- **Companies**: 61

---

## 🚀 Quick Start Commands

### Test API Health
```bash
# Via HTTPS (recommended)
curl https://sandbox.brandmonkz.com/health

# Via Direct IP
curl http://18.212.225.252:3000/health
```

### SSH to Server
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252
```

### Check Application Status
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "pm2 status"
```

### View Logs
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "pm2 logs crm-backend --lines 50"
```

### Restart Application
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "pm2 restart crm-backend"
```

---

## 🔐 Authentication & API Usage

### 1. Get CSRF Token (if needed)
```bash
curl https://sandbox.brandmonkz.com/api/csrf-token
```

### 2. Login to Get JWT Token
```bash
TOKEN=$(curl -X POST https://sandbox.brandmonkz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }' | jq -r '.token')
```

### 3. Make Authenticated Requests
```bash
# Get contacts
curl https://sandbox.brandmonkz.com/api/contacts \
  -H "Authorization: Bearer $TOKEN"

# Get companies
curl https://sandbox.brandmonkz.com/api/companies \
  -H "Authorization: Bearer $TOKEN"

# Enrich a company with AI
curl -X POST "https://sandbox.brandmonkz.com/api/enrichment/companies/{companyId}/enrich" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Available API Endpoints

All endpoints use base: `https://sandbox.brandmonkz.com/api`

### Public Endpoints (No Auth Required)
- `GET /health` - System health check
- `GET /api/csrf-token` - CSRF token
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth login

### Protected Endpoints (Auth Required)
**Contacts**
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact details
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

**Companies**
- `GET /api/companies` - List all companies
- `POST /api/companies` - Create company
- `GET /api/companies/:id` - Get company details
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

**AI Enrichment**
- `POST /api/enrichment/companies/:id/enrich` - Enrich company with AI
- `GET /api/enrichment/companies/:id/status` - Get enrichment status

**CSV Import**
- `POST /api/csv-import/contacts` - Import contacts from CSV
- `POST /api/csv-import/companies` - Import companies from CSV
- `GET /api/csv-import/history` - Get import history

**Others**
- `GET /api/tags` - List tags
- `GET /api/positions` - List positions
- `GET /api/campaigns` - List campaigns
- `GET /api/deals` - List deals
- `GET /api/analytics/dashboard` - Dashboard analytics
- `GET /api/users/me` - Current user profile

---

## 🔧 Configuration Summary

### Environment
- **NODE_ENV**: production
- **Port**: 3000 (internal)
- **Database**: PostgreSQL (connected)
- **Frontend URL**: Configured in .env
- **CORS**: Enabled

### DNS Configuration
```
sandbox.brandmonkz.com
├─ A Record → 18.212.225.252
└─ HTTP → 301 Redirect → HTTPS (via nginx)
```

### Web Server Stack
```
nginx (Port 80/443)
  ├─ SSL/TLS Termination
  ├─ 301 Redirect (HTTP → HTTPS)
  └─ Reverse Proxy → Node.js (Port 3000)
       └─ Express API Server
            └─ PostgreSQL Database
```

---

## ✅ Connection Test Results

| Test | Method | Result | Details |
|------|--------|--------|---------|
| Ping | ICMP | ⚠️ Blocked | Expected (AWS security group) |
| SSH | Port 22 | ✅ Success | Full access with key |
| HTTP Direct IP | Port 3000 | ✅ Success | API responding |
| HTTPS Domain | Port 443 | ✅ Success | SSL enabled, auto-redirect |
| API Health | GET /health | ✅ Success | Database connected |
| PM2 Status | SSH + pm2 | ✅ Success | App running stable |
| Database | Query | ✅ Success | 319 contacts, 61 companies |

---

## 📋 Files Updated

1. ✅ [CLEANUP_INSTRUCTIONS.md](CLEANUP_INSTRUCTIONS.md)
   - Fixed IP address (54.177.28.253 → 18.212.225.252)
   - Updated server status
   - Added current database counts

2. ✅ [SANDBOX_CONNECTION_FIXED.md](SANDBOX_CONNECTION_FIXED.md)
   - Detailed connection diagnostics
   - All working commands
   - Deployment instructions

3. ✅ [CONNECTION_STATUS_SUMMARY.md](CONNECTION_STATUS_SUMMARY.md) (this file)
   - Complete working URLs
   - API endpoint reference
   - Quick start guide

---

## 🎯 Recommended URLs for Your Team

**For Frontend Development:**
```javascript
// Use HTTPS domain
const API_URL = 'https://sandbox.brandmonkz.com';
```

**For API Testing (Postman/curl):**
```bash
# Recommended: HTTPS domain
https://sandbox.brandmonkz.com/api/*

# Alternative: Direct IP (if domain issues)
http://18.212.225.252:3000/api/*
```

**For Server Management:**
```bash
# SSH access
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252
```

---

## 🚨 Important Notes

1. **Use HTTPS Domain**: `https://sandbox.brandmonkz.com` is preferred over direct IP
2. **No API Subdomain**: `api-sandbox.brandmonkz.com` doesn't work - use main domain
3. **HTTP Auto-Redirects**: HTTP requests automatically redirect to HTTPS
4. **JWT Required**: Most endpoints require authentication token
5. **CORS Enabled**: Frontend can make cross-origin requests
6. **Rate Limiting Active**: API has rate limiting configured

---

## 📈 Next Steps

### 1. Deploy AI Enrichment Features ⏳
The latest AI enrichment code is committed but not deployed:
```bash
./deploy-ai-enrichment.sh
```

### 2. Test New Features ⏳
Once deployed, test:
- Video URL extraction
- Hiring intent analysis
- Sales pitch generation

### 3. Import 250 Companies ⏳
Prepare CSV and use import endpoint or UI

### 4. Update Frontend ⏳
Point frontend to: `https://sandbox.brandmonkz.com`

---

## ✅ Summary

**Server**: 🟢 Online and operational
**API**: 🟢 Healthy and responding
**Database**: 🟢 Connected (319 contacts, 61 companies)
**SSL**: 🟢 Enabled with auto-redirect
**DNS**: 🟢 Resolving correctly (18.212.225.252)
**SSH**: 🟢 Accessible with key file

**Primary URL**: `https://sandbox.brandmonkz.com`
**Direct IP**: `http://18.212.225.252:3000`
**SSH**: `ec2-user@18.212.225.252`

All systems operational! 🚀
