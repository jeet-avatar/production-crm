# 🚀 AI Company Intelligence - Quick Start Guide

## ✅ WHAT'S LIVE

**Feature:** AI-powered company intelligence with web scraping
**Status:** ✅ Fully deployed to sandbox
**URL:** http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com

---

## 🎯 HOW TO USE

### Step 1: Navigate to Companies
```
http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com/companies
```

### Step 2: Open a Company with a Website
- Click on any company that has a website
- Example: Carrier Global Corporation

### Step 3: Click "AI Enrich" Button
- Purple gradient button with sparkle icon
- Located next to Campaign, Edit, Delete buttons

### Step 4: Wait 30-60 Seconds
- Button changes to "Enriching..." with spinner
- Blue progress banner shows "AI is analyzing..."
- Page polls every 3 seconds for completion

### Step 5: View AI Intelligence
- Beautiful gradient card appears
- Shows:
  - ✨ Company Overview (AI description)
  - 🏢 Type & Industry badges
  - 👥 Employee range & revenue
  - 🏷️ Keywords
  - 💻 Tech Stack
  - 📰 Recent News

---

## 🔍 WHAT IT DOES

1. **Scrapes Company Website**
   - Extracts title, description, content
   - Finds meta tags, Open Graph data
   - Collects headings and keywords

2. **AI Analysis with Claude**
   - Analyzes scraped content
   - Generates business intelligence
   - Categorizes industry and type
   - Identifies tech stack
   - Estimates company size

3. **Saves to Database**
   - Stores 10 AI-generated fields
   - Timestamps enrichment
   - Tracks enrichment status

4. **Displays Beautiful UI**
   - Gradient intelligence card
   - Organized sections
   - Colorful badges
   - Real-time updates

---

## 📊 WHAT DATA IS EXTRACTED

| Field | Description | Example |
|-------|-------------|---------|
| **AI Description** | Clear 2-3 sentence overview | "Carrier Global provides HVAC, refrigeration, and fire safety solutions..." |
| **AI Industry** | Primary industry | "HVAC & Climate Control" |
| **AI Company Type** | Business model | "B2B, Enterprise" |
| **AI Keywords** | 5-10 relevant terms | ["HVAC", "Climate Control", "Refrigeration"] |
| **AI Tech Stack** | Technologies used | ["Salesforce", "AWS", "React"] |
| **AI Employee Range** | Estimated size | "1001-5000 employees" |
| **AI Revenue** | Revenue estimate | "$50M-$100M" or "Unknown" |
| **AI Founded Year** | Founded year | 1915 |
| **AI Recent News** | Latest updates | "Recently acquired XYZ Corp..." |
| **Enrichment Status** | Current state | pending/enriching/enriched/failed |

---

## ⚡ PERFORMANCE

- **Web Scraping:** ~15 seconds
- **AI Analysis:** ~10-15 seconds
- **Total Time:** ~30-60 seconds per company
- **Accuracy:** High (powered by Claude Sonnet 4)

---

## 🛠️ TECHNICAL STACK

### Backend
- **Web Scraper:** Cheerio + Axios + Readability + JSDOM
- **AI Engine:** Claude Sonnet 4 (Anthropic)
- **API:** POST `/api/companies/:id/enrich`
- **Database:** PostgreSQL (10 new fields)

### Frontend
- **UI Framework:** React + TypeScript
- **Styling:** Tailwind CSS gradients
- **Icons:** Heroicons (SparklesIcon, ArrowPathIcon)
- **Polling:** 3-second intervals, 2-minute timeout

---

## 📝 API ENDPOINT

### Trigger Enrichment
```bash
POST /api/companies/:id/enrich
Authorization: Bearer YOUR_TOKEN

Response:
{
  "message": "Company enrichment started",
  "status": "enriching"
}
```

### Get Company with AI Data
```bash
GET /api/companies/:id
Authorization: Bearer YOUR_TOKEN

Response:
{
  "company": {
    "id": "...",
    "name": "Carrier Global",
    "website": "https://carrier.com",
    "aiDescription": "Carrier Global provides...",
    "aiIndustry": "HVAC & Climate Control",
    "aiKeywords": ["HVAC", "Climate Control"],
    "aiCompanyType": "B2B, Enterprise",
    "aiTechStack": ["Salesforce", "AWS"],
    "aiEmployeeRange": "1001-5000",
    "aiRevenue": "$50M-$100M",
    "aiFoundedYear": 1915,
    "aiRecentNews": "Recently acquired...",
    "enrichmentStatus": "enriched",
    "enrichedAt": "2025-10-12T08:00:00Z"
  }
}
```

---

## 🎨 UI COMPONENTS

### AI Enrich Button
```typescript
{company.website && company.enrichmentStatus !== 'enriching' && (
  <button
    onClick={handleEnrich}
    disabled={enriching}
    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white..."
  >
    {enriching ? (
      <>
        <ArrowPathIcon className="w-4 h-4 animate-spin" />
        Enriching...
      </>
    ) : (
      <>
        <SparklesIcon className="w-4 h-4" />
        AI Enrich
      </>
    )}
  </button>
)}
```

### Intelligence Card
```typescript
{company.enrichmentStatus === 'enriched' && company.aiDescription && (
  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
    <div className="flex items-center gap-2 mb-4">
      <SparklesIcon className="w-5 h-5 text-purple-600" />
      <h2 className="text-xl font-bold text-gray-900">AI Company Intelligence</h2>
      <span className="text-sm text-gray-500 ml-auto">
        Updated: {new Date(company.enrichedAt).toLocaleDateString()}
      </span>
    </div>
    {/* Company overview, type, industry, keywords, tech stack, news */}
  </div>
)}
```

---

## 🔧 TROUBLESHOOTING

### Button Not Showing
**Cause:** Company has no website
**Fix:** Add website URL to company profile

### Enrichment Fails
**Cause:** Website blocks scraping or AI API issue
**Fix:** Check backend logs: `pm2 logs crm-backend`

### Stuck on "Enriching..."
**Cause:** Background process failed
**Fix:** Check database, reset status:
```sql
UPDATE companies
SET enrichmentStatus = 'pending'
WHERE id = 'COMPANY_ID';
```

### No Data After Enrichment
**Cause:** Website had no content or AI couldn't parse
**Fix:** Check website manually, verify it loads content

---

## 📊 MONITORING

### Check Backend Status
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252
pm2 status
pm2 logs crm-backend --lines 50
```

### Check Database
```sql
-- View enriched companies
SELECT name, website, aiDescription, enrichmentStatus, enrichedAt
FROM companies
WHERE enrichmentStatus = 'enriched'
ORDER BY enrichedAt DESC;

-- Count by status
SELECT enrichmentStatus, COUNT(*)
FROM companies
GROUP BY enrichmentStatus;
```

---

## 🎯 BEST PRACTICES

1. **Test with Good Websites:**
   - Use well-known companies (Fortune 500)
   - Avoid websites with heavy JavaScript
   - Pick sites with clear "About" pages

2. **Monitor API Usage:**
   - Claude AI API has rate limits
   - Check Anthropic dashboard
   - Implement rate limiting if needed

3. **Handle Failures Gracefully:**
   - Show error messages to users
   - Allow retry after failure
   - Log errors for debugging

4. **Cache When Possible:**
   - Don't re-enrich frequently
   - Add "last enriched" timestamp
   - Show re-enrich button only after X days

---

## 🚀 FUTURE ENHANCEMENTS

### Potential Improvements
- [ ] Bulk enrichment for all companies
- [ ] Auto-enrich on company creation
- [ ] Enrichment analytics dashboard
- [ ] Cache scraped data (reduce API calls)
- [ ] Support for JavaScript-heavy sites (Puppeteer)
- [ ] LinkedIn integration
- [ ] News API integration for recent updates
- [ ] Competitive intelligence

---

## 📞 SUPPORT

### Resources
- Backend logs: `pm2 logs crm-backend`
- Database: Prisma Studio or psql
- Frontend console: Browser DevTools
- API testing: Postman or curl

### Common Commands
```bash
# SSH to EC2
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252

# Check backend
pm2 status
pm2 logs crm-backend

# Restart backend
pm2 restart crm-backend

# Check database
cd ~/crm-backend
npx prisma studio
```

---

## ✅ DEPLOYMENT CHECKLIST

- [✅] Database schema updated
- [✅] Web scraper service created
- [✅] AI enrichment service created
- [✅] API endpoint added
- [✅] Frontend UI updated
- [✅] Backend deployed to EC2
- [✅] Frontend deployed to S3
- [✅] Migration applied
- [✅] PM2 restarted
- [✅] All tests passed

---

**Live URL:** http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com/companies

**Backend:** 18.212.225.252 (PM2: online)
**Database:** brandmonkz_crm_sandbox (RDS PostgreSQL)

**Ready to use!** 🎉
