# 🤖 AI-Powered Company Enrichment Guide

## Overview
Your CRM now has an **intelligent AI agent** that automatically scrapes company websites and uses **Claude AI** to extract:
- ✅ **Industry** (Technology, Healthcare, Finance, etc.)
- ✅ **Headquarters** (City, State/Country)
- ✅ **Description** (Brief company overview)
- ✅ **Employee Count** (Range: 1-10, 11-50, 51-200, etc.)
- ✅ **Founded Year**

## 🚀 Quick Start

### Step 1: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create Key**
5. Copy your API key

### Step 2: Add API Key to .env

Open `/Users/jeet/Documents/CRM Module/.env` and add:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Run AI Enrichment

```bash
cd "/Users/jeet/Documents/CRM Module"
npx ts-node scripts/aiEnrichAllCompanies.ts
```

## 📊 How It Works

### The AI Enrichment Process:

```
1. 🔍 SCRAPE
   ├─ Fetch company website content
   ├─ Scrape LinkedIn company page
   └─ Extract text from meta tags, headings, paragraphs

2. 🧠 AI ANALYSIS
   ├─ Claude AI analyzes scraped content
   ├─ Identifies industry patterns
   ├─ Extracts location mentions
   └─ Determines employee count ranges

3. ✅ VALIDATE
   ├─ Confidence score calculated (0-100%)
   ├─ Only updates if confidence > 40%
   └─ Preserves existing data if low confidence

4. 💾 UPDATE
   └─ Automatically populates CRM database
```

## 🎯 Features

### Intelligent Scraping
- **Website Analysis**: Extracts meta descriptions, page titles, key content
- **LinkedIn Integration**: Scrapes company taglines and descriptions
- **Rate Limited**: 2-second delays between requests to avoid blocking
- **Error Handling**: Gracefully handles failed requests

### AI-Powered Extraction
- **Industry Detection**: Identifies primary business sector
- **Location Parsing**: Extracts headquarters from various formats
- **Employee Estimation**: Determines company size from context
- **Confidence Scoring**: Only applies high-quality data

### Batch Processing
- Processes 20 companies at a time
- Real-time progress updates
- Summary statistics at completion
- Automatic retry logic

## 📝 Example Output

```
🤖 AI-Powered Company Enrichment

════════════════════════════════════════════════════════
📊 Found 54 companies to enrich

[1/54] Processing: Adtegrity
────────────────────────────────────────────────────────
🤖 AI Enrichment: Adtegrity
   📡 Scraping website: https://www.adtegrity.com
   📡 Scraping LinkedIn: https://www.linkedin.com/company/adtegrity
   🧠 Analyzing with Claude AI...
   ✅ Enrichment complete - Confidence: 85%
   ✅ Updated successfully!
      Industry: Digital Marketing Technology
      HQ: Boston, Massachusetts
      Employees: 51-200
   ⏳ Waiting 2 seconds...

[2/54] Processing: AbleTo
────────────────────────────────────────────────────────
...

════════════════════════════════════════════════════════
📊 Enrichment Summary
════════════════════════════════════════════════════════
✅ Successfully enriched: 48
❌ Failed/Skipped: 6
📈 Success rate: 89%
```

## 🔧 Advanced Usage

### Enrich Specific Companies

Create a custom script to target specific companies:

```typescript
import { enrichCompanyWithAI } from './src/services/aiEnrichment';
import { prisma } from './src/app';

const company = await prisma.company.findFirst({
  where: { name: 'Adtegrity' }
});

const enrichment = await enrichCompanyWithAI(
  company.name,
  company.website,
  company.linkedin
);

console.log(enrichment);
```

### Adjust Confidence Threshold

Edit `scripts/aiEnrichAllCompanies.ts`:

```typescript
// Change from 40 to higher for stricter matching
if (enrichment.confidence >= 60) {
  // Update company...
}
```

### Process More Companies

Edit `scripts/aiEnrichAllCompanies.ts`:

```typescript
// Change from 20 to process more at once
take: 100, // Process 100 companies
```

## 💡 Tips & Best Practices

### 1. **Run During Off-Peak Hours**
AI enrichment makes many API calls - run overnight or during low-traffic periods.

### 2. **Monitor API Usage**
Anthropic charges per token. Each company enrichment uses ~500-1000 tokens.
- 54 companies ≈ 50,000 tokens
- Cost: ~$0.15 - $0.30 at current rates

### 3. **Review Results**
Check enriched data accuracy:
```bash
cd "/Users/jeet/Documents/CRM Module"
npx prisma studio
```
Navigate to `Company` table and review `industry` and `location` fields.

### 4. **Re-run for Updates**
Companies change! Re-run enrichment periodically:
```bash
# Clear enrichment flag to re-process all
npx ts-node -e "
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();
  await prisma.company.updateMany({
    data: { enriched: false }
  });
"
```

## 🚨 Troubleshooting

### Error: "ANTHROPIC_API_KEY not set"
- Ensure `.env` file has the API key
- Restart any running processes after adding the key

### Error: "Rate limit exceeded"
- Wait a few minutes
- The script already includes 2-second delays
- Consider increasing delay in `aiEnrichment.ts`

### Low Success Rate
- Check if websites are accessible
- Some companies may have anti-scraping measures
- LinkedIn requires authentication for detailed data

### "Timeout" Errors
- Increase timeout in `aiEnrichment.ts`:
  ```typescript
  timeout: 20000, // 20 seconds instead of 10
  ```

## 📈 Integration with CRM UI

### View Enriched Data
1. Go to http://localhost:5173/companies
2. Industry and size are now populated
3. Click expand (▼) to see full company details

### Trigger Manual Enrichment (Future Feature)
We can add an "Enrich" button next to each company:
- Click button → AI enrichment runs for that company
- Real-time updates in UI
- Progress indicator

## 🔮 Future Enhancements

### Planned Features:
1. **Real-time Enrichment** - Enrich on company creation
2. **UI Trigger** - "Enrich Company" button in CompanyList
3. **LinkedIn Authentication** - Better data extraction
4. **Apollo.io Integration** - Professional B2B data source
5. **Clearbit Integration** - Logo and firmographic data
6. **Scheduled Jobs** - Auto-enrich new companies daily

## 📚 API Reference

### `enrichCompanyWithAI(name, website?, linkedin?)`
Enriches a single company with AI analysis.

**Parameters:**
- `name` (string): Company name
- `website` (string, optional): Company website URL
- `linkedin` (string, optional): LinkedIn company page URL

**Returns:** `CompanyEnrichmentResult`
```typescript
{
  industry?: string;
  headquarters?: string;
  description?: string;
  employeeCount?: string;
  foundedYear?: number;
  confidence: number; // 0-100
}
```

### `bulkEnrichCompanies(companies)`
Enriches multiple companies in batch.

**Parameters:**
- `companies` (array): Array of company objects

**Returns:** `Map<string, CompanyEnrichmentResult>`

## 🎓 Understanding Confidence Scores

| Score | Meaning | Action |
|-------|---------|--------|
| 80-100% | High confidence | Apply immediately |
| 60-79% | Medium confidence | Apply with review |
| 40-59% | Low confidence | Apply but flag for review |
| 0-39% | Very low | Skip update |

The confidence score is based on:
- Quality of scraped content
- Clarity of information
- Multiple data sources confirming same info

## 📞 Support

For issues or questions:
1. Check logs in terminal output
2. Review `.env` configuration
3. Test with a single company first
4. Check Anthropic API dashboard for usage

---

**Next Steps:**
1. Add your ANTHROPIC_API_KEY to `.env`
2. Run: `npx ts-node scripts/aiEnrichAllCompanies.ts`
3. Watch the magic happen! ✨
