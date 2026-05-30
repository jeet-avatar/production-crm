---
phase: 04-apollo-import-and-auto-campaign
plan: 01
subsystem: backend-data-layer
tags: [prisma, schema, apollo, stream-classification, refactor]
requires: []
provides:
  - "Contact.stream + Contact.apolloPersonId (unique) + Contact.apolloRawData persistence"
  - "Company.stream + Company.apolloOrgId (unique) + Company.apolloRawData persistence"
  - "backend/src/lib/streamClassifier.ts exporting classifyStream() + STREAMS[]"
affects:
  - "backend/src/routes/job-leads.routes.ts — now imports classifyStream from lib"
tech-stack:
  added: []
  patterns:
    - "Pure-function extraction to /lib for cross-route reuse"
    - "Manual SQL migration file mirroring db push (Phase-03 pattern)"
key-files:
  created:
    - "backend/src/lib/streamClassifier.ts"
    - "backend/prisma/migrations/manual/04-add-stream-and-apollo-fields.sql"
  modified:
    - "backend/prisma/schema.prisma"
    - "backend/src/routes/job-leads.routes.ts"
decisions:
  - "Manual SQL audit file uses lowercase @@map() table names (\"contacts\", \"companies\") to match production reality — plan example used PascalCase \"Contact\"/\"Company\" which would fail against this DB"
  - "STREAMS[] in lib enumerates the 9 canonical Phase 4 streams; classifyStream() can still return the broader legacy set (Full-Stack, Web3, Product/Design, QA/Testing) — those fall through to template-fallback logic in the Apollo wizard"
  - "prisma db push deferred to plan 04-06 (no DATABASE_URL in executor env per execution_context env_state)"
  - "Audit SQL file force-added (git add -f) — backend/.gitignore line 49 ignores prisma/migrations/**/*.sql; past migration.sql files committed the same way (e.g., 20251003210116_crmstartup/migration.sql at e2fd606)"
metrics:
  duration_minutes: 12
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  completed: 2026-05-30
commits:
  - "5c75d21 — chore(04-02): document APOLLO_API_KEY in backend/.env.example (prior session; also landed the Contact/Company schema additions)"
  - "911e1e2 — feat(04-01): add stream + apollo dedup fields to Contact and Company (audit SQL file)"
  - "79290fe — refactor(04-01): extract classifyStream() to lib for Apollo route reuse"
---

# Phase 04 Plan 01: Apollo Persistence + Stream Classifier Extraction Summary

Adds the Phase 4 persistence + classification primitives: Contact and Company gain `stream`, `apollo*Id` (unique), and `apolloRawData` fields, and `classifyStream()` moves from `job-leads.routes.ts` into a shared `backend/src/lib/streamClassifier.ts` so the upcoming Apollo route (plan 04-03) shares one classifier with zero behavioral drift.

## Schema Diff Summary

### `model Contact`
Added (after `enrichedAt`, before `createdAt`):
```prisma
  // Phase 4 — Apollo + stream classification
  stream         String? // 'NetSuite' | 'AI/ML' | 'Cloud/DevOps' | 'Cybersecurity' | 'Data/Analytics' | 'Mobile' | 'Enterprise/ERP' | 'Staffing/HR' | 'Other'
  apolloPersonId String? @unique
  apolloRawData  Json?
```

Added indexes:
```prisma
  @@index([stream])
  @@index([apolloPersonId])
```

### `model Company`
Added (after `aiPitch`, before `isActive`):
```prisma
  // Phase 4 — Apollo + stream classification
  stream        String?
  apolloOrgId   String? @unique
  apolloRawData Json?
```

Added indexes:
```prisma
  @@index([stream])
  @@index([apolloOrgId])
```

### Untouched (intentional)
- `Contact.source` — already exists at line ~213; Apollo route will write `'apollo'` into it
- `Company.dataSource` — already exists at line ~280; same reasoning
- `EmailTemplate.category` — already supports the `Stream:<name>` convention used by plan 04-03

## `streamClassifier.ts` Export Surface

```typescript
export const STREAMS: readonly [
  'NetSuite',
  'AI/ML',
  'Cloud/DevOps',
  'Cybersecurity',
  'Data/Analytics',
  'Mobile',
  'Enterprise/ERP',
  'Staffing/HR',
  'Other',
];

export type Stream = (typeof STREAMS)[number];

export function classifyStream(title: string, description: string): string;
```

The function body is the byte-for-byte copy of `job-leads.routes.ts:44-82` — regex order, regex literals, and return strings are all unchanged. The classifier can return strings outside the canonical `STREAMS` list (`Full-Stack`, `Web3`, `Product/Design`, `QA/Testing`); plan 04-03 maps those to the template fallback chain.

## `job-leads.routes.ts` Refactor

- Added `import { classifyStream } from '../lib/streamClassifier';` at line 8
- Removed inline `function classifyStream(...)` block (was lines 44–82)
- All 6 call sites preserved verbatim (lines 99, 130, 161, 251, 289 in the post-refactor file)
- Standalone `tsc --noEmit --skipLibCheck` on the lib file exits 0

## Verification Run

| Check | Result |
|-------|--------|
| `grep -n apolloPersonId backend/prisma/schema.prisma` | match at line 230 (model Contact) |
| `grep -n apolloOrgId backend/prisma/schema.prisma` | match at line 335 (model Company) |
| `ls backend/prisma/migrations/manual/04-add-stream-and-apollo-fields.sql` | exists |
| `prisma format --schema=prisma/schema.prisma` | formatted clean |
| `DATABASE_URL=postgresql://x:y@localhost:5432/x prisma validate` | "The schema at … is valid" |
| `ls backend/src/lib/streamClassifier.ts` | exists |
| `grep "from '../lib/streamClassifier'" backend/src/routes/job-leads.routes.ts` | match at line 8 |
| `grep -c "^function classifyStream" backend/src/routes/job-leads.routes.ts` | 0 |
| Standalone `tsc --noEmit --skipLibCheck` on lib file | exits 0 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] SQL migration table names corrected**
- **Found during:** Task 1
- **Issue:** Plan example used `ALTER TABLE "Contact" …` / `"Company" …` (PascalCase), but the Prisma models declare `@@map("contacts")` and `@@map("companies")` and every existing migration in `backend/prisma/migrations/*/migration.sql` uses lowercase. Running the plan's SQL verbatim would fail with `relation "Contact" does not exist`.
- **Fix:** Wrote SQL against actual table names (`contacts`, `companies`) and matching index name prefixes (`contacts_*_key`, `companies_*_idx`).
- **Files modified:** `backend/prisma/migrations/manual/04-add-stream-and-apollo-fields.sql`
- **Commit:** `911e1e2`

### Skipped (per execution_context)

**`npx prisma db push`** — execution_context env_state line 3 explicitly says "do NOT attempt prisma migrate dev or prisma db push — they need DB." The migration file is the Phase 4 audit artifact; production deployment happens in plan 04-06.

### Pre-existing Work Observed

The Prisma schema edits (Contact + Company field additions) were already present in branch commit `5c75d21` from a prior `chore(04-02)` session before this executor ran. My re-application via the Edit tool was a no-op against final content — the diff captured by `911e1e2` therefore contains only the new SQL audit file. The schema state matches the plan exactly; the audit-trail commit lineage is just split across two commits.

## Deferred Items

- `prisma db push` against the live BrandMonkz CRM DB — deferred to plan 04-06 alongside `rsync` deploy to `/var/www/crm-backend/dist/` (per Memory: BrandMonkz CRM deploy path) and `pm2 restart crm-backend`
- `prisma migrate deploy` in CI — same plan
- Full backend `tsc --noEmit` across the project — backend has no `node_modules` in the executor env (`cd backend && ls node_modules` → no such file). Standalone compile of the new lib file passes; route file is a delete + import-line addition that introduces no new types.

## rsync Deploy Gotcha (per Memory)

> PM2 `crm-backend` runs `node /var/www/crm-backend/dist/server.js`. `deploy.sh` rsyncs to `/var/www/crm-backend/backend/dist/` — a stale parallel tree. ALWAYS rsync to `/var/www/crm-backend/dist/` then `pm2 restart crm-backend`.

Plan 04-06 must rsync directly to `/var/www/crm-backend/dist/` (not the path `deploy.sh` defaults to) and run `npx prisma migrate deploy` from `/var/www/crm-backend/` to apply the new columns before `pm2 restart crm-backend`.

## Self-Check: PASSED

- backend/prisma/schema.prisma — FOUND, contains `apolloPersonId` + `apolloOrgId` + 4 @@index entries
- backend/prisma/migrations/manual/04-add-stream-and-apollo-fields.sql — FOUND
- backend/src/lib/streamClassifier.ts — FOUND, exports `classifyStream` + `STREAMS`
- backend/src/routes/job-leads.routes.ts — FOUND, imports from `../lib/streamClassifier`, no inline `classifyStream` definition
- Commits 911e1e2 and 79290fe — FOUND in `git log`
