#!/bin/bash

# Production Deployment Script for BrandMonkz CRM
# This script deploys the latest code to production EC2 instance

set -e  # Exit on error

echo "🚀 Starting Production Deployment for BrandMonkz CRM"
echo "=================================================="
echo ""

# Configuration
EC2_HOST="18.212.225.252"
EC2_USER="ubuntu"
SSH_KEY="$HOME/.ssh/brandmonkz-crm.pem"
BACKEND_DIR="/home/ubuntu/brandmonkz-crm-backend"
PM2_APP_NAME="crm-backend"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "${BLUE}Step 1: Checking SSH connectivity...${NC}"
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo "${RED}❌ Cannot connect to EC2 instance${NC}"
    echo "${YELLOW}Trying AWS EC2 Instance Connect as fallback...${NC}"
    echo "You can also manually deploy using AWS Console → EC2 → Instance Connect"
    exit 1
fi
echo "${GREEN}✅ SSH connection successful${NC}"
echo ""

echo "${BLUE}Step 2: Backing up current production code...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "cd $BACKEND_DIR && git stash save 'backup-$(date +%Y%m%d-%H%M%S)' || true"
echo "${GREEN}✅ Backup created${NC}"
echo ""

echo "${BLUE}Step 3: Pulling latest code from GitHub...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "cd $BACKEND_DIR && git fetch origin && git reset --hard origin/main"
COMMIT_HASH=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "cd $BACKEND_DIR && git rev-parse --short HEAD")
echo "${GREEN}✅ Latest code pulled (commit: $COMMIT_HASH)${NC}"
echo ""

echo "${BLUE}Step 4: Installing dependencies...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "cd $BACKEND_DIR && npm install --production"
echo "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo "${BLUE}Step 5: Building TypeScript code...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "cd $BACKEND_DIR && npm run build"
echo "${GREEN}✅ Build completed${NC}"
echo ""

echo "${BLUE}Step 6: Running database migrations...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "cd $BACKEND_DIR && npx prisma migrate deploy"
echo "${GREEN}✅ Database migrations completed${NC}"
echo ""

echo "${BLUE}Step 7: Restarting PM2 application...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "pm2 restart $PM2_APP_NAME"
echo "${GREEN}✅ Application restarted${NC}"
echo ""

echo "${BLUE}Step 8: Verifying deployment...${NC}"
sleep 5  # Give the server time to start
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://$EC2_HOST:3000/health)

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "${GREEN}✅ Health check passed (HTTP 200)${NC}"
else
    echo "${RED}❌ Health check failed (HTTP $HEALTH_CHECK)${NC}"
    echo "${YELLOW}Check PM2 logs: ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'pm2 logs $PM2_APP_NAME'${NC}"
    exit 1
fi
echo ""

echo "${BLUE}Step 9: Checking PM2 status...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "pm2 list | grep $PM2_APP_NAME"
echo ""

echo "${GREEN}=================================================="
echo "✅ Production Deployment Completed Successfully!"
echo "==================================================${NC}"
echo ""
echo "Deployed commit: $COMMIT_HASH"
echo "Backend API: http://$EC2_HOST:3000"
echo "Frontend: http://brandmonkz-crm-frontend.s3-website-us-east-1.amazonaws.com"
echo ""
echo "View logs: ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'pm2 logs $PM2_APP_NAME'"
echo "Monitor: ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'pm2 monit'"
echo ""
