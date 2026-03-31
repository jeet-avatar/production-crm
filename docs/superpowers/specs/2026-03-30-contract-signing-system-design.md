# Contract Signing System — Design Spec

**Date:** 2026-03-30
**Project:** BrandMonkz CRM (TechCloudPro Staffing Platform)
**Repo:** `/Users/jeet/Documents/production-crm-backup/`

---

## Overview

A self-hosted, DocuSign-style contract signing system for TechCloudPro's staffing contracts. Supports PDF generation from existing contract templates + rate cards, email delivery with secure signing links, OTP-verified electronic signatures (type or draw), two-party signing (client + TechCloudPro counter-sign), and a tamper-evident audit trail.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Signer authentication | Email link + 6-digit email OTP | DocuSign standard for B2B; no separate coordination needed; auditable |
| Signature capture | Type-to-sign + Draw-to-sign (signer chooses) | Matches DocuSign UX; covers desktop + mobile |
| Post-sign delivery | Auto-email PDF to both parties + store in CRM | Both parties get immediate copy; CRM has permanent record |
| Counter-signature | Client signs first → Peter/Rajesh counter-signs → complete | True two-party execution like DocuSign |
| PDF generation | PDFKit (Node.js) | No Chromium dependency on EC2; fast; precise control over layout |
| Public signing page | React route `/contracts/sign/:token` in existing frontend | Reuses Tailwind + dark theme; consistent with `/schedule` and `/talent` public pages |

## Architecture

### Contract Lifecycle

```
DRAFT → SENT_FOR_SIGNATURE → VIEWED → CLIENT_SIGNED → AWAITING_COUNTERSIGN → SIGNED → [COMPLETED]
                                                                                         ↓
                                                                              PDF emailed to both parties
                                                                              PDF stored in S3
```

Side paths: `VOIDED` (sender explicitly cancels with reason), `EXPIRED` (7-day token expires — set by cron sweep). The legacy `CANCELLED` status is kept for backward compatibility with existing data but new contracts should use `VOIDED` instead.

### Data Flow

1. **Create**: User picks template (Full-Time/Hourly/Project) → fills company/contact/rates → saves as DRAFT
2. **Generate PDF**: Backend renders contract content + rate card into branded PDF via PDFKit → stores in S3
3. **Send**: Backend generates cryptographic signing token → emails client with "Review & Sign" link
4. **Verify**: Client clicks link → public page requests OTP → client enters 6-digit code → verified
5. **Sign**: Client views full contract → types or draws signature → submits with agreement checkbox
6. **Counter-sign**: CRM notifies Peter/Rajesh → they open contract → review client signature → counter-sign in-app
7. **Complete**: Final PDF generated with both signatures + audit trail page → emailed to both parties → S3

## Database Schema

### Contract Model (existing — add fields)

```prisma
model Contract {
  // ... existing fields (id, dealId, quoteId, userId, status, title, content, variables, signedAt, signedBy) ...

  // Signer info
  signerName        String?
  signerEmail       String?
  signerTitle       String?

  // Client signature
  signatureData     String?   @db.Text    // PNG base64
  signatureType     String?               // "typed" | "drawn"
  signatureIp       String?
  signatureAgent    String?   @db.Text
  signerOtpId       String?               // OTP verification reference

  // Counter-signature
  counterSignedBy   String?
  counterSignedAt   DateTime?
  counterSigData    String?   @db.Text    // PNG base64
  counterSigIp      String?
  counterSigAgent   String?   @db.Text

  // Document
  documentHash      String?               // SHA-256 of final PDF
  pdfUrl            String?               // S3 key
  signingToken      String?   @unique     // crypto.randomBytes(32).toString('hex')
  tokenExpiresAt    DateTime?             // 7 days after send (single source of truth for expiry)

  // Lifecycle
  sentAt            DateTime?
  voidedAt          DateTime?
  voidedReason      String?
  remindersSent     Int       @default(0)
  lastReminderAt    DateTime?

  // Back-relation for OTPs
  otps              ContractOTP[]
}
```

### ContractStatus Enum (update)

```prisma
enum ContractStatus {
  DRAFT
  SENT_FOR_SIGNATURE
  VIEWED
  CLIENT_SIGNED
  AWAITING_COUNTERSIGN
  SIGNED              // fully completed
  CANCELLED
  VOIDED
  EXPIRED
}
```

### ContractOTP Model (new)

```prisma
model ContractOTP {
  id          String    @id @default(cuid())
  contractId  String
  email       String
  code        String                       // bcrypt hashed
  verified    Boolean   @default(false)
  verifiedAt  DateTime?
  verifiedIp  String?
  expiresAt   DateTime                     // 10 min TTL
  attempts    Int       @default(0)        // max 5
  createdAt   DateTime  @default(now())

  contract    Contract  @relation(fields: [contractId], references: [id])

  @@map("contract_otps")
}
```

## API Endpoints

### Authenticated (JWT required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/contracts/:id/generate-pdf` | Generate PDF from contract content + rate card via PDFKit, upload to S3 |
| POST | `/api/contracts/:id/send` | Generate signing token, send email with signing link to `signerEmail` |
| POST | `/api/contracts/:id/countersign` | Counter-sign a CLIENT_SIGNED contract, generate final PDF, email both parties |
| POST | `/api/contracts/:id/void` | Void a sent/partially-signed contract with reason |
| POST | `/api/contracts/:id/remind` | Send reminder email to unsigned client |

### Public (no auth — token-validated)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/contracts/sign/:token` | Retrieve contract details for signing page (validates token + expiry) |
| POST | `/api/contracts/sign/:token/request-otp` | Send 6-digit OTP to signer's email, rate limited to 3/hour |
| POST | `/api/contracts/sign/:token/verify-otp` | Verify OTP code, return short-lived session token for signing |
| POST | `/api/contracts/sign/:token/submit` | Submit signature (requires verified OTP session), capture all audit data |

### Route Architecture

**CRITICAL**: The existing `contracts.ts` router applies `router.use(authenticate)` at line 9, blocking all unauthenticated requests. The public signing endpoints (`/sign/:token/*`) CANNOT live on this router.

**Solution**: Create a separate `contractSigning.ts` router for all public signing endpoints. Mount it in `app.ts` at `/api/contracts/sign` BEFORE the authenticated contracts router:

```typescript
// app.ts — order matters
app.use('/api/contracts/sign', contractSigningRouter);  // public (no auth)
app.use('/api/contracts', contractsRouter);              // authenticated
```

### OTP Session Token

After OTP verification, the server issues a short-lived JWT (not stored in DB) that authorizes the signature submission:

- **Generation**: `jwt.sign({ contractId, email, otpId }, JWT_SECRET, { expiresIn: '30m' })`
- **Payload**: `{ contractId, email, otpId, type: 'contract-signing' }`
- **TTL**: 30 minutes (enough time to read and sign)
- **Validation**: The `/submit` endpoint verifies this JWT, checks `type === 'contract-signing'`, confirms `contractId` matches the token's contract, and confirms the OTP record exists and is verified
- **No DB storage needed** — the JWT is self-validating with the existing `JWT_SECRET`

### Status Transition Guards

The existing `PATCH /:id/status` endpoint must be locked down to prevent bypassing the signing flow:

- **Blocked transitions via PATCH**: `CLIENT_SIGNED`, `AWAITING_COUNTERSIGN`, `SIGNED` — these can only be set through the signing endpoints
- **Allowed via PATCH**: `DRAFT` → `CANCELLED`, `SENT_FOR_SIGNATURE` → `CANCELLED`
- **Implementation**: Add a guard in the existing PATCH handler that rejects protected statuses

### Content Immutability After Send

The existing `PUT /:id` endpoint must reject content edits when status is past `DRAFT`:

- **Allowed**: Edit content/title/variables when status is `DRAFT`
- **Blocked**: Edit content when status is `SENT_FOR_SIGNATURE`, `VIEWED`, `CLIENT_SIGNED`, `AWAITING_COUNTERSIGN`, `SIGNED`
- **Implementation**: Add a status check at the top of the PUT handler

### Endpoint Details

**POST `/api/contracts/:id/send`**
- Body: `{ signerName, signerEmail, signerTitle, message? }`
- Generates `signingToken` = `crypto.randomBytes(32).toString('hex')`
- Sets `tokenExpiresAt` = now + 7 days
- Sends HTML email with "Review & Sign Contract" CTA button
- Updates status to `SENT_FOR_SIGNATURE`

**POST `/api/contracts/sign/:token/submit`**
- Body: `{ signatureData (base64 PNG), signatureType ("typed"|"drawn"), signerName, signerTitle, otpSessionToken, agreedToTerms (boolean) }`
- Validates: OTP session token is valid, contract is in correct status, `agreedToTerms` is true
- Captures: IP address, user agent, timestamp (UTC ISO 8601)
- Updates status to `CLIENT_SIGNED` / `AWAITING_COUNTERSIGN`
- Sends notification email to contract owner (Peter/Rajesh)

**POST `/api/contracts/:id/countersign`**
- Body: `{ signatureData (base64 PNG), signatureType ("typed"|"drawn") }`
- JWT must match contract's `userId` (owner)
- Generates final PDF with both signatures + audit trail page
- Uploads to S3, sets `documentHash` (SHA-256)
- Emails signed PDF to both parties
- Updates status to `SIGNED`

## Frontend

### Updated: ContractsPage.tsx

Add to the existing contracts page:
- **Contract list view** with status badges (color-coded: gray=draft, yellow=sent, blue=client_signed, green=signed, red=voided)
- **"Send for Signature" modal** — enter signer name, email, title, optional message
- **Counter-sign modal** — view client's signature, sign with type/draw pad, confirm
- **Status timeline** — shows each step with timestamp
- **Actions dropdown** — Download PDF, Send Reminder, Void Contract
- **Contract detail drawer** — full contract view with signature images and audit trail

### New: Public Signing Page (`/contracts/sign/:token`)

Public route (no CRM login required). Flow:

1. **Landing** — TechCloudPro branding, contract title, "from [sender name]", "Verify your identity to continue" button
2. **OTP Step** — "Enter the 6-digit code sent to [masked email]", input field, resend link, 5-attempt limit
3. **Contract View** — scrollable full contract text with rate card, "I have read and agree to the terms" checkbox
4. **Signature Step** — tabs: Type (text input → cursive render) / Draw (canvas pad with clear button), legal consent text
5. **Success** — "Contract signed successfully", download signed PDF button, "A copy has been sent to your email"

### Signing Page Design

- Dark theme (Indigo Noir) matching CRM
- TechCloudPro logo + branding header
- Mobile-responsive (draw pad works on touch)
- Progress indicator showing current step (1-4)
- No CRM navigation — standalone public page

## PDF Generation (PDFKit)

### Contract PDF Structure

**Header (every page):**
- TechCloudPro logo (left)
- Contract ID + date (right)
- Horizontal rule

**Body:**
- Contract title + type
- Effective date
- Full contract terms (from `content` field)
- Rate card table (if applicable)

**Signature Block (last content page):**
- Two signature areas side by side or stacked:
  - "Client" — signature image, printed name, title, date
  - "TechCloudPro" — counter-signature image, printed name, title, date

**Audit Trail Page (final page):**
- Title: "Certificate of Completion"
- Contract ID, document hash (SHA-256)
- Signer 1: name, email, title, signed timestamp, IP, user agent, OTP verified
- Signer 2: name, email, title, counter-signed timestamp, IP, user agent
- Status: COMPLETED
- Completion timestamp

### PDF Storage

- Upload to S3 bucket (existing AWS S3 integration in backend)
- Key format: `contracts/{contractId}/contract-{version}.pdf`
- Versions: `draft` (unsigned), `client-signed`, `final` (both signatures)

## Email Templates

### 1. Signing Request Email

Subject: `Action Required: Please sign — {contractTitle}`

Body:
- TechCloudPro header
- "{senderName} has sent you a contract to review and sign"
- Contract title + type
- Optional personal message
- "Review & Sign Contract" CTA button → `{FRONTEND_URL}/contracts/sign/{token}`
- Expiry notice: "This link expires on {expiryDate}"
- Footer: "Powered by TechCloudPro • Secure Electronic Signature"

### 2. OTP Verification Email

Subject: `Your verification code: {code}`

Body:
- "Use this code to verify your identity"
- Large 6-digit code display
- "This code expires in 10 minutes"
- "If you didn't request this, ignore this email"

### 3. Client Signed Notification (to sender)

Subject: `✓ {signerName} has signed — {contractTitle}`

Body:
- "{signerName} signed the contract on {date}"
- "Counter-sign to complete the contract"
- "View in CRM" button

### 4. Contract Completed (to both parties)

Subject: `Completed: {contractTitle}`

Body:
- "All parties have signed"
- "Signed contract attached as PDF"
- Attached: final PDF with both signatures + audit trail

### 5. Reminder Email

Subject: `Reminder: Please sign — {contractTitle}`

Body:
- "You have a contract waiting for your signature"
- Days remaining before expiry
- "Review & Sign" CTA button

## Security

| Measure | Implementation |
|---------|---------------|
| Signing token | `crypto.randomBytes(32).toString('hex')` — 64-char hex, unguessable |
| Token expiry | 7 days from send; rejected after expiry |
| OTP code | 6 random digits, bcrypt-hashed in DB |
| OTP TTL | 10 minutes |
| OTP attempts | Max 5 per code; locked after 5 failures |
| OTP rate limit | Max 3 OTP requests per hour per contract |
| Document integrity | SHA-256 hash of final PDF stored in DB and printed on audit trail |
| IP capture | Captured at OTP verification + signature submission |
| User agent | Full user agent string stored at signature submission |
| Timestamps | UTC ISO 8601 at every state transition |
| S3 storage | Signed PDFs are immutable (no overwrite) |
| HTTPS | Signing URLs always use HTTPS in production |
| Input validation | Signature data validated as base64 PNG, size-limited (500KB max) |
| OTP session token | Short-lived JWT (30 min TTL) with `type: 'contract-signing'` claim, self-validating |
| Body parser limit | Signing route uses `express.json({ limit: '1mb' })` to accommodate base64 signature data |
| Security guards | `signatureData`, `counterSigData` added to `htmlAllowedFields` in `securityGuards.ts` to prevent base64 corruption |
| Content immutability | Contract content locked after status leaves DRAFT — prevents post-send tampering |
| Status guards | Protected statuses (CLIENT_SIGNED, SIGNED) cannot be set via direct PATCH — only through signing flow |
| Email prefetch | GET `/sign/:token` does NOT transition to VIEWED — only records a view event. Status stays SENT_FOR_SIGNATURE until OTP verified |

## Not in Scope (v1)

- Multi-signer (3+ parties)
- Field-by-field placement (initials, date fields at specific locations)
- Bulk send contracts
- Contract versioning / redlining / change tracking
- Mobile app signing (web only)
- UETA/ESIGN legal compliance notice page
- Template management UI (templates remain in code)

## Dependencies

### Backend (new packages)

- `pdfkit` — PDF generation
- No new packages needed for OTP (use existing `bcryptjs` + `crypto`)
- No new packages needed for S3 (existing `@aws-sdk/client-s3`)
- No new packages needed for email (existing `nodemailer` + `@aws-sdk/client-ses`)

### Frontend (new packages)

- `react-signature-canvas` — draw-to-sign pad
- No new packages needed for the rest (existing React, Tailwind, axios, react-hook-form, zod)

## File Changes

### Backend

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add fields to Contract, new ContractOTP model, update ContractStatus enum |
| `backend/src/routes/contracts.ts` | Add authenticated endpoints (generate-pdf, send, countersign, void, remind) + status/content guards |
| `backend/src/routes/contractSigning.ts` | New — public signing router (GET contract, request-otp, verify-otp, submit signature) |
| `backend/src/services/contractPdfService.ts` | New — PDFKit PDF generation with branding, rate cards, signatures, audit trail |
| `backend/src/services/contractEmailService.ts` | New — 5 email templates (signing request, OTP, notification, completed, reminder) |
| `backend/src/app.ts` | Mount `contractSigning` router at `/api/contracts/sign` BEFORE authenticated contracts router |
| `backend/src/middleware/securityGuards.ts` | Add `/api/contracts/sign` to SQL injection skip list + `signatureData`/`counterSigData` to `htmlAllowedFields` |

### Frontend

| File | Change |
|------|--------|
| `frontend/src/pages/Contracts/ContractsPage.tsx` | Add send/countersign/void/remind actions, status badges, contract detail drawer |
| `frontend/src/pages/Contracts/ContractSigningPage.tsx` | New — public signing page with OTP → contract view → signature capture → success |
| `frontend/src/pages/Contracts/SignaturePad.tsx` | New — type/draw signature component with tabs |
| `frontend/src/App.tsx` | Add public route: `/contracts/sign/:token` → ContractSigningPage |
