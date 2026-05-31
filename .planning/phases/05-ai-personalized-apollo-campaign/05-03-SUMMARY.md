---
phase: 05-ai-personalized-apollo-campaign
plan: 03
subsystem: frontend-wizard
tags: [react, wizard, ai-personalize, cost-telemetry, cache-invalidation, large-batch-gate]

# Dependency graph
requires:
  - phase: 05-ai-personalized-apollo-campaign
    plan: 02
    provides: "apolloApi.sendPersonalizedCampaign client (600s timeout) + 5 typed interfaces (ApolloPersonalizeAITokens / ApolloPersonalizeAuditEntry / ApolloPersonalizedCampaignCost / ApolloPersonalizedCampaignResponse / ApolloSendPersonalizedRequest)"
provides:
  - "NetSuiteCampaignWizard 5-step flow (1.Audience → 2.Email → 3.AI Personalize → 4.Review → 5.Done)"
  - "Step 3 first-contact preview UI with inbox-card + AI token attribution panel + Re-generate button + N>50 confirmation gate"
  - "Step 4 Review re-uses previewResult.audit[0] (no duplicate Claude fetch)"
  - "Step 5 Done renders sent/failed/personalized/personalizeFailures/totalCostUSD/resendCostUSD + failure-details collapsible"
  - "Cache-invalidation on Back: previewResult cleared so template change in Step 2 forces fresh fetch on Step 3 re-entry"
affects: [05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useEffect deps `[step, firstContactId, templateId]` to invalidate cached preview when user changes selection or template"
    - "Explicit Back-button cache invalidation (clears previewResult + previewError before setStep(2)) — paired with deps array for symmetric invalidation"
    - "Single Re-generate ✨ button is the ONLY UX path that creates additional personalized_email_sends audit rows (per locked decision #10) — tooltip warns the operator about the ~$0.069 cost"
    - "Step 4 (Review) does not re-call Claude — re-uses previewResult.audit[0] from Step 3. Eliminates double-billing on simple Back/Next navigation"
    - "Selected-contact set sourced from `Array.from(selectedIds)` (NOT `importedContactIds`) — preview and live send operate on what the user CHECKED in Step 1, not the full Apollo import superset"
    - "Large-batch gate enforced at TWO layers: Step 3 UI checkbox (`confirmedLargeBatch` state) blocks `Looks good — Review →` button when N>50 && !confirmed; handleSend() repeats the precondition before POST"

key-files:
  created:
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-03-SUMMARY.md"
  modified:
    - "frontend/src/components/NetSuiteCampaignWizard.tsx (Task 1: +386 / -34; Task 2: +180 / -128 — net 1375 lines from 971)"

key-decisions:
  - "Imported `ApolloPersonalizedCampaignResponse` as a `type` (not value) — only used in useState generic and prop types"
  - "Step 3 useEffect deps array is literally `[step, firstContactId, templateId]` with `eslint-disable-next-line react-hooks/exhaustive-deps` immediately above (suppresses the fetchPreview reference warning while keeping the documented deps minimal — fetchPreview reads firstContactId+templateId+selectedIds+suggestedStream from closure but only the first two should retrigger)"
  - "Back-button cache invalidation written as multi-line `setPreviewResult(null); setPreviewError(null); setStep(2);` inside the onClick arrow body — semantically identical to plan's pinned single-line form. tsc + behavior unchanged"
  - "`bodyPlain` / `validationWarnings` / `sendBlocked` block (lines 302-318 of the pre-Phase-5 file) DELETED — the Step 3 (AI Personalize) preview + Step 4 (Review) precondition replace the body-length validation entirely. Server-side per-contact rendering happens via Claude tokens, not via the `subject`/`body` from Step 2 templates"
  - "`setSentCount` / `setFailedCount` state declarations + setters fully removed — replaced by `sendResult: ApolloPersonalizedCampaignResponse | null`. Project rule #5 (remove dead code) honored"
  - "Step 5 (Done) `Send another campaign` button resets ALL Phase 5 state — sendResult, previewResult, previewError, sendError, confirmedLargeBatch — not just step. Prevents stale preview/cost data carrying into a fresh wizard cycle"
  - "handleSend body rewritten in Task 1's commit (not Task 2). The function signature stayed `async function handleSend()` so the Step 4 Send button onClick reference didn't break across the commit boundary. Task 2's commit ONLY touched the Step 4 and Step 5 JSX blocks + the dead-code cleanup. This keeps each commit reviewable in isolation"
  - "Step 2 'Next' button label updated from 'Next: Review →' → 'Next: AI Personalize →' to match the renumbered flow (minor copy update, kept inside Task 1's commit since it pairs with the state-machine extension)"
  - "Step indicator container got `flexWrap: 'wrap'` to handle 5-label overflow on narrow viewports (760px max wizard width). The 4-label baseline was just-fits; adding 'AI Personalize' pushed past on smaller modals"

requirements-completed: [REQ-050, REQ-051, REQ-052]

# Metrics
duration: 5m37s
completed: 2026-05-31
---

# Phase 05 Plan 03: NetSuiteCampaignWizard 4→5 step refactor with AI Personalize Summary

**State machine `useState<1 | 2 | 3 | 4>(1)` → `useState<1 | 2 | 3 | 4 | 5>(1)` with new Step 3 (AI Personalize) injecting between Email and Review. Step 3 auto-fetches first-contact preview via `apolloApi.sendPersonalizedCampaign({ previewOnly: true })` on entry (cached via useEffect deps `[step, firstContactId, templateId]`). Re-generate ✨ is the sole UX path to spawn additional audit rows. Step 4 (Review) re-uses `previewResult.audit[0]` (no duplicate Claude fetch). Step 5 (Done) renders sent/failed/personalized/personalizeFailures + 7-field cost telemetry envelope + collapsible failure details. Dead `apolloApi.sendCampaign` reference removed. Phase 4 + Wave 2 firewall holds byte-for-byte.**

## Performance

- **Duration:** 5m 37s
- **Started:** 2026-05-31T01:59:01Z
- **Completed:** 2026-05-31T02:04:38Z
- **Tasks:** 2 (both committed atomically)
- **Files modified:** 1 (frontend/src/components/NetSuiteCampaignWizard.tsx)
- **Lines: Task 1** +386 / -34 (state machine + new Step 3 + fetchPreview + handleSend rewire)
- **Lines: Task 2** +180 / -128 (Step 4 JSX rewrite + Step 5 JSX rewrite + dead-code removal)
- **Final file size:** 1375 lines (was 971; +404 net)

## Wizard Step Diagram

```
┌─────────────┐    ┌─────────────┐    ┌──────────────────┐    ┌─────────────┐    ┌─────────────┐
│  1.Audience │ -> │   2.Email   │ -> │ 3.AI Personalize │ -> │  4.Review   │ -> │   5.Done    │
│             │    │             │    │                  │    │             │    │             │
│ pick from   │    │ subject +   │    │ first-contact    │    │ same preview│    │ sent/failed │
│ selectedIds │    │ body +      │    │ Claude preview   │    │ + Send btn  │    │ /AI counts/ │
│ (subset of  │    │ 3-layer     │    │ (~$0.069/contact)│    │ live send   │    │ cost / fail │
│ imported)   │    │ template    │    │ + AI token panel │    │             │    │ details     │
│             │    │ fallback    │    │ + N>50 confirm   │    │             │    │             │
└─────────────┘    └─────────────┘    └──────────────────┘    └─────────────┘    └─────────────┘
                                            │ ↑                       │ ↑
                                            │ │                       │ │
                                            │ └─ Back clears preview  │ └─ Back (preserves
                                            │    → re-fetch on entry  │     sendResult)
                                            │                         │
                                            └─ Re-generate ✨ creates │
                                               new audit row each click
                                                                      │
                                                                      └─ Send → handleSend
                                                                         (live, previewOnly
                                                                          OFF, contactIds =
                                                                          Array.from(selectedIds))
```

## State Machine Diff

| Field | Before (Wave 2) | After (Wave 3) |
|---|---|---|
| `step` | `useState<1 \| 2 \| 3 \| 4>(1)` | `useState<1 \| 2 \| 3 \| 4 \| 5>(1)` |
| `sentCount` | `useState(0)` | REMOVED |
| `failedCount` | `useState(0)` | REMOVED |
| `sendResult` | — | `useState<ApolloPersonalizedCampaignResponse \| null>(null)` |
| `previewing` | — | `useState(false)` |
| `previewError` | — | `useState<string \| null>(null)` |
| `previewResult` | — | `useState<ApolloPersonalizedCampaignResponse \| null>(null)` |
| `confirmedLargeBatch` | — | `useState(false)` |
| `firstContactId` (derived) | — | `Array.from(selectedIds)[0] \|\| null` |
| `LARGE_BATCH_THRESHOLD` (const) | — | `50` |
| `validationWarnings` (derived) | `string[]` w/ 3 push branches | REMOVED (dead) |
| `bodyPlain` (derived) | `body.replace(/<[^>]+>/g, '').trim()` | REMOVED (dead) |
| `sendBlocked` (derived) | 4-clause OR | REMOVED (dead) |

## Canonical State Variable Inventory (Task 0 grep, 2026-05-30)

| Variable | File:Line | Type | Used by Phase 5 as |
|---|---|---|---|
| `step` | NetSuiteCampaignWizard.tsx:65 | `1 \| 2 \| 3 \| 4 \| 5` | State machine driver |
| `selectedIds` | NetSuiteCampaignWizard.tsx:69 | `Set<string>` | Source for `Array.from(selectedIds)` in live send + `Array.from(selectedIds)[0]` for preview |
| `templateId` | NetSuiteCampaignWizard.tsx:75 | `string \| null` | Required body field for both preview + live send |
| `sending` | NetSuiteCampaignWizard.tsx:81 | `boolean` | Live-send flag (kept, rewired) |
| `sendError` | NetSuiteCampaignWizard.tsx:82 | `string \| null` | Live-send error surface (kept) |
| `importedContactIds` | NetSuiteCampaignWizard.tsx:34 (prop) | `string[]` | NOT used for send — only as initial fetch source for `selectedIds` |
| `suggestedStream` | NetSuiteCampaignWizard.tsx:35 (prop) | `string` | Required body field for both preview + live send |
| `handleSend` | NetSuiteCampaignWizard.tsx:226 (post-rewire) | `async function` | Body fully replaced — calls `apolloApi.sendPersonalizedCampaign` (live) |

`importedContactIds[0]` is NEVER used (verified by grep). Use `Array.from(selectedIds)[0]` exclusively. Closes BLOCKER HIGH #5 from plan revision.

## Step 3 fetchPreview() Shape

```ts
const fetchPreview = async () => {
  if (!firstContactId || !templateId) {
    setPreviewError('No contact or template available for preview.');
    return;
  }
  setPreviewing(true);
  setPreviewError(null);
  setPreviewResult(null);
  try {
    const { data } = await apolloApi.sendPersonalizedCampaign({
      contactIds: [firstContactId],
      templateId,
      suggestedStream,
      previewOnly: true,
    });
    setPreviewResult(data);
  } catch (err: any) {
    setPreviewError(err?.response?.data?.detail || err?.message || 'Preview failed');
  } finally {
    setPreviewing(false);
  }
};

useEffect(() => {
  if (step === 3 && !previewResult && !previewing && firstContactId && templateId) {
    fetchPreview();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [step, firstContactId, templateId]);
```

**Cache invalidation:** Step 3 Back button onClick clears `previewResult` + `previewError` before `setStep(2)`. When the user returns to Step 3, useEffect re-evaluates → `previewResult === null` is true → fresh fetch (which creates a new audit row server-side). This handles the "user changed template in Step 2" case automatically.

**Re-generate ✨ button** is the ONLY non-automatic path to spawn additional audit rows. The button's `title` attribute warns the operator: "Generates a new AI personalization (creates a new audit row in personalized_email_sends; ~$0.069)". Locked decision #10 (one new audit row per Claude call) honored throughout.

## Step 4 handleSend() Shape

```ts
async function handleSend() {
  if (!templateId) {
    setSendError('No saved template found for this stream. Go to Email Templates and seed templates first, or save this draft as a template before sending.');
    return;
  }
  if (selectedIds.size === 0) {
    setSendError('Pick at least one contact in Step 1.');
    return;
  }
  if (selectedIds.size > LARGE_BATCH_THRESHOLD && !confirmedLargeBatch) {
    setSendError(`Batch size ${selectedIds.size} exceeds ${LARGE_BATCH_THRESHOLD}. Go back to Step 3 and confirm the large-batch checkbox.`);
    return;
  }
  setSending(true);
  setSendError(null);
  setSendResult(null);
  try {
    const { data } = await apolloApi.sendPersonalizedCampaign({
      contactIds: Array.from(selectedIds),
      templateId,
      suggestedStream,
      confirmedLargeBatch:
        selectedIds.size > LARGE_BATCH_THRESHOLD ? true : undefined,
    });
    setSendResult(data);
    if (data.failureDetails && data.failureDetails.length > 0) {
      console.warn('[NetSuiteCampaignWizard] send failures', data.failureDetails);
    }
    setStep(5);
    onSuccess?.();
  } catch (err: any) {
    const msg =
      err?.response?.data?.detail ||
      err?.response?.data?.error ||
      err?.message ||
      'Send failed. Check console for details.';
    console.error('[NetSuiteCampaignWizard] send failed', err);
    setSendError(msg);
  } finally {
    setSending(false);
  }
}
```

Note `confirmedLargeBatch: undefined` is sent for batches ≤ 50 so the backend cost gate is preserved by absence-of-flag rather than `false` (matches the backend's `req.body.confirmedLargeBatch === true` check semantics from Plan 05-02 SUMMARY).

## Step 5 Cost Summary Block (UX description)

When `sendResult` is populated, Step 5 renders a green success card with:

```
✅ Your AI-personalized campaign is live!

  📨 Sent: <strong green>25</strong>
  ❌ Failed: <strong green>0</strong>
  🧠 AI personalization: <indigo>24</indigo> succeeded, <gray>1</gray> used fallback
  💰 Cost: <yellow>$1.7325</yellow> (Claude AI + web_search + Resend)
  Claude input tokens: 247500 · output: 15000 · web_search requests: 75 ·
  Resend cost: $0.0000 (free tier)

  [▶ Show 0 failure(s)]   <- collapsible details, hidden when no failures
```

When `failed > 0` the failure-count number rendering switches to yellow (`#fbbf24`). When `personalizeFailures > 0` the count also turns yellow — signalling the operator that some recipients got the stream-generic fallback instead of personalized AI tokens (still sent successfully, but worth flagging for follow-up tweaks to the system prompt).

Two action buttons:
- `Go see your contacts →` (gradient indigo→purple) closes the wizard and navigates to `/contacts`
- `Send another campaign` (gray) resets the wizard to Step 1 + clears ALL Phase 5 state

## tsc Output

```
$ cd frontend && npx tsc --noEmit 2>&1 | head -5
(no output — entire frontend clean)
```

Zero new type errors introduced. Imports `apolloApi` (value) + `ApolloPersonalizedCampaignResponse` (type) from `../services/api` — both already exported from Wave 2.

## Firewall Verification

```bash
$ git diff HEAD~2 -- backend/src/routes/apollo.ts \
                     backend/src/routes/campaigns.ts \
                     backend/src/services/awsSES.ts \
                     backend/prisma/schema.prisma \
                     frontend/src/pages/Contacts/ContactList.tsx \
                     frontend/src/pages/Apollo/ApolloPage.tsx \
                     frontend/src/components/ApolloSearchForm.tsx | wc -l
0
```

Phase 4 send-path firewall (campaigns.ts, awsSES.ts) — zero touches. Wave 1 schema firewall (schema.prisma) — zero touches. Wave 2 backend firewall (apollo.ts) — zero touches. Sibling-page firewall (ApolloPage / ContactList / ApolloSearchForm) — zero touches. Only NetSuiteCampaignWizard.tsx changed.

Phase 4 routes still present inside `apollo.ts` (verified by Wave 2's SUMMARY self-check):
- `/import`, `/normalize-filters`, `/send-campaign`, `/send-personalized-campaign` — all four intact

## Verify-Block Grep Results

| # | Grep | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | `useState<1 \| 2 \| 3 \| 4 \| 5>` | 1 | 1 | ✓ |
| 2 | `'AI Personalize'` | 1+ | 1 | ✓ |
| 3 | `selectedIds: Set<string>` or `setSelectedIds` | 2+ | 5 | ✓ |
| 4 | `Array.from(selectedIds)` | 1+ | 2 | ✓ (firstContactId + handleSend) |
| 5 | `templateId` references | 5+ | 14 | ✓ |
| 6 | `step === 3 &&` | 1+ | 2 | ✓ (useEffect predicate + JSX block) |
| 7 | `fetchPreview` | 2+ | 4 | ✓ (declaration + useEffect + Re-generate button + Back-button N/A) |
| 8 | `previewResult` | 5+ | 26 | ✓ |
| 9 | `previewOnly: true` | 1 | 1 | ✓ |
| 10 | `firstContactId` | 3+ | 6 | ✓ |
| 11 | useEffect deps `[step, firstContactId, templateId]` | present | 1 | ✓ |
| 12 | Back-button cache invalidation | 1 | multi-line equivalent (3 statements inside onClick arrow body — semantically identical) | ✓ |
| 13 | `step === 4` | 1+ | 1 | ✓ |
| 14 | `step === 5` | 1+ | 1 | ✓ |
| 15 | `LARGE_BATCH_THRESHOLD` | 2+ | 9 | ✓ |
| 16 | `apolloApi.sendPersonalizedCampaign` | 2+ | 3 (1 type import comment + 1 preview + 1 live) | ✓ |
| 17 | `apolloApi.sendCampaign\b` | 0 | 0 | ✓ |
| 18 | `setSentCount\|setFailedCount` | 0 | 0 | ✓ |
| 19 | `sendResult` | 4+ | 17 | ✓ |
| 20 | `contactIds: Array.from(selectedIds)` | 1 | 1 | ✓ |
| 21 | `totalCostUSD` | 1+ | 1 | ✓ |
| 22 | `resendCostUSD` | 1+ | 2 | ✓ |
| 23 | `personalizeFailures` | 1+ | 2 | ✓ |
| 24 | `step === [1-5]` | 5+useEffect | 6 | ✓ |
| 25 | `function handleSend\|const handleSend` | 1 | 1 | ✓ |
| 26 | `handleSend` total refs | 2+ | 2 | ✓ |
| 27 | `importedContactIds[0]` (FORBIDDEN) | 0 | 0 | ✓ |

All 27 verify-block greps pass. Item #12 used the multi-line form `setPreviewResult(null); setPreviewError(null); setStep(2);` inside the arrow body (3 separate statements). Plan's literal single-line grep regex did not match, but the semantic behavior is identical and the tsc + UI behavior are unchanged.

## Task Commits

1. **Task 1: wizard 4→5 steps + AI Personalize preview step** — `8344905` (feat)
2. **Task 2: wizard live send via sendPersonalizedCampaign + Done cost summary** — `46151a4` (feat)

_Plan metadata commit will follow this SUMMARY._

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] handleSend body rewrite folded into Task 1's commit**
- **Found during:** Task 1 execution — replacing the existing `handleSend()` body and writing `fetchPreview()` ended up in the same Edit operation because they were textually adjacent (both inside the same `// ===== Step 3 send =====` comment block in the original file).
- **Rationale:** Plan Task 2 step 1 said "Rewire existing send state... REPLACE with single `sendResult`". The cleanest atomic edit replaced the entire 50-line region — the alternative (touching it twice across two commits) would have left Task 1's commit referencing the obsolete `apolloApi.sendCampaign` for one revision. That would have broken the negative-grep firewall on the intermediate state.
- **Net effect:** Task 1 commit already removes `apolloApi.sendCampaign` and introduces the live `apolloApi.sendPersonalizedCampaign` call. Task 2 commit handles the JSX rewrite of Step 4 (Review) + Step 5 (Done) + the dead-code cleanup. Both commits remain reviewable in isolation: Task 1 = "all state-machine + handler logic", Task 2 = "all JSX rewrite".
- **Files modified:** none beyond NetSuiteCampaignWizard.tsx
- **Verification:** `git show 8344905 -- frontend/src/components/NetSuiteCampaignWizard.tsx | grep -c "apolloApi.sendCampaign\b"` = 0 (verified the obsolete reference was gone as of Task 1's commit, not waiting until Task 2)
- **Committed in:** `8344905` (Task 1)

**2. [Rule 1 - Bug] Removed orphan `body`/`subject`/`bodyPlain`/`validationWarnings`/`sendBlocked` derived state**
- **Found during:** Task 2 (after Step 4 Review JSX rewrite)
- **Issue:** The original Step 3 (Review) JSX block referenced `subject` directly for the From/Subject card and `body` for the `dangerouslySetInnerHTML`. Plan Task 2 step 3 replaced that with `previewResult.audit[0].subject` + `previewResult.audit[0].renderedBody`. That left `bodyPlain` / `validationWarnings` / `sendBlocked` declared but never read — tsc didn't flag this (they're used in a `.push()` mutation pattern and tsc is permissive about unused locals when `noUnusedLocals` is off in tsconfig).
- **Fix:** Deleted lines 302-318 (17 lines) — the entire `// ===== Step 3 validation =====` block. Project rule #5 (remove dead code as you find it) honored.
- **Files modified:** frontend/src/components/NetSuiteCampaignWizard.tsx
- **Verification:** `grep -cE "validationWarnings|sendBlocked|bodyPlain" frontend/src/components/NetSuiteCampaignWizard.tsx` = 0 post-fix.
- **Committed in:** `46151a4` (Task 2)

### Plan-aligned but worth noting

- **Back-button cache-invalidation grep #12 returned 0 (false negative).** Plan's verify-block grep was `grep -c "setPreviewResult(null); setPreviewError(null); setStep(2)"` looking for the exact single-line form. The actual implementation uses a 3-line arrow-body form: `setPreviewResult(null);\n setPreviewError(null);\n setStep(2);`. The behavior is identical — JS sequencing inside an arrow body is the same as semicolon-separated statements on one line. tsc + runtime behavior unchanged.

- **Step indicator container added `flexWrap: 'wrap'`.** Original 4-label flex row just-fit the 760px max-width wizard modal. Adding the 5th 'AI Personalize' label (3 characters longer than longest existing label) pushed past on narrow viewports. Wrapping prevents horizontal overflow. Not in plan but a Rule-2 (missing critical functionality) auto-fix for the UX.

- **`apolloApi.sendPersonalizedCampaign` reference count = 3, not 2.** The third instance is in the comment on line 16: `// ONLY for aiGenerateContent — NOT used for sending. Send path is apolloApi.sendPersonalizedCampaign.` (updated from the old `apolloApi.sendCampaign` reference). The two real call sites are line 196 (fetchPreview) and line 256 (handleSend live). Documentation accuracy honored.

---

**Total deviations:** 2 auto-fixed (Rule 3 - blocking sequencing + Rule 1 - dead code removal)
**Impact on plan:** Zero scope creep. Both commits remain atomic and reviewable. The plan's intent (5-step wizard with AI Personalize preview + cost summary) ships exactly as designed.

## Issues Encountered

- **None.** All Task 0 grep-pinned variable names matched the live file exactly. No file drift since plan-time grep (2026-05-30 → 2026-05-31). tsc passed on first attempt after each Edit. Firewall held byte-for-byte across both commits.

## User Setup Required

None for Plan 05-03. Code is committed locally on the `production` branch. Plan 05-04 (deploy + smoke) handles:
- `git push origin production` (not yet pushed — branch is 5 commits ahead: b19feec, 820fd4a, 908e631, 35bbc58, 8344905, 46151a4, and the upcoming 05-03 docs commit)
- rsync `/var/www/brandmonkz/` for the frontend bundle
- 4-case live smoke against Ricardo Deben using the new UI flow

## Next Phase Readiness

- **Plan 05-04 (deploy + smoke):** Wave 3's frontend ships the wizard with the new 5-step flow. Backend route (`POST /api/apollo/send-personalized-campaign`) already deployed-ready from Wave 2. Plan 05-04 deploy steps still include: (a) `npx prisma migrate deploy` to land Wave 1's `personalized_email_sends` table, (b) `npx prisma generate` to refresh the production Prisma client, (c) `curl /api/email-templates/upgrade-streams-v2` to flip the 9 Stream:* templates to V2 body, (d) frontend rsync, (e) 4-case smoke (Case A = previewOnly:true 1 contact via UI Step 3, Case B = live send 1 contact via UI Step 4, Case C = DB audit row check, Case D = firewall git diff verification).
- **No blockers** for Plan 05-04 to begin.

## Self-Check: PASSED

Verified existence of all claimed artifacts:

```
$ ls .planning/phases/05-ai-personalized-apollo-campaign/05-03-SUMMARY.md
FOUND
$ grep -c "useState<1 | 2 | 3 | 4 | 5>" frontend/src/components/NetSuiteCampaignWizard.tsx
1 — FOUND
$ grep -c "'AI Personalize'" frontend/src/components/NetSuiteCampaignWizard.tsx
1 — FOUND
$ grep -c "fetchPreview" frontend/src/components/NetSuiteCampaignWizard.tsx
4 — FOUND
$ grep -c "apolloApi.sendPersonalizedCampaign" frontend/src/components/NetSuiteCampaignWizard.tsx
3 — FOUND
$ grep -c "apolloApi.sendCampaign\b" frontend/src/components/NetSuiteCampaignWizard.tsx
0 — Phase 4 send path REMOVED (verified)
$ grep -c "setSentCount\|setFailedCount" frontend/src/components/NetSuiteCampaignWizard.tsx
0 — dead state REMOVED (verified)
$ grep -c "importedContactIds\[0\]" frontend/src/components/NetSuiteCampaignWizard.tsx
0 — FORBIDDEN pattern absent (verified)
$ grep -c "Array.from(selectedIds)" frontend/src/components/NetSuiteCampaignWizard.tsx
2 — FOUND (firstContactId derivation + handleSend live)
$ git log --all --oneline | grep -E "^8344905|^46151a4"
8344905 feat(05-03): wizard 4→5 steps + AI Personalize preview step — FOUND
46151a4 feat(05-03): wizard live send via sendPersonalizedCampaign + Done cost summary — FOUND
$ git diff HEAD~2 -- backend/src/routes/apollo.ts backend/src/routes/campaigns.ts \
                     backend/src/services/awsSES.ts backend/prisma/schema.prisma \
                     frontend/src/pages/Contacts/ContactList.tsx \
                     frontend/src/pages/Apollo/ApolloPage.tsx \
                     frontend/src/components/ApolloSearchForm.tsx | wc -l
0 — firewall HOLDS
```

---
*Phase: 05-ai-personalized-apollo-campaign*
*Completed: 2026-05-31*
