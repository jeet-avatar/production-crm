#!/bin/bash
# BrandMonkz CRM - Application Deployment Script
set -e

# Load deployment credentials
if [ -f .env.deploy ]; then
  source .env.deploy
else
  echo "❌ Error: .env.deploy file not found"
  echo "Create it with the required credentials"
  exit 1
fi

echo "🚀 Deploying BrandMonkz CRM Application to EC2"
echo "==============================================="

# Configuration
EC2_IP="54.234.39.9"
SSH_KEY="$HOME/.ssh/brandmonkz-crm.pem"
DB_ENDPOINT="brandmonkz-crm-db.c23qcukqe810.us-east-1.rds.amazonaws.com"
GITHUB_REPO="https://github.com/jeet-avatar/crm-email-marketing-platform.git"
APP_DIR="/home/ec2-user/brandmonkz-crm"

echo "📝 Step 1: Testing SSH connection..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@$EC2_IP "echo '✅ SSH connection successful'"

echo "📝 Step 2: Cloning repository..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  cd /home/ec2-user
  # Remove existing directory if it's not a git repo
  if [ -d "brandmonkz-crm" ] && [ ! -d "brandmonkz-crm/.git" ]; then
    echo "Removing invalid directory..."
    rm -rf brandmonkz-crm
  fi

  if [ -d "brandmonkz-crm/.git" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd brandmonkz-crm
    git pull
  else
    echo "Cloning repository..."
    git clone https://github.com/jeet-avatar/crm-email-marketing-platform.git brandmonkz-crm
    cd brandmonkz-crm
  fi
ENDSSH

echo "✅ Repository cloned/updated"

echo "📝 Step 3: Creating .env file..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << ENDSSH
  cd $APP_DIR
  cat > .env << EOF
# Database
DATABASE_URL="postgresql://brandmonkz:${DB_PASSWORD}@${DB_ENDPOINT}:5432/brandmonkz_crm?schema=public"

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
FRONTEND_URL="http://${EC2_IP}:3001"
CORS_ORIGIN="http://${EC2_IP}:3001"

# AWS
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"

# Apollo.io
APOLLO_API_KEY="${APOLLO_API_KEY:-your-apollo-api-key}"

# Stripe
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-your-stripe-secret-key}"
STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-your-stripe-publishable-key}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-your-stripe-webhook-secret}"
EOF
ENDSSH

echo "✅ .env file created"

echo "📝 Step 4: Installing dependencies..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  cd /home/ec2-user/brandmonkz-crm
  npm install --production=false
ENDSSH

echo "✅ Dependencies installed"

echo "📝 Step 5: Building application..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  cd /home/ec2-user/brandmonkz-crm
  npm run build
ENDSSH

echo "✅ Application built"

echo "📝 Step 6: Running database migrations..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  cd /home/ec2-user/brandmonkz-crm
  npx prisma migrate deploy
  npx prisma generate
ENDSSH

echo "✅ Database migrations completed"

echo "📝 Step 7: Starting application with PM2..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  cd /home/ec2-user/brandmonkz-crm

  # Stop existing PM2 process if running
  pm2 delete brandmonkz-crm 2>/dev/null || true

  # Start new process
  pm2 start dist/server.js --name brandmonkz-crm

  # Save PM2 process list
  pm2 save

  # Setup PM2 to start on boot
  pm2 startup systemd -u ec2-user --hp /home/ec2-user | grep "sudo" | bash || true
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
