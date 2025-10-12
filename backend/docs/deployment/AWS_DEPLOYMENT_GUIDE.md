# AWS Deployment Guide for CRM Platform

## Overview

This guide covers deploying the CRM Email Marketing Platform to AWS with complete infrastructure setup including:
- **SES** for email sending
- **SNS** for SMS notifications
- **RDS PostgreSQL** for database
- **S3** for file storage
- **EC2/ECS** for application hosting
- **CloudWatch** for monitoring
- **Bedrock** for AI agents
- **Lambda** for serverless functions

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Terraform** installed (v1.0+)
4. **Docker** installed (for ECS deployment)
5. **Node.js** 18+ and npm

## Step 1: Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter default region (e.g., us-east-1)
# Enter output format (json)
```

Verify configuration:
```bash
aws sts get-caller-identity
```

## Step 2: Set Up Environment Variables

Create `aws/terraform/terraform.tfvars`:

```hcl
aws_region        = "us-east-1"
environment       = "production"
db_password       = "YourSecurePassword123!"
ses_email         = "your-email@example.com"
ses_domain        = "yourdomain.com"  # Optional
project_name      = "crm"
db_instance_class = "db.t3.micro"     # Use db.t3.small for production
```

## Step 3: Deploy Infrastructure with Terraform

```bash
cd aws/terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy infrastructure
terraform apply
```

This will create:
- VPC with public/private subnets
- RDS PostgreSQL database
- S3 buckets for attachments and assets
- Security groups
- IAM roles and policies
- Application Load Balancer
- ECS Cluster
- CloudWatch log groups
- SNS topic for SMS

## Step 4: Verify SES Email

Before sending emails, verify your sender email address:

```bash
# SES is in sandbox mode by default
# Verify your email
aws ses verify-email-identity --email-address your-email@example.com

# Check verification status
aws ses get-identity-verification-attributes --identities your-email@example.com
```

Click the verification link in the email AWS sends you.

### Move SES Out of Sandbox (Production)

To send to any email address (not just verified ones):

1. Go to AWS SES Console
2. Click "Request production access"
3. Fill out the form explaining your use case
4. Wait for AWS approval (usually 24-48 hours)

## Step 5: Configure Domain for SES (Optional)

For production, verify a domain instead of individual emails:

```bash
# Get DNS records to add
aws ses verify-domain-identity --domain yourdomain.com

# Get DKIM tokens
aws ses verify-domain-dkim --domain yourdomain.com
```

Add the returned DNS records to your domain's DNS settings (GoDaddy, Route53, etc.)

## Step 6: Set Up Environment Variables for Application

Get the RDS endpoint from Terraform output:

```bash
terraform output rds_endpoint
```

Update your `.env` file:

```bash
# Database (use RDS endpoint)
DATABASE_URL="postgresql://crmadmin:YourPassword@your-rds-endpoint.amazonaws.com:5432/crmdb"

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# SES Configuration
SES_FROM_EMAIL=your-verified-email@example.com
USE_AWS_SES=true

# S3 Configuration
S3_ATTACHMENTS_BUCKET=crm-email-attachments-production
S3_ASSETS_BUCKET=crm-campaign-assets-production

# SNS Configuration
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:crm-sms-notifications

# Bedrock Configuration
ENABLE_AI_AGENTS=true
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

## Step 7: Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations on RDS
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

## Step 8: Build and Deploy Application

### Option A: Deploy to EC2

1. Launch an EC2 instance (t3.small or larger)
2. SSH into the instance
3. Install Node.js and dependencies
4. Clone your repository
5. Set up PM2 for process management

```bash
# On EC2 instance
npm install -g pm2
npm install
npm run build
pm2 start dist/server.js --name crm-api
pm2 save
pm2 startup
```

### Option B: Deploy to ECS (Recommended)

1. Build Docker image:

```bash
# Create Dockerfile if not exists
docker build -t crm-backend .

# Tag for ECR
docker tag crm-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/crm-backend:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/crm-backend:latest
```

2. Create ECS Task Definition and Service (can be done via AWS Console or CLI)

## Step 9: Configure DNS

Point your domain to the Application Load Balancer:

```bash
# Get ALB DNS name
terraform output alb_dns_name
```

Create a CNAME record in your DNS (GoDaddy, Route53):
- Name: `api` (or whatever subdomain you want)
- Type: `CNAME`
- Value: `your-alb-dns-name.us-east-1.elb.amazonaws.com`

## Step 10: Set Up SSL/TLS (HTTPS)

1. Request SSL certificate in AWS Certificate Manager (ACM)
2. Verify domain ownership
3. Add HTTPS listener to ALB with the certificate

```bash
# Via AWS Console is easier, or use AWS CLI:
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS
```

## Step 11: Configure SMS (SNS)

Set SMS spending limits and preferences:

```bash
# Set monthly spend limit (in USD)
aws sns set-sms-attributes \
  --attributes MonthlySpendLimit=100

# Set default SMS type
aws sns set-sms-attributes \
  --attributes DefaultSMSType=Transactional
```

## Step 12: Enable Bedrock AI Models

1. Go to AWS Bedrock Console
2. Navigate to "Model access"
3. Request access to Claude models (anthropic.claude-3-sonnet)
4. Wait for approval (usually immediate)

## Step 13: Set Up CloudWatch Monitoring

CloudWatch is automatically configured. View logs:

```bash
# View logs
aws logs tail /aws/crm/production --follow
```

Create alarms for critical metrics:

```bash
# Example: Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name crm-high-error-rate \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name Errors \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## Step 14: Testing

### Test SES Email Sending

```bash
curl -X POST https://api.yourdomain.com/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test", "body": "Hello from AWS SES!"}'
```

### Test SNS SMS

```bash
curl -X POST https://api.yourdomain.com/api/test-sms \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "message": "Test SMS from CRM"}'
```

### Test AI Agent

```bash
curl -X POST https://api.yourdomain.com/api/ai/generate-email \
  -H "Content-Type: application/json" \
  -d '{"subject": "Product Launch", "context": {"product": "New CRM Feature"}}'
```

## Step 15: Ongoing Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild
npm run build

# Restart (if using PM2)
pm2 restart crm-api

# Or redeploy ECS task
aws ecs update-service --cluster crm-cluster --service crm-service --force-new-deployment
```

### Monitor Costs

```bash
# Check estimated charges
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### Backup Database

```bash
# RDS automated backups are enabled by default
# Manual snapshot:
aws rds create-db-snapshot \
  --db-instance-identifier crm-postgres-db \
  --db-snapshot-identifier crm-backup-$(date +%Y%m%d)
```

## Estimated Monthly Costs (US East)

- **RDS db.t3.micro**: ~$15/month
- **EC2 t3.small (if used)**: ~$15/month
- **ECS Fargate (1 task)**: ~$30/month
- **ALB**: ~$20/month
- **S3 (10GB storage)**: ~$0.30/month
- **SES (10,000 emails)**: ~$1/month
- **SNS (1,000 SMS)**: ~$10/month
- **CloudWatch**: ~$5/month
- **Bedrock (pay per use)**: Varies (~$0.003 per 1K input tokens)

**Total**: ~$95-100/month

## Troubleshooting

### SES Emails Not Sending

1. Check if email is verified: `aws ses list-identities`
2. Check SES sending limits: `aws ses get-send-quota`
3. Check CloudWatch logs for errors

### Database Connection Issues

1. Verify security group allows inbound on port 5432
2. Check DATABASE_URL is correct
3. Verify RDS is publicly accessible (if connecting from outside VPC)

### High Latency

1. Check ALB target group health
2. Scale ECS tasks or EC2 instances
3. Review CloudWatch metrics for bottlenecks

## Security Best Practices

1. **Use Secrets Manager** for sensitive credentials
2. **Enable VPC Flow Logs** for network monitoring
3. **Use WAF** on ALB to prevent attacks
4. **Enable GuardDuty** for threat detection
5. **Regular security audits** with AWS Inspector
6. **Use least privilege IAM policies**
7. **Enable MFA** on AWS account
8. **Encrypt data at rest** (RDS, S3)

## Scaling

### Auto Scaling ECS

```bash
# Create auto scaling target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/crm-cluster/crm-service \
  --min-capacity 1 \
  --max-capacity 10
```

### Read Replicas for RDS

```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier crm-postgres-replica \
  --source-db-instance-identifier crm-postgres-db
```

## Support

For AWS-specific issues:
- AWS Support (if you have a support plan)
- AWS Forums: https://forums.aws.amazon.com
- AWS Documentation: https://docs.aws.amazon.com

For application issues:
- Check GitHub issues: https://github.com/jeet-avatar/crm-email-marketing-platform/issues
