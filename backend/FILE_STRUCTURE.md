# 📁 Project File Structure

## ✅ Backend Structure (CRM Module)

```
CRM Module/
├── 📂 docs/                             # All documentation (organized)
│   ├── deployment/
│   │   ├── AWS_DEPLOYMENT_GUIDE.md      # AWS deployment instructions
│   │   ├── CICD_SETUP_GUIDE.md          # CI/CD pipeline setup
│   │   └── PRODUCTION_READY.md          # Production checklist
│   ├── integrations/
│   │   ├── GODADDY_SETUP_GUIDE.md       # GoDaddy domain management
│   │   ├── GOOGLE_OAUTH_SETUP.md        # Google OAuth configuration
│   │   ├── SMTP_SETUP_GUIDE.md          # Email server setup
│   │   └── STRIPE_APOLLO_INTEGRATION_GUIDE.md  # Payment & Apollo.io
│   ├── features/
│   │   ├── AI_ENRICHMENT_GUIDE.md       # AI data enrichment
│   │   ├── SUBSCRIPTION_PLAN.md         # Subscription features
│   │   └── UI_CUSTOMIZATION_SUMMARY.md  # UI customization overview
│   └── development/
│       ├── DEVELOPMENT.md               # Development guide
│       └── MCP_RECOMMENDATIONS.md       # MCP integration recommendations
│
├── 📂 src/                              # Source code
│   ├── config/                          # Configuration files
│   │   ├── database.ts                  # Database connection
│   │   └── passport.ts                  # Authentication strategies
│   ├── middleware/                      # Express middleware
│   │   ├── auth.ts                      # Authentication middleware
│   │   ├── errorHandler.ts             # Global error handler
│   │   └── notFoundHandler.ts          # 404 handler
│   ├── routes/                          # API route handlers (18 files)
│   │   ├── activities.ts                # Activities endpoints
│   │   ├── auth.ts                      # Authentication endpoints
│   │   ├── automations.ts               # Automation workflows
│   │   ├── campaigns.ts                 # Email campaigns
│   │   ├── companies.ts                 # Company management
│   │   ├── contacts.ts                  # Contact management
│   │   ├── csvImport.ts                 # CSV import history
│   │   ├── dashboard.ts                 # Dashboard stats
│   │   ├── deals.ts                     # Deal pipeline
│   │   ├── emailComposer.ts             # Email composition
│   │   ├── emailServers.ts              # Email server management
│   │   ├── emailTemplates.ts            # Email templates
│   │   ├── emailTracking.js             # Email tracking
│   │   ├── enrichment.ts                # Data enrichment
│   │   ├── godaddy.ts                   # GoDaddy integration
│   │   ├── positions.ts                 # Position campaigns
│   │   ├── tags.ts                      # Tag management
│   │   └── users.ts                     # User management
│   ├── services/                        # Business logic services
│   │   ├── aiEnrichment.ts              # AI-powered enrichment
│   │   ├── awsBedrock.ts                # AWS Bedrock integration
│   │   ├── awsS3.ts                     # S3 file storage
│   │   ├── awsSES.ts                    # SES email service
│   │   ├── awsSNS.ts                    # SNS notifications
│   │   ├── emailService.ts              # Email handling
│   │   └── godaddy.ts                   # GoDaddy API client
│   ├── types/                           # TypeScript definitions
│   │   ├── api.ts                       # API types
│   │   └── express.d.ts                 # Express type extensions
│   ├── utils/                           # Utility functions
│   │   ├── auth.ts                      # Auth utilities
│   │   └── logger.ts                    # Logging utility
│   ├── app.ts                           # Express app setup
│   └── server.ts                        # Server entry point
│
├── 📂 scripts/                          # Utility scripts
│   ├── aiEnrichAllCompanies.ts          # Bulk AI enrichment
│   ├── deleteDummyCompanies.ts          # Data cleanup
│   ├── deploy-infrastructure.sh         # Deployment script
│   ├── importDecisionMakers.ts          # Import decision makers
│   ├── importNetsuiteData.ts            # NetSuite integration
│   ├── removeDuplicateCompanies.ts      # Deduplication
│   ├── sendTestEmail.ts                 # Email testing
│   ├── sendTestEmailWithTracking.ts     # Tracked email test
│   ├── sendTestEmailsToThree.ts         # Multi-recipient test
│   ├── sendToRajesh.ts                  # Individual test
│   ├── sendTwoMoreEmails.ts             # Additional tests
│   ├── testGoDaddy.ts                   # GoDaddy API test
│   ├── universalCSVImport.ts            # Universal CSV import
│   └── tests/                           # Test scripts
│       ├── emailTest.js                 # Email functionality test
│       ├── add-cors.js                  # CORS configuration test
│       └── fix-cors.js                  # CORS fix script
│
├── 📂 prisma/                           # Database schema & migrations
│   ├── schema.prisma                    # Prisma schema definition
│   └── migrations/                      # Database migrations
│
├── 📂 aws/                              # AWS infrastructure
│   └── terraform/                       # Terraform configurations
│       ├── main.tf                      # Main infrastructure
│       ├── variables.tf                 # Variable definitions
│       └── terraform.tfvars.example     # Example variables
│
├── 📂 .github/                          # GitHub configuration
│   └── workflows/
│       └── deploy-aws.yml               # AWS deployment workflow
│
├── 📂 .vscode/                          # VS Code settings
│   └── settings.json
│
├── 📂 .claude/                          # Claude Code settings
│   └── settings.local.json
│
├── 📄 .env                              # Environment variables (gitignored)
├── 📄 .env.example                      # Example environment file
├── 📄 .gitignore                        # Git ignore rules
├── 📄 .dockerignore                     # Docker ignore rules
├── 📄 Dockerfile                        # Docker container definition
├── 📄 docker-compose.yml                # Docker services
├── 📄 package.json                      # Node.js dependencies
├── 📄 tsconfig.json                     # TypeScript configuration
├── 📄 setup.sh                          # Initial setup script
├── 📄 PROJECT_STRUCTURE.md              # Structure documentation
└── 📄 README.md                         # Main documentation
```

**Total:** 36 TypeScript files, 13 documentation files, 15 script files

---

## ✅ Frontend Structure (CRM Frontend/crm-app)

```
crm-app/
├── 📂 docs/                             # Documentation (organized)
│   ├── UI_CUSTOMIZATION_GUIDE.md        # Full UI customization guide
│   ├── QUICK_UI_REFERENCE.md            # Quick reference (5-min)
│   └── README_UI.md                     # UI overview
│
├── 📂 public/                           # Static assets
│   ├── legal/
│   │   └── privacy-policy.md            # Privacy policy
│   └── vite.svg                         # Vite logo
│
├── 📂 src/                              # Source code
│   ├── assets/                          # Images & icons
│   │   └── react.svg                    # React logo
│   │
│   ├── components/                      # Reusable components (12 files)
│   │   ├── ApolloImportModal.tsx        # Apollo.io import UI
│   │   ├── CSVImportModal.tsx           # AI CSV import UI
│   │   ├── CampaignEmailReport.tsx      # Campaign reporting
│   │   ├── CampaignSelectModal.tsx      # Campaign selection
│   │   ├── CreateCampaignModal.tsx      # Campaign creation
│   │   ├── EmailComposer.tsx            # Email editor
│   │   ├── EmailServerManagement.tsx    # Email server config
│   │   ├── ImportCompaniesModal.tsx     # Company import
│   │   ├── Layout.tsx                   # App layout wrapper
│   │   ├── PositionCampaignBuilder.tsx  # Position campaigns
│   │   ├── RemoveDuplicatesModal.tsx    # Duplicate removal UI
│   │   └── Sidebar.tsx                  # Navigation sidebar
│   │
│   ├── config/                          # Configuration
│   │   ├── theme.ts                     # Colors, typography, styles
│   │   └── ui.ts                        # Component configs, labels
│   │
│   ├── pages/                           # Page components
│   │   ├── Activities/
│   │   │   └── ActivitiesPage.tsx       # Activities list & calendar
│   │   ├── Analytics/
│   │   │   └── AnalyticsPage.tsx        # Analytics dashboard
│   │   ├── Auth/
│   │   │   ├── LoginPage.tsx            # Login screen
│   │   │   ├── SignupPage.tsx           # Signup screen
│   │   │   └── OAuthCallback.tsx        # OAuth callback handler
│   │   ├── Campaigns/
│   │   │   ├── CampaignsPage.tsx        # Campaigns list
│   │   │   └── CampaignAnalytics.tsx    # Campaign analytics
│   │   ├── Companies/
│   │   │   ├── CompanyList.tsx          # Companies list
│   │   │   ├── CompanyDetail.tsx        # Company details
│   │   │   └── CompanyForm.tsx          # Company form
│   │   ├── Contacts/
│   │   │   ├── ContactList.tsx          # Contacts list
│   │   │   ├── ContactDetail.tsx        # Contact details
│   │   │   └── ContactForm.tsx          # Contact form
│   │   ├── Deals/
│   │   │   ├── DealBoard.tsx            # Deal pipeline board
│   │   │   └── DealForm.tsx             # Deal form
│   │   ├── Pricing/
│   │   │   └── PricingPage.tsx          # Subscription pricing
│   │   ├── Settings/
│   │   │   └── SettingsPage.tsx         # App settings
│   │   ├── Subscription/
│   │   │   └── SubscriptionSuccess.tsx  # Payment success
│   │   ├── Tags/
│   │   │   └── TagsPage.tsx             # Tags management
│   │   └── DashboardPage.tsx            # Main dashboard
│   │
│   ├── services/                        # API clients
│   │   ├── api.ts                       # Main API client
│   │   └── stripe.ts                    # Stripe integration
│   │
│   ├── types/                           # TypeScript types
│   │   └── index.ts                     # Type definitions
│   │
│   ├── utils/                           # Utility functions
│   │   └── index.ts                     # Helper functions
│   │
│   ├── App.tsx                          # Main app component
│   ├── App.css                          # App-specific styles
│   ├── main.tsx                         # App entry point
│   └── index.css                        # Global styles
│
├── 📄 .env                              # Environment variables (gitignored)
├── 📄 .gitignore                        # Git ignore rules
├── 📄 eslint.config.js                  # ESLint configuration
├── 📄 index.html                        # HTML entry point
├── 📄 package.json                      # Dependencies
├── 📄 tsconfig.json                     # TypeScript config
├── 📄 tsconfig.app.json                 # App TypeScript config
├── 📄 tsconfig.node.json                # Node TypeScript config
├── 📄 vite.config.ts                    # Vite configuration
└── 📄 README.md                         # Main documentation
```

**Total:** 38 TypeScript/TSX files, 3 documentation files

---

## 📊 File Organization Benefits

### Before Cleanup:
- ❌ 13 MD files cluttering backend root
- ❌ Test scripts mixed with utility scripts
- ❌ Log files in repo
- ❌ Documentation scattered
- ❌ 3 UI docs in frontend root

### After Cleanup:
- ✅ All docs organized in `docs/` folders
- ✅ Test scripts separated (`scripts/tests/`)
- ✅ No log files in repo
- ✅ Clean root directories
- ✅ Professional structure

---

## 🎯 Quick Navigation

### Backend
- **Main code:** `src/`
- **API routes:** `src/routes/`
- **Documentation:** `docs/`
- **Scripts:** `scripts/`
- **Database:** `prisma/`

### Frontend
- **Components:** `src/components/`
- **Pages:** `src/pages/`
- **Config:** `src/config/`
- **Documentation:** `docs/`

---

## 🔍 Finding Files

### Documentation
```bash
# Backend docs
cd /Users/jeet/Documents/CRM\ Module/docs

# Frontend docs
cd /Users/jeet/Documents/CRM\ Frontend/crm-app/docs
```

### Source Code
```bash
# Backend API routes
cd /Users/jeet/Documents/CRM\ Module/src/routes

# Frontend components
cd /Users/jeet/Documents/CRM\ Frontend/crm-app/src/components
```

### Scripts
```bash
# Utility scripts
cd /Users/jeet/Documents/CRM\ Module/scripts

# Test scripts
cd /Users/jeet/Documents/CRM\ Module/scripts/tests
```

---

## ✅ Build Status

- **Backend:** ✅ Running on http://localhost:3000/
- **Frontend:** ✅ Running on http://localhost:5173/
- **All files:** ✅ Properly organized
- **Documentation:** ✅ Categorized and accessible
