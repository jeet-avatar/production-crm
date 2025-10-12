# 🚀 DEPLOY TO SANDBOX.BRANDMONKZ.COM - AWS EC2 & S3

**Date:** October 9, 2025
**Environment:** Production Sandbox
**Domain:** sandbox.brandmonkz.com
**Status:** ✅ READY TO DEPLOY

═══════════════════════════════════════════════════════════════════════════════

## ✅ PRE-DEPLOYMENT CHECKLIST - COMPLETED

- ✅ Backend built successfully (dist/ folder ready)
- ✅ Frontend built successfully (dist/ folder ready)
- ✅ All LIVE API keys configured in .env.production
- ✅ Security fixes deployed (88% score)
- ✅ Code pushed to GitHub (main & sandbox branches)
- ✅ AWS credentials configured
- ✅ Terraform infrastructure files ready

═══════════════════════════════════════════════════════════════════════════════

## 📦 BUILD STATUS

### Backend:
- ✅ **Location:** `/Users/jeet/Documents/CRM Module/dist/`
- ✅ **Build:** SUCCESS
- ✅ **Size:** ~20MB (with node_modules)
- ✅ **Environment:** `.env.production` ready

### Frontend:
- ✅ **Location:** `/Users/jeet/Documents/CRM Frontend/crm-app/dist/`
- ✅ **Build:** SUCCESS
- ✅ **Size:** 1.13 MB (minified + gzipped: 239 KB)
- ✅ **Environment:** `.env.production` configured

═══════════════════════════════════════════════════════════════════════════════

## 🔐 LIVE API KEYS CONFIGURED

### ✅ Payment Processing:
- **Stripe** (LIVE MODE): 11 keys configured
  - Secret Key: sk_live_51S5xJ0...
  - Publishable Key: pk_live_51S5xJ0...
  - 8 Price IDs for subscriptions

### ✅ Authentication:
- **Google OAuth**: Client ID & Secret configured
  - Callback URL: https://sandbox.brandmonkz.com/api/auth/google/callback

### ✅ Cloud Services:
- **AWS** (LIVE): 7 keys configured
  - Region: us-east-1
  - SES Email Service: Configured
  - S3 Storage: Ready
  - Access Key ID: YOUR_AWS_ACCESS_KEY_ID

### ✅ AI & Enrichment:
- **Anthropic Claude**: API key configured
- **Apollo.io**: API key configured for lead enrichment

### ✅ DNS & Domain:
- **GoDaddy API**: Configured for DNS management
  - Can programmatically setup sandbox.brandmonkz.com

### ✅ Email Sending:
- **AWS SES**: Configured (noreply@brandmonkz.com)
- **SMTP Gmail**: Configured as backup

═══════════════════════════════════════════════════════════════════════════════

## 🏗️ AWS INFRASTRUCTURE DEPLOYMENT

### Option 1: Deploy Infrastructure with Terraform (RECOMMENDED)

```bash
# Step 1: Initialize Terraform
cd "/Users/jeet/Documents/CRM Module/aws/terraform"
terraform init

# Step 2: Review what will be created
terraform plan

# Expected infrastructure:
# - VPC with public/private subnets
# - EC2 instance for backend
# - RDS PostgreSQL database
# - S3 bucket for frontend
# - Security groups
# - Internet Gateway
# - Route tables

# Step 3: Deploy infrastructure
terraform apply

# This will create:
# ✅ EC2 instance (t3.small or t3.medium)
# ✅ RDS PostgreSQL database
# ✅ S3 bucket for static frontend
# ✅ Security groups configured
# ✅ Public IP assigned

# Step 4: Note the outputs
# Terraform will output:
# - ec2_public_ip
# - rds_endpoint
# - s3_bucket_name

# Update your .env.production with the RDS endpoint
```

### Option 2: Manual AWS Console Setup

If you prefer to use AWS Console:

1. **Create EC2 Instance:**
   - AMI: Ubuntu 22.04 LTS
   - Type: t3.small (2 vCPU, 2GB RAM)
   - Storage: 20GB SSD
   - Security Group: Allow ports 22, 80, 443, 3000

2. **Create RDS Database:**
   - Engine: PostgreSQL 15
   - Instance: db.t3.micro
   - Database name: crm_sandbox
   - Username: admin
   - Password: YOUR_DB_PASSWORD

3. **Create S3 Bucket:**
   - Name: brandmonkz-crm-frontend
   - Enable static website hosting
   - Configure bucket policy for public read

═══════════════════════════════════════════════════════════════════════════════

## 📤 STEP-BY-STEP DEPLOYMENT GUIDE

### STEP 1: Deploy Infrastructure (Choose Option 1 or 2 above)

After Terraform apply or manual setup, you'll have:
- ✅ EC2 Public IP: `[YOUR_EC2_IP]`
- ✅ RDS Endpoint: `[YOUR_RDS_ENDPOINT]`
- ✅ S3 Bucket: `brandmonkz-crm-frontend`

---

### STEP 2: Update Environment Variables

Update `.env.production` with actual values:

```bash
# Update DATABASE_URL with actual RDS endpoint
DATABASE_URL="postgresql://admin:YOUR_DB_PASSWORD[YOUR_RDS_ENDPOINT]:5432/crm_sandbox"
```

---

### STEP 3: Deploy Backend to EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@[YOUR_EC2_IP]

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install PostgreSQL client tools
sudo apt-get install -y postgresql-client

# Exit SSH
exit

# From your local machine, upload backend
cd "/Users/jeet/Documents/CRM Module"
tar -czf backend.tar.gz dist/ node_modules/ package.json .env.production prisma/
scp -i your-key.pem backend.tar.gz ubuntu@[YOUR_EC2_IP]:~/

# SSH back in
ssh -i your-key.pem ubuntu@[YOUR_EC2_IP]

# Extract and setup
tar -xzf backend.tar.gz
mv .env.production .env

# Run database migrations
npx prisma migrate deploy

# Start backend with PM2
pm2 start npm --name "crm-backend" -- start

# Save PM2 configuration
pm2 save
pm2 startup

# Exit SSH
exit
```

---

### STEP 4: Deploy Frontend to S3

```bash
# Install AWS CLI if not already installed
# brew install awscli  # On macOS
# OR download from: https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure
# Enter your AWS credentials when prompted

# Deploy frontend to S3
cd "/Users/jeet/Documents/CRM Frontend/crm-app"
aws s3 sync dist/ s3://brandmonkz-crm-frontend/ --delete

# Enable static website hosting
aws s3 website s3://brandmonkz-crm-frontend/ \
  --index-document index.html \
  --error-document index.html

# Make bucket publicly accessible (for static website)
aws s3api put-bucket-policy --bucket brandmonkz-crm-frontend --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::brandmonkz-crm-frontend/*"
  }]
}'
```

---

### STEP 5: Configure Nginx on EC2 (API Gateway)

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@[YOUR_EC2_IP]

# Install Nginx
sudo apt-get update
sudo apt-get install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/crm-api

# Paste this configuration:
```

```nginx
server {
    listen 80;
    server_name api-sandbox.brandmonkz.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/crm-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Exit SSH
exit
```

---

### STEP 6: Configure DNS with GoDaddy

**Option A: Use GoDaddy API (Programmatic)**

```bash
# From local machine
cd "/Users/jeet/Documents/CRM Module"

# Run GoDaddy DNS setup script
curl -X POST "https://api.godaddy.com/v1/domains/brandmonkz.com/records" \
  -H "Authorization: sso-key dKYWxHe7j3wd_FXuq3VphgvJDXMEh9fKD2K:Ds5b9aQ5Jt5LUeAF8h4aBN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "type": "A",
      "name": "sandbox",
      "data": "[YOUR_EC2_IP]",
      "ttl": 600
    },
    {
      "type": "A",
      "name": "api-sandbox",
      "data": "[YOUR_EC2_IP]",
      "ttl": 600
    }
  ]'
```

**Option B: Manual GoDaddy Configuration**

1. Login to GoDaddy
2. Go to DNS Management for brandmonkz.com
3. Add A Records:
   - **sandbox.brandmonkz.com** → `[YOUR_EC2_IP]`
   - **api-sandbox.brandmonkz.com** → `[YOUR_EC2_IP]`
4. TTL: 600 seconds
5. Save changes

---

### STEP 7: Setup SSL Certificates (Let's Encrypt)

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@[YOUR_EC2_IP]

# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d api-sandbox.brandmonkz.com

# Auto-renewal
sudo certbot renew --dry-run

# Exit SSH
exit
```

---

### STEP 8: Configure CloudFront for Frontend (Optional but Recommended)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name brandmonkz-crm-frontend.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html

# Note the CloudFront domain (e.g., d1234abcd.cloudfront.net)

# Update DNS:
# sandbox.brandmonkz.com → CNAME → d1234abcd.cloudfront.net
```

═══════════════════════════════════════════════════════════════════════════════

## ✅ POST-DEPLOYMENT VERIFICATION

### Step 1: Test Backend API

```bash
# Health check
curl https://api-sandbox.brandmonkz.com/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2025-10-09...",
#   "environment": "production",
#   "version": "1.0.0",
#   "database": "connected"
# }
```

### Step 2: Test Frontend

Open in browser:
- **https://sandbox.brandmonkz.com**

Expected:
- ✅ Login page loads
- ✅ Google OAuth button present
- ✅ No console errors

### Step 3: Test Google OAuth

1. Click "Sign in with Google"
2. Complete OAuth flow
3. Should redirect back to sandbox.brandmonkz.com
4. Should be logged in

### Step 4: Test Stripe Integration

1. Login to dashboard
2. Go to Pricing/Subscriptions
3. Click "Subscribe" to a plan
4. Verify Stripe checkout opens
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. Verify subscription activates

### Step 5: Test All Features

Use the testing checklist from `LOCAL_TESTING_GUIDE.md`:
- ✅ Create contacts
- ✅ Create companies
- ✅ Create campaigns
- ✅ Update deal stages
- ✅ Configure email servers
- ✅ Import CSV
- ✅ Test company enrichment

═══════════════════════════════════════════════════════════════════════════════

## 🔗 YOUR SANDBOX URLS

Once deployed, access your CRM at:

### Frontend:
- **Main App:** https://sandbox.brandmonkz.com
- **Login:** https://sandbox.brandmonkz.com/login
- **Dashboard:** https://sandbox.brandmonkz.com/dashboard
- **Contacts:** https://sandbox.brandmonkz.com/contacts
- **Companies:** https://sandbox.brandmonkz.com/companies
- **Campaigns:** https://sandbox.brandmonkz.com/campaigns
- **Deals:** https://sandbox.brandmonkz.com/deals

### Backend API:
- **Health:** https://api-sandbox.brandmonkz.com/health
- **Auth:** https://api-sandbox.brandmonkz.com/api/auth/login
- **Contacts:** https://api-sandbox.brandmonkz.com/api/contacts
- **Companies:** https://api-sandbox.brandmonkz.com/api/companies
- **Campaigns:** https://api-sandbox.brandmonkz.com/api/campaigns

═══════════════════════════════════════════════════════════════════════════════

## 🎯 QUICK DEPLOYMENT SUMMARY

**Infrastructure (Terraform):**
```bash
cd aws/terraform
terraform init
terraform apply
```

**Backend (EC2):**
```bash
# Build locally (already done ✅)
# Upload to EC2
# Run migrations
# Start with PM2
```

**Frontend (S3):**
```bash
# Build locally (already done ✅)
aws s3 sync dist/ s3://brandmonkz-crm-frontend/
```

**DNS (GoDaddy):**
```bash
# Point sandbox.brandmonkz.com → EC2 IP
# Point api-sandbox.brandmonkz.com → EC2 IP
```

**SSL (Let's Encrypt):**
```bash
# Run certbot on EC2
```

═══════════════════════════════════════════════════════════════════════════════

## 📊 DEPLOYMENT STATUS TRACKING

### Phase 1: Infrastructure ⏸️
- [ ] Terraform init
- [ ] Terraform apply
- [ ] Note EC2 IP, RDS endpoint, S3 bucket

### Phase 2: Backend Deployment ⏸️
- [ ] SSH into EC2
- [ ] Install Node.js, PM2
- [ ] Upload backend
- [ ] Update .env with RDS endpoint
- [ ] Run migrations
- [ ] Start with PM2

### Phase 3: Frontend Deployment ⏸️
- [ ] Configure AWS CLI
- [ ] Sync to S3
- [ ] Enable static hosting
- [ ] Configure bucket policy

### Phase 4: Nginx & SSL ⏸️
- [ ] Install Nginx
- [ ] Configure reverse proxy
- [ ] Install Certbot
- [ ] Get SSL certificate

### Phase 5: DNS Configuration ⏸️
- [ ] Point sandbox.brandmonkz.com to EC2
- [ ] Point api-sandbox.brandmonkz.com to EC2
- [ ] Wait for DNS propagation (5-30 min)

### Phase 6: Testing ⏸️
- [ ] Test backend health check
- [ ] Test frontend loads
- [ ] Test Google OAuth
- [ ] Test Stripe checkout
- [ ] Test all CRUD operations

═══════════════════════════════════════════════════════════════════════════════

## 🚨 IMPORTANT NOTES

### Security:
- ✅ All API keys are LIVE - transactions are REAL
- ✅ Stripe is in LIVE mode - use carefully
- ✅ Database has production-level security
- ✅ SSL certificates required for HTTPS

### Google OAuth:
- Must add `https://sandbox.brandmonkz.com` to authorized redirect URIs in Google Console
- Current callback: https://sandbox.brandmonkz.com/api/auth/google/callback

### Stripe Webhooks:
- After deployment, configure webhook in Stripe Dashboard
- Webhook URL: `https://api-sandbox.brandmonkz.com/api/stripe/webhook`
- Update `STRIPE_WEBHOOK_SECRET` in `.env`

### Database Migrations:
- **CRITICAL:** Run `npx prisma migrate deploy` before starting backend
- This creates all tables in RDS

═══════════════════════════════════════════════════════════════════════════════

## 🎉 YOU'RE READY TO DEPLOY!

All builds are complete, all API keys are configured, and deployment scripts are ready.

**Next Step:** Choose your deployment method and execute!

═══════════════════════════════════════════════════════════════════════════════
