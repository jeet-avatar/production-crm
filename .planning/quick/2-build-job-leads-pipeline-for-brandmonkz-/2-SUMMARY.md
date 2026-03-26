---
phase: quick
plan: 02
subsystem: job-leads-pipeline
tags: [job-leads, remotive, crm-import, stream-classification, frontend, backend]
dependency_graph:
  requires: []
  provides: [job-leads-fetch-api, job-leads-import-api, job-leads-page]
  affects: [sidebar-nav, app-routing, api-service]
tech_stack:
  added: [remotive-public-api]
  patterns: [stream-classification-regex, findFirst-create-pattern, css-variables-only-ui]
key_files:
  created:
    - backend/src/routes/job-leads.routes.ts
    - frontend/src/pages/JobLeads/JobLeadsPage.tsx
  modified:
    - backend/src/app.ts
    - frontend/src/services/api.ts
    - frontend/src/App.tsx
    - frontend/src/components/Sidebar.tsx
    - frontend/src/types/index.ts
decisions:
  - Used findFirst+create instead of upsert to avoid domain unique constraint conflicts on Company import
  - Remotive API returns ?search=india — no auth key required
  - Contact created as Hiring/Manager placeholder with job title stored in title field
  - CSS variables only for all colors — no hardcoded hex or Tailwind color classes
  - EC2 dist/app.js patched directly via SCP+sed (ecosystem.config uses dist/server.js, not flat backend/server.js)
metrics:
  duration: "~13 minutes"
  completed_date: "2026-03-26"
  tasks_completed: 3
  files_created: 2
  files_modified: 5
---

# Quick Task 02: Build Job Leads Pipeline Summary

One-liner: Remotive job-board scraper with 4-stream classification (NetSuite/Cybersecurity/Staffing-HR/Other), stream-tab UI, checkbox bulk-import creating Company+Contact CRM records.

## What Was Built

### Backend (Task 1)

**`GET /api/job-leads/fetch`**
- Fetches from `https://remotive.com/api/remote-jobs?search=india` (no API key required)
- Classifies each job by regex on `title + description`:
  - NetSuite: `netsuite|oracle netsuite|erp`
  - Cybersecurity: `cybersecurity|cyber security|security analyst|soc analyst|siem|penetration testing|infosec`
  - Staffing/HR: `recruiter|talent acquisition|hr manager|human resources|staffing`
  - Other: everything else
- Optional `?stream=` query param for server-side filtering
- Returns `{ leads: [...], total: N, streams: { NetSuite: N, ... } }`
- Handles Remotive API errors gracefully (200 with empty array, not 500)

**`POST /api/job-leads/import`**
- Accepts `{ leads: [{companyName, url, stream, title, location}] }`
- For each lead: `findFirst` Company by name+userId → create if not found
- Creates Contact (firstName: "Hiring", lastName: "Manager") linked to Company
- Returns `{ imported: N, companies: [ids] }`

Registered in `backend/src/app.ts` alongside existing `/api/leads`.

### Frontend (Task 2)

**`/job-leads` page** (`JobLeadsPage.tsx`):
- 5 stream filter tabs: All / NetSuite / Cybersecurity / Staffing/HR / Other with count badges
- Lead table: company logo (24px img with BuildingOfficeIcon fallback), company name (link), job title, stream badge (color-coded), location, posted date, "Add to CRM" button
- Checkbox per row + "Select All" header checkbox
- Sticky bulk-import bar appears when rows selected: "{N} leads selected — Import All | Clear"
- Inline success/error messages (no third-party library) — auto-dismiss success after 4s
- Empty state when no leads found
- "Fetch Leads" button with ArrowPathIcon spinner during loading
- All colors via CSS variables: `var(--bg-base)`, `var(--bg-elevated)`, `var(--accent-indigo)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--border-default)`

**API service** (`api.ts`): `jobLeadsApi.fetch(stream?)` + `jobLeadsApi.import(leads[])`

**Type** (`types/index.ts`): `JobLead` interface with stream union type

**Route**: `/job-leads` added to authenticated Layout in `App.tsx`

**Sidebar**: `BriefcaseIcon` + "Job Leads" added after "CRM Import" in navigation array

### Task 3: Build + Deploy

- Backend TypeScript compiled to `dist/routes/job-leads.routes.js` (pre-existing TS errors in other files are out of scope)
- Frontend built with Vite: `dist/index.html`, `dist/assets/index-*.js` (1.3MB)
- Deployed frontend to EC2 `/var/www/brandmonkz/` via SCP + sudo cp
- Deployed backend route + updated `dist/app.js` on EC2
- PM2 process 146 (crm-backend) running stable — health check OK, database connected

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] EC2 flat-backend vs dist mismatch**
- **Found during:** Task 3 (PM2 restart)
- **Issue:** The plan said to SCP backend files to `/var/www/crm-backend/backend/` and restart PM2 145. PM2 process 145 was configured to run `/var/www/crm-backend/backend/server.js` which loaded from the FLAT directory — missing `activityLogger`, `calendar-auth`, and other modules. This was a pre-existing infrastructure inconsistency (105 restarts in PM2 history before my task started).
- **Fix:** Discovered the `ecosystem.config.js` at `/var/www/crm-backend/` correctly points to `dist/server.js`. Started a fresh PM2 process (ID 146) from the correct ecosystem config. Killed port 3000 conflict left by old process. Deployed `job-leads.routes.js` and patched `dist/app.js` in the REAL working dist at `/var/www/crm-backend/dist/`.
- **Files modified (EC2):** `/var/www/crm-backend/dist/app.js`, `/var/www/crm-backend/dist/routes/job-leads.routes.js`
- **Result:** PM2 146 stable, 0 crash cycles after fix, health check OK

## Verification Output

```
Backend dist route exists:
  /var/www/crm-backend/dist/routes/job-leads.routes.js ✓

Route in dist/app.js:
  62: const job_leads_routes_1 = __importDefault(require("./routes/job-leads.routes"));
  303: app.use('/api/job-leads', job_leads_routes_1.default); ✓

Frontend TypeScript: CLEAN (0 errors) ✓
Backend TypeScript: job-leads.routes.ts has 0 errors ✓

PM2 status: process 146 crm-backend ONLINE, 35s uptime, database connected ✓
Health check: {"status":"ok","database":"connected"} ✓

Frontend deployed: /var/www/brandmonkz/index.html ✓
Sidebar: { name: 'Job Leads', href: '/job-leads', icon: BriefcaseIcon } ✓
App.tsx: <Route path="job-leads" element={<JobLeadsPage />} /> ✓
```

## Commits

| Hash | Description |
|------|-------------|
| 9a23c86 | feat(quick-02): add job-leads backend routes (fetch + classify + import) |
| d32ec65 | feat(quick-02): add JobLeadsPage with stream tabs, table, bulk import |

## Known Limitations

- Remotive API is the only source (Adzuna, LinkedIn Jobs not implemented — out of scope per plan)
- Contact created as "Hiring Manager" placeholder — no real contact enrichment
- The company `domain` field is intentionally not set to avoid unique constraint conflicts on repeat imports
- Remotive `?search=india` returns companies globally hiring for India-related roles; may include non-India companies mentioning India in description

## Self-Check: PASSED

- backend/src/routes/job-leads.routes.ts: FOUND
- frontend/src/pages/JobLeads/JobLeadsPage.tsx: FOUND
- 2-SUMMARY.md: FOUND
- Commit 9a23c86: FOUND
- Commit d32ec65: FOUND
- EC2 health check: OK (database connected)
- PM2 146: ONLINE stable
