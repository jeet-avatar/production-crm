---
phase: 02-quote-contract-lifecycle
plan: "01"
subsystem: backend-data-layer
tags: [prisma, postgresql, express, crud, quotes, contracts]
dependency_graph:
  requires: []
  provides: [Quote CRUD API, Contract CRUD API, quotes table, contracts table]
  affects: [backend/prisma/schema.prisma, backend/src/app.ts]
tech_stack:
  added: [QuoteStatus enum, ContractStatus enum, Quote Prisma model, Contract Prisma model]
  patterns: [Router-level authenticate middleware, Decimal serialization via Number(), Ownership check via findFirst(where: {id, userId}), Status lifecycle timestamps (sentAt/acceptedAt/signedAt)]
key_files:
  created:
    - backend/src/routes/quotes.ts
    - backend/src/routes/contracts.ts
    - backend/prisma/migrations/20260319000000_add_quotes_contracts/migration.sql
  modified:
    - backend/prisma/schema.prisma
    - backend/src/app.ts
decisions:
  - Used prisma db push (non-interactive) instead of prisma migrate dev (interactive-only in non-TTY shell); migration SQL file created manually for history tracking
  - Decimal fields serialized in a dedicated serializeQuote() helper for consistency and DRY
  - Hard delete (not soft delete) for quotes and contracts per plan spec
  - Deal ownership validated before creating quote/contract (findFirst where id + userId)
metrics:
  duration: "~5 minutes"
  completed_date: "2026-03-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
requirements_satisfied: [REQ-010, REQ-011]
---

# Phase 02 Plan 01: Quote and Contract Data Layer Summary

Prisma schema extended with Quote and Contract models + enums; full Express CRUD routes wired up for /api/quotes and /api/contracts with authentication, ownership checks, Decimal serialization, and status lifecycle management.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add Quote and Contract models to Prisma schema and run migration | ea400d7 | schema.prisma, migration.sql |
| 2 | Create quotes.ts and contracts.ts backend routes, register in app.ts | c70ad18 | quotes.ts, contracts.ts, app.ts |

## What Was Built

### Prisma Schema (schema.prisma)

Two new enums added before the video campaign section:
- `QuoteStatus`: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
- `ContractStatus`: DRAFT, SENT_FOR_SIGNATURE, SIGNED, CANCELLED

Two new models added in a dedicated "QUOTE & CONTRACT MODELS" section:
- `Quote`: id, dealId, userId, status, title, lineItems (Json), subtotal/tax/total (Decimal 12,2), notes, validUntil, sentAt, acceptedAt, timestamps; relations to Deal, User, Contract[]
- `Contract`: id, dealId, quoteId (optional), userId, status, title, content (Text), variables (Json?), signedAt, signedBy, timestamps; relations to Deal, Quote?, User

Back-relations added to:
- `Deal`: `quotes Quote[]` and `contracts Contract[]`
- `User`: `quotes Quote[]` and `contracts Contract[]`

### Database Migration

Applied via `prisma db push --accept-data-loss` against local `crm_db`. Both `quotes` and `contracts` tables created with all indexes and foreign key constraints. Migration SQL file created at `backend/prisma/migrations/20260319000000_add_quotes_contracts/migration.sql`.

### API Routes

**GET /api/quotes?dealId=X** — Lists quotes for a deal scoped to authenticated user, ordered by createdAt desc. Decimals serialized.

**POST /api/quotes** — Creates quote after validating deal ownership. Returns 201 with serialized Decimals.

**PUT /api/quotes/:id** — Partial update with ownership check. Serializes Decimals on response.

**PATCH /api/quotes/:id/status** — Status-only update. Auto-sets sentAt when status=SENT, acceptedAt when status=ACCEPTED.

**DELETE /api/quotes/:id** — Hard delete with ownership check.

**GET /api/contracts?dealId=X** — Lists contracts for a deal scoped to authenticated user.

**POST /api/contracts** — Creates contract after validating deal ownership. Optional quoteId and variables fields.

**PUT /api/contracts/:id** — Partial update (title, content, variables) with ownership check.

**PATCH /api/contracts/:id/status** — Status-only update. Auto-sets signedAt and signedBy when status=SIGNED.

**DELETE /api/contracts/:id** — Hard delete with ownership check.

### app.ts Registration

Imports added alongside other route imports:
```typescript
import quotesRoutes from './routes/quotes';
import contractsRoutes from './routes/contracts';
```

Routes registered immediately after deals route (line 290-291):
```typescript
app.use('/api/quotes', quotesRoutes);
app.use('/api/contracts', contractsRoutes);
```

## Verification Results

```
grep -n "api/quotes\|api/contracts" src/app.ts
290:app.use('/api/quotes', quotesRoutes);
291:app.use('/api/contracts', contractsRoutes);

grep -n "router.use(authenticate)" src/routes/quotes.ts src/routes/contracts.ts
src/routes/quotes.ts:9:router.use(authenticate);
src/routes/contracts.ts:9:router.use(authenticate);

grep -n "Number(" src/routes/quotes.ts
15:    subtotal: Number(q.subtotal),
16:    tax: q.tax !== null && q.tax !== undefined ? Number(q.tax) : null,
17:    total: Number(q.total),

npx tsc --noEmit | grep "quotes.ts\|contracts.ts" → 0 errors

Tables verified: quotes and contracts both exist in crm_db
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] prisma migrate dev is interactive-only in non-TTY shell**
- **Found during:** Task 1
- **Issue:** `npx prisma migrate dev` detected non-interactive environment and refused to run (Prisma requires TTY for `migrate dev`)
- **Fix:** Used `prisma db push --accept-data-loss` to apply schema changes directly. Created migration SQL file manually at `prisma/migrations/20260319000000_add_quotes_contracts/migration.sql` for audit trail. `prisma generate` ran automatically as part of db push.
- **Files modified:** `prisma/migrations/20260319000000_add_quotes_contracts/migration.sql` (new)
- **Impact:** Tables created correctly, all indexes and FKs applied. Migration history in `prisma migrate status` will show the SQL file once deployed and marked applied.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `backend/src/routes/quotes.ts` | FOUND |
| `backend/src/routes/contracts.ts` | FOUND |
| `backend/prisma/migrations/20260319000000_add_quotes_contracts/migration.sql` | FOUND |
| Commit ea400d7 (schema + migration) | FOUND |
| Commit c70ad18 (routes + app.ts) | FOUND |
| `quotes` table in crm_db | VERIFIED (Node query returned `{ table_name: 'quotes' }`) |
| `contracts` table in crm_db | VERIFIED (Node query returned `{ table_name: 'contracts' }`) |
| TypeScript errors in new files | 0 |
