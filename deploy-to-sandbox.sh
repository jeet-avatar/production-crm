#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# DEPLOY TO SANDBOX - brandmonkz.com
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script deploys the CRM application to sandbox.brandmonkz.com
#
# Prerequisites:
# 1. AWS CLI configured with credentials
# 2. SSH key for EC2 access
# 3. Existing sandbox EC2 instance
# 4. Existing sandbox S3 bucket
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="https://github.com/jeet-avatar/crm-email-marketing-platform.git"
FRONTEND_PATH="/Users/jeet/Documents/CRM Frontend/crm-app"
BACKEND_PATH="/Users/jeet/Documents/CRM Module"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   BRANDMONKZ CRM - SANDBOX DEPLOYMENT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: AWS Configuration Check
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[1/7] Checking AWS Configuration...${NC}"

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not configured${NC}"
    echo -e "${YELLOW}Please configure AWS CLI first:${NC}"
    echo ""
    echo "  aws configure"
    echo ""
    echo "You'll need:"
    echo "  - AWS Access Key ID: (from .env.deploy file)"
    echo "  - AWS Secret Access Key: (from .env.deploy file)"
    echo "  - Default region: us-east-1"
    echo "  - Default output format: json"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI configured${NC}"
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "  Account: $AWS_ACCOUNT"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Get Sandbox Infrastructure Details
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[2/7] Finding Sandbox Infrastructure...${NC}"

# Find sandbox EC2 instance
EC2_INSTANCE=$(aws ec2 describe-instances \
    --filters "Name=tag:Environment,Values=sandbox" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text 2>/dev/null || echo "")

if [ "$EC2_INSTANCE" == "None" ] || [ -z "$EC2_INSTANCE" ]; then
    echo -e "${RED}✗ No running sandbox EC2 instance found${NC}"
    echo -e "${YELLOW}Creating new EC2 instance...${NC}"
    echo ""
    echo "Please provide the following information:"
    read -p "EC2 Instance ID (or press Enter to create new): " EC2_INSTANCE

    if [ -z "$EC2_INSTANCE" ]; then
        echo -e "${RED}Manual EC2 creation required. Please follow SANDBOX_DEPLOYMENT_COMMANDS.md${NC}"
        exit 1
    fi
fi

EC2_IP=$(aws ec2 describe-instances \
    --instance-ids "$EC2_INSTANCE" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo -e "${GREEN}✓ Found EC2 instance${NC}"
echo "  Instance ID: $EC2_INSTANCE"
echo "  Public IP: $EC2_IP"

# Find sandbox S3 bucket
S3_BUCKET=$(aws s3api list-buckets \
    --query "Buckets[?contains(Name, 'sandbox') && contains(Name, 'brandmonkz')].Name | [0]" \
    --output text 2>/dev/null || echo "")

if [ "$S3_BUCKET" == "None" ] || [ -z "$S3_BUCKET" ]; then
    echo -e "${YELLOW}No sandbox S3 bucket found, using default name${NC}"
    S3_BUCKET="sandbox-brandmonkz-crm"

    # Check if bucket exists
    if ! aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
        echo -e "${YELLOW}Creating S3 bucket: $S3_BUCKET${NC}"
        aws s3 mb "s3://$S3_BUCKET" --region us-east-1

        # Enable static website hosting
        aws s3 website "s3://$S3_BUCKET" \
            --index-document index.html \
            --error-document index.html

        # Set bucket policy
        cat > /tmp/bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$S3_BUCKET/*"
    }
  ]
}
EOF
        aws s3api put-bucket-policy --bucket "$S3_BUCKET" --policy file:///tmp/bucket-policy.json
        rm /tmp/bucket-policy.json
    fi
fi

echo -e "${GREEN}✓ Found S3 bucket${NC}"
echo "  Bucket: $S3_BUCKET"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: SSH Key Configuration
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[3/7] Configuring SSH Access...${NC}"

# Look for SSH key
SSH_KEY=""
for key in ~/.ssh/*.pem ~/.ssh/id_rsa ~/.ssh/id_ed25519; do
    if [ -f "$key" ]; then
        SSH_KEY="$key"
        break
    fi
done

if [ -z "$SSH_KEY" ]; then
    echo -e "${YELLOW}No SSH key found in ~/.ssh/${NC}"
    read -p "Enter path to SSH private key: " SSH_KEY

    if [ ! -f "$SSH_KEY" ]; then
        echo -e "${RED}✗ SSH key not found: $SSH_KEY${NC}"
        exit 1
    fi
fi

# Set correct permissions
chmod 400 "$SSH_KEY"

echo -e "${GREEN}✓ SSH key configured${NC}"
echo "  Key: $SSH_KEY"

# Test SSH connection
echo "  Testing SSH connection..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=no ec2-user@$EC2_IP "echo 'SSH OK'" &> /dev/null; then
    echo -e "${GREEN}  ✓ SSH connection successful${NC}"
else
    echo -e "${RED}  ✗ Cannot connect to EC2 instance${NC}"
    echo "  Please ensure:"
    echo "  1. EC2 instance is running"
    echo "  2. Security group allows SSH (port 22) from your IP"
    echo "  3. SSH key is correct"
    exit 1
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Deploy Backend to EC2
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[4/7] Deploying Backend to EC2...${NC}"

# Create deployment script
cat > /tmp/deploy-backend.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

echo "Starting backend deployment..."

# Install dependencies if needed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Clone or update repository
if [ -d "crm-email-marketing-platform" ]; then
    echo "Updating existing repository..."
    cd crm-email-marketing-platform
    git fetch origin
    git checkout main
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/jeet-avatar/crm-email-marketing-platform.git
    cd crm-email-marketing-platform
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations (only if .env exists)
if [ -f .env ]; then
    echo "Running database migrations..."
    npx prisma migrate deploy || echo "Migration skipped (run manually after .env setup)"
fi

# Build application
echo "Building application..."
npm run build

# Stop existing PM2 process
pm2 delete crm-backend 2>/dev/null || true

# Start with PM2
echo "Starting application with PM2..."
pm2 start dist/server.js --name crm-backend

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

echo "Backend deployment complete!"
pm2 status
EOFSCRIPT

# Copy script to EC2 and execute
echo "  Uploading deployment script..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no /tmp/deploy-backend.sh ec2-user@$EC2_IP:/tmp/

echo "  Executing deployment..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@$EC2_IP "bash /tmp/deploy-backend.sh"

# Check if .env exists on server
ENV_EXISTS=$(ssh -i "$SSH_KEY" ec2-user@$EC2_IP "[ -f crm-email-marketing-platform/.env ] && echo 'yes' || echo 'no'")

if [ "$ENV_EXISTS" == "no" ]; then
    echo -e "${YELLOW}  ⚠ .env file not found on server${NC}"
    echo "  Uploading .env.production as .env..."

    if [ -f "$BACKEND_PATH/.env.production" ]; then
        scp -i "$SSH_KEY" "$BACKEND_PATH/.env.production" ec2-user@$EC2_IP:~/crm-email-marketing-platform/.env

        # Restart backend after env file upload
        ssh -i "$SSH_KEY" ec2-user@$EC2_IP "cd crm-email-marketing-platform && pm2 restart crm-backend"
        echo -e "${GREEN}  ✓ Environment configured${NC}"
    else
        echo -e "${RED}  ✗ .env.production not found locally${NC}"
        echo "  Please create .env manually on the server and restart PM2"
    fi
fi

echo -e "${GREEN}✓ Backend deployed${NC}"
echo "  Status: Running on $EC2_IP:3000"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: Build Frontend
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[5/7] Building Frontend...${NC}"

cd "$FRONTEND_PATH"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}  Creating .env.production...${NC}"
    cat > .env.production << EOF
VITE_API_URL=https://api-sandbox.brandmonkz.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51S5xJ0JePbhql2pNB4jwGWLfrq2wONPplmNxe3dDnZO2zB8xmTbzpt6CcUWe0zYFYZ38Uq2oXR46v47XByXthfcm00oPoEZSWn
VITE_STRIPE_STARTER_MONTHLY=price_1SEoYzJePbhql2pNPST0TGTt
VITE_STRIPE_STARTER_ANNUAL=price_1SEoYzJePbhql2pNeUQMDYoa
VITE_STRIPE_PROFESSIONAL_MONTHLY=price_1SEoZ0JePbhql2pNoOns39cg
VITE_STRIPE_PROFESSIONAL_ANNUAL=price_1SEoZ0JePbhql2pNKgEtI41k
VITE_STRIPE_ENTERPRISE_MONTHLY=price_1SEoZ1JePbhql2pNFUuLBq8f
VITE_STRIPE_ENTERPRISE_ANNUAL=price_1SEoZ2JePbhql2pNoDfq4njn
EOF
fi

echo "  Installing dependencies..."
npm install

echo "  Building production bundle..."
npm run build

echo -e "${GREEN}✓ Frontend built${NC}"
echo "  Build directory: dist/"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: Deploy Frontend to S3
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[6/7] Deploying Frontend to S3...${NC}"

echo "  Uploading files to s3://$S3_BUCKET..."
aws s3 sync dist/ "s3://$S3_BUCKET/" --delete

echo "  Setting cache control headers..."
aws s3 cp "s3://$S3_BUCKET/" "s3://$S3_BUCKET/" --recursive \
    --exclude "*" --include "*.html" \
    --metadata-directive REPLACE \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

aws s3 cp "s3://$S3_BUCKET/" "s3://$S3_BUCKET/" --recursive \
    --exclude "*" --include "*.js" --include "*.css" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=31536000"

echo -e "${GREEN}✓ Frontend deployed${NC}"
echo "  URL: http://$S3_BUCKET.s3-website-us-east-1.amazonaws.com"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: Verify Deployment
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[7/7] Verifying Deployment...${NC}"

# Check backend health
echo "  Checking backend health..."
sleep 3
HEALTH_CHECK=$(ssh -i "$SSH_KEY" ec2-user@$EC2_IP "curl -s http://localhost:3000/health" || echo "FAILED")

if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo -e "${GREEN}  ✓ Backend health check passed${NC}"
else
    echo -e "${RED}  ✗ Backend health check failed${NC}"
    echo "  Response: $HEALTH_CHECK"
fi

# Check frontend
echo "  Checking frontend..."
FRONTEND_URL="http://$S3_BUCKET.s3-website-us-east-1.amazonaws.com"
FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")

if [ "$FRONTEND_CHECK" == "200" ]; then
    echo -e "${GREEN}  ✓ Frontend accessible${NC}"
else
    echo -e "${RED}  ✗ Frontend not accessible (HTTP $FRONTEND_CHECK)${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   DEPLOYMENT COMPLETE ✓${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Backend:${NC}"
echo "  • Server: $EC2_IP:3000"
echo "  • Health: http://$EC2_IP:3000/health"
echo "  • Status: ssh -i $SSH_KEY ec2-user@$EC2_IP 'pm2 status'"
echo ""
echo -e "${GREEN}Frontend:${NC}"
echo "  • S3 URL: $FRONTEND_URL"
echo "  • Files: aws s3 ls s3://$S3_BUCKET/"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure DNS to point to:"
echo "     • api-sandbox.brandmonkz.com → $EC2_IP"
echo "     • sandbox.brandmonkz.com → $FRONTEND_URL"
echo ""
echo "  2. Setup SSL certificates (after DNS propagates):"
echo "     ssh -i $SSH_KEY ec2-user@$EC2_IP"
echo "     sudo certbot --nginx -d api-sandbox.brandmonkz.com"
echo ""
echo "  3. Update environment variables on server if needed:"
echo "     ssh -i $SSH_KEY ec2-user@$EC2_IP"
echo "     cd crm-email-marketing-platform"
echo "     nano .env"
echo "     pm2 restart crm-backend"
echo ""
echo "  4. Configure Stripe webhook:"
echo "     Endpoint: https://api-sandbox.brandmonkz.com/api/webhooks/stripe"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
