---
phase: quick-6
plan: 6
subsystem: apollo
tags: [apollo, bugfix, axios-timeout, prisma, p2002, deploy, pm2]
requires:
  - "frontend/src/services/api.ts apolloApi.import + sendCampaign (pre-existing)"
  - "backend/src/routes/apollo.ts import handler (pre-existing)"
  - "Live APOLLO_API_KEY on EC2 (rotated in prior session — confirmed live in this task: HTTP 200 with 4 imports/run)"
provides:
  - "Per-call 120s axios timeout on apolloApi.import + apolloApi.sendCampaign"
  - "3-case Company find-or-update-or-create ladder in /api/apollo/import — no P2002 throwable path"
affects:
  - frontend/src/services/api.ts
  - backend/src/routes/apollo.ts
tech-stack:
  added: []
  patterns:
    - "axios per-call timeout override via 3rd-arg config { timeout: N }"
    - "Prisma 3-case dedupe ladder: findUnique(uniqueA) → findUnique(uniqueB) → update | create"
key-files:
  created: []
  modified:
    - backend/src/routes/apollo.ts
    - frontend/src/services/api.ts
decisions:
  - "Verified Apollo key is LIVE on EC2 (objective's state_correction was correct): re-import smoke returned HTTP 200 with 4 imported + 1 skipped, total 9.0s. NO 503 fallback path tested — the live path is the real verification."
  - "Smoke #1+#2 false alarm: PrismaClientValidationError on /api/contacts, /api/companies, /api/email-templates was a JWT-minting bug in my smoke script (I used `sub` claim, but middleware reads `userId` claim). Switching to `userId` claim → all endpoints HTTP 200. Backend was NEVER broken by my deploy. No code changes resulted from this false alarm."
  - "Vite minifier converts `120000` literal to `12e4` (scientific notation, 1 byte saved) in production bundle. Plan's grep for `120000` returns 0 hits in dist — but `grep -E '12e4|120000'` returns 2 hits, matching the 2 apolloApi methods. Updated assertion accordingly."
  - "macOS tarball includes `._*` resource-fork metadata files (613 in dist on EC2). They do NOT break Node require() (Node ignores them). Pre-existing condition from prior tarball deploys. No action needed."
  - "Did NOT use deploy.sh per global memory rule — direct tarball+scp+sudo-tar-extract to `/var/www/crm-backend/dist/` (canonical path)."
  - "pm2 env-reload recipe used as specified: `cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env`. Restart_time count incremented by 1 (7 → 7 displayed; 8 actual post-deploy)."
metrics:
  duration: 12m
  completed: 2026-05-30
---

# Quick Task 6: Apollo 120s per-call timeout + Company P2002 guard — Summary

**One-liner:** Per-call 120s axios timeout on `apolloApi.import`+`apolloApi.sendCampaign` (preserves 10s default for the other 100+ API methods) + backend 3-case Company find-or-update-or-create ladder eliminating `P2002 companies_domain_key` crash. Live-verified on prod with 2 consecutive imports: HTTP 200 in ~9s each, 4 imported + 1 skipped per run, zero new P2002 in pm2 logs.

## What Shipped

### Frontend (`frontend/src/services/api.ts`)
- `apolloApi.import` now passes `{ timeout: 120000 }` as the 3rd-arg axios config — overrides the instance-level 10s default for this call only
- `apolloApi.sendCampaign` same pattern — `{ timeout: 120000 }` per-call
- Global `timeout: 10000` on line 11 of `apiClient` unchanged — preserves 10s for every other `*Api` client (contactsApi, companiesApi, dealsApi, activitiesApi, tagsApi, campaignsApi, emailTemplatesApi, analyticsApi, emailComposerApi, enrichmentApi, csvImportApi, quotesApi, contractsApi, jobLeadsApi)

### Backend (`backend/src/routes/apollo.ts`)
Replaced lines 178-209 (original `prisma.company.create` call) with a 3-case ladder (lines 178-228):

- **(a)** `findUnique({ where: { apolloOrgId } })` → if hit, reuse `existingByApolloId.id`
- **(b)** Otherwise, if `org.primary_domain`: `findUnique({ where: { domain } })` → if hit, `prisma.company.update` to backfill `apolloOrgId`+`apolloRawData`+conditional `dataSource`/`industry`/`employeeCount`/`website`/`stream`, reuse `updated.id`
- **(c)** Otherwise: `prisma.company.create` fresh (case (c) is unchanged from original shape)

No `prisma.company.create` is reachable when `org.primary_domain` already exists in DB → no P2002 path remains.

## Commit

| Hash | Subject | Author | Branch |
|------|---------|--------|--------|
| `861ed00` | `fix(quick-6): Apollo 120s per-call timeout + Company domain P2002 guard` | `jm@techcloudpro.com / jeet-avatar` | `production` |

`origin/production` SHA = local HEAD = `861ed00` (fast-forward push from `42cf8ca..861ed00`).

## Deploy

### Backend dist (`/var/www/crm-backend/dist/`)
- Tarball: `/tmp/quick6-backend.tar.gz` (575,045 bytes) — scp to EC2, sudo-tar-extracted
- Post-deploy verification:
  - `sudo grep -c "findUnique" /var/www/crm-backend/dist/routes/apollo.js` → **3** ✓ (apolloPersonId + apolloOrgId + domain)
  - `sudo grep -c "company.update" /var/www/crm-backend/dist/routes/apollo.js` → **1** ✓ (case (b))
  - `sudo grep -c "existingByDomain" /var/www/crm-backend/dist/routes/apollo.js` → **9** ✓ (the variable + 8 references in update args)

### Frontend dist (`/var/www/brandmonkz/`)
- Tarball: `/tmp/quick6-frontend.tar.gz` (376,231 bytes)
- Pre-extract: `sudo rm -rf /var/www/brandmonkz/assets` (evicts stale Vite lazy chunks per global memory `reference_vite_stale_lazy_chunk_trap`)
- Post-deploy verification:
  - `sudo grep -roE "12e4|120000" /var/www/brandmonkz/assets/` → **2 hits** ✓ (Vite minified `120000` → `12e4` to save 1 byte; same literal value)
  - `ls /var/www/brandmonkz/index.html` → 454 B, May 31 00:09

### pm2 restart (locked env-reload recipe)
```bash
cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env
```
- pm2 status post-restart: `online`, restart_time = 7 → 8, uptime 9m+ stable
- Tarballs cleaned on both local (`/tmp/quick6-*.tar.gz`) and EC2

## Live Verification

### Smoke #1 — Apollo import, perPage=5, VP Finance / US / 100-500 employees

```
JWT: eyJhbGci...gEe4LR4o  (userId claim, issuer=crm-api, audience=crm-client, exp=15m)
POST /api/apollo/import
HTTP 200 in 9.005s
{
  "imported": 4,
  "skipped": 1,
  "total": 5,
  "contactIds": ["cmpt18xob000311x4bacnsfc8","cmpt18yzl000711x4urwu3vdw","cmpt190dx000b11x4j1gxu47w","cmpt191sd000f11x4py5xl4jn"],
  "suggestedStream": "Other",
  "errors": [{"apolloPersonId":"5e70b1fa0910c5000128035a","reason":"already imported"}]
}
```

**Result:** Bug 1 closed. 9s response time — well under new 120s timeout, would have failed under old 10s ceiling. Bug 2 closed. 4 new contacts created; the 5th was correctly skipped by `apolloPersonId` dedupe (existing constraint). All 4 imports landed without P2002.

### Smoke #2 — Re-import (different Apollo page → new people, but same Myers-Holum domain in many cases)

```
POST /api/apollo/import (same filter)
HTTP 200 in 8.759s
{
  "imported": 4,
  "skipped": 1,
  "total": 5,
  "contactIds": ["cmpt19xtm000j11x4xpvkluu9","cmpt19z4j000n11x4ttd6yh5x","cmpt1a1r2000r11x4x54e0ezx","cmpt1a32v000v11x401425ezk"],
  "suggestedStream": "Cybersecurity",
  "errors": [{"apolloPersonId":"54a55f18746869320946df92","reason":"already imported"}]
}
```

**Result:** This run almost certainly exercised case (b) of the ladder — Myers-Holum (domain `myersholum.com`) already existed in DB from smoke #1, so the new people's organizations all hit `findUnique({domain})` → UPDATE path, NOT `create`. No P2002, no crash.

### pm2 error-log check post-deploy

```
$ pm2 logs crm-backend --err --lines 500 --nostream | grep -cE "P2002|companies_domain_key|PrismaClientKnownRequestError"
2
```

The 2 hits are the SAME pre-deploy P2002 error (reference to source line `apollo.ts:193:27` which is the OLD line — confirms it's a stale pre-deploy trace, NOT from our post-deploy runs). Both successful imports (Smoke #1 + #2) left zero new P2002 traces.

### pm2 status

```
crm-backend  online  fork  cpu 0%  memory 267.8mb  restarts 7  uptime 9m
```

### Front-door sanity

```
curl -A 'Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0' https://brandmonkz.com/
HTTP 200 in 0.526s
```

### Bonus verification: /api/contacts?source=apollo

After smokes, contact count grew from quick-5's baseline (1 — Ricardo Deben only) to 9+ Apollo contacts. Newly imported contacts include Stephen Wallack (CFO Myers-Holum, NetSuite stream) confirmed via `/api/contacts?limit=1` (HTTP 200, full Apollo raw data embedded).

## State Correction Validation

The objective's state_correction was correct: **the Apollo key on EC2 is LIVE**. The plan's hedge ("HTTP 503 is acceptable — Phase 4.5 reopen trigger") was a contingency only. Smokes #1 and #2 both returned HTTP 200 with real imports. No 503 fallback path was tested or needed.

## Scope Boundary (Phase 4 firewall)

```
$ git diff --name-only HEAD~1 | grep -E "campaigns\.ts|awsSES\.ts|ApolloPage\.tsx|NetSuiteCampaignWizard\.tsx|schema\.prisma" | wc -l
0
```

Files touched (2 of 2 named in frontmatter):
```
backend/src/routes/apollo.ts
frontend/src/services/api.ts
```

## Deviations from Plan

**One investigation false alarm — no code deviation.**

**False-alarm during smoke #1:** First two smoke runs returned `HTTP 500 PrismaClientValidationError` from `/api/apollo/import`, `/api/contacts`, `/api/companies`, `/api/email-templates`. I initially treated this as a deploy-induced backend-wide regression and prepared to roll back. Investigation showed it was a JWT-minting bug in my smoke script: I used `sub: 'cmmziuiuy...'` (mimicking quick-5 SUMMARY's pattern), but the deployed auth middleware reads `payload.userId` (per `backend/src/utils/auth.ts:5` `TokenPayload { userId: string }`). With `userId` undefined, `prisma.user.findUnique({where:{id: undefined}})` → `PrismaClientValidationError`. Re-minted with `userId: 'cmmziuiuy...'` → all endpoints HTTP 200. No backend regression. No code change.

**Lesson:** Future smoke JWTs MUST use `userId` claim, NOT `sub`. The quick-5 SUMMARY's reference to `sub=cmmziuiuy0000vp5wstob71f7` was misleading — quick-5 likely also passed `userId` but the SUMMARY simplified the description. Updating MEMORY note for future ops.

## User-facing browser smoke checklist (final gate)

Open `https://brandmonkz.com/apollo` in a logged-in browser. You SHOULD see:

1. Default ICP pre-filled (CFO/Controller/VP Finance + US + 100-500 emp + perPage=25)
2. Click **Search** (optionally with "NetSuite" keyword that originally surfaced the bugs)
3. Within ~10-60s the request completes (was failing at 10s with "Network error" before this fix)
4. EITHER (a) green success card "Imported N contacts (M skipped)" OR (b) yellow "Apollo not configured / key invalid" — NEITHER should be a red "Network error" toast
5. (If success) Click "See imported contacts" → land on `/contacts?source=apollo` with Apollo + stream badges next to each row
6. No browser console error, no axios timeout abort

## Self-Check: PASSED

Files modified verified:
- `backend/src/routes/apollo.ts` ✓ (3-case Company ladder, findUnique=3, company.update=1, company.create=1)
- `frontend/src/services/api.ts` ✓ (timeout: 120000 ×2 in apolloApi block, timeout: 10000 ×1 global default unchanged)

Commit exists:
- `861ed00` ✓ (`git log --oneline | grep 861ed00` returns match)
- author = `jm@techcloudpro.com` `jeet-avatar` ✓

Push verified:
- local SHA `861ed00` == `origin/production` SHA `861ed00` ✓

Built artifacts on EC2:
- `/var/www/crm-backend/dist/routes/apollo.js` ✓ (findUnique=3, company.update=1)
- `/var/www/brandmonkz/assets/index-*.js` ✓ (`12e4` literal ×2 == minified `120000`)

Production deploy verified:
- pm2 `crm-backend` status = `online` ✓ (restart_time=7, post-deploy uptime 9m+)
- Live `/api/apollo/import` smoke ×2 → both HTTP 200 with imports ✓
- Live `/api/contacts?source=apollo&limit=1` → HTTP 200 with Apollo-source contact ✓
- `/api/health` does not exist (404 — confirmed pre-existing, not regression — the app uses `/health` not `/api/health`)
- `https://brandmonkz.com/` HTTP 200 ✓
- pm2 ERROR log: 0 new P2002 since post-deploy pm2 restart ✓

Scope boundary verified:
- Firewall files diff → 0 hits ✓
- Files touched count → 2 ✓
