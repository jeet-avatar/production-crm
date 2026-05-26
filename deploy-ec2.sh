#!/bin/bash
# BrandMonkz CRM - EC2 Deployment Script
set -e

# Load deployment credentials
if [ -f .env.deploy ]; then
  source .env.deploy
else
  echo "❌ Error: .env.deploy file not found"
  echo "Create it with the required credentials"
  exit 1
fi

echo "🚀 BrandMonkz CRM - AWS EC2 Deployment"
echo "========================================"

# AWS Configuration
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"

# Step 1: Create Security Group
echo "📝 Step 1: Creating Security Group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name brandmonkz-crm-sg \
  --description "BrandMonkz CRM Security Group" \
  --output text --query 'GroupId' 2>/dev/null || \
  aws ec2 describe-security-groups \
    --group-names brandmonkz-crm-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "✅ Security Group: $SG_ID"

# Add security group rules
echo "📝 Adding Security Group rules..."
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0 2>/dev/null || true
echo "✅ Security rules configured"

# Step 2: Create Key Pair
echo "📝 Step 2: Creating SSH Key Pair..."
if [ ! -f ~/.ssh/brandmonkz-crm.pem ]; then
  aws ec2 create-key-pair \
    --key-name brandmonkz-crm-key \
    --query 'KeyMaterial' \
    --output text > ~/.ssh/brandmonkz-crm.pem
  chmod 400 ~/.ssh/brandmonkz-crm.pem
  echo "✅ Key pair created: ~/.ssh/brandmonkz-crm.pem"
else
  echo "✅ Key pair already exists"
fi

# Step 3: Launch EC2 Instance
echo "📝 Step 3: Launching EC2 Instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id ami-052064a798f08f0d3 \
  --instance-type t3.small \
  --key-name brandmonkz-crm-key \
  --security-group-ids $SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=brandmonkz-crm},{Key=Project,Value=BrandMonkz}]' \
  --user-data file://user-data.sh \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "✅ EC2 Instance launched: $INSTANCE_ID"

# Step 4: Wait for instance to be running
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "✅ Instance is running!"
echo "📍 Public IP: $PUBLIC_IP"

# Step 5: Create RDS Database
echo "📝 Step 5: Creating RDS PostgreSQL Database..."
DB_INSTANCE_ID="brandmonkz-crm-db"

# Create DB subnet group first
echo "Creating DB subnet group..."
aws ec2 describe-subnets --query 'Subnets[0:2].SubnetId' --output text | xargs -n2 | while read SUBNET1 SUBNET2; do
  aws rds create-db-subnet-group \
    --db-subnet-group-name brandmonkz-db-subnet \
    --db-subnet-group-description "BrandMonkz DB Subnet Group" \
    --subnet-ids $SUBNET1 $SUBNET2 2>/dev/null || true
done

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier $DB_INSTANCE_ID \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username brandmonkz \
  --master-user-password "${DB_PASSWORD}" \
  --allocated-storage 20 \
  --db-name brandmonkz_crm \
  --vpc-security-group-ids $SG_ID \
  --db-subnet-group-name brandmonkz-db-subnet \
  --publicly-accessible \
  --backup-retention-period 7 \
  --tags Key=Name,Value=brandmonkz-crm-db Key=Project,Value=BrandMonkz \
  2>/dev/null || echo "Database may already exist"

echo "⏳ Waiting for RDS database to be available (this may take 5-10 minutes)..."
aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_ID 2>/dev/null || true

# Get database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_INSTANCE_ID \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text 2>/dev/null || echo "pending")

echo "✅ Database Endpoint: $DB_ENDPOINT"

# Step 6: Create S3 bucket for frontend
echo "📝 Step 6: Creating S3 bucket for frontend..."
BUCKET_NAME="brandmonkz-crm-frontend"
aws s3 mb s3://$BUCKET_NAME --region us-east-1 2>/dev/null || echo "Bucket may already exist"
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

echo "✅ S3 Bucket created: $BUCKET_NAME"

# Summary
echo ""
echo "🎉 AWS Infrastructure Created Successfully!"
echo "=========================================="
echo "EC2 Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "Database Endpoint: $DB_ENDPOINT"
echo "S3 Bucket: $BUCKET_NAME"
echo "SSH Key: ~/.ssh/brandmonkz-crm.pem"
echo ""
echo "🔑 SSH Command:"
echo "ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@$PUBLIC_IP"
echo ""
echo "📝 Next Steps:"
echo "1. Wait ~5 minutes for instance to initialize"
echo "2. SSH into the instance"
echo "3. Deploy the application"
echo ""
echo "Save these details for later!"
