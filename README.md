# 🚀 BrandMonkz CRM - Production Repository

**Full-Stack AI-Powered CRM Platform**

A comprehensive Customer Relationship Management system with AI enrichment, email campaigns, contact management, and analytics.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [AI Enrichment](#ai-enrichment)
- [Contributing](#contributing)

---

## ✨ Features

### Core CRM Features
- 📊 **Contact Management** - Full CRUD for contacts with relationships
- 🏢 **Company Management** - Track companies with decision makers
- 💰 **Deal Pipeline** - Visual Kanban board for deal tracking
- 📧 **Email Campaigns** - Bulk email with tracking and analytics
- 📈 **Analytics Dashboard** - Real-time metrics and reporting
- 🏷️ **Tags & Segmentation** - Organize contacts and companies

### AI-Powered Features
- 🤖 **AI Enrichment** - Automatic company intelligence via web scraping
- ✨ **Claude AI Integration** - Extract industry, size, tech stack, keywords
- 🌐 **Web Scraping** - Automated data collection from company websites
- 📊 **Smart Categorization** - AI-based company type classification

### Email & Communication
- 📨 **Email Composer** - Rich text editor with templates
- 📬 **Campaign Management** - Schedule and track email campaigns
- 📊 **Email Analytics** - Open rates, click tracking, engagement metrics
- 🔗 **Multi-SMTP Support** - Connect multiple email servers

### Data Import/Export
- 📄 **CSV Import** - Bulk import contacts and companies
- 🔄 **Apollo.io Integration** - Import enriched data
- 📤 **Export Capabilities** - Download data in various formats

### Security & Auth
- 🔐 **Google OAuth** - Social login integration
- 🔒 **JWT Authentication** - Secure token-based auth
- 🛡️ **CSRF Protection** - Security against cross-site attacks
- 🔑 **Role-Based Access** - Admin, Manager, Sales Rep roles

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js + TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **AI:** Anthropic Claude API (Sonnet 4)
- **Web Scraping:** Cheerio, Axios, Readability, JSDOM
- **Authentication:** Passport.js + JWT
- **Email:** Nodemailer with multi-SMTP
- **File Upload:** Multer
- **Validation:** Joi

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Heroicons
- **State Management:** React Hooks
- **HTTP Client:** Axios
- **Routing:** React Router v6

### Infrastructure
- **Hosting:** AWS (EC2 + S3 + RDS)
- **Process Manager:** PM2
- **Web Server:** Nginx
- **CI/CD:** GitHub Actions
- **Monitoring:** CloudWatch

---

## 📁 Project Structure

```
production-crm/
├── backend/                    # Node.js + Express Backend
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── services/          # Business logic services
│   │   ├── middleware/        # Auth, security, error handling
│   │   ├── config/            # Configuration files
│   │   ├── utils/             # Helper functions
│   │   └── types/             # TypeScript type definitions
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # Database migrations
│   ├── scripts/               # Utility scripts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                   # React + Vite Frontend
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client services
│   │   ├── hooks/             # Custom React hooks
│   │   ├── styles/            # CSS and style files
│   │   └── types/             # TypeScript interfaces
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
└── README.md                   # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL 14+
- Git
- AWS Account (for deployment)
- Anthropic API Key (for AI features)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET, etc.

# Run database migrations
npx prisma migrate deploy
npx prisma generate

# Build TypeScript
npm run build

# Start development server
npm run dev

# Backend runs on http://localhost:3000
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with backend API URL
# VITE_API_URL=http://localhost:3000

# Start development server
npm run dev

# Frontend runs on http://localhost:5173
```

---

## 🔧 Environment Setup

### Backend Environment Variables

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/crm_db

# Server
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# AI Enrichment
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Email (Optional - for sending campaigns)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AWS (Optional - for production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:3000

# Stripe (Optional - for subscriptions)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
```

---

## 🌐 Deployment

### AWS Deployment (Production)

#### Backend (EC2)

```bash
# SSH to EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Clone repository
git clone https://github.com/yourusername/production-crm.git
cd production-crm/backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env  # Edit with production values

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Build
npm run build

# Start with PM2
pm2 start dist/server.js --name crm-backend
pm2 save
pm2 startup
```

#### Frontend (S3)

```bash
# Local machine
cd frontend

# Set production API URL
cp .env.production .env
# VITE_API_URL=http://your-ec2-ip:3000

# Build for production
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete
aws s3 cp s3://your-bucket-name/ s3://your-bucket-name/ \
  --recursive --exclude "*" --include "*.html" \
  --metadata-directive REPLACE \
  --cache-control "no-cache, no-store, must-revalidate"
```

#### Database (RDS)

1. Create PostgreSQL RDS instance in AWS Console
2. Configure security groups
3. Update backend `.env` with RDS endpoint
4. Run migrations: `npx prisma migrate deploy`

---

## 📚 API Documentation

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "jwt-token-here",
  "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "..." }
}
```

#### Google OAuth
```http
GET /api/auth/google
# Redirects to Google OAuth consent screen

GET /api/auth/google/callback?code=...
# Handles OAuth callback, returns token
```

### Companies

#### Get All Companies
```http
GET /api/companies?page=1&limit=10&search=carrier
Authorization: Bearer {token}

Response:
{
  "companies": [...],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

#### Get Single Company
```http
GET /api/companies/:id
Authorization: Bearer {token}

Response:
{
  "company": {
    "id": "...",
    "name": "Carrier Global",
    "website": "https://carrier.com",
    "aiIndustry": "HVAC/Climate Control",
    "aiEmployeeRange": "500+",
    ...
  }
}
```

#### AI Enrich Company
```http
POST /api/companies/:id/enrich
Authorization: Bearer {token}

Response:
{
  "message": "Company enrichment started",
  "status": "enriching"
}
```

### Contacts

#### Create Contact
```http
POST /api/contacts
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "companyId": "company-id-here"
}
```

#### CSV Import
```http
POST /api/csv-import
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: contacts.csv
entityType: contacts
```

### Campaigns

#### Create Campaign
```http
POST /api/campaigns
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Q4 Outreach",
  "subject": "Special Offer",
  "htmlContent": "<html>...</html>",
  "contactIds": ["id1", "id2"]
}
```

---

## 🗄️ Database Schema

### Key Models

#### User
```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  firstName    String
  lastName     String
  role         Role      @default(USER)
  contacts     Contact[]
  companies    Company[]
  campaigns    Campaign[]
}
```

#### Company
```prisma
model Company {
  id                String    @id @default(cuid())
  name              String
  website           String?
  industry          String?

  // AI Enrichment Fields
  aiDescription     String?   @db.Text
  aiIndustry        String?
  aiKeywords        String[]
  aiCompanyType     String?
  aiTechStack       String[]
  aiEmployeeRange   String?
  aiRevenue         String?
  enrichmentStatus  String?   @default("pending")
  enrichedAt        DateTime?

  contacts          Contact[]
  userId            String
  user              User      @relation(fields: [userId], references: [id])
}
```

#### Contact
```prisma
model Contact {
  id         String        @id @default(cuid())
  firstName  String
  lastName   String
  email      String?       @unique
  phone      String?
  title      String?
  status     ContactStatus @default(LEAD)
  companyId  String?
  company    Company?      @relation(fields: [companyId], references: [id])
  userId     String
  user       User          @relation(fields: [userId], references: [id])
}
```

---

## 🤖 AI Enrichment

### How It Works

1. **Web Scraping:** When you click "AI Enrich" on a company:
   - Scrapes company website using Cheerio + Readability
   - Extracts title, meta tags, content, keywords, headings

2. **AI Analysis:** Sends scraped data to Claude AI:
   - Analyzes content and extracts business intelligence
   - Returns structured data (industry, type, keywords, tech stack)

3. **Database Update:** Saves enriched data:
   - 10 AI-generated fields stored in company record
   - Enrichment status tracked (pending → enriching → enriched)

4. **Display:** Shows beautiful intelligence card:
   - Company overview, industry, employee range
   - Keywords, tech stack, recent news
   - Gradient UI with badges

### AI Fields Extracted

- **aiDescription** - 2-3 sentence company overview
- **aiIndustry** - Primary industry category
- **aiCompanyType** - B2B, B2C, Enterprise, SMB
- **aiKeywords** - 5-10 relevant business keywords
- **aiTechStack** - Technologies used or mentioned
- **aiEmployeeRange** - Estimated company size
- **aiRevenue** - Revenue estimate (if available)
- **aiFoundedYear** - Founded year (if found)
- **aiRecentNews** - Recent updates or achievements

### Usage

```typescript
// Frontend - Trigger enrichment
const handleEnrich = async (companyId: string) => {
  await fetch(`/api/companies/${companyId}/enrich`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  // Poll for completion
  const interval = setInterval(async () => {
    const company = await fetchCompany(companyId);
    if (company.enrichmentStatus === 'enriched') {
      clearInterval(interval);
      // Display enriched data
    }
  }, 3000);
};
```

---

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt rounds
- **CSRF Protection** - Token-based CSRF prevention
- **Rate Limiting** - Prevent API abuse
- **Security Headers** - Helmet.js middleware
- **Input Validation** - Joi schema validation
- **SQL Injection Protection** - Prisma parameterized queries
- **XSS Prevention** - Content sanitization

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

---

## 📦 Scripts

### Backend

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
npm run prisma:studio # Open Prisma Studio (database GUI)
npm run migrate      # Run database migrations
```

### Frontend

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🆘 Support

- **Email:** support@brandmonkz.com
- **Documentation:** See `/docs` folder
- **Issues:** GitHub Issues tab

---

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced AI features (sentiment analysis)
- [ ] WhatsApp integration
- [ ] Multi-language support
- [ ] Advanced reporting dashboards
- [ ] API webhooks
- [ ] Zapier integration

---

## 📸 Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### AI Enrichment
![AI Enrichment](docs/screenshots/ai-enrichment.png)

### Email Campaigns
![Campaigns](docs/screenshots/campaigns.png)

---

**Built with ❤️ by the BrandMonkz Team**

For questions or support, contact: jeetnair.in@gmail.com
