# 🚀 AI Enrichment - Complete Deployment Guide

## ✅ DEPLOYMENT STATUS: LIVE ON SANDBOX

**Date:** October 12, 2025
**Backend:** ✅ Deployed to EC2 (18.212.225.252)
**Node Version:** ✅ Upgraded to v20.19.5
**Health Status:** ✅ All systems operational

---

## 🎯 What Was Deployed

### Backend Features:
1. **Video URL Extraction** - Automatically extracts video URLs from company websites/job postings
2. **Hiring Intent Analysis** - AI analyzes why companies are hiring
3. **Personalized Sales Pitch** - Generates custom pitch for each company
4. **Enhanced Data Capture** - Supports 250+ company bulk imports with full enrichment

### Database Changes:
- Added `videoUrl` field (TEXT)
- Added `pitch` field (TEXT)
- Existing `hiringInfo` and `intent` fields now populated by AI

---

## 📋 Deployment Methods

### Method 1: **Automated Script** (RECOMMENDED)

I created an automated deployment script that handles everything:

```bash
cd "/Users/jeet/Documents/CRM Module"
bash deploy-ai-enrichment.sh
```

**What it does:**
- ✅ Checks SSH connection
- ✅ Syncs only changed files (fast!)
- ✅ Installs dependencies
- ✅ Runs database migrations
- ✅ Builds TypeScript
- ✅ Restarts PM2
- ✅ Verifies deployment

**Output:**
```
═══════════════════════════════════════════════════════════
   AI ENRICHMENT DEPLOYMENT - AUTOMATED
═══════════════════════════════════════════════════════════

[1/6] Running pre-flight checks...
✓ SSH connection verified

[2/6] Syncing updated files to EC2...
✓ Files synced successfully

[3/6] Installing dependencies...
✓ Dependencies installed

[4/6] Running database migrations...
✓ Migrations applied

[5/6] Building application...
✓ Application built

[6/6] Restarting application...
✓ Application restarted

═══════════════════════════════════════════════════════════
   DEPLOYMENT COMPLETE ✓
═══════════════════════════════════════════════════════════
```

### Method 2: Manual Deployment

If you prefer manual control:

```bash
# SSH to EC2
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252

# Navigate to backend directory
cd crm-backend

# Pull latest changes (if Git is configured)
git pull origin main

# Install dependencies
npm install

# Run migrations
npx prisma generate
npx prisma migrate deploy

# Build
npm run build

# Restart
pm2 restart crm-backend
pm2 save
```

---

## 🔧 Technical Details

### Node.js Upgrade (IMPORTANT!)

The Anthropic SDK requires Node.js v20+. During deployment, we:

1. **Upgraded from Node v18 to v20**
2. **Reinstalled all dependencies**
3. **Rebuilt the application**

**If you deploy to a new server:**
```bash
# Upgrade Node to v20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum remove -y nodejs-npm nodejs-full-i18n
sudo yum install -y nodejs --best --allowerasing

# Verify
node --version  # Should show v20.x
npm --version   # Should show v10.x
```

### Database Migration

Migration applied: `20251011000000_add_video_url_and_pitch`

```sql
-- AlterTable
ALTER TABLE "companies"
ADD COLUMN "video_url" TEXT,
ADD COLUMN "pitch" TEXT;
```

**Rollback (if needed):**
```bash
cd crm-backend
npx prisma migrate resolve --rolled-back 20251011000000_add_video_url_and_pitch
```

---

## 🧪 Testing the Deployment

### 1. Health Check

```bash
curl https://api-sandbox.brandmonkz.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-12T01:09:48.423Z",
  "uptime": 21.35669381,
  "environment": "production",
  "version": "1.0.0",
  "database": "connected"
}
```

### 2. Test Enrichment Endpoint

**Important:** You need a valid JWT token. Get it by logging in to the frontend.

```bash
# Replace with actual company ID and token
TOKEN="your_jwt_token_here"
COMPANY_ID="clxxxxx..."

curl -X POST "https://api-sandbox.brandmonkz.com/api/enrichment/companies/$COMPANY_ID/enrich" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Company enriched successfully",
  "company": {
    "id": "clxxx...",
    "name": "Acme Corp",
    "industry": "Technology",
    "location": "San Francisco, CA",
    "videoUrl": "https://youtube.com/watch?v=abc123",
    "pitch": "Your rapid growth in AI presents perfect opportunity...",
    "hiringInfo": "Expanding engineering team for AI capabilities",
    "enriched": true,
    "enrichedAt": "2025-10-12T..."
  },
  "enrichmentData": {
    "confidence": 85,
    ...
  }
}
```

---

## 📊 API Endpoints

### Enrich Single Company
```http
POST /api/enrichment/companies/:id/enrich
Authorization: Bearer {token}
```

**What it does:**
1. Scrapes company website + LinkedIn
2. Sends content to Claude AI
3. Extracts: industry, location, video URL, hiring intent, custom pitch
4. Updates company record
5. Returns enriched data with confidence score

### Bulk Enrich Companies
```http
POST /api/enrichment/companies/bulk-enrich
Authorization: Bearer {token}
Content-Type: application/json

{
  "companyIds": ["clxxx1...", "clxxx2...", ...]
}
```

**Rate Limiting:** 1 request/second (built into the service)

---

## 🎓 Usage Examples

### Example 1: Import 250 Companies from CSV

**CSV Format:**
```csv
Company Name,Website,LinkedIn,Video URL,Hiring Intent
Acme Corp,https://acme.com,https://linkedin.com/company/acme,https://youtube.com/watch?v=xyz,Expanding AI team
...
```

**Steps:**
1. **Import CSV** via frontend
2. System creates 250 companies
3. **Trigger Bulk Enrichment**:
   ```javascript
   const companies = await fetch('/api/companies').then(r => r.json());
   const companyIds = companies.map(c => c.id);

   await fetch('/api/enrichment/companies/bulk-enrich', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ companyIds })
   });
   ```
4. **AI enriches all companies** (takes ~4 minutes for 250 companies)
5. **Access enriched data** in campaign builder

### Example 2: Manual Enrichment

**Scenario:** Add a new company manually, enrich it immediately

```javascript
// 1. Create company
const company = await fetch('/api/companies', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Tech Startup Inc',
    website: 'https://techstartup.com',
    linkedin: 'https://linkedin.com/company/techstartup'
  })
}).then(r => r.json());

// 2. Enrich immediately
const enriched = await fetch(`/api/enrichment/companies/${company.id}/enrich`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log('Video URL:', enriched.company.videoUrl);
console.log('Pitch:', enriched.company.pitch);
console.log('Hiring Intent:', enriched.company.hiringInfo);
```

---

## 🐛 Troubleshooting

### Issue: "File is not defined" Error

**Cause:** Node.js version incompatibility (Anthropic SDK requires Node 20+)

**Solution:**
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252
node --version  # Check current version

# If not v20, upgrade:
sudo yum remove -y nodejs-npm nodejs-full-i18n
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs --best --allowerasing

# Reinstall dependencies
cd crm-backend
rm -rf node_modules
npm install
npm run build
pm2 restart crm-backend
```

### Issue: PM2 Shows "errored" Status

**Check logs:**
```bash
pm2 logs crm-backend --lines 50
```

**Common fixes:**
```bash
# 1. Check environment variables
cd crm-backend
cat .env | grep ANTHROPIC_API_KEY

# 2. Rebuild
npm run build

# 3. Restart
pm2 delete crm-backend
pm2 start dist/server.js --name crm-backend
pm2 save
```

### Issue: "ANTHROPIC_API_KEY not found"

**Solution:**
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252
cd crm-backend
nano .env

# Add:
ANTHROPIC_API_KEY=sk-ant-xxxxx...

# Save and restart
pm2 restart crm-backend --update-env
```

### Issue: Database Migration Failed

**Rollback and retry:**
```bash
cd crm-backend
npx prisma migrate resolve --rolled-back 20251011000000_add_video_url_and_pitch
npx prisma migrate deploy
```

---

## 📈 Monitoring

### View Logs
```bash
# SSH to server
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252

# Real-time logs
pm2 logs crm-backend

# Last 100 lines
pm2 logs crm-backend --lines 100 --nostream

# Error logs only
pm2 logs crm-backend --err --lines 50
```

### Check Status
```bash
pm2 status
pm2 info crm-backend
pm2 monit  # Real-time monitoring
```

### Performance Metrics
```bash
# CPU and Memory usage
pm2 list

# Detailed metrics
pm2 info crm-backend
```

---

## 🔄 Future Deployments

### Quick Re-deploy (Same Changes)

```bash
cd "/Users/jeet/Documents/CRM Module"
bash deploy-ai-enrichment.sh
```

### Full Re-deploy (Major Changes)

```bash
# 1. Commit changes locally
git add -A
git commit -m "Your commit message"
git push origin main

# 2. Deploy
bash deploy-ai-enrichment.sh

# 3. If schema changed, migration will run automatically
```

---

## 🎯 Next Steps

### Frontend Integration (TODO)

**1. Company Details Page - Add Enrichment Button**

```tsx
// In CompanyDetails.tsx
<button onClick={async () => {
  const result = await fetch(`/api/enrichment/companies/${companyId}/enrich`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  setCompany(result.company);
  toast.success('Company enriched successfully!');
}}>
  ✨ Enrich with AI
</button>
```

**2. Display Enriched Data**

```tsx
{company.videoUrl && (
  <div className="video-preview">
    <h3>Job Posting Video</h3>
    <iframe src={company.videoUrl} />
  </div>
)}

{company.pitch && (
  <div className="ai-pitch">
    <h3>AI-Generated Pitch</h3>
    <p>{company.pitch}</p>
  </div>
)}

{company.hiringInfo && (
  <div className="hiring-intent">
    <h3>Hiring Intent</h3>
    <p>{company.hiringInfo}</p>
  </div>
)}
```

**3. Campaign Builder - Company Preview Panel**

When selecting companies for a campaign, show enriched data:

```tsx
<CompanyCard company={company}>
  <div className="enrichment-preview">
    <Badge>Hiring: {company.hiringInfo}</Badge>

    {company.videoUrl && <VideoIcon />}

    <div className="pitch-preview">
      {company.pitch}
    </div>

    <button onClick={() => editPitch(company)}>
      Edit Pitch
    </button>
  </div>
</CompanyCard>
```

---

## 📝 Summary

### ✅ Completed:
- [x] Added videoUrl and pitch fields to database
- [x] Enhanced AI enrichment service
- [x] Fixed enrichment endpoint
- [x] Upgraded Node.js to v20
- [x] Deployed to EC2 sandbox
- [x] Tested successfully
- [x] Created automated deployment script

### ⏳ Pending:
- [ ] Frontend UI for enrichment button
- [ ] Display enriched data in company details
- [ ] Campaign builder with company preview
- [ ] Dynamic message editor with company data
- [ ] Bulk enrichment UI

### 🌐 Live URLs:
- **Frontend:** http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com
- **Backend:** https://api-sandbox.brandmonkz.com
- **Health Check:** https://api-sandbox.brandmonkz.com/health

---

## 🆘 Support

### Quick Commands Reference:

```bash
# SSH to server
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252

# Check status
pm2 status

# View logs
pm2 logs crm-backend

# Restart
pm2 restart crm-backend

# Rebuild
cd crm-backend && npm run build && pm2 restart crm-backend

# Deploy updates
bash deploy-ai-enrichment.sh
```

### Emergency Rollback:

```bash
# SSH to server
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252

# Revert database
cd crm-backend
npx prisma migrate resolve --rolled-back 20251011000000_add_video_url_and_pitch

# Revert code (if in Git)
git checkout HEAD~1
npm install
npm run build
pm2 restart crm-backend
```

---

**🎉 Deployment Complete!**

The AI enrichment system is now live and ready to process 250+ companies with full video URL extraction, hiring intent analysis, and personalized sales pitches.
