#!/bin/bash
# BrandMonkz CRM - Application Deployment Script (Direct Copy Method)
set -e

# Load deployment credentials
if [ -f .env.deploy ]; then
  source .env.deploy
else
  echo "❌ Error: .env.deploy file not found"
  echo "Create it with the required credentials:"
  echo "  AWS_ACCESS_KEY_ID=your_key"
  echo "  AWS_SECRET_ACCESS_KEY=your_secret"
  echo "  DB_PASSWORD=your_db_password"
  echo "  APOLLO_API_KEY=your_api_key"
  exit 1
fi

echo "🚀 Deploying BrandMonkz CRM Application to EC2"
echo "==============================================="

# Configuration
EC2_IP="18.212.225.252"
SSH_KEY="$HOME/.ssh/brandmonkz-crm.pem"
DB_ENDPOINT="brandmonkz-crm-db.c23qcukqe810.us-east-1.rds.amazonaws.com"
LOCAL_DIR="/Users/jeet/Documents/CRM Module"
APP_DIR="/home/ec2-user/brandmonkz-crm"

echo "📝 Step 1: Testing SSH connection..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@$EC2_IP "echo '✅ SSH connection successful'"

echo "📝 Step 2: Creating application directory..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP "mkdir -p $APP_DIR"

echo "📝 Step 3: Copying application files to EC2..."
# Copy files using rsync, excluding unnecessary files
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'dist' \
  --exclude 'uploads' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  -e "ssh -i $SSH_KEY" \
  "$LOCAL_DIR/" ec2-user@$EC2_IP:$APP_DIR/

echo "✅ Files copied successfully"

echo "📝 Step 4: Creating .env file..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << ENDSSH
  cd $APP_DIR
  cat > .env << EOF
# Database
DATABASE_URL="postgresql://brandmonkz:${DB_PASSWORD}@$DB_ENDPOINT:5432/brandmonkz_crm?schema=public"

# Server
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET="${JWT_SECRET:-brandmonkz-production-jwt-secret-change-this-in-production}"
JWT_EXPIRES_IN="7d"

# Google OAuth (use your actual credentials)
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-your-google-client-id}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-your-google-client-secret}"

# Frontend URL
FRONTEND_URL="http://$EC2_IP:3001"
CORS_ORIGIN="http://$EC2_IP:3001"

# AWS
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"

# Apollo.io
APOLLO_API_KEY="${APOLLO_API_KEY}"

# Stripe
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-your-stripe-secret-key}"
STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-your-stripe-publishable-key}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_PLACEHOLDER}"
STRIPE_STARTER_MONTHLY_PRICE_ID="${STRIPE_STARTER_MONTHLY_PRICE_ID:-price_1SEoYzJePbhql2pNPST0TGTt}"
STRIPE_STARTER_ANNUAL_PRICE_ID="${STRIPE_STARTER_ANNUAL_PRICE_ID:-price_1SEoYzJePbhql2pNeUQMDYoa}"
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID="${STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID:-price_1SEoZ0JePbhql2pNoOns39cg}"
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID="${STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID:-price_1SEoZ0JePbhql2pNKgEtI41k}"
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID="${STRIPE_ENTERPRISE_MONTHLY_PRICE_ID:-price_1SEoZ1JePbhql2pNFUuLBq8f}"
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID="${STRIPE_ENTERPRISE_ANNUAL_PRICE_ID:-price_1SEoZ2JePbhql2pNoDfq4njn}"
EOF
ENDSSH

echo "✅ .env file created"

echo "📝 Step 5: Installing dependencies..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  cd /home/ec2-user/brandmonkz-crm
  npm install --production=false
ENDSSH

echo "✅ Dependencies installed"

echo "📝 Step 6: Building application..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  cd /home/ec2-user/brandmonkz-crm
  npm run build
ENDSSH

echo "✅ Application built"

echo "📝 Step 7: Running database migrations..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  cd /home/ec2-user/brandmonkz-crm
  npx prisma migrate deploy
  npx prisma generate
ENDSSH

echo "✅ Database migrations completed"

echo "📝 Step 8: Starting application with PM2..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  cd /home/ec2-user/brandmonkz-crm

  # Stop existing PM2 process if running
  pm2 delete brandmonkz-crm 2>/dev/null || true

  # Start new process
  pm2 start dist/server.js --name brandmonkz-crm

  # Save PM2 process list
  pm2 save

  # Show status
  pm2 status
ENDSSH

echo "✅ Application started with PM2"

echo ""
echo "🎉 Deployment Completed Successfully!"
echo "====================================="
echo "Backend API URL: http://$EC2_IP:3000"
echo ""
echo "📝 Useful Commands:"
echo "ssh -i $SSH_KEY ec2-user@$EC2_IP"
echo "pm2 logs brandmonkz-crm"
echo "pm2 status"
echo "pm2 restart brandmonkz-crm"
echo ""
