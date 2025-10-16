# AWS SES Production Access Guide

## Current Issue

**AWS SES is in SANDBOX MODE** - This means you can ONLY send emails to verified email addresses.

### Current Status
- ✅ **Verified Domain**: `brandmonkz.com` (can send FROM any @brandmonkz.com email)
- ✅ **Verified Email**: `jm@techcloudpro.com` (can receive emails)
- ❌ **NOT Verified**: `gteshnair@gmail.com` (emails will FAIL silently)

### Why gteshnair@gmail.com didn't receive the email
AWS SES Sandbox blocks ALL emails to unverified recipients. The email service logs show "Using AWS SES" but AWS SES silently drops the email without sending it.

---

## Solution 1: Request Production Access (RECOMMENDED)

This allows you to send emails to **ANY email address** without verification.

### Steps to Request Production Access:

1. **Go to AWS SES Console**:
   ```
   https://console.aws.amazon.com/ses/home?region=us-east-1#/account
   ```

2. **Click "Request production access"** button

3. **Fill out the form**:
   - **Mail type**: Transactional
   - **Website URL**: https://brandmonkz.com
   - **Use case description**:
     ```
     CRM application that sends:
     - Team member invitation emails
     - Email campaign notifications
     - Contact enrichment updates
     - System notifications

     We have implemented SPF, DKIM, and DMARC records for brandmonkz.com.
     We maintain a low complaint rate and promptly handle bounce notifications.
     ```
   - **Will you comply with AWS policies?**: Yes
   - **Acknowledgement**: Check the box

4. **Submit the request**

5. **Wait for approval** (usually 1-2 business days)

6. **Once approved**: You can send emails to ANY address

---

## Solution 2: Verify Individual Emails (QUICK FIX)

This is a temporary solution for testing. You'll need to verify EACH recipient email.

### Steps to Verify gteshnair@gmail.com:

```bash
# Add the email identity
aws sesv2 create-email-identity \
  --email-identity gteshnair@gmail.com \
  --region us-east-1

# AWS will send a verification email to gteshnair@gmail.com
# The recipient must click the verification link in that email
```

**Important**: The recipient (Jithesh) must:
1. Check the inbox for gteshnair@gmail.com
2. Look for email from Amazon SES (subject: "Amazon SES Email Address Verification Request")
3. Click the verification link in the email
4. Once verified, you can send team invitations to that email

### Check Verification Status:

```bash
aws sesv2 get-email-identity \
  --email-identity gteshnair@gmail.com \
  --region us-east-1 \
  --query 'VerifiedForSendingStatus'
```

---

## Solution 3: Use Already Verified Email (IMMEDIATE TEST)

Since `jm@techcloudpro.com` is already verified, you can test the email system by:

1. Go to https://brandmonkz.com/team
2. Invite team member with email: `jm@techcloudpro.com`
3. The email WILL be delivered successfully
4. This confirms the AWS SES integration is working

---

## Current AWS SES Configuration

### Environment Variables (Production):
```bash
AWS_REGION=us-east-1
SES_FROM_EMAIL=support@brandmonkz.com
SMTP_FROM_EMAIL=support@brandmonkz.com
```

### Code Status:
- ✅ Using `@aws-sdk/client-sesv2` (latest SDK)
- ✅ Using `SESv2Client` (correct client)
- ✅ EC2 IAM role credentials (no hardcoded keys)
- ✅ Proper nodemailer SES transport

### Verified Identities:
```bash
# Check all verified identities
aws sesv2 list-email-identities --region us-east-1

# Check domain verification status
aws sesv2 get-email-identity \
  --email-identity brandmonkz.com \
  --region us-east-1
```

---

## Testing Email After Production Access

Once production access is granted, test with:

```bash
# 1. Delete existing user (if any)
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  "cd /var/www/crm-backend/backend && npx ts-node -e \"
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.delete({ where: { email: 'gteshnair@gmail.com' } })
  .then(() => console.log('User deleted'))
  .finally(() => process.exit(0));
\""

# 2. Send invitation from UI at https://brandmonkz.com/team
# Email will be sent to gteshnair@gmail.com

# 3. Check PM2 logs for confirmation
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  "pm2 logs crm-backend --lines 50" | grep -i "email\|gtesh"
```

---

## Monitoring Email Sending

### Check SES Sending Statistics:
```bash
aws sesv2 get-account --region us-east-1
```

### Check Email Delivery Stats:
```bash
aws sesv2 get-email-identity \
  --email-identity brandmonkz.com \
  --region us-east-1 \
  --query 'DkimAttributes'
```

### PM2 Logs:
```bash
# Watch real-time logs
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "pm2 logs crm-backend"

# Check for email errors
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  "pm2 logs crm-backend --lines 200" | grep -i "email\|ses\|smtp"
```

---

## Recommended Action

**For Production CRM Application**: Request production access (Solution 1)

**For Quick Testing**: Verify gteshnair@gmail.com (Solution 2) OR test with jm@techcloudpro.com (Solution 3)

Once you have production access, you can:
- Send team invitations to ANY email
- Send email campaigns to customers
- Send system notifications
- No need to verify each recipient

---

## GitHub Actions Workflow Note

The GitHub Actions deployment workflow at [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml) uses `npm ci` which requires `package-lock.json`.

However, `package-lock.json` is currently gitignored. You have two options:

1. **Change to `npm install`** (works without package-lock.json):
   ```yaml
   - name: Build Backend
     working-directory: ./backend
     run: |
       npm install  # Changed from npm ci
       npm run build
   ```

2. **Remove package-lock.json from .gitignore** (recommended for consistency):
   - Commit `backend/package-lock.json` and `frontend/package-lock.json`
   - This ensures consistent dependency versions across environments

Current fix: I'll update the workflow to use `npm install` to avoid build failures.
