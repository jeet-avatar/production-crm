#!/bin/bash

# Script to update nginx upload limit for video uploads
# This increases client_max_body_size to allow larger video uploads

echo "🔧 Updating Nginx upload limit for video uploads..."

# Check current nginx configuration
echo "📋 Current nginx configuration:"
sudo grep -r "client_max_body_size" /etc/nginx/ 2>/dev/null || echo "No client_max_body_size directive found"

# Backup nginx configuration
echo "💾 Backing up nginx configuration..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# Check if client_max_body_size already exists
if sudo grep -q "client_max_body_size" /etc/nginx/nginx.conf; then
    echo "⚠️  client_max_body_size already exists. Updating it..."
    sudo sed -i 's/client_max_body_size [^;]*;/client_max_body_size 500M;/' /etc/nginx/nginx.conf
else
    echo "➕ Adding client_max_body_size directive..."
    # Add to http block
    sudo sed -i '/http {/a \    client_max_body_size 500M;' /etc/nginx/nginx.conf
fi

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"

    # Reload nginx
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx

    echo "✅ Nginx upload limit updated to 500M"
    echo "📋 New configuration:"
    sudo grep "client_max_body_size" /etc/nginx/nginx.conf
else
    echo "❌ Nginx configuration test failed. Restoring backup..."
    sudo mv /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/nginx.conf
    exit 1
fi

echo "🎉 Done! Video uploads up to 500MB are now supported."
