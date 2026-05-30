---
phase: quick-5
plan: 5
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/services/api.ts
  - frontend/src/pages/Contacts/ContactList.tsx
  - backend/src/routes/contacts.ts
autonomous: true
requirements: [QT5-01, QT5-02, QT5-03]

must_haves:
  truths:
    - "GET /contacts?source=apollo loads from frontend and triggers backend filter (network shows ?source=apollo on /api/contacts call)"
    - "ContactList filters to only Apollo-imported contacts when ?source=apollo is in the URL"
    - "Apollo VP Finance Cybersecurity contact cmpsz0d3q000350mxrlau3sg5 is visible on /contacts?source=apollo"
    - "Each row whose contact.source === 'apollo' displays an 'Apollo' badge"
    - "Each row whose contact.stream is set displays a stream badge (e.g. 'Cybersecurity')"
    - "A dismissible/clearable filter chip at the top of the page reads 'Source: Apollo' when ?source=apollo is active"
    - "Removing the source filter (or visiting /contacts with no source param) restores the unfiltered ALL contacts view"
  artifacts:
    - path: "frontend/src/services/api.ts"
      provides: "contactsApi.getAll signature extended with optional `source?: string`"
      contains: "source?: string"
    - path: "frontend/src/pages/Contacts/ContactList.tsx"
      provides: "Reads ?source from URL, passes to API, renders source + stream badges, renders source filter chip"
      contains: "searchParams.get('source')"
    - path: "backend/src/routes/contacts.ts"
      provides: "GET /api/contacts accepts ?source=apollo query param and filters Contact rows by source column"
      contains: "source"
  key_links:
    - from: "frontend/src/pages/Contacts/ContactList.tsx"
      to: "frontend/src/services/api.ts (contactsApi.getAll)"
      via: "source param plumbed through useSearchParams → loadContacts → contactsApi.getAll({ source })"
      pattern: "contactsApi\\.getAll\\([^)]*source"
    - from: "frontend/src/services/api.ts (contactsApi.getAll)"
      to: "backend/src/routes/contacts.ts (router.get('/'))"
      via: "apiClient.get('/contacts', { params: { source } }) → req.query.source"
      pattern: "params\\?:\\s*\\{[^}]*source"
    - from: "backend/src/routes/contacts.ts"
      to: "prisma.contact.findMany where clause"
      via: "if (source) where.source = source"
      pattern: "where\\.source\\s*="
    - from: "frontend Contact interface"
      to: "row rendering"
      via: "contact.source + contact.stream fields propagate to badges"
      pattern: "contact\\.(source|stream)"
---

<objective>
Close the known visibility gap from Phase 4: `/contacts?source=apollo` currently does nothing — the link exists on `ApolloPage.tsx` and Phase 4's locked decision (`04-04-SUMMARY.md`) assumed `ContactList` already filtered by source, but verification shows it does NOT. ContactList reads `?source` from neither URL nor the API call, and never renders the Phase-4 `source` or `stream` columns on rows.

This plan wires three small surfaces end-to-end so the live Apollo contact `cmpsz0d3q000350mxrlau3sg5` (VP Finance, Cybersecurity stream) becomes visible in production via the exact deep-link that Phase 4 shipped:

Purpose: Make the Apollo → ContactList visibility loop work in production. The Apollo contact is already in the production DB; only the rendering + filtering is missing.

Output: Wired frontend filter + backend filter + Apollo/stream badges + deployed to EC2 + live-verified against `https://brandmonkz.com/contacts?source=apollo`.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@frontend/src/pages/Contacts/ContactList.tsx
@frontend/src/services/api.ts
@backend/src/routes/contacts.ts
@frontend/src/pages/Apollo/ApolloPage.tsx
@.planning/phases/04-apollo-import-and-auto-campaign/04-04-SUMMARY.md
@.planning/phases/04-apollo-import-and-auto-campaign/04-06-SUMMARY.md
@.planning/quick/3-enhance-job-leads-page-real-company-emai/3-PLAN.md

**Locked context absorbed:**
- Backend route file is `backend/src/routes/contacts.ts` (mounted at `/api/contacts` per `backend/src/app.ts:291`). The other file `contact.routes.ts` is NOT mounted — touch only `contacts.ts`.
- `Contact` model already has `source String?` (schema line 272) and `stream String?` (schema line 297) + `@@index([stream])`. No Prisma changes needed.
- GET `/api/contacts` handler at `contacts.ts:52-164` already destructures `search, status, ids, page, limit` from `req.query` and builds a `where` clause. The `source` filter is a 3-line addition mirroring the existing `status` filter pattern at lines 110-112.
- `contactsApi.getAll` at `frontend/src/services/api.ts:45-49` currently signs `params?: { search?: string; status?: string; page?: number; limit?: number }`. Append `source?: string` and the params object passes through to axios untouched.
- `ContactList.tsx` already uses `useSearchParams` (line 56) and `searchParams.get(...)` for `addContact`/`companyId`/`companyName` (lines 96-99) but does NOT read `source`. Add a `sourceFilter` state derived from URL on mount + on URL change, pass to `loadContacts`, include in the `useEffect` dep array (line 193).
- Existing filter row lives at `contacts.tsx` lines 610-661 (Search input, Group Filter, Status Filter). Insert the dismissible Source chip OUTSIDE that filter row, ABOVE it, conditional on `sourceFilter` being non-empty — keeps the existing 3-column md flex layout intact.
- Contact row rendering happens twice in ContactList: the "company header row" (~line 814 onwards) and the expanded "additional contacts" row (~line 949 onwards). Badges must be added to BOTH render sites — put them next to the existing status badge (the `<span className={statusColors[displayContact.status]}>` at line 884 / equivalent at line 982) so they share the row's status-cell visual rhythm.
- Frontend deploy path on EC2 = `/var/www/brandmonkz/` (per quick-3 plan lines 405-407). Backend deploy path = `/var/www/crm-backend/dist/` (per CLAUDE.md memory + Phase 4 ops). SSH = `ec2-user@100.24.213.224 -i ~/.ssh/brandmonkz-crm.pem` (per Phase 4 SMOKE log lines 11/65/142).
- pm2 env-reload pitfall: `set -a && source .env && set +a && pm2 restart crm-backend --update-env`.
- nginx 403 trap: every curl to `brandmonkz.com` MUST set `User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0`.
- JWT smoke pattern: mint locally with `issuer:'crm-api' + audience:'crm-client'` claims (per `04-06-SUMMARY.md` decision 4). Use the same harvested `JWT_SECRET` from EC2.
- Branch is `production` at 6d1aa88 synced to origin. Each task commits atomically to this branch. Author identity = `jm@techcloudpro.com` / `jeet-avatar`. Push at the end of Task 3.

**Hard scope boundaries (DO NOT touch):**
- `backend/src/routes/campaigns.ts` (SES firewall — Phase 4 rule)
- `backend/src/services/awsSES.ts`
- `frontend/src/pages/Apollo/ApolloPage.tsx` (producer is correct)
- `frontend/src/components/NetSuiteCampaignWizard.tsx` (producer is correct)
- `backend/prisma/schema.prisma` (source + stream columns already exist)
- No `git push --force` under any condition

**Apollo VP Finance Cybersecurity contact (the live verification target):** ID `cmpsz0d3q000350mxrlau3sg5`. Already exists in prod DB per the locked context. After deploy, hitting `https://brandmonkz.com/contacts?source=apollo` MUST display this contact (and only Apollo contacts) with both an "Apollo" badge and a "Cybersecurity" stream badge on its row.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire source filter end-to-end (backend route + api client + ContactList read/pass/render)</name>
  <files>backend/src/routes/contacts.ts, frontend/src/services/api.ts, frontend/src/pages/Contacts/ContactList.tsx</files>
  <action>
**A. Backend — `backend/src/routes/contacts.ts` (router.get('/') handler, lines 52-117).**

1. Add `source` to the destructured query at line 54-66. New shape:
```ts
const {
  search,
  status,
  ids,
  source,           // NEW
  page = '1',
  limit = '10'
} = req.query as {
  search?: string;
  status?: string;
  ids?: string;
  source?: string;  // NEW
  page?: string;
  limit?: string;
};
```

2. Immediately after the existing `if (status && status !== '') { where.status = status; }` block (lines 110-112), add the symmetric source filter block:
```ts
if (source && source !== '') {
  where.source = source;
}
```

DO NOT change anything else in the handler. DO NOT touch authentication, pagination, the team-collaboration `where.AND` block, or the `ids` filter. DO NOT touch any other route in the file.

**B. Frontend API client — `frontend/src/services/api.ts` (lines 45-49).**

Extend the `contactsApi.getAll` signature to accept `source?: string`. Final shape:
```ts
getAll: async (params?: { search?: string; status?: string; source?: string; page?: number; limit?: number }) => {
  const response = await apiClient.get('/contacts', { params });
  return response.data;
},
```

That is the ONLY change to `api.ts`. Do not touch `getByIds` or any other client method. The params object passes through to axios as query string — no further plumbing needed.

**C. Frontend page — `frontend/src/pages/Contacts/ContactList.tsx`.**

C1. **Add `source` to the Contact interface (lines 16-31)** so TypeScript sees the new field on row renders:
```ts
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  source?: string;   // NEW — Phase 4 source tracking ('apollo' | 'job_leads' | 'csv_import' | 'manual' | ...)
  stream?: string;   // NEW — Phase 4 stream classification ('NetSuite' | 'AI/ML' | 'Cybersecurity' | ...)
  company?: {
    id: string;
    name: string;
  };
  status: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'COLD' | 'WARM' | 'HOT' | 'CLOSED_WON' | 'CLOSED_LOST';
  tags: { id: string; name: string; color: string }[];
  customFields?: Record<string, any>;
  createdAt: string;
}
```

C2. **Add `sourceFilter` state derived from the URL.** Right after the existing `statusFilter` useState (around line 62), add:
```ts
const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') || '');
```

And add a useEffect to keep `sourceFilter` in sync with URL changes (place AFTER the existing addContact useEffect that ends around line 127):
```ts
// Sync sourceFilter from URL — supports deep links like /contacts?source=apollo
useEffect(() => {
  setSourceFilter(searchParams.get('source') || '');
}, [searchParams]);
```

C3. **Pass `source` into `loadContacts` → API call.** Modify the `contactsApi.getAll` call at lines 134-139 to include source:
```ts
const response = await contactsApi.getAll({
  search: searchTerm,
  status: statusFilter || undefined,
  source: sourceFilter || undefined,   // NEW
  page: 1,
  limit: 1000,
});
```

And add `sourceFilter` to the dep array at line 193:
```ts
}, [searchTerm, statusFilter, sourceFilter]);
```

C4. **Render the dismissible filter chip.** Place a new block IMMEDIATELY ABOVE the existing Filters div (line 610: `<div style={{ padding: '16px 24px', borderBottom: '1px solid #2a2a44', background: '#12121f' }}>`). Conditional on `sourceFilter`:
```tsx
{sourceFilter && (
  <div style={{ padding: '12px 24px', background: '#12121f', borderBottom: '1px solid #2a2a44' }}>
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(99, 102, 241, 0.15)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: '999px',
        color: '#A5B4FC',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      Source: {sourceFilter.charAt(0).toUpperCase() + sourceFilter.slice(1)}
      <button
        type="button"
        onClick={() => {
          searchParams.delete('source');
          setSearchParams(searchParams);
          setSourceFilter('');
        }}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#A5B4FC',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
        }}
        title="Clear source filter"
        aria-label="Clear source filter"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  </div>
)}
```

(`XMarkIcon` is already imported on line 3 — no new imports needed.)

C5. **Render the Apollo + stream badges on rows.** Two render sites:

Site 1 — Company header row, status cell at ~line 883-887. Currently:
```tsx
<td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
  <span className={statusColors[displayContact.status]}>
    {displayContact.status.replace('_', ' ')}
  </span>
</td>
```
Change to (wrap the status span + new badges in a flex container so they share the row's status cell):
```tsx
<td style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e36", color: "#F1F5F9", fontSize: "13px" }}>
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className={statusColors[displayContact.status]}>
      {displayContact.status.replace('_', ' ')}
    </span>
    {displayContact.source === 'apollo' && (
      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
        Apollo
      </span>
    )}
    {displayContact.stream && (
      <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
        {displayContact.stream}
      </span>
    )}
  </div>
</td>
```

Site 2 — Expanded contacts row, status cell at ~line 982 (the `companyContacts.slice(1).map((contact) => ...)` block around lines 949-1024). Apply the SAME pattern — replace the standalone `<span className={statusColors[contact.status]}>...` with the same flex wrapper, but read `contact.source` and `contact.stream` (the inner-loop variable name is `contact`, NOT `displayContact`). Grep for the second occurrence of `statusColors[` in that file to find the exact line.

DO NOT touch the duplicate-detection render block (around line 1218+) — it has a different layout and is out of scope for this surface (existing TODO behavior).

DO NOT change the existing Search input, Status Filter dropdown, Group Filter dropdown, or any pagination logic. The new source filter is URL-driven only (Phase 4 deep link is the only producer).

**D. Build + commit.**

```bash
cd /Users/jeet/production-crm/backend && npx tsc --noEmit
cd /Users/jeet/production-crm/frontend && npx tsc --noEmit
```
Both MUST exit 0.

Commit atomically:
```bash
cd /Users/jeet/production-crm
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
  add backend/src/routes/contacts.ts frontend/src/services/api.ts frontend/src/pages/Contacts/ContactList.tsx
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
  commit -m "feat(quick-5): wire ?source=apollo filter end-to-end with Apollo + stream badges

- backend/src/routes/contacts.ts: accept ?source query param + filter where.source
- frontend/src/services/api.ts: extend contactsApi.getAll signature with source?: string
- frontend/src/pages/Contacts/ContactList.tsx:
  * Add source + stream to Contact interface
  * Read ?source from URL, drive new sourceFilter state, pass to API
  * Render dismissible 'Source: Apollo' chip when sourceFilter is set
  * Render Apollo + stream badges on contact rows (both header + expanded)
- Closes the known visibility gap from Phase 4 (04-04-SUMMARY locked decision)
  that assumed ContactList already filtered by source — it did not.
"
```
  </action>
  <verify>
```bash
# Backend filter present
grep -n "where\.source\s*=" /Users/jeet/production-crm/backend/src/routes/contacts.ts
# expect 1 hit

# Frontend api signature has source
grep -n "source?: string" /Users/jeet/production-crm/frontend/src/services/api.ts
# expect 1 hit on line ~46

# ContactList reads ?source
grep -n "searchParams.get('source')" /Users/jeet/production-crm/frontend/src/pages/Contacts/ContactList.tsx
# expect 2 hits (initial state + sync useEffect)

# ContactList passes source to API
grep -n "source: sourceFilter" /Users/jeet/production-crm/frontend/src/pages/Contacts/ContactList.tsx
# expect 1 hit

# ContactList renders Apollo + stream badges (both sites)
grep -c "displayContact\.source === 'apollo'\|contact\.source === 'apollo'" /Users/jeet/production-crm/frontend/src/pages/Contacts/ContactList.tsx
# expect 2 (one per render site)

grep -c "displayContact\.stream\|contact\.stream" /Users/jeet/production-crm/frontend/src/pages/Contacts/ContactList.tsx
# expect >=2

# Filter chip present
grep -n "Source: {sourceFilter" /Users/jeet/production-crm/frontend/src/pages/Contacts/ContactList.tsx
# expect 1 hit

# Scope boundaries respected
git -C /Users/jeet/production-crm diff --name-only HEAD | grep -E "campaigns\.ts|awsSES\.ts|ApolloPage\.tsx|NetSuiteCampaignWizard\.tsx|schema\.prisma"
# MUST be empty (zero hits)

# tsc clean
cd /Users/jeet/production-crm/backend && npx tsc --noEmit && echo "backend tsc OK"
cd /Users/jeet/production-crm/frontend && npx tsc --noEmit && echo "frontend tsc OK"

# Atomic commit landed
git -C /Users/jeet/production-crm log -1 --pretty='%h %ae %s'
# author MUST be jm@techcloudpro.com, message contains "feat(quick-5)"
```
  </verify>
  <done>
- Backend `contacts.ts` accepts `?source=apollo` and adds `where.source = source` to the Prisma findMany clause.
- Frontend `contactsApi.getAll` signature includes `source?: string`.
- `ContactList.tsx` reads `?source` from URL on mount + on URL change, passes it to the API, renders a dismissible "Source: <X>" chip above the filter row when set, and renders Apollo + stream badges on BOTH render sites.
- Scope boundaries verified: zero changes to `campaigns.ts`, `awsSES.ts`, `ApolloPage.tsx`, `NetSuiteCampaignWizard.tsx`, or `schema.prisma`.
- `npx tsc --noEmit` exits 0 in both backend and frontend.
- Single atomic commit landed on `production` branch authored by `jm@techcloudpro.com`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Build + deploy backend dist + frontend dist to EC2 + pm2 restart with env reload</name>
  <files></files>
  <action>
**A. Verify EC2 access + harvest the frontend deploy path.**

The frontend deploy path on EC2 is not 100% confirmed by code in this repo — `quick/3-PLAN.md` named `/var/www/brandmonkz/` but ssh users differed between quick tasks (`ubuntu@`) and Phase 4 (`ec2-user@100.24.213.224`). Confirm BEFORE rsync.

```bash
# Step A1: confirm SSH connectivity using the Phase 4 host + user + key
ssh -i ~/.ssh/brandmonkz-crm.pem -o ConnectTimeout=10 ec2-user@100.24.213.224 'whoami && uname -a'
# expect: ec2-user + Linux

# Step A2: find which directory serves brandmonkz.com from nginx
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  'sudo grep -rE "root\s+/var" /etc/nginx/ 2>/dev/null | head -20'
# expect one or two lines mentioning a `root` directive — that IS the frontend dist path on EC2

# Step A3: confirm the index.html currently served
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  'sudo ls -la /var/www/brandmonkz/index.html 2>/dev/null || sudo ls -la /var/www/html/index.html 2>/dev/null || echo "neither path exists — inspect step A2 output"'
```

Pick the confirmed frontend path from Step A2/A3. Bind it to shell var `FRONTEND_DIR`. If A2/A3 disagree, treat A2 (nginx config) as authoritative.

```bash
FRONTEND_DIR=<from step A2/A3>     # e.g. /var/www/brandmonkz
BACKEND_DIR=/var/www/crm-backend   # known from CLAUDE.md + Phase 4 ops
```

If Steps A1-A3 ALL fail (SSH broken, key missing, host unreachable), STOP this task and escalate — do NOT guess. Phase 4 successfully used `ec2-user@100.24.213.224 -i ~/.ssh/brandmonkz-crm.pem` on 2026-05-30 so the most likely cause is a transient outage or a recent key rotation — surface the exact ssh error.

**B. Build locally.**

```bash
cd /Users/jeet/production-crm/backend
npm install --no-audit --no-fund
npx prisma generate
npm run build 2>&1 | tail -20
ls dist/routes/contacts.js   # MUST exist

cd /Users/jeet/production-crm/frontend
npm install --no-audit --no-fund
npm run build 2>&1 | tail -20
ls dist/index.html   # MUST exist
grep -l "Source: " dist/assets/*.js 2>/dev/null | head -1
# expect at least one hit — the chip text got bundled
```

If `frontend/node_modules` was missing (per `04-04-SUMMARY.md`), the npm install will populate it once.

**C. rsync backend dist (only the changed compiled file).**

```bash
# Tarball + scp pattern (matches Phase 03.1-02 RESEARCH §5.1 recipe — single round-trip, preserves binary stream, avoids SSH line-ending translation):
cd /Users/jeet/production-crm
tar -czf /tmp/quick5-backend.tar.gz -C backend/dist routes/contacts.js
scp -i ~/.ssh/brandmonkz-crm.pem /tmp/quick5-backend.tar.gz ec2-user@100.24.213.224:/tmp/quick5-backend.tar.gz

ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  "sudo tar -xzf /tmp/quick5-backend.tar.gz -C ${BACKEND_DIR}/dist/ && \
   sudo ls -la ${BACKEND_DIR}/dist/routes/contacts.js && \
   sudo grep -c 'where.source' ${BACKEND_DIR}/dist/routes/contacts.js"
# last grep MUST return >=1

# Clean up tarballs
rm /tmp/quick5-backend.tar.gz
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 'rm /tmp/quick5-backend.tar.gz'
```

**D. rsync frontend dist (full directory).**

```bash
cd /Users/jeet/production-crm
tar -czf /tmp/quick5-frontend.tar.gz -C frontend/dist .
scp -i ~/.ssh/brandmonkz-crm.pem /tmp/quick5-frontend.tar.gz ec2-user@100.24.213.224:/tmp/quick5-frontend.tar.gz

ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  "sudo mkdir -p /tmp/quick5-frontend && \
   sudo tar -xzf /tmp/quick5-frontend.tar.gz -C /tmp/quick5-frontend/ && \
   sudo rsync -a --delete /tmp/quick5-frontend/ ${FRONTEND_DIR}/ && \
   sudo ls ${FRONTEND_DIR}/index.html && \
   sudo rm -rf /tmp/quick5-frontend /tmp/quick5-frontend.tar.gz"

rm /tmp/quick5-frontend.tar.gz
```

`rsync --delete` is intentional — stale lazy chunks from prior deploys must be evicted (per memory `reference_vite_stale_lazy_chunk_trap`).

**E. pm2 restart with env reload (per locked context recipe).**

```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  "cd ${BACKEND_DIR} && \
   set -a && source .env && set +a && \
   pm2 restart crm-backend --update-env && \
   sleep 3 && \
   pm2 list | grep crm-backend && \
   pm2 logs crm-backend --lines 20 --nostream"
```

PM2 process MUST be `online` with 0 fresh restarts after the boot completes. Log tail MUST NOT show any module-load errors, env-guard `process.exit(1)` lines, or Prisma connection failures.

**F. Sanity ping (no auth needed — just confirms nginx fronts the new bundle).**

```bash
curl -sS -A 'Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0' \
  -o /tmp/quick5-index.html -w 'HTTP %{http_code}\n' \
  https://brandmonkz.com/
# expect HTTP 200

# Confirm the new JS bundle was served (look for the chip string in any bundle)
INDEX_JS=$(grep -oE '/assets/index-[a-zA-Z0-9_-]+\.js' /tmp/quick5-index.html | head -1)
curl -sS -A 'Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0' \
  "https://brandmonkz.com${INDEX_JS}" | grep -c "Source: " || echo "NOT FOUND — chip string missing from served bundle"
# expect a non-zero count
```

Mandatory `User-Agent` per the locked nginx 403 rule.
  </action>
  <verify>
```bash
# Local builds present
ls /Users/jeet/production-crm/backend/dist/routes/contacts.js
ls /Users/jeet/production-crm/frontend/dist/index.html

# Backend filter present on EC2 dist
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  'sudo grep -c "where.source" /var/www/crm-backend/dist/routes/contacts.js'
# expect >=1

# pm2 online with zero fresh restart crashes
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  'pm2 jlist | python3 -c "import json,sys; p=[x for x in json.load(sys.stdin) if x[\"name\"]==\"crm-backend\"][0]; print(\"status:\", p[\"pm2_env\"][\"status\"]); print(\"restarts:\", p[\"pm2_env\"][\"restart_time\"])"'
# status MUST be "online"

# nginx serves new bundle with chip string
curl -sS -A 'Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0' https://brandmonkz.com/ -w 'HTTP %{http_code}\n' -o /dev/null
# expect HTTP 200
```
  </verify>
  <done>
- SSH confirmed working as `ec2-user@100.24.213.224` with `~/.ssh/brandmonkz-crm.pem`.
- `FRONTEND_DIR` resolved from nginx config + verified by `index.html` listing.
- Local `backend/dist/routes/contacts.js` contains `where.source` (via tsc compile of Task 1's change).
- Local `frontend/dist/index.html` exists and the `Source: ` chip string appears in at least one bundled asset JS file.
- Backend tarball deployed to `${BACKEND_DIR}/dist/routes/contacts.js`; EC2 grep for `where.source` returns >=1.
- Frontend tarball rsynced to `${FRONTEND_DIR}/` with `--delete`; `${FRONTEND_DIR}/index.html` exists post-deploy.
- pm2 `crm-backend` reports `status: online` after `--update-env` restart; tail of `pm2 logs` shows no module-load errors and no `process.exit(1)` env-guard hits.
- `https://brandmonkz.com/` returns HTTP 200 to a curl with the mandatory `BrandMonkz-Smoke/1.0` UA; the served JS bundle contains the `Source: ` chip string.
- All `/tmp/quick5-*.tar.gz` artifacts cleaned on both ends.
  </done>
</task>

<task type="auto">
  <name>Task 3: Live verify /contacts?source=apollo (signed network calls + visible rendering + push branch)</name>
  <files></files>
  <action>
**A. Mint a JWT for the smoke (matches Phase 4 pattern).**

The send-campaign smoke in Phase 4 used user `cmtest1780181866jm6a063b2d` (jm@techcloudpro.com). The Apollo contact `cmpsz0d3q000350mxrlau3sg5` is owned by some user — confirm ownership before assuming the smoke account can see it.

```bash
# A1: harvest JWT_SECRET from EC2 (read-only)
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  'sudo grep "^JWT_SECRET=" /var/www/crm-backend/.env | head -1'

# A2: find the owner of the Apollo verification contact
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  "cd /var/www/crm-backend && node -e \"
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.contact.findUnique({ where: { id: 'cmpsz0d3q000350mxrlau3sg5' }, select: { id: true, userId: true, source: true, stream: true, firstName: true, lastName: true, email: true } })
 .then(c => { console.log(JSON.stringify(c, null, 2)); return p.\$disconnect(); })
 .catch(e => { console.error('ERR', e.message); return p.\$disconnect(); });
\""
```

If the query returns null, the locked-context premise (contact exists in prod DB) is wrong — STOP and surface to user. Do NOT proceed to verification with a missing contact.

Use the returned `userId` as the JWT subject. Mint locally:

```bash
JWT_SECRET=<from A1>
USER_ID=<userId from A2>

cd /Users/jeet/production-crm/backend
node -e "
const jwt = require('jsonwebtoken');
const t = jwt.sign(
  { sub: '${USER_ID}', userId: '${USER_ID}' },
  '${JWT_SECRET}',
  { algorithm: 'HS256', issuer: 'crm-api', audience: 'crm-client', expiresIn: '7d' }
);
console.log(t);
" > /tmp/quick5.jwt
TOKEN=$(cat /tmp/quick5.jwt)
```

(`issuer:'crm-api' + audience:'crm-client'` claims are mandatory per Phase 4 decision 4 in `04-06-SUMMARY.md` — `AuthUtils.verifyToken` enforces both.)

**B. Verify backend filter end-to-end with curl.**

```bash
UA='Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0'

# B1: unfiltered (control) — must return many contacts including the Apollo one
curl -sS -A "${UA}" -H "Authorization: Bearer ${TOKEN}" \
  "https://brandmonkz.com/api/contacts?limit=1000" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
contacts=d.get('contacts',[])
apollo=[c for c in contacts if c.get('source')=='apollo']
target=[c for c in contacts if c['id']=='cmpsz0d3q000350mxrlau3sg5']
print('UNFILTERED total:', d.get('total'))
print('UNFILTERED apollo count:', len(apollo))
print('UNFILTERED target visible:', len(target)==1)
if target:
    print('  target.source:', target[0].get('source'))
    print('  target.stream:', target[0].get('stream'))
"

# B2: filtered ?source=apollo — must return ONLY Apollo contacts and INCLUDE the target
curl -sS -A "${UA}" -H "Authorization: Bearer ${TOKEN}" \
  "https://brandmonkz.com/api/contacts?source=apollo&limit=1000" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
contacts=d.get('contacts',[])
non_apollo=[c for c in contacts if c.get('source')!='apollo']
target=[c for c in contacts if c['id']=='cmpsz0d3q000350mxrlau3sg5']
print('FILTERED total:', d.get('total'))
print('FILTERED non-apollo leaks:', len(non_apollo))
print('FILTERED target visible:', len(target)==1)
assert d.get('total',0) >= 1, 'expected at least one Apollo contact'
assert len(non_apollo)==0, 'expected ZERO non-apollo rows in filtered result'
assert len(target)==1, 'expected target contact cmpsz0d3q000350mxrlau3sg5 in filtered result'
print('B2 PASS')
"
```

If B2's assertions fail, the wiring is broken — STOP and diagnose before any further work.

**C. Visual rendering confirmation (lightweight DOM check).**

Pure curl on the SPA returns the bundled JS, not rendered HTML, so DOM-level verification requires running the bundle. Do this with a single headless Chrome call:

```bash
# C1: confirm headless Chrome available
which google-chrome chromium chromium-browser 2>/dev/null | head -1
# pick whichever resolved as $CHROME_BIN; if none, fall back to node-fetch shape check below

# C2 (preferred): headless Chrome captures the filter chip + apollo badge text from the rendered page
CHROME_BIN=$(which google-chrome 2>/dev/null || which chromium 2>/dev/null || which chromium-browser 2>/dev/null)
if [ -n "${CHROME_BIN}" ]; then
  "${CHROME_BIN}" --headless --disable-gpu --no-sandbox --dump-dom \
    --virtual-time-budget=5000 \
    --user-agent='Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0' \
    "https://brandmonkz.com/contacts?source=apollo&__token=${TOKEN}" 2>/dev/null \
    > /tmp/quick5-dom.html
  grep -c "Source: Apollo" /tmp/quick5-dom.html
  grep -c "Cybersecurity"   /tmp/quick5-dom.html
  grep -c "cmpsz0d3q000350mxrlau3sg5\|VP Finance" /tmp/quick5-dom.html
fi
```

NOTE: the `__token` query param will NOT inject auth into the SPA — it's a marker only. If the SPA requires a real login to render the page, fall back to manual user verification (Step C3) — the backend assertions in Step B already prove the data path is correct.

C3 — **Manual user-facing verification (BLOCKING success bar):**

Surface the following to the user as the final confirmation step:

> Open `https://brandmonkz.com/contacts?source=apollo` in your logged-in browser. You SHOULD see:
> 1. A "Source: Apollo" filter chip at the top of the page (above the search/status filters)
> 2. ONLY contacts with `source=apollo` listed (the contact count should match the curl assertion in step B2)
> 3. The Apollo VP Finance contact (Cybersecurity stream — id `cmpsz0d3q000350mxrlau3sg5`) visible in the list
> 4. On that contact's row, two badges next to the status: a purple "Apollo" badge and a cyan "Cybersecurity" badge
> 5. Clicking the X on the "Source: Apollo" chip restores the unfiltered ALL contacts view (URL `/contacts` with no `?source` param)

Take a screenshot. If any of the 5 checks fail, log the failure clearly and DO NOT mark the plan complete.

**D. Push branch.**

```bash
cd /Users/jeet/production-crm
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
  push origin production
# NO --force, ever
```

**E. Clean up + close.**

```bash
rm -f /tmp/quick5.jwt /tmp/quick5-dom.html /tmp/quick5-index.html
```

Update `.planning/STATE.md` with a one-line summary referencing this quick task's verification result.
  </action>
  <verify>
```bash
# Curl assertions PASSED (Step B2 prints "B2 PASS")
# Apollo verification contact exists in prod DB (Step A2 returned non-null with source='apollo')
# pm2 still online post-smoke
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  'pm2 list | grep crm-backend'

# Git push succeeded — production at the new SHA
git -C /Users/jeet/production-crm log -1 --pretty='%h %ae %s'
git -C /Users/jeet/production-crm log origin/production -1 --pretty='%h'
# both SHAs must match

# Tmp files cleaned
ls /tmp/quick5* 2>/dev/null
# expect empty
```
  </verify>
  <done>
- JWT minted locally with `issuer:'crm-api' + audience:'crm-client'` claims, subject = owner of contact `cmpsz0d3q000350mxrlau3sg5`.
- `GET /api/contacts` (unfiltered) returns the target contact with `source='apollo'` and `stream='Cybersecurity'`.
- `GET /api/contacts?source=apollo` returns ONLY Apollo contacts AND the target contact is present (Python assertions in Step B2 print "B2 PASS").
- Headless Chrome DOM dump shows the "Source: Apollo" chip text + "Cybersecurity" badge text (if Chrome was available; manual confirmation otherwise).
- User manually confirms the 5-point visual checklist in Step C3 (or logs each failure explicitly).
- `production` branch pushed to `origin/production` — local and remote SHAs match.
- Temp files cleaned from local /tmp.
- `.planning/STATE.md` updated with quick-5 outcome.
  </done>
</task>

</tasks>

<verification>
End-to-end checks after Task 3 completes:

1. **Surface integrity (code-level)**
   - `grep -rn "where.source" backend/src/routes/contacts.ts` → 1 hit
   - `grep -rn "source?: string" frontend/src/services/api.ts` → 1 hit
   - `grep -c "displayContact\.source\|contact\.source" frontend/src/pages/Contacts/ContactList.tsx` → 2 hits minimum
   - `grep -c "displayContact\.stream\|contact\.stream" frontend/src/pages/Contacts/ContactList.tsx` → 2 hits minimum
   - `git diff main..HEAD --name-only` returns exactly 3 files (the 3 named in `files_modified` frontmatter)

2. **Scope guardrails (no firewall breach)**
   - `git diff main..HEAD --name-only | grep -E "campaigns\.ts|awsSES\.ts|ApolloPage\.tsx|NetSuiteCampaignWizard\.tsx|schema\.prisma"` → ZERO hits

3. **Live system (production)**
   - `curl -A 'Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0' -H "Authorization: Bearer ${TOKEN}" "https://brandmonkz.com/api/contacts?source=apollo&limit=1000" | jq '.contacts | map(.source) | unique'` → `["apollo"]`
   - Target contact `cmpsz0d3q000350mxrlau3sg5` present in the filtered result
   - User-facing visual confirmation: 5-point checklist in Task 3 Step C3 all pass

4. **Git hygiene**
   - All commits authored by `jm@techcloudpro.com` / `jeet-avatar`
   - `production` pushed to `origin/production`; local SHA == origin SHA
   - No `--force` used at any point
</verification>

<success_criteria>
- `https://brandmonkz.com/contacts?source=apollo` displays the Apollo VP Finance Cybersecurity contact (`cmpsz0d3q000350mxrlau3sg5`) AND nothing else (zero non-Apollo rows).
- The filter chip "Source: Apollo" is visible at the top of the page; clicking its X restores the unfiltered view.
- The Apollo + "Cybersecurity" badges are visible on the target contact's row, sitting next to the status badge.
- The unfiltered `/contacts` view (no `?source` param) still works exactly as before — the new filter is opt-in via URL only.
- Backend `GET /api/contacts?source=apollo` returns ONLY rows where `Contact.source = 'apollo'`.
- pm2 `crm-backend` is online with no errors after the deploy.
- Branch `production` pushed to `origin/production`; commit authored by `jm@techcloudpro.com`.
- Zero changes to `campaigns.ts`, `awsSES.ts`, `ApolloPage.tsx`, `NetSuiteCampaignWizard.tsx`, or `schema.prisma` (Phase 4 firewall + scope boundary preserved).
</success_criteria>

<output>
After completion, create `.planning/quick/5-wire-contactlist-source-filter-apollo-st/5-SUMMARY.md` documenting:
- The actual EC2 frontend deploy path that Task 2 Step A surfaced (closes the planner's TBD)
- Backend curl assertion output from Task 3 Step B1 + B2 (raw JSON, totals, Apollo-only filter result)
- The owner userId of contact `cmpsz0d3q000350mxrlau3sg5` (from Task 3 Step A2)
- User's visual confirmation (or any failures) of the 5-point checklist in Task 3 Step C3
- The before/after commit SHAs on `production`
- Any deviations from this plan
</output>
