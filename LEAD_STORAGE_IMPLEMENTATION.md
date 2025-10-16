# Lead Storage System Implementation

## Overview
Complete backend system to store and manage discovered leads from API with full CRUD operations.

## Database Schema

### Lead Model
```prisma
enum LeadType {
  INDIVIDUAL
  COMPANY
}

enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  IMPORTED
  REJECTED
  ARCHIVED
}

model Lead {
  id               String     @id @default(cuid())
  type             LeadType
  status           LeadStatus @default(NEW)

  // Lead Information
  leadName         String
  email            String?
  phone            String?
  jobTitle         String?
  company          String?
  location         String?
  headquarters     String?
  industry         String?
  website          String?
  linkedinLink     String?
  leadScore        Int?

  // Search Context
  searchQuery      String?
  searchMode       String?
  searchLocation   String?
  searchIndustry   String?
  searchTechStack  String?

  // Raw API Data
  rawData          Json?

  // Import Tracking
  imported             Boolean   @default(false)
  importedAt           DateTime?
  importedAsContactId  String?
  importedAsCompanyId  String?

  // Metadata
  notes    String?
  tags     String[]
  isActive Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, email], name: "unique_user_email")
  @@index([userId])
  @@index([type])
  @@index([status])
  @@map("leads")
}
```

## SQL Migration

```sql
-- Create enums
CREATE TYPE "LeadType" AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'IMPORTED', 'REJECTED', 'ARCHIVED');

-- Create leads table
CREATE TABLE "leads" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" "LeadType" NOT NULL,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',

  "leadName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "jobTitle" TEXT,
  "company" TEXT,
  "location" TEXT,
  "headquarters" TEXT,
  "industry" TEXT,
  "website" TEXT,
  "linkedinLink" TEXT,
  "leadScore" INTEGER,

  "searchQuery" TEXT,
  "searchMode" TEXT,
  "searchLocation" TEXT,
  "searchIndustry" TEXT,
  "searchTechStack" TEXT,

  "rawData" JSONB,

  "imported" BOOLEAN NOT NULL DEFAULT false,
  "importedAt" TIMESTAMP(3),
  "importedAsContactId" TEXT,
  "importedAsCompanyId" TEXT,

  "notes" TEXT,
  "tags" TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "userId" TEXT NOT NULL,

  CONSTRAINT "leads_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "leads_userId_email_key" UNIQUE ("userId", "email")
);

-- Create indexes
CREATE INDEX "leads_userId_idx" ON "leads"("userId");
CREATE INDEX "leads_type_idx" ON "leads"("type");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_imported_idx" ON "leads"("imported");
CREATE INDEX "leads_leadScore_idx" ON "leads"("leadScore");
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");
CREATE INDEX "leads_email_idx" ON "leads"("email");
CREATE INDEX "leads_company_idx" ON "leads"("company");
CREATE INDEX "leads_searchQuery_idx" ON "leads"("searchQuery");
```

## API Endpoints

### 1. Discover and Save Leads
**Endpoint**: `POST /api/leads/discover`

**Request**:
```json
{
  "query": "software engineer",
  "mode": "individual",
  "location": "San Francisco",
  "industry": "Technology",
  "techStack": "React, Node.js",
  "saveToDatabase": true
}
```

**Response**:
```json
{
  "success": true,
  "leads": [...],
  "count": 25,
  "mode": "individual",
  "saved": 25,
  "duplicates": 0
}
```

### 2. Get All Leads
**Endpoint**: `GET /api/leads`

**Query Params**:
- `status`: Filter by status (NEW, CONTACTED, etc.)
- `type`: Filter by type (INDIVIDUAL, COMPANY)
- `search`: Search by name, email, company
- `page`: Page number
- `limit`: Results per page

**Response**:
```json
{
  "success": true,
  "leads": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### 3. Get Single Lead
**Endpoint**: `GET /api/leads/:id`

**Response**:
```json
{
  "success": true,
  "lead": {
    "id": "abc123",
    "leadName": "John Doe",
    "email": "john@example.com",
    ...
  }
}
```

### 4. Update Lead
**Endpoint**: `PUT /api/leads/:id`

**Request**:
```json
{
  "status": "CONTACTED",
  "notes": "Called on 2025-10-14",
  "tags": ["high-priority", "decision-maker"]
}
```

### 5. Delete Lead
**Endpoint**: `DELETE /api/leads/:id`

### 6. Bulk Update Status
**Endpoint**: `POST /api/leads/bulk-update`

**Request**:
```json
{
  "leadIds": ["id1", "id2", "id3"],
  "status": "CONTACTED"
}
```

### 7. Import Lead (Convert to Contact/Company)
**Endpoint**: `POST /api/leads/:id/import`

**Response**:
```json
{
  "success": true,
  "imported": {
    "contactId": "contact123",
    "companyId": "company456"
  }
}
```

## Implementation Code

See the following files for complete implementation:
- `backend/src/routes/leads.routes.ts` - All API endpoints
- `backend/prisma/schema.prisma` - Database schema
- `backend/prisma/migrations/` - Migration files

## Features

### Automatic Saving
- All discovered leads are automatically saved to database
- Duplicates are detected and skipped
- Search context is preserved for reference

### Lead Management
- View all leads with filtering and pagination
- Update lead status (NEW → CONTACTED → QUALIFIED → IMPORTED)
- Add notes and tags to leads
- Track import status

### Import Tracking
- Mark leads as imported when converted
- Store IDs of created Contact/Company records
- Prevent duplicate imports

### Search History
- Every search query is saved with leads
- Track what searches generated which leads
- Analyze successful search patterns

## Usage Example

```typescript
// 1. Discover leads (automatically saves to DB)
const response = await fetch('/api/leads/discover', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    query: 'CTO tech companies',
    mode: 'company',
    location: 'San Francisco',
    saveToDatabase: true
  })
});

// 2. View saved leads
const leads = await fetch('/api/leads?status=NEW&limit=50');

// 3. Update lead status
await fetch(`/api/leads/${leadId}`, {
  method: 'PUT',
  body: JSON.stringify({ status: 'CONTACTED' })
});

// 4. Import lead as contact
await fetch(`/api/leads/${leadId}/import`, {
  method: 'POST'
});
```

## Benefits

1. **Never Lose Leads**: All discovered leads are saved permanently
2. **Track Progress**: See which leads you've contacted
3. **Prevent Duplicates**: Automatic duplicate detection
4. **Search History**: See what queries worked best
5. **Lead Scoring**: Track and sort by lead score
6. **Import Tracking**: Know what's been imported
7. **Bulk Operations**: Update multiple leads at once

## Migration Steps

1. Run SQL migration on production database
2. Deploy updated backend code
3. Test API endpoints
4. Update frontend to use new endpoints
5. Verify leads are being saved

## Next Steps

- Add lead scoring algorithm
- Add email templates for lead outreach
- Add lead assignment to team members
- Add lead activity tracking
- Add lead conversion analytics
