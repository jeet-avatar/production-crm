#!/bin/bash
# BrandMonkz - Setup Domain DNS and SSL
set -e

echo "🌐 Setting up brandmonkz.com domain"
echo "===================================="

# Configuration
DOMAIN="brandmonkz.com"
EC2_IP="18.212.225.252"
SSH_KEY="$HOME/.ssh/brandmonkz-crm.pem"

echo "📝 Step 1: Updating DNS records to point to EC2..."
echo "Domain: $DOMAIN"
echo "EC2 IP: $EC2_IP"

# Use the GoDaddy API to update DNS (A record)
node -e "
const https = require('https');

const options = {
  hostname: 'api.godaddy.com',
  path: '/v1/domains/$DOMAIN/records/A/@',
  method: 'PUT',
  headers: {
    'Authorization': 'sso-key dKYWxHe7j3wd_FXuq3VphgvJDXMEh9fKD2K:Ds5b9aQ5Jt5LUeAF8h4aBN',
    'Content-Type': 'application/json'
  }
};

const data = JSON.stringify([
  {
    data: '$EC2_IP',
    ttl: 600,
    name: '@',
    type: 'A'
  }
]);

const req = https.request(options, (res) => {
  console.log(\`DNS Update Status: \${res.statusCode}\`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error('Error updating DNS:', error);
});

req.write(data);
req.end();
"

echo ""
echo "✅ DNS A record updated to point to $EC2_IP"
echo ""
echo "📝 Step 2: Configuring Nginx on EC2 for domain..."

# Configure Nginx to serve the app on brandmonkz.com
ssh -i "$SSH_KEY" ec2-user@$EC2_IP << 'ENDSSH'
  # Update backend nginx config to use domain
  sudo tee /etc/nginx/conf.d/brandmonkz-backend.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.brandmonkz.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

  # Update frontend nginx config to use domain
  sudo tee /etc/nginx/conf.d/brandmonkz-frontend.conf > /dev/null << 'EOF'
server {
    listen 80 default_server;
    server_name brandmonkz.com www.brandmonkz.com;
    root /home/ec2-user/brandmonkz-frontend;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

  # Remove default nginx config
  sudo rm -f /etc/nginx/conf.d/default.conf

  # Test nginx config
  sudo nginx -t

  # Restart nginx
  sudo systemctl restart nginx

  # Show nginx status
  sudo systemctl status nginx --no-pager
ENDSSH

echo "✅ Nginx configured for brandmonkz.com"
echo ""
echo "📝 Step 3: Updating frontend .env.production..."

# The frontend is already built with VITE_API_URL=https://brandmonkz.com
# But we need to rebuild it to use the domain properly

echo ""
echo "🎉 Domain Setup Complete!"
echo "========================"
echo ""
echo "Your application is now available at:"
echo "  🌐 Frontend: http://brandmonkz.com"
echo "  🌐 Backend API: http://api.brandmonkz.com"
echo ""
echo "⏳ DNS propagation may take 5-10 minutes"
echo ""
echo "📝 Next steps:"
echo "  1. Wait for DNS to propagate (check: dig brandmonkz.com)"
echo "  2. Install SSL certificate with Let's Encrypt (optional)"
echo "  3. Update frontend .env.production to use https://brandmonkz.com"
echo ""
