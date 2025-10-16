#!/bin/bash

echo "📧 Verifying gteshnair@gmail.com with AWS SES..."
echo ""

# Add gteshnair@gmail.com to SES verified identities
aws sesv2 create-email-identity \
  --email-identity gteshnair@gmail.com \
  --region us-east-1

echo ""
echo "✅ Verification email sent to gteshnair@gmail.com"
echo ""
echo "📩 Next steps:"
echo "1. Ask Jithesh to check gteshnair@gmail.com inbox"
echo "2. Look for email from Amazon SES:"
echo "   Subject: 'Amazon SES Email Address Verification Request'"
echo "3. Click the verification link in that email"
echo "4. Once verified, send the team invitation again from:"
echo "   https://brandmonkz.com/team"
echo ""
echo "5. To check verification status, run:"
echo "   aws sesv2 get-email-identity --email-identity gteshnair@gmail.com --region us-east-1 --query 'VerifiedForSendingStatus'"
echo ""
