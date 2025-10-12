# BrandMonkz CRM - AWS Deployment Guide

## 🚀 Quick Deployment Checklist

This guide will help you deploy the CRM platform to AWS for BrandMonkz.

## Prerequisites Needed

Before we deploy, please provide the following information:

### 1. **Domain Information**
- [ ] Domain name for the application (e.g., `crm.brandmonkz.com`)
- [ ] Domain registrar (GoDaddy/Route53/Other)
- [ ] DNS access to create records

### 2. **AWS Account Details**
- [ ] AWS Account ID
- [ ] Preferred AWS Region (e.g., `us-east-1`, `ap-south-1`)
- [ ] AWS Access Key ID (for deployment)
- [ ] AWS Secret Access Key (for deployment)

### 3. **Email Configuration**
- [ ] Email address for sending (e.g., `crm@brandmonkz.com`)
- [ ] Email domain verified in SES (or will verify)
- [ ] Support email address

### 4. **Database Configuration**
- [ ] Database password (secure, min 12 characters)
- [ ] Instance size preference:
  - `db.t3.micro` - Development/Testing ($15/month)
  - `db.t3.small` - Small Production ($30/month)
  - `db.t3.medium` - Medium Production ($60/month)

### 5. **Branding Updates**
- [ ] Company name: **BrandMonkz**
- [ ] Application name: (e.g., "BrandMonkz CRM")
- [ ] Logo URL or file
- [ ] Primary brand color (hex code)

## 🎯 Deployment Steps

### Step 1: Update Branding

Update the UI configuration for BrandMonkz:

```bash
# Edit frontend branding
cd "/Users/jeet/Documents/CRM Frontend/crm-app"
```

Edit `src/config/ui.ts`:
```typescript
export const branding = {
  appName: 'BrandMonkz CRM',
  companyName: 'BrandMonkz',
  tagline: 'Manage your customer relationships',
  version: '1.0.0',
};
```

Edit `src/config/theme.ts` for brand colors:
```typescript
colors: {
  primary: {
    500: '#YOUR_BRAND_COLOR',  // Replace with BrandMonkz primary color
    600: '#YOUR_DARKER_SHADE',
  }
}
```

### Step 2: Configure AWS Infrastructure

Create Terraform variables file:

```bash
cd "/Users/jeet/Documents/CRM Module/aws/terraform"
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region        = "us-east-1"              # Your preferred region
environment       = "production"
project_name      = "brandmonkz-crm"
db_password       = "YOUR_SECURE_PASSWORD"   # Min 12 chars
ses_email         = "crm@brandmonkz.com"     # Your email
ses_domain        = "brandmonkz.com"         # Your domain
db_instance_class = "db.t3.small"            # Adjust based on needs
```

### Step 3: Deploy Backend to AWS

#### Option A: Deploy with ECS (Recommended)

1. **Build and push Docker image:**
```bash
cd "/Users/jeet/Documents/CRM Module"

# Login to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t brandmonkz-crm .

# Tag image
docker tag brandmonkz-crm:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/brandmonkz-crm:latest

# Push image
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/brandmonkz-crm:latest
```

2. **Deploy infrastructure:**
```bash
cd aws/terraform
terraform init
terraform plan
terraform apply
```

3. **Update ECS task with environment variables** (via AWS Console or update Terraform)

#### Option B: Deploy with EC2

1. **Launch EC2 instance** (t3.small or larger)
2. **Install Node.js and PostgreSQL client**
3. **Clone repository and install dependencies**
4. **Configure PM2 for process management**
5. **Set up Nginx as reverse proxy**

### Step 4: Deploy Frontend to AWS

#### Option A: AWS Amplify (Easiest)

1. Go to **AWS Amplify Console**
2. Click **"New app" → "Host web app"**
3. Connect GitHub repository: `https://github.com/jeet-avatar/crm-new-build-oct-7`
4. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
5. Add environment variable: `VITE_API_URL=https://api.brandmonkz.com`
6. Deploy

#### Option B: S3 + CloudFront

1. **Build frontend:**
```bash
cd "/Users/jeet/Documents/CRM Frontend/crm-app"
npm run build
```

2. **Create S3 bucket:**
```bash
aws s3 mb s3://brandmonkz-crm-frontend --region us-east-1
aws s3 website s3://brandmonkz-crm-frontend --index-document index.html --error-document index.html
```

3. **Upload build:**
```bash
aws s3 sync dist/ s3://brandmonkz-crm-frontend --delete
```

4. **Create CloudFront distribution** for CDN and HTTPS

### Step 5: Configure Domain & SSL

1. **Request SSL Certificate** (AWS Certificate Manager):
```bash
aws acm request-certificate \
  --domain-name crm.brandmonkz.com \
  --validation-method DNS \
  --region us-east-1
```

2. **Add DNS validation records** to your domain

3. **Update Route53/DNS:**
   - Add A/CNAME record pointing to ALB (backend)
   - Add A/CNAME record pointing to CloudFront (frontend)

### Step 6: Environment Variables (Production)

Create production `.env` file on the server:

```bash
# Database
DATABASE_URL="postgresql://username:password@rds-endpoint:5432/brandmonkz_crm"

# JWT
JWT_SECRET="your-production-jwt-secret-min-32-chars"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="https://api.brandmonkz.com/api/auth/google/callback"

# Frontend URL
FRONTEND_URL="https://crm.brandmonkz.com"

# AWS SES
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
SES_FROM_EMAIL="crm@brandmonkz.com"

# Anthropic AI (for field mapping)
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Stripe (for subscriptions)
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-webhook-secret"

# Apollo.io (optional)
APOLLO_API_KEY="your-apollo-api-key"
```

## 🔒 Security Checklist

- [ ] Enable MFA on AWS account
- [ ] Use IAM roles instead of access keys where possible
- [ ] Enable CloudWatch logging
- [ ] Set up AWS WAF for protection
- [ ] Enable RDS encryption
- [ ] Use Secrets Manager for sensitive data
- [ ] Configure security groups properly
- [ ] Enable HTTPS only (no HTTP)
- [ ] Set up rate limiting
- [ ] Configure CORS properly

## 📊 Post-Deployment

### 1. Verify Deployment
```bash
# Check backend health
curl https://api.brandmonkz.com/health

# Check frontend
curl https://crm.brandmonkz.com
```

### 2. Run Database Migrations
```bash
# SSH to EC2 or use ECS task
npx prisma migrate deploy
```

### 3. Test Key Features
- [ ] User login (Google OAuth)
- [ ] Contact creation
- [ ] CSV import
- [ ] Email sending
- [ ] Campaign creation

### 4. Set Up Monitoring
- [ ] CloudWatch dashboards
- [ ] Error alerting (SNS)
- [ ] Performance monitoring
- [ ] Cost alerts

## 💰 Estimated AWS Costs (Monthly)

| Service | Size | Cost |
|---------|------|------|
| RDS PostgreSQL | db.t3.small | $30 |
| EC2/ECS | t3.small | $15 |
| ALB | Standard | $20 |
| CloudFront | 50GB transfer | $5 |
| S3 | 10GB storage | $1 |
| **Total** | | **~$71/month** |

*Costs vary based on usage and region*

## 🆘 Quick Commands

### View Logs
```bash
# ECS logs
aws logs tail /ecs/brandmonkz-crm --follow

# EC2 logs
ssh ec2-user@your-instance
pm2 logs
```

### Database Backup
```bash
# Manual backup
aws rds create-db-snapshot \
  --db-instance-identifier brandmonkz-crm-db \
  --db-snapshot-identifier brandmonkz-backup-$(date +%Y%m%d)
```

### Scale Resources
```bash
# Update ECS task count
aws ecs update-service \
  --cluster brandmonkz-crm \
  --service brandmonkz-crm-service \
  --desired-count 2
```

## 📞 Support

For deployment issues:
1. Check CloudWatch logs
2. Verify security group rules
3. Confirm environment variables
4. Check database connectivity

---

## Next Steps

**Please provide the prerequisites information above, and I'll:**
1. Update all branding to BrandMonkz
2. Configure the deployment files
3. Help you execute the deployment
4. Set up monitoring and backups

**Ready to deploy?** Let me know when you have the required information!
