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
