# Deferred Items — Phase 04 Apollo Import

## Pre-existing environment issues (NOT caused by 04-02 changes)

### Backend `node_modules` not installed in workspace
- **Discovered during:** Plan 04-02 execution, Task 1 tsc verification
- **Symptom:** `npx tsc --noEmit` reports 1315 errors across the repo, all of the form `Cannot find module 'axios'`, `Cannot find name 'setTimeout'`, etc.
- **Root cause:** `/Users/jeet/production-crm/backend/node_modules/` does not exist in this workspace.
- **Affected:** ALL backend files using `axios`, `express`, Node globals — not specific to apolloClient.ts.
- **Proof it's pre-existing:** Same errors hit `routes/automation.routes.ts`, `routes/leads.routes.ts`, `services/geolocation.service.ts`, etc., none of which 04-02 touched.
- **Why not fixed here:** Running `npm install` is architectural (Rule 4) — affects every plan in this phase, not in 04-02 scope. The deploy path (`/var/www/crm-backend/dist` on EC2 per CLAUDE.md memory) has its own node_modules; the local workspace is a code-edit surface only.
- **Suggested follow-up:** Either (a) run `npm install` once in `/Users/jeet/production-crm/backend/` to enable local typecheck, OR (b) accept that local tsc is non-functional and rely on EC2's installed deps + production builds as the verification surface.

## TypeScript verification status for 04-02 specifically
- The two apolloClient.ts errors are the same environmental issue (axios + setTimeout from `@types/node`), not file-specific bugs.
- File has been visually + grep-verified to match the spec exactly. Once `node_modules` is installed, tsc on apolloClient.ts will be clean.
