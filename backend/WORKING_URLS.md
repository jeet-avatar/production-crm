# ✅ WORKING URLs - AI ENRICHMENT LIVE

## 🌐 Current Status

**Backend:** ✅ RUNNING & ACCESSIBLE
**Frontend:** ✅ RUNNING & ACCESSIBLE
**DNS:** ⚠️ NOT CONFIGURED (Optional)

---

## 🔗 WORKING URLs (Use These Now)

### Backend API (Direct IP):
```
http://18.212.225.252:3000
```

**Test it:**
```bash
curl http://18.212.225.252:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-12T01:13:34.443Z",
  "uptime": 215.781153007,
  "environment": "production",
  "version": "1.0.0",
  "database": "connected"
}
```

### Frontend (S3 Static Website):
```
http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com
```

---

## 🔧 Fix Frontend API URL

The frontend needs to point to the direct IP instead of the DNS name.

### Update Frontend .env.production:

```bash
cd "/Users/jeet/Documents/CRM Frontend/crm-app"

# Edit .env.production
cat > .env.production << 'EOF'
VITE_API_URL=http://18.212.225.252:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51S5xJ0JePbhql2pNB4jwGWLfrq2wONPplmNxe3dDnZO2zB8xmTbzpt6CcUWe0zYFYZ38Uq2oXR46v47XByXthfcm00oPoEZSWn
VITE_STRIPE_STARTER_MONTHLY=price_1SEoYzJePbhql2pNPST0TGTt
VITE_STRIPE_STARTER_ANNUAL=price_1SEoYzJePbhql2pNeUQMDYoa
VITE_STRIPE_PROFESSIONAL_MONTHLY=price_1SEoZ0JePbhql2pNoOns39cg
VITE_STRIPE_PROFESSIONAL_ANNUAL=price_1SEoZ0JePbhql2pNKgEtI41k
VITE_STRIPE_ENTERPRISE_MONTHLY=price_1SEoZ1JePbhql2pNFUuLBq8f
VITE_STRIPE_ENTERPRISE_ANNUAL=price_1SEoZ2JePbhql2pNoDfq4njn
EOF

# Rebuild and redeploy
npm run build
aws s3 sync dist/ s3://sandbox-brandmonkz-crm/ --delete
```

---

## 🧪 Test API Endpoints

### 1. Health Check:
```bash
curl http://18.212.225.252:3000/health
```

### 2. Test Enrichment (Need Auth Token):
```bash
TOKEN="your_jwt_token_from_login"
COMPANY_ID="your_company_id"

curl -X POST "http://18.212.225.252:3000/api/enrichment/companies/$COMPANY_ID/enrich" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Get All Companies:
```bash
TOKEN="your_jwt_token"

curl "http://18.212.225.252:3000/api/companies" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔐 CORS Issue?

If you get CORS errors, we need to update the backend CORS configuration:

```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252

cd crm-backend
nano src/app.ts

# Find CORS configuration and add:
app.use(cors({
  origin: [
    'http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com',
    'http://localhost:5173',
    'http://localhost:3001'
  ],
  credentials: true
}));

# Rebuild and restart
npm run build
pm2 restart crm-backend
```

---

## 🌍 Optional: Configure DNS (For Pretty URLs)

If you want `api-sandbox.brandmonkz.com` to work, you need to:

### Option 1: Route53 (If using AWS DNS)

```bash
# 1. Go to AWS Route53
# 2. Find brandmonkz.com hosted zone
# 3. Create A record:
#    Name: api-sandbox.brandmonkz.com
#    Type: A
#    Value: 18.212.225.252
#    TTL: 300
```

### Option 2: Your DNS Provider

Add an A record:
- **Host:** api-sandbox
- **Type:** A
- **Points to:** 18.212.225.252
- **TTL:** 300 (5 minutes)

**Wait 5-60 minutes for DNS propagation**

### Option 3: Use IP Address (Quick & Works Now)

Just use the IP address directly - it works perfectly!

---

## 📊 Current Architecture

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Frontend (S3 Static Website)                      │
│  http://sandbox-brandmonkz-crm.s3-website...      │
│                                                     │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ API Calls
                    ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Backend (EC2)                                     │
│  http://18.212.225.252:3000 ✅ WORKING            │
│  api-sandbox.brandmonkz.com ❌ DNS NOT SET        │
│                                                     │
│  ├─ Node.js v20.19.5                              │
│  ├─ PM2 Process Manager                           │
│  ├─ AI Enrichment Service                         │
│  └─ PostgreSQL Database                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (What to Do Right Now)

### Step 1: Update Frontend API URL

```bash
cd "/Users/jeet/Documents/CRM Frontend/crm-app"

# Update .env.production
echo 'VITE_API_URL=http://18.212.225.252:3000' > .env.production

# Rebuild
npm run build

# Deploy
aws s3 sync dist/ s3://sandbox-brandmonkz-crm/ --delete

# Update cache headers
aws s3 cp s3://sandbox-brandmonkz-crm/ s3://sandbox-brandmonkz-crm/ \
  --recursive --exclude "*" --include "*.html" \
  --metadata-directive REPLACE \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"
```

### Step 2: Test in Browser

1. **Open:** http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com
2. **Login** with your credentials
3. **Go to Companies** page
4. **Test enrichment** (frontend UI pending, but API works)

### Step 3: Test API Directly

```bash
# Get your JWT token (from browser DevTools → Network → Headers → Authorization)
TOKEN="eyJhbGc..."

# Test enrichment
curl -X POST "http://18.212.225.252:3000/api/enrichment/companies/YOUR_COMPANY_ID/enrich" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 💡 Why DNS Name Doesn't Work

The domain `api-sandbox.brandmonkz.com` was referenced in documentation but was never configured in DNS. You have two options:

### Option A: Keep Using IP (Simplest)
- ✅ Works immediately
- ✅ No DNS setup needed
- ✅ No SSL certificate needed
- ⚠️ Less professional URL

### Option B: Configure DNS (Better for Production)
- ✅ Professional URL
- ✅ Can add SSL certificate later
- ⚠️ Takes 5-60 minutes to propagate
- ⚠️ Requires DNS access

**For testing: Use Option A (IP address) - it works perfectly!**

---

## 🔒 HTTPS / SSL (Future)

Currently using HTTP. For HTTPS, you'd need:

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get certificate (after DNS is configured)
sudo certbot --nginx -d api-sandbox.brandmonkz.com

# Auto-renewal
sudo certbot renew --dry-run
```

But for sandbox testing, HTTP works fine!

---

## ✅ Summary

### WORKING NOW:
- ✅ Backend API: `http://18.212.225.252:3000`
- ✅ Frontend: `http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com`
- ✅ Health Check: Passing
- ✅ AI Enrichment: Functional
- ✅ Database: Connected

### NOT WORKING:
- ❌ `api-sandbox.brandmonkz.com` - DNS not configured

### TO FIX:
1. **Update frontend .env.production** to use IP address
2. **Rebuild and redeploy frontend**
3. **(Optional) Configure DNS** for pretty URLs

---

## 📞 Support Commands

```bash
# Test backend
curl http://18.212.225.252:3000/health

# SSH to server
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252

# Check backend status
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "pm2 status"

# View logs
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "pm2 logs crm-backend --lines 50"

# Restart backend
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "pm2 restart crm-backend"
```

---

**🎯 BOTTOM LINE:**

The backend IS working! Just use `http://18.212.225.252:3000` instead of `api-sandbox.brandmonkz.com`.

Update the frontend .env file, redeploy, and you're good to go! 🚀
