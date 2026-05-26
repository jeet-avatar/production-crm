#!/bin/bash

# Deploy AWS Infrastructure Script
# This script sets up the complete AWS infrastructure for the CRM system

set -e

echo "🚀 Starting AWS Infrastructure Deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform not found. Please install it first.${NC}"
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${BLUE}📋 AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${BLUE}📋 AWS Region: ${AWS_REGION}${NC}"

# Step 1: Create ECR Repository
echo -e "\n${BLUE}📦 Creating ECR Repository...${NC}"
aws ecr describe-repositories --repository-names crm-backend --region $AWS_REGION 2>/dev/null || \
aws ecr create-repository \
    --repository-name crm-backend \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true

ECR_URI=$(aws ecr describe-repositories --repository-names crm-backend --region $AWS_REGION --query 'repositories[0].repositoryUri' --output text)
echo -e "${GREEN}✅ ECR Repository: ${ECR_URI}${NC}"

# Step 2: Deploy Terraform Infrastructure
echo -e "\n${BLUE}🏗️  Deploying Terraform Infrastructure...${NC}"
cd aws/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply infrastructure
echo -e "${BLUE}Applying Terraform changes...${NC}"
terraform apply tfplan

# Get outputs
RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "")
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")

echo -e "\n${GREEN}✅ Terraform deployment complete!${NC}"
echo -e "${GREEN}   RDS Endpoint: ${RDS_ENDPOINT}${NC}"
echo -e "${GREEN}   ALB DNS: ${ALB_DNS}${NC}"

# Step 3: Create ECS Task Definition
echo -e "\n${BLUE}📋 Creating ECS Task Definition...${NC}"

cat > task-definition.json <<EOF
{
  "family": "crm-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/crm-app-role",
  "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/crm-app-role",
  "containerDefinitions": [
    {
      "name": "crm-backend",
      "image": "${ECR_URI}:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:crm/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/aws/crm/production",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "crm"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition \
    --cli-input-json file://task-definition.json \
    --region $AWS_REGION

echo -e "${GREEN}✅ ECS Task Definition created${NC}"

# Step 4: Create ECS Service
echo -e "\n${BLUE}🚀 Creating ECS Service...${NC}"

# Get subnet IDs from Terraform
SUBNET_IDS=$(terraform output -json | jq -r '.public_subnet_ids.value | join(",")')
SECURITY_GROUP_ID=$(terraform output -json | jq -r '.app_security_group_id.value')
TARGET_GROUP_ARN=$(terraform output -json | jq -r '.target_group_arn.value')

aws ecs create-service \
    --cluster crm-cluster \
    --service-name crm-service \
    --task-definition crm-task \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SECURITY_GROUP_ID}],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=${TARGET_GROUP_ARN},containerName=crm-backend,containerPort=3000" \
    --region $AWS_REGION 2>/dev/null || echo "Service already exists"

echo -e "${GREEN}✅ ECS Service created${NC}"

# Step 5: Summary
echo -e "\n${GREEN}🎉 Infrastructure Deployment Complete!${NC}"
echo -e "\n${BLUE}📋 Deployment Summary:${NC}"
echo -e "   ECR Repository: ${ECR_URI}"
echo -e "   RDS Endpoint: ${RDS_ENDPOINT}"
echo -e "   Load Balancer: ${ALB_DNS}"
echo -e "   ECS Cluster: crm-cluster"
echo -e "   ECS Service: crm-service"
echo -e "\n${BLUE}🔗 Next Steps:${NC}"
echo -e "   1. Update DATABASE_URL in GitHub Secrets"
echo -e "   2. Push code to main branch to trigger deployment"
echo -e "   3. Point brandmonkz.com to ${ALB_DNS}"
echo -e "\n${GREEN}Done! 🚀${NC}"
