# 🔑 API KEYS GENERATION CHECKLIST
## BrandMonkz CRM Production - DO THIS NOW

**IMPORTANT:** Complete ALL steps before deployment. Never reuse dev/sandbox keys!

---

## ✅ STEP-BY-STEP API KEY GENERATION

### 1️⃣ DATABASE PASSWORD (Priority: CRITICAL)

**Generate Strong Password:**
```bash
# Run this command on your Mac:
openssl rand -base64 32
```

**Action Required:**
- [ ] Run command above
- [ ] Copy the output (example: `kJ8n2Lp9mQ4xR7sT3vY6zB1cD5eF8gH9`)
- [ ] Save to password manager (1Password/LastPass)
- [ ] Label: "BrandMonkz CRM Production Database Password"

**You'll use this later when creating the RDS database.**

---

### 2️⃣ JWT SECRET (Priority: CRITICAL)

**Generate 256-bit Secret:**
```bash
# Run this command:
openssl rand -base64 64
```

**Action Required:**
- [ ] Run command above
- [ ] Copy the entire output
- [ ] Save to password manager
- [ ] Label: "BrandMonkz CRM Production JWT Secret"

**You'll add this to `.env` file on the production server.**

---

### 3️⃣ ANTHROPIC CLAUDE API KEY (Priority: HIGH)

**Create Production Key:**

1. [ ] Go to: https://console.anthropic.com/settings/keys
2. [ ] Log in with your Anthropic account
3. [ ] Click **"Create Key"**
4. [ ] Name: `BrandMonkz CRM Production`
5. [ ] Copy the key (starts with `sk-ant-api03-...`)
6. [ ] Save to password manager immediately (shown only once!)
7. [ ] Label: "BrandMonkz CRM Production Anthropic API Key"

**Configure Usage Limits:**
- [ ] Set monthly budget: $500 (adjust as needed)
- [ ] Enable usage alerts at 80% and 100%
- [ ] Set rate limits if available

---

### 4️⃣ GOOGLE OAUTH CREDENTIALS (Priority: HIGH)

**Create New OAuth Client:**

1. [ ] Go to: https://console.cloud.google.com/apis/credentials
2. [ ] Select project or create new: `BrandMonkz CRM Production`
3. [ ] Click **"Configure Consent Screen"**

**OAuth Consent Screen Settings:**
- [ ] User Type: **External**
- [ ] App Name: `BrandMonkz CRM`
- [ ] User support email: `support@brandmonkz.com`
- [ ] Developer contact: `jeetnair.in@gmail.com`
- [ ] Authorized domains: `brandmonkz.com`
- [ ] Click **Save and Continue**

4. [ ] Click **"Create Credentials"** → **"OAuth Client ID"**

**OAuth Client Settings:**
- [ ] Application type: **Web application**
- [ ] Name: `BrandMonkz CRM Production`
- [ ] Authorized JavaScript origins:
  - [ ] `https://brandmonkz.com`
  - [ ] `https://www.brandmonkz.com`
- [ ] Authorized redirect URIs:
  - [ ] `https://brandmonkz.com/api/auth/google/callback`
  - [ ] `https://www.brandmonkz.com/api/auth/google/callback`
- [ ] Click **Create**

5. [ ] Copy **Client ID** (starts with numbers and ends with `.apps.googleusercontent.com`)
6. [ ] Copy **Client Secret**
7. [ ] Save BOTH to password manager
8. [ ] Label: "BrandMonkz CRM Production Google OAuth"

---

### 5️⃣ AWS IAM USER (Priority: CRITICAL)

**Create Production IAM User:**

1. [ ] Go to: https://console.aws.amazon.com/iam/
2. [ ] Click **"Users"** → **"Add users"**
3. [ ] Username: `brandmonkz-crm-production`
4. [ ] AWS credential type: **Access key - Programmatic access**
5. [ ] Click **"Next: Permissions"**

**Attach Permissions:**
- [ ] Click **"Attach existing policies directly"**
- [ ] Attach these policies:
  - [ ] `AmazonS3FullAccess` (for file uploads)
  - [ ] `AmazonSESFullAccess` (for email sending)
  - [ ] `SecretsManagerReadWrite` (for reading secrets)
  - [ ] `CloudWatchFullAccess` (for logging)
- [ ] Click **"Next: Tags"**

**Add Tags:**
- [ ] Key: `Environment`, Value: `Production`
- [ ] Key: `Application`, Value: `BrandMonkz-CRM`
- [ ] Click **"Next: Review"** → **"Create user"**

6. [ ] Copy **Access Key ID** (starts with `AKIA...`)
7. [ ] Copy **Secret Access Key** (show and copy immediately!)
8. [ ] Save BOTH to password manager
9. [ ] Label: "BrandMonkz CRM Production AWS IAM User"
10. [ ] Download CSV file as backup

---

### 6️⃣ STRIPE PRODUCTION KEYS (Priority: HIGH)

**Switch to Live Mode:**

1. [ ] Go to: https://dashboard.stripe.com/
2. [ ] Toggle to **"Live"** mode (top right corner - switch must show "LIVE")
3. [ ] Go to: **Developers** → **API keys**

**Create Restricted Key:**
4. [ ] Click **"Create restricted key"**
5. [ ] Name: `BrandMonkz CRM Production`
6. [ ] Permissions (set these):
   - [ ] Customers: **Read & Write**
   - [ ] Subscriptions: **Read & Write**
   - [ ] Payment Methods: **Read & Write**
   - [ ] Checkout Sessions: **Read & Write**
   - [ ] All others: **None** (leave unchecked)
7. [ ] Click **"Create key"**

8. [ ] Copy **Publishable Key** (starts with `pk_live_...`)
9. [ ] Copy **Secret Key** (starts with `sk_live_...`)
10. [ ] Save BOTH to password manager
11. [ ] Label: "BrandMonkz CRM Production Stripe Keys"

**IMPORTANT:** Verify the toggle says "LIVE" not "TEST"!

---

### 7️⃣ SMTP / EMAIL CREDENTIALS (Priority: MEDIUM)

**Option A: AWS SES (Recommended)**

1. [ ] Go to: https://console.aws.amazon.com/ses/
2. [ ] Click **"Verified identities"** → **"Create identity"**
3. [ ] Identity type: **Domain**
4. [ ] Domain: `brandmonkz.com`
5. [ ] Verify by adding DNS records (follow AWS instructions)
6. [ ] After verification, go to **"SMTP settings"**
7. [ ] Click **"Create SMTP credentials"**
8. [ ] IAM User Name: `brandmonkz-ses-smtp-user`
9. [ ] Click **"Create"**
10. [ ] Copy **SMTP Username**
11. [ ] Copy **SMTP Password**
12. [ ] Save BOTH to password manager
13. [ ] Label: "BrandMonkz CRM Production SES SMTP"

**Option B: Gmail (Easier for start)**

1. [ ] Create email: `crm@brandmonkz.com` (or use existing)
2. [ ] Enable 2-Factor Authentication on the Gmail account
3. [ ] Go to: https://myaccount.google.com/apppasswords
4. [ ] Select app: **Mail**
5. [ ] Select device: **Other** (type: "BrandMonkz CRM Production")
6. [ ] Click **"Generate"**
7. [ ] Copy the 16-character app password
8. [ ] Save to password manager:
   - [ ] Email: `crm@brandmonkz.com`
   - [ ] App Password: `xxxx xxxx xxxx xxxx`
9. [ ] Label: "BrandMonkz CRM Production Gmail SMTP"

---

### 8️⃣ DOMAIN SSL CERTIFICATE (Priority: CRITICAL)

**Request SSL Certificate:**

1. [ ] Go to: https://console.aws.amazon.com/acm/
2. [ ] Ensure region is **us-east-1** (required for CloudFront)
3. [ ] Click **"Request certificate"**
4. [ ] Certificate type: **Request a public certificate**
5. [ ] Click **"Next"**

**Domain Names:**
6. [ ] Add domains:
   - [ ] `brandmonkz.com`
   - [ ] `*.brandmonkz.com` (wildcard for subdomains)
7. [ ] Validation method: **DNS validation**
8. [ ] Click **"Request"**

**Validate Certificate:**
9. [ ] Click on the certificate ID
10. [ ] For each domain, click **"Create records in Route 53"** (if using Route 53)
    - OR manually add CNAME records to your DNS provider
11. [ ] Wait for validation (5-30 minutes)
12. [ ] Status should change to **"Issued"**
13. [ ] Copy the **Certificate ARN**
14. [ ] Save to password manager
15. [ ] Label: "BrandMonkz CRM Production SSL Certificate ARN"

---

## 📋 VERIFICATION CHECKLIST

Before proceeding to deployment, verify you have ALL of these:

### Stored in Password Manager:
- [ ] Database Password (32+ characters)
- [ ] JWT Secret (64+ characters)
- [ ] Anthropic API Key (`sk-ant-api03-...`)
- [ ] Google OAuth Client ID
- [ ] Google OAuth Client Secret
- [ ] AWS Access Key ID (`AKIA...`)
- [ ] AWS Secret Access Key
- [ ] Stripe Publishable Key (`pk_live_...`)
- [ ] Stripe Secret Key (`sk_live_...`)
- [ ] SMTP Username (SES or Gmail)
- [ ] SMTP Password/App Password
- [ ] SSL Certificate ARN

### Verified Actions:
- [ ] All keys are PRODUCTION keys (not test/dev)
- [ ] No keys from sandbox environment reused
- [ ] All keys labeled clearly in password manager
- [ ] Backup CSV downloaded from AWS IAM
- [ ] SSL certificate status = "Issued"
- [ ] Google OAuth consent screen configured
- [ ] Stripe is in LIVE mode
- [ ] Usage alerts configured on Anthropic

---

## 🔒 SECURITY REMINDERS

**DO:**
✅ Generate all keys fresh for production
✅ Store all keys in password manager (1Password/LastPass)
✅ Use different keys for dev/staging/production
✅ Enable 2FA on all accounts (AWS, Stripe, Google, Anthropic)
✅ Set up billing alerts
✅ Configure usage limits where available
✅ Keep backup copy of keys in secure location

**DON'T:**
❌ Reuse sandbox/dev keys in production
❌ Store keys in code or config files
❌ Share keys via email/Slack
❌ Use weak passwords
❌ Skip 2FA
❌ Leave test mode enabled on Stripe

---

## 📞 SUPPORT CONTACTS

If you need help:

- **AWS Support:** https://console.aws.amazon.com/support/
- **Anthropic Support:** support@anthropic.com
- **Google OAuth:** https://support.google.com/cloud/
- **Stripe Support:** https://support.stripe.com/

---

## ⏭️ NEXT STEPS

After completing this checklist:

1. [ ] Review: `PRODUCTION_DEPLOYMENT_SOC2.md`
2. [ ] Start Phase 2: Infrastructure Setup
3. [ ] Configure AWS Secrets Manager with all keys
4. [ ] Proceed with deployment

---

**ESTIMATED TIME:** 2-3 hours

**STATUS:** [ ] Not Started  [ ] In Progress  [ ] Completed

**Completed by:** ________________  **Date:** ____________

**Verified by:** ________________  **Date:** ____________

---

**CONFIDENTIAL - FOR AUTHORIZED PERSONNEL ONLY**
