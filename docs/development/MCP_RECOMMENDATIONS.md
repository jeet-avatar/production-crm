# MCP Server Recommendations for Agentic CRM

## Overview
For your AI-powered, agent-based CRM with intelligent mailing and enrichment capabilities, here are the recommended MCP servers:

## 🎯 Essential MCP Servers

### 1. **Apollo.io MCP Server** (HIGHLY RECOMMENDED)
**Purpose**: B2B Contact & Company Enrichment
- **Features**:
  - Find contact emails and phone numbers
  - Get company information (employee count, industry, technologies)
  - Get decision maker contact details
  - Company firmographics
  - Technographics (tech stack used)

- **Why You Need It**: Perfectly matches your Decision Makers use case - automatically enrich companies with LinkedIn profiles, employee counts, and decision maker contacts

- **Setup**:
  ```bash
  npm install @modelcontextprotocol/server-apollo
  ```

- **Configuration** in `.claude.json`:
  ```json
  {
    "mcpServers": {
      "apollo": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-apollo"],
        "env": {
          "APOLLO_API_KEY": "your-apollo-api-key"
        }
      }
    }
  }
  ```

### 2. **Clearbit MCP Server**
**Purpose**: Real-time Company & Person Data Enrichment
- **Features**:
  - Company logo, description, metrics
  - Person role, seniority, department
  - Technology stack detection
  - Funding and financial data

- **Why You Need It**: Automatically populate job postings, hiring intent, tech stack fields in your CRM

### 3. **Hunter.io MCP Server**
**Purpose**: Email Finding & Verification
- **Features**:
  - Find email addresses from company domains
  - Verify email deliverability
  - Email pattern detection
  - Bulk email searches

- **Why You Need It**: Auto-generate contact emails for decision makers when importing from LinkedIn

### 4. **Anthropic Prompt Caching MCP**
**Purpose**: AI-Powered Content Generation
- **Features**:
  - Generate personalized emails based on company data
  - Create AI pitches automatically
  - Analyze hiring intent from job postings
  - Generate value propositions

- **Why You Need It**: Perfect for your "AI Pitch" field - automatically generate personalized pitches based on company's tech stack and hiring intent

### 5. **LinkedIn MCP Server** (Custom - Build This)
**Purpose**: LinkedIn Data Scraping & Enrichment
- **Features**:
  - Extract company employee lists
  - Get decision maker profiles
  - Track job postings
  - Monitor company updates

- **Why You Need It**: Automate the process of finding CEOs, CFOs, CTOs from company LinkedIn pages

## 🚀 Implementation Strategy

### Phase 1: Data Enrichment Agent
Create an AI agent that:
1. Takes a company name
2. Uses Apollo/Clearbit to get company details
3. Uses Hunter.io to find executive emails
4. Auto-populates all CRM fields

**Example Agent Flow**:
```typescript
async function enrichCompany(companyName: string) {
  // 1. Get company info from Apollo
  const companyData = await apollo.searchCompany(companyName);

  // 2. Find decision makers
  const executives = await apollo.searchPeople({
    company: companyName,
    titles: ['CEO', 'CTO', 'CFO']
  });

  // 3. Generate AI pitch
  const aiPitch = await claude.generate({
    prompt: `Based on this company data: ${companyData},
             create a personalized AI solution pitch`
  });

  // 4. Save to CRM
  await prisma.company.update({
    data: {
      ...companyData,
      aiPitch,
      enriched: true
    }
  });
}
```

### Phase 2: Intelligent Email Campaign Agent
Create an AI agent that:
1. Reads contact's role and company info
2. Generates personalized email content
3. Schedules and sends emails
4. Tracks opens, clicks, responses

**Example Agent Flow**:
```typescript
async function sendIntelligentCampaign(contactId: string) {
  const contact = await getContactWithCompany(contactId);

  // AI generates personalized email
  const emailContent = await claude.generate({
    prompt: `Write a personalized sales email to ${contact.role}
             at ${contact.company.name}. Their tech stack:
             ${contact.company.techStack}. Their hiring intent:
             ${contact.company.hiringIntent}`
  });

  // Send via email composer
  await emailComposerApi.create({
    to: contact.email,
    subject: emailContent.subject,
    body: emailContent.body,
    tracking: true
  });
}
```

### Phase 3: Autonomous Lead Scoring Agent
Create an AI agent that:
1. Analyzes company hiring intent
2. Scores leads based on tech stack match
3. Prioritizes outreach based on job postings
4. Auto-assigns to sales reps

## 📦 Quick Start: MCP Server Setup

### Create `.claude.json` in project root:
```json
{
  "mcpServers": {
    "apollo": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-apollo"],
      "env": {
        "APOLLO_API_KEY": "your-key-here"
      }
    },
    "clearbit": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-clearbit"],
      "env": {
        "CLEARBIT_API_KEY": "your-key-here"
      }
    },
    "hunter": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-hunter"],
      "env": {
        "HUNTER_API_KEY": "your-key-here"
      }
    }
  }
}
```

### Get API Keys:
- **Apollo.io**: https://app.apollo.io/#/settings/integrations
- **Clearbit**: https://dashboard.clearbit.com/api
- **Hunter.io**: https://hunter.io/api-keys

## 🎯 Use Cases for Your CRM

### Use Case 1: Automated Lead Import
```
User uploads Decision Makers CSV
  → Agent reads CSV
  → Apollo enriches each company
  → Hunter finds executive emails
  → Claude generates AI pitch
  → All data auto-populated in CRM
```

### Use Case 2: Intelligent Outreach
```
User selects 100 leads
  → Agent analyzes each company's hiring intent
  → Scores leads based on tech stack fit
  → Generates personalized emails for top 20
  → Schedules email campaign
  → Tracks engagement automatically
```

### Use Case 3: Real-time Enrichment
```
User adds company "Acme Corp"
  → Agent triggers on company creation
  → Apollo fetches employee count, LinkedIn
  → Clearbit gets logo, description
  → Hunter finds CEO email
  → Claude analyzes public job postings
  → Fields auto-populated instantly
```

## 💡 Pro Tips

1. **Start with Apollo.io** - Best ROI for B2B data
2. **Use Claude for AI generation** - Built-in, no additional MCP needed
3. **Build custom LinkedIn scraper** - Most valuable for your use case
4. **Implement rate limiting** - All APIs have limits
5. **Cache enriched data** - Don't re-enrich the same company

## 🔗 Resources

- MCP Server Registry: https://github.com/modelcontextprotocol/servers
- Apollo.io API Docs: https://apolloio.github.io/apollo-api-docs/
- Clearbit API Docs: https://dashboard.clearbit.com/docs
- Hunter.io API Docs: https://hunter.io/api-documentation

## Next Steps

1. Sign up for Apollo.io (offers free tier)
2. Configure MCP server in `.claude.json`
3. Test enrichment with one company
4. Build autonomous enrichment agent
5. Scale to full database
