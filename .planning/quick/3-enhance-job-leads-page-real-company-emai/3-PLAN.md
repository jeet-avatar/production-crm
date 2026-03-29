---
phase: quick
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/routes/job-leads.routes.ts
  - frontend/src/types/index.ts
  - frontend/src/pages/JobLeads/JobLeadsPage.tsx
autonomous: true
requirements: [JOB-LEADS-02]

must_haves:
  truths:
    - "Each lead row shows a real hr@domain.com email derived from the job URL — no fake placeholder text"
    - "Clicking the email pill copies it to clipboard and shows a brief checkmark confirmation"
    - "When a lead is imported to CRM the Contact record has email set to hr@domain.com"
    - "A large 'Get Fresh Leads' hero button replaces the small refresh icon — pulsing when table is empty"
    - "A collapsible step-by-step guide panel is visible above the stream tabs on first visit"
    - "The guide panel stays hidden after the user dismisses it (localStorage key 'jl_guide_hidden')"
  artifacts:
    - path: "backend/src/routes/job-leads.routes.ts"
      provides: "companyEmail + companyDomain + emailCandidates fields on each lead; email stored on Contact import"
    - path: "frontend/src/types/index.ts"
      provides: "JobLead interface extended with companyEmail, companyDomain, emailCandidates"
    - path: "frontend/src/pages/JobLeads/JobLeadsPage.tsx"
      provides: "Hero CTA button, guide panel, email pill column, companyEmail passed to import"
  key_links:
    - from: "frontend/src/pages/JobLeads/JobLeadsPage.tsx"
      to: "backend GET /api/job-leads/fetch"
      via: "jobLeadsApi.fetch() — receives leads with companyEmail field"
      pattern: "companyEmail"
    - from: "frontend/src/pages/JobLeads/JobLeadsPage.tsx"
      to: "backend POST /api/job-leads/import"
      via: "jobLeadsApi.import(leads) — lead objects include companyEmail"
      pattern: "companyEmail.*import"
    - from: "backend POST /api/job-leads/import"
      to: "prisma.contact.create"
      via: "email field set from lead.companyEmail"
      pattern: "email.*companyEmail"
---

<objective>
Enhance the Job Leads page with three improvements: (1) real company emails derived from job URL domains (hr@/careers@/jobs@), (2) a prominent hero "Get Fresh Leads" CTA with pulsing animation, and (3) a dismissible nursery-level step-by-step guide panel.

Purpose: Rajesh currently sees "Hiring Manager" contacts with no email — useless for outreach. After this task every imported contact has a real email address ready for campaign targeting, and the page teaches him exactly what to do next.
Output: Updated backend fetch (adds email fields) + updated frontend page (hero CTA, guide panel, email column, email passed on import).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Documents/production-crm-backup/backend/src/routes/job-leads.routes.ts
@/Users/jeet/Documents/production-crm-backup/frontend/src/types/index.ts
@/Users/jeet/Documents/production-crm-backup/frontend/src/pages/JobLeads/JobLeadsPage.tsx
@/Users/jeet/Documents/production-crm-backup/frontend/src/services/api.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — add domain-based email fields to fetch + store email on import</name>
  <files>backend/src/routes/job-leads.routes.ts</files>
  <action>
Edit `/Users/jeet/Documents/production-crm-backup/backend/src/routes/job-leads.routes.ts`.

**Step A — Add domain extraction helper** (after the `classifyStream` function, before the routes):

```typescript
function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
```

**Step B — Update the `leads` map in `GET /fetch`** to include email fields on each lead object.

Find the `leads = response.data.jobs.map((job: any) => ({` block (currently returns 8 fields: id, title, companyName, companyLogo, url, location, postedAt, stream, tags).

Add three new fields to each mapped lead object, after `tags`:

```typescript
companyDomain: extractDomain(job.url || '') || '',
companyEmail: extractDomain(job.url || '') ? `hr@${extractDomain(job.url || '')}` : '',
emailCandidates: extractDomain(job.url || '')
  ? [`hr@${extractDomain(job.url || '')}`, `careers@${extractDomain(job.url || '')}`, `jobs@${extractDomain(job.url || '')}`]
  : [],
```

Note: call `extractDomain` once per lead to avoid duplicating work — assign to a local variable inside the map callback:

```typescript
leads = response.data.jobs.map((job: any) => {
  const domain = extractDomain(job.url || '');
  return {
    id: job.id,
    title: job.title,
    companyName: job.company_name,
    companyLogo: job.company_logo || null,
    url: job.url,
    location: job.candidate_required_location || 'Remote',
    postedAt: job.publication_date,
    stream: classifyStream(job.title || '', job.description || ''),
    tags: job.tags || [],
    companyDomain: domain || '',
    companyEmail: domain ? `hr@${domain}` : '',
    emailCandidates: domain ? [`hr@${domain}`, `careers@${domain}`, `jobs@${domain}`] : [],
  };
});
```

**Step C — Update the import type and contact creation in `POST /import`**

In the `leads` destructure type at the top of the import handler, add `companyEmail?: string` to the array item type:

```typescript
const { leads } = req.body as {
  leads: Array<{
    id?: number;
    companyName: string;
    url: string;
    stream: string;
    title: string;
    location: string;
    companyEmail?: string;
  }>;
};
```

In the `prisma.contact.create` call, add `email: lead.companyEmail || undefined` to the data object (the field goes after `lastName: 'Manager'`):

```typescript
await prisma.contact.create({
  data: {
    firstName: 'Hiring',
    lastName: 'Manager',
    email: lead.companyEmail || undefined,
    title: lead.title,
    source: 'job_board',
    notes: `Job posting: ${lead.url}\nStream: ${lead.stream}\nLocation: ${lead.location}`,
    status: 'LEAD',
    companyId: company.id,
    userId,
  },
});
```

After writing, verify TypeScript compiles cleanly:
```bash
cd /Users/jeet/Documents/production-crm-backup/backend && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors before moving to Task 2.

Then compile to dist:
```bash
cd /Users/jeet/Documents/production-crm-backup/backend && npm run build 2>&1 | tail -10
```
  </action>
  <verify>
```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx tsc --noEmit 2>&1 | head -20
grep -n "companyEmail\|companyDomain\|emailCandidates\|extractDomain" src/routes/job-leads.routes.ts
grep -n "email.*companyEmail" src/routes/job-leads.routes.ts
ls dist/routes/job-leads.routes.js
```
  </verify>
  <done>
`npx tsc --noEmit` exits clean (0 errors). grep shows `extractDomain` function, `companyEmail`/`companyDomain`/`emailCandidates` in the fetch map, and `email: lead.companyEmail` in the import contact.create. `dist/routes/job-leads.routes.js` exists (recompiled).
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — hero CTA, guide panel, email column, email on import</name>
  <files>
    frontend/src/types/index.ts
    frontend/src/pages/JobLeads/JobLeadsPage.tsx
  </files>
  <action>
**Step A — Extend JobLead type in `/Users/jeet/Documents/production-crm-backup/frontend/src/types/index.ts`**

Add three optional fields to the existing `JobLead` interface (after `tags: string[];`):

```typescript
companyDomain?: string;
companyEmail?: string;
emailCandidates?: string[];
```

**Step B — Rewrite `/Users/jeet/Documents/production-crm-backup/frontend/src/pages/JobLeads/JobLeadsPage.tsx`**

Read the current file fully before replacing. The new version must retain ALL existing functionality (stream tabs, table, checkbox select, bulk import bar, success/error messages) and ADD the four new elements below.

Keep existing imports and add `ClipboardIcon` from `@heroicons/react/24/outline` to the import line.

**New state variables to add (alongside existing state):**
```typescript
const [guideHidden, setGuideHidden] = useState<boolean>(
  () => localStorage.getItem('jl_guide_hidden') === 'true'
);
const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
```

**1. Hero "Get Fresh Leads" CTA button**

Replace the existing header button block (the small `ArrowPathIcon` button at lines 107-128 of the original) with this larger hero button. The button label and icon change based on state:

```tsx
<button
  onClick={fetchLeads}
  disabled={loading}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, var(--accent-indigo), #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.75 : 1,
    boxShadow: leads.length === 0 && !loading
      ? '0 0 0 0 rgba(99,102,241,0.7)'
      : 'none',
    animation: leads.length === 0 && !loading ? 'pulse-ring 2s ease-out infinite' : 'none',
    transition: 'opacity 0.2s',
  }}
>
  <ArrowPathIcon style={{
    width: '20px',
    height: '20px',
    animation: loading ? 'spin 1s linear infinite' : 'none',
  }} />
  {loading ? 'Fetching fresh leads…' : '🚀 Get Fresh Leads'}
</button>
```

**2. Collapsible step-by-step guide panel**

Insert this block BETWEEN the header div and the stream tabs div (i.e., after `</div>` that closes the header, before the stream tabs `<div style={{ display: 'flex', gap: '8px'...}}`):

```tsx
{/* How-to guide panel — dismissible */}
{!guideHidden && (
  <div style={{
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '20px',
    position: 'relative',
  }}>
    <button
      onClick={() => {
        setGuideHidden(true);
        localStorage.setItem('jl_guide_hidden', 'true');
      }}
      style={{
        position: 'absolute',
        top: '14px',
        right: '16px',
        background: 'transparent',
        border: 'none',
        color: 'var(--text-secondary)',
        fontSize: '1.25rem',
        cursor: 'pointer',
        lineHeight: 1,
        padding: '0 4px',
      }}
      title="Dismiss guide"
    >
      ×
    </button>
    <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700, margin: '0 0 16px' }}>
      📖 How to use this page
    </h3>
    <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[
        { emoji: '🔍', text: 'Click the big blue button to find companies looking to hire people from India' },
        { emoji: '🏷️', text: 'Pick your stream at the top — NetSuite, Cybersecurity, or Staffing' },
        { emoji: '✅', text: 'Tick the boxes next to companies you want to reach out to' },
        { emoji: '📬', text: "Click 'Add to My CRM' — they go straight into your contacts list with an email address ready to use" },
        { emoji: '📧', text: 'Go to Campaigns → create a new campaign → pick these contacts → send your email!' },
      ].map((step, i) => (
        <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          <span style={{ marginRight: '8px' }}>{step.emoji}</span>
          {step.text}
        </li>
      ))}
    </ol>
  </div>
)}
```

**3. Email column in the table**

Update the table grid from `'40px 48px 1fr 1fr 130px 110px 110px 140px'` to `'40px 48px 1fr 1fr 200px 130px 110px 110px 140px'` (adds a 200px column for the email pill — applies to BOTH the header div and every row div).

Add the email column header cell after the "Company" header cell:
```tsx
<div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
```

Add the email pill cell in each row, after the Company cell and before the Job Title cell:
```tsx
{/* Email pill */}
<div>
  {lead.companyEmail ? (
    <button
      onClick={() => {
        navigator.clipboard.writeText(lead.companyEmail!);
        setCopiedEmail(lead.companyEmail!);
        setTimeout(() => setCopiedEmail(null), 2000);
      }}
      title="Click to copy email"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        background: 'rgba(99,102,241,0.12)',
        color: 'var(--accent-indigo)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontFamily: 'monospace',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        maxWidth: '180px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {copiedEmail === lead.companyEmail ? '✓ Copied' : lead.companyEmail}
    </button>
  ) : (
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.5 }}>—</span>
  )}
</div>
```

**4. Pass companyEmail in import call**

The `importLeads` function calls `jobLeadsApi.import(leadsToImport)`. The `leadsToImport` array items are `JobLead` objects which now include `companyEmail` — no change needed in `importLeads` itself since `jobLeadsApi.import` sends the full lead objects. Confirm the api.ts import call sends the whole lead object (it does: `{ leads }` — companyEmail is included automatically).

**5. Add @keyframes to the style block**

Update the existing `<style>` tag at the bottom to include the pulse-ring animation:

```tsx
<style>{`
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.6); }
    70% { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
    100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
  }
`}</style>
```

After writing the file, verify TypeScript compiles cleanly:
```bash
cd /Users/jeet/Documents/production-crm-backup/frontend && npx tsc --noEmit 2>&1 | head -30
```
Fix type errors before deploy.
  </action>
  <verify>
```bash
cd /Users/jeet/Documents/production-crm-backup/frontend
npx tsc --noEmit 2>&1 | head -20
grep -n "companyEmail\|companyDomain\|emailCandidates" src/types/index.ts
grep -n "guideHidden\|jl_guide_hidden\|pulse-ring\|Get Fresh Leads" src/pages/JobLeads/JobLeadsPage.tsx
grep -n "copiedEmail\|navigator.clipboard" src/pages/JobLeads/JobLeadsPage.tsx
```
  </verify>
  <done>
`npx tsc --noEmit` exits clean. `types/index.ts` shows `companyEmail?`, `companyDomain?`, `emailCandidates?`. `JobLeadsPage.tsx` contains `jl_guide_hidden`, `pulse-ring`, `Get Fresh Leads`, and `navigator.clipboard`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Build + deploy to EC2</name>
  <files></files>
  <action>
**Step A — Build frontend:**
```bash
cd /Users/jeet/Documents/production-crm-backup/frontend && npm run build 2>&1 | tail -15
```
Confirm `dist/index.html` exists after build.

**Step B — Deploy frontend to EC2:**
```bash
# SCP the dist folder to EC2 (use the same SSH key + host from prior deployments)
scp -r /Users/jeet/Documents/production-crm-backup/frontend/dist/* ubuntu@<EC2_HOST>:/tmp/brandmonkz-dist/
ssh ubuntu@<EC2_HOST> "sudo cp -r /tmp/brandmonkz-dist/* /var/www/brandmonkz/ && echo 'Frontend deployed'"
```

If the EC2 host/key alias is not known, check `~/.ssh/config` for the host alias used in Quick Task 02:
```bash
grep -A3 "brandmonkz\|crm\|EC2" ~/.ssh/config 2>/dev/null | head -20
```

**Step C — Deploy backend route to EC2:**

The EC2 production backend runs from `/var/www/crm-backend/dist/`. Deploy only the changed route file:
```bash
scp /Users/jeet/Documents/production-crm-backup/backend/dist/routes/job-leads.routes.js \
  ubuntu@<EC2_HOST>:/tmp/job-leads.routes.js
ssh ubuntu@<EC2_HOST> "sudo cp /tmp/job-leads.routes.js /var/www/crm-backend/dist/routes/job-leads.routes.js && echo 'Backend route deployed'"
```

The dist/app.js already has job-leads registered (from Quick Task 02) — no change needed there.

**Step D — Restart PM2:**
```bash
ssh ubuntu@<EC2_HOST> "pm2 restart crm-backend && pm2 logs crm-backend --lines 15 --nostream"
```

**Step E — Smoke test:**
```bash
# Verify the fetch endpoint now returns companyEmail field
# (use auth token from an existing logged-in session or test credentials)
curl -s "https://brandmonkz.com/api/job-leads/fetch" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import json,sys
data=json.load(sys.stdin)
leads=data.get('leads',[])
if leads:
    l=leads[0]
    print('companyEmail:', l.get('companyEmail','MISSING'))
    print('companyDomain:', l.get('companyDomain','MISSING'))
    print('emailCandidates:', l.get('emailCandidates','MISSING'))
else:
    print('No leads returned — Remotive may be rate limited, check shape only')
    print(list(data.keys()))
"
```

If TOKEN is not available in the shell, confirm the dist file was updated and PM2 is stable:
```bash
ssh ubuntu@<EC2_HOST> "grep -c 'companyEmail\|extractDomain' /var/www/crm-backend/dist/routes/job-leads.routes.js && pm2 list"
```
  </action>
  <verify>
```bash
ls /Users/jeet/Documents/production-crm-backup/frontend/dist/index.html
ls /Users/jeet/Documents/production-crm-backup/backend/dist/routes/job-leads.routes.js
# On EC2 (via ssh):
# grep -c "companyEmail" /var/www/crm-backend/dist/routes/job-leads.routes.js
# pm2 list (crm-backend process shows 'online')
```
  </verify>
  <done>
Frontend `dist/index.html` exists. Backend `dist/routes/job-leads.routes.js` contains `companyEmail`. EC2 PM2 process `crm-backend` is ONLINE with 0 restarts after deploy. Frontend is live at `https://brandmonkz.com`.
  </done>
</task>

</tasks>

<verification>
End-to-end checks after all tasks complete:

1. Backend route has email fields:
   `grep -c "companyEmail\|extractDomain" backend/src/routes/job-leads.routes.ts`
   Expected: 5+

2. Backend contact.create has email field:
   `grep -n "email.*companyEmail" backend/src/routes/job-leads.routes.ts`

3. Frontend type updated:
   `grep "companyEmail" frontend/src/types/index.ts`

4. Frontend guide panel:
   `grep "jl_guide_hidden\|How to use" frontend/src/pages/JobLeads/JobLeadsPage.tsx`

5. Frontend hero button:
   `grep "Get Fresh Leads\|pulse-ring" frontend/src/pages/JobLeads/JobLeadsPage.tsx`

6. Frontend email pill:
   `grep "navigator.clipboard\|copiedEmail" frontend/src/pages/JobLeads/JobLeadsPage.tsx`

7. No TypeScript errors:
   `cd backend && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit`
   Expected: silent exit (0)
</verification>

<success_criteria>
- Backend `GET /api/job-leads/fetch` returns each lead with `companyEmail: 'hr@domain.com'`, `companyDomain: 'domain.com'`, `emailCandidates: ['hr@...', 'careers@...', 'jobs@...']`
- Backend `POST /api/job-leads/import` creates Contact with `email` field set to `hr@domain.com`
- Job Leads page has a large gradient "🚀 Get Fresh Leads" button (not the old small ArrowPathIcon)
- Button pulses with `pulse-ring` animation when the leads table is empty
- A collapsible 5-step guide panel is visible above the stream tabs on first load
- Guide panel disappears permanently after clicking × (localStorage `jl_guide_hidden = 'true'`)
- Each lead row shows an email pill badge (`hr@domain.com`) after the company name column
- Clicking the email pill copies to clipboard and shows "✓ Copied" for 2 seconds
- Dark theme integrity maintained — all colors use CSS variables, no hardcoded hex
- TypeScript compiles clean in both backend and frontend (0 errors)
- EC2 PM2 process crm-backend is ONLINE and stable after deploy
</success_criteria>

<output>
After completion, create `.planning/quick/3-enhance-job-leads-page-real-company-emai/3-SUMMARY.md` with:
- What was changed (backend email fields, import email, frontend additions)
- Verification output (grep proofs, tsc clean, PM2 status, smoke test result)
- Any deviations (e.g., Prisma contact.email field name differs from assumption)
- EC2 deploy confirmation
</output>
