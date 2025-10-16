#!/bin/bash

# Update Production Frontend on brandmonkz.com
# This script updates the CRM frontend files on the nginx server

set -e

echo "🚀 Updating Production Frontend on brandmonkz.com"
echo "================================================"
echo ""

# Configuration
EC2_HOST="18.212.225.252"
EC2_USER="ubuntu"
SSH_KEY="$HOME/.ssh/brandmonkz-crm.pem"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "${BLUE}Step 1: Building latest frontend...${NC}"
cd "$(dirname "$0")/frontend"
npm run build
echo "${GREEN}✅ Frontend built successfully${NC}"
echo ""

echo "${BLUE}Step 2: Creating deployment package...${NC}"
cd dist
tar -czf /tmp/crm-frontend-latest.tar.gz .
echo "${GREEN}✅ Package created: /tmp/crm-frontend-latest.tar.gz${NC}"
echo ""

echo "${BLUE}Step 3: Finding nginx web root on EC2...${NC}"
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$EC2_USER@$EC2_HOST" "echo 'Connected'" > /dev/null 2>&1; then
    echo "${RED}❌ Cannot connect to EC2. Please use manual steps below:${NC}"
    echo ""
    echo "${YELLOW}MANUAL DEPLOYMENT STEPS:${NC}"
    echo "1. Go to AWS Console → EC2 → Instance Connect"
    echo "2. Connect to instance: 18.212.225.252"
    echo "3. Run these commands:"
    echo ""
    echo "   # Find nginx web root"
    echo "   sudo grep -r 'root.*brandmonkz' /etc/nginx/"
    echo ""
    echo "   # Common locations:"
    echo "   # /var/www/brandmonkz"
    echo "   # /var/www/html"
    echo "   # /usr/share/nginx/html"
    echo ""
    echo "4. Download the built frontend from local:"
    echo "   scp -r ./frontend/dist/* ubuntu@18.212.225.252:/path/to/web/root/"
    echo ""
    echo "5. Restart nginx:"
    echo "   sudo systemctl restart nginx"
    echo ""
    exit 1
fi

# Find nginx config
NGINX_ROOT=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "sudo grep -r 'root.*brandmonkz\|root.*html' /etc/nginx/sites-enabled/ 2>/dev/null | grep -v '#' | head -1 | awk '{print \$NF}' | tr -d ';'")

if [ -z "$NGINX_ROOT" ]; then
    # Try default locations
    for location in "/var/www/brandmonkz" "/var/www/html" "/usr/share/nginx/html"; do
        if ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "[ -d $location ]"; then
            NGINX_ROOT=$location
            break
        fi
    done
fi

if [ -z "$NGINX_ROOT" ]; then
    echo "${RED}❌ Could not find nginx web root${NC}"
    echo "${YELLOW}Please manually check nginx config:${NC}"
    echo "ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'sudo cat /etc/nginx/sites-enabled/*'"
    exit 1
fi

echo "${GREEN}✅ Found nginx root: $NGINX_ROOT${NC}"
echo ""

echo "${BLUE}Step 4: Backing up current frontend...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "sudo tar -czf /tmp/frontend-backup-\$(date +%Y%m%d-%H%M%S).tar.gz -C $NGINX_ROOT ."
echo "${GREEN}✅ Backup created${NC}"
echo ""

echo "${BLUE}Step 5: Uploading new frontend...${NC}"
scp -i "$SSH_KEY" /tmp/crm-frontend-latest.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"
echo "${GREEN}✅ Files uploaded${NC}"
echo ""

echo "${BLUE}Step 6: Deploying new frontend...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "sudo rm -rf $NGINX_ROOT/* && sudo tar -xzf /tmp/crm-frontend-latest.tar.gz -C $NGINX_ROOT"
echo "${GREEN}✅ Files deployed${NC}"
echo ""

echo "${BLUE}Step 7: Setting permissions...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "sudo chown -R www-data:www-data $NGINX_ROOT && sudo chmod -R 755 $NGINX_ROOT"
echo "${GREEN}✅ Permissions set${NC}"
echo ""

echo "${BLUE}Step 8: Restarting nginx...${NC}"
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "sudo systemctl restart nginx"
echo "${GREEN}✅ Nginx restarted${NC}"
echo ""

echo "${BLUE}Step 9: Verifying deployment...${NC}"
sleep 2
NEW_BUNDLE=$(curl -s https://brandmonkz.com | grep -o 'index-[^.]*\.js' | head -1)
echo "Current bundle: $NEW_BUNDLE"

if [ "$NEW_BUNDLE" = "index-Dydrtw7Z.js" ]; then
    echo "${GREEN}✅ Frontend successfully updated!${NC}"
else
    echo "${YELLOW}⚠️  Bundle version may not have updated. Clear browser cache.${NC}"
fi
echo ""

echo "${GREEN}================================================"
echo "✅ Production Frontend Updated Successfully!"
echo "===============================================${NC}"
echo ""
echo "Production URL: https://brandmonkz.com"
echo "Test: Open https://brandmonkz.com in incognito/private window"
echo ""
echo "If still showing old version:"
echo "1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "2. Clear browser cache"
echo "3. Check in incognito/private window"
echo ""
