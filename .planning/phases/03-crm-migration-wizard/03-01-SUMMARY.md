---
phase: 03-crm-migration-wizard
plan: 01
subsystem: backend-api
tags: [deals, bulk-import, csv, migration]
dependency_graph:
  requires: []
  provides: [POST /api/deals/bulk-import]
  affects: [backend/src/routes/deals.ts]
tech_stack:
  added: []
  patterns: [prisma-loop-create, stage-normalization-map, fk-resolution-by-email]
key_files:
  created: []
  modified:
    - backend/src/routes/deals.ts
decisions:
  - DealStage enum cast (`as DealStage`) used to satisfy TypeScript — STAGE_MAP values match enum members exactly
  - router.use(authenticate) already covers the route — no per-route middleware needed
  - Missing FK lookups (contactEmail not found, companyName not found) result in null contactId/companyId — deal still imports
metrics:
  duration: 8m
  completed: 2026-03-19
  tasks_completed: 1
  files_modified: 1
---

# Phase 03 Plan 01: Backend Deals Bulk Import Summary

**One-liner:** POST /api/deals/bulk-import with STAGE_MAP normalization, FK resolution by email/name, and per-row validation returning { imported, failed, errors }.

## What Was Built

Added a bulk import endpoint to `backend/src/routes/deals.ts` that accepts an array of deal objects, validates required fields, normalizes stage names, resolves contact/company FKs by email/name, and returns a result summary.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add POST /api/deals/bulk-import route with STAGE_MAP | e865340 |

## Key Implementation Details

**Route:** `POST /api/deals/bulk-import`
**Auth:** Covered by `router.use(authenticate)` at top of router — no per-route middleware needed.

**STAGE_MAP** normalizes 18 stage variants:
- "Closed Won", "closedwon", "closed_won", "won" → `CLOSED_WON`
- "Closed Lost", "closedlost", "closed_lost", "lost" → `CLOSED_LOST`
- "Qualified", "qualification" → `QUALIFICATION`
- "Proposal/Price Quote", "Value Proposition" → `PROPOSAL`
- "Decision Maker Bought-In", "Contract Sent", "Negotiation/Review" → `NEGOTIATION`

**Validation per row:**
- title missing/empty → counted as failed with reason
- value NaN (parseFloat fails) → counted as failed with reason
- On failure: row pushed to errors array, loop continues

**FK resolution:**
- `contactEmail` → `prisma.contact.findFirst({ where: { email } })` → contactId (null if not found)
- `companyName` → `prisma.company.findFirst({ where: { name: { contains, mode: 'insensitive' } } })` → companyId (null if not found)
- Not found = null contactId/companyId; deal still imports

**Response:**
```json
{ "imported": 3, "failed": 1, "errors": [{ "row": 2, "title": "Bad Deal", "reason": "Invalid or missing value" }] }
```

## Deviations from Plan

**1. [Rule 1 - Bug] DealStage enum type cast required**
- **Found during:** Task 1 — TypeScript compile
- **Issue:** `STAGE_MAP` returns `string`, but Prisma `deal.create` expects `DealStage` enum type
- **Fix:** Imported `DealStage` from `@prisma/client` and cast: `(STAGE_MAP[stageKey] ?? 'PROSPECTING') as DealStage`
- **Files modified:** `backend/src/routes/deals.ts`
- **Commit:** e865340

Pre-existing TypeScript errors in `activityLogger.ts`, `calendar-auth.ts`, `email-templates.ts` are out of scope — not caused by this plan's changes.

## Self-Check: PASSED

- [x] `grep -n "bulk-import"` → line 378 in deals.ts
- [x] STAGE_MAP constant defined with 18 entries
- [x] TypeScript: 0 errors on deals.ts (`npx tsc --noEmit 2>&1 | grep "deals.ts"` → no output)
- [x] Commit e865340 exists
