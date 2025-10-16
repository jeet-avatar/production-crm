#!/bin/bash

# Test Team Invitation Script
# Sends a team invitation email via production API

echo "=================================="
echo "Team Invitation Email Test"
echo "=================================="
echo ""

# Configuration
PRODUCTION_URL="https://brandmonkz.com"
EMAIL="gteshnair@gmail.com"
FIRST_NAME="Gtesh"
LAST_NAME="Nair"

# You need to provide your authentication token
echo "To send a team invitation, you need to be authenticated."
echo ""
echo "Please follow these steps:"
echo "1. Go to https://brandmonkz.com"
echo "2. Login with your account"
echo "3. Open browser DevTools (F12)"
echo "4. Go to Console tab"
echo "5. Type: localStorage.getItem('crmToken')"
echo "6. Copy the token (without quotes)"
echo ""
read -p "Paste your authentication token here: " AUTH_TOKEN

if [ -z "$AUTH_TOKEN" ]; then
    echo "Error: No token provided"
    exit 1
fi

echo ""
echo "Sending invitation to $EMAIL..."
echo ""

# Send invitation
RESPONSE=$(curl -s -X POST "$PRODUCTION_URL/api/team/invite" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Check if successful
if echo "$RESPONSE" | grep -q "invited successfully"; then
    echo ""
    echo "✓ SUCCESS: Invitation sent!"
    echo ""
    echo "Email Details:"
    echo "  From: support@brandmonkz.com"
    echo "  To: $EMAIL"
    echo "  Subject: You're invited to join the team on Brandmonkz CRM"
    echo ""
    echo "Please check the PM2 logs to verify email was sent:"
    echo "  ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \"pm2 logs crm-backend --lines 30 --nostream\""
else
    echo ""
    echo "✗ FAILED: Could not send invitation"
    echo "Check the response above for error details"
fi
