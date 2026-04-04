# SMTP Server Integration Guide

## What You Need for SMTP Integration

### 1. Gmail SMTP Configuration (Recommended for Testing)

#### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on "2-Step Verification"
3. Follow the prompts to enable it

#### Step 2: Generate App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on "2-Step Verification"
3. Scroll down to "App passwords"
4. Select "Mail" and your device
5. Click "Generate"
6. *wgzy grkm xgne iatg* (you won't see it again)

#### Step 3: Gmail SMTP Settings
```
Host: smtp.gmail.com
Port: 587 (TLS) or 465 (SSL)
Secure: true (for port 465), false (for port 587)
Username: your-email@gmail.com
Password: [16-character App Password]
```

### 2. Alternative SMTP Providers

#### SendGrid (Professional, High Deliverability)
- Sign up: https://sendgrid.com
- Free tier: 100 emails/day
- Get API Key from Settings → API Keys
```
Host: smtp.sendgrid.net
Port: 587
Secure: true
Username: apikey
Password: [Your SendGrid API Key]
```

#### AWS SES (Amazon Simple Email Service)
- Sign up: https://aws.amazon.com/ses/
- Verify domain and email
- Get SMTP credentials from Console
```
Host: email-smtp.[region].amazonaws.com
Port: 587
Username: [SMTP Username from AWS]
Password: [SMTP Password from AWS]
```

#### Outlook/Office 365
```
Host: smtp.office365.com
Port: 587
Secure: false (STARTTLS)
Username: your-email@outlook.com
Password: [Your password or App Password]
```

### 3. Environment Variables Setup

Create a `.env` file in the CRM Module root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/crm"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Anthropic AI
ANTHROPIC_API_KEY="your-anthropic-api-key"

# SMTP Configuration (for test script)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-app-password"
SMTP_FROM_EMAIL="your-email@gmail.com"
SMTP_FROM_NAME="Your CRM System"
```

### 4. How to Use the Email System

#### Option A: Using the UI (Recommended)
1. Start both servers:
   - Backend: `cd CRM\ Module && npm start`
   - Frontend: `cd CRM\ Frontend/crm-app && npm run dev`

2. Navigate to Settings or Campaigns

3. Click "Manage Email Servers"

4. Add new email server:
   - Select provider (Gmail, Outlook, SendGrid, or Custom)
   - Fill in SMTP details
   - Test connection
   - Send verification code
   - Enter the 6-digit code from your email
   - Email is now verified and ready to use

5. Create campaign and select verified email

#### Option B: Using the Test Script
1. Update `.env` with your SMTP credentials

2. Run the test script:
```bash
cd "/Users/jeet/Documents/CRM Module"
npx ts-node scripts/sendTestEmail.ts
```

3. Check jeetnair.in@gmail.com inbox for the email

### 5. Verification Checklist

Before sending emails, ensure:
- ✅ SMTP credentials are correct
- ✅ Email is verified (6-digit code confirmed)
- ✅ SMTP connection test passes
- ✅ Firewall allows SMTP ports (587/465)
- ✅ SPF record is configured (for production)
- ✅ DKIM is enabled (for production)
- ✅ DMARC policy is set (for production)

### 6. Spam Prevention Best Practices

#### DNS Records (for Production)
```
# SPF Record (example)
TXT @ "v=spf1 include:_spf.google.com ~all"

# DKIM Record
TXT default._domainkey "v=DKIM1; k=rsa; p=[public-key]"

# DMARC Record
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

#### Email Content Guidelines
- Use clear subject lines (avoid ALL CAPS, excessive punctuation)
- Include unsubscribe link
- Use verified sender domain
- Warm up IP address (gradually increase send volume)
- Maintain sender reputation
- Avoid spam trigger words

#### Rate Limiting
- Gmail: 500 emails/day (free), 2000/day (Google Workspace)
- SendGrid: 100/day (free), up to millions (paid)
- AWS SES: 200/day initially, request increase

### 7. Troubleshooting

#### "Authentication failed"
- Check username and password
- For Gmail: use App Password, not regular password
- Ensure 2-Step Verification is enabled

#### "Connection timeout"
- Check SMTP host and port
- Verify firewall isn't blocking ports 587/465
- Try alternate port (587 vs 465)

#### "Emails going to spam"
- Add SPF/DKIM/DMARC records
- Verify sender domain
- Warm up new IP addresses
- Check email content for spam triggers
- Use verified email addresses

#### "Rate limit exceeded"
- Check provider limits
- Implement rate limiting in code
- Upgrade to paid plan
- Use multiple SMTP servers

### 8. Next Steps

1. **For Testing**: Use Gmail with App Password
2. **For Production**: Use SendGrid or AWS SES
3. **Configure DNS**: Add SPF, DKIM, DMARC records
4. **Monitor**: Track bounce rates, spam complaints
5. **Scale**: Add multiple verified email servers

### 9. Quick Start Commands

```bash
# Install dependencies (if not already done)
cd "/Users/jeet/Documents/CRM Module"
npm install

# Create .env file
cp .env.example .env
# Edit .env with your SMTP credentials

# Run database migrations
npx prisma migrate dev

# Test SMTP connection
npx ts-node scripts/sendTestEmail.ts

# Start backend server
npm start

# In another terminal - start frontend
cd "/Users/jeet/Documents/CRM Frontend/crm-app"
npm run dev
```

### 10. Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` file to git
- Use environment variables for all credentials
- Rotate SMTP passwords regularly
- Use App Passwords instead of account passwords
- Enable 2FA on email accounts
- Monitor for unauthorized access
- Use HTTPS for all API calls
- Encrypt passwords in database (already implemented with Base64)

---

## Ready to Send Your First Email?

Follow these steps:

1. Get Gmail App Password (see Step 2 above)
2. Update `.env` file with credentials
3. Run: `npx ts-node scripts/sendTestEmail.ts`
4. Check jeetnair.in@gmail.com inbox
5. Celebrate! 🎉
