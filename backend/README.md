# CRM Email Marketing Automation Platform

A comprehensive CRM and email marketing automation platform built with Node.js, Express, Prisma, React, and TypeScript.

## 🚀 Features

### Core CRM Features
- **Contact Management** - Import, manage, and enrich contact data
- **Company Management** - Track business relationships
- **Deal Pipeline** - Visual deal tracking and management
- **Activity Tracking** - Log and monitor customer interactions
- **Email Campaigns** - Create and send targeted email campaigns
- **Analytics & Reporting** - Track performance metrics

### Advanced Features
- **CSV Import** - Bulk import contacts with AI-powered field mapping
- **Duplicate Detection** - Intelligent duplicate identification and merging
- **Apollo.io Integration** - Enrich contact data automatically
- **Google OAuth** - Secure authentication
- **Stripe Integration** - Subscription management
- **AWS Deployment** - Production-ready infrastructure

## 📁 Project Structure

```
CRM Module/                 # Backend (Node.js + Express + Prisma)
├── src/
│   ├── routes/            # API endpoints
│   ├── middleware/        # Authentication & validation
│   ├── services/          # Business logic
│   └── config/            # Configuration
├── prisma/                # Database schema & migrations
├── docs/                  # Documentation
│   ├── deployment/        # AWS, CI/CD guides
│   ├── integrations/      # Apollo, Stripe, OAuth setup
│   ├── features/          # Feature documentation
│   └── development/       # Development guides
└── scripts/               # Utility scripts

CRM Frontend/crm-app/      # Frontend (React + TypeScript + Vite)
├── src/
│   ├── components/        # Reusable components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── config/            # UI configuration (theme.ts, ui.ts)
│   └── types/             # TypeScript types
└── docs/                  # UI customization guides
```

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** Passport.js (Google OAuth)
- **Email:** Nodemailer with multiple SMTP servers
- **AI:** Anthropic Claude for field mapping
- **File Processing:** Multer + CSV Parser

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Custom utility classes (Tailwind-like)
- **State Management:** React Hooks
- **Icons:** Heroicons
- **HTTP Client:** Fetch API

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google OAuth credentials
- SMTP email server

### Backend Setup

1. **Install dependencies:**
```bash
cd "CRM Module"
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Setup database:**
```bash
npx prisma migrate dev
npx prisma generate
```

4. **Start server:**
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Frontend Setup

1. **Install dependencies:**
```bash
cd "CRM Frontend/crm-app"
npm install
```

2. **Configure environment:**
```bash
# Create .env file
VITE_API_URL=http://localhost:3000
```

3. **Start development server:**
```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

## 🎨 UI Customization

The frontend has a centralized UI customization system:

- **`src/config/theme.ts`** - Colors, typography, spacing, shadows
- **`src/config/ui.ts`** - Component configs, labels, messages
- **`src/index.css`** - Utility classes and button styles

See [UI Customization Guide](../CRM%20Frontend/crm-app/docs/UI_CUSTOMIZATION_GUIDE.md) for details.

## 📚 Documentation

### Deployment
- [AWS Deployment Guide](docs/deployment/AWS_DEPLOYMENT_GUIDE.md)
- [CI/CD Setup](docs/deployment/CICD_SETUP_GUIDE.md)
- [Production Ready Checklist](docs/deployment/PRODUCTION_READY.md)

### Integrations
- [Google OAuth Setup](docs/integrations/GOOGLE_OAUTH_SETUP.md)
- [SMTP Email Configuration](docs/integrations/SMTP_SETUP_GUIDE.md)
- [Stripe + Apollo Integration](docs/integrations/STRIPE_APOLLO_INTEGRATION_GUIDE.md)
- [GoDaddy Domain Setup](docs/integrations/GODADDY_SETUP_GUIDE.md)

### Features
- [AI Data Enrichment](docs/features/AI_ENRICHMENT_GUIDE.md)
- [Subscription Plans](docs/features/SUBSCRIPTION_PLAN.md)
- [UI Customization](docs/features/UI_CUSTOMIZATION_SUMMARY.md)

### Development
- [Development Guide](docs/development/DEVELOPMENT.md)
- [MCP Recommendations](docs/development/MCP_RECOMMENDATIONS.md)

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Google OAuth integration
- ✅ Protected API routes
- ✅ Environment variable configuration
- ✅ No hardcoded credentials
- ✅ CORS configuration

## 🌐 API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback

### Contacts
- `GET /api/contacts` - List contacts (paginated)
- `POST /api/contacts` - Create contact
- `POST /api/contacts/csv-import` - Bulk CSV import
- `POST /api/contacts/detect-duplicates` - Find duplicates
- `DELETE /api/contacts/remove-duplicates` - Remove duplicates

### Companies
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company

### Deals
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `PATCH /api/deals/:id` - Update deal

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/send` - Send campaign

## 🚀 Deployment

The platform is production-ready with:
- GitHub Actions CI/CD pipeline
- AWS deployment configuration
- Terraform infrastructure
- Environment-based configuration
- Health check endpoints

See [AWS Deployment Guide](docs/deployment/AWS_DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📊 Database Schema

Key models:
- **User** - User accounts
- **Contact** - Contact information with field-level source tracking
- **Company** - Business entities
- **Deal** - Sales opportunities
- **Activity** - Customer interactions
- **Campaign** - Email campaigns
- **Tag** - Categorization system

## 🤝 Contributing

This is a production CRM system. For contributions:
1. Follow the existing code structure
2. Update documentation for new features
3. Test thoroughly before committing
4. Use the provided UI configuration system

## 📝 License

Proprietary - All rights reserved

## 🆘 Support

For issues or questions:
1. Check the documentation in `/docs`
2. Review the UI customization guides
3. Check environment variable configuration

---

## 📦 Repositories

- **Backend:** https://github.com/jeet-avatar/crm-email-marketing-platform
- **Frontend:** https://github.com/jeet-avatar/crm-new-build-oct-7

🤖 Built with [Claude Code](https://claude.com/claude-code)
