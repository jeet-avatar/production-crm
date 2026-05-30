---
phase: 04-apollo-import-and-auto-campaign
plan: 04
subsystem: ui
tags: [frontend, react, apollo, prospecting, route, sidebar, heroicons]
requires:
  - 04-03-PLAN (POST /api/apollo/import contract: { filters, enrich } → { imported, skipped, total, contactIds, suggestedStream, errors })
provides:
  - /apollo route in protected Layout shell
  - ApolloPage.tsx (search + import + result panel + disabled wizard-handoff button)
  - ApolloSearchForm.tsx (titles / locations / keyword tags / employee range / perPage / enrich toggle + consultancy warning banner)
  - apolloApi.import() client method (matches plan 04-03 contract)
  - Sidebar nav entry "Apollo" using RocketLaunchIcon
affects:
  - 04-05 (NetSuiteCampaignWizard handoff — wires the disabled placeholder button on ApolloPage)
  - 04-06 (smoke test flow exercises this UI)
tech-stack:
  added: []
  patterns:
    - apiClient baseURL ends in /api → resource paths in *Api clients use bare resource (e.g. /apollo/import not /api/apollo/import)
    - Result panel renders 4-stat grid + collapsible errors detail + dual-action footer (start campaign / see contacts)
    - 503 errors render as yellow warning with operator hint; 401/403 as auth message; other as red error
    - Sidebar nav additions go in the navigation[] array adjacent to the most-related siblings (Apollo next to Job Leads)
key-files:
  created:
    - frontend/src/pages/Apollo/ApolloPage.tsx
    - frontend/src/components/ApolloSearchForm.tsx
  modified:
    - frontend/src/services/api.ts
    - frontend/src/App.tsx
    - frontend/src/components/Sidebar.tsx
key-decisions:
  - apiClient baseURL already prefixes /api — apolloApi.import posts to `/apollo/import` (verified by reading existing emailComposerApi pattern in api.ts:259+). Including /api in the resource path would have double-prefixed.
  - "Start campaign with these contacts" button rendered but disabled with tooltip "Wizard handoff lands in plan 04-05" — ships /apollo in a usable state for isolated verification without coupling to wizard code that does not yet exist.
  - "See imported contacts" deep-links to /contacts?source=apollo so user can verify imports in the existing ContactList (which already filters by source). No ContactList code change required — this is a static href to the existing filter param.
  - Sidebar nav uses RocketLaunchIcon from heroicons (existing dep) and places "Apollo" immediately after "Job Leads" since both are lead-generation sources.
  - ApolloSearchForm prefills sensible defaults (CFO/Controller/VP Finance, United States, 100-500 emp, perPage=25) so a one-click "Search Apollo" works for a representative ICP. perPage is clamped to max 25 in handleSubmit to enforce Apollo's per-call limit.
  - Consultancy warning banner is rendered above the keyword input — verbatim from RAJESH-HANDBOOK Section 6 / Pitfall 4 guidance.
  - ICP industry-include / tech_uids filter UI is intentionally NOT added (Phase 4.5 — same locked deferral as plans 04-02 and 04-03).
  - ContactList.tsx left fully untouched — `git diff frontend/src/pages/Contacts/ContactList.tsx | wc -l == 0`. The dead-code ApolloImportModal comment block stays commented per user-locked decision. Count of `ApolloImportModal` references unchanged at 2.
  - Result panel renders `contactIds` in component state but does NOT render the array of IDs in the DOM — only the count via `result.imported`. The IDs are kept in `result` for the disabled button to read once 04-05 wires it.
patterns-established:
  - Frontend feature pages live at `frontend/src/pages/<Feature>/<Feature>Page.tsx`; shared form/input components live at `frontend/src/components/<Component>.tsx`
  - Page-level error handling categorizes by HTTP status: 503 → warning yellow + hint, 401/403 → auth red, other → generic red
requirements-completed: [REQ-040, REQ-041]
duration: 12min
completed: 2026-05-30
---

# Phase 04 Plan 04: Apollo Page + Search Form + Sidebar Nav Summary

**Dedicated `/apollo` page wired to `POST /api/apollo/import` with ApolloSearchForm component, sidebar nav entry, and disabled campaign-handoff placeholder for plan 04-05.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-30T20:23:00Z
- **Completed:** 2026-05-30T20:35:15Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 3
- **Commits:** 2 task commits + 1 plan-close commit

## Accomplishments

- New `/apollo` route ships as the SOLE host for Apollo imports (per user-locked decision)
- ApolloPage renders a search form, loading spinner, friendly 503 yellow alert, and a 4-stat result panel (imported / skipped / total / suggested stream) with collapsible errors detail
- ApolloSearchForm exposes titles / locations / keyword tags / employee range / perPage / enrich toggle with sensible CFO/Finance ICP defaults — and a consultancy warning banner above the keyword input
- `apolloApi.import(filters, enrich)` client method matches the plan 04-03 backend contract byte-for-byte (typed `ApolloSearchFilters` request + typed `ApolloImportResponse`)
- Sidebar gains an "Apollo" nav entry next to "Job Leads" using `RocketLaunchIcon`
- "Start campaign with these contacts →" button renders disabled with a "wired in plan 04-05" tooltip; "See imported contacts" button deep-links to `/contacts?source=apollo`
- `tsc --noEmit` exits 0 across the whole frontend after both task commits
- ContactList.tsx is left fully untouched (`git diff | wc -l == 0`), dead-code ApolloImportModal stays commented per user-locked decision

## Task Commits

Each task was committed atomically:

1. **Task 1: Add apolloApi.import client + ApolloSearchForm component** — `66a4737` (feat)
2. **Task 2: /apollo page + route + sidebar nav** — `b005169` (feat)

**Plan metadata commit:** (next) — docs(04-04): complete dedicated /apollo page plan

## Files Created/Modified

**Created**
- `frontend/src/pages/Apollo/ApolloPage.tsx` — Dedicated prospecting page. Renders header, ApolloSearchForm, conditional loading spinner, conditional error alert (yellow for 503, red otherwise), and conditional result panel with stat cards + disabled campaign-handoff button + deep link to contacts. Lives at 268 lines including a small StatCard helper component.
- `frontend/src/components/ApolloSearchForm.tsx` — Search/filter form. Inputs: comma-separated job titles, comma-separated locations, comma-separated company keyword tags, min/max employees, perPage (clamped 1-25), and an "enrich" toggle. Emits a normalized `ApolloSearchFilters` shape to the parent via `onSubmit`. Includes the consultancy warning banner above the keyword input. ~210 lines.

**Modified**
- `frontend/src/services/api.ts` — Added `ApolloSearchFilters` interface, `ApolloImportResponse` interface, and `apolloApi.import()` method. Path is `/apollo/import` (not `/api/apollo/import`) because `apiClient.baseURL` is already `${VITE_API_URL}/api` per line 3.
- `frontend/src/App.tsx` — Added `import ApolloPage from './pages/Apollo/ApolloPage'` and `<Route path="apollo" element={<ApolloPage />} />` inside the protected `<Layout />` shell next to the existing `job-leads` route.
- `frontend/src/components/Sidebar.tsx` — Added `RocketLaunchIcon` to the heroicons import block and appended `{ name: 'Apollo', href: '/apollo', icon: RocketLaunchIcon }` to the `navigation[]` array immediately after the Job Leads entry.

## Verification

```
$ ls frontend/src/pages/Apollo/ApolloPage.tsx
frontend/src/pages/Apollo/ApolloPage.tsx                   # exists ✓

$ ls frontend/src/components/ApolloSearchForm.tsx
frontend/src/components/ApolloSearchForm.tsx               # exists ✓

$ grep -n "apolloApi" frontend/src/services/api.ts
449:export const apolloApi = {                             # apolloApi present ✓

$ grep -n "apollo" frontend/src/App.tsx
39:import ApolloPage from './pages/Apollo/ApolloPage';
145:              <Route path="apollo" element={<ApolloPage />} />   # route registered ✓

$ grep -n "Apollo" frontend/src/components/Sidebar.tsx
22:  RocketLaunchIcon,
42:  { name: 'Apollo', href: '/apollo', icon: RocketLaunchIcon },   # sidebar entry ✓

$ git diff frontend/src/pages/Contacts/ContactList.tsx | wc -l
0                                                          # ContactList UNTOUCHED ✓

$ grep -c "ApolloImportModal" frontend/src/pages/Contacts/ContactList.tsx
2                                                          # commented modal still present, not restored ✓

$ (cd frontend && npx tsc --noEmit); echo "EXIT=$?"
EXIT=0                                                     # tsc clean ✓
```

### Layout overview (page render)

```
┌───────────────────────────────────────────────────────────────┐
│ Apollo Prospecting                                            │
│ Search Apollo.io for new prospects, enrich their emails, and  │
│ import them as contacts tagged source=apollo.                 │
├───────────────────────────────────────────────────────────────┤
│ ⚠ Heads up: Filtering by tech keyword tag (e.g. NetSuite)     │
│   may match consultancies/partners instead of end-user        │
│   customers. Prefer specific industry terms…                  │
├───────────────────────────────────────────────────────────────┤
│ Job titles      [CFO, Controller, VP Finance               ]  │
│ Locations       [United States                             ]  │
│ Keyword tags    [                                          ]  │
│ Min emp [100]   Max emp [500]   Per page [25]                 │
│ [x] Reveal emails (uses ~1 Apollo credit per contact)         │
│ [ 🔍 Search Apollo → ]                                        │
└───────────────────────────────────────────────────────────────┘

On success the result panel renders:
┌───────────────────────────────────────────────────────────────┐
│ Import results                                                │
│ ┌──────────┬───────────────┬───────────────┬──────────────┐   │
│ │ Imported │ Skipped (dedup)│ Total returned│ Sug. stream │   │
│ │ 18       │ 7              │ 25            │ NetSuite    │   │
│ └──────────┴───────────────┴───────────────┴──────────────┘   │
│ ▶ 3 record(s) skipped — see why                               │
│ [ 📧 Start campaign with these contacts → ] (disabled)         │
│ [ See imported contacts ↗ ]                                    │
└───────────────────────────────────────────────────────────────┘
```

### Sidebar nav entry placement

The nav array order (Sidebar.tsx:32-49) is now:
Dashboard, Contacts, Companies, Deals, Quotes, Contracts, CRM Import, Job Leads, **Apollo (NEW)**, Activities, Analytics, Tags, Campaigns, Video Campaigns, Email Templates, Team, Settings.

"Apollo" is placed immediately after "Job Leads" because both feed the same downstream pipeline (lead-generation → Contact rows). Active state styling inherits the existing indigo-glow treatment used by all nav items.

### ContactList.tsx is unchanged

Confirmed via `git diff frontend/src/pages/Contacts/ContactList.tsx | wc -l == 0`. The dead-code `ApolloImportModal` reference count remains at 2 (the existing commented block — neither restored nor removed). User-locked decision honored.

## Decisions Made

See frontmatter `key-decisions` for the full list. Highlights:

- `apiClient.baseURL` already ends in `/api`, so the new method posts to `/apollo/import` (bare resource path) — matches the existing pattern used by every other `*Api` client in `api.ts`.
- "Start campaign" button is rendered but disabled in this plan; plan 04-05 will replace `disabled` with a click handler that mounts `NetSuiteCampaignWizard` and passes `result.contactIds` + `result.suggestedStream` as props.
- "See imported contacts" link uses `/contacts?source=apollo` to lean on the existing ContactList source filter — zero ContactList code change required.
- ICP industry-include / tech_uids filter UI deliberately NOT added (Phase 4.5).

## Deviations from Plan

None — plan executed exactly as written. Both task action blocks were implemented verbatim with the minor adjustments documented in `key-decisions` (which were all foreshadowed by the plan's own "Note" comments, e.g. the baseURL `/api` prefix check).

## Issues Encountered

- `frontend/node_modules` was missing at executor start. Ran `npm install --no-audit --no-fund` once in the background; completed cleanly. No further env friction.
- A separate `contactsApi.getByIds()` helper was added to `frontend/src/services/api.ts` by an external edit between Task 1 and Task 2 (likely user/linter prep for plan 04-05's wizard handoff). Left in place per system-reminder guidance — no impact on Plan 04-04 verification.

## User Setup Required

None — this is pure frontend work. Backend env (`APOLLO_API_KEY`, `RESEND_API_KEY`) was already documented in Plan 04-03's SUMMARY and lives on EC2 only per `CLAUDE.md`.

## Next Phase Readiness

- `/apollo` is shippable in isolation: form renders, submits, handles 503, displays results, links to `/contacts?source=apollo`.
- The placeholder "Start campaign" button is ready to be wired by Plan 04-05 — it already has access to `result.contactIds` (string[]) and `result.suggestedStream` (string) in component state. The wiring change is one `onClick` + remove `disabled`/`title`.
- No new dependencies added; no schema migrations; no env changes; no risky surface.

## Self-Check: PASSED

- [x] `frontend/src/pages/Apollo/ApolloPage.tsx` exists
- [x] `frontend/src/components/ApolloSearchForm.tsx` exists
- [x] `apolloApi` defined in `frontend/src/services/api.ts:449`
- [x] `apolloApi.import` posts to `/apollo/import` (matches plan 04-03 contract via apiClient `/api` prefix)
- [x] `/apollo` route registered in `frontend/src/App.tsx:145` inside protected `<Layout />`
- [x] Sidebar nav entry "Apollo" + `RocketLaunchIcon` added to `navigation[]` in `Sidebar.tsx:42`
- [x] Consultancy warning banner present in `ApolloSearchForm.tsx`
- [x] 503 / error branches present in `ApolloPage.tsx` handler
- [x] "Start campaign" button rendered with `disabled` + tooltip "Wizard handoff lands in plan 04-05"
- [x] Commit `66a4737` exists (Task 1 — apolloApi + ApolloSearchForm)
- [x] Commit `b005169` exists (Task 2 — ApolloPage + route + sidebar)
- [x] `git diff frontend/src/pages/Contacts/ContactList.tsx | wc -l == 0` (ContactList UNTOUCHED)
- [x] `grep -c "ApolloImportModal" ContactList.tsx == 2` (dead-code comment preserved, not restored)
- [x] `npx tsc --noEmit` exits 0 across the whole frontend
- [x] All commits authored by `jm@techcloudpro.com` / `jeet-avatar`

---
*Phase: 04-apollo-import-and-auto-campaign*
*Completed: 2026-05-30*
