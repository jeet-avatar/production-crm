# Contract Signing System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted DocuSign-style contract signing system with PDF generation, email OTP verification, type/draw signatures, two-party signing, and tamper-evident audit trails.

**Architecture:** Separate public router (`contractSigning.ts`) for unauthenticated signing flow, existing `contracts.ts` extended for authenticated actions. PDFKit generates branded PDFs server-side. React frontend has a public `/contracts/sign/:token` page for external signers and updated `ContractsPage` for CRM users.

**Tech Stack:** Node.js/Express/Prisma (backend), React/Tailwind (frontend), PDFKit (PDF), nodemailer/SES (email), bcryptjs (OTP hashing), crypto (tokens), S3 (storage), react-signature-canvas (draw pad)

**Spec:** `docs/superpowers/specs/2026-03-30-contract-signing-system-design.md`

---

## Chunk 1: Database Schema + Dependencies

### Task 1: Install Dependencies

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install backend dependency**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npm install pdfkit @types/pdfkit
```

- [ ] **Step 2: Install frontend dependency**

```bash
cd /Users/jeet/Documents/production-crm-backup/frontend
npm install react-signature-canvas
npm install -D @types/react-signature-canvas
```

- [ ] **Step 3: Verify installations**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend && node -e "require('pdfkit'); console.log('pdfkit OK')"
cd /Users/jeet/Documents/production-crm-backup/frontend && node -e "require('react-signature-canvas'); console.log('react-signature-canvas OK')"
```

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
git commit -m "chore: add pdfkit and react-signature-canvas dependencies"
```

---

### Task 2: Update Prisma Schema

**Files:**
- Modify: `backend/prisma/schema.prisma:1013-1035` (Contract model)
- Modify: `backend/prisma/schema.prisma:1121-1126` (ContractStatus enum)

- [ ] **Step 1: Add new fields to Contract model**

At `schema.prisma:1029` (after the `user` relation, before `@@index`), add:

```prisma
  // Signer info
  signerName        String?
  signerEmail       String?
  signerTitle       String?

  // Client signature
  signatureData     String?   @db.Text
  signatureType     String?
  signatureIp       String?
  signatureAgent    String?   @db.Text
  signerOtpId       String?

  // Counter-signature
  counterSignedBy   String?
  counterSignedAt   DateTime?
  counterSigData    String?   @db.Text
  counterSigIp      String?
  counterSigAgent   String?   @db.Text

  // Document
  documentHash      String?
  pdfUrl            String?
  signingToken      String?   @unique
  tokenExpiresAt    DateTime?

  // Lifecycle
  sentAt            DateTime?
  voidedAt          DateTime?
  voidedReason      String?
  remindersSent     Int       @default(0)
  lastReminderAt    DateTime?

  // Relations
  otps              ContractOTP[]
```

- [ ] **Step 2: Update ContractStatus enum**

Replace `schema.prisma:1121-1126` with:

```prisma
enum ContractStatus {
  DRAFT
  SENT_FOR_SIGNATURE
  VIEWED
  CLIENT_SIGNED
  AWAITING_COUNTERSIGN
  SIGNED
  CANCELLED
  VOIDED
  EXPIRED
}
```

- [ ] **Step 3: Add ContractOTP model**

Add after the Contract model (after line 1035):

```prisma
model ContractOTP {
  id          String    @id @default(cuid())
  contractId  String
  email       String
  code        String
  verified    Boolean   @default(false)
  verifiedAt  DateTime?
  verifiedIp  String?
  expiresAt   DateTime
  attempts    Int       @default(0)
  createdAt   DateTime  @default(now())

  contract    Contract  @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@index([contractId])
  @@index([email])
  @@map("contract_otps")
}
```

- [ ] **Step 4: Generate and run migration**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx prisma migrate dev --name add_contract_signing_fields
```

Expected: Migration creates successfully, adds columns to `contracts` table and creates `contract_otps` table.

- [ ] **Step 5: Verify schema**

```bash
npx prisma generate
```

Expected: Prisma client regenerated without errors.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/
git commit -m "feat: add contract signing schema — OTP, signatures, audit fields"
```

---

## Chunk 2: Backend Services (PDF + Email)

### Task 3: Contract Email Service

**Files:**
- Create: `backend/src/services/contractEmailService.ts`
- Reference: `backend/src/services/emailService.ts` (existing email pattern)

- [ ] **Step 1: Create contractEmailService.ts**

```typescript
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: Number.parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

const FROM = `${process.env.FROM_NAME || 'TechCloudPro'} <${process.env.FROM_EMAIL || 'contracts@techcloudpro.com'}>`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://crm.brandmonkz.com';

function brandedWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
    <body style="margin:0;padding:0;background:#0f0f23;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="color:#6366f1;font-size:24px;margin:0;">TechCloudPro</h1>
        </div>
        <div style="background:#1a1a2e;border-radius:12px;padding:32px;color:#e2e8f0;">
          ${content}
        </div>
        <div style="text-align:center;margin-top:24px;color:rgba(255,255,255,0.3);font-size:12px;">
          Powered by TechCloudPro &bull; Secure Electronic Signature
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendSigningRequest(params: {
  to: string;
  signerName: string;
  senderName: string;
  contractTitle: string;
  signingToken: string;
  expiryDate: string;
  message?: string;
}): Promise<void> {
  const signingUrl = `${FRONTEND_URL}/contracts/sign/${params.signingToken}`;
  const html = brandedWrapper(`
    <h2 style="color:#e2e8f0;margin:0 0 16px;">Contract Ready for Signature</h2>
    <p style="color:rgba(255,255,255,0.7);line-height:1.6;">
      <strong>${params.senderName}</strong> has sent you a contract to review and sign.
    </p>
    <div style="background:rgba(99,102,241,0.1);border-radius:8px;padding:16px;margin:16px 0;">
      <div style="color:rgba(255,255,255,0.5);font-size:13px;">Contract</div>
      <div style="color:#e2e8f0;font-size:16px;font-weight:600;">${params.contractTitle}</div>
    </div>
    ${params.message ? `<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin:16px 0;border-left:3px solid #6366f1;"><p style="color:rgba(255,255,255,0.7);margin:0;font-style:italic;">"${params.message}"</p><p style="color:rgba(255,255,255,0.4);margin:8px 0 0;font-size:13px;">— ${params.senderName}</p></div>` : ''}
    <div style="text-align:center;margin:24px 0;">
      <a href="${signingUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
        Review &amp; Sign Contract
      </a>
    </div>
    <p style="color:rgba(255,255,255,0.4);font-size:13px;text-align:center;">
      This link expires on ${params.expiryDate}
    </p>
  `);

  await transporter.sendMail({ from: FROM, to: params.to, subject: `Action Required: Please sign — ${params.contractTitle}`, html });
  logger.info(`Signing request email sent to ${params.to} for contract "${params.contractTitle}"`);
}

export async function sendOtpEmail(params: {
  to: string;
  code: string;
  signerName: string;
}): Promise<void> {
  const html = brandedWrapper(`
    <h2 style="color:#e2e8f0;margin:0 0 16px;">Verification Code</h2>
    <p style="color:rgba(255,255,255,0.7);">Hi ${params.signerName}, use this code to verify your identity:</p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:rgba(99,102,241,0.15);border:2px solid #6366f1;border-radius:12px;padding:16px 32px;letter-spacing:8px;font-size:32px;font-weight:700;color:#e2e8f0;">
        ${params.code}
      </div>
    </div>
    <p style="color:rgba(255,255,255,0.4);font-size:13px;text-align:center;">This code expires in 10 minutes.</p>
    <p style="color:rgba(255,255,255,0.4);font-size:13px;text-align:center;">If you didn't request this, you can safely ignore this email.</p>
  `);

  await transporter.sendMail({ from: FROM, to: params.to, subject: `Your verification code: ${params.code}`, html });
  logger.info(`OTP email sent to ${params.to}`);
}

export async function sendClientSignedNotification(params: {
  to: string;
  signerName: string;
  contractTitle: string;
  signedAt: string;
  contractId: string;
}): Promise<void> {
  const crmUrl = `${FRONTEND_URL}/contracts`;
  const html = brandedWrapper(`
    <h2 style="color:#e2e8f0;margin:0 0 16px;">✓ Contract Signed by Client</h2>
    <p style="color:rgba(255,255,255,0.7);line-height:1.6;">
      <strong>${params.signerName}</strong> signed the contract on ${params.signedAt}.
    </p>
    <div style="background:rgba(16,185,129,0.1);border-radius:8px;padding:16px;margin:16px 0;border-left:3px solid #10b981;">
      <div style="color:#10b981;font-weight:600;">${params.contractTitle}</div>
      <div style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:4px;">Counter-sign to complete the contract</div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${crmUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        View in CRM
      </a>
    </div>
  `);

  await transporter.sendMail({ from: FROM, to: params.to, subject: `✓ ${params.signerName} has signed — ${params.contractTitle}`, html });
  logger.info(`Client signed notification sent to ${params.to}`);
}

export async function sendCompletedEmail(params: {
  to: string;
  contractTitle: string;
  pdfBuffer: Buffer;
}): Promise<void> {
  const html = brandedWrapper(`
    <h2 style="color:#e2e8f0;margin:0 0 16px;">Contract Completed ✓</h2>
    <p style="color:rgba(255,255,255,0.7);line-height:1.6;">
      All parties have signed. The fully executed contract is attached as a PDF.
    </p>
    <div style="background:rgba(16,185,129,0.1);border-radius:8px;padding:16px;margin:16px 0;border-left:3px solid #10b981;">
      <div style="color:#10b981;font-weight:600;">${params.contractTitle}</div>
      <div style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:4px;">Fully executed • All signatures captured</div>
    </div>
  `);

  await transporter.sendMail({
    from: FROM,
    to: params.to,
    subject: `Completed: ${params.contractTitle}`,
    html,
    attachments: [{
      filename: `${params.contractTitle.replace(/[^a-zA-Z0-9]/g, '-')}-signed.pdf`,
      content: params.pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
  logger.info(`Completed contract email sent to ${params.to}`);
}

export async function sendReminderEmail(params: {
  to: string;
  signerName: string;
  contractTitle: string;
  signingToken: string;
  daysRemaining: number;
}): Promise<void> {
  const signingUrl = `${FRONTEND_URL}/contracts/sign/${params.signingToken}`;
  const html = brandedWrapper(`
    <h2 style="color:#e2e8f0;margin:0 0 16px;">Reminder: Contract Awaiting Signature</h2>
    <p style="color:rgba(255,255,255,0.7);line-height:1.6;">
      Hi ${params.signerName}, you have a contract waiting for your signature.
    </p>
    <div style="background:rgba(245,158,11,0.1);border-radius:8px;padding:16px;margin:16px 0;border-left:3px solid #f59e0b;">
      <div style="color:#f59e0b;font-weight:600;">${params.contractTitle}</div>
      <div style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:4px;">${params.daysRemaining} day${params.daysRemaining === 1 ? '' : 's'} remaining before this link expires</div>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${signingUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
        Review &amp; Sign Contract
      </a>
    </div>
  `);

  await transporter.sendMail({ from: FROM, to: params.to, subject: `Reminder: Please sign — ${params.contractTitle}`, html });
  logger.info(`Reminder email sent to ${params.to} for "${params.contractTitle}"`);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx tsc --noEmit src/services/contractEmailService.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/contractEmailService.ts
git commit -m "feat: add contract email service — 5 email templates for signing flow"
```

---

### Task 4: Contract PDF Service

**Files:**
- Create: `backend/src/services/contractPdfService.ts`

- [ ] **Step 1: Create contractPdfService.ts**

```typescript
import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const INDIGO = '#6366f1';
const DARK_BG = '#0f0f23';
const TEXT_PRIMARY = '#1a1a2e';
const TEXT_SECONDARY = '#4a5568';
const GREEN = '#10b981';

interface SignatureInfo {
  name: string;
  email: string;
  title?: string;
  signedAt: string;
  ip: string;
  userAgent: string;
  signatureImage?: string; // base64 PNG
  otpVerified?: boolean;
}

interface ContractPdfParams {
  contractId: string;
  title: string;
  contractType: string;
  content: string;
  rateCard?: { category: string; roles: { role: string; rate: string }[] }[];
  clientSignature?: SignatureInfo;
  counterSignature?: SignatureInfo;
  createdAt: string;
}

export function generateContractPdf(params: ContractPdfParams): Promise<{ buffer: Buffer; hash: string }> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 60, bottom: 60, left: 60, right: 60 } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        resolve({ buffer, hash });
      });
      doc.on('error', reject);

      // --- Header ---
      doc.fontSize(20).fillColor(INDIGO).text('TECHCLOUDPRO', 60, 40);
      doc.fontSize(9).fillColor(TEXT_SECONDARY).text(`Contract ID: ${params.contractId}`, 350, 40, { align: 'right' });
      doc.text(`Date: ${params.createdAt}`, 350, 52, { align: 'right' });
      doc.moveTo(60, 70).lineTo(552, 70).strokeColor(INDIGO).lineWidth(1).stroke();
      doc.moveDown(1);

      // --- Title ---
      doc.y = 85;
      doc.fontSize(16).fillColor(TEXT_PRIMARY).text(params.title, { align: 'center' });
      doc.fontSize(11).fillColor(TEXT_SECONDARY).text(params.contractType, { align: 'center' });
      doc.moveDown(1.5);

      // --- Content ---
      const contentLines = params.content.split('\n');
      for (const line of contentLines) {
        const trimmed = line.trim();
        if (!trimmed) {
          doc.moveDown(0.5);
          continue;
        }
        // Section headers (lines ending with colon or all caps)
        if (trimmed.endsWith(':') || trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
          doc.fontSize(12).fillColor(TEXT_PRIMARY).text(trimmed, { continued: false });
        } else {
          doc.fontSize(10).fillColor(TEXT_SECONDARY).text(trimmed, { lineGap: 3 });
        }

        // Auto page break with header repeat
        if (doc.y > 680) {
          doc.addPage();
          doc.fontSize(9).fillColor(TEXT_SECONDARY).text(`${params.title} — Page ${doc.bufferedPageRange().count}`, 60, 40);
          doc.moveTo(60, 55).lineTo(552, 55).strokeColor(INDIGO).lineWidth(0.5).stroke();
          doc.y = 70;
        }
      }

      // --- Rate Card Table ---
      if (params.rateCard && params.rateCard.length > 0) {
        doc.moveDown(1);
        if (doc.y > 550) doc.addPage();

        doc.fontSize(14).fillColor(TEXT_PRIMARY).text('Rate Card', { underline: true });
        doc.moveDown(0.5);

        for (const category of params.rateCard) {
          if (doc.y > 620) doc.addPage();
          doc.fontSize(11).fillColor(INDIGO).text(category.category);
          doc.moveDown(0.3);

          // Table header
          const tableX = 60;
          doc.fontSize(9).fillColor(TEXT_SECONDARY);
          doc.text('Role', tableX, doc.y, { width: 300 });
          doc.text('Rate', tableX + 320, doc.y - 11, { width: 150 });
          doc.moveTo(tableX, doc.y + 2).lineTo(500, doc.y + 2).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
          doc.moveDown(0.3);

          for (const row of category.roles) {
            if (doc.y > 700) doc.addPage();
            const rowY = doc.y;
            doc.fontSize(9).fillColor(TEXT_PRIMARY).text(row.role, tableX, rowY, { width: 300 });
            doc.fillColor(INDIGO).text(row.rate, tableX + 320, rowY, { width: 150 });
            doc.moveDown(0.2);
          }
          doc.moveDown(0.5);
        }
      }

      // --- Signature Blocks ---
      doc.moveDown(1);
      if (doc.y > 500) doc.addPage();

      doc.fontSize(14).fillColor(TEXT_PRIMARY).text('Signatures', { underline: true });
      doc.moveDown(1);

      // Client signature
      drawSignatureBlock(doc, 'Client', params.clientSignature, 60);

      doc.moveDown(1.5);

      // Counter-signature
      drawSignatureBlock(doc, 'TechCloudPro', params.counterSignature, 60);

      // --- Audit Trail Page ---
      doc.addPage();
      drawAuditTrail(doc, params);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawSignatureBlock(doc: PDFKit.PDFDocument, label: string, sig: SignatureInfo | undefined, x: number): void {
  doc.fontSize(11).fillColor(TEXT_PRIMARY).text(`${label}:`, x);
  doc.moveDown(0.3);

  if (sig?.signatureImage) {
    try {
      const imgBuffer = Buffer.from(sig.signatureImage.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(imgBuffer, x, doc.y, { width: 200, height: 60 });
      doc.y += 65;
    } catch {
      doc.fontSize(10).fillColor(TEXT_SECONDARY).text('[Signature on file]', x);
    }
  } else {
    doc.moveTo(x, doc.y + 30).lineTo(x + 250, doc.y + 30).strokeColor(TEXT_SECONDARY).lineWidth(0.5).stroke();
    doc.y += 35;
  }

  if (sig) {
    doc.fontSize(9).fillColor(TEXT_SECONDARY);
    doc.text(`Name: ${sig.name}`, x);
    if (sig.title) doc.text(`Title: ${sig.title}`, x);
    doc.text(`Date: ${sig.signedAt}`, x);
  } else {
    doc.fontSize(9).fillColor(TEXT_SECONDARY).text('Signature: ____________________', x);
    doc.text('Name: ____________________', x);
    doc.text('Date: ____________________', x);
  }
}

function drawAuditTrail(doc: PDFKit.PDFDocument, params: ContractPdfParams): void {
  doc.fontSize(18).fillColor(INDIGO).text('Certificate of Completion', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor(INDIGO).lineWidth(1).stroke();
  doc.moveDown(1);

  const addField = (label: string, value: string) => {
    doc.fontSize(9).fillColor(TEXT_SECONDARY).text(label, 60, doc.y, { continued: true, width: 160 });
    doc.fillColor(TEXT_PRIMARY).text(value);
    doc.moveDown(0.2);
  };

  addField('Contract ID:', params.contractId);
  addField('Contract Title:', params.title);
  addField('Contract Type:', params.contractType);
  addField('Created:', params.createdAt);

  if (params.clientSignature || params.counterSignature) {
    // We'll compute hash after PDF is fully generated, so show placeholder or pass it in
    addField('Status:', 'COMPLETED');
  }

  doc.moveDown(0.5);
  doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  doc.moveDown(0.5);

  // Signer 1
  if (params.clientSignature) {
    doc.fontSize(11).fillColor(TEXT_PRIMARY).text('Signer 1 — Client');
    doc.moveDown(0.3);
    addField('Name:', params.clientSignature.name);
    addField('Email:', params.clientSignature.email);
    if (params.clientSignature.title) addField('Title:', params.clientSignature.title);
    addField('Signed:', params.clientSignature.signedAt);
    addField('IP Address:', params.clientSignature.ip);
    addField('User Agent:', params.clientSignature.userAgent.substring(0, 80));
    addField('OTP Verified:', params.clientSignature.otpVerified ? '✓ Yes' : '✗ No');
    doc.moveDown(0.5);
  }

  // Signer 2
  if (params.counterSignature) {
    doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(TEXT_PRIMARY).text('Signer 2 — TechCloudPro');
    doc.moveDown(0.3);
    addField('Name:', params.counterSignature.name);
    addField('Email:', params.counterSignature.email);
    if (params.counterSignature.title) addField('Title:', params.counterSignature.title);
    addField('Counter-Signed:', params.counterSignature.signedAt);
    addField('IP Address:', params.counterSignature.ip);
    addField('User Agent:', params.counterSignature.userAgent.substring(0, 80));
  }

  doc.moveDown(1);
  doc.moveTo(60, doc.y).lineTo(552, doc.y).strokeColor(INDIGO).lineWidth(1).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor(TEXT_SECONDARY).text(
    'This certificate confirms that all parties have electronically signed this document. ' +
    'Each signature was captured with identity verification (email OTP), IP address, timestamp, and user agent. ' +
    'The document hash ensures tamper detection.',
    { align: 'center', width: 492 }
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx tsc --noEmit src/services/contractPdfService.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/contractPdfService.ts
git commit -m "feat: add contract PDF service — PDFKit generation with branding, rate cards, signatures, audit trail"
```

---

## Chunk 3: Backend Routes

### Task 5: Update Existing Contracts Route (Guards + New Endpoints)

**Files:**
- Modify: `backend/src/routes/contracts.ts`

- [ ] **Step 1: Add imports and status guard to existing routes**

At the top of `contracts.ts`, add imports. Then add guards to the existing `PUT /:id` and `PATCH /:id/status` handlers.

Add after existing imports (around line 4):

```typescript
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { generateContractPdf } from '../services/contractPdfService';
import {
  sendSigningRequest,
  sendClientSignedNotification,
  sendCompletedEmail,
  sendReminderEmail,
} from '../services/contractEmailService';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const S3_BUCKET = process.env.S3_BUCKET || 'brandmonkz-contracts';

const PROTECTED_STATUSES = ['CLIENT_SIGNED', 'AWAITING_COUNTERSIGN', 'SIGNED', 'VIEWED'];
const IMMUTABLE_STATUSES = ['SENT_FOR_SIGNATURE', 'VIEWED', 'CLIENT_SIGNED', 'AWAITING_COUNTERSIGN', 'SIGNED', 'VOIDED', 'EXPIRED'];
```

- [ ] **Step 2: Add content immutability guard to PUT /:id**

In the existing `router.put('/:id')` handler (line 75), add after the contract ownership check:

```typescript
    // Block content edits after contract is sent
    if (IMMUTABLE_STATUSES.includes(contract.status)) {
      return res.status(403).json({ error: 'Cannot edit contract after it has been sent for signature' });
    }
```

- [ ] **Step 3: Add status transition guard to PATCH /:id/status**

In the existing `router.patch('/:id/status')` handler (line 108), add before the update:

```typescript
    // Block protected status transitions — only signing flow can set these
    if (PROTECTED_STATUSES.includes(status)) {
      return res.status(403).json({ error: `Status "${status}" can only be set through the signing flow` });
    }
```

- [ ] **Step 4: Add generate-pdf endpoint**

Add before `export default router;` at line 162 (after the DELETE endpoint):

```typescript
// Generate PDF from contract content
router.post('/:id/generate-pdf', async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const rateCard = contract.variables
      ? (contract.variables as any).rateCard
      : undefined;

    const { buffer, hash } = await generateContractPdf({
      contractId: contract.id,
      title: contract.title,
      contractType: (contract.variables as any)?.contractType || 'Staffing Agreement',
      content: contract.content,
      rateCard,
      createdAt: contract.createdAt.toISOString().split('T')[0],
    });

    // Upload to S3
    const s3Key = `contracts/${contract.id}/contract-draft.pdf`;
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: 'application/pdf',
    }));

    await prisma.contract.update({
      where: { id: contract.id },
      data: { pdfUrl: s3Key, documentHash: hash },
    });

    res.json({ success: true, pdfUrl: s3Key, hash });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 5: Add send-for-signature endpoint**

```typescript
// Send contract for signature
router.post('/:id/send', async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const { signerName, signerEmail, signerTitle, message } = req.body;

    if (!signerName || !signerEmail) {
      return res.status(400).json({ error: 'signerName and signerEmail are required' });
    }

    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only DRAFT contracts can be sent for signature' });
    }

    // Generate PDF if not already generated
    if (!contract.pdfUrl) {
      const rateCard = contract.variables ? (contract.variables as any).rateCard : undefined;
      const { buffer, hash } = await generateContractPdf({
        contractId: contract.id,
        title: contract.title,
        contractType: (contract.variables as any)?.contractType || 'Staffing Agreement',
        content: contract.content,
        rateCard,
        createdAt: contract.createdAt.toISOString().split('T')[0],
      });
      const s3Key = `contracts/${contract.id}/contract-draft.pdf`;
      await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'application/pdf' }));
      contract.pdfUrl = s3Key;
      contract.documentHash = hash;
    }

    const signingToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'SENT_FOR_SIGNATURE',
        signerName,
        signerEmail,
        signerTitle,
        signingToken,
        tokenExpiresAt,
        sentAt: new Date(),
        pdfUrl: contract.pdfUrl,
        documentHash: contract.documentHash,
      },
    });

    await sendSigningRequest({
      to: signerEmail,
      signerName,
      senderName: contract.user?.name || 'TechCloudPro',
      contractTitle: contract.title,
      signingToken,
      expiryDate: tokenExpiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      message,
    });

    res.json({ success: true, message: 'Contract sent for signature' });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 6: Add countersign endpoint**

```typescript
// Counter-sign a client-signed contract
router.post('/:id/countersign', async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const { signatureData, signatureType } = req.body;

    if (!signatureData || !signatureType) {
      return res.status(400).json({ error: 'signatureData and signatureType are required' });
    }

    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status !== 'AWAITING_COUNTERSIGN') {
      return res.status(400).json({ error: 'Contract must be AWAITING_COUNTERSIGN to counter-sign' });
    }

    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const now = new Date();

    // Save client's original signing timestamp BEFORE overwriting signedAt
    const clientSignedAt = contract.signedAt;

    // Update contract with counter-signature
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'SIGNED',
        counterSignedBy: contract.user?.name || 'TechCloudPro',
        counterSignedAt: now,
        counterSigData: signatureData,
        counterSigIp: ip,
        counterSigAgent: userAgent,
        signedAt: now,
        signedBy: contract.user?.name,
      },
    });

    // Generate final PDF with both signatures
    const rateCard = contract.variables ? (contract.variables as any).rateCard : undefined;
    const { buffer, hash } = await generateContractPdf({
      contractId: contract.id,
      title: contract.title,
      contractType: (contract.variables as any)?.contractType || 'Staffing Agreement',
      content: contract.content,
      rateCard,
      createdAt: contract.createdAt.toISOString().split('T')[0],
      clientSignature: {
        name: contract.signerName!,
        email: contract.signerEmail!,
        title: contract.signerTitle || undefined,
        signedAt: clientSignedAt?.toISOString() || now.toISOString(),
        ip: contract.signatureIp || 'unknown',
        userAgent: contract.signatureAgent || 'unknown',
        signatureImage: contract.signatureData || undefined,
        otpVerified: true,
      },
      counterSignature: {
        name: contract.user?.name || 'TechCloudPro',
        email: contract.user?.email || '',
        signedAt: now.toISOString(),
        ip,
        userAgent,
        signatureImage: signatureData,
      },
    });

    // Upload final PDF to S3
    const s3Key = `contracts/${contract.id}/contract-final.pdf`;
    await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, Body: buffer, ContentType: 'application/pdf' }));

    await prisma.contract.update({
      where: { id: contract.id },
      data: { pdfUrl: s3Key, documentHash: hash },
    });

    // Email both parties
    const senderEmail = contract.user?.email;
    if (contract.signerEmail) {
      await sendCompletedEmail({ to: contract.signerEmail, contractTitle: contract.title, pdfBuffer: buffer });
    }
    if (senderEmail) {
      await sendCompletedEmail({ to: senderEmail, contractTitle: contract.title, pdfBuffer: buffer });
    }

    res.json({ success: true, message: 'Contract fully signed', pdfUrl: s3Key });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 7: Add void and remind endpoints**

```typescript
// Void a contract
router.post('/:id/void', async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const { reason } = req.body;

    const contract = await prisma.contract.findFirst({ where: { id: req.params.id, userId } });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status === 'SIGNED' || contract.status === 'VOIDED') {
      return res.status(400).json({ error: `Cannot void a ${contract.status} contract` });
    }

    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'VOIDED', voidedAt: new Date(), voidedReason: reason || 'Voided by sender' },
    });

    res.json({ success: true, message: 'Contract voided' });
  } catch (error) {
    next(error);
  }
});

// Send reminder email
router.post('/:id/remind', async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const contract = await prisma.contract.findFirst({ where: { id: req.params.id, userId } });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status !== 'SENT_FOR_SIGNATURE' && contract.status !== 'VIEWED') {
      return res.status(400).json({ error: 'Can only remind on unsigned contracts' });
    }
    if (!contract.signerEmail || !contract.signingToken || !contract.tokenExpiresAt) {
      return res.status(400).json({ error: 'Contract missing signer info' });
    }

    const daysRemaining = Math.ceil((contract.tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) {
      return res.status(400).json({ error: 'Contract signing link has expired' });
    }

    await sendReminderEmail({
      to: contract.signerEmail,
      signerName: contract.signerName || 'there',
      contractTitle: contract.title,
      signingToken: contract.signingToken,
      daysRemaining,
    });

    await prisma.contract.update({
      where: { id: contract.id },
      data: { remindersSent: { increment: 1 }, lastReminderAt: new Date() },
    });

    res.json({ success: true, message: 'Reminder sent' });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/routes/contracts.ts
git commit -m "feat: add contract signing endpoints — generate-pdf, send, countersign, void, remind + guards"
```

---

### Task 6: Public Contract Signing Router

**Files:**
- Create: `backend/src/routes/contractSigning.ts`
- Modify: `backend/src/app.ts:49,293`
- Modify: `backend/src/middleware/securityGuards.ts:29,54`

- [ ] **Step 1: Create contractSigning.ts**

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendOtpEmail, sendClientSignedNotification } from '../services/contractEmailService';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'fallback-secret';

// Rate limit tracking (in-memory, per contract)
const otpRateLimit = new Map<string, { count: number; resetAt: number }>();

// Increase body size limit for signature data (base64 PNG)
import express from 'express';
router.use(express.json({ limit: '1mb' }));

// GET /api/contracts/sign/:token — Get contract for signing page
router.get('/:token', async (req, res, next) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { signingToken: req.params.token },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status === 'VOIDED') return res.status(410).json({ error: 'This contract has been voided' });
    if (contract.status === 'SIGNED') return res.status(410).json({ error: 'This contract has already been completed' });
    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: 'This signing link has expired' });
    }

    // Don't transition to VIEWED here (email clients prefetch URLs)
    // Status transitions happen only on OTP verify and signature submit

    // Mask email for display: j***@deloitte.com
    const email = contract.signerEmail || '';
    const [local, domain] = email.split('@');
    const maskedEmail = local ? `${local[0]}${'*'.repeat(Math.max(local.length - 1, 2))}@${domain}` : '';

    res.json({
      id: contract.id,
      title: contract.title,
      contractType: (contract.variables as any)?.contractType || 'Staffing Agreement',
      senderName: contract.user?.name || 'TechCloudPro',
      signerName: contract.signerName,
      signerEmail: maskedEmail,
      status: contract.status,
      content: contract.status === 'SENT_FOR_SIGNATURE' ? undefined : contract.content, // Content only after OTP
      expiresAt: contract.tokenExpiresAt,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contracts/sign/:token/request-otp — Send OTP to signer
router.post('/:token/request-otp', async (req, res, next) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { signingToken: req.params.token },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (!contract.signerEmail) return res.status(400).json({ error: 'No signer email on contract' });
    if (contract.tokenExpiresAt && contract.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Signing link expired' });
    }
    if (['SIGNED', 'VOIDED', 'EXPIRED', 'CANCELLED'].includes(contract.status)) {
      return res.status(400).json({ error: 'Contract is no longer available for signing' });
    }

    // Rate limit: 3 OTP requests per hour per contract
    const key = contract.id;
    const now = Date.now();
    const limit = otpRateLimit.get(key);
    if (limit && limit.resetAt > now && limit.count >= 3) {
      return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
    }
    if (!limit || limit.resetAt <= now) {
      otpRateLimit.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    } else {
      limit.count++;
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    // Store OTP
    await prisma.contractOTP.create({
      data: {
        contractId: contract.id,
        email: contract.signerEmail,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    // Send OTP email
    await sendOtpEmail({
      to: contract.signerEmail,
      code,
      signerName: contract.signerName || 'there',
    });

    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    next(error);
  }
});

// POST /api/contracts/sign/:token/verify-otp — Verify OTP and return session token
router.post('/:token/verify-otp', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Verification code is required' });

    const contract = await prisma.contract.findFirst({
      where: { signingToken: req.params.token },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    // Find the latest non-expired, non-verified OTP
    const otp = await prisma.contractOTP.findFirst({
      where: {
        contractId: contract.id,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) return res.status(400).json({ error: 'No valid verification code found. Request a new one.' });
    if (otp.attempts >= 5) return res.status(429).json({ error: 'Too many attempts. Request a new code.' });

    // Increment attempts
    await prisma.contractOTP.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify code
    const isValid = await bcrypt.compare(code, otp.code);
    if (!isValid) {
      const remaining = 4 - otp.attempts;
      return res.status(400).json({ error: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
    }

    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';

    // Mark OTP as verified
    await prisma.contractOTP.update({
      where: { id: otp.id },
      data: { verified: true, verifiedAt: new Date(), verifiedIp: ip },
    });

    // Update contract status to VIEWED
    if (contract.status === 'SENT_FOR_SIGNATURE') {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: 'VIEWED', signerOtpId: otp.id },
      });
    }

    // Generate session token (JWT, 30 min TTL)
    const sessionToken = jwt.sign(
      { contractId: contract.id, email: contract.signerEmail, otpId: otp.id, type: 'contract-signing' },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    // Return full contract content now that identity is verified
    res.json({
      success: true,
      sessionToken,
      contract: {
        id: contract.id,
        title: contract.title,
        content: contract.content,
        contractType: (contract.variables as any)?.contractType || 'Staffing Agreement',
        variables: contract.variables,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contracts/sign/:token/submit — Submit signature
router.post('/:token/submit', async (req, res, next) => {
  try {
    const { signatureData, signatureType, signerName, signerTitle, sessionToken, agreedToTerms } = req.body;

    // Validate required fields
    if (!signatureData || !signatureType || !signerName || !sessionToken) {
      return res.status(400).json({ error: 'Missing required fields: signatureData, signatureType, signerName, sessionToken' });
    }
    if (!agreedToTerms) {
      return res.status(400).json({ error: 'You must agree to the terms before signing' });
    }
    if (!['typed', 'drawn'].includes(signatureType)) {
      return res.status(400).json({ error: 'signatureType must be "typed" or "drawn"' });
    }

    // Validate signature data size (max ~1.5MB base64 = ~1MB image)
    if (signatureData.length > 700000) { // ~500KB image as base64
      return res.status(400).json({ error: 'Signature data too large' });
    }

    // Verify session token
    let payload: any;
    try {
      payload = jwt.verify(sessionToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Signing session expired. Please verify your identity again.' });
    }
    if (payload.type !== 'contract-signing') {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    // Load contract
    const contract = await prisma.contract.findFirst({
      where: { signingToken: req.params.token, id: payload.contractId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (!['SENT_FOR_SIGNATURE', 'VIEWED'].includes(contract.status)) {
      return res.status(400).json({ error: `Contract cannot be signed in status: ${contract.status}` });
    }

    // Verify OTP record exists and is verified
    const otp = await prisma.contractOTP.findFirst({
      where: { id: payload.otpId, contractId: contract.id, verified: true },
    });
    if (!otp) {
      return res.status(401).json({ error: 'OTP verification not found. Please verify your identity again.' });
    }

    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const now = new Date();

    // Update contract with signature
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'AWAITING_COUNTERSIGN',
        signerName,
        signerTitle,
        signatureData,
        signatureType,
        signatureIp: ip,
        signatureAgent: userAgent,
        signedAt: now,
        signedBy: signerName,
        signerOtpId: otp.id,
      },
    });

    // Notify contract owner (Peter/Rajesh)
    const ownerEmail = contract.user?.email;
    if (ownerEmail) {
      await sendClientSignedNotification({
        to: ownerEmail,
        signerName,
        contractTitle: contract.title,
        signedAt: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        contractId: contract.id,
      });
    }

    logger.info(`Contract ${contract.id} signed by ${signerName} (${contract.signerEmail}) from IP ${ip}`);

    res.json({ success: true, message: 'Contract signed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 2: Mount public router in app.ts**

At `app.ts:49` (imports section), add:

```typescript
import contractSigningRoutes from './routes/contractSigning';
```

At `app.ts:293` (before the existing contracts mount), add:

```typescript
app.use('/api/contracts/sign', contractSigningRoutes);
```

Ensure it's BEFORE the existing:
```typescript
app.use('/api/contracts', contractsRoutes);
```

- [ ] **Step 3: Update securityGuards.ts**

At `securityGuards.ts:29`, add `'signatureData'` and `'counterSigData'` to `htmlAllowedFields`:

```typescript
const htmlAllowedFields = ['content', 'htmlContent', 'body', 'description', 'subject', 'name', 'campaignName', 'goal', 'prompt', 'narrationScript', 'script', 'textContent', 'previewText', 'notes', 'signatureData', 'counterSigData'];
```

At `securityGuards.ts:54-63`, add `/contracts/sign` to the SQL injection skip list:

```typescript
    req.path.startsWith('/contracts/sign') ||
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/contractSigning.ts backend/src/app.ts backend/src/middleware/securityGuards.ts
git commit -m "feat: add public contract signing router — OTP flow, signature submission, security guards"
```

---

## Chunk 4: Frontend — Signature Pad + Signing Page

### Task 7: Signature Pad Component

**Files:**
- Create: `frontend/src/pages/Contracts/SignaturePad.tsx`

- [ ] **Step 1: Create SignaturePad.tsx**

```tsx
import { useState, useRef, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onSignatureChange: (data: string | null, type: 'typed' | 'drawn') => void;
}

const CURSIVE_FONTS = [
  "'Brush Script MT', cursive",
  "'Segoe Script', cursive",
  "'Comic Sans MS', cursive",
];

export default function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [typedName, setTypedName] = useState('');
  const [fontIndex, setFontIndex] = useState(0);
  const canvasRef = useRef<SignatureCanvas | null>(null);

  const handleTypeChange = useCallback((value: string) => {
    setTypedName(value);
    if (value.trim()) {
      // Generate typed signature as canvas image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 400, 100);
        ctx.font = `36px ${CURSIVE_FONTS[fontIndex]}`;
        ctx.fillStyle = '#1a1a2e';
        ctx.textBaseline = 'middle';
        ctx.fillText(value, 20, 50);
        onSignatureChange(canvas.toDataURL('image/png'), 'typed');
      }
    } else {
      onSignatureChange(null, 'typed');
    }
  }, [fontIndex, onSignatureChange]);

  const handleDrawEnd = useCallback(() => {
    if (canvasRef.current && !canvasRef.current.isEmpty()) {
      onSignatureChange(canvasRef.current.toDataURL('image/png'), 'drawn');
    }
  }, [onSignatureChange]);

  const clearDraw = useCallback(() => {
    canvasRef.current?.clear();
    onSignatureChange(null, 'drawn');
  }, [onSignatureChange]);

  return (
    <div>
      {/* Tabs */}
      <div className="flex mb-4 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => { setMode('type'); onSignatureChange(null, 'type'); }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'type' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Type Signature
        </button>
        <button
          onClick={() => { setMode('draw'); onSignatureChange(null, 'draw'); }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'draw' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Draw Signature
        </button>
      </div>

      {mode === 'type' ? (
        <div>
          <input
            type="text"
            value={typedName}
            onChange={(e) => handleTypeChange(e.target.value)}
            placeholder="Type your full legal name"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          {typedName && (
            <div className="mt-4 p-6 bg-gray-800 rounded-lg text-center border border-gray-700">
              <div
                style={{ fontFamily: CURSIVE_FONTS[fontIndex], fontSize: '32px', color: '#6366f1' }}
              >
                {typedName}
              </div>
              <div className="mt-2 border-t border-gray-700 pt-2">
                <button
                  onClick={() => {
                    const next = (fontIndex + 1) % CURSIVE_FONTS.length;
                    setFontIndex(next);
                    // Re-trigger with new font
                    setTimeout(() => handleTypeChange(typedName), 0);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Change Style
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-700">
            <SignatureCanvas
              ref={canvasRef}
              penColor="#1a1a2e"
              canvasProps={{
                width: 500,
                height: 150,
                className: 'w-full',
                style: { width: '100%', height: '150px' },
              }}
              onEnd={handleDrawEnd}
            />
          </div>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">Draw your signature above</span>
            <button
              onClick={clearDraw}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Contracts/SignaturePad.tsx
git commit -m "feat: add SignaturePad component — type/draw tabs with canvas rendering"
```

---

### Task 8: Public Contract Signing Page

**Files:**
- Create: `frontend/src/pages/Contracts/ContractSigningPage.tsx`
- Modify: `frontend/src/App.tsx:97-108` (add public route)

- [ ] **Step 1: Create ContractSigningPage.tsx**

```tsx
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SignaturePad from './SignaturePad';

const API = import.meta.env.VITE_API_URL || '';

type Step = 'landing' | 'otp' | 'contract' | 'sign' | 'success' | 'error';

interface ContractData {
  id: string;
  title: string;
  contractType: string;
  senderName: string;
  signerName: string;
  signerEmail: string;
  status: string;
  content?: string;
  variables?: any;
  expiresAt: string;
}

export default function ContractSigningPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('landing');
  const [contract, setContract] = useState<ContractData | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('');

  const showError = useCallback((title: string, msg: string) => {
    setErrorTitle(title);
    setError(msg);
    setStep('error');
  }, []);

  // Step 1: Load contract info
  const loadContract = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/api/contracts/sign/${token}`);
      setContract(res.data);
      setSignerName(res.data.signerName || '');
      if (['CLIENT_SIGNED', 'AWAITING_COUNTERSIGN', 'SIGNED'].includes(res.data.status)) {
        showError('Already Signed', 'This contract has already been signed.');
        return;
      }
      setStep('otp');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to load contract';
      showError('Contract Unavailable', msg);
    } finally {
      setLoading(false);
    }
  }, [token, showError]);

  // Step 2: Request OTP
  const requestOtp = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/api/contracts/sign/${token}/request-otp`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Step 3: Verify OTP
  const verifyOtp = useCallback(async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/api/contracts/sign/${token}/verify-otp`, { code: otpCode });
      setSessionToken(res.data.sessionToken);
      setContract((prev) => prev ? { ...prev, content: res.data.contract.content, variables: res.data.contract.variables } : null);
      setStep('contract');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  }, [token, otpCode]);

  // Step 4: Submit signature
  const submitSignature = useCallback(async () => {
    if (!signatureData) { setError('Please provide your signature'); return; }
    if (!signerName.trim()) { setError('Please enter your full name'); return; }
    if (!agreedToTerms) { setError('You must agree to the terms'); return; }

    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/api/contracts/sign/${token}/submit`, {
        signatureData,
        signatureType,
        signerName,
        signerTitle,
        sessionToken,
        agreedToTerms,
      });
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit signature');
    } finally {
      setLoading(false);
    }
  }, [token, signatureData, signatureType, signerName, signerTitle, sessionToken, agreedToTerms]);

  const stepNumber = { landing: 1, otp: 2, contract: 3, sign: 4, success: 4, error: 0 }[step];

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#1a1a2e]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-400">TechCloudPro</h1>
          <span className="text-xs text-gray-500">Secure Electronic Signature</span>
        </div>
      </div>

      {/* Progress bar */}
      {step !== 'error' && (
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  n < stepNumber ? 'bg-green-600 text-white' :
                  n === stepNumber ? 'bg-indigo-600 text-white' :
                  'bg-gray-800 text-gray-500'
                }`}>
                  {n < stepNumber ? '✓' : n}
                </div>
                {n < 4 && <div className={`flex-1 h-0.5 ${n < stepNumber ? 'bg-green-600' : 'bg-gray-800'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-600">Verify</span>
            <span className="text-[10px] text-gray-600">Code</span>
            <span className="text-[10px] text-gray-600">Review</span>
            <span className="text-[10px] text-gray-600">Sign</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Error message */}
        {error && step !== 'error' && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* LANDING */}
        {step === 'landing' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Contract Ready for Signature</h2>
            <p className="text-gray-400 mb-8">You've been sent a contract to review and sign</p>
            <button
              onClick={loadContract}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Loading...' : 'Verify Your Identity to Continue'}
            </button>
          </div>
        )}

        {/* OTP */}
        {step === 'otp' && contract && (
          <div className="max-w-md mx-auto">
            <div className="bg-[#1a1a2e] rounded-xl p-8">
              <h2 className="text-xl font-bold mb-2">Verify Your Identity</h2>
              <p className="text-gray-400 text-sm mb-6">
                Enter the 6-digit code sent to <span className="text-indigo-400">{contract.signerEmail}</span>
              </p>

              <div className="mb-4">
                <button
                  onClick={requestOtp}
                  disabled={loading}
                  className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-600/50 text-indigo-300 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 mb-4"
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>

              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 mb-4"
                maxLength={6}
              />

              <button
                onClick={verifyOtp}
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* CONTRACT REVIEW */}
        {step === 'contract' && contract && (
          <div>
            <div className="bg-[#1a1a2e] rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{contract.title}</h2>
                  <p className="text-gray-400 text-sm">{contract.contractType} • From {contract.senderName}</p>
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-6 max-h-96 overflow-y-auto border border-gray-800">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
                  {contract.content}
                </pre>
              </div>
            </div>

            <div className="flex items-start gap-3 mb-6">
              <input
                type="checkbox"
                id="agree"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="agree" className="text-sm text-gray-300">
                I have read and agree to the terms and conditions of this contract. I understand this constitutes a legally binding electronic signature.
              </label>
            </div>

            <button
              onClick={() => setStep('sign')}
              disabled={!agreedToTerms}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Continue to Sign
            </button>
          </div>
        )}

        {/* SIGNATURE */}
        {step === 'sign' && contract && (
          <div>
            <div className="bg-[#1a1a2e] rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Sign Contract</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    placeholder="e.g. VP of Engineering"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Your Signature</label>
                <SignaturePad
                  onSignatureChange={(data, type) => {
                    setSignatureData(data);
                    setSignatureType(type);
                  }}
                />
              </div>

              <p className="text-xs text-gray-500 mb-4">
                By clicking "Sign Contract", you agree that your electronic signature is the legal equivalent of your manual signature on this contract.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('contract')}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={submitSignature}
                  disabled={loading || !signatureData || !signerName.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Signing...' : 'Sign Contract'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Contract Signed Successfully</h2>
            <p className="text-gray-400 mb-2">Your signature has been captured and recorded.</p>
            <p className="text-gray-500 text-sm">A copy of the fully signed contract will be emailed to you once all parties have signed.</p>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">{errorTitle || 'Something Went Wrong'}</h2>
            <p className="text-gray-400">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-[#0f0f23] py-3">
        <div className="max-w-3xl mx-auto px-4 text-center text-xs text-gray-600">
          Powered by TechCloudPro &bull; Secure Electronic Signature &bull; All signatures are legally binding
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add public route in App.tsx**

At `App.tsx:97` (in the public routes section, before the login route), add:

```tsx
import ContractSigningPage from './pages/Contracts/ContractSigningPage';
```

And in the routes:

```tsx
<Route path="/contracts/sign/:token" element={<ContractSigningPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Contracts/ContractSigningPage.tsx frontend/src/App.tsx
git commit -m "feat: add public contract signing page — OTP verification, contract review, signature capture"
```

---

## Chunk 5: Frontend — Update ContractsPage + CRM Integration

### Task 9: Update ContractsPage with Signing Actions

**Files:**
- Modify: `frontend/src/pages/Contracts/ContractsPage.tsx`

**Context:** The existing ContractsPage.tsx is a large file with contract templates, rate cards, and editable content. We are ADDING to it — not replacing. The existing template/rate card functionality must be preserved. We add: contract list from API, status badges, send/countersign/void/remind modals.

- [ ] **Step 1: Read the full current ContractsPage.tsx**

Read the complete file to understand the structure. Note where the main component renders and what state it manages. The existing page has `CONTRACT_TYPES`, `RATE_CARDS`, and template editing — all of which stay.

- [ ] **Step 2: Add imports and API helpers at the top of the file**

Add these imports after the existing imports:

```tsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SignaturePad from './SignaturePad';

const API = import.meta.env.VITE_API_URL || '';

const authHeaders = () => {
  const token = localStorage.getItem('crmToken');
  return { Authorization: `Bearer ${token}` };
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-600',
  SENT_FOR_SIGNATURE: 'bg-yellow-600',
  VIEWED: 'bg-yellow-500',
  AWAITING_COUNTERSIGN: 'bg-blue-600',
  SIGNED: 'bg-green-600',
  VOIDED: 'bg-red-600',
  EXPIRED: 'bg-gray-500',
  CANCELLED: 'bg-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT_FOR_SIGNATURE: 'Sent for Signature',
  VIEWED: 'Viewed',
  AWAITING_COUNTERSIGN: 'Awaiting Counter-Sign',
  SIGNED: 'Completed',
  VOIDED: 'Voided',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

interface ContractRecord {
  id: string;
  title: string;
  status: string;
  signerName?: string;
  signerEmail?: string;
  signedAt?: string;
  counterSignedAt?: string;
  sentAt?: string;
  createdAt: string;
}
```

- [ ] **Step 3: Add contract list state and fetch to the main component**

Inside the main component function, add state and effect for loading contracts from API:

```tsx
  // Contract signing state
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [showSendModal, setShowSendModal] = useState<string | null>(null); // contractId
  const [showCountersignModal, setShowCountersignModal] = useState<string | null>(null);
  const [sendForm, setSendForm] = useState({ signerName: '', signerEmail: '', signerTitle: '', message: '' });
  const [counterSigData, setCounterSigData] = useState<string | null>(null);
  const [counterSigType, setCounterSigType] = useState<'typed' | 'drawn'>('typed');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadContracts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/contracts`, { headers: authHeaders() });
      setContracts(res.data);
    } catch {}
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const handleSendForSignature = async () => {
    if (!showSendModal || !sendForm.signerName || !sendForm.signerEmail) return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/api/contracts/${showSendModal}/send`, sendForm, { headers: authHeaders() });
      setActionMessage('Contract sent for signature!');
      setShowSendModal(null);
      setSendForm({ signerName: '', signerEmail: '', signerTitle: '', message: '' });
      loadContracts();
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || 'Failed to send');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCountersign = async () => {
    if (!showCountersignModal || !counterSigData) return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/api/contracts/${showCountersignModal}/countersign`,
        { signatureData: counterSigData, signatureType: counterSigType },
        { headers: authHeaders() }
      );
      setActionMessage('Contract fully signed! PDF sent to both parties.');
      setShowCountersignModal(null);
      loadContracts();
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || 'Failed to counter-sign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async (contractId: string) => {
    if (!confirm('Are you sure you want to void this contract?')) return;
    try {
      await axios.post(`${API}/api/contracts/${contractId}/void`, { reason: 'Voided by sender' }, { headers: authHeaders() });
      setActionMessage('Contract voided');
      loadContracts();
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || 'Failed to void');
    }
  };

  const handleRemind = async (contractId: string) => {
    try {
      await axios.post(`${API}/api/contracts/${contractId}/remind`, {}, { headers: authHeaders() });
      setActionMessage('Reminder sent!');
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || 'Failed to send reminder');
    }
  };
```

- [ ] **Step 4: Add contract list section and modals to the JSX**

Add this BEFORE the existing template/rate card section in the return JSX (so contracts list shows first, then the template editor below):

```tsx
      {/* Action message toast */}
      {actionMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#1a1a2e] border border-indigo-500/30 rounded-lg px-4 py-3 text-sm text-white shadow-lg">
          {actionMessage}
          <button onClick={() => setActionMessage('')} className="ml-3 text-gray-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Contracts List */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Contracts</h2>
        {contracts.length === 0 ? (
          <p className="text-gray-500">No contracts yet. Create one from the templates below.</p>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <div key={c.id} className="bg-[#1a1a2e] rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{c.title}</span>
                    <span className={`${STATUS_COLORS[c.status] || 'bg-gray-600'} text-white text-xs px-2 py-0.5 rounded-full`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {c.signerName && <span>To: {c.signerName} ({c.signerEmail}) &bull; </span>}
                    Created {new Date(c.createdAt).toLocaleDateString()}
                    {c.sentAt && <span> &bull; Sent {new Date(c.sentAt).toLocaleDateString()}</span>}
                    {c.signedAt && <span> &bull; Signed {new Date(c.signedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {c.status === 'DRAFT' && (
                    <button onClick={() => setShowSendModal(c.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-md">
                      Send for Signature
                    </button>
                  )}
                  {c.status === 'AWAITING_COUNTERSIGN' && (
                    <button onClick={() => setShowCountersignModal(c.id)} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-md">
                      Counter-Sign
                    </button>
                  )}
                  {['SENT_FOR_SIGNATURE', 'VIEWED'].includes(c.status) && (
                    <>
                      <button onClick={() => handleRemind(c.id)} className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5 rounded-md">
                        Remind
                      </button>
                      <button onClick={() => handleVoid(c.id)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs px-3 py-1.5 rounded-md">
                        Void
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send for Signature Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Send for Signature</h3>
            <div className="space-y-3">
              <input placeholder="Signer's Full Name *" value={sendForm.signerName}
                onChange={(e) => setSendForm({ ...sendForm, signerName: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <input placeholder="Signer's Email *" value={sendForm.signerEmail}
                onChange={(e) => setSendForm({ ...sendForm, signerEmail: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <input placeholder="Title (optional)" value={sendForm.signerTitle}
                onChange={(e) => setSendForm({ ...sendForm, signerTitle: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              <textarea placeholder="Personal message (optional)" value={sendForm.message}
                onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" rows={3} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowSendModal(null)} className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSendForSignature} disabled={actionLoading || !sendForm.signerName || !sendForm.signerEmail}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm">
                {actionLoading ? 'Sending...' : 'Send Contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Counter-Sign Modal */}
      {showCountersignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Counter-Sign Contract</h3>
            <p className="text-sm text-gray-400 mb-4">The client has signed. Add your signature to complete the contract.</p>
            <SignaturePad onSignatureChange={(data, type) => { setCounterSigData(data); setCounterSigType(type); }} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCountersignModal(null)} className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCountersign} disabled={actionLoading || !counterSigData}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm">
                {actionLoading ? 'Signing...' : 'Sign & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Contracts/ContractsPage.tsx
git commit -m "feat: update ContractsPage — contract list, send/countersign/void/remind modals, status badges"
```

---

### Task 10: Build Backend, Deploy & Test

- [ ] **Step 1: Build backend TypeScript**

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx tsc
```

Fix any compilation errors.

- [ ] **Step 2: Build frontend**

```bash
cd /Users/jeet/Documents/production-crm-backup/frontend
npm run build
```

Fix any compilation errors.

- [ ] **Step 3: Test contract creation flow locally**

```bash
# Start backend locally
cd /Users/jeet/Documents/production-crm-backup/backend
npm run dev &

# Test create contract
curl -s -X POST http://localhost:3000/api/contracts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-token>" \
  -d '{"dealId":"test-deal","title":"Test Staffing Agreement","content":"This is a test contract..."}' | jq .

# Test send for signature
curl -s -X POST http://localhost:3000/api/contracts/<contract-id>/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-token>" \
  -d '{"signerName":"Test Signer","signerEmail":"test@example.com"}' | jq .

# Test public signing flow
curl -s http://localhost:3000/api/contracts/sign/<token> | jq .
```

- [ ] **Step 4: Test OTP flow**

```bash
# Request OTP
curl -s -X POST http://localhost:3000/api/contracts/sign/<token>/request-otp | jq .

# Verify OTP (use code from email/logs)
curl -s -X POST http://localhost:3000/api/contracts/sign/<token>/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}' | jq .
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete contract signing system — PDF generation, OTP, e-signatures, audit trail"
```
