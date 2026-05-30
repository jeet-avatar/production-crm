# Deferred Items - Phase 04 (Out of Scope)

These pre-existing TS errors in the backend exist on the production branch BEFORE Phase 4 changes and are not related to schema reconciliation. They do NOT prevent backend build (tsc still emits dist/) so they are deferred for a future cleanup task.

## Pre-existing TS errors (8 total)

1. `src/controllers/apiSubscriptions.controller.ts(8,3)` — Stripe apiVersion mismatch ("2025-09-30.clover" vs "2025-10-29.clover")
2. `src/routes/analytics.routes.ts(10,10)` — imports `authenticateJWT` which doesn't exist (should be `authenticate`)
3. `src/routes/apiSubscriptions.routes.ts(10,10)` — same as #2
4. `src/routes/publicCheckout.routes.ts(8,3)` — same as #1
5. `src/routes/subscriptions.ts(11,3)` — same as #1
6. `src/services/cronScheduler.ts(7,37)` — `node-cron` module not declared in package.json
7. `src/services/export.service.ts(2,21)` — `exceljs` module not declared
8. `src/services/export.service.ts(3,44)` — `csv-writer` module not declared

## Why deferred

- These files compile to dist/ despite errors (TypeScript emits JS for non-blocking errors)
- They are not in the Phase 4 critical path (apollo.ts, email-templates routes, etc.)
- Fixing them requires Stripe SDK version pin or removing the apiVersion override + auth middleware rename, both unrelated to schema work
- The 3 missing npm packages may be intentional optional features (cron, excel export) — should be added or dead-code removed in a separate cleanup phase

## Recommended follow-up

- Quick task to either remove unused/dead-code files or install missing deps + fix imports

---

# Phase 04 close-out items (added 2026-05-30)

## 1. Apollo API key refresh on EC2 (PHASE 4.5 REOPEN TRIGGER)

**Current state:** `/var/www/crm-backend/.env` has TWO `APOLLO_API_KEY` lines (`TQHa...sGGA` and `aRGM...hNXw`, both 22 chars). dotenv last-wins → backend sees `aRGM...hNXw`. **Both keys return HTTP 401 "Invalid access credentials" from `https://api.apollo.io`.** Verified by direct curl from EC2 during Plan 04-06 Task 4a.

**Impact:** Blocks the Apollo import half of the Phase 4 smoke (Plan 04-06 Task 4a). The wrapper correctly returns HTTP 503 "Apollo key invalid or expired" — the graceful-degradation path is itself verified, but a real prospect cannot be imported until the key is refreshed.

**Resolution (outside this repo):**
1. Rajesh (or operator with Apollo account access) generates a fresh API key at `https://app.apollo.io/#/settings/credentials`
2. Replace BOTH stale lines in `/var/www/crm-backend/.env` with a single new line: `APOLLO_API_KEY=<new>`
3. `pm2 restart crm-backend` (env reload on next module import)
4. Re-run Plan 04-06 Task 4a curl. Expected: HTTP 200 with `{imported:1, contactIds:[...], suggestedStream:"...", ...}`

**Estimated effort:** < 5 min once the key is in hand.
**Cost:** ~2 Apollo credits when the live import finally runs (1 search + 1 enrichment per the Plan 04-06 filter set).

## 2. Test contact `cmtest1780181866jm6a063b2d` (jm@techcloudpro.com)

**Decision:** LEFT IN PLACE post-Plan 04-06.

**Rationale:** Keeps the Resend send-campaign smoke trivially re-runnable as a single curl — no DB setup needed, no Apollo credit needed, no email-routing surprises (recipient is the operator's own inbox). Cost of leaving = one row in the Contact table on prod, owned by Rajesh's user id. Cost of deleting = future smoke reruns need 5 extra setup steps.

**Owner:** `cmmziuiuy0000vp5wstob71f7` (rajesh@techcloudpro.com).
**Stream/source:** null (created during isolation testing, not via Apollo import path).
**If/when to delete:** Once Phase 4.5 redoes the smoke with a real Apollo-imported prospect, this can be retired.

## 3. Resend message-id surfacing (Phase 4.5 micro-improvement)

`apollo.ts` send loop (Plan 04-03 Task 3) does NOT log `result.data?.id` from `resend.emails.send`. Adding one `console.log` line would make pm2-log-grep an authoritative trace surface alongside the Resend dashboard. ~30 sec change. File under "polish, not blocking."

## 4. Backend logger noise on EC2

pm2 logs show repeated `🔧 Environment loaded: ENOENT: no such file or directory, open '/home/ec2-user/crm-backend/backend/.env'` lines on each module init. The actual .env at `/var/www/crm-backend/.env` IS being loaded (Apollo + Resend + JWT all worked). This is a stale relative-path lookup somewhere in the SMTP init code. Cosmetic; defer to a logging-cleanup quick task.

