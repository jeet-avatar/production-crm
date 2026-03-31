# Staffing Placement Pipeline — Design Spec

**Date:** 2026-03-31
**Project:** BrandMonkz CRM (TechCloudPro Staffing Platform)
**Repo:** `/Users/jeet/Documents/production-crm-backup/`
**Depends on:** Contract Signing System (2026-03-30)

---

## Overview

A multi-stage staffing placement pipeline triggered when a client signs the 2% staffing agreement. Manages the complete workflow from signed contract to placed candidate: resume delivery, candidate selection, interview scheduling, client feedback, credential verification, and placement completion. Includes a CRM Kanban board for Rajesh/Peter, a token-based client portal, resume upload + in-CRM builder with PDF generation, and 7 branded email templates — all sent from peter@techcloudpro.com, all CC rajesh@techcloudpro.com.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pipeline UI | Dedicated `/placements` Kanban page | Separation of concerns — contracts and placements are different workflows |
| Client interaction | Token-based portal, single URL | Consistent with contract signing UX; client bookmarks one link |
| Resume delivery | Upload PDF + build-in-CRM (both) | Upload is faster for existing resumes; builder ensures consistent branding and anonymization |
| Client selection | Portal with "Select" button + time slot picker | Structured data, no email parsing, familiar CTA pattern |
| Email sender | peter@techcloudpro.com via Outlook SMTP | Already configured and tested |
| CC on all emails | rajesh@techcloudpro.com | Rajesh always in the loop |
| Branding | TechCloudPro throughout (not BrandMonkz) | Client-facing, professional staffing brand |

## Architecture

### Pipeline Stages

```
CONTRACT_SIGNED → RESUMES_PENDING → RESUMES_SENT → CANDIDATE_SELECTED → INTERVIEW_SCHEDULING → INTERVIEW_CONFIRMED → CLIENT_FEEDBACK → CREDENTIAL_VERIFICATION → PLACEMENT_COMPLETE
                                                                                                                            ↓ (reject)
                                                                                                                     RESUMES_PENDING (loop back)
```

### Trigger

When a contract's status changes to `SIGNED` (after counter-sign), the system auto-creates a `Placement` record in `CONTRACT_SIGNED` stage. The placement appears on the Kanban board immediately.

## Database Schema

### Placement Model (new)

```prisma
model Placement {
  id              String           @id @default(cuid())
  contractId      String
  dealId          String?
  userId          String           // owner (Rajesh/Peter)

  clientName      String
  clientEmail     String
  clientCompany   String?

  stage           PlacementStage   @default(CONTRACT_SIGNED)
  accessToken     String           @unique  // for client portal

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
```

### PlacementCandidate Model (new)

```prisma
model PlacementCandidate {
  id                    String              @id @default(cuid())
  placementId           String

  candidateCode         String              // e.g. "NS-2847", auto-generated
  title                 String              // e.g. "Senior NetSuite Developer"
  experienceYears       Int
  certifications        String[]            // e.g. ["SuiteCloud Developer II", "ERP Consultant"]
  skills                Json                // array of skill strings
  summary               String              @db.Text

  // Contact info (only visible to Rajesh/Peter, never to client)
  candidateName         String?
  candidateEmail        String?
  candidatePhone        String?

  resumeUrl             String?             // S3 key
  resumeType            String              // "uploaded" | "generated"

  status                CandidateStatus     @default(PENDING)
  selectedAt            DateTime?
  interviewAt           DateTime?
  interviewConfirmedAt  DateTime?
  clientFeedback        String?             // "accepted" | "rejected"
  clientFeedbackReason  String?
  clientFeedbackAt      DateTime?
  verificationChecklist Json?               // { certs: bool, references: bool, background: bool }
  placedAt              DateTime?
  startDate             DateTime?

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  placement             Placement           @relation(fields: [placementId], references: [id], onDelete: Cascade)

  @@index([placementId])
  @@index([status])
  @@map("placement_candidates")
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

### PlacementEmail Model (new)

```prisma
model PlacementEmail {
  id            String    @id @default(cuid())
  placementId   String
  candidateId   String?

  stage         String
  emailType     String    // RESUME_DELIVERY, INTERVIEW_REQUEST, INTERVIEW_CONFIRMED_CLIENT, INTERVIEW_CONFIRMED_CANDIDATE, CLIENT_ACCEPTED, PLACEMENT_COMPLETE, REJECTION_MORE_RESUMES

  toEmail       String
  ccEmail       String?
  subject       String
  sentAt        DateTime  @default(now())
  messageId     String?   // SMTP message ID

  placement     Placement @relation(fields: [placementId], references: [id], onDelete: Cascade)

  @@index([placementId])
  @@map("placement_emails")
}
```

### Existing Model Relations (add)

Add to existing **Contract** model:
```prisma
  placements    Placement[]
```

Add to existing **User** model:
```prisma
  placements    Placement[]
```

## API Endpoints

### Authenticated (JWT — Rajesh/Peter)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/placements` | List all placements (for Kanban board) |
| GET | `/api/placements/:id` | Get placement detail with candidates and emails |
| POST | `/api/placements` | Manually create a placement (auto-created on contract sign) |
| PATCH | `/api/placements/:id/stage` | Advance or change stage |
| PUT | `/api/placements/:id` | Update placement details/notes |
| POST | `/api/placements/:id/candidates` | Add candidate (upload resume or build) |
| PUT | `/api/placements/:id/candidates/:candidateId` | Update candidate details |
| DELETE | `/api/placements/:id/candidates/:candidateId` | Remove candidate |
| POST | `/api/placements/:id/candidates/:candidateId/generate-resume` | Generate branded PDF resume |
| POST | `/api/placements/:id/send-resumes` | Email resumes to client with portal link |
| POST | `/api/placements/:id/send-interview-request` | Email candidate with interview times (CC Rajesh) |
| POST | `/api/placements/:id/confirm-interview` | Mark interview confirmed, email both parties |
| POST | `/api/placements/:id/complete-verification` | Mark credential verification done |
| POST | `/api/placements/:id/complete-placement` | Finalize placement, send completion emails |
| POST | `/api/placements/:id/cancel` | Cancel/abandon a placement with reason |

### Public (token-based — client portal)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/placements/portal/:token` | Get placement info for client portal (stage-dependent content) |
| POST | `/api/placements/portal/:token/select-candidate` | Client selects a candidate + provides time slots |
| POST | `/api/placements/portal/:token/feedback` | Client accepts or rejects candidate post-interview |

## Frontend Pages

### CRM: Placements Page (`/placements`)

**Kanban Board** with 9 columns, one per stage. Each column shows placement cards.

**Placement Card:**
- Client name + company
- Contract title
- Current candidate code + title (if selected)
- Days in current stage (color-coded: green < 3 days, yellow 3-7, red > 7)
- Primary action button per stage

**Card Actions:**

| Stage | Button | Opens |
|-------|--------|-------|
| CONTRACT_SIGNED | "Start Pipeline" | Advances to RESUMES_PENDING |
| RESUMES_PENDING | "Add Candidates" | Candidate modal (upload/build) |
| RESUMES_SENT | "Waiting for Client" | Disabled/info |
| CANDIDATE_SELECTED | "Schedule Interview" | Interview email composer modal |
| INTERVIEW_SCHEDULING | "Waiting for Candidate" | Disabled/info |
| INTERVIEW_CONFIRMED | "Mark Interview Done" | Advances to CLIENT_FEEDBACK |
| CLIENT_FEEDBACK | "Waiting for Client" | Disabled/info |
| CREDENTIAL_VERIFICATION | "Verify Credentials" | Checklist modal |
| PLACEMENT_COMPLETE | "View Summary" | Summary drawer |

**All cards** also have a "Cancel Placement" option in a dropdown menu (with reason input).

**Add Candidate Modal (two tabs):**

Tab 1 — Upload PDF:
- Drag & drop or file picker
- Candidate code auto-generated
- Title, experience fields to fill after upload

Tab 2 — Build Resume:
- Title (text input)
- Years of experience (number)
- Certifications (multi-select: SuiteFoundation, SuiteCloud Developer I/II, ERP Consultant, Administrator, PMP, etc.)
- Skills (tag input)
- Summary (textarea)
- "Preview PDF" button → shows generated PDF in modal
- Candidate contact info section (name, email, phone — private, not shared with client)

**Interview Email Composer Modal:**
- Shows client's selected time slots
- To: candidate email (from candidate record)
- CC: rajesh@techcloudpro.com (auto-filled, not editable)
- From: peter@techcloudpro.com (auto)
- Subject: auto-generated, editable
- Body: auto-generated with interview details, editable
- "Send" button

### Public: Client Portal (`/placements/:token`)

Single page, dynamic content based on stage. TechCloudPro branding, dark theme.

**Header** (always shown):
- TechCloudPro logo
- "Staffing Portal"
- Client name + contract title

**Stage-dependent content:**

**RESUMES_SENT:**
- "Review Candidates" heading
- Candidate cards (anonymized): code, title, experience, certifications, skills tags, summary
- "Download Resume" button per candidate (PDF)
- "Select This Candidate" button → opens time slot picker
- Time slot picker: 3 date/time inputs for preferred interview times
- "Confirm Selection" submits choice

**INTERVIEW_CONFIRMED / INTERVIEW_SCHEDULING:**
- Shows selected candidate info
- Interview status: "Scheduled for [date/time]" or "Awaiting candidate confirmation"

**CLIENT_FEEDBACK:**
- "How was the interview?" heading
- Selected candidate info
- "Accept Candidate" button (green)
- "Request Different Candidates" button (red) → optional reason textarea
- Accept advances to verification; reject goes back to RESUMES_PENDING

**CREDENTIAL_VERIFICATION / PLACEMENT_COMPLETE:**
- Status indicator: "Verifying credentials..." or "Placement confirmed!"
- Placement details: candidate title, start date, rate, contact info

**Before RESUMES_SENT / Other stages:**
- "Your placement is being prepared. We'll notify you when candidates are ready."

## Resume PDF Generation

Uses PDFKit (already installed). Generates a branded, anonymized resume:

**Layout:**
- TechCloudPro header with logo
- Candidate code (e.g. "Candidate NS-2847") — NO real name
- Title + years of experience
- Certifications section with badges
- Skills section with tags
- Professional summary
- "Confidential — TechCloudPro Staffing" footer
- Document hash for integrity

Stored in S3 at `placements/{placementId}/resumes/{candidateCode}.pdf`

## Email Templates

All sent from peter@techcloudpro.com, CC rajesh@techcloudpro.com, TechCloudPro dark theme branding.

### 1. Resume Delivery (to client)

**Subject:** `Your Pre-Vetted NetSuite Candidates Are Ready — {clientName}`
**Content:**
- "We've identified [N] qualified candidates for your review"
- Brief summary of each candidate (code, title, key highlights)
- "Review Candidates & Select" CTA button → portal link
- "Candidates are available for interview within 48 hours of selection"

### 2. Interview Request (to candidate)

**Subject:** `Interview Opportunity — {clientCompany} via TechCloudPro`
**Content:**
- "A client is interested in your profile for [role]"
- Proposed interview times (from client's selection)
- "This is a [duration] technical/behavioral interview"
- "Confirm Availability" CTA
- Interview prep tips
- Peter's contact for questions

### 3. Interview Confirmed → Client

**Subject:** `Interview Confirmed — {candidateCode} on {date}`
**Content:**
- "Your interview with {candidateCode} is confirmed for {date/time}"
- Candidate summary recap
- Portal link to view details
- "After the interview, you'll be able to provide feedback through the portal"

### 4. Interview Confirmed → Candidate

**Subject:** `Interview Confirmed — {date} with {clientCompany}`
**Content:**
- Confirmed date/time
- How to prepare: research the client's industry, review relevant certifications, prepare examples
- Technical focus areas
- Dress code / video call etiquette
- "Contact Peter with any questions"

### 5. Client Accepted Candidate

**Subject:** `Great News! You've Been Selected — {clientCompany}`
**Content:**
- "Congratulations! {clientCompany} has accepted you for the {role} position"
- Next steps: credential verification, start date confirmation
- What to expect in the next 48 hours

### 6. Placement Complete → Client

**Subject:** `Placement Confirmed — {candidateCode} Starts {startDate}`
**Content:**
- Resource details (title, certifications)
- Start date
- Your TechCloudPro account manager: Peter Samuel
- Contact info + support channels
- "Thank you for trusting TechCloudPro"

### 7. Rejection → More Resumes

**Subject:** `We'll Find the Right Fit — New Candidates Coming`
**Content:**
- "Thank you for your feedback on {candidateCode}"
- "We're preparing additional candidates and will have new profiles within 48 hours"
- Portal link to check status

## Enhanced Legal Contract (2% Agreement)

The existing contract template is enhanced with these 8 protection clauses:

### 1. Non-Circumvention (24 months)
Client shall not directly engage, hire, or contract with any candidate introduced by TechCloudPro for a period of 24 months from the date of introduction. Violation constitutes breach and obligates Client to pay the full industry-standard placement fee of 15% of the candidate's first-year compensation.

### 2. Exclusivity Period (30 days)
Once a candidate profile is presented to Client, Client has a 30-day exclusive window to proceed. After 30 days without selection, TechCloudPro reserves the right to present the candidate to other clients.

### 3. Payment Guarantee
The 2% placement fee is due within 15 business days of the candidate's start date. Late payments accrue interest at 1.5% per month. TechCloudPro reserves the right to recall the resource if payment is not received within 30 days.

### 4. Confidentiality of Candidate Identity
All candidate profiles are proprietary and confidential. Client agrees not to share candidate information with third parties, attempt to identify anonymized candidates, or use candidate information for any purpose other than evaluating them for the specified role.

### 5. Limitation of Liability
TechCloudPro's total liability under this agreement shall not exceed the total fees paid by Client in the preceding 12-month period. TechCloudPro is not liable for indirect, consequential, or punitive damages.

### 6. Right to Substitute
TechCloudPro may substitute a placed resource with an equivalently qualified professional upon 5 business days' written notice, at no additional cost to Client.

### 7. Force Majeure
Neither party shall be liable for failure to perform due to circumstances beyond reasonable control, including natural disasters, pandemics, government actions, or infrastructure failures.

### 8. Dispute Resolution
All disputes shall be resolved through binding arbitration in the State of Delaware, United States, under the rules of the American Arbitration Association. Each party bears its own legal costs.

## Auto-Create Placement on Contract Sign

When the countersign endpoint sets a contract to `SIGNED` status, it auto-creates a Placement. **CRITICAL: Placement creation MUST happen in the synchronous flow (before the background IIFE that generates PDFs/sends emails), not inside it.** This ensures the placement is created even if PDF generation fails.

```typescript
// In contracts.ts countersign handler, BEFORE the background IIFE:
const updated = await prisma.contract.update({ ... status: SIGNED ... });

// Auto-create placement immediately (synchronous)
await prisma.placement.create({
  data: {
    contractId: contract.id,
    dealId: contract.dealId,
    userId: contract.userId,
    clientName: contract.signerName || '',
    clientEmail: contract.signerEmail || '',
    clientCompany: (contract.variables as any)?.clientCompany || contract.title?.split(' — ')[1] || '',
    stage: 'CONTRACT_SIGNED',
    accessToken: crypto.randomBytes(32).toString('hex'),
  },
});

// THEN the background IIFE for PDF + email:
(async () => { ... })();
```

**`clientCompany` fallback chain:** `contract.variables.clientCompany` → extract from contract title → empty string.

## Candidate Selection Rules

**Single selection per placement.** Only one candidate may be in SELECTED/INTERVIEW_SCHEDULED/INTERVIEW_CONFIRMED status at a time. If the client selects a new candidate:
- The previously selected candidate's status resets to SENT
- Any scheduled interview is cancelled
- Stage resets to CANDIDATE_SELECTED

After rejection at CLIENT_FEEDBACK stage, ALL candidates for that placement reset to SENT (or new candidates are added), and the stage goes back to RESUMES_PENDING.

## Route Mounting Order

**CRITICAL:** Portal routes MUST be mounted BEFORE authenticated placement routes in `app.ts`, following the same pattern as contract signing:

```typescript
// app.ts — order matters
app.use('/api/placements/portal', placementPortalRoutes);  // public, no auth
app.use('/api/placements', placementsRoutes);               // authenticated
```

## Security

| Measure | Implementation |
|---------|---------------|
| Portal access token | `crypto.randomBytes(32).toString('hex')` — same as signing tokens |
| Candidate privacy | Real name/email/phone never exposed to client portal — only code + anonymized profile |
| Resume S3 storage | Pre-signed URLs for download, 1-hour expiry |
| Email audit trail | Every email logged in PlacementEmail with SMTP messageId |
| Stage transitions | Only valid forward transitions allowed (plus reject → RESUMES_PENDING loop) |
| File upload | PDF only, max 10MB, virus scan optional |

## File Changes

### Backend

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add Placement, PlacementCandidate, PlacementEmail models + enums, add relation on Contract |
| `backend/src/routes/placements.ts` | New — 14 authenticated endpoints for placement management |
| `backend/src/routes/placementPortal.ts` | New — 3 public endpoints for client portal |
| `backend/src/services/placementEmailService.ts` | New — 7 email templates |
| `backend/src/services/resumePdfService.ts` | New — PDFKit branded resume generation |
| `backend/src/routes/contracts.ts` | Add auto-create placement in countersign handler |
| `backend/src/app.ts` | Mount placement routes + portal routes |
| `backend/src/middleware/securityGuards.ts` | Add `/placements` to SQL injection skip list |

### Frontend

| File | Change |
|------|--------|
| `frontend/src/pages/Placements/PlacementsPage.tsx` | New — Kanban board |
| `frontend/src/pages/Placements/PlacementCard.tsx` | New — Card component for Kanban |
| `frontend/src/pages/Placements/AddCandidateModal.tsx` | New — Upload/Build resume modal |
| `frontend/src/pages/Placements/InterviewComposerModal.tsx` | New — Email composer for interview |
| `frontend/src/pages/Placements/VerificationModal.tsx` | New — Credential checklist |
| `frontend/src/pages/Placements/PlacementPortalPage.tsx` | New — Public client portal |
| `frontend/src/App.tsx` | Add `/placements` (protected) + `/placements/:token` (public) routes |

## Not in Scope (v1)

- Automated stage transitions (all manual by Rajesh/Peter)
- Calendar integration (Google/Outlook API) — uses email-based scheduling
- Candidate database / talent pool across placements
- Analytics / reporting dashboard for placements
- Bulk placement creation
- Client self-registration / account
