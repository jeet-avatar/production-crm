---
phase: 02-quote-contract-lifecycle
plan: "02"
subsystem: frontend
tags: [deals, quotes, contracts, routing, navigation]
dependency_graph:
  requires:
    - 02-01  # Quote/Contract Prisma models + CRUD routes (backend)
  provides:
    - DealDetail page with tab navigation
    - /deals/:id route
    - DocumentsTab shell
    - quotesApi and contractsApi frontend service objects
  affects:
    - frontend/src/App.tsx
    - frontend/src/pages/Deals/DealBoard.tsx
    - frontend/src/services/api.ts
tech_stack:
  added: []
  patterns:
    - Tab grid layout copied from ContactDetail.tsx (3-col grid, gradient active state)
    - apiClient.get/post/put/patch/delete pattern consistent with dealsApi
    - Promise.all for parallel API fetches in DocumentsTab
    - e.stopPropagation() on icon button to preserve parent onClick behavior
key_files:
  created:
    - frontend/src/pages/Deals/DealDetail.tsx
    - frontend/src/pages/Deals/components/DocumentsTab.tsx
  modified:
    - frontend/src/services/api.ts
    - frontend/src/App.tsx
    - frontend/src/pages/Deals/DealBoard.tsx
decisions:
  - dealsApi.getById already existed in api.ts (line 123) — no addition needed
  - ArrowTopRightOnSquareIcon confirmed present in @heroicons/react/24/outline before importing
  - New Quote button shown only when dealStage === CLOSED_WON, gated by presence of onNewQuote prop
  - View-detail icon button placed in top-right of card header row (flex gap alongside probability %)
  - components/ directory created fresh (did not exist before this plan)
metrics:
  duration: "~3 minutes"
  completed: "2026-03-19"
  tasks_completed: 2
  files_created: 2
  files_modified: 3
requirements:
  - REQ-010
  - REQ-012
---

# Phase 02 Plan 02: DealDetail Page + Route Wiring Summary

One-liner: DealDetail page with 3-tab layout (Overview, Activities, Documents) wired to /deals/:id route, with DocumentsTab shell fetching quotes/contracts via new quotesApi and contractsApi service objects.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add quotesApi/contractsApi, DealDetail.tsx, DocumentsTab.tsx shell | dacccd8 | api.ts, DealDetail.tsx, components/DocumentsTab.tsx |
| 2 | Register /deals/:id route, add view-detail icon button to DealBoard | 8776be9 | App.tsx, DealBoard.tsx |

## What Was Built

**quotesApi and contractsApi (api.ts):**
Two service objects appended to `frontend/src/services/api.ts` following the exact `dealsApi` pattern. Each has `getByDeal`, `create`, `update`, `updateStatus`, and `delete` methods using `apiClient`.

**DealDetail.tsx:**
Full detail page at `frontend/src/pages/Deals/DealDetail.tsx`. Fetches deal via `dealsApi.getById(id)`. Renders a 3-tab grid (Overview, Activities, Documents) using the exact tab button pattern from `ContactDetail.tsx` — gradient active state, scale-105, shadow. Back button navigates to `/deals`. Overview shows all deal fields in a `.card p-6`. Activities renders deal.activities list with empty state. Documents renders `<DocumentsTab>`.

**DocumentsTab.tsx:**
Shell component at `frontend/src/pages/Deals/components/DocumentsTab.tsx`. On mount with `dealId` dep, fetches `quotesApi.getByDeal` and `contractsApi.getByDeal` in parallel via `Promise.all`. Renders two `.card p-6` sections (Quotes and Contracts) with table views (title, total/signedBy, status badge, created, delete action) or empty state text. New Quote button only shown when `dealStage === 'CLOSED_WON'`; both action buttons disabled when Wave 3 props (`onNewQuote`/`onNewContract`) are not passed.

**App.tsx:**
Imported `DealDetail`, added `<Route path="deals/:id" element={<DealDetail />} />` immediately after the `deals` board route.

**DealBoard.tsx:**
Added `useNavigate` import from react-router-dom, `ArrowTopRightOnSquareIcon` from heroicons, `const navigate = useNavigate()` in component. Added icon button in card header top-right row with `e.stopPropagation()` so card click still opens edit modal unchanged.

## Verification

- `grep -n "deals/:id" frontend/src/App.tsx` → line 117 (1 result)
- `grep -n "^export const quotesApi\|^export const contractsApi" frontend/src/services/api.ts` → lines 337, 361
- `ls frontend/src/pages/Deals/DealDetail.tsx` → exists
- `ls frontend/src/pages/Deals/components/DocumentsTab.tsx` → exists
- `grep -n "stopPropagation" frontend/src/pages/Deals/DealBoard.tsx` → present (3 lines: icon button + existing stage select)
- `npx tsc --noEmit` → exits 0, no errors

## Deviations from Plan

None — plan executed exactly as written.

`dealsApi.getById` was confirmed present at api.ts line 123 before Task 1 began (anti-hallucination check), so no addition was needed — consistent with plan note "verify this method exists; if it doesn't exist yet, add it."

## Self-Check: PASSED

- FOUND: frontend/src/pages/Deals/DealDetail.tsx
- FOUND: frontend/src/pages/Deals/components/DocumentsTab.tsx
- FOUND: .planning/phases/02-quote-contract-lifecycle/02-02-SUMMARY.md
- FOUND: commit dacccd8 (Task 1)
- FOUND: commit 8776be9 (Task 2)
