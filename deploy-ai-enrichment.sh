#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# AI ENRICHMENT DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script deploys AI enrichment updates to the EC2 sandbox server
# It uses rsync for efficient file transfer and automatic dependency management
#
# Usage: bash deploy-ai-enrichment.sh
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EC2_HOST="18.212.225.252"
EC2_USER="ec2-user"
SSH_KEY="$HOME/.ssh/brandmonkz-crm.pem"
REMOTE_DIR="crm-backend"
LOCAL_DIR="/Users/jeet/Documents/CRM Module"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   AI ENRICHMENT DEPLOYMENT - AUTOMATED${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Pre-flight checks
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[1/6] Running pre-flight checks...${NC}"

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}✗ SSH key not found: $SSH_KEY${NC}"
    exit 1
fi

if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST "echo 'OK'" &> /dev/null; then
    echo -e "${RED}✗ Cannot connect to EC2 instance${NC}"
    exit 1
fi

echo -e "${GREEN}✓ SSH connection verified${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Sync updated files to EC2
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[2/6] Syncing updated files to EC2...${NC}"

# Only sync files that changed
rsync -avz --progress \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  --include='prisma/***' \
  --include='src/***' \
  --include='package.json' \
  --include='package-lock.json' \
  --include='tsconfig.json' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.env' \
  "$LOCAL_DIR/" \
  "$EC2_USER@$EC2_HOST:~/$REMOTE_DIR/"

echo -e "${GREEN}✓ Files synced successfully${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Install dependencies
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[3/6] Installing dependencies...${NC}"

ssh -i "$SSH_KEY" $EC2_USER@$EC2_HOST << 'ENDSSH'
cd crm-backend
echo "📦 Running npm install..."
npm install --production=false
ENDSSH

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Run database migrations
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[4/6] Running database migrations...${NC}"

ssh -i "$SSH_KEY" $EC2_USER@$EC2_HOST << 'ENDSSH'
cd crm-backend
echo "🗄️  Generating Prisma client..."
npx prisma generate

echo "🔄 Deploying database migrations..."
npx prisma migrate deploy

echo "✅ Database schema updated"
ENDSSH

echo -e "${GREEN}✓ Migrations applied${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: Build application
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[5/6] Building application...${NC}"

ssh -i "$SSH_KEY" $EC2_USER@$EC2_HOST << 'ENDSSH'
cd crm-backend
echo "🔨 Running TypeScript build..."
npm run build

echo "✅ Build complete"
ENDSSH

echo -e "${GREEN}✓ Application built${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: Restart PM2 process
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[6/6] Restarting application...${NC}"

ssh -i "$SSH_KEY" $EC2_USER@$EC2_HOST << 'ENDSSH'
cd crm-backend
echo "🔄 Restarting PM2 process..."
pm2 restart crm-backend || pm2 start dist/server.js --name crm-backend

echo "💾 Saving PM2 configuration..."
pm2 save

echo "📊 Current PM2 status:"
pm2 status
ENDSSH

echo -e "${GREEN}✓ Application restarted${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}Verifying deployment...${NC}"

sleep 3

# Check if backend is responding
HEALTH_CHECK=$(ssh -i "$SSH_KEY" $EC2_USER@$EC2_HOST "curl -s http://localhost:3000/health" || echo "FAILED")

if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "  Response: $HEALTH_CHECK"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   DEPLOYMENT COMPLETE ✓${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}AI Enrichment Features:${NC}"
echo "  • Video URL extraction from job postings"
echo "  • Hiring intent analysis"
echo "  • Personalized sales pitch generation"
echo "  • Support for 250+ company bulk imports"
echo ""
echo -e "${GREEN}API Endpoints:${NC}"
echo "  • POST /api/enrichment/companies/:id/enrich"
echo "  • POST /api/enrichment/companies/bulk-enrich"
echo ""
echo -e "${YELLOW}Test Enrichment:${NC}"
echo "  curl -X POST https://api-sandbox.brandmonkz.com/api/enrichment/companies/{id}/enrich \\"
echo "    -H 'Authorization: Bearer {token}'"
echo ""
echo -e "${YELLOW}View Logs:${NC}"
echo "  ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'pm2 logs crm-backend --lines 50'"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
