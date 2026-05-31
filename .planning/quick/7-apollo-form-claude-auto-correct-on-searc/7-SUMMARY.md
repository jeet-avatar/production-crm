---
phase: quick-7
plan: 7
subsystem: apollo
tags: [apollo, anthropic, claude, form-ux, presets, normalization, deploy, pm2]
requires:
  - "backend/src/routes/apollo.ts /import handler (pre-existing from quick-6 3-case ladder)"
  - "frontend/src/services/api.ts apolloApi.import + sendCampaign (pre-existing from quick-6 120s timeout)"
  - "frontend/src/components/ApolloSearchForm.tsx (pre-existing)"
  - "frontend/src/pages/Apollo/ApolloPage.tsx (pre-existing)"
  - "@anthropic-ai/sdk ^0.65.0 (already in backend/package.json:42)"
  - "ANTHROPIC_API_KEY on EC2 /var/www/crm-backend/.env (TCP workspace key, 108 chars, prefix sk-ant-api03-VG, suffix IQAA — per memory anthropic-key-tcp-workspace)"
provides:
  - "Backend POST /api/apollo/normalize-filters (standalone Claude-normalization endpoint)"
  - "Backend normalizeFiltersWithClaude() helper auto-applied inside /api/apollo/import (autoNormalize default true)"
  - "Frontend apolloApi.normalize() standalone method; ApolloImportResponse extended with corrections + warning"
  - "Frontend ApolloSearchForm: 4 ICP presets in <details> collapsible + per-field placeholders + per-field ✓/✗ hints"
  - "Frontend ApolloPage results panel: 🤖 Claude refined your filters info block + ⚠ Claude unavailable warning"
affects:
  - backend/src/routes/apollo.ts
  - frontend/src/services/api.ts
  - frontend/src/components/ApolloSearchForm.tsx
  - frontend/src/pages/Apollo/ApolloPage.tsx
tech-stack:
  added: []
  patterns:
    - "Promise.race([anthropic.messages.create(...), timeoutPromise]) — 8s budget, never throws, always returns { normalized, corrections, warning? }"
    - "Module-level Anthropic singleton mirroring services/ai-orchestrator.service.ts:2-9 init pattern"
    - "Strict-JSON system prompt with defensive markdown-fence stripping on parse"
    - "<details>/<summary> ICP-preset collapsible with applyPreset() handler"
key-files:
  created:
    - .planning/quick/7-apollo-form-claude-auto-correct-on-searc/7-SUMMARY.md
  modified:
    - backend/src/routes/apollo.ts
    - frontend/src/services/api.ts
    - frontend/src/components/ApolloSearchForm.tsx
    - frontend/src/pages/Apollo/ApolloPage.tsx
decisions:
  - "Rule-1 deviation: bumped Claude race-timeout 3s -> 8s after live verify showed claude-sonnet-4-6 consistently takes 3.3-5s for the 4KB system prompt + reasoning. 3s budget made every real call fall back to raw inputs (Case A initially returned corrections=[] + 'Claude timed out' warning even on the canonical 'Saas Companies in Irvine' input). 8s still well within axios 120s per-call cap. Documented inline (apollo.ts:143-145). Separate commit 17c2ceb."
  - "Mirrored ai-orchestrator.service.ts:2-9 Anthropic SDK init pattern (module-level singleton, reads ANTHROPIC_API_KEY at module load). Missing key = null client → fast-path returns { normalized: raw, corrections: [], warning: 'Claude not configured' }. Never fatal at boot."
  - "claude-sonnet-4-6 model confirmed working on EC2 (direct probe returned 'OK' in 1.0s for simple call; 3.3s for full system prompt). Anthropic API key from TCP workspace (108 chars, billed to TechCloudPro account)."
  - "Defensive markdown-fence strip on Claude response: `text.replace(/^```json\\s*/i, '').replace(/```\\s*$/g, '').trim()` — Claude sometimes wraps JSON in fences despite the 'no markdown' instruction (observed in direct probe). Falls back to warning if JSON.parse still fails."
  - "Used jq 'head -1' workaround for smoke JSON files because curl -w appends 'HTTP {code}' footer to body file when -o is not separated. Future smoke scripts should split -o stdout from -w stderr."
  - "Vite build emits pre-existing 'Duplicate style attribute' warning in ContactList.tsx:869 — that file was NOT touched by quick-7 (Phase-4 firewall protected). Warning predates this work."
  - "Phase-4 firewall verified clean (HEAD~2..HEAD over campaigns.ts / awsSES.ts / NetSuiteCampaignWizard.tsx / ContactList.tsx / schema.prisma = 0 lines diff)."
metrics:
  duration: 25m
  completed: 2026-05-30
---

# Quick Task 7: Apollo Claude Auto-Correct on Search + Form UX Upgrades — Summary

**One-liner:** Backend Claude normalize-filters endpoint + autoNormalize default-true injection into /import — corrects user mistakes like "Saas Companies in Irvine" tag before hitting Apollo (extracts SaaS as tag, moves Irvine to personLocations). Frontend form: 4 ICP presets + per-field placeholders + green/red ✓/✗ hints. Results panel: "🤖 Claude refined your filters" info block. 3-case live verify all PASSED on production.

## What Shipped

### Backend (`backend/src/routes/apollo.ts`)

- **Anthropic SDK init** mirroring `services/ai-orchestrator.service.ts:2-9` — module-level singleton, reads `ANTHROPIC_API_KEY` at module load. Missing key → null client (graceful, never fatal at boot).
- **`normalizeFiltersWithClaude()` helper** — claude-sonnet-4-6, temperature 0, max_tokens 1000, 8s `Promise.race` timeout. Returns `{ normalized, corrections, warning? }`. NEVER throws — 5 fallback paths (missing key / timeout / empty response / malformed JSON / SDK error) all return raw filters + descriptive warning.
- **Strict-JSON system prompt** teaching Apollo field semantics: personTitles (discrete OR-matched titles), personLocations (geographic only), organizationKeywordTags (discrete dictionary tags), minEmployees/maxEmployees (integers). With ✓/✗ examples and explicit "extract location from tag field" + "extract industry from location field" rules.
- **`autoNormalize` default-true injection into `/import`** — when caller doesn't set `autoNormalize:false`, Claude normalizes filters before `searchPeople(apiKey, effectiveFilters)`. Response body appends `corrections` array and optional `warning` string.
- **New `POST /api/apollo/normalize-filters` route** — standalone preview endpoint sharing the router-level `authenticate` middleware. Useful for future client-side filter preview UX.

### Frontend (`frontend/src/services/api.ts`)

- `ApolloImportResponse` extended with optional `corrections?: Array<{ field, from, to, reason }>` and `warning?: string`.
- New `ApolloNormalizeResponse` interface (standalone /normalize-filters response shape).
- New `apolloApi.normalize(filters)` method calling `POST /apollo/normalize-filters` (uses default 10s axios timeout — Claude has its own 8s server-side budget).

### Frontend (`frontend/src/components/ApolloSearchForm.tsx`)

- **"📋 Common ICP examples (click to fill)" `<details>` collapsible** with 4 clickable presets:
  - SaaS CFOs in California
  - NetSuite end-user customers (US) — with yellow "tag returns consultancies, leave blank" note
  - FinTech CFOs in New York
  - Manufacturing VP Finance (US)
- `applyPreset()` handler — wires 5 form-state setters (titles, locations, keywords, minEmp, maxEmp).
- **Concrete placeholders** on every input: titles (`CFO, Controller, VP Finance`), locations (`Irvine California, San Francisco CA, United States`), keywords (`SaaS, FinTech, Cybersecurity`), employee numerics (`100`, `500`, `25`).
- **Per-field ✓/✗ hints** with green (`#34D399`) good examples and red (`#FCA5A5`) common-mistake counter-examples on all 3 CSV inputs.
- Pre-existing consultancy-warning yellow banner preserved.

### Frontend (`frontend/src/pages/Apollo/ApolloPage.tsx`)

- **"🤖 Claude refined your filters" info block** (indigo border) rendered above the StatCard grid when `result.corrections.length > 0`. Lists each correction as `<code>field</code>: "from" → "to" — reason`.
- **Yellow "⚠ {warning}" block** rendered when `result.warning` is present (Claude timed out / unavailable / not configured).
- Existing 4-StatCard grid + skipped-records `<details>` + Start campaign / See imported contacts buttons untouched.

## Commits

| Hash | Subject | Author | Branch |
|------|---------|--------|--------|
| `d0a3708` | `feat(quick-7): Apollo Claude auto-normalize on search + form UX upgrades` | `jm@techcloudpro.com / jeet-avatar` | `production` |
| `17c2ceb` | `fix(quick-7): bump Claude normalize timeout 3s -> 8s (Rule-1 deviation)` | `jm@techcloudpro.com / jeet-avatar` | `production` |

`origin/production` SHA = local HEAD = `17c2ceb` (fast-forward push from `cf74c02..17c2ceb`).

## Deploy

### Backend dist (`/var/www/crm-backend/dist/`)

- Tarball: `/tmp/quick7-backend.tar.gz` (577,695 bytes initial build; rebuilt after deviation fix)
- scp to EC2, sudo-tar-extracted, rsync into canonical dist
- Post-deploy verification (after deviation fix):
  - `sudo grep -c "normalizeFiltersWithClaude" /var/www/crm-backend/dist/routes/apollo.js` → **3** ✓ (function + 2 callers)
  - `sudo grep -c "claude-sonnet-4-6" /var/www/crm-backend/dist/routes/apollo.js` → **1** ✓
  - `sudo grep -c "Promise.race" /var/www/crm-backend/dist/routes/apollo.js` → **1** ✓
  - `sudo grep -cE "router.post.{0,5}/normalize-filters" /var/www/crm-backend/dist/routes/apollo.js` → **1** ✓

### Frontend dist (`/var/www/brandmonkz/`)

- Tarball: `/tmp/quick7-frontend.tar.gz` (377,100 bytes; index-B_i2kZPX.js + index-BxmwUxEM.css)
- Pre-extract: `sudo rm -rf /var/www/brandmonkz/assets` (Vite stale lazy-chunk eviction per memory `reference_vite_stale_lazy_chunk_trap`)
- rsync with `--delete` semantics
- Post-deploy verification:
  - `sudo grep -roE "Common ICP examples" /var/www/brandmonkz/assets/ | wc -l` → **1** ✓
  - `sudo grep -roE "Claude refined your filters" /var/www/brandmonkz/assets/ | wc -l` → **1** ✓
  - `ls -la /var/www/brandmonkz/index.html` → 454 B, May 31 00:41

### pm2 restart (locked env-reload recipe)

```bash
cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env
```

- pm2 status post-restart: `online`, restart_time = 7 → 9 (one restart per deploy: feat + deviation fix)
- ANTHROPIC_API_KEY in process env verified: 108 chars (prefix `sk-ant-api03-VG`, suffix `IQAA` — TCP workspace key per memory)
- Tarballs cleaned on both ends

## Live Verification (3-case smoke)

JWT minted on EC2: `userId: 'cmmziuiuy0000vp5wstob71f7'`, issuer `crm-api`, audience `crm-client`, exp 30m. Length 224 chars. Prefix `eyJhbGci...`, suffix `...GoCN4eJk` (last 8 char). User-Agent: `Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0` (bypasses nginx 403-on-curl/8.x default UA gate per quick-6 lesson).

### Case A — `POST /api/apollo/normalize-filters` with dirty input

**Request:**
```json
{"filters":{"personTitles":["CFO"],"personLocations":["United States"],"organizationKeywordTags":["Saas Companies in Irvine"]}}
```

**Response (HTTP 200 in 3.58s):**
```json
{
  "normalized": {
    "personTitles": ["CFO"],
    "personLocations": ["United States", "Irvine"],
    "organizationKeywordTags": ["SaaS"]
  },
  "corrections": [
    {
      "field": "organizationKeywordTags",
      "from": "Saas Companies in Irvine",
      "to": "SaaS (moved 'Irvine' to personLocations)",
      "reason": "Tag field expects discrete dictionary tags like 'SaaS'. 'Irvine' is a city and belongs in personLocations. 'Companies' is structural filler and was dropped."
    }
  ]
}
```

**Result:** corrections.length = **1** ✓ — Claude correctly extracted `SaaS` as discrete tag and moved `Irvine` to personLocations. Rajesh's exact bug closed.

### Case B — `POST /api/apollo/import` with dirty input + autoNormalize default-true

**Request:**
```json
{"filters":{"personTitles":["CFO"],"personLocations":["United States"],"organizationKeywordTags":["Saas Companies in Irvine"],"perPage":3},"enrich":true}
```

**Response (HTTP 200 in 8.79s):**
```json
{
  "imported": 3,
  "skipped": 0,
  "total": 3,
  "contactIds": ["cmpt256j0000366fn8125ip5u","cmpt257u2000766fnugkg6mvl","cmpt2595y000b66fn3krih6ho"],
  "suggestedStream": "Other",
  "errors": [],
  "corrections": [
    {
      "field": "organizationKeywordTags",
      "from": "Saas Companies in Irvine",
      "to": "SaaS (moved 'Irvine' to personLocations)",
      "reason": "Tag field expects discrete dictionary tags like 'SaaS'. 'Irvine' is a city and belongs in personLocations. The phrase 'Companies in' is prose and was dropped — only the core industry tag 'SaaS' is retained."
    }
  ]
}
```

**Result:** corrections.length = **1** ✓, imported = **3** ✓, no `warning` field (Claude succeeded), zero new P2002 in pm2 logs. Time 8.79s = 5.2s for Claude + 3.6s for Apollo search + enrich + DB upserts.

### Case C — `POST /api/apollo/import` with CLEAN input (no false positives)

**Request:**
```json
{"filters":{"personTitles":["CFO","Controller","VP Finance"],"personLocations":["United States"],"organizationKeywordTags":["SaaS"],"minEmployees":100,"maxEmployees":500,"perPage":3},"enrich":true}
```

**Response (HTTP 200 in 7.64s):**
```json
{
  "imported": 2,
  "skipped": 0,
  "total": 3,
  "contactIds": ["cmpt25h0c000f66fn0wpvnb77","cmpt25if3000j66fnwz6d3n4q"],
  "suggestedStream": "Other",
  "errors": [{"apolloPersonId":"557130eb7369645ea6420700","reason":"email locked after enrich"}],
  "corrections": []
}
```

**Result:** corrections.length = **0** ✓ — no false positives on clean input. Claude correctly returned empty corrections array; the results panel will NOT render the "Claude refined your filters" info block for this search.

### pm2 error log scan post-deploy

```
$ pm2 logs crm-backend --err --lines 200 --nostream | grep -cE "P2002|companies_domain_key|PrismaClientKnownRequestError|normalizeFiltersWithClaude"
2
```

The 2 hits both reference `apollo.ts:193:27` — that line number is from pre-quick-6 code (quick-6 SUMMARY explicitly noted these as stale pre-deploy traces). Zero new errors from quick-7. Zero `[apollo.normalize] Claude error:` lines (Claude calls all succeeded after the 8s timeout bump).

### pm2 status

```
crm-backend  online  fork  cpu 0%  memory 272.9mb  restarts 9  uptime 3s+
```

Restart count: 8 (pre-quick-7) → 9 (post-deviation-fix). Online, stable.

## Phase-4 Firewall Verification

```
$ cd /Users/jeet/production-crm
$ git diff HEAD~2 -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts \
                     frontend/src/components/NetSuiteCampaignWizard.tsx \
                     frontend/src/pages/Contacts/ContactList.tsx \
                     backend/prisma/schema.prisma | wc -l
0
```

Zero touches across all 5 firewall files.

Files modified (HEAD~2..HEAD):
```
backend/src/routes/apollo.ts
frontend/src/components/ApolloSearchForm.tsx
frontend/src/pages/Apollo/ApolloPage.tsx
frontend/src/services/api.ts
```

Exactly 4 code files, matching plan frontmatter.

## Deviations from Plan

### [Rule 1 - Bug] Claude race-timeout 3s → 8s

- **Found during:** Task 3 live verify Case A (first run)
- **Issue:** First Case A smoke returned HTTP 200 but with `corrections: []` and `warning: "Claude timed out — used your inputs as-is"`. The 3s budget set in the plan was below the actual Claude latency (3.3-5s) for the full 4KB system prompt + reasoning. This meant the feature was DEAD — every real call would fall back to raw filters, and Rajesh's "Saas Companies in Irvine" bug would NOT be auto-corrected. The plan's success criterion #1 ("Rajesh's bug closes end-to-end with corrections in result") could not be met.
- **Fix:** Bumped `setTimeout(() => resolve('TIMEOUT'), 3000)` → `8000` and updated the inline comment block to document the deviation rationale. 8s is still well within the axios 120s per-call cap (from quick-6), so user-visible latency stays bounded.
- **Files modified:** `backend/src/routes/apollo.ts` (2 lines: comment + setTimeout literal)
- **Commit:** `17c2ceb`
- **Verification:** All 3 smoke cases re-ran post-fix and PASSED (A: 1 correction, B: 1 correction + imported=3, C: 0 corrections).

### [Rule 0 — None] No other deviations

Plan's `autoNormalize` injection point, system prompt content, fallback contract, frontend form structure, results panel block placement, and deploy recipe all executed exactly as written.

## Authentication Gates

None. ANTHROPIC_API_KEY already on EC2 (TCP workspace key, per memory `anthropic-key-tcp-workspace`). Plan correctly anticipated this — no gate to recover from.

## Self-Check: PASSED

- `backend/src/routes/apollo.ts` ✓ (normalizeFiltersWithClaude=3 grep, claude-sonnet-4-6=1 code-ref + 1 comment, Promise.race=1, /normalize-filters route=1, autoNormalize injection in /import handler verified)
- `frontend/src/services/api.ts` ✓ (corrections? field on ApolloImportResponse, ApolloNormalizeResponse interface, apolloApi.normalize method)
- `frontend/src/components/ApolloSearchForm.tsx` ✓ (ICP_PRESETS=2 refs, applyPreset=2 refs, "Common ICP examples"=3 refs, per-field ✓/✗ hints on all 3 CSV inputs, placeholders on all 6 inputs)
- `frontend/src/pages/Apollo/ApolloPage.tsx` ✓ ("Claude refined your filters"=1 string, result.corrections=2 refs, result.warning conditional)
- Commits `d0a3708` + `17c2ceb` exist on `production` with author `jeet-avatar <jm@techcloudpro.com>` ✓
- `origin/production` HEAD = `17c2cebfc4a2bac92add972e5b846f5bed22bb3a` = local HEAD ✓
- EC2 backend dist verified: 3/1/1/1 grep counts ✓
- EC2 frontend dist verified: "Common ICP examples"=1, "Claude refined your filters"=1 ✓
- pm2 `crm-backend` status = `online`, restart_time 9, ANTHROPIC_API_KEY=108 chars in process env ✓
- Case A: HTTP 200, corrections.length=1 ✓
- Case B: HTTP 200, corrections.length=1, imported=3 ✓
- Case C: HTTP 200, corrections.length=0, imported=2 ✓
- Phase-4 firewall: 0 line diff over campaigns.ts / awsSES.ts / NetSuiteCampaignWizard.tsx / ContactList.tsx / schema.prisma ✓
- Files modified HEAD~2..HEAD: exactly 4 (matches plan frontmatter) ✓

## User-facing browser smoke (recommended final gate, not yet run)

Open `https://brandmonkz.com/apollo` in Rajesh's already-logged-in browser:

1. The "📋 Common ICP examples (click to fill)" `<details>` block is present at the top of the form
2. Clicking "SaaS CFOs in California" populates titles + locations + keywords + min/max emp
3. Each CSV input (titles / locations / keyword tags) shows green ✓ + red ✗ counter-example below the input
4. Type `Saas Companies in Irvine` into keyword tags → click Search
5. Within ~10-60s, the results panel renders with:
   - Purple-bordered "🤖 Claude refined your filters" info block listing the correction
   - 4 StatCards (Imported / Skipped / Total / Suggested stream) below the corrections block
6. Re-run with the SaaS CFOs CA preset — corrections block should NOT appear (corrections=[])
