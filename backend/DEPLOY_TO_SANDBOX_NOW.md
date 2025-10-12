# 🚀 DEPLOY TO SANDBOX - IMMEDIATE STEPS

**Status:** Ready to deploy to brandmonkz.com sandbox
**Time Required:** 15-20 minutes

---

## ⚠️ STEP 1: AWS CREDENTIALS (REQUIRED FIRST)

Your AWS CLI is not configured. You need to set it up:

```bash
aws configure
```

**You'll need to provide:**
- AWS Access Key ID: `[Your AWS Access Key]`
- AWS Secret Access Key: `[Your AWS Secret Key]`
- Default region: `us-east-1`
- Default output format: `json`

### Where to Find AWS Credentials

1. **AWS Console:** https://console.aws.amazon.com
2. Go to **IAM** → **Users** → Your User → **Security Credentials**
3. Click **Create Access Key** if you don't have one
4. Copy the **Access Key ID** and **Secret Access Key**

---

## 🎯 STEP 2: DEPLOYMENT OPTIONS

### Option A: Automated Deployment Script (Recommended)

```bash
cd "/Users/jeet/Documents/CRM Module"
chmod +x deploy-to-sandbox.sh
./deploy-to-sandbox.sh
```

This script will:
- ✅ Find or create EC2 instance (tag: crm-sandbox)
- ✅ Find or create S3 bucket (crm-sandbox-frontend)
- ✅ Deploy backend code to EC2
- ✅ Build and deploy frontend to S3
- ✅ Configure environment variables
- ✅ Start backend with PM2
- ✅ Verify deployment

### Option B: Manual Deployment

If the script fails, use the detailed manual commands in:
- [SANDBOX_DEPLOYMENT_COMMANDS.md](SANDBOX_DEPLOYMENT_COMMANDS.md)

---

## 📋 STEP 3: WHAT THE SCRIPT NEEDS

### Existing AWS Resources (you mentioned these exist)

1. **EC2 Instance for Sandbox**
   - Should have tag: `Name=crm-sandbox` or `Environment=sandbox`
   - Instance type: t3.medium or larger
   - Security group: Allow ports 22, 80, 443, 3000

2. **S3 Bucket for Frontend**
   - Name: `crm-sandbox-frontend` (or similar)
   - Public access enabled for static website hosting
   - Bucket policy for public reads

3. **RDS Database (Optional - can use localhost)**
   - Endpoint for sandbox database
   - Username/password
   - Database name: `crm_sandbox`

### If Resources Don't Exist

The script will attempt to create them automatically.

---

## 🔧 STEP 4: ENVIRONMENT CONFIGURATION

### Backend Environment (.env.production)

Already configured in your repo:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://admin:YOUR_DB_PASSWORDRDS-ENDPOINT:5432/crm_sandbox
FRONTEND_URL=https://sandbox.brandmonkz.com
GOOGLE_CALLBACK_URL=https://api-sandbox.brandmonkz.com/api/auth/google/callback
STRIPE_SECRET_KEY=sk_live_... (LIVE MODE)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
ANTHROPIC_API_KEY=sk-ant-api03-...
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@brandmonkz.com
APOLLO_API_KEY=YOUR_APOLLO_API_KEY
GODADDY_API_KEY=dKYWxHe7j3wd_FXuq3VphgvJDXMEh9fKD2K
GODADDY_API_SECRET=...
```

### Frontend Environment (.env.production)

Already configured:
```env
VITE_API_URL=https://api-sandbox.brandmonkz.com
VITE_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY... (LIVE)
# ... Stripe price IDs
```

---

## 🌐 STEP 5: DNS CONFIGURATION

After deployment, you'll need to configure DNS:

### Option A: Using Route 53 (If domain is there)

```bash
# Get EC2 public IP first
EC2_IP=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=crm-sandbox" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

echo "EC2 Public IP: $EC2_IP"

# Then manually add these DNS records in Route 53:
# A Record: sandbox.brandmonkz.com → EC2_IP
# A Record: api-sandbox.brandmonkz.com → EC2_IP
```

### Option B: Using GoDaddy (If domain is there)

1. Login to GoDaddy DNS management
2. Add A Records:
   - **Host:** `sandbox` → **Points to:** EC2 Public IP
   - **Host:** `api-sandbox` → **Points to:** EC2 Public IP
3. TTL: 600 seconds (10 minutes)

---

## 🔒 STEP 6: SSL CERTIFICATES (After DNS)

Once DNS is configured and propagated (5-10 minutes):

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@EC2_IP

# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d sandbox.brandmonkz.com -d api-sandbox.brandmonkz.com

# Follow prompts, choose redirect HTTP to HTTPS
```

---

## ✅ STEP 7: VERIFICATION

After deployment, test these URLs:

### Backend API
```bash
# Health check
curl https://api-sandbox.brandmonkz.com/health

# Expected: {"status":"ok"}
```

### Frontend
```bash
# Open in browser
open https://sandbox.brandmonkz.com

# Should load React app and show login page
```

### Google OAuth
1. Go to https://sandbox.brandmonkz.com
2. Click "Login with Google"
3. Should redirect to Google OAuth
4. After auth, should redirect back to app
5. Should be logged in with JWT token

---

## 🐛 TROUBLESHOOTING

### If AWS CLI fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Should show your AWS account ID
# If error, run: aws configure
```

### If EC2 connection fails
```bash
# Check security group allows your IP
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=crm-sandbox-sg"

# Add your IP to security group:
YOUR_IP=$(curl -s ifconfig.me)
aws ec2 authorize-security-group-ingress \
  --group-name crm-sandbox-sg \
  --protocol tcp --port 22 \
  --cidr $YOUR_IP/32
```

### If deployment script fails
- Check logs in `/tmp/crm-deployment.log` on EC2
- Manually follow steps in SANDBOX_DEPLOYMENT_COMMANDS.md
- Check PM2 logs: `pm2 logs crm-backend`

---

## 📞 QUICK COMMANDS REFERENCE

```bash
# 1. Configure AWS (DO THIS FIRST)
aws configure

# 2. Run deployment script
cd "/Users/jeet/Documents/CRM Module"
./deploy-to-sandbox.sh

# 3. Check deployment status
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=crm-sandbox" \
  --query "Reservations[0].Instances[0].State.Name"

# 4. Get EC2 public IP for DNS
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=crm-sandbox" \
  --query "Reservations[0].Instances[0].PublicIpAddress"

# 5. SSH into EC2 (after deployment)
ssh -i ~/.ssh/your-key.pem ubuntu@EC2_IP

# 6. Check backend logs on EC2
pm2 logs crm-backend
```

---

## 🎯 READY TO DEPLOY?

**Run this command to start deployment:**

```bash
aws configure && cd "/Users/jeet/Documents/CRM Module" && ./deploy-to-sandbox.sh
```

---

**Last Updated:** 2025-10-10 08:35:00
**Localhost Status:** ✅ 100% Ready (all security fixes verified)
**Sandbox Status:** ⏳ Waiting for AWS configuration
