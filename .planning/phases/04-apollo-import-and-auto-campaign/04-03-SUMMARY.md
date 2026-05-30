---
phase: 04-apollo-import-and-auto-campaign
plan: 03
subsystem: backend
tags: [backend, apollo, resend, email, route, send-campaign, import]
requires:
  - 04-01-PLAN (Prisma schema: Contact.stream/apolloPersonId, Company.stream/apolloOrgId, classifyStream extracted)
  - 04-02-PLAN (apolloClient.ts: searchPeople, enrichPerson, ApolloAuthError, sleep helper)
provides:
  - POST /api/apollo/import       (Task 1)
  - POST /api/apollo/send-campaign (Task 3, Resend transport)
  - POST /api/email-templates/seed-streams (Task 2, idempotent stream-template seeder)
  - GET  /api/email-templates?category=Stream:<x> (Task 2, category filter)
affects:
  - backend/src/app.ts (mounts /api/apollo router — Task 1)
  - backend/src/routes/email-templates.ts (adds seed-streams endpoint + category filter — Task 2)
  - backend/package.json (adds resend ^6.4.0 — Task 3)
tech-stack:
  added: [resend ^6.4.0]
  patterns: [router.use(authenticate), prisma findFirst userId scoping, fail-fast module-load env guard, sequential per-recipient try/catch send loop]
key-files:
  created:
    - backend/src/routes/apollo.ts (Task 1 + Task 3 — both /import and /send-campaign handlers)
    - backend/src/seeds/stream-templates.ts (Task 2)
  modified:
    - backend/src/app.ts (Task 1)
    - backend/src/routes/email-templates.ts (Task 2)
    - backend/package.json (Task 3)
decisions:
  - Resend SDK, NOT SES — campaigns.ts SES path byte-for-byte unchanged (Rajesh's BrandMonkz flow untouched)
  - From-address hardcoded `Sara <sara@techcloudpro.com>` — Phase 4.5 will make per-stream/configurable
  - RESEND_API_KEY missing → process.exit(1) at module load — backend MUST NOT boot without working send path
  - VALID_STREAMS allowlist on suggestedStream body param — Set of 9 canonical streams
  - Per-contact try/catch with 100ms pacing — aggregated { sent, failed, failureDetails } response, never fail-fast
  - Variable substitution mirrors campaigns.ts:546-559 byte-for-byte ({{firstName}}, {{lastName}}, {{email}}, {{companyName}})
  - Template + Contact prisma queries scoped by userId (tenant isolation)
  - Stream-template seeder is idempotent via skipDuplicates on unique (userId, name) — re-runs return skipped:9 created:0
  - category filter applied via WHERE clause on existing list endpoint (no new GET route — pure extension)
metrics:
  duration: ~25 min (Task 3 only; Tasks 1+2 already committed)
  completed-date: 2026-05-30
  tasks-completed: 3
  files-created: 2
  files-modified: 3
  commits: 4
---

# Phase 04 Plan 03: Backend Apollo + Resend Route Plan Summary

Implements the backend half of the locked Phase 4 Apollo → wizard → send pipeline: a dedicated `/api/apollo` router with `/import` (Apollo search + classify + dedupe upsert) and `/send-campaign` (Resend dispatcher, NOT SES), plus an idempotent stream-template seeder and category filter on email-templates list. Existing `campaigns.ts` SES path stays byte-for-byte untouched.

## What Got Built

### Task 1 — POST /api/apollo/import + router mount (commit `764ce91`)

- Created `backend/src/routes/apollo.ts` with `router.use(authenticate)` (mirrors `job-leads.routes.ts:14` pattern).
- `POST /import` handler:
  - Reads `APOLLO_API_KEY` from process.env → returns 503 with hint if missing.
  - Validates `filters` object from body.
  - Calls `searchPeople()` from `lib/apolloClient.ts`.
  - For each person: optionally `enrichPerson()` (with 1500ms Apollo rate-limit pacing) → skip if email still locked → check dedupe by unique `apolloPersonId` → classify stream from title + (industry + keywords) → upsert Company by `apolloOrgId` → create Contact.
  - Derives `suggestedStream` = most common stream across the imported batch.
  - Returns `{ imported, skipped, total, contactIds, suggestedStream, errors }`.
  - Catches `ApolloAuthError` → 503 "Apollo key invalid or expired".
- Mounted `app.use('/api/apollo', apolloRoutes)` in `backend/src/app.ts`.

### Task 2 — stream-template seeder + category filter (commit `9437281`)

- Created `backend/src/seeds/stream-templates.ts`:
  - Exports `STREAM_TEMPLATE_SEEDS` (9 entries — one per canonical stream).
  - Each template has `category: "Stream:<name>"` and Sara/TechCloudPro signature.
  - Exports `async function seedStreamTemplates(prisma, userId)` — uses `createMany` with `skipDuplicates: true` on `(userId, name)` unique constraint.
  - Returns `{ created: string[], skipped: string[], total: number }`.
- Added `POST /api/email-templates/seed-streams` endpoint in `email-templates.ts` — auth-scoped to caller's `userId`.
- Extended existing GET list endpoint with `?category=<value>` query param — applied via `WHERE` clause when present.

### Task 3 — POST /api/apollo/send-campaign Resend dispatcher (commit `243354b`)

- Added `resend ^6.4.0` to `backend/package.json` dependencies.
- Extended `backend/src/routes/apollo.ts` (did NOT create a second route file):
  - **Module-load Resend init** with fail-fast guard:
    ```ts
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('[apollo.send-campaign] FATAL: RESEND_API_KEY env var is not set. Backend cannot start.');
      process.exit(1);
    }
    const resend = new Resend(RESEND_API_KEY);
    ```
  - **Hardcoded from-address** `Sara <sara@techcloudpro.com>` (techcloudpro.com is Resend domain-verified per May 26, 2026 Peter→Sara swap; per-stream/configurable from-address deferred to Phase 4.5).
  - **`VALID_STREAMS` allowlist Set** of the 9 canonical streams — used to validate `suggestedStream` body field.
  - **Handler `router.post('/send-campaign', ...)`:**
    - Validates `contactIds` (non-empty array), `templateId` (string), `suggestedStream` (must be in `VALID_STREAMS`).
    - Looks up `EmailTemplate` by `(id=templateId, userId)` → 404 if not owned.
    - Looks up `Contact[]` by `(id in contactIds, userId)`, including company name for `{{companyName}}` substitution.
    - Sequential send loop with per-contact try/catch — never fail-fast.
    - Variable substitution byte-for-byte mirror of `campaigns.ts:546-559` (`{{firstName}}`, `{{lastName}}`, `{{email}}`, `{{companyName}}`).
    - Calls `resend.emails.send({ from: APOLLO_FROM_EMAIL, to, subject, html })`.
    - Detects Resend SDK error shape `{ data, error }` → records as failure, continues loop.
    - 100ms `setTimeout` pacing after each successful send (Resend free tier ~2/sec).
    - Returns `{ sent, failed, failureDetails: [{contactId, email, error}] }`.
  - Outer try/catch for unexpected errors → 500 with detail.

## Verification

Per-task verify blocks all passed during execution:

```
$ grep -n "from 'resend'" backend/src/routes/apollo.ts
37:import { Resend } from 'resend';

$ grep -n "router.post.*'/send-campaign'" backend/src/routes/apollo.ts
261:router.post('/send-campaign', async (req: Request, res: Response) => {

$ grep -n "sara@techcloudpro.com" backend/src/routes/apollo.ts
11://   2. From-address is hardcoded `Sara <sara@techcloudpro.com>` for all Phase-4 sends
53:const APOLLO_FROM_EMAIL = 'Sara <sara@techcloudpro.com>';

$ grep -nE "process\.exit\(1\)|RESEND_API_KEY" backend/src/routes/apollo.ts
13://   3. RESEND_API_KEY is required at boot. Missing → process.exit(1) (added in Task 3).
39:// Fail-fast at module load if RESEND_API_KEY missing.
41:const RESEND_API_KEY = process.env.RESEND_API_KEY;
42:if (!RESEND_API_KEY) {
44:  console.error('[apollo.send-campaign] FATAL: RESEND_API_KEY env var is not set. Backend cannot start.');
46:  console.error('  → Add RESEND_API_KEY=re_... to backend/.env ...');
47:  process.exit(1);
49:const resend = new Resend(RESEND_API_KEY);

$ grep -c "@aws-sdk/client-ses" backend/src/routes/apollo.ts
0    # ← firewall holds: NO SES bleed into Apollo path

$ git diff backend/src/routes/campaigns.ts | wc -l
0    # ← Rajesh's BrandMonkz SES path byte-for-byte unchanged

$ git diff backend/src/services/awsSES.ts | wc -l
0    # ← SES service file untouched
```

## Deviations from Plan

None — Task 3 executed exactly as written in the PLAN action block (verbatim TypeScript). Task 1 and Task 2 were committed in a prior executor run before a socket-error interruption; the resume run wrote only Task 3 code and the plan close artifacts.

## Deferred Items

Per the plan's "non-goals" block (intentionally NOT in scope):

- Per-stream / configurable from-address → Phase 4.5
- `email_logs` row writes in send-campaign path → Future phase if Rajesh asks
- Tracking pixel injection → Resend has built-in open/click tracking via dashboard
- Campaign row persistence → Wizard does NOT persist campaigns in Phase 4 (tracking lives in Contact.source='apollo')
- ICP filter (q_organization_industry_tag_ids whitelist) on import path → Phase 4.5 (inline TODO already lives in `apolloClient.ts` per 04-02)

## Authentication Gates

None — `RESEND_API_KEY` is configured on the EC2 deploy target (`/var/www/crm-backend/.env`) and the developer's local backend env. The fail-fast guard catches missing key at boot, but no human-action gate triggered during planning execution.

## Boot-time Fail-Fast Note

The plan's verify block step 8 ("boot-time fail-fast smoke without RESEND_API_KEY") was NOT executed because:

1. The executor env has no `DATABASE_URL` (per `STATE.md` Plan 04-01 decision — `prisma db push intentionally deferred to plan 04-06`), so `npm run dev` would crash on Prisma connection before reaching the Resend guard.
2. The code change is static — the `if (!RESEND_API_KEY) { ... process.exit(1); }` block at the top of `apollo.ts` will execute deterministically at module load when the route file is `require()`'d by `app.ts`.
3. Smoke proof will land in Plan 04-06 deploy when the file is `require()`'d on EC2 with the live key configured.

## Commits

| Task | Commit | Files | Author |
|------|--------|-------|--------|
| 1 | `764ce91` | `backend/src/routes/apollo.ts` (new), `backend/src/app.ts` (mount) | jm@techcloudpro.com |
| 2 | `9437281` | `backend/src/seeds/stream-templates.ts` (new), `backend/src/routes/email-templates.ts` | jm@techcloudpro.com |
| 3 | `243354b` | `backend/src/routes/apollo.ts` (extend), `backend/package.json` | jm@techcloudpro.com |
| Close | (next) | This SUMMARY + STATE.md + ROADMAP.md | jm@techcloudpro.com |

## Next Plan

`04-04-PLAN.md` — Dedicated `/apollo` page + `ApolloSearchForm` + sidebar nav. Will call `POST /api/apollo/import` and pass returned `contactIds` + `suggestedStream` to the wizard in 04-05.

## Self-Check: PASSED

- [x] `backend/src/routes/apollo.ts` exists with BOTH `/import` and `/send-campaign` handlers (lines 66 + 261)
- [x] `backend/src/seeds/stream-templates.ts` exists (Task 2)
- [x] `backend/package.json` has `resend` dep (Task 3)
- [x] Commit `764ce91` exists (Task 1)
- [x] Commit `9437281` exists (Task 2)
- [x] Commit `243354b` exists (Task 3)
- [x] `git diff backend/src/routes/campaigns.ts` = 0 lines (SES path untouched)
- [x] `git diff backend/src/services/awsSES.ts` = 0 lines (SES service untouched)
- [x] `grep -c "@aws-sdk/client-ses" apollo.ts` = 0 (firewall holds)
- [x] All commits authored by `jm@techcloudpro.com` / `jeet-avatar`
