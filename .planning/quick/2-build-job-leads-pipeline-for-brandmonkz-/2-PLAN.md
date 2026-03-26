---
phase: quick
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/routes/job-leads.routes.ts
  - backend/src/app.ts
  - frontend/src/pages/JobLeads/JobLeadsPage.tsx
  - frontend/src/services/api.ts
  - frontend/src/App.tsx
  - frontend/src/components/Sidebar.tsx
autonomous: true
requirements: [JOB-LEADS-01]

must_haves:
  truths:
    - "User can click 'Fetch Leads' and see a table of remote job postings from Remotive API"
    - "Leads are auto-categorized into NetSuite / Cybersecurity / Staffing HR / Other tabs"
    - "User can click 'Add to CRM' on a row and it creates a Company + Contact in the CRM"
    - "User can bulk-select rows and import multiple leads at once"
    - "Service stream tag (e.g. 'NetSuite') is applied to the created Company record"
  artifacts:
    - path: "backend/src/routes/job-leads.routes.ts"
      provides: "GET /api/job-leads/fetch — scrape + classify, POST /api/job-leads/import — create Company+Contact"
    - path: "frontend/src/pages/JobLeads/JobLeadsPage.tsx"
      provides: "Stream filter tabs + lead table + Add to CRM / Bulk Import buttons"
  key_links:
    - from: "frontend/src/pages/JobLeads/JobLeadsPage.tsx"
      to: "/api/job-leads/fetch"
      via: "GET with optional ?stream= query param"
      pattern: "fetch.*api/job-leads/fetch"
    - from: "frontend/src/pages/JobLeads/JobLeadsPage.tsx"
      to: "/api/job-leads/import"
      via: "POST with array of job lead objects"
      pattern: "fetch.*api/job-leads/import"
    - from: "backend/src/routes/job-leads.routes.ts"
      to: "prisma.company.create + prisma.contact.create"
      via: "import endpoint"
      pattern: "prisma\\.company\\.create"
---

<objective>
Build a Job Leads Pipeline page that fetches remote job postings (companies hiring from India), classifies them by service stream, and lets the user import selected leads as CRM Company+Contact records.

Purpose: BrandMonkz needs a steady pipeline of warm outbound leads; scraping job boards identifies companies actively hiring in the target skill areas (NetSuite, Cyber, Staffing).
Output: /job-leads page with fetch + filter + import flow, backed by two new API endpoints.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Documents/production-crm-backup/backend/src/app.ts
@/Users/jeet/Documents/production-crm-backup/backend/src/routes/leads.routes.ts
@/Users/jeet/Documents/production-crm-backup/backend/prisma/schema.prisma
@/Users/jeet/Documents/production-crm-backup/frontend/src/App.tsx
@/Users/jeet/Documents/production-crm-backup/frontend/src/components/Sidebar.tsx
@/Users/jeet/Documents/production-crm-backup/frontend/src/services/api.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — job-leads routes (fetch + classify + import)</name>
  <files>
    backend/src/routes/job-leads.routes.ts
    backend/src/app.ts
  </files>
  <action>
Create `backend/src/routes/job-leads.routes.ts` using the same pattern as `leads.routes.ts`:
- `import express from 'express'`
- `import axios from 'axios'`
- `import { PrismaClient } from '@prisma/client'`
- `import { authenticate } from '../middleware/auth'`
- `router.use(authenticate)`

**GET /api/job-leads/fetch**

Fetches from Remotive public API (no key required): `https://remotive.com/api/remote-jobs?search=india`

Query param `?stream=` (optional) — if provided, filter results to that stream only.

Classification logic (pure keyword match on `title.toLowerCase() + description.toLowerCase()`):

```typescript
function classifyStream(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/netsuite|oracle netsuite|netsuite administrator|netsuite developer|erp/.test(text)) return 'NetSuite';
  if (/cybersecurity|cyber security|security analyst|soc analyst|siem|penetration testing|infosec/.test(text)) return 'Cybersecurity';
  if (/recruiter|talent acquisition|hr manager|human resources|staffing/.test(text)) return 'Staffing/HR';
  return 'Other';
}
```

For each job in `response.data.jobs`, map to:
```typescript
{
  id: job.id,
  title: job.title,
  companyName: job.company_name,
  companyLogo: job.company_logo,
  url: job.url,
  location: job.candidate_required_location || 'Remote',
  postedAt: job.publication_date,
  stream: classifyStream(job.title, job.description || ''),
  tags: job.tags || [],
}
```

Apply stream filter if `?stream=` query param is present (exact match after classification).

Return: `{ leads: [...], total: N, streams: { NetSuite: N, Cybersecurity: N, 'Staffing/HR': N, Other: N } }`

Handle axios errors gracefully: if Remotive returns non-200, return `{ leads: [], total: 0, streams: {}, error: 'Failed to fetch from job board' }` with 200 status (not 500 — avoids breaking the UI).

**POST /api/job-leads/import**

Body: `{ leads: [{ companyName, url, stream, title, location }] }`

For each lead:
1. `upsert` Company by name (use `findFirst` where `{ name: lead.companyName, userId: req.user.id }`, create if not found):
   ```typescript
   const company = await prisma.company.upsert({
     where: { domain: extractDomain(lead.url) || `job-${lead.id}` },
     update: {},
     create: {
       name: lead.companyName,
       website: lead.url,
       domain: extractDomain(lead.url) || undefined,
       industry: lead.stream,
       tags: [lead.stream, 'job-lead'],
       dataSource: 'job_board',
       userId: req.user.id,
     },
   });
   ```
   Note: `domain` must be unique in schema. Use `extractDomain` helper: `new URL(url).hostname` wrapped in try/catch returning null on parse failure. If domain is null, skip the `where: { domain }` upsert and use `create` directly to avoid unique constraint errors.

   Safer pattern — use findFirst + create instead of upsert to avoid domain unique conflicts:
   ```typescript
   let company = await prisma.company.findFirst({
     where: { name: lead.companyName, userId: req.user.id },
   });
   if (!company) {
     company = await prisma.company.create({
       data: {
         name: lead.companyName,
         website: lead.url,
         industry: lead.stream,
         tags: [lead.stream, 'job-lead'],
         dataSource: 'job_board',
         userId: req.user.id,
       },
     });
   }
   ```

2. Create a Contact linked to that Company (the "hiring manager" placeholder):
   ```typescript
   await prisma.contact.create({
     data: {
       firstName: 'Hiring',
       lastName: 'Manager',
       title: lead.title, // job title being hired for
       source: 'job_board',
       notes: `Job posting: ${lead.url}\nStream: ${lead.stream}\nLocation: ${lead.location}`,
       status: 'LEAD',
       companyId: company.id,
       userId: req.user.id,
     },
   });
   ```

Return: `{ imported: N, companies: [...company ids] }`

**Register in app.ts:**
Add after the `leadsRoutes` import and mount:
```typescript
import jobLeadsRoutes from './routes/job-leads.routes';
// ...
app.use('/api/job-leads', jobLeadsRoutes);
```

After writing files, compile to verify no TypeScript errors:
```bash
cd /Users/jeet/Documents/production-crm-backup/backend && npx tsc --noEmit 2>&1 | head -30
```
Fix any type errors before proceeding.
  </action>
  <verify>
```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx tsc --noEmit 2>&1 | head -20
grep -n "job-leads" src/app.ts
grep -n "classifyStream\|GET\|POST" src/routes/job-leads.routes.ts
```
  </verify>
  <done>
TypeScript compiles clean. `grep` shows job-leads imported and mounted in app.ts. Route file contains both GET and POST handlers with classifyStream function.
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — JobLeadsPage with stream tabs + table + import</name>
  <files>
    frontend/src/pages/JobLeads/JobLeadsPage.tsx
    frontend/src/services/api.ts
    frontend/src/App.tsx
    frontend/src/components/Sidebar.tsx
  </files>
  <action>
**1. Add API methods to `frontend/src/services/api.ts`:**

Find the existing `api` object and add (following existing fetch/axios patterns in that file):
```typescript
jobLeads: {
  fetch: (stream?: string) =>
    apiCall<{ leads: JobLead[]; total: number; streams: Record<string, number> }>(
      `/job-leads/fetch${stream ? `?stream=${encodeURIComponent(stream)}` : ''}`,
      { method: 'GET' }
    ),
  import: (leads: JobLead[]) =>
    apiCall<{ imported: number; companies: string[] }>(
      '/job-leads/import',
      { method: 'POST', body: JSON.stringify({ leads }) }
    ),
},
```

Also add this type near the top of api.ts or in `frontend/src/types/index.ts`:
```typescript
export interface JobLead {
  id: number;
  title: string;
  companyName: string;
  companyLogo?: string;
  url: string;
  location: string;
  postedAt: string;
  stream: 'NetSuite' | 'Cybersecurity' | 'Staffing/HR' | 'Other';
  tags: string[];
}
```

**2. Create `frontend/src/pages/JobLeads/JobLeadsPage.tsx`:**

Full component with:
- `const STREAMS = ['All', 'NetSuite', 'Cybersecurity', 'Staffing/HR', 'Other']`
- State: `leads`, `loading`, `error`, `activeStream` (default 'All'), `selectedIds` (Set<number>), `importing` boolean, `importedCount`
- `fetchLeads()` calls `api.jobLeads.fetch(activeStream === 'All' ? undefined : activeStream)` on mount and when `activeStream` changes
- Stream tab bar at top — pill tabs styled with `var(--bg-elevated)` / `var(--accent-indigo)` for active, `var(--text-secondary)` for inactive. Show count badge from `streams` response on each tab.
- Table columns: Logo (24px img, fallback to BuildingOfficeIcon), Company, Job Title, Location, Stream badge (color-coded), Posted date, Actions
- Stream badge colors (use Tailwind-compatible inline style or utility classes):
  - NetSuite: indigo/purple
  - Cybersecurity: red/rose
  - Staffing/HR: emerald/green
  - Other: gray
- Each row has a checkbox (controlled via `selectedIds`) and an "Add to CRM" button (imports single row)
- Bulk import bar: shows when `selectedIds.size > 0` — sticky bar at bottom: "X leads selected — Import All" button
- "Fetch Leads" button at top right re-fetches (with loading spinner)
- On successful import: show inline success toast using a simple `setTimeout`-cleared state message: "Imported N leads to CRM" in green. Do NOT add a third-party toast library.
- Empty state: when no leads and not loading, show centered message "No job leads found for this stream. Try 'All' or click Fetch Leads."
- Error state: show error message in `var(--text-danger)` color.

**Color rules (Indigo Noir dark theme):**
- Backgrounds: `var(--bg-base)`, `var(--bg-elevated)`, `var(--bg-card)`
- Text: `var(--text-primary)`, `var(--text-secondary)`
- Borders: `var(--border-subtle)`
- Accent: `var(--accent-indigo)` for active tab, primary button bg
- DO NOT use hardcoded hex colors or Tailwind color classes like `bg-gray-800` (they break dark theme)
- Use `var(--text-danger)` for error, `var(--text-success)` for success messages
- Button pattern: primary = `bg-[var(--accent-indigo)] text-white hover:opacity-90`, secondary = `border border-[var(--border-subtle)] text-[var(--text-secondary)]`

**3. Wire routing in `frontend/src/App.tsx`:**

Add import at top:
```typescript
import JobLeadsPage from './pages/JobLeads/JobLeadsPage';
```

Add route inside the authenticated Layout block (after the `import` route, before the wildcard):
```tsx
<Route path="job-leads" element={<JobLeadsPage />} />
```

**4. Add sidebar entry in `frontend/src/components/Sidebar.tsx`:**

Import `BriefcaseIcon` from `@heroicons/react/24/outline` (add to existing destructured import).

Add to the `navigation` array after 'CRM Import':
```typescript
{ name: 'Job Leads', href: '/job-leads', icon: BriefcaseIcon },
```
  </action>
  <verify>
```bash
cd /Users/jeet/Documents/production-crm-backup/frontend
npx tsc --noEmit 2>&1 | head -30
grep -n "job-leads\|JobLeads" src/App.tsx
grep -n "Job Leads\|BriefcaseIcon" src/components/Sidebar.tsx
grep -rn "jobLeads" src/services/api.ts
```
  </verify>
  <done>
TypeScript compiles clean. App.tsx has `job-leads` route. Sidebar.tsx has "Job Leads" nav item. api.ts has jobLeads.fetch and jobLeads.import methods. JobLeadsPage.tsx exists with stream tabs, table, checkbox selection, and import buttons.
  </done>
</task>

<task type="auto">
  <name>Task 3: Build backend + restart PM2</name>
  <files></files>
  <action>
Build the backend TypeScript to JavaScript (PM2 runs compiled JS):

```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npm run build 2>&1 | tail -20
```

If `npm run build` is not in package.json scripts, use `npx tsc` directly:
```bash
npx tsc 2>&1 | tail -20
```

Check what PM2 process name is:
```bash
pm2 list
```

Restart the backend PM2 process (use actual process name from pm2 list):
```bash
pm2 restart <process-name>
pm2 logs <process-name> --lines 20 --nostream
```

Verify the new routes are live:
```bash
# Get auth token first (use existing credentials pattern from leads.routes.ts tests)
# Then test the fetch endpoint returns leads array
curl -s -H "Authorization: Bearer $TOKEN" https://brandmonkz.com/api/job-leads/fetch | python3 -m json.tool | head -40
```

If the server is running locally (not behind auth on GET for testing), verify the endpoint exists at minimum:
```bash
grep -rn "job-leads" /Users/jeet/Documents/production-crm-backup/backend/dist/ 2>/dev/null | head -5
# OR check compiled output
ls /Users/jeet/Documents/production-crm-backup/backend/dist/routes/job-leads* 2>/dev/null
```

Build frontend:
```bash
cd /Users/jeet/Documents/production-crm-backup/frontend
npm run build 2>&1 | tail -20
```

If frontend is served via PM2/nginx, confirm build output is in the expected dist/ location:
```bash
ls /Users/jeet/Documents/production-crm-backup/frontend/dist/ | head -10
```
  </action>
  <verify>
```bash
pm2 list
ls /Users/jeet/Documents/production-crm-backup/backend/dist/routes/job-leads.routes.js
ls /Users/jeet/Documents/production-crm-backup/frontend/dist/index.html
pm2 logs --lines 10 --nostream 2>/dev/null | grep -v "^$" | tail -10
```
  </verify>
  <done>
Backend dist contains `job-leads.routes.js`. PM2 process is running (online). Frontend dist/index.html exists. No crash logs in PM2 output. Backend compile succeeded without errors.
  </done>
</task>

</tasks>

<verification>
End-to-end check after all tasks complete:

1. Route exists in compiled backend:
   `ls backend/dist/routes/job-leads.routes.js`

2. Route registered in compiled app:
   `grep -n "job-leads" backend/dist/app.js`

3. Frontend page exists:
   `ls frontend/src/pages/JobLeads/JobLeadsPage.tsx`

4. Frontend route registered:
   `grep "job-leads" frontend/src/App.tsx`

5. Sidebar entry added:
   `grep "Job Leads" frontend/src/components/Sidebar.tsx`

6. No TypeScript errors:
   `cd backend && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit`
</verification>

<success_criteria>
- `GET /api/job-leads/fetch` returns `{ leads: [...], total: N, streams: {...} }` from Remotive API
- Each lead has `stream` field correctly classified by keyword regex
- `POST /api/job-leads/import` creates Company + Contact records in the CRM database
- /job-leads page renders with 4 stream filter tabs + lead table
- "Add to CRM" button on a row triggers import and shows success message
- Bulk checkbox selection + "Import All" works for multiple rows
- Dark theme uses CSS variables only — no hardcoded colors
- PM2 backend process is running (not crashed)
</success_criteria>

<output>
After completion, create `.planning/quick/2-build-job-leads-pipeline-for-brandmonkz-/2-SUMMARY.md` with:
- What was built (endpoints, page, components)
- Any deviations from plan (e.g., Remotive API shape differences)
- Verification output (grep proofs, tsc clean, pm2 status)
- Known limitations (e.g., Adzuna not implemented — Remotive only for simplicity)
</output>
