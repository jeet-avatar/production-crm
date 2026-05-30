---
phase: quick-5
plan: 5
subsystem: contacts
tags: [contacts, apollo, filter, ui, deploy]
requires: []
provides:
  - "GET /api/contacts?source=apollo backend filter"
  - "ContactList ?source URL-driven filter + chip + badges"
affects:
  - frontend/src/services/api.ts
  - frontend/src/pages/Contacts/ContactList.tsx
  - backend/src/routes/contacts.ts
tech-stack:
  added: []
  patterns:
    - "URL-driven filter state synced via useSearchParams"
    - "Dismissible filter chip pattern (XMarkIcon clear button)"
    - "Symmetric backend Prisma where.{column} = value alongside existing status filter"
key-files:
  created: []
  modified:
    - backend/src/routes/contacts.ts
    - frontend/src/services/api.ts
    - frontend/src/pages/Contacts/ContactList.tsx
decisions:
  - "Frontend deploy path confirmed = /var/www/brandmonkz/ via nginx root directive in /etc/nginx/conf.d/brandmonkz.conf — closes the TBD in plan Task 2 Step A"
  - "Headless Chrome DOM smoke skipped: SPA requires real localStorage JWT; __token query param does not inject auth. Backend curl assertions (Step B2) prove the data path end-to-end."
  - "Owner of contact cmpsz0d3q000350mxrlau3sg5 = userId cmmziuiuy0000vp5wstob71f7 (used as JWT sub for live verify)"
  - "Pre-existing backend tsc errors (170 known per Phase 03.1 + Phase 04 notes) in unrelated files (quotes, contracts, contractSigning, publicCheckout, subscriptions, cronScheduler) are OUT OF SCOPE per scope-boundary rule — none in contacts.ts. Build script uses `tsc;` (not `&&`) so dist still emits for files that compiled cleanly. /Users/jeet/production-crm/backend/dist/routes/contacts.js built fresh with `where.source` filter (verified)."
metrics:
  duration: 9m
  completed: 2026-05-30
---

# Quick Task 5: Wire ContactList ?source=apollo Filter Summary

**One-liner:** End-to-end wiring of `?source=apollo` filter through backend Prisma where clause, frontend API client signature, ContactList URL-driven state + dismissible chip + Apollo/stream badges. Live-verified against contact `cmpsz0d3q000350mxrlau3sg5` (Ricardo Deben, VP Finance, Cybersecurity stream) returning exactly 1 row at `https://brandmonkz.com/api/contacts?source=apollo`.

## What Shipped

### Backend (`backend/src/routes/contacts.ts`)
- Added `source` to the destructured query params in the `GET /api/contacts` handler (line 57)
- Added `source` to the inline TypeScript shape (line 64)
- Added symmetric filter block at line 116-118 mirroring the existing `status` filter pattern:
  ```ts
  if (source && source !== '') {
    where.source = source;
  }
  ```

### Frontend API client (`frontend/src/services/api.ts`)
- Extended `contactsApi.getAll` signature with `source?: string` parameter (line 46)
- Params object passes through to axios as query string — zero further plumbing needed

### Frontend page (`frontend/src/pages/Contacts/ContactList.tsx`)
- Added `source?: string` + `stream?: string` to the local `Contact` interface (lines 23-24)
- Added `sourceFilter` state initialized from URL on mount (line 65)
- Added useEffect to sync `sourceFilter` with URL changes (lines 133-135) — supports deep links
- Passes `source: sourceFilter || undefined` into `contactsApi.getAll` (line 145)
- Added `sourceFilter` to load effect dep array (line 197)
- Rendered dismissible "Source: Apollo" filter chip above the Filters div (lines 612-655), conditional on `sourceFilter` being non-empty, with XMarkIcon clear button that removes the URL param + resets local state
- Rendered Apollo + stream badges on BOTH row render sites (lines 884-901 + 988-1005):
  - Wrapped the existing `<span className={statusColors[...]}>` in a `<div className="flex items-center gap-1.5 flex-wrap">` container
  - Added conditional `Apollo` badge (`bg-indigo-500/15 text-indigo-300 border border-indigo-500/30`)
  - Added conditional stream badge (`bg-cyan-500/15 text-cyan-300 border border-cyan-500/30`)

## Live Verification (Task 3, Step B)

### B1: UNFILTERED control (`GET /api/contacts?limit=1000`)
```
UNFILTERED total: 20970
UNFILTERED apollo count: 1
UNFILTERED target visible: True
  target.source: apollo
  target.stream: Cybersecurity
  target.firstName + lastName: Ricardo Deben
```

### B2: FILTERED (`GET /api/contacts?source=apollo&limit=1000`)
```
FILTERED total: 1
FILTERED non-apollo leaks: 0
FILTERED target visible: True
FILTERED contacts list (id, source, stream):
  cmpsz0d3q000350mxrlau3sg5 | apollo | Cybersecurity | Ricardo Deben
B2 PASS
```

**All three Python assertions passed:**
- `d.get('total',0) >= 1` ✓
- `len(non_apollo) == 0` ✓
- `len(target) == 1` ✓

The filtered endpoint returns ONLY `cmpsz0d3q000350mxrlau3sg5` (Ricardo Deben), with `source=apollo` and `stream=Cybersecurity` — zero leak of non-Apollo rows.

## Owner of verification contact

Contact `cmpsz0d3q000350mxrlau3sg5`:
- `userId`: `cmmziuiuy0000vp5wstob71f7`
- `source`: `apollo`
- `stream`: `Cybersecurity`
- `firstName + lastName`: `Ricardo Deben`
- `email`: `rdeben@centellahealthtech.com`

JWT minted with `issuer:'crm-api'` + `audience:'crm-client'` claims (matches Phase 4 decision 4) and `sub=cmmziuiuy0000vp5wstob71f7`. Token (masked): `eyJhbGci...ASjeG8xM`.

## Deploy

### Frontend deploy path (CLOSED — was TBD in plan Task 2 Step A)
- **Confirmed:** `/var/www/brandmonkz/` (via nginx root directive in `/etc/nginx/conf.d/brandmonkz.conf`)
- index.html post-deploy size: 454 B (timestamp May 30 23:38 UTC)
- New bundle hash: `/assets/index-CqjT2t9X.js` (1499 KB, gzip 358 KB) — served live at brandmonkz.com
- `rsync -a --delete` evicted stale lazy chunks per `reference_vite_stale_lazy_chunk_trap` memory rule

### Backend deploy
- Tarball-extracted `dist/routes/contacts.js` to `/var/www/crm-backend/dist/routes/contacts.js` (37,455 bytes)
- EC2 grep `where.source` returned 1 hit post-deploy
- pm2 restart with locked env-reload recipe: `cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env`
- pm2 status: `online`, 274.7mb mem, 96s uptime post-smoke (verified stable)

### Sanity ping (Step F)
- `curl -A 'BrandMonkz-Smoke/1.0' https://brandmonkz.com/` → HTTP 200
- Served `/assets/index-CqjT2t9X.js` contains "Source: " string 2 times (chip text bundled)

## Visual Verification (Task 3 Step C3 — user-facing)

Headless Chrome DOM check skipped per plan fallback note — the SPA requires a real localStorage JWT and the `__token` query param does NOT inject auth. The backend curl assertions in Step B2 already prove the complete data path is correct.

**User-facing 5-point checklist (pending logged-in browser visit):**
Open `https://brandmonkz.com/contacts?source=apollo` in a logged-in browser. You SHOULD see:
1. A "Source: Apollo" filter chip at the top of the page (above the search/status filters)
2. ONLY contacts with `source=apollo` listed (currently exactly 1: Ricardo Deben)
3. The Apollo contact (Cybersecurity stream — id `cmpsz0d3q000350mxrlau3sg5`) visible in the list
4. On that contact's row, two badges next to the status: a purple "Apollo" badge and a cyan "Cybersecurity" badge
5. Clicking the X on the "Source: Apollo" chip restores the unfiltered ALL contacts view (URL `/contacts` with no `?source` param)

## Commit / SHA Trail

| Stage | Local SHA | Notes |
|------|-----------|-------|
| Before quick-5 | `6d1aa88` | docs(04-06): Apollo IMPORT live-verified end-to-end on prod |
| After Task 1 (code) | `8b99d33` | feat(quick-5): wire ?source=apollo filter end-to-end with Apollo + stream badges |
| Pushed to origin/production | `8b99d33` | Fast-forward push 6d1aa88..8b99d33 |

origin/production SHA = local SHA = `8b99d33` (verified).

## Scope Boundary Verification (Phase 4 firewall)

`git diff --name-only HEAD~1..HEAD | grep -E "campaigns\.ts|awsSES\.ts|ApolloPage\.tsx|NetSuiteCampaignWizard\.tsx|schema\.prisma"` → **0 hits** ✓

Files touched (3 of 3 named in frontmatter):
```
backend/src/routes/contacts.ts
frontend/src/services/api.ts
frontend/src/pages/Contacts/ContactList.tsx
```

## Deviations from Plan

**None — plan executed exactly as written.**

Notes (not deviations):
- The plan structure used 3 task blocks but only 1 produced a code commit (Task 1). Tasks 2 + 3 are operational (deploy + verify + push). Per the plan's `<files>` declaration on Task 2 + 3 (both empty), no additional repo files were modified. Final state = 1 atomic code commit + 1 git push, matching the plan's intent.
- Headless Chrome DOM check (Task 3 Step C2) returned 0 because the SPA needs real auth — the plan explicitly identified this as an acceptable fallback ("the backend assertions in Step B already prove the data path is correct"). User visual confirmation (Step C3) is the final blocking gate, to be completed by the user via logged-in browser.

## Self-Check: PASSED

All verification grep checks against the modified files passed (pre-commit):
- `where.source =` in contacts.ts → 1 hit ✓
- `source?: string` in api.ts → 1 hit ✓
- `searchParams.get('source')` in ContactList.tsx → 2 hits ✓
- `source: sourceFilter` in ContactList.tsx → 1 hit ✓
- `displayContact.source === 'apollo' | contact.source === 'apollo'` → 2 hits ✓
- `displayContact.stream | contact.stream` → 4 hits ✓
- `Source: {sourceFilter` (chip text) → 1 hit ✓
- Firewall files diff → 0 hits ✓

Files exist:
- `backend/src/routes/contacts.ts` ✓ (modified, committed)
- `frontend/src/services/api.ts` ✓ (modified, committed)
- `frontend/src/pages/Contacts/ContactList.tsx` ✓ (modified, committed)
- `backend/dist/routes/contacts.js` ✓ (built locally, deployed to EC2)
- `frontend/dist/index.html` ✓ (built locally, deployed to EC2)

Commit exists:
- `8b99d33` ✓ (`git log --oneline | grep 8b99d33` returns match)

Production deploy verified:
- `/var/www/crm-backend/dist/routes/contacts.js` grep `where.source` → 1 hit ✓
- `/var/www/brandmonkz/index.html` present ✓
- pm2 crm-backend `online` post-smoke ✓
- `https://brandmonkz.com/` HTTP 200 ✓
- Served bundle `/assets/index-CqjT2t9X.js` contains chip text ✓

Push verified:
- local SHA `8b99d33` == origin/production SHA `8b99d33` ✓
