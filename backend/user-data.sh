#!/bin/bash
# BrandMonkz CRM - EC2 User Data Script for Amazon Linux 2023

# Update system
dnf update -y

# Install Node.js 18 (Amazon Linux 2023 uses dnf and has better compatibility)
dnf install -y nodejs npm

# Install PostgreSQL client
dnf install -y postgresql15

# Install Nginx
dnf install -y nginx

# Install PM2 globally
npm install -g pm2

# Install Git
dnf install -y git

# Create app directory
mkdir -p /home/ec2-user/brandmonkz-crm
chown -R ec2-user:ec2-user /home/ec2-user/brandmonkz-crm

# Configure Nginx
systemctl enable nginx
systemctl start nginx

echo "✅ EC2 instance initialized successfully!" > /home/ec2-user/init-complete.txt
