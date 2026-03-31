# Staffing Placement Pipeline Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 9-stage staffing placement pipeline with CRM Kanban board, client portal, resume builder, and email workflow — triggered when a client signs the 2% staffing agreement.

**Architecture:** New Prisma models (Placement, PlacementCandidate, PlacementEmail) with backend routes split into authenticated (`placements.ts`) and public (`placementPortal.ts`). CRM gets a Kanban board page. Client gets a token-based portal. Resume PDFs generated via PDFKit. 7 email templates sent via Outlook SMTP. Auto-creates placement on contract counter-sign.

**Tech Stack:** Node.js/Express/Prisma (backend), React/Tailwind (frontend), PDFKit (resume PDF), nodemailer/Office365 SMTP (email), S3 (resume storage), react-beautiful-dnd or native drag (Kanban)

**Spec:** `docs/superpowers/specs/2026-03-31-staffing-placement-pipeline-design.md`

---

## Chunk 1: Database Schema + Auto-Create Trigger

### Task 1: Prisma Schema — New Models + Relations

**Files:**
- Modify: `backend/prisma/schema.prisma` (add after line 1381)
- Modify: `backend/prisma/schema.prisma:179` (User model — add placements relation)
- Modify: `backend/prisma/schema.prisma:1070` (Contract model — add placements relation)

- [ ] **Step 1: Add PlacementStage and CandidateStatus enums**

Add at end of `schema.prisma` (after line 1381):

```prisma
enum PlacementStage {
  CONTRACT_SIGNED
  RESUMES_PENDING
  RESUMES_SENT
  CANDIDATE_SELECTED
  INTERVIEW_SCHEDULING
  INTERVIEW_CONFIRMED
  CLIENT_FEEDBACK
  CREDENTIAL_VERIFICATION
  PLACEMENT_COMPLETE
  CANCELLED
}

enum CandidateStatus {
  PENDING
  SENT
  SELECTED
  INTERVIEW_SCHEDULED
  INTERVIEW_CONFIRMED
  ACCEPTED
  REJECTED
  PLACED
}
```

- [ ] **Step 2: Add Placement model**

```prisma
model Placement {
  id              String           @id @default(cuid())
  contractId      String
  dealId          String?
  userId          String

  clientName      String
  clientEmail     String
  clientCompany   String?

  stage           PlacementStage   @default(CONTRACT_SIGNED)
  accessToken     String           @unique

  notes           String?          @db.Text
  completedAt     DateTime?
  cancelledAt     DateTime?
  cancelledReason String?

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  contract        Contract         @relation(fields: [contractId], references: [id])
  user            User             @relation(fields: [userId], references: [id])
  candidates      PlacementCandidate[]
  emails          PlacementEmail[]

  @@index([contractId])
  @@index([userId])
  @@index([stage])
  @@map("placements")
}
```

- [ ] **Step 3: Add PlacementCandidate model**

```prisma
model PlacementCandidate {
  id                    String           @id @default(cuid())
  placementId           String

  candidateCode         String
  title                 String
  experienceYears       Int
  certifications        String[]
  skills                Json
  summary               String           @db.Text

  candidateName         String?
  candidateEmail        String?
  candidatePhone        String?

  resumeUrl             String?
  resumeType            String

  status                CandidateStatus  @default(PENDING)
  selectedAt            DateTime?
  interviewAt           DateTime?
  interviewConfirmedAt  DateTime?
  clientFeedback        String?
  clientFeedbackReason  String?
  clientFeedbackAt      DateTime?
  verificationChecklist Json?
  placedAt              DateTime?
  startDate             DateTime?

  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  placement             Placement        @relation(fields: [placementId], references: [id], onDelete: Cascade)

  @@index([placementId])
  @@index([status])
  @@map("placement_candidates")
}
```

- [ ] **Step 4: Add PlacementEmail model**

```prisma
model PlacementEmail {
  id            String    @id @default(cuid())
  placementId   String
  candidateId   String?

  stage         String
  emailType     String

  toEmail       String
  ccEmail       String?
  subject       String
  sentAt        DateTime  @default(now())
  messageId     String?

  placement     Placement @relation(fields: [placementId], references: [id], onDelete: Cascade)

  @@index([placementId])
  @@map("placement_emails")
}
```

- [ ] **Step 5: Add relation fields to existing models**

At `schema.prisma:179` (User model, after `contracts Contract[]`), add:
```prisma
  placements    Placement[]
```

At `schema.prisma:1070` (Contract model, after `otps ContractOTP[]`), add:
```prisma
  placements    Placement[]
```

- [ ] **Step 6: Generate Prisma client**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx prisma generate
```

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add Placement, PlacementCandidate, PlacementEmail models"
```

---

### Task 2: Auto-Create Placement on Contract Counter-Sign

**Files:**
- Modify: `backend/src/routes/contracts.ts:379-382` (before the background IIFE in countersign handler)

- [ ] **Step 1: Add crypto import if not present and placement auto-create**

At `contracts.ts:379` (after `const updated = await prisma.contract.update(...)` and BEFORE the `(async () => {` IIFE on line 382), add:

```typescript
    // Auto-create placement pipeline when contract is fully signed
    try {
      const placementToken = crypto.randomBytes(32).toString('hex');
      await prisma.placement.create({
        data: {
          contractId: contract.id,
          dealId: contract.dealId,
          userId: contract.userId,
          clientName: contract.signerName || '',
          clientEmail: contract.signerEmail || '',
          clientCompany: (contract.variables as any)?.clientCompany || contract.title?.split(' — ')[1] || '',
          stage: 'CONTRACT_SIGNED',
          accessToken: placementToken,
        },
      });
    } catch (err: any) {
      console.error('Failed to auto-create placement:', err.message);
    }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/contracts.ts
git commit -m "feat: auto-create placement when contract is counter-signed"
```

---

## Chunk 2: Backend Services (Email + Resume PDF)

### Task 3: Placement Email Service

**Files:**
- Create: `backend/src/services/placementEmailService.ts`

- [ ] **Step 1: Create placementEmailService.ts**

This file follows the same pattern as `contractEmailService.ts` — uses `createTransporter()` with SMTP_HOST/SMTP_USER/SMTP_PASS env vars, `darkWrapper()` for HTML template, TechCloudPro branding.

Exports 7 functions:
- `sendResumeDeliveryEmail(params)` — to client with portal link
- `sendInterviewRequestEmail(params)` — to candidate (CC rajesh)
- `sendInterviewConfirmedClientEmail(params)` — to client
- `sendInterviewConfirmedCandidateEmail(params)` — prep email to candidate
- `sendClientAcceptedEmail(params)` — to candidate
- `sendPlacementCompleteEmail(params)` — to client
- `sendRejectionMoreResumesEmail(params)` — to client after rejection

All use:
- `from: process.env.FROM_EMAIL || 'peter@techcloudpro.com'`
- `cc: 'rajesh@techcloudpro.com'`
- Dark theme HTML wrapper (same as contractEmailService)
- TechCloudPro branding header
- `FRONTEND_URL` from env for portal links

Each function:
1. Creates the transporter
2. Builds HTML with `darkWrapper()`
3. Sends via `transporter.sendMail()`
4. Logs success/failure
5. Returns `{ messageId }` on success

Read `contractEmailService.ts` first to match the exact pattern (transporter, darkWrapper, primaryButton functions). Copy those helper functions.

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/placementEmailService.ts
git commit -m "feat: add placement email service — 7 email templates"
```

---

### Task 4: Resume PDF Generation Service

**Files:**
- Create: `backend/src/services/resumePdfService.ts`

- [ ] **Step 1: Create resumePdfService.ts**

Uses PDFKit (same pattern as `contractPdfService.ts`). Generates a branded, anonymized resume PDF.

Export one function:
```typescript
export function generateResumePdf(params: {
  candidateCode: string;
  title: string;
  experienceYears: number;
  certifications: string[];
  skills: string[];
  summary: string;
}): Promise<{ buffer: Buffer; hash: string }>
```

PDF layout:
- **Header**: "TECHCLOUDPRO" logo text (indigo), "Confidential Candidate Profile" subtitle
- **Candidate Code**: Large text (e.g. "Candidate NS-2847") — NO real name
- **Title**: e.g. "Senior NetSuite Developer & Solution Architect"
- **Experience**: "8+ Years Professional Experience"
- **Certifications**: Section with bullet points
- **Technical Skills**: Tags/pills layout
- **Professional Summary**: Paragraph text
- **Footer**: "Confidential — TechCloudPro Staffing | This profile is proprietary"
- SHA-256 hash computed from final buffer

Follow the same Promise pattern as `contractPdfService.ts`:
```typescript
return new Promise((resolve, reject) => {
  const doc = new PDFDocument(...);
  const chunks: Buffer[] = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    resolve({ buffer, hash });
  });
  // ... render PDF ...
  doc.end();
});
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/resumePdfService.ts
git commit -m "feat: add resume PDF generation service — branded anonymized profiles"
```

---

## Chunk 3: Backend Routes (Authenticated + Public)

### Task 5: Authenticated Placements Router

**Files:**
- Create: `backend/src/routes/placements.ts`

- [ ] **Step 1: Create placements.ts with all 15 authenticated endpoints**

Follow the pattern of `contracts.ts` — uses `router.use(authenticate)`, PrismaClient, S3Client.

```typescript
import crypto from 'crypto';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { generateResumePdf } from '../services/resumePdfService';
import {
  sendResumeDeliveryEmail,
  sendInterviewRequestEmail,
  sendInterviewConfirmedClientEmail,
  sendInterviewConfirmedCandidateEmail,
  sendClientAcceptedEmail,
  sendPlacementCompleteEmail,
  sendRejectionMoreResumesEmail,
} from '../services/placementEmailService';

const router = Router();
const prisma = new PrismaClient();
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'suiteflow-demo';
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  cb(null, file.mimetype === 'application/pdf');
}});

router.use(authenticate);
```

Endpoints to implement:

**GET /** — List all placements for the user (with candidates count per stage)
```typescript
router.get('/', async (req, res, next) => {
  const placements = await prisma.placement.findMany({
    where: { userId: req.user!.id },
    include: { candidates: true, contract: { select: { title: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(placements);
});
```

**GET /:id** — Get placement detail with candidates and emails

**POST /** — Manually create a placement

**PATCH /:id/stage** — Advance stage (validate allowed transitions)

**PUT /:id** — Update placement notes/details

**POST /:id/candidates** — Add candidate (JSON body for built resumes)

**POST /:id/candidates/upload** — Upload resume PDF (multer middleware)
- Uses `upload.single('resume')` middleware
- Uploads to S3 at `placements/{placementId}/resumes/{candidateCode}.pdf`
- Creates PlacementCandidate record with `resumeType: 'uploaded'`

**PUT /:id/candidates/:candidateId** — Update candidate

**DELETE /:id/candidates/:candidateId** — Remove candidate

**POST /:id/candidates/:candidateId/generate-resume** — Generate branded PDF
- Calls `generateResumePdf()`, uploads to S3, updates `resumeUrl`

**POST /:id/send-resumes** — Send resumes to client
- Updates all PENDING candidates to SENT
- Sends `sendResumeDeliveryEmail()` with portal link
- Advances stage to RESUMES_SENT
- Logs email in PlacementEmail

**POST /:id/send-interview-request** — Send interview email to candidate
- Body: `{ candidateId, interviewTimes, duration, notes }`
- Sends `sendInterviewRequestEmail()` to candidate (CC rajesh)
- Advances stage to INTERVIEW_SCHEDULING
- Logs email

**POST /:id/confirm-interview** — Mark interview confirmed
- Body: `{ candidateId, confirmedTime }`
- Updates candidate `interviewConfirmedAt`
- Sends `sendInterviewConfirmedClientEmail()` to client
- Sends `sendInterviewConfirmedCandidateEmail()` to candidate
- Advances stage to INTERVIEW_CONFIRMED
- Logs both emails

**POST /:id/complete-verification** — Mark credentials verified
- Body: `{ candidateId, checklist: { certs: bool, references: bool, background: bool } }`
- Updates candidate `verificationChecklist`
- Advances stage to CREDENTIAL_VERIFICATION (or PLACEMENT_COMPLETE if all checks pass)

**POST /:id/complete-placement** — Finalize placement
- Body: `{ candidateId, startDate }`
- Updates candidate to PLACED status with `placedAt` and `startDate`
- Sends `sendPlacementCompleteEmail()` to client
- Advances stage to PLACEMENT_COMPLETE
- Logs email

**POST /:id/cancel** — Cancel placement
- Body: `{ reason }`
- Sets `cancelledAt`, `cancelledReason`, stage to CANCELLED

All email sends should be non-blocking (`.catch()` pattern, same as contracts.ts).

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/placements.ts
git commit -m "feat: add authenticated placements router — 15 endpoints"
```

---

### Task 6: Public Placement Portal Router

**Files:**
- Create: `backend/src/routes/placementPortal.ts`

- [ ] **Step 1: Create placementPortal.ts**

Public router (no authenticate middleware). 3 endpoints:

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { sendRejectionMoreResumesEmail } from '../services/placementEmailService';

const router = Router();
const prisma = new PrismaClient();
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'suiteflow-demo';
```

**GET /:token** — Get placement info for portal (stage-dependent)
- Find placement by `accessToken`
- Return different data based on stage:
  - RESUMES_SENT: placement info + candidates (anonymized — code, title, experience, certs, skills, summary, resume download URL via S3 pre-signed URL). NO candidateName/Email/Phone.
  - CANDIDATE_SELECTED / INTERVIEW_SCHEDULING: selected candidate info + interview status
  - INTERVIEW_CONFIRMED: confirmed time
  - CLIENT_FEEDBACK: selected candidate info + accept/reject form indicator
  - CREDENTIAL_VERIFICATION / PLACEMENT_COMPLETE: status + candidate title + start date
  - Other stages: `{ stage, message: "Your placement is being prepared..." }`

**POST /:token/select-candidate** — Client selects candidate + provides time slots
- Body: `{ candidateId, preferredTimes: [string, string, string] }`
- Validate placement is in RESUMES_SENT stage
- Reset any previously selected candidate to SENT
- Update selected candidate to SELECTED with `selectedAt`
- Store `preferredTimes` in placement notes (or candidate record)
- Advance stage to CANDIDATE_SELECTED
- Return success

**POST /:token/feedback** — Client accepts or rejects
- Body: `{ decision: 'accepted' | 'rejected', reason?: string }`
- Validate placement is in CLIENT_FEEDBACK stage
- If accepted: update candidate `clientFeedback: 'accepted'`, advance to CREDENTIAL_VERIFICATION
- If rejected: update candidate `clientFeedback: 'rejected'`, `clientFeedbackReason`, reset candidate to REJECTED, advance to RESUMES_PENDING, send `sendRejectionMoreResumesEmail()`

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/placementPortal.ts
git commit -m "feat: add public placement portal router — client selection and feedback"
```

---

### Task 7: Mount Routes + Security Guards

**Files:**
- Modify: `backend/src/app.ts:49-50` (imports), `backend/src/app.ts:294-295` (route mounting)
- Modify: `backend/src/middleware/securityGuards.ts:54` (SQL skip list)

- [ ] **Step 1: Add imports in app.ts**

At `app.ts:50` (after contractSigningRoutes import), add:
```typescript
import placementPortalRoutes from './routes/placementPortal';
import placementsRoutes from './routes/placements';
```

- [ ] **Step 2: Mount routes in app.ts**

At `app.ts:294` (before contractSigningRoutes mount), add:
```typescript
app.use('/api/placements/portal', placementPortalRoutes);
app.use('/api/placements', placementsRoutes);
```

Order MUST be: portal (public) before placements (authenticated).

- [ ] **Step 3: Update security guards**

At `securityGuards.ts:54`, add to the skip list:
```typescript
    req.path.startsWith('/placements') ||
```

- [ ] **Step 4: Verify compiles + commit**

```bash
npx tsc --noEmit
git add backend/src/app.ts backend/src/middleware/securityGuards.ts
git commit -m "feat: mount placement routes + update security guards"
```

---

## Chunk 4: Frontend — Kanban Board + Modals

### Task 8: Placements Kanban Page

**Files:**
- Create: `frontend/src/pages/Placements/PlacementsPage.tsx`

- [ ] **Step 1: Create PlacementsPage.tsx**

Kanban board showing placements across 9 stage columns (+ CANCELLED hidden by default).

**Structure:**
- Fetches placements from `GET /api/placements`
- Groups by `stage` into columns
- Each column has a header with stage name + count
- Cards show: client name, company, contract title, current candidate (if any), days in stage, action button

**Stage columns (left to right):**
1. CONTRACT_SIGNED (gray)
2. RESUMES_PENDING (blue)
3. RESUMES_SENT (yellow)
4. CANDIDATE_SELECTED (indigo)
5. INTERVIEW_SCHEDULING (purple)
6. INTERVIEW_CONFIRMED (cyan)
7. CLIENT_FEEDBACK (orange)
8. CREDENTIAL_VERIFICATION (teal)
9. PLACEMENT_COMPLETE (green)

**Each card:**
```tsx
<div className="bg-[#1a1a2e] rounded-lg p-4 mb-3 border border-gray-800">
  <div className="flex justify-between items-start mb-2">
    <span className="text-white font-medium">{placement.clientName}</span>
    <span className="text-xs text-gray-500">{daysInStage}d</span>
  </div>
  <p className="text-xs text-gray-400 mb-3">{placement.contract?.title}</p>
  {/* Stage-specific action button */}
  <button ...>{actionLabel}</button>
  {/* Cancel dropdown */}
</div>
```

**Action buttons per stage** (open corresponding modals):
- CONTRACT_SIGNED → "Start Pipeline"
- RESUMES_PENDING → "Add Candidates"
- RESUMES_SENT → "Waiting..." (disabled)
- CANDIDATE_SELECTED → "Schedule Interview"
- INTERVIEW_SCHEDULING → "Waiting..." (disabled)
- INTERVIEW_CONFIRMED → "Mark Interview Done"
- CLIENT_FEEDBACK → "Waiting..." (disabled)
- CREDENTIAL_VERIFICATION → "Verify Credentials"
- PLACEMENT_COMPLETE → "View Summary"

**Horizontal scroll** for 9 columns: use `overflow-x-auto` with `flex-nowrap`.

Styling: dark theme (`bg-[#0f0f23]` page bg, `bg-[#1a1a2e]` cards, indigo accents).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Placements/PlacementsPage.tsx
git commit -m "feat: add Placements Kanban board page"
```

---

### Task 9: Add Candidate Modal

**Files:**
- Create: `frontend/src/pages/Placements/AddCandidateModal.tsx`

- [ ] **Step 1: Create AddCandidateModal.tsx**

Modal with two tabs: "Upload PDF" and "Build Resume".

**Props:**
```tsx
interface AddCandidateModalProps {
  placementId: string;
  onClose: () => void;
  onAdded: () => void; // refresh parent
}
```

**Tab 1 — Upload PDF:**
- Drag & drop zone or file picker (PDF only, max 10MB)
- After upload: show filename
- Fields: Title (text), Experience Years (number)
- Candidate code auto-generated: `NS-{random 4 digits}`
- "Upload" button → `POST /api/placements/:id/candidates/upload` (FormData with file + fields)

**Tab 2 — Build Resume:**
- Title (text input)
- Experience Years (number input)
- Certifications (multi-select dropdown: SuiteFoundation, SuiteCloud Developer I, SuiteCloud Developer II, ERP Consultant, Administrator, PMP, Agile/Scrum)
- Skills (tag input — type and press Enter to add tags)
- Summary (textarea, 500 char min suggested)
- **Candidate contact info section** (collapsible, labeled "Private — Not shared with client"):
  - Name, Email, Phone
- "Preview PDF" button → calls generate-resume endpoint, shows in new tab
- "Add Candidate" button → `POST /api/placements/:id/candidates`

**Styling:** Dark theme modal (`bg-[#1a1a2e]`, `bg-gray-800` inputs).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Placements/AddCandidateModal.tsx
git commit -m "feat: add candidate modal — upload PDF + build resume tabs"
```

---

### Task 10: Interview Composer + Verification + Summary Modals

**Files:**
- Create: `frontend/src/pages/Placements/InterviewComposerModal.tsx`
- Create: `frontend/src/pages/Placements/VerificationModal.tsx`

- [ ] **Step 1: Create InterviewComposerModal.tsx**

Email composer for sending interview request to candidate.

**Props:** `{ placement, candidate, onClose, onSent }`

**Fields:**
- To: candidate email (from candidate record, read-only)
- CC: rajesh@techcloudpro.com (auto-filled, read-only)
- From: peter@techcloudpro.com (auto, read-only)
- Client's preferred times: show the 3 time slots client selected (read-only)
- Interview duration: dropdown (30 min, 45 min, 1 hour)
- Additional notes: textarea (optional)
- Subject: auto-generated — "Interview Opportunity — {clientCompany} via TechCloudPro" (editable)

"Send Interview Request" button → `POST /api/placements/:id/send-interview-request`

- [ ] **Step 2: Create VerificationModal.tsx**

Credential verification checklist.

**Props:** `{ placement, candidate, onClose, onVerified }`

**Checklist:**
- [ ] Certifications verified (with notes field)
- [ ] References checked (with notes field)
- [ ] Background check cleared (with notes field)

"Complete Verification" button (enabled when all 3 checked) → `POST /api/placements/:id/complete-verification`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Placements/InterviewComposerModal.tsx frontend/src/pages/Placements/VerificationModal.tsx
git commit -m "feat: add interview composer + verification modals"
```

---

### Task 11: Add Routes to App.tsx

**Files:**
- Modify: `frontend/src/App.tsx:42` (imports), `frontend/src/App.tsx:102` (public routes), `frontend/src/App.tsx:130` (protected routes)

- [ ] **Step 1: Add imports**

At `App.tsx` imports section, add:
```tsx
import PlacementsPage from './pages/Placements/PlacementsPage';
import PlacementPortalPage from './pages/Placements/PlacementPortalPage';
```

- [ ] **Step 2: Add public route**

In the public routes section (around line 102), add:
```tsx
<Route path="/placements/:token" element={<PlacementPortalPage />} />
```

- [ ] **Step 3: Add protected route**

In the protected routes section (around line 130), add:
```tsx
<Route path="placements" element={<PlacementsPage />} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add placement routes — Kanban + portal"
```

---

## Chunk 5: Frontend — Client Portal + Build & Deploy

### Task 12: Client Portal Page

**Files:**
- Create: `frontend/src/pages/Placements/PlacementPortalPage.tsx`

- [ ] **Step 1: Create PlacementPortalPage.tsx**

Public page (no CRM login). Single URL, dynamic content based on stage.

**Structure:** Same pattern as `ContractSigningPage.tsx` — uses `useParams` for token, fetches data from `GET /api/placements/portal/:token`.

**Header (always):**
- TechCloudPro logo + "Staffing Portal"
- Client name + contract title

**Stage-dependent sections:**

**RESUMES_SENT — Candidate Review:**
- Cards for each candidate: code, title, experience, certifications (badges), skills (tags), summary
- "Download Resume" button per card (pre-signed S3 URL from API)
- "Select This Candidate" button → expands time slot picker:
  - 3 date/time inputs: "Preferred Time 1", "Preferred Time 2", "Preferred Time 3"
  - "Confirm Selection" button → `POST /portal/:token/select-candidate`
- After selection: success message + "We'll reach out to the candidate and confirm shortly"

**CANDIDATE_SELECTED / INTERVIEW_SCHEDULING:**
- Selected candidate info
- "Interview being scheduled — we'll confirm the time shortly"

**INTERVIEW_CONFIRMED:**
- Selected candidate info + confirmed date/time
- "Your interview is confirmed for {date}"

**CLIENT_FEEDBACK:**
- Selected candidate info
- "How was the interview?" heading
- "Accept Candidate" button (green) → `POST /portal/:token/feedback` with `decision: 'accepted'`
- "Request Different Candidates" button (red) → opens reason textarea → `POST /portal/:token/feedback` with `decision: 'rejected'`

**CREDENTIAL_VERIFICATION:**
- "We're verifying credentials — almost there!"

**PLACEMENT_COMPLETE:**
- "Placement Confirmed!" with green check
- Candidate title, start date
- "Your TechCloudPro account manager: Peter Samuel"
- Contact info

**Other stages / CANCELLED:**
- Generic status message

**Styling:** Dark theme matching contract signing page. TechCloudPro branding. Mobile responsive.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Placements/PlacementPortalPage.tsx
git commit -m "feat: add client portal page — dynamic content per pipeline stage"
```

---

### Task 13: Build, Deploy & Test

- [ ] **Step 1: Build backend**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx tsc
```

Fix any errors.

- [ ] **Step 2: Build frontend**

```bash
cd /Users/jeet/Documents/production-crm-backup/frontend
npm run build
```

Fix any errors.

- [ ] **Step 3: Run DB migration on server**

Copy the migration script pattern from `migrate-contract-signing.js`:
- Create `migrate-placement-pipeline.js`
- Add columns to contracts table (placements relation handled by Prisma)
- Create `placements`, `placement_candidates`, `placement_emails` tables
- Add PlacementStage and CandidateStatus enums
- Run on server via SSH

- [ ] **Step 4: Deploy to server**

```bash
# Copy compiled backend files
scp dist/routes/placements.js dist/routes/placementPortal.js server:dist/routes/
scp dist/services/placementEmailService.js dist/services/resumePdfService.js server:dist/services/
scp dist/routes/contracts.js server:dist/routes/  # updated countersign
scp dist/app.js server:dist/
scp dist/middleware/securityGuards.js server:dist/middleware/

# Copy frontend
scp -r frontend/dist/* server:/var/www/brandmonkz/

# Regenerate Prisma client + restart
ssh server "cd /var/www/crm-backend && npx prisma generate && pm2 restart ecosystem.config.js"
```

- [ ] **Step 5: Test E2E flow**

1. Login as Peter/Rajesh
2. Create + sign a contract (already working)
3. Verify placement auto-created in Kanban
4. Add candidates (upload + build)
5. Send resumes → check client portal
6. Select candidate via portal
7. Send interview request
8. Confirm interview
9. Submit feedback via portal
10. Complete verification
11. Complete placement

- [ ] **Step 6: Commit all**

```bash
git add -A
git commit -m "feat: staffing placement pipeline — Kanban, portal, resumes, emails, 9-stage workflow"
```
