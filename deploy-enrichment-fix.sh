#!/bin/bash

# Deployment script for enrichment bug fix
# This fixes the Prisma validation error when firstName/lastName are null

echo "🚀 Deploying enrichment bug fix to production..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/var/www/crm-backend/backend"
SERVER="root@100.24.213.224"

echo -e "${YELLOW}Step 1: Copying fixed files to production...${NC}"
scp src/routes/enrichment.ts "${SERVER}:${BACKEND_DIR}/src/routes/"
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to copy files to production${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Files copied successfully${NC}"
echo ""

echo -e "${YELLOW}Step 2: Building backend on production...${NC}"
ssh "${SERVER}" "cd ${BACKEND_DIR} && npm run build"
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

echo -e "${YELLOW}Step 3: Restarting PM2...${NC}"
ssh "${SERVER}" "pm2 restart crm-backend"
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ PM2 restart failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PM2 restarted successfully${NC}"
echo ""

echo -e "${YELLOW}Step 4: Checking PM2 status...${NC}"
ssh "${SERVER}" "pm2 status"
echo ""

echo -e "${YELLOW}Step 5: Checking logs for errors...${NC}"
ssh "${SERVER}" "pm2 logs crm-backend --lines 20 --nostream"
echo ""

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "The enrichment bug has been fixed:"
echo "  - Added null checks for firstName/lastName"
echo "  - Skip professionals with missing name data"
echo "  - Build dynamic query to avoid Prisma validation errors"
echo ""
echo "Monitor logs with: ssh ${SERVER} 'pm2 logs crm-backend'"
