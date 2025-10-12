# GoDaddy Setup Guide for brandmonkz.com

Complete guide to connect your GoDaddy domain **brandmonkz.com** with your CRM system, AWS services, and email marketing platform.

## Table of Contents
1. [Get GoDaddy API Credentials](#1-get-godaddy-api-credentials)
2. [Configure Environment Variables](#2-configure-environment-variables)
3. [Deploy to AWS (Optional)](#3-deploy-to-aws-optional)
4. [Point Domain to Your Server](#4-point-domain-to-your-server)
5. [Setup Email Authentication](#5-setup-email-authentication)
6. [Configure AWS SES with Your Domain](#6-configure-aws-ses-with-your-domain)
7. [Test Your Setup](#7-test-your-setup)

---

## 1. Get GoDaddy API Credentials

### Step 1: Create API Key

1. Go to **https://developer.godaddy.com/keys**
2. Sign in with your GoDaddy account
3. Click **"Create New API Key"**
4. Choose **"Production"** environment
5. Name it: `CRM Integration`
6. Click **"Create"**
7. **IMPORTANT**: Copy both the **Key** and **Secret** immediately (you won't see the secret again!)

### Step 2: Save Credentials

Add to your `.env` file:

```env
GODADDY_API_KEY=your_actual_api_key_here
GODADDY_API_SECRET=your_actual_api_secret_here
```

---

## 2. Configure Environment Variables

Your `.env` file should have:

```env
# GoDaddy API
GODADDY_API_KEY=dTXXXXXXXXXXXXXX_XXXXXXXXXXXXXXXXX
GODADDY_API_SECRET=XXXXXXXXXXXXXXXXXXXXXX

# AWS (for production deployment)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# AWS SES (Email Service)
USE_AWS_SES=true
SES_FROM_EMAIL=noreply@brandmonkz.com

# Domain
DOMAIN=brandmonkz.com
```

---

## 3. Deploy to AWS (Optional)

If you want to deploy your CRM to AWS:

### Option A: Quick Deploy (EC2)

```bash
# Deploy infrastructure
cd aws/terraform
terraform init
terraform apply

# Get EC2 IP address
terraform output ec2_public_ip
```

### Option B: Production Deploy (ECS with Load Balancer)

```bash
# Deploy full infrastructure
cd aws/terraform
terraform apply

# Get ALB DNS name
terraform output alb_dns_name
# Example output: crm-alb-1234567890.us-east-1.elb.amazonaws.com
```

---

## 4. Point Domain to Your Server

### Option 1: Using the CRM API (Automated)

#### If you deployed to AWS EC2:

```bash
curl -X POST http://localhost:3000/api/godaddy/domains/brandmonkz.com/point-to-ip \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ipAddress": "YOUR_EC2_IP_ADDRESS",
    "subdomain": "api"
  }'
```

#### If you deployed to AWS with ALB:

```bash
curl -X POST http://localhost:3000/api/godaddy/domains/brandmonkz.com/cname \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subdomain": "api",
    "target": "crm-alb-1234567890.us-east-1.elb.amazonaws.com"
  }'
```

This creates: **api.brandmonkz.com → Your AWS Server**

### Option 2: Manual Setup via GoDaddy Dashboard

1. Go to https://dcc.godaddy.com/
2. Click on **brandmonkz.com**
3. Click **"DNS"** tab
4. Add new record:
   - **Type**: A (for EC2) or CNAME (for ALB)
   - **Name**: `api`
   - **Value**: Your server IP or ALB DNS
   - **TTL**: 600 seconds
5. Click **"Save"**

---

## 5. Setup Email Authentication

Email authentication (SPF, DKIM, DMARC) ensures your emails don't go to spam.

### Automated Setup via API:

```bash
curl -X POST http://localhost:3000/api/godaddy/domains/brandmonkz.com/setup-email-auth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "spf": "v=spf1 include:amazonses.com ~all",
    "dmarc": {
      "reportEmail": "admin@brandmonkz.com"
    }
  }'
```

### Manual Setup:

1. **SPF Record**:
   - Type: `TXT`
   - Name: `@`
   - Value: `v=spf1 include:amazonses.com ~all`

2. **DMARC Record**:
   - Type: `TXT`
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=quarantine; rua=mailto:admin@brandmonkz.com`

---

## 6. Configure AWS SES with Your Domain

### Step 1: Verify Domain in AWS SES

```bash
# Run this in your terminal
aws ses verify-domain-identity --domain brandmonkz.com --region us-east-1
```

This returns a verification token like: `AbCdEfGhIjKlMnOpQrStUvWxYz1234567890=`

### Step 2: Get DKIM Tokens

```bash
aws ses verify-domain-dkim --domain brandmonkz.com --region us-east-1
```

This returns 3 DKIM tokens like:
```json
{
  "DkimTokens": [
    "abc123def456ghi789",
    "jkl012mno345pqr678",
    "stu901vwx234yz567"
  ]
}
```

### Step 3: Add DNS Records via API

```bash
curl -X POST http://localhost:3000/api/godaddy/domains/brandmonkz.com/setup-aws-ses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "verificationToken": "AbCdEfGhIjKlMnOpQrStUvWxYz1234567890=",
    "dkimTokens": [
      "abc123def456ghi789",
      "jkl012mno345pqr678",
      "stu901vwx234yz567"
    ]
  }'
```

### Step 4: Verify in AWS Console

1. Go to AWS SES Console: https://console.aws.amazon.com/ses/
2. Click **"Verified identities"**
3. Check if **brandmonkz.com** shows as **"Verified"** (may take 10-20 minutes)

### Step 5: Request Production Access

By default, SES is in sandbox mode (can only send to verified emails).

1. Go to AWS SES Console
2. Click **"Request production access"**
3. Fill out the form:
   - Use case: "CRM Email Marketing and Transactional Emails"
   - Website: https://brandmonkz.com
   - Describe: "Professional CRM system for customer communication"
4. Submit (approval usually takes 24-48 hours)

---

## 7. Test Your Setup

### Test 1: Check GoDaddy Connection

```bash
curl http://localhost:3000/api/godaddy/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Should return:
```json
{
  "configured": true,
  "message": "GoDaddy API is configured"
}
```

### Test 2: List Your Domains

```bash
curl http://localhost:3000/api/godaddy/domains \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Should show `brandmonkz.com` in the list.

### Test 3: Check DNS Records

```bash
curl http://localhost:3000/api/godaddy/domains/brandmonkz.com/dns \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 4: Send Test Email via AWS SES

```bash
curl -X POST http://localhost:3000/api/campaigns/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "your-email@gmail.com",
    "subject": "Test from brandmonkz.com",
    "body": "<h1>Hello from BrandMonkz!</h1><p>Email is working!</p>"
  }'
```

### Test 5: Verify Domain Routing

```bash
# Check if api.brandmonkz.com resolves
nslookup api.brandmonkz.com

# Test API endpoint (after deployment)
curl https://api.brandmonkz.com/health
```

---

## Complete Setup Checklist

- [ ] ✅ Created GoDaddy API credentials
- [ ] ✅ Added credentials to `.env` file
- [ ] ✅ Deployed application to AWS
- [ ] ✅ Pointed `api.brandmonkz.com` to AWS server
- [ ] ✅ Added SPF record for email authentication
- [ ] ✅ Added DMARC record
- [ ] ✅ Verified domain in AWS SES
- [ ] ✅ Added SES DKIM records to DNS
- [ ] ✅ Requested SES production access
- [ ] ✅ Tested GoDaddy API connection
- [ ] ✅ Sent test email successfully
- [ ] ✅ Verified `api.brandmonkz.com` is accessible

---

## Useful API Endpoints

All endpoints require authentication. Get your token from `/api/auth/login`.

### Domain Management

```bash
# List all domains
GET /api/godaddy/domains

# Get domain details
GET /api/godaddy/domains/brandmonkz.com

# Get DNS records
GET /api/godaddy/domains/brandmonkz.com/dns

# Add DNS record
POST /api/godaddy/domains/brandmonkz.com/dns
{
  "type": "A",
  "name": "www",
  "data": "192.168.1.1",
  "ttl": 600
}

# Delete DNS record
DELETE /api/godaddy/domains/brandmonkz.com/dns/A/www

# Point subdomain to IP
POST /api/godaddy/domains/brandmonkz.com/point-to-ip
{
  "ipAddress": "54.123.45.67",
  "subdomain": "api"
}

# Add CNAME record
POST /api/godaddy/domains/brandmonkz.com/cname
{
  "subdomain": "api",
  "target": "my-alb.us-east-1.elb.amazonaws.com"
}

# Setup email authentication
POST /api/godaddy/domains/brandmonkz.com/setup-email-auth
{
  "spf": "v=spf1 include:amazonses.com ~all",
  "dkim": {
    "selector": "ses",
    "value": "p=MIGfMA0GCS..."
  },
  "dmarc": {
    "reportEmail": "admin@brandmonkz.com"
  }
}

# Setup AWS SES
POST /api/godaddy/domains/brandmonkz.com/setup-aws-ses
{
  "verificationToken": "AbCdEfG...",
  "dkimTokens": ["token1", "token2", "token3"]
}
```

---

## DNS Propagation

After making DNS changes:
- Changes may take **5-30 minutes** to propagate
- Check propagation: https://dnschecker.org
- Enter: `api.brandmonkz.com`

---

## Troubleshooting

### Issue: GoDaddy API returns 401 Unauthorized
- **Solution**: Double-check API key and secret in `.env`
- Make sure you're using Production keys, not Test keys

### Issue: Emails going to spam
- **Solution**:
  1. Verify SPF, DKIM, DMARC records are correct
  2. Check SES reputation dashboard
  3. Make sure "From" email matches verified domain

### Issue: Domain not resolving
- **Solution**:
  1. Check DNS propagation (may take up to 48 hours)
  2. Verify record was added correctly in GoDaddy
  3. Check TTL is set to 600 (10 minutes) for faster updates

### Issue: SES still in sandbox
- **Solution**:
  1. Request production access in SES console
  2. Provide detailed use case
  3. AWS usually approves within 24-48 hours

---

## Production Deployment URLs

After complete setup, your system will be accessible at:

- **Frontend**: https://brandmonkz.com
- **API**: https://api.brandmonkz.com
- **Email sending**: noreply@brandmonkz.com
- **Admin email**: admin@brandmonkz.com

---

## Security Notes

1. **Never commit** `.env` file to Git (it's in `.gitignore`)
2. **Rotate API keys** every 90 days for security
3. **Use HTTPS only** in production (add SSL certificate in AWS)
4. **Enable 2FA** on your GoDaddy account
5. **Monitor SES reputation** to avoid blacklisting

---

## Support

- GoDaddy API Docs: https://developer.godaddy.com/doc
- AWS SES Docs: https://docs.aws.amazon.com/ses/
- Your CRM API: http://localhost:3000/health

Need help? Check the logs:
```bash
# Backend logs
tail -f /Users/jeet/Documents/CRM\ Module/logs/app.log

# AWS CloudWatch logs
aws logs tail /aws/crm/production --follow
```
