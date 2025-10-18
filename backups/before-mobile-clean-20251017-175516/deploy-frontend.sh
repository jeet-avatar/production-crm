#!/bin/bash
# BrandMonkz CRM - Frontend Deployment Script
set -e

echo "🚀 Deploying BrandMonkz CRM Frontend to EC2"
echo "==========================================="

# Configuration
EC2_IP="18.212.225.252"
SSH_KEY="$HOME/.ssh/brandmonkz-crm.pem"
LOCAL_DIR="/Users/jeet/Documents/CRM Frontend/crm-app"
APP_DIR="/home/ec2-user/brandmonkz-frontend"

echo "📝 Step 1: Building frontend locally..."
cd "$LOCAL_DIR"
npm run build

echo "✅ Frontend built successfully"

echo "📝 Step 2: Testing SSH connection..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@$EC2_IP "echo '✅ SSH connection successful'"

echo "📝 Step 3: Creating frontend directory on EC2..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP "mkdir -p $APP_DIR"

echo "📝 Step 4: Copying build files to EC2..."
# Copy only the dist folder and necessary files
rsync -avz --progress \
  --delete \
  -e "ssh -i $SSH_KEY" \
  "$LOCAL_DIR/dist/" ec2-user@$EC2_IP:$APP_DIR/

echo "✅ Files copied successfully"

echo "📝 Step 5: Installing and configuring nginx..."
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  # Install nginx if not already installed
  if ! command -v nginx &> /dev/null; then
    sudo yum install -y nginx
  fi

  # Create nginx config for frontend
  sudo tee /etc/nginx/conf.d/brandmonkz-frontend.conf > /dev/null << 'EOF'
server {
    listen 3001;
    server_name _;
    root /home/ec2-user/brandmonkz-frontend;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

  # Start and enable nginx
  sudo systemctl enable nginx
  sudo systemctl restart nginx

  # Check nginx status
  sudo systemctl status nginx --no-pager
ENDSSH

echo "✅ Nginx configured and started"

echo ""
echo "🎉 Frontend Deployment Completed Successfully!"
echo "=============================================="
echo "Frontend URL: http://$EC2_IP:3001"
echo "Backend API: http://$EC2_IP:3000"
echo ""
echo "📝 Useful Commands:"
echo "ssh -i $SSH_KEY ec2-user@$EC2_IP"
echo "sudo systemctl status nginx"
echo "sudo systemctl restart nginx"
echo "sudo tail -f /var/log/nginx/error.log"
echo ""
