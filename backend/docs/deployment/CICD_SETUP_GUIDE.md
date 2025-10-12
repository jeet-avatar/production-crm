# CI/CD Pipeline Setup Guide

Complete guide to set up automated deployment from GitHub to AWS.

## Overview

This CI/CD pipeline automatically:
1. ✅ Builds Docker image
2. ✅ Pushes to AWS ECR
3. ✅ Runs database migrations
4. ✅ Deploys to AWS ECS
5. ✅ Updates running application

**When you push to `main` branch → App goes live on AWS automatically!**

---

## Prerequisites

- ✅ AWS Account with credentials
- ✅ GitHub repository (already done: jeet-avatar/crm-email-marketing-platform)
- ✅ GoDaddy domain (brandmonkz.com)
- ✅ Docker installed locally (for testing)

---

## Step 1: Deploy AWS Infrastructure

### Option A: Automated Deployment (Recommended)

```bash
cd "/Users/jeet/Documents/CRM Module"
chmod +x scripts/deploy-infrastructure.sh
./scripts/deploy-infrastructure.sh
```

This script will:
- Create ECR repository
- Deploy Terraform infrastructure
- Create ECS cluster and service
- Set up RDS PostgreSQL database
- Configure Load Balancer

### Option B: Manual Deployment

```bash
cd aws/terraform

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings

# Deploy
terraform init
terraform plan
terraform apply
```

---

## Step 2: Configure GitHub Secrets

Go to your GitHub repository:
**https://github.com/jeet-avatar/crm-email-marketing-platform/settings/secrets/actions**

Add these secrets:

### Required Secrets:

| Secret Name | Value | How to Get |
|------------|-------|------------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key | AWS IAM Console |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | AWS IAM Console |
| `DATABASE_URL` | PostgreSQL connection string | From Terraform output |
| `JWT_SECRET` | Random secure string | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Your Anthropic key | From .env file |
| `GODADDY_API_KEY` | Your GoDaddy key | From .env file |
| `GODADDY_API_SECRET` | Your GoDaddy secret | From .env file |
| `SES_FROM_EMAIL` | noreply@brandmonkz.com | Your domain |
| `USE_AWS_SES` | true | Enable SES |
| `AWS_REGION` | us-east-1 | Your AWS region |

### Get DATABASE_URL from Terraform:

```bash
cd aws/terraform
terraform output rds_endpoint
```

Format: `postgresql://crmadmin:YourPassword@rds-endpoint:5432/crmdb`

---

## Step 3: Create AWS Secrets (for ECS)

Store sensitive data in AWS Secrets Manager:

```bash
# Create database URL secret
aws secretsmanager create-secret \
  --name crm/database-url \
  --secret-string "postgresql://crmadmin:YourPassword@your-rds-endpoint:5432/crmdb" \
  --region us-east-1

# Create JWT secret
aws secretsmanager create-secret \
  --name crm/jwt-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --region us-east-1

# Create GoDaddy API key
aws secretsmanager create-secret \
  --name crm/godaddy-api-key \
  --secret-string "your-godaddy-key" \
  --region us-east-1

# Create GoDaddy API secret
aws secretsmanager create-secret \
  --name crm/godaddy-api-secret \
  --secret-string "your-godaddy-secret" \
  --region us-east-1
```

---

## Step 4: Build and Push Initial Docker Image

Before GitHub Actions can deploy, we need an initial image in ECR:

```bash
cd "/Users/jeet/Documents/CRM Module"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build image
docker build -t crm-backend .

# Tag for ECR
docker tag crm-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/crm-backend:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/crm-backend:latest
```

---

## Step 5: Point Domain to Load Balancer

### Get ALB DNS:
```bash
cd aws/terraform
terraform output alb_dns_name
```

### Update GoDaddy DNS via API:

```bash
# Using your CRM API (backend must be running)
curl -X POST http://localhost:3000/api/godaddy/domains/brandmonkz.com/cname \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subdomain": "api",
    "target": "your-alb-dns-name.us-east-1.elb.amazonaws.com"
  }'
```

This creates: **api.brandmonkz.com** → AWS Load Balancer

---

## Step 6: Set Up SSL Certificate

```bash
# Request SSL certificate for your domain
aws acm request-certificate \
  --domain-name api.brandmonkz.com \
  --validation-method DNS \
  --region us-east-1

# Get validation DNS records
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Add the DNS validation record to GoDaddy, then update ALB listener to use HTTPS.

---

## Step 7: Test CI/CD Pipeline

### Make a test change:

```bash
cd "/Users/jeet/Documents/CRM Module"

# Make a small change
echo "# Test deployment" >> README.md

# Commit and push
git add .
git commit -m "test: Trigger CI/CD pipeline"
git push origin main
```

### Watch deployment:

1. Go to GitHub Actions: https://github.com/jeet-avatar/crm-email-marketing-platform/actions
2. Click on the running workflow
3. Monitor each step

### Check deployment:

```bash
# Check ECS service
aws ecs describe-services \
  --cluster crm-cluster \
  --services crm-service \
  --region us-east-1

# Check if app is running
curl https://api.brandmonkz.com/health
```

---

## How the CI/CD Works

### Trigger:
```
git push origin main
```

### GitHub Actions Workflow:
1. **Checkout code** from GitHub
2. **Configure AWS credentials** using GitHub Secrets
3. **Login to ECR** (container registry)
4. **Build Docker image** with your code
5. **Push to ECR** with commit SHA tag
6. **Run database migrations** using Prisma
7. **Update ECS task definition** with new image
8. **Deploy to ECS** - rolling update, zero downtime
9. **Wait for stability** - ensures deployment succeeded

### Result:
✅ New version live at **api.brandmonkz.com**

---

## CI/CD Pipeline Flowchart

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │
│    Triggered    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Docker   │
│     Image       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Push to ECR   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run Migrations  │
│   (Prisma)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update ECS     │
│ Task Definition │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy to ECS  │
│  (Zero Downtime)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   App Live! ✅   │
│ api.brandmonkz  │
│     .com        │
└─────────────────┘
```

---

## Database Migrations

Migrations run automatically during CI/CD:

```bash
npx prisma migrate deploy
```

### To create a new migration locally:

```bash
# Make changes to prisma/schema.prisma

# Create migration
npx prisma migrate dev --name add_new_feature

# Commit changes
git add .
git commit -m "feat: Add new feature with migration"
git push origin main  # Migration runs automatically in CI/CD
```

---

## Monitoring & Logs

### View Application Logs:

```bash
# Via AWS CLI
aws logs tail /aws/crm/production --follow --region us-east-1

# Via AWS Console
# https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Faws$252Fcrm$252Fproduction
```

### View ECS Deployment Status:

```bash
aws ecs describe-services \
  --cluster crm-cluster \
  --services crm-service \
  --region us-east-1
```

### Check GitHub Actions:

https://github.com/jeet-avatar/crm-email-marketing-platform/actions

---

## Rollback

If deployment fails, rollback to previous version:

```bash
# Get previous task definition
aws ecs list-task-definitions \
  --family-prefix crm-task \
  --region us-east-1

# Update service with previous task definition
aws ecs update-service \
  --cluster crm-cluster \
  --service crm-service \
  --task-definition crm-task:PREVIOUS_REVISION \
  --region us-east-1
```

---

## Environments

### Current Setup: Single Production Environment

To add staging:

1. **Create separate Terraform workspace:**
```bash
cd aws/terraform
terraform workspace new staging
terraform apply
```

2. **Update GitHub Actions** to deploy to staging on `develop` branch:
```yaml
on:
  push:
    branches:
      - develop  # staging
      - main     # production
```

---

## Scaling

### Auto-scaling based on CPU/Memory:

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/crm-cluster/crm-service \
  --min-capacity 1 \
  --max-capacity 10

# Create scaling policy (scale up at 70% CPU)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/crm-cluster/crm-service \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

---

## Costs

Estimated monthly costs:

- **ECR**: ~$1 (per GB stored)
- **ECS Fargate (1 task)**: ~$30/month
- **RDS db.t3.micro**: ~$15/month
- **ALB**: ~$20/month
- **Data Transfer**: ~$10/month
- **CloudWatch Logs**: ~$5/month

**Total**: ~$80-100/month

---

## Troubleshooting

### Issue: GitHub Actions fails at "Login to ECR"
**Solution**: Check AWS credentials in GitHub Secrets

### Issue: ECS task fails to start
**Solution**: Check CloudWatch logs for errors

### Issue: Database connection fails
**Solution**: Verify DATABASE_URL secret and RDS security group

### Issue: Docker build fails
**Solution**: Test build locally: `docker build -t crm-backend .`

### Issue: Migrations fail
**Solution**: Run migrations locally first: `npx prisma migrate deploy`

---

## Complete Deployment Checklist

- [ ] ✅ AWS infrastructure deployed (Terraform)
- [ ] ✅ ECR repository created
- [ ] ✅ RDS database running
- [ ] ✅ ECS cluster and service created
- [ ] ✅ GitHub Secrets configured
- [ ] ✅ AWS Secrets Manager configured
- [ ] ✅ Initial Docker image pushed to ECR
- [ ] ✅ Domain pointed to Load Balancer (api.brandmonkz.com)
- [ ] ✅ SSL certificate configured
- [ ] ✅ CI/CD pipeline tested
- [ ] ✅ Database migrations working
- [ ] ✅ Application accessible at api.brandmonkz.com
- [ ] ✅ Monitoring and logs configured

---

## Next Steps After Deployment

1. **Set up AWS SES for emails:**
   - Verify domain in SES
   - Add DNS records to GoDaddy
   - Request production access

2. **Configure monitoring alerts:**
   - CloudWatch alarms for errors
   - SNS notifications

3. **Set up backups:**
   - RDS automated backups (enabled by default)
   - Manual snapshots

4. **Performance optimization:**
   - Enable auto-scaling
   - Add CloudFront CDN
   - Database query optimization

---

## Support & Documentation

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **AWS ECS Docs**: https://docs.aws.amazon.com/ecs/
- **Terraform Docs**: https://www.terraform.io/docs
- **Prisma Migrations**: https://www.prisma.io/docs/concepts/components/prisma-migrate

---

**Your CRM is now fully automated! 🚀**

Every push to `main` = Live deployment to AWS
