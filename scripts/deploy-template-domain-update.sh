#!/bin/bash

echo "📧 Deploying Critical River Domain to Email Template Footer"
echo "============================================================"

# Navigate to backend directory
cd /home/ubuntu/crm-backend || exit 1

# Download the updated template files from S3
echo "📥 Downloading updated template files from S3..."
aws s3 cp s3://brandmonkz-video-campaigns/assets/template-with-domain.html /tmp/template.html --region us-east-1
aws s3 cp s3://brandmonkz-video-campaigns/assets/update-template-with-domain.ts /tmp/update-template.ts --region us-east-1

# Copy to scripts directory
mkdir -p scripts
cp /tmp/template.html scripts/redesigned_template_with_social.html
cp /tmp/update-template.ts scripts/updateTemplateWithSocial.ts

# Run the update script
echo "🔄 Updating email template in database..."
npx ts-node scripts/updateTemplateWithSocial.ts

echo ""
echo "✅ Template update complete!"
echo "🌐 View at: https://brandmonkz.com/email-templates"
