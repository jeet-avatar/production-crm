#!/bin/bash
# Quick Deployment Script for Production CRM
# Usage: ./deploy.sh [backend|frontend|all]

set -e

# Configuration
EC2_HOST="100.24.213.224"
EC2_USER="ec2-user"
SSH_KEY="$HOME/.ssh/brandmonkz-crm.pem"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 BrandMonkz CRM - Production Deployment${NC}"
echo "=========================================="

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    exit 1
fi

# Function to deploy backend
deploy_backend() {
    echo -e "\n${BLUE}📦 Building Backend...${NC}"

    cd backend

    # Install dependencies
    echo "Installing dependencies..."
    npm ci

    # Build TypeScript
    echo "Building TypeScript..."
    NODE_OPTIONS='--max-old-space-size=4096' npm run build

    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ Build failed - dist folder not created${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Backend built successfully${NC}"

    # Create deployment tarball
    echo "Creating deployment package..."
    tar -czf ../backend-deploy.tar.gz \
        dist/ \
        package.json \
        package-lock.json \
        prisma/

    cd ..

    # Upload to EC2
    echo -e "\n${BLUE}📤 Uploading to EC2...${NC}"
    scp -i "$SSH_KEY" backend-deploy.tar.gz $EC2_USER@$EC2_HOST:/tmp/

    # Deploy on EC2
    echo -e "\n${BLUE}🔧 Deploying on EC2...${NC}"
    ssh -i "$SSH_KEY" $EC2_USER@$EC2_HOST << 'ENDSSH'
        set -e
        cd /var/www/crm-backend/backend

        # Backup current version
        if [ -d "dist" ]; then
            echo "Creating backup..."
            cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)
        fi

        # Extract new version
        echo "Extracting new version..."
        tar -xzf /tmp/backend-deploy.tar.gz

        # Install dependencies
        echo "Installing dependencies..."
        npm ci --production

        # Restart PM2
        echo "Restarting backend..."
        pm2 restart crm-backend

        # Wait and check health
        sleep 5
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ Backend is healthy"
        else
            echo "❌ Health check failed"
            exit 1
        fi

        # Cleanup
        rm /tmp/backend-deploy.tar.gz
ENDSSH

    # Cleanup local
    rm backend-deploy.tar.gz

    echo -e "${GREEN}✅ Backend deployed successfully${NC}"
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "\n${BLUE}📦 Building Frontend...${NC}"

    cd frontend

    # Install dependencies
    echo "Installing dependencies..."
    npm ci

    # Build with production config
    echo "Building frontend..."
    VITE_API_URL=https://brandmonkz.com npm run build

    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ Build failed - dist folder not created${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Frontend built successfully${NC}"

    # Create deployment tarball
    echo "Creating deployment package..."
    tar -czf ../frontend-deploy.tar.gz -C dist .

    cd ..

    # Upload to EC2
    echo -e "\n${BLUE}📤 Uploading to EC2...${NC}"
    scp -i "$SSH_KEY" frontend-deploy.tar.gz $EC2_USER@$EC2_HOST:/tmp/

    # Deploy on EC2
    echo -e "\n${BLUE}🔧 Deploying on EC2...${NC}"
    ssh -i "$SSH_KEY" $EC2_USER@$EC2_HOST << 'ENDSSH'
        set -e

        # Backup current version
        if [ -d "/var/www/brandmonkz" ] && [ "$(ls -A /var/www/brandmonkz)" ]; then
            echo "Creating backup..."
            sudo mkdir -p /var/www/backups
            sudo tar -czf /var/www/backups/brandmonkz.backup.$(date +%Y%m%d_%H%M%S).tar.gz -C /var/www/brandmonkz .
        fi

        # Extract new version
        echo "Extracting new version..."
        sudo rm -rf /var/www/brandmonkz/*
        sudo tar -xzf /tmp/frontend-deploy.tar.gz -C /var/www/brandmonkz/

        # Set permissions
        sudo chown -R nginx:nginx /var/www/brandmonkz
        sudo chmod -R 755 /var/www/brandmonkz

        # Cleanup
        rm /tmp/frontend-deploy.tar.gz

        echo "✅ Frontend deployed successfully"
ENDSSH

    # Cleanup local
    rm frontend-deploy.tar.gz

    echo -e "${GREEN}✅ Frontend deployed successfully${NC}"
}

# Main deployment logic
case "${1:-all}" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        deploy_frontend
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac

# Final verification
echo -e "\n${BLUE}🏥 Running final health checks...${NC}"

# Check backend
if curl -sf https://brandmonkz.com/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${RED}⚠️  Backend health check failed${NC}"
fi

# Check frontend
if curl -sf https://brandmonkz.com/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${RED}⚠️  Frontend health check failed${NC}"
fi

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo "=========================================="
echo "Frontend: https://brandmonkz.com"
echo "Backend API: https://brandmonkz.com/health"
