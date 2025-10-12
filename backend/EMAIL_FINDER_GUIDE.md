# 📧 Email Finder Integration Guide

**Status**: LinkedIn URLs extracted and ready for email discovery
**Companies**: 61 with decision-maker LinkedIn profiles
**Contacts**: 319 decision-makers (CEOs, CFOs, CTOs, etc.)

---

## ✅ What's Been Done

### 1. Data Cleanup ✅
- ✅ Moved 61 LinkedIn profile URLs from `website` field to `linkedin` field
- ✅ Cleared `website` field (ready for actual company websites)
- ✅ Database schema properly mapped

### 2. Companies Endpoint Fixed ✅
- ✅ Database migration applied
- ✅ Prisma schema updated
- ✅ Companies API working correctly

### 3. LinkedIn Data Extracted ✅
- ✅ 61 decision-maker LinkedIn profile URLs
- ✅ All stored in proper `linkedin` field
- ✅ Ready for enrichment/email finding

---

## 🔍 Email Finding Options

### Option 1: Hunter.io (Recommended)
**Best for**: Finding emails by domain and company

**Pricing**:
- Free: 25 searches/month
- Starter: $49/month - 500 searches
- Growth: $99/month - 2,500 searches

**How to Use**:
```javascript
const axios = require('axios');

async function findEmail(firstName, lastName, domain) {
  const apiKey = 'YOUR_HUNTER_API_KEY';
  const url = `https://api.hunter.io/v2/email-finder`;

  const response = await axios.get(url, {
    params: {
      domain: domain,
      first_name: firstName,
      last_name: lastName,
      api_key: apiKey
    }
  });

  return response.data.data.email;
}

// Example:
// findEmail('John', 'Doe', 'company.com')
// Returns: john.doe@company.com
```

**Integration Script**:
```bash
# Install Hunter.io
npm install hunter.io

# Run email finder
node scripts/find-emails-hunter.js
```

---

### Option 2: Apollo.io
**Best for**: B2B contact database with emails

**Pricing**:
- Free: 50 emails/month
- Basic: $49/month - 1,000 emails
- Professional: $79/month - 10,000 emails

**How to Use**:
```javascript
const axios = require('axios');

async function findContactApollo(firstName, lastName, company) {
  const apiKey = 'YOUR_APOLLO_API_KEY';
  const url = 'https://api.apollo.io/v1/people/match';

  const response = await axios.post(url, {
    first_name: firstName,
    last_name: lastName,
    organization_name: company,
    api_key: apiKey
  });

  return response.data.person.email;
}
```

---

### Option 3: RocketReach
**Best for**: Direct LinkedIn-to-Email lookup

**Pricing**:
- Essentials: $39/month - 170 lookups
- Pro: $99/month - 600 lookups
- Ultimate: $249/month - 1,800 lookups

**How to Use**:
```javascript
const axios = require('axios');

async function findEmailRocketReach(linkedinUrl) {
  const apiKey = 'YOUR_ROCKETREACH_API_KEY';
  const url = 'https://api.rocketreach.co/v2/api/lookupProfile';

  const response = await axios.post(url, {
    linkedin_url: linkedinUrl
  }, {
    headers: {
      'Api-Key': apiKey
    }
  });

  return response.data.emails[0].email;
}
```

---

### Option 4: Clearbit (Company Enrichment)
**Best for**: Finding company information + emails

**Pricing**:
- Prospecting: $99/month
- Enrichment API: Custom pricing

**How to Use**:
```javascript
const axios = require('axios');

async function enrichCompanyClearbit(domain) {
  const apiKey = 'YOUR_CLEARBIT_API_KEY';
  const url = `https://company.clearbit.com/v2/companies/find`;

  const response = await axios.get(url, {
    params: { domain: domain },
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  return {
    name: response.data.name,
    domain: response.data.domain,
    emailPatterns: response.data.emailProvider
  };
}
```

---

### Option 5: Manual LinkedIn Scraping
**Best for**: Free option (time-intensive)

**Process**:
1. Visit each LinkedIn profile (61 profiles)
2. Check "Contact Info" section
3. Extract email if public
4. Find company website from profile
5. Use email pattern guessing

**Common Email Patterns**:
- `firstname.lastname@company.com`
- `firstname@company.com`
- `f.lastname@company.com`
- `firstnamelastname@company.com`

---

## 🚀 Recommended Approach

### Step 1: Get Company Domains First
Use LinkedIn profiles to find company websites:

```javascript
// Script: extract-company-websites.js
const axios = require('axios');
const cheerio = require('cheerio');

async function getCompanyFromLinkedIn(linkedInUrl) {
  // Scrape LinkedIn profile
  // Extract company information
  // Find company website
  return {
    company: 'Company Name',
    website: 'company.com'
  };
}
```

### Step 2: Find Emails Using Hunter.io
Once you have domains:

```javascript
// For each contact
for (const contact of contacts) {
  const email = await findEmail(
    contact.firstName,
    contact.lastName,
    contact.company.domain
  );

  // Update contact with email
  await prisma.contact.update({
    where: { id: contact.id },
    data: { email: email }
  });
}
```

### Step 3: Verify Emails
Use email verification service:

```javascript
const axios = require('axios');

async function verifyEmail(email) {
  const response = await axios.get(
    `https://api.hunter.io/v2/email-verifier`,
    {
      params: {
        email: email,
        api_key: 'YOUR_API_KEY'
      }
    }
  );

  return response.data.data.status === 'valid';
}
```

---

## 📊 Cost Comparison (for 319 contacts)

| Service | Plan | Cost | Searches Included | Cost per Contact |
|---------|------|------|-------------------|------------------|
| Hunter.io | Growth | $99/mo | 2,500 | $0.04 |
| Apollo.io | Professional | $79/mo | 10,000 | $0.008 |
| RocketReach | Pro | $99/mo | 600 | $0.17 |
| Clearbit | Prospecting | $99/mo | Unlimited* | $0.31 |
| Manual | Free | $0 | N/A | 5-10 min/contact |

**Recommendation**: Use **Apollo.io Professional** ($79/month) for best value

---

## 🛠️ Implementation Scripts

### Script 1: Extract LinkedIn Data
```bash
# Already done! ✅
# LinkedIn URLs now in proper field
# Run this to verify:
cd /Users/jeet/Documents/CRM\ Module
node extract-data.js
```

### Script 2: Find Emails with Hunter.io
```javascript
// save as: find-emails-hunter.js
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const HUNTER_API_KEY = 'YOUR_API_KEY_HERE';

async function findEmails() {
  // Get all contacts
  const contacts = await prisma.contact.findMany({
    where: {
      email: null,
      company: {
        domain: { not: null }
      }
    },
    include: {
      company: true
    }
  });

  console.log(`Finding emails for ${contacts.length} contacts...`);

  for (const contact of contacts) {
    try {
      const response = await axios.get(
        'https://api.hunter.io/v2/email-finder',
        {
          params: {
            domain: contact.company.domain,
            first_name: contact.firstName,
            last_name: contact.lastName,
            api_key: HUNTER_API_KEY
          }
        }
      );

      if (response.data.data.email) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { email: response.data.data.email }
        });

        console.log(`✅ ${contact.firstName} ${contact.lastName}: ${response.data.data.email}`);
      }
    } catch (error) {
      console.log(`❌ ${contact.firstName} ${contact.lastName}: ${error.message}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await prisma.$disconnect();
}

findEmails();
```

### Script 3: Find Emails with Apollo.io
```javascript
// save as: find-emails-apollo.js
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const APOLLO_API_KEY = 'YOUR_API_KEY_HERE';

async function findEmailsApollo() {
  const contacts = await prisma.contact.findMany({
    where: { email: null },
    include: { company: true }
  });

  for (const contact of contacts) {
    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/people/match',
        {
          first_name: contact.firstName,
          last_name: contact.lastName,
          organization_name: contact.company.name,
          api_key: APOLLO_API_KEY
        }
      );

      if (response.data.person?.email) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { email: response.data.person.email }
        });

        console.log(`✅ Found: ${response.data.person.email}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await prisma.$disconnect();
}

findEmailsApollo();
```

---

## 🎯 Next Steps

### Immediate (Today):
1. ✅ LinkedIn URLs extracted and organized
2. ⏳ Choose email finder service (recommend Apollo.io)
3. ⏳ Sign up and get API key
4. ⏳ Run email finding script

### Short-term (This Week):
1. ⏳ Find company websites from LinkedIn profiles
2. ⏳ Extract company domains
3. ⏳ Run email finder for all 319 contacts
4. ⏳ Verify emails (bounce check)

### Long-term (This Month):
1. ⏳ Set up automated enrichment pipeline
2. ⏳ Build email verification workflow
3. ⏳ Create campaign sequences
4. ⏳ Start outreach campaigns

---

## 📝 Summary

**Current Status**:
- ✅ 61 companies with LinkedIn profiles
- ✅ 319 decision-makers with names & titles
- ✅ LinkedIn URLs properly organized
- ✅ Database ready for email enrichment

**Missing**:
- ❌ Company websites/domains (need to extract from LinkedIn)
- ❌ Email addresses (need email finder service)
- ❌ Phone numbers (optional - can add later)

**Recommended Action**:
1. Sign up for Apollo.io Professional ($79/month)
2. Use their API to find emails for all 319 contacts
3. Expected success rate: 60-80% (190-255 emails found)
4. Total time: 2-3 hours for setup + 1 hour for processing

**ROI**: $79 to get 200+ verified emails = $0.40 per email
