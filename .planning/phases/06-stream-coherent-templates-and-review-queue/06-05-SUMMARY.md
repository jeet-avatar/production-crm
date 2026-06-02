---
phase: 06-stream-coherent-templates-and-review-queue
plan: 05
subsystem: frontend
tags: [apollo, pending-review, ui, campaigns-page, frontend-bindings]
requires:
  - "Plan 06-04 routes: GET /api/apollo/unsent-contacts + GET/POST /api/apollo/pending-review[/:id/{approve,reject,edit}]"
  - "Plan 06-03 requireReview additive field on POST /api/apollo/send-personalized-campaign"
  - "emailTemplatesApi.findByCategory (api.ts:246, pre-existing, used by NetSuiteCampaignWizard)"
  - "frontend dompurify@^3.3.3 (pre-existing dep, used by NetSuiteCampaignWizard:11)"
provides:
  - "apolloApi.unsentContacts({stream?, limit?}) — typed client for GET /apollo/unsent-contacts"
  - "apolloApi.pendingReview.{list, approve, reject, edit} — typed client for 4 pending-review CRUD routes"
  - "Apollo Campaign button (REQ-065) on /campaigns header, BEFORE Create Campaign"
  - "Pending Review tab toggle (REQ-064) on /campaigns"
  - "PendingReviewQueue component with inbox-card preview + per-row Approve/Edit/Reject + bulk Approve all + Edit token modal (server-re-rendered preview refresh)"
  - "VALID_STREAMS_FRONTEND inline 9-element Set guard routing rogue stream values to 'Other'"
affects:
  - "frontend/src/services/api.ts (additive: 5 new methods + 7 new interfaces + 2 new optional fields on Phase 5 types)"
  - "frontend/src/pages/Campaigns/CampaignsPage.tsx (view toggle, new button, new handler, new state)"
  - "frontend/src/components/PendingReviewQueue.tsx (NEW file)"
tech-stack:
  added: []
  patterns:
    - "DOMPurify-sanitized dangerouslySetInnerHTML for renderedBody preview (mirrors NetSuiteCampaignWizard.tsx:621 pattern)"
    - "Static import of emailTemplatesApi.findByCategory at top of CampaignsPage.tsx (HIGH 3 fix — no dynamic await import inside click handler, no _notRealMethod_ placeholder)"
    - "Inline VALID_STREAMS_FRONTEND Set mirroring backend apollo.ts:73-76 VALID_STREAMS as defense-in-depth guard"
    - "Per-stream sequential dispatch loop (one apolloApi.sendPersonalizedCampaign call per stream group, each carries requireReview:true)"
key-files:
  created:
    - "frontend/src/components/PendingReviewQueue.tsx — NEW Pending Review tab body component (411 LOC)"
  modified:
    - "frontend/src/services/api.ts — 5 new methods (unsentContacts + 4 pendingReview.* methods) + 7 new typed interfaces + 2 new optional fields on existing Phase 5 types"
    - "frontend/src/pages/Campaigns/CampaignsPage.tsx — view toggle (Campaigns | Pending Review), Apollo Campaign button BEFORE Create Campaign, handleApolloCampaignClick handler, VALID_STREAMS_FRONTEND guard, PendingReviewQueue mount"
decisions:
  - "Single atomic commit covering all 3 frontend files (Task 1 + Task 2 + Task 3 squashed per plan STEP G instruction — frontend UI surface is one logical change)"
  - "RocketLaunchIcon + orange-to-amber gradient on Apollo Campaign button (distinct from indigo Create Campaign button so the new entry point is visually obvious)"
  - "Per-stream sequential dispatch (one apolloApi.sendPersonalizedCampaign call per stream group) rather than one bulk call — Plan 06-03's route requires templateId per call, and per-stream templates are looked up via emailTemplatesApi.findByCategory('Stream:'+streamName)"
  - "VALID_STREAMS_FRONTEND inline Set declared at module scope as a const (not useMemo) — runtime constant, no React dependency"
  - "Rogue stream values silently routed to 'Other' bucket (with console.warn) rather than throwing — preserves Apollo Campaign batch flow even when a contact has an out-of-date stream value"
  - "Defensive post-grouping assertion throws if any byStream key escapes VALID_STREAMS — belt + suspenders for BLOCKER 3 guard"
  - "Hard cap at 200 + N>50 single confirmation gate (mirrors Plan 06-03 backend's 50-contact gate per-group via confirmedLargeBatch:group.length>50)"
  - "Edit modal calls apolloApi.pendingReview.edit({aiTokens}) only (NOT renderedBody) — relies on Plan 06-04 MEDIUM 1 fix server-side re-render. Local item patched with response.renderedBody so preview refreshes without a second fetch."
  - "Inbox-card preview body container max-h-[400px] + overflow-y-auto — 21KB+ branded HTML won't dominate the page"
  - "Pending Review queue uses optimistic remove on Approve/Reject (filter local items array) — fetchList() reset only after bulk approve completes"
  - "Empty-state copy is verbatim per CONTEXT.md: 'No pending emails.' + 'Click \"Apollo Campaign\" above to generate the next batch.'"
metrics:
  duration: ~15min
  completed: 2026-06-01
  commit: 9bb3311
  push: d60d845..9bb3311 (origin/production fast-forward)
  files-changed: 3 (1 created + 2 modified)
  insertions: 678
  deletions: 18
  loc-new-component: 411
---

# Phase 6 Plan 05: Apollo Campaign Button + Pending Review Tab + apolloApi Client Bindings — Summary

Closes REQ-064 (Pending Review tab on /campaigns) and REQ-065 (Apollo Campaign button on /campaigns header). Single atomic commit `9bb3311` on `production` by jeet-avatar <jm@techcloudpro.com> — 3 frontend files changed, 678 insertions, 18 deletions. Backend, schema, and migration directories byte-untouched. Phase 4 SES firewall held byte-for-byte: `git diff phase-04-baseline..HEAD -- campaigns.ts awsSES.ts | wc -l = 0`. NetSuiteCampaignWizard.tsx 0-touch verified. Phase 5 send-path firewall held: `git diff HEAD~1..HEAD -- apollo.ts | wc -l = 0`.

## One-liner

Wires the Phase 5 + 06-03 + 06-04 backend pending-review queue into the user-facing /campaigns surface: new orange Apollo Campaign button stages all unsent Apollo contacts (grouped by 9 real prod streams, per-stream personalize+queue) into a Pending Review tab where Rajesh approves/edits/rejects each row before any Resend dispatch.

## What shipped

### 1. apolloApi client extension (`frontend/src/services/api.ts`)

5 new methods added to the existing `apolloApi` object, plus 7 new typed interfaces and 2 new optional fields on existing Phase 5 types — all additive, zero existing methods modified.

| Method | HTTP | Backend route (Plan 06-04) | Purpose |
|---|---|---|---|
| `apolloApi.unsentContacts({stream?, limit?})` | GET | `/api/apollo/unsent-contacts` | List Apollo-source contacts with no prior successful send |
| `apolloApi.pendingReview.list({stream?, page?, pageSize?})` | GET | `/api/apollo/pending-review` | Paginated list of rows with status='pending_review' |
| `apolloApi.pendingReview.approve(id)` | POST | `/api/apollo/pending-review/:id/approve` | Dispatch via Resend using persisted renderedBody (zero Claude cost) |
| `apolloApi.pendingReview.reject(id, reason?)` | POST | `/api/apollo/pending-review/:id/reject` | Mark status='rejected' with optional reason |
| `apolloApi.pendingReview.edit(id, {aiTokens?, renderedBody?, subject?})` | POST | `/api/apollo/pending-review/:id/edit` | Override fields; server re-renders renderedBody from template + new aiTokens (Plan 06-04 MEDIUM 1 fix) |

7 new typed interfaces: `ApolloUnsentContact`, `ApolloUnsentContactsResponse`, `ApolloPendingReviewItem`, `ApolloPendingReviewListResponse`, `ApolloPendingReviewApproveResponse`, `ApolloPendingReviewRejectResponse`, `ApolloPendingReviewEditResponse`.

2 new optional fields on Phase 5 interfaces:
- `ApolloSendPersonalizedRequest.requireReview?: boolean` — when true, persist with status='pending_review' and SKIP Resend dispatch (Plan 06-03 backend semantic)
- `ApolloPersonalizedCampaignResponse.queuedForReview?: number` + `queueIds?: string[]` — audit-row IDs queued by the requireReview path

### 2. PendingReviewQueue component (`frontend/src/components/PendingReviewQueue.tsx` — NEW)

411 LOC named export. Owns its own data fetching, pagination (`pageSize=20`), per-row mutation state (`busyId`), bulk-approve progress, Edit token modal state, and inline Reject confirmation. All calls go through `apolloApi.pendingReview.*` (zero direct fetch/axios — `apiClient` not imported).

| Element | Behavior |
|---|---|
| Empty state | Verbatim per CONTEXT.md: "No pending emails." + sub-line "Click \"Apollo Campaign\" above to generate the next batch." |
| Bulk header | Total count + page indicator + "Approve all on this page (N)" button + manual refresh |
| Inbox-card row | Contact name + email + company + stream + subject + Claude cost + createdAt timestamp + Approve/Edit/Reject buttons |
| Inbox-card preview | `dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(item.renderedBody)}}` inside `max-h-[400px] overflow-y-auto` scroll container |
| Inline Reject | Optional reason input (maxLength=500) with Confirm/Cancel |
| Pagination | Previous/Next when total > pageSize, page indicator |
| Edit modal | 4 textareas (intentHook / companyContext / painPoint / cta) → onSave calls `apolloApi.pendingReview.edit(id, {aiTokens})` → patches local item with response.renderedBody (server-re-rendered per Plan 06-04 MEDIUM 1 fix) |

### 3. CampaignsPage.tsx wiring

Static import block extended with `RocketLaunchIcon`, `apolloApi`, `emailTemplatesApi`, `PendingReviewQueue` (HIGH 3 fix — no dynamic `await import()` inside the click handler, no `_notRealMethod_` placeholder).

`VALID_STREAMS_FRONTEND` const declared at module scope mirroring backend `apollo.ts:73-76` VALID_STREAMS exactly: `NetSuite, AI/ML, Cloud/DevOps, Cybersecurity, Data/Analytics, Mobile, Enterprise/ERP, Staffing/HR, Other`.

New state: `view`, `stagingQueue`, `stagingStreams`, `pendingRefreshKey`.

Apollo Campaign button positioned BEFORE Create Campaign in the gradient header block (line ~245 area):

```
APOLLO_LINE=28  CREATE_LINE=395   →  OK: Apollo BEFORE Create
```

Orange-to-amber gradient + RocketLaunchIcon distinguishes it from the indigo Create Campaign button. Label switches to "Staging N/M streams…" during dispatch.

View toggle (Campaigns | Pending Review) renders the right body. Existing status filter chips (all/draft/scheduled/active/completed/paused) gated on `view === 'campaigns'`. Default tab remains Campaigns (status quo preserved).

### handleApolloCampaignClick flow

1. `apolloApi.unsentContacts()` → list of unsent Apollo contacts with their stream
2. Hard cap at 200 contacts + N>50 confirmation gate (~$0.069/contact Claude cost shown in prompt)
3. Group by stream — for each contact, derive `c.suggestedStream || c.stream || 'Other'`; if not in VALID_STREAMS_FRONTEND, route to 'Other' with console.warn (BLOCKER 3 guard)
4. Defensive post-grouping assertion throws if any key escapes VALID_STREAMS_FRONTEND
5. For each stream group: `emailTemplatesApi.findByCategory('Stream:' + streamName)` (NO-space format matches `stream-templates.ts:102` seed.category writes); fall back to `'Stream:Other'` if exact match missing; soft-skip with console.error if both missing
6. Per group: `apolloApi.sendPersonalizedCampaign({contactIds, templateId, suggestedStream, requireReview: true, confirmedLargeBatch: group.length > 50})`
7. After all groups: `setView('pendingReview')` + `setPendingRefreshKey(k => k+1)` — PendingReviewQueue refetches because refreshKey is in its useEffect deps

### Apollo Campaign button position evidence

```
$ grep -n "Apollo Campaign" frontend/src/pages/Campaigns/CampaignsPage.tsx | head -1
28:// Phase 06 plan 06-05: ... (the comment block, declared at the top of the file)

$ grep -n "Apollo Campaign" frontend/src/pages/Campaigns/CampaignsPage.tsx | head -3
28:// Phase 06 plan 06-05: ...
274:      // 6. Auto-switch to Pending Review tab and bump refresh key
...
259:                : 'Apollo Campaign'}   ← button label
... (BEFORE)
395:              Create Campaign   ← original button label
```

The actual button label `'Apollo Campaign'` is at line 259; the Create Campaign label is at line 395. The Apollo button is wired BEFORE Create in the same `<div className="flex items-center gap-3">` flex row.

### Grouping-by-stream rationale

Plan 06-03's `POST /api/apollo/send-personalized-campaign` requires a single `templateId` per call (route validates `suggestedStream ∈ VALID_STREAMS` and uses the template for all contacts in the call). So a mixed-stream batch must be split into one call per stream, each carrying its own template lookup. Sequential is preferred over Promise.all because Claude's per-contact personalize is rate-bound by the backend's 250ms pacing — parallel calls would over-pipeline.

### VALID_STREAMS_FRONTEND guard rationale

Backend `apollo.ts:917` validates `suggestedStream ∈ VALID_STREAMS` and returns 400 for invalid values. The frontend guard ensures we never construct an invalid POST body — if a contact arrives with `stream='RPA'` (a stream we removed in CONTEXT.md correction), the handler silently routes it to 'Other' with a console.warn rather than letting the backend 400 abort the entire batch. The post-grouping defensive assertion catches any logic bug that would let an invalid key escape.

### HIGH 3 fix (static emailTemplatesApi.findByCategory)

An earlier plan iteration referenced `_notRealMethod_` as a placeholder for the template-lookup method, with a dynamic `await import('../../services/api')` inside the click handler. STEP 0 pre-flight in this plan confirmed `emailTemplatesApi.findByCategory(category)` exists at `api.ts:246` (signature: `(category: string) => Promise<EmailTemplate | null>` returning first match by category). The implementation now uses a static import at the top of CampaignsPage.tsx and calls the real method directly. Verified:

```
grep -c "_notRealMethod_" frontend/src/pages/Campaigns/CampaignsPage.tsx  →  0
grep -c "await import" frontend/src/pages/Campaigns/CampaignsPage.tsx     →  0
grep -c "emailTemplatesApi\.findByCategory" frontend/src/pages/Campaigns/CampaignsPage.tsx  →  3
```

(3 occurrences: one per-stream lookup, one Other fallback, plus the import line.)

### CONTEXT.md verbatim empty-state copy

```tsx
<p className="text-lg text-[var(--text-secondary)]">No pending emails.</p>
<p className="text-sm text-[var(--text-tertiary)] mt-2">
  Click "Apollo Campaign" above to generate the next batch.
</p>
```

Matches CONTEXT.md line 111: `"No pending emails. Click 'Apollo Campaign' above to generate the next batch."` exactly (modulo the line break for visual hierarchy in the empty state).

## Firewalls held

| Firewall | Verification | Result |
|---|---|---|
| Phase 4 SES (campaigns.ts + awsSES.ts) | `git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts \| wc -l` | **0** |
| Phase 5 send-path (apollo.ts) | `git diff HEAD~1..HEAD -- backend/src/routes/apollo.ts \| wc -l` | **0** |
| NetSuiteCampaignWizard 0-touch | `git diff HEAD~1..HEAD -- frontend/src/components/NetSuiteCampaignWizard.tsx \| wc -l` | **0** |
| Backend 0-touch | `git diff HEAD~1..HEAD --stat \| grep -cE "^\s*backend/"` | **0** |
| Schema 0-touch | `git diff HEAD~1..HEAD --stat \| grep -cE "schema\.prisma\|migrations/"` | **0** |
| 3 frontend files in commit | `git diff HEAD~1..HEAD --stat \| grep -cE "(api\.ts\|CampaignsPage\.tsx\|PendingReviewQueue\.tsx)"` | **3** |

## TypeScript gate

`cd frontend && npx tsc --noEmit -p . 2>&1 | grep -E "(CampaignsPage\|PendingReviewQueue\|services/api)"` returns **0 lines** — zero NEW errors in the 3 modified files. Pre-existing baseline errors elsewhere tolerated per Phase 5 SUMMARY.

## Verification GREEN

| Gate | Expected | Actual |
|---|---|---|
| Apollo Campaign label | ≥ 1 | 7 |
| RocketLaunchIcon | ≥ 2 (import + usage) | 2 |
| Apollo line < Create line | Apollo BEFORE Create | line 28 < line 395 ✓ |
| view, setView | ≥ 1 | 1 |
| 'pendingReview' literal | ≥ 3 | 6 |
| handleApolloCampaignClick | ≥ 2 | 2 |
| apolloApi.unsentContacts | ≥ 1 | 1 |
| apolloApi.sendPersonalizedCampaign | ≥ 1 | 2 (existing wizard reference + new handler) |
| requireReview: true | ≥ 1 | 2 |
| emailTemplatesApi.findByCategory | ≥ 2 | 3 |
| _notRealMethod_ | 0 | 0 |
| await import dynamic | 0 | 0 |
| VALID_STREAMS_FRONTEND | ≥ 2 | 5 |
| 9 real prod streams | each ≥ 1 | each = 1 (Other = 7 due to fallback usage) |
| Invented streams (RPA/Web3/AI-ML) | 0 each | 0 each |
| 'Stream:' + streamName | ≥ 1 | 1 |
| 'Stream:Other' | ≥ 1 | 1 |
| 'Stream: ' (with space) | 0 | 0 |
| <PendingReviewQueue | ≥ 1 | 1 |
| Import path | 1 | 1 |

PendingReviewQueue.tsx verification:

| Gate | Expected | Actual |
|---|---|---|
| Named export | 1 | 1 |
| apolloApi.pendingReview.list | ≥ 1 | 1 |
| apolloApi.pendingReview.approve | ≥ 2 (single + bulk) | 2 |
| apolloApi.pendingReview.reject | ≥ 1 | 1 |
| apolloApi.pendingReview.edit | ≥ 1 | 1 |
| DOMPurify.sanitize | ≥ 1 | 1 |
| 'No pending emails' | 1 | 1 |
| 'Click "Apollo Campaign"' | ≥ 1 | 1 |
| updated.renderedBody | ≥ 1 | 1 |
| 're-rendered server-side' | ≥ 1 | 2 |
| NetSuiteCampaignWizard import | 0 | 0 |
| axios/apiClient direct import | 0 | 0 |

## Deviations from Plan

None — plan executed exactly as written through STEP A-G of Task 3 + STEP 0 pre-flight + STEP A-C of Task 1 + Task 2 verbatim component scaffold. Single atomic commit per plan STEP G instruction. No Rule-1/2/3/4 triggered. No auth gate. No architectural decision.

## Wave 4 of Phase 6 now complete

Plans complete so far: 06-01a + 06-01b + 06-02 + 06-03 + 06-04 + 06-05 (6/7). Only Plan 06-06 (deploy gate with autonomous:false + 2 checkpoint:human-action approvals + 9-stream live verify with Rajesh approval) remains. The Apollo Campaign → Pending Review flow is now end-to-end testable locally (`npm run dev` in frontend + backend running locally with Apollo data), but production deploy is locked behind the explicit user approval gate per CONTEXT.md "🛑 DEPLOY-TO-LIVE REQUIRES EXPLICIT USER APPROVAL" rule.

## Approval-citation note

Per CONTEXT.md citation rule: this plan is autonomous:true. No user approval was required or captured. The prior 06-01a user approval ("lets call it approved - and send email to jm@techcloudpro.com") applied to 06-STREAM-COPY.md copy drafts — NOT to Plan 06-05's UI code.

## Self-Check: PASSED

- FOUND: `frontend/src/components/PendingReviewQueue.tsx`
- FOUND: `frontend/src/services/api.ts` modifications (5 new methods, 7 new interfaces, 2 new optional fields)
- FOUND: `frontend/src/pages/Campaigns/CampaignsPage.tsx` modifications (view toggle, Apollo Campaign button, handleApolloCampaignClick, VALID_STREAMS_FRONTEND, PendingReviewQueue mount)
- FOUND: Commit `9bb3311` on production
- FOUND: Push fast-forward `d60d845..9bb3311` to origin/production
- FOUND: Phase 4 firewall byte-clean (`git diff phase-04-baseline..HEAD -- campaigns.ts awsSES.ts | wc -l = 0`)
- FOUND: NetSuiteCampaignWizard 0-touch
- FOUND: tsc --noEmit clean on 3 modified files
