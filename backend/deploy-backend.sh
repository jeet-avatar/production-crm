#!/bin/bash

# Backend deployment script with memory optimization
# Handles low-memory servers by building locally and syncing

echo "🚀 Starting backend deployment..."

# Step 1: Build locally
echo "📦 Building backend locally..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Local build failed"
    exit 1
fi
echo "✅ Local build successful"

# Step 2: Sync to server (excluding node_modules)
echo "📤 Syncing code to production server..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
    -e "ssh -i ~/.ssh/brandmonkz-crm.pem" \
    . ec2-user@18.212.225.252:/var/www/crm-backend/backend/

if [ $? -ne 0 ]; then
    echo "⚠️  Trying alternate IP..."
    rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
        -e "ssh -i ~/.ssh/brandmonkz-crm.pem" \
        . ec2-user@34.228.81.35:/var/www/crm-backend/backend/
fi

echo "✅ Code synced to server"

# Step 3: Restart PM2
echo "🔄 Restarting backend service..."
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 "cd /var/www/crm-backend/backend && pm2 restart crm-backend" || \
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@34.228.81.35 "cd /var/www/crm-backend/backend && pm2 restart crm-backend"

echo "✅ Backend deployed successfully!"
echo ""
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs crm-backend"
