#!/bin/bash

# Security Secrets Rotation Script
# This script generates new secure secrets and updates the .env file
# Run this script when rotating secrets for security

set -e

echo "🔐 CRM Security Secrets Rotation Tool"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will generate NEW secrets and requires updating the .env file"
echo "⚠️  All users will need to re-authenticate after JWT_SECRET rotation"
echo "⚠️  Make sure to backup current .env before proceeding"
echo ""

read -p "Do you want to continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "Generating new secure secrets..."
echo ""

# Generate secrets
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
NEW_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
NEW_REDIS_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEW_DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEW_SERVICE_API_KEY=$(node -e "console.log('video-service-' + require('crypto').randomBytes(24).toString('hex'))")

echo "✅ Generated new secrets:"
echo ""
echo "1. JWT_SECRET (128 chars):"
echo "   $NEW_JWT_SECRET"
echo ""
echo "2. SESSION_SECRET (128 chars):"
echo "   $NEW_SESSION_SECRET"
echo ""
echo "3. REDIS_PASSWORD (64 chars):"
echo "   $NEW_REDIS_PASSWORD"
echo ""
echo "4. DB_PASSWORD (64 chars):"
echo "   $NEW_DB_PASSWORD"
echo ""
echo "5. SERVICE_API_KEY:"
echo "   $NEW_SERVICE_API_KEY"
echo ""

# Save to file
SECRETS_FILE=".env.secrets.$(date +%Y%m%d_%H%M%S).txt"
cat > "$SECRETS_FILE" << EOF
# Generated Secrets - $(date)
# ⚠️ KEEP THIS FILE SECURE - DELETE AFTER UPDATING .env

JWT_SECRET=$NEW_JWT_SECRET
SESSION_SECRET=$NEW_SESSION_SECRET
REDIS_PASSWORD=$NEW_REDIS_PASSWORD
DB_PASSWORD=$NEW_DB_PASSWORD
SERVICE_API_KEY=$NEW_SERVICE_API_KEY

# MANUAL STEPS REQUIRED:
# 1. Update .env file with these new secrets
# 2. Update database password: ALTER USER crm_app PASSWORD '$NEW_DB_PASSWORD';
# 3. Update Redis configuration with new password
# 4. Restart all services
# 5. DELETE this file after updating

# IMPACT:
# - All users will be logged out (JWT_SECRET changed)
# - All active sessions will be invalidated (SESSION_SECRET changed)
# - Redis connections will need reconfiguration
# - Database connections will need reconfiguration
EOF

echo "✅ Secrets saved to: $SECRETS_FILE"
echo ""
echo "📋 NEXT STEPS:"
echo "=============="
echo ""
echo "1. Backup current .env file:"
echo "   cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)"
echo ""
echo "2. Update .env file with new secrets from: $SECRETS_FILE"
echo ""
echo "3. Update PostgreSQL database password:"
echo "   psql -U jeet -d crm_db -c \"ALTER USER crm_app PASSWORD '$NEW_DB_PASSWORD';\""
echo ""
echo "4. Update docker-compose.yml Redis password"
echo ""
echo "5. Restart all services:"
echo "   pm2 restart all"
echo "   docker-compose down && docker-compose up -d"
echo ""
echo "6. Verify services are running:"
echo "   curl http://localhost:3000/health"
echo ""
echo "7. DELETE the secrets file:"
echo "   rm $SECRETS_FILE"
echo ""
echo "⚠️  SECURITY REMINDER:"
echo "   - Never commit secrets to Git"
echo "   - Rotate secrets every 90 days"
echo "   - Use AWS Secrets Manager for production"
echo ""

chmod 600 "$SECRETS_FILE"
echo "✅ File permissions set to 600 (owner read/write only)"
echo ""
echo "🎯 Secrets rotation prepared successfully!"
