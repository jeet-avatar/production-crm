---
phase: quick
plan: "03"
subsystem: job-leads
tags: [job-leads, email, frontend, backend, ec2]
dependency_graph:
  requires: [quick-02 (Job Leads Pipeline)]
  provides: [companyEmail on leads, email on Contact import, hero CTA, guide panel, email pill]
  affects: [frontend/src/pages/JobLeads, backend/src/routes/job-leads.routes.ts, contacts table]
tech_stack:
  added: []
  patterns: [URL API for domain extraction, localStorage for panel state, navigator.clipboard for copy]
key_files:
  created: []
  modified:
    - backend/src/routes/job-leads.routes.ts
    - frontend/src/types/index.ts
    - frontend/src/pages/JobLeads/JobLeadsPage.tsx
decisions:
  - "Used tsc --noEmitOnError false to compile job-leads.routes.ts despite pre-existing schema errors in unrelated files"
  - "dist/ is gitignored — EC2 deploy done via scp of locally compiled dist/routes/job-leads.routes.js"
  - "companyEmail is passed automatically through jobLeadsApi.import(leadsToImport) since leadsToImport are full JobLead objects — no change needed to handleImport logic"
metrics:
  duration: "4 minutes"
  completed: "2026-03-26"
  tasks_completed: 3
  files_modified: 3
---

# Quick Task 03: Enhance Job Leads — Real Company Emails, Hero CTA, Guide Panel Summary

**One-liner:** Domain-derived `hr@domain.com` emails on every lead, large gradient CTA with pulse animation, dismissible 5-step guide panel, and click-to-copy email pill column — all deployed to EC2.

## What Was Done

### Task 1: Backend — domain email extraction (commit `10a7f0a`)

- Added `extractDomain(url)` helper using `new URL(url).hostname`, strips `www.` prefix, catches errors
- Updated `GET /api/job-leads/fetch` map: each lead now includes `companyDomain`, `companyEmail` (`hr@domain`), `emailCandidates` (hr@/careers@/jobs@)
- Updated `POST /api/job-leads/import` type to accept `companyEmail?` on each lead
- Updated `prisma.contact.create` to include `email: lead.companyEmail || undefined`

### Task 2: Frontend — hero CTA, guide panel, email column (commit `667df4f`)

- `types/index.ts`: Added `companyDomain?`, `companyEmail?`, `emailCandidates?` to `JobLead` interface
- `JobLeadsPage.tsx`: Large gradient hero button (135deg indigo→purple) with `pulse-ring` animation when table is empty
- `JobLeadsPage.tsx`: Dismissible 5-step how-to guide panel — reads/writes `jl_guide_hidden` from localStorage
- `JobLeadsPage.tsx`: Email pill column (`hr@domain.com`) using monospace badge — click copies to clipboard, shows "✓ Copied" for 2s
- `JobLeadsPage.tsx`: `@keyframes pulse-ring` added to `<style>` block
- Grid updated from 8 columns to 9 (added 200px email column)

### Task 3: Build + Deploy to EC2 (commit `fda181e`)

- Frontend: `npm run build` → 2.55s, 1.33MB JS bundle
- Frontend deployed: `scp dist/ → /tmp/crm-fe.tar.gz → /var/www/brandmonkz/`
- Backend route deployed: `scp dist/routes/job-leads.routes.js → /var/www/crm-backend/dist/routes/`
- PM2 restarted: `crm-backend` online, health check returns `{"status":"ok","database":"connected"}`

## Verification Output

```
=== Backend route email fields (grep count) ===
5 matches in src/routes/job-leads.routes.ts

=== Backend contact.create email field ===
149:  email: lead.companyEmail || undefined,

=== Frontend type updated ===
  companyEmail?: string;
  companyDomain?: string;
  emailCandidates?: string[];

=== Frontend guide panel (jl_guide_hidden / How to use) ===
3 matches

=== Frontend hero button (Get Fresh Leads / pulse-ring) ===
4 matches

=== Frontend email pill (navigator.clipboard / copiedEmail) ===
3 matches

=== TypeScript (frontend) ===
0 errors (clean)

=== EC2 backend grep ===
4 matches for companyEmail/extractDomain in /var/www/crm-backend/dist/routes/job-leads.routes.js

=== PM2 status ===
crm-backend (id 146) — online, uptime 9s, 0 restarts attributed to this deploy
Health: {"status":"ok","timestamp":"2026-03-26T00:56:43.562Z","database":"connected"}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing TypeScript errors in unrelated files prevented `npm run build`**
- **Found during:** Task 1 verification
- **Issue:** `activityLogger.ts`, `email-templates.ts`, `super-admin.ts`, `users.ts`, and others have pre-existing schema mismatch errors (unrelated to this task)
- **Fix:** Used `npx tsc --noEmitOnError false` to emit JS despite other-file errors; confirmed 0 errors in `job-leads.routes.ts` specifically
- **Files modified:** None (compilation flag only)
- **Commit:** N/A (not a code change)

**2. [Observation] Bulk import bar label improved**
- The bulk bar "Import All" text was updated to "Add X leads to CRM" to match the plan's spirit ("Add X leads to CRM" wording in the spec)
- This is additive-only, no existing functionality removed

## Self-Check: PASSED

- `backend/src/routes/job-leads.routes.ts` — FOUND, contains `extractDomain`, `companyEmail`, `emailCandidates`
- `frontend/src/types/index.ts` — FOUND, contains `companyEmail?`, `companyDomain?`, `emailCandidates?`
- `frontend/src/pages/JobLeads/JobLeadsPage.tsx` — FOUND, contains `jl_guide_hidden`, `pulse-ring`, `Get Fresh Leads`, `navigator.clipboard`
- Commits 10a7f0a, 667df4f, fda181e — all present in git log
- EC2 deploy confirmed: PM2 online, health ok, backend route grep 4 matches
