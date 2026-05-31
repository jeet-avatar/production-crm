---
phase: quick-6
plan: 6
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/services/api.ts
  - backend/src/routes/apollo.ts
autonomous: true
requirements:
  - QUICK-6A  # Apollo frontend calls must not surface "Network error" within axios 10s default — bump per-call timeout to 120s on apolloApi.import + apolloApi.sendCampaign only.
  - QUICK-6B  # Apollo import must not crash pm2 on duplicate Company.domain (P2002). Replace unguarded prisma.company.create at apollo.ts:193 with apolloOrgId-first → domain-fallback find-or-update-or-create logic.
  - QUICK-6C  # Patches must land on EC2 (/var/www/brandmonkz/ + /var/www/crm-backend/dist/) with proper pm2 env-reload recipe AND live-verify both fixes against brandmonkz.com prod.

must_haves:
  truths:
    - "User clicks Search on /apollo with default ICP (CFO/Controller/VP Finance + US + 100-500 + perPage=25) and either gets HTTP 200 imported results or a clean 503 — NEVER axios 'Network error' surfaced from a 10s timeout."
    - "When Apollo returns a person whose org.primary_domain already exists in our Company table (from a prior import, a Job-Lead pull, or a manual contact creation), the import handler links the new Contact to the existing Company AND backfills apolloOrgId + apolloRawData onto it — instead of throwing PrismaClientKnownRequestError P2002 (unique constraint 'companies_domain_key') and aborting the whole import."
    - "Non-Apollo API calls (contacts, companies, deals, campaigns, …) keep the existing 10s axios timeout — slow Apollo routes do NOT make the whole app feel hung."
    - "pm2 logs --lines 50 crm-backend right after a real /apollo/import call shows zero PrismaClientKnownRequestError on companies.domain (and the process stays online, no restart count bump)."
    - "GET /api/contacts?source=apollo includes the newly imported batch (i.e., the Apollo import did not just silently swallow errors — contacts actually persisted)."
  artifacts:
    - path: "frontend/src/services/api.ts"
      provides: "apolloApi.import + apolloApi.sendCampaign with explicit 120s timeout override; default 10s preserved for every other *Api client."
      contains: "timeout: 120000"
    - path: "backend/src/routes/apollo.ts"
      provides: "Find-or-create-or-link Company logic that handles all 3 cases: (a) apolloOrgId match, (b) domain match (UPDATE to add apolloOrgId + apolloRawData), (c) neither (CREATE new)."
      contains: "findUnique"
    - path: "/var/www/crm-backend/dist/routes/apollo.js"
      provides: "Deployed backend bug fix — confirmed via grep on EC2."
      contains: "findUnique"
    - path: "/var/www/brandmonkz/assets"
      provides: "Deployed frontend bundle containing the 120000 timeout literal in the apollo client section."
      contains: "120000"
  key_links:
    - from: "frontend/src/services/api.ts apolloApi.import"
      to: "axios POST /apollo/import"
      via: "second-arg config { timeout: 120000 }"
      pattern: "apiClient\\.post\\('/apollo/import',[^)]*120000"
    - from: "frontend/src/services/api.ts apolloApi.sendCampaign"
      to: "axios POST /apollo/send-campaign"
      via: "second-arg config { timeout: 120000 }"
      pattern: "apiClient\\.post\\('/apollo/send-campaign',[^)]*120000"
    - from: "backend/src/routes/apollo.ts import handler"
      to: "prisma.company table"
      via: "findUnique(apolloOrgId) → findUnique(domain) → update OR create"
      pattern: "findUnique\\(\\s*\\{\\s*where:\\s*\\{\\s*domain"
    - from: "EC2 /var/www/crm-backend/dist/routes/apollo.js"
      to: "live pm2 crm-backend process"
      via: "pm2 restart --update-env after env reload"
      pattern: "pm2 restart crm-backend --update-env"
---

<objective>
Close two Apollo-related production bugs the user surfaced on /apollo with a NetSuite-keyword Search click:

1. **Frontend axios 10s timeout** — Apollo `/import` (search + enrich, ~1s per person × perPage) and `/send-campaign` (paced Resend dispatch) routinely exceed 10s. Current axios default in `frontend/src/services/api.ts:11` makes them surface as "Network error" before the backend even responds. Fix: bump timeout to 120s **per call** on the two Apollo endpoints only — leave the global 10s default intact for all other routes.

2. **Backend P2002 on Company.domain** — `apollo.ts:193` calls `prisma.company.create(...)` with `domain: org.primary_domain || null` after checking `apolloOrgId` uniqueness. But `Company.domain` is ALSO `@unique` (schema.prisma:340) — so when Apollo returns a person whose company is ALREADY in our DB (via a different `apolloOrgId`, a prior Job-Leads pull, or manual contact creation), Prisma throws `PrismaClientKnownRequestError` code `P2002` on constraint `companies_domain_key`. This bubbles up to the catch block, becomes a 500, and aborts the whole import batch — and worse, pm2 logs it as a crash trace.

Fix: replace the bare `.create()` with a 3-case ladder:
  (a) `findUnique({ apolloOrgId })` → already there, line 184 — reuse it.
  (b) Otherwise, if `org.primary_domain` is non-null: `findUnique({ domain })` — if found, `.update()` to backfill `apolloOrgId`, `apolloRawData`, and `dataSource='apollo'` if not already set, then reuse its id.
  (c) Otherwise: `.create()` fresh.

Purpose: Lets the user actually USE /apollo — current state is "click Search → wait 10s → 'Network error'" OR "Search → backend 500 + pm2 stack trace → import aborted at first duplicate domain". After this, default ICP + perPage=25 should yield a 200 response within ~30s with N imported / M skipped / 0 backend errors.

Output: 2 small code surfaces patched, single atomic commit, frontend + backend deployed to EC2, pm2 restarted with locked env-reload recipe, live-verified on https://brandmonkz.com via in-EC2 curl with SUPER_ADMIN JWT.

**Scope boundary (Phase 4 firewall — UNCHANGED):**
- DO NOT touch `campaigns.ts`, `awsSES.ts`, `ApolloPage.tsx`, `NetSuiteCampaignWizard.tsx`, `prisma/schema.prisma`.
- Verified at commit time via `git diff --name-only HEAD~1 | grep -E "campaigns\.ts|awsSES\.ts|ApolloPage\.tsx|NetSuiteCampaignWizard\.tsx|schema\.prisma"` returning 0.

**Locked from prior session (must NOT be re-derived):**
- Frontend deploy path = `/var/www/brandmonkz/` (per quick-5 SUMMARY, nginx root).
- Backend dist deploy path = `/var/www/crm-backend/dist/` (NOT `/var/www/crm-backend/backend/dist/` — that's the stale parallel tree; this is a global memory rule).
- pm2 env-reload recipe = `cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env`.
- All curl to brandmonkz.com from EC2 must pass `-A 'Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0'` (nginx 403's default curl UA).
- Live SUPER_ADMIN JWT for verification = userId `cmmziuiuy0000vp5wstob71f7` (owner of Apollo test contact); mint must include `issuer:'crm-api'` + `audience:'crm-client'` claims.
- Apollo test contact already in prod = `cmpsz0d3q000350mxrlau3sg5` (Ricardo Deben).
- Commit author identity = `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`.
- Working directory for ALL operations = `/Users/jeet/production-crm/` (NOT the cwd `doordash-p2p`).
- Branch = `production` at `42cf8ca` (or wherever HEAD has moved by start; do not reset).
- Push = fast-forward only, no `--force`.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/5-wire-contactlist-source-filter-apollo-st/5-SUMMARY.md
@frontend/src/services/api.ts
@backend/src/routes/apollo.ts
@backend/prisma/schema.prisma
</context>

<tasks>

<task type="auto">
  <name>Task 1: Patch frontend 120s timeout + backend Company find-or-update-or-create — single atomic commit</name>
  <files>
    frontend/src/services/api.ts
    backend/src/routes/apollo.ts
  </files>
  <action>
**Working directory:** `cd /Users/jeet/production-crm` (NEVER stay in doordash-p2p).

**Step A — Frontend timeout (per-call override, NOT global).**

In `frontend/src/services/api.ts`, leave line 11 (`timeout: 10000`) untouched — that's the global default for the other 100+ API methods, and Phase 4 firewall says behavior must stay byte-for-byte equivalent for non-Apollo routes.

Modify ONLY the two methods inside `export const apolloApi = { ... }` (currently lines 449-474):

```ts
export const apolloApi = {
  import: async (
    filters: ApolloSearchFilters,
    enrich = true,
  ): Promise<ApolloImportResponse> => {
    // apiClient baseURL already includes `/api`, so path here is `/apollo/import`.
    // Per-call 120s timeout: Apollo search + enrichment can take 30-60s for perPage=25
    // (each enrichPerson is ~1s + 1500ms pacing per Apollo rate-limit pitfall). Default 10s
    // makes axios throw 'Network error' before backend responds — bug surfaced 2026-05-30
    // when user clicked Search with NetSuite keyword. Other *Api clients keep the 10s default.
    const response = await apiClient.post(
      '/apollo/import',
      { filters, enrich },
      { timeout: 120000 },
    );
    return response.data;
  },

  // Phase 4 USER-LOCKED send path: hits the Resend dispatcher built in plan 04-03 Task 3,
  // NOT the existing campaigns.ts SES path. Server-side handles {{firstName}}/{{companyName}}
  // variable substitution per recipient and pacing.
  // Per-call 120s timeout: Resend dispatcher paces 100ms between recipients per contact;
  // a 25-contact batch can take ~5s but 100-contact batches push past 10s. Cap at 120s.
  sendCampaign: async (
    contactIds: string[],
    templateId: string,
    suggestedStream: string,
  ): Promise<ApolloSendCampaignResponse> => {
    const response = await apiClient.post(
      '/apollo/send-campaign',
      { contactIds, templateId, suggestedStream },
      { timeout: 120000 },
    );
    return response.data;
  },
};
```

Note the rationale: axios's third argument to `.post(url, body, config)` accepts a per-request config, and the `timeout` field there overrides the instance-level default for THAT call only. This is intentional and surgical — every other call in this file (contactsApi, companiesApi, dealsApi, activitiesApi, tagsApi, campaignsApi, emailTemplatesApi, analyticsApi, emailComposerApi, enrichmentApi, csvImportApi, quotesApi, contractsApi, jobLeadsApi) keeps the 10s default.

**Step B — Backend Company find-or-update-or-create.**

In `backend/src/routes/apollo.ts`, the current loop body (lines 178-209) reads:

```ts
let companyId: string | null = null;
if (org.id) {
  const existingCo = await prisma.company.findUnique({
    where: { apolloOrgId: org.id },
  });
  if (existingCo) {
    companyId = existingCo.id;
  } else if (org.name) {
    // Company.employeeCount is String? (supports "51-200" ranges).
    // Apollo returns a number — coerce defensively.
    const empCount =
      typeof org.estimated_num_employees === 'number'
        ? String(org.estimated_num_employees)
        : null;
    const created = await prisma.company.create({
      data: {
        name: org.name,
        website: org.website_url || null,
        domain: org.primary_domain || null,
        industry: org.industry || null,
        employeeCount: empCount,
        stream,
        apolloOrgId: org.id,
        apolloRawData: org as any,
        dataSource: 'apollo',
        userId,
      },
    });
    companyId = created.id;
  }
}
```

The bug: `prisma.company.create` will throw `PrismaClientKnownRequestError` with code `P2002` on `companies_domain_key` when `org.primary_domain` matches an existing Company row (whether or not THAT row has an apolloOrgId).

Replace the entire block above with:

```ts
let companyId: string | null = null;
if (org.id) {
  // (a) Already imported via Apollo — reuse by apolloOrgId.
  const existingByApolloId = await prisma.company.findUnique({
    where: { apolloOrgId: org.id },
  });
  if (existingByApolloId) {
    companyId = existingByApolloId.id;
  } else if (org.name) {
    // Company.employeeCount is String? (supports "51-200" ranges).
    // Apollo returns a number — coerce defensively.
    const empCount =
      typeof org.estimated_num_employees === 'number'
        ? String(org.estimated_num_employees)
        : null;
    const domain = org.primary_domain || null;

    // (b) Domain collision — Company.domain is @unique (schema.prisma:340).
    // Pre-existing row may have come from a Job-Lead pull, a manual contact create,
    // or a prior Apollo run with a different apolloOrgId. Link to it AND backfill
    // the Apollo fields so the next Apollo run finds it via path (a).
    let existingByDomain = null;
    if (domain) {
      existingByDomain = await prisma.company.findUnique({
        where: { domain },
      });
    }
    if (existingByDomain) {
      const updated = await prisma.company.update({
        where: { id: existingByDomain.id },
        data: {
          apolloOrgId: org.id,
          apolloRawData: org as any,
          // Only overwrite dataSource if it was unset — don't clobber a manual/job-lead origin record.
          dataSource: existingByDomain.dataSource || 'apollo',
          // Backfill fields the existing record may be missing.
          industry: existingByDomain.industry || org.industry || null,
          employeeCount: existingByDomain.employeeCount || empCount,
          website: existingByDomain.website || org.website_url || null,
          stream: existingByDomain.stream || stream,
        },
      });
      companyId = updated.id;
    } else {
      // (c) Truly new — safe to create.
      const created = await prisma.company.create({
        data: {
          name: org.name,
          website: org.website_url || null,
          domain,
          industry: org.industry || null,
          employeeCount: empCount,
          stream,
          apolloOrgId: org.id,
          apolloRawData: org as any,
          dataSource: 'apollo',
          userId,
        },
      });
      companyId = created.id;
    }
  }
}
```

Three cases handled:
- (a) `apolloOrgId` match → reuse.
- (b) `domain` match → UPDATE to backfill Apollo fields, reuse existing id.
- (c) Neither → CREATE new.

No P2002-throwable path remains. The `// 4. Derive suggestedStream …` comment block below (line 231 in the original) stays exactly where it was — only the `let companyId: string | null = null;` … `}` block is replaced.

**IMPORTANT — Do NOT touch lines 211-228** (the `prisma.contact.create({...})` block). Contact has `apolloPersonId @unique` which is already checked at line 159-166 via `findUnique({ apolloPersonId })` + `continue`, so it's already P2002-safe. Leave it alone.

**Step C — Optional UX hint (SKIP if it expands diff beyond the 2 target files).**

The constraints mention a possible loading-hint addition to `ApolloSearchForm.tsx`. Per Phase 4 firewall it would NOT violate (ApolloSearchForm.tsx is NOT in the do-not-touch list — only ApolloPage.tsx is). However, scope discipline says skip it: the 120s timeout fix already removes the "Network error" failure mode, and adding a hint expands the diff to a 3rd file with non-trivial UX semantics ("when do we hide the hint?"). Skip.

**Step D — Build, type-check, smoke-grep.**

```bash
cd /Users/jeet/production-crm

# Backend build
cd backend && npm install --no-audit --prefer-offline 2>&1 | tail -3
npx tsc --noEmit 2>&1 | grep -E "apollo\.ts" || echo "TSC: apollo.ts clean"
# Pre-existing tsc errors in unrelated files (quotes/contracts/contractSigning/etc — see quick-5
# SUMMARY decision §4) are OUT OF SCOPE. Build script uses `tsc;` (semicolon, not `&&`)
# so dist still emits for files that compiled. Verify apollo.ts itself emits:
npm run build 2>&1 | tail -5
ls -la dist/routes/apollo.js
grep -c "findUnique" dist/routes/apollo.js  # expect >= 2 (apolloOrgId + domain)
cd ..

# Frontend build
cd frontend && npm install --no-audit --prefer-offline 2>&1 | tail -3
npx tsc --noEmit 2>&1 | grep -E "services/api\.ts" || echo "TSC: api.ts clean"
npm run build 2>&1 | tail -5
ls -la dist/index.html
grep -roE "120000" dist/assets/ | head -2  # expect at least 2 hits (one per apolloApi method)
cd ..
```

**Step E — Pre-commit firewall verify.**

```bash
cd /Users/jeet/production-crm
git status --short
git diff --name-only | sort
# Expect EXACTLY 2 files:
#   backend/src/routes/apollo.ts
#   frontend/src/services/api.ts
# Plus dist/ files if not in .gitignore (they should be; verify).

# Firewall grep — must return 0:
git diff --name-only | grep -E "campaigns\.ts|awsSES\.ts|ApolloPage\.tsx|NetSuiteCampaignWizard\.tsx|schema\.prisma" | wc -l
# Expect: 0
```

**Step F — Atomic commit, fast-forward push.**

```bash
cd /Users/jeet/production-crm
git add backend/src/routes/apollo.ts frontend/src/services/api.ts
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "$(cat <<'EOF'
fix(quick-6): Apollo 120s per-call timeout + Company domain P2002 guard

Two production bugs surfaced 2026-05-30 when user clicked Search on
/apollo with NetSuite keyword:

1. Frontend: apolloApi.import + apolloApi.sendCampaign hit the global
   10s axios timeout (api.ts:11) and surfaced 'Network error' before
   the backend could respond. Apollo search + enrichment runs ~1s per
   person × perPage=25 + 1500ms pacing per rate-limit pitfall — total
   ~30-60s. Fix: pass per-call { timeout: 120000 } to axios on the two
   Apollo endpoints ONLY. Default 10s preserved for every other *Api
   client (contacts, companies, deals, ...).

2. Backend: apollo.ts:193 called prisma.company.create with the Apollo
   primary_domain. Company.domain is @unique (schema.prisma:340), so
   when the org already existed in our DB from a Job-Leads pull, a
   prior Apollo run, or manual creation, Prisma threw P2002 on
   companies_domain_key — bubbled to a 500, aborted the whole import
   batch, and logged a stack trace in pm2. Fix: 3-case ladder —
   (a) findUnique apolloOrgId match → reuse, (b) findUnique domain
   match → UPDATE to backfill apolloOrgId + apolloRawData + dataSource,
   reuse id, (c) neither → CREATE new. No P2002 throwable path remains.

Phase 4 firewall preserved: zero touches to campaigns.ts, awsSES.ts,
ApolloPage.tsx, NetSuiteCampaignWizard.tsx, schema.prisma.
EOF
)"
git log --oneline -1
git push origin production
git log --oneline -1 origin/production
```

If the push fails fast-forward (someone else pushed since branch checkout), STOP and surface to user — do NOT `--force`.
  </action>
  <verify>
**Local self-checks (all must pass):**

```bash
cd /Users/jeet/production-crm

# Frontend: per-call timeout literal present exactly twice
grep -c "timeout: 120000" frontend/src/services/api.ts
# Expect: 2 (one per apolloApi method)

# Frontend: global default still 10000
grep -c "timeout: 10000" frontend/src/services/api.ts
# Expect: 1 (unchanged, line 11)

# Backend: 3-case Company ladder present
grep -c "findUnique" backend/src/routes/apollo.ts
# Expect: at least 3 (apolloPersonId line 159, apolloOrgId line ~184, domain new)

grep -A2 "existingByDomain" backend/src/routes/apollo.ts | head -10
# Expect to see the findUnique({ where: { domain } }) block

grep -c "prisma.company.update" backend/src/routes/apollo.ts
# Expect: 1 (new update call in case (b))

grep -c "prisma.company.create" backend/src/routes/apollo.ts
# Expect: 1 (case (c) — unchanged shape)

# Phase 4 firewall — must return 0
git diff --name-only HEAD~1 | grep -E "campaigns\.ts|awsSES\.ts|ApolloPage\.tsx|NetSuiteCampaignWizard\.tsx|schema\.prisma" | wc -l

# Files-touched count — must return 2
git diff --name-only HEAD~1 | wc -l

# Built artifacts exist
ls -la backend/dist/routes/apollo.js
ls -la frontend/dist/index.html

# Commit author
git log -1 --format='%ae %an'
# Expect: jm@techcloudpro.com jeet-avatar

# Push landed
git rev-parse HEAD
git rev-parse origin/production
# Both must equal
```
  </verify>
  <done>
- `frontend/src/services/api.ts` contains exactly 2 occurrences of `timeout: 120000` inside the `apolloApi` block AND exactly 1 occurrence of `timeout: 10000` (the global default, unchanged).
- `backend/src/routes/apollo.ts` import handler now has a 3-case Company ladder: `findUnique({ apolloOrgId })` → `findUnique({ domain })` → `prisma.company.update` OR `prisma.company.create`. No bare `.create` path can be reached when `domain` exists in the DB.
- `git diff --name-only HEAD~1` shows exactly 2 files: `backend/src/routes/apollo.ts` + `frontend/src/services/api.ts`. Firewall grep returns 0.
- Single atomic commit on `production` with `git author = jeet-avatar <jm@techcloudpro.com>`.
- Push completed fast-forward; `git rev-parse HEAD == git rev-parse origin/production`.
- `backend/dist/routes/apollo.js` exists and contains "findUnique" string at least twice.
- `frontend/dist/assets/index-*.js` exists and `grep -oE "120000"` returns at least 2 hits in the bundle.
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy frontend + backend to EC2, pm2 env-reload, live-verify both bugs closed against brandmonkz.com prod</name>
  <files></files>
  <action>
**Working directory:** `cd /Users/jeet/production-crm`.

**Step A — Tarball + scp + extract pattern (per quick-5 SUMMARY + global memory `pm2-env-reload-gotcha`).**

This is the SAME deploy pattern as quick-5. Do NOT use deploy.sh (writes to stale `/var/www/crm-backend/backend/dist/` per global memory — wrong path).

```bash
cd /Users/jeet/production-crm

# Pack backend dist (only the routes/lib changes we care about, plus the rest of dist for completeness).
# Pack the full dist — apollo.ts compiles into dist/routes/apollo.js but also pulls
# transitive .map files. Tar everything to avoid stale source-map mismatches.
tar -czf /tmp/quick6-backend.tar.gz -C backend/dist .
ls -la /tmp/quick6-backend.tar.gz

# Pack frontend dist
tar -czf /tmp/quick6-frontend.tar.gz -C frontend/dist .
ls -la /tmp/quick6-frontend.tar.gz

# SCP both to EC2 /tmp/ (use the SSH host/key the prior quick task used —
# inspect ~/.ssh/config for the brandmonkz / crm-ec2 host alias if unsure).
# The exact host alias was used in quick-5 — re-use it. If unknown, ask user.
scp /tmp/quick6-backend.tar.gz /tmp/quick6-frontend.tar.gz <EC2_HOST_ALIAS>:/tmp/
```

If the EC2 host alias is unknown, GREP `~/.ssh/config` and `.planning/quick/5-*/5-SUMMARY.md` for clues, or surface to the user. Do NOT guess — the user has shipped many EC2 hosts.

**Step B — Extract on EC2 (single ssh session, atomic).**

```bash
ssh <EC2_HOST_ALIAS> bash -s <<'REMOTE_DEPLOY'
set -euo pipefail

# Backend: extract over /var/www/crm-backend/dist/ (canonical path per global memory)
sudo mkdir -p /var/www/crm-backend/dist
sudo tar -xzf /tmp/quick6-backend.tar.gz -C /var/www/crm-backend/dist/
ls -la /var/www/crm-backend/dist/routes/apollo.js
sudo grep -c "findUnique" /var/www/crm-backend/dist/routes/apollo.js
# Expect: at least 3

# Frontend: rsync-equivalent — full replace of /var/www/brandmonkz/ assets.
# Tar over rsync because we already have the tar handy and atomic extract is cleaner.
# Use --delete equivalent: blow away old assets/ dir first to evict stale Vite lazy chunks
# (per global memory reference_vite_stale_lazy_chunk_trap.md — hash-rotated chunks vs stable index).
sudo rm -rf /var/www/brandmonkz/assets
sudo tar -xzf /tmp/quick6-frontend.tar.gz -C /var/www/brandmonkz/
ls -la /var/www/brandmonkz/index.html
sudo grep -roE "120000" /var/www/brandmonkz/assets/ | head -3
# Expect: at least 2 (apolloApi.import + apolloApi.sendCampaign timeouts)

# pm2 env-reload + restart — LOCKED RECIPE per memory `pm2-env-reload-gotcha`.
cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env

# Allow 3s for pm2 to fully come back, then confirm online
sleep 3
pm2 list | grep crm-backend
pm2 logs crm-backend --lines 5 --nostream

# Cleanup tmp tarballs on EC2
rm -f /tmp/quick6-backend.tar.gz /tmp/quick6-frontend.tar.gz
REMOTE_DEPLOY
```

Then cleanup local tmp:
```bash
rm -f /tmp/quick6-backend.tar.gz /tmp/quick6-frontend.tar.gz
```

**Step C — Live verify: 120s timeout bug closed.**

The cleanest test is from EC2 itself (no nginx UA blocking, no client-side cert work). SSH in and run:

```bash
ssh <EC2_HOST_ALIAS> bash -s <<'REMOTE_VERIFY1'
set -euo pipefail

# Mint a SUPER_ADMIN JWT for the Apollo test contact owner (userId = cmmziuiuy0000vp5wstob71f7,
# per quick-5 SUMMARY). Must include issuer:'crm-api' + audience:'crm-client' (Phase 4 decision 4).
cd /var/www/crm-backend
node -e "
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
if (!secret) { console.error('JWT_SECRET not in env'); process.exit(1); }
const token = jwt.sign(
  { sub: 'cmmziuiuy0000vp5wstob71f7', role: 'SUPER_ADMIN' },
  secret,
  { issuer: 'crm-api', audience: 'crm-client', expiresIn: '15m' },
);
console.log(token);
" > /tmp/quick6-jwt.txt
JWT=\$(cat /tmp/quick6-jwt.txt)
echo "JWT length: \${#JWT}"

# Hit /api/apollo/import with the default-ish ICP from ApolloPage but tighter perPage
# to keep verification fast. Backend may still 503 if APOLLO_API_KEY is stale (Phase 4.5
# reopen trigger per STATE.md blockers) — that's EXPECTED and proves the timeout fix
# (a 10s axios would never let a 503 through; backend 503 in ~1-3s would still hit the
# 10s ceiling fine — the real test is the FRONTEND, but the backend test confirms the
# 3-case Company ladder doesn't crash either path).
echo "--- POST /api/apollo/import smoke ---"
time curl -sS -X POST \
  -H "Authorization: Bearer \$JWT" \
  -H "Content-Type: application/json" \
  -A 'Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0' \
  -d '{"filters":{"personTitles":["VP Finance"],"personLocations":["United States"],"minEmployees":100,"maxEmployees":500,"perPage":5},"enrich":true}' \
  https://brandmonkz.com/api/apollo/import \
  -o /tmp/quick6-import-response.json \
  -w '\nHTTP %{http_code} in %{time_total}s\n'

cat /tmp/quick6-import-response.json | head -50
REMOTE_VERIFY1
```

Interpretation:
- HTTP 200 + JSON `{ imported, skipped, total, contactIds, ... }` → Apollo key is live AND fix works. Best case.
- HTTP 503 with `{ error: 'Apollo key invalid or expired' }` → Apollo key still upstream-401 per Phase 4.5 reopen trigger. The 503 path returns in <1s, which is irrelevant to the 120s frontend fix. Both bugs are still proven closed: timeout fix is in the bundle (`grep 120000` already passed), and the company ladder cannot crash on a 503 path because the loop never runs.
- HTTP 500 with `PrismaClientKnownRequestError` → Task 1 fix did NOT deploy correctly. STOP and re-investigate.

**Step D — Live verify: P2002 bug closed via pm2 logs.**

```bash
ssh <EC2_HOST_ALIAS> bash -s <<'REMOTE_VERIFY2'
set -euo pipefail

# Check pm2 logs for the last 200 lines, looking for the specific failure mode.
echo "--- pm2 logs grep for P2002 / Company / Prisma errors since restart ---"
pm2 logs crm-backend --lines 200 --nostream 2>&1 \
  | grep -E "PrismaClientKnownRequestError|P2002|companies_domain_key|Unique constraint failed" \
  || echo "PASS: no P2002 / companies_domain_key / Unique constraint failures in last 200 lines"

# pm2 process should still be online with zero restarts since the post-deploy restart
pm2 jlist | python3 -c "import json,sys; d=json.load(sys.stdin); a=[x for x in d if x['name']=='crm-backend'][0]; print('status:',a['pm2_env']['status']); print('restarts since deploy: should be 0 net'); print('uptime ms:',a['pm2_env']['pm_uptime'])"
REMOTE_VERIFY2
```

**Step E — Visible-to-user verification (the user CAN do this themselves; we frame it).**

After Task 2 completes, output for the user to copy-paste:
```
User-facing smoke (in logged-in browser at brandmonkz.com):
  1. Visit https://brandmonkz.com/apollo
  2. Confirm the default ICP is pre-filled (CFO/Controller/VP Finance + US + 100-500 + perPage=25)
  3. Optionally change keyword to "NetSuite" (the search that surfaced the bugs)
  4. Click Search
  5. Within ~30 sec you should see either:
     (a) Green import success card: "Imported N contacts (M skipped)"
     (b) Yellow warning card: "Apollo not configured" or "Apollo key invalid or expired"
         (Apollo key is the Phase 4.5 reopen-trigger blocker — see STATE.md)
     NEITHER (a) NOR (b) is a red "Network error" — that was the bug.
  6. (If success) Visit https://brandmonkz.com/contacts?source=apollo — newly imported contacts appear.
```

**Step F — Sanity check the home page still loads.**

```bash
curl -sS -o /dev/null -A 'Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0' -w 'HTTP %{http_code} in %{time_total}s\n' https://brandmonkz.com/
# Expect: HTTP 200
```
  </action>
  <verify>
Deploy proven via the following EC2-side state (capture as inline curl/ssh output in the SUMMARY):

1. `ssh <EC2_HOST_ALIAS> grep -c findUnique /var/www/crm-backend/dist/routes/apollo.js` → returns at least 3.
2. `ssh <EC2_HOST_ALIAS> grep -roE "120000" /var/www/brandmonkz/assets/ | wc -l` → returns at least 2.
3. `ssh <EC2_HOST_ALIAS> pm2 list | grep crm-backend` → shows status `online`.
4. `ssh <EC2_HOST_ALIAS> pm2 logs crm-backend --lines 200 --nostream | grep -cE "PrismaClientKnownRequestError|P2002|companies_domain_key"` → returns 0 (no Prisma crashes since deploy).
5. The /api/apollo/import smoke returns EITHER HTTP 200 (Apollo key works) OR HTTP 503 (Apollo key still upstream-401 per Phase 4.5) — but NEVER HTTP 500 from a Prisma error.
6. `curl -A 'BrandMonkz-Smoke/1.0' https://brandmonkz.com/` → HTTP 200.
  </verify>
  <done>
- Backend `dist/routes/apollo.js` deployed to `/var/www/crm-backend/dist/routes/apollo.js` with `findUnique` count >= 3 (apolloPersonId + apolloOrgId + domain).
- Frontend `dist/` deployed to `/var/www/brandmonkz/` with assets/ folder containing literal `120000` at least twice (one per apolloApi.import + apolloApi.sendCampaign).
- pm2 `crm-backend` is `online` after `--update-env` restart; net restart count since deploy = 1 (the deploy restart itself).
- pm2 logs in last 200 lines contain ZERO occurrences of `PrismaClientKnownRequestError`, `P2002`, or `companies_domain_key`.
- /api/apollo/import smoke returns 200 OR 503 (both acceptable — 503 is the known upstream Apollo-key blocker, not our code). NEVER 500.
- https://brandmonkz.com/ returns HTTP 200 with the locked UA.
- User-facing 6-point checklist surfaced for the user to run in their own logged-in browser.
- Temp tarballs cleaned on BOTH local (`/tmp/quick6-*.tar.gz`) AND EC2.
- No additional commits made by this task — deploy is operational, not code (matches quick-5 task 2/3 pattern where `<files>` is empty).
  </done>
</task>

</tasks>

<verification>
**End-to-end success bar (per user constraints):**

1. **Bug 1 closed (frontend timeout):** Bundle at `/var/www/brandmonkz/assets/index-*.js` contains the 120000 literal at least 2 times. User can run "NetSuite customer" search on /apollo with perPage=25 and the request hangs in flight up to 120s, NOT 10s. No "Network error" toast on first attempt.

2. **Bug 2 closed (Company P2002):** Backend `dist/routes/apollo.js` has 3 `findUnique` calls + 1 `update` call + 1 `create` call (3-case ladder). pm2 logs since deploy show zero `PrismaClientKnownRequestError` / `companies_domain_key` / `Unique constraint failed`. /api/apollo/import smoke returns 200 or 503, never 500-from-Prisma.

3. **Phase 4 firewall preserved:** `git diff --name-only HEAD~1 | grep -E "campaigns\.ts|awsSES\.ts|ApolloPage\.tsx|NetSuiteCampaignWizard\.tsx|schema\.prisma"` returns 0.

4. **Deploy correctness:** Backend → `/var/www/crm-backend/dist/` (NOT the stale `backend/dist/` tree). Frontend → `/var/www/brandmonkz/` with old assets/ wiped (vite stale lazy chunk trap avoided). pm2 restart used the locked env-reload recipe.

5. **Git state:** Single atomic commit on `production`, author `jm@techcloudpro.com`, pushed fast-forward to origin. No `--force` used.
</verification>

<success_criteria>
- frontend/src/services/api.ts: `timeout: 120000` literal count = 2; `timeout: 10000` literal count = 1 (unchanged global default).
- backend/src/routes/apollo.ts: `findUnique` literal count = 3 (apolloPersonId + apolloOrgId + domain); `prisma.company.update` count = 1; `prisma.company.create` count = 1.
- Phase 4 firewall: 0 diffs against the 5 frozen files.
- /var/www/crm-backend/dist/routes/apollo.js exists with findUnique count >= 3.
- /var/www/brandmonkz/assets/*.js contains "120000" at least 2 times.
- pm2 crm-backend status = online; 0 PrismaClientKnownRequestError lines in logs since deploy.
- POST /api/apollo/import smoke from EC2 with valid SUPER_ADMIN JWT returns 200 OR 503 within 60s — NOT 500.
- https://brandmonkz.com/ HTTP 200 with locked UA.
- 1 commit on production with `jm@techcloudpro.com` author, pushed fast-forward.
- 6-point user-facing browser smoke checklist surfaced for final user gate.
</success_criteria>

<output>
After completion, create `.planning/quick/6-fix-apollo-bugs-120s-per-route-timeout-c/6-SUMMARY.md` capturing:
- What shipped (frontend timeout + backend 3-case Company ladder)
- Live verification output (grep counts on EC2, pm2 logs grep, /apollo/import smoke HTTP code + timing)
- Whether /apollo/import returned 200 (Apollo key live) or 503 (Phase 4.5 reopen trigger still active — credential issue, NOT our code)
- Commit SHA + push confirmation
- Phase 4 firewall scope-boundary verification (`git diff --name-only HEAD~1 | grep -E ... | wc -l == 0`)
- 6-point user-facing browser smoke checklist for the final user gate
- Any deviations from plan (should be NONE)
</output>
