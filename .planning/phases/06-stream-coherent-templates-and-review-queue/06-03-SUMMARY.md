---
phase: 06-stream-coherent-templates-and-review-queue
plan: 03
subsystem: api
tags: [express, prisma, resend, claude, anthropic, additive-signature, human-in-the-loop, review-queue]

# Dependency graph
requires:
  - phase: 05-ai-personalized-apollo-campaign
    provides: "POST /api/apollo/send-personalized-campaign route (Phase 5), personalizeContactWithClaude helper with EXACTLY 5 fallback warning strings, STREAM_TEMPLATE_V2_BODY substitution loop, audit row write to personalized_email_sends with status enum"
  - phase: 06-stream-coherent-templates-and-review-queue
    provides: "Plan 06-02 — personalized_email_sends.status TEXT column admits 'pending_review' (additive migration 20260601120000)"
provides:
  - "Additive body field requireReview?: boolean on POST /api/apollo/send-personalized-campaign"
  - "Conditional skip of Resend dispatch when requireReview:true (status='pending_review', sent=0, failed=0)"
  - "Response envelope extension: top-level queuedForReview (number) + queueIds (string[]) keys"
  - "Mutual-exclusion semantic: requireReview wins over previewOnly when both true"
  - "Phase 5 5-fallback Claude contract byte-for-byte preserved"
  - "Phase 4 SES firewall byte-for-byte preserved"
  - "NetSuiteCampaignWizard.tsx 0-touch — old caller shape ignores new fields"
affects: [06-04 (consumes queueIds via GET /api/apollo/pending-review + 4 mutating routes), 06-05 (Apollo Campaign button passes requireReview:true + confirmedLargeBatch), 06-06 (deploy gate)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive optional body field — undefined/false preserves legacy behavior byte-for-byte"
    - "Conditional dispatch skip via continue (mirrors previewOnly skip pattern at line 1021-1036)"
    - "Ternary status priority — requireReview wins over previewOnly (documented in route header comment)"
    - "Pacing INSIDE the skip branch — 250ms sleep preserves Claude API rate-limit safety for large requireReview batches"

key-files:
  created: []
  modified:
    - "backend/src/routes/apollo.ts — extended POST /send-personalized-campaign with requireReview field (+43 / -1 lines)"

key-decisions:
  - "requireReview is the HIGHEST-priority status determinant. Ternary order: requireReview > previewOnly > default. Documented in route header AND realized in the status field of audit row create."
  - "Pacing (PERSONALIZE_PACING_MS=250) is preserved inside the requireReview skip branch — a 50-contact requireReview batch hits Claude at 4 req/sec, same as a send batch. Prevents API hammering."
  - "queueIds is a string[] of auditRow.id values, collected in-loop and returned at top level. Plan 06-04's GET /api/apollo/pending-review can either consume this list directly OR list-by-status='pending_review' — both work."
  - "Top-level keys are placed BEFORE cost: {} for envelope ordering hygiene — old callers ignore the extras, new callers read them at predictable positions."
  - "Hard gate (PERSONALIZE_BATCH_HARD_CAP=50 + confirmedLargeBatch:true) STILL APPLIES when requireReview:true. The Apollo Campaign button in Plan 06-05 explicitly sets confirmedLargeBatch:true when count > 50 — no carve-out for the review path."
  - "Per-contact audit.push() block in the requireReview branch is INTENTIONALLY symmetric with the previewOnly branch above (same field shape, only status='pending_review' differs). Keeps the audit envelope's shape stable across all three terminal states."

patterns-established:
  - "Additive body field extension: destructure + type annotation + conditional behavior + envelope extension — all changes nest inside existing route handler, no new exports"
  - "Status determination as 3-way ternary: requireReview ? 'pending_review' : (previewOnly ? 'preview' : 'pending') — establishes precedence semantics that Plan 06-04 mutating routes must respect"
  - "Pacing-inside-skip-branch: any future conditional skip of expensive dispatch (e.g. mock-mode, dry-run) MUST keep the pacing sleep so Claude API stays under 4 req/sec on bulk batches"

requirements-completed: [REQ-062]

# Metrics
duration: 2min 24s
completed: 2026-06-02
---

# Phase 06 Plan 03: requireReview Additive Body Field Summary

**Added optional `requireReview: boolean` body field to POST /api/apollo/send-personalized-campaign. When true, the route personalizes each contact via Claude as usual, writes the audit row with status='pending_review', SKIPS the Resend dispatch entirely, and returns queuedForReview + queueIds at the top level. When false/omitted, behavior is byte-for-byte identical to Phase 5 — NetSuiteCampaignWizard Step 4 live send keeps dispatching via Resend immediately.**

## Performance

- **Duration:** 2 min 24s
- **Started:** 2026-06-02T03:41:44Z
- **Completed:** 2026-06-02T03:44:08Z
- **Tasks:** 1
- **Files modified:** 1 (backend/src/routes/apollo.ts)

## Accomplishments

- Extended POST /api/apollo/send-personalized-campaign with a single additive optional body field (`requireReview?: boolean`) — no breaking change to existing callers
- Audit-row write flips to `status='pending_review'` when requireReview:true (mutual-exclusion: requireReview wins over previewOnly)
- New skip branch (4b) immediately after the existing previewOnly skip branch (4) skips the Resend dispatch loop entirely via `continue`, while preserving the 250ms Claude-API pacing
- Response envelope extended with two new top-level keys (`queuedForReview: number`, `queueIds: string[]`) — additive, old callers ignore them
- Route header comment block updated to document the new field, its default semantics, and the mutual-exclusion rule with previewOnly
- 5-fallback Claude contract preserved byte-for-byte — `personalizeContactWithClaude` helper not touched (verified: 5/5 distinct warning strings still present and the helper's body lines 222-322 are byte-identical)
- Phase 4 SES firewall holds: `git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l = 0`
- NetSuiteCampaignWizard.tsx 0-touch — `git diff frontend/src/components/NetSuiteCampaignWizard.tsx | wc -l = 0` (no caller change needed; legacy shape ignores new fields)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add requireReview body field handling to /send-personalized-campaign** — `3e38d37` (feat)

**Plan metadata:** (will land in the final commit alongside SUMMARY.md + STATE.md + ROADMAP.md updates)

## Files Created/Modified

- `backend/src/routes/apollo.ts` — extended POST /send-personalized-campaign (+43 / -1 lines):
  - Lines ~881-896: destructured `requireReview` + added type annotation
  - Lines ~937-952: added `queueIds: string[]` + `queuedForReview: number` accumulators
  - Line ~1015: status field rewritten as `requireReview ? 'pending_review' : (previewOnly ? 'preview' : 'pending')`
  - Lines ~1037-1059: NEW skip-Resend branch (4b) with `continue` + 250ms pacing
  - Lines ~1097-1099: extended response envelope with `queuedForReview` + `queueIds` keys
  - Lines ~873-885: extended route header comment documenting the new field + mutual-exclusion rule

## Response Envelope Before/After

**Before (Phase 5 — when caller omits requireReview):**
```json
{
  "sent": 1,
  "failed": 0,
  "personalized": 1,
  "personalizeFailures": 0,
  "failureDetails": [],
  "audit": [...],
  "cost": { "claudeInputTokens": ..., "claudeOutputTokens": ..., "webSearchRequests": ..., "claudeCostUSD": 0.123, "resendSendsCounted": 1, "resendCostUSD": 0.0, "totalCostUSD": 0.123 }
}
```

**After (Plan 06-03 — when caller passes requireReview:true):**
```json
{
  "sent": 0,
  "failed": 0,
  "personalized": 1,
  "personalizeFailures": 0,
  "failureDetails": [],
  "audit": [{ "contactId": "...", "email": "...", "auditId": "cmpt...", "subject": "...", "renderedBody": "<html>...", "aiTokens": {...}, "aiWarning": null, "claudeInputTokens": ..., "claudeOutputTokens": ..., "webSearchUses": ..., "status": "pending_review" }],
  "queuedForReview": 1,
  "queueIds": ["cmpt..."],
  "cost": { "claudeInputTokens": ..., "claudeOutputTokens": ..., "webSearchRequests": ..., "claudeCostUSD": 0.123, "resendSendsCounted": 0, "resendCostUSD": 0.0, "totalCostUSD": 0.123 }
}
```

**After (Plan 06-03 — when caller omits requireReview OR passes requireReview:false):**
Byte-for-byte identical to "Before (Phase 5)" above. Top-level `queuedForReview` = 0 and `queueIds` = [] are still emitted (additive) but old callers (NetSuiteCampaignWizard Step 4) don't read them.

## requireReview Semantics (Locked)

| State           | Audit `status` written | Resend dispatch | Top-level `sent` | Top-level `failed` | `queuedForReview` | `queueIds` |
|-----------------|------------------------|-----------------|------------------|--------------------|-------------------|------------|
| neither flag    | `'pending'` then `'sent'` or `'failed'` | YES | 1 (or 0 on send error) | 0 (or 1 on send error) | 0   | `[]`       |
| previewOnly:true | `'preview'`            | NO              | 0                | 0                  | 0                 | `[]`       |
| requireReview:true | `'pending_review'`   | NO              | 0                | 0                  | N                 | `[N ids]`  |
| BOTH true       | `'pending_review'` (requireReview wins) | NO | 0       | 0                  | N                 | `[N ids]`  |

`personalized` and `personalizeFailures` and `cost.claudeCostUSD` count Claude outcomes identically across all 4 states — Claude is always called.

## Pacing-Inside-Skip-Branch Decision

The new requireReview branch (4b) DOES the same `await new Promise<void>((r) => setTimeout(r, PERSONALIZE_PACING_MS));` (250ms) that the post-Resend dispatch block does at line ~1080, even though no Resend call happened. Reasoning:

- Without the sleep, a 50-contact requireReview batch would call Claude back-to-back at peak rate
- Claude has its own rate limits + the 5-fallback contract assumes a non-hostile call cadence
- Plan 06-05's Apollo Campaign button can dispatch batches of up to 50 contacts at once with requireReview:true — pacing is required there

The `continue` keyword skips the EXISTING Resend dispatch block AND the EXISTING pacing line at the bottom of the loop (line 1080). To preserve the 4 req/sec ceiling on Claude, we inline our own 250ms sleep before `continue`.

## 5-Fallback Claude Contract Preservation

Verified all 5 distinct warning strings still emit from `personalizeContactWithClaude`:

```
grep -c "Claude not configured"            → present (apollo.ts:228)
grep -c "Claude timed out"                 → present (apollo.ts:263)
grep -c "Claude returned empty response"   → present (apollo.ts:279)
grep -c "Claude returned malformed JSON"   → present (apollo.ts:298)
grep -c "Claude unavailable"               → present (apollo.ts:313)
```

`personalizeContactWithClaude` (lines 222-322) is byte-identical to its pre-Plan-06-03 state. The diff shows zero `^-`/`^+` lines inside its body.

(Note: total grep counts for these warnings reflect their presence in route header comments AND in the helper AND in the unrelated `normalizeFiltersWithClaude` helper at lines 354-516. What matters for the 5-fallback contract is that the helper's body lines are unchanged — verified by inspection.)

## Phase 4 Firewall Verification

```bash
git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l
# → 0
```

SES BrandMonkz send path remains byte-for-byte unchanged. Same verification ran clean throughout Phase 5 + quick-8 + Plan 06-02 + Plan 06-03.

## NetSuiteCampaignWizard 0-Touch Verification

```bash
git diff frontend/src/components/NetSuiteCampaignWizard.tsx | wc -l
# → 0  (working tree clean)

git diff HEAD~1 frontend/src/components/NetSuiteCampaignWizard.tsx | wc -l
# → 0  (this plan's commit did not touch the wizard)
```

The wizard's existing call site — `apolloApi.sendPersonalizedCampaign({ contactIds, templateId, suggestedStream, confirmedLargeBatch })` — never passes `requireReview`, so undefined → falsy → existing dispatch path runs unchanged.

## Decisions Made

1. **requireReview is HIGHEST priority for status** — overrides previewOnly. Documented in route header comment + realized in 3-way ternary. Closes the "what if both flags passed" ambiguity.
2. **Pacing-inside-skip-branch** (see dedicated section above) — preserves Claude API safety on 50-contact requireReview batches.
3. **Top-level placement of queuedForReview + queueIds** — placed BEFORE `cost: {}` block in the response object literal. Old callers iterating keys see them but don't break; new callers find them at a predictable shallow position.
4. **Symmetric audit envelope shape between previewOnly + requireReview branches** — both push a per-contact object with identical fields, only `status` differs ('preview' vs 'pending_review'). Plan 06-04 routes can consume the same envelope shape regardless of which queue state the row is in.
5. **No new helper function** — all changes inline in the route handler. The branch is ~20 lines and a top-level helper would add cognitive overhead without reuse value (no other route needs this exact skip+pace pattern).
6. **Hard gate NOT carved out** — the existing `PERSONALIZE_BATCH_HARD_CAP=50 + confirmedLargeBatch:true` gate still applies when `requireReview:true`. Plan 06-05's Apollo Campaign button explicitly sets `confirmedLargeBatch:true` when N>50.

## Deviations from Plan

None - plan executed exactly as written.

The plan's STEP A-F instructions were applied verbatim. Verification block ran clean on the first pass. No deviation rules (1-4) were triggered.

## Issues Encountered

None.

`backend tsc --noEmit` returned only the 8 pre-existing errors in unrelated files (apiSubscriptions.controller.ts, analytics.routes.ts, etc. — all documented in the Phase 5 SUMMARY baseline). Zero new errors in `apollo.ts`.

## Verification Performed

```bash
# Field present in destructuring + 9 other usage sites (10 total occurrences, plan expected ≥ 5)
grep -c "requireReview" backend/src/routes/apollo.ts                            # → 10
grep -c "'pending_review'" backend/src/routes/apollo.ts                         # → 6 (plan expected ≥ 2)
grep -c "queuedForReview" backend/src/routes/apollo.ts                          # → 4 (plan expected ≥ 3)
grep -c "queueIds" backend/src/routes/apollo.ts                                 # → 4 (plan expected ≥ 3)
grep -c "if (requireReview)" backend/src/routes/apollo.ts                       # → 1 (plan expected ≥ 1)
grep -c "requireReview ? 'pending_review'" backend/src/routes/apollo.ts         # → 1 (plan expected = 1)

# Existing routes byte-clean
git diff backend/src/routes/apollo.ts | grep -c "^-.*router.post('/send-campaign'"      # → 0
git diff backend/src/routes/apollo.ts | grep -c "^-.*router.post('/import'"             # → 0
git diff backend/src/routes/apollo.ts | grep -c "^-.*router.post('/normalize-filters'"  # → 0

# Phase 4 firewall (target = 0)
git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l   # → 0

# NetSuiteCampaignWizard 0-touch (target = 0 for HEAD diff)
git diff frontend/src/components/NetSuiteCampaignWizard.tsx | wc -l             # → 0

# Single commit, single file
git diff HEAD~1 --stat                                                          # → backend/src/routes/apollo.ts | 44 +++-
git diff HEAD~1 --stat | grep -cE "apollo\.ts"                                  # → 1
git diff HEAD~1 --stat | grep -cE "\b(campaigns\.ts|awsSES\.ts|NetSuiteCampaignWizard|CampaignsPage|api\.ts|schema\.prisma|stream-templates\.ts|emailTemplates\.ts)\b"  # → 0

# Commit identity
git log -1 --format="%an <%ae>"                                                 # → jeet-avatar <jm@techcloudpro.com>
git log -1 --format="%s"                                                        # → feat(06-03): add optional requireReview body field to /send-personalized-campaign

# Backend tsc clean on apollo.ts (pre-existing errors in other files tolerated)
cd backend && npx tsc --noEmit -p . 2>&1 | grep -E "src/routes/apollo\.ts" | head  # → (empty — no apollo.ts errors)
```

## User Setup Required

None - no external service configuration required. Migration `20260601120000_phase06_pending_review_status` (Plan 06-02) added `pending_review` + `rejected` as admissible status values at the application layer (status column is TEXT, no Postgres ENUM DDL needed). Plan 06-03 simply writes those values.

`prisma migrate deploy` against prod DB is deferred to Plan 06-06 deploy gate per locked DEPLOY-TO-LIVE protocol.

## Next Phase Readiness

**Wave 2 of Phase 6 is now ready for parallel completion:**

- Plan 06-01b (copy-approved checkpoint + dict synthesis) — unblocked, waiting on user `copy-approved` for 06-STREAM-COPY.md
- Plan 06-03 — COMPLETE (this plan)

**Wave 3 unblocked upon Plan 06-01b completion:**

- Plan 06-04 (4 new pending-review routes: GET /pending-review, POST /:id/approve, POST /:id/reject, POST /:id/edit) — can consume the `queueIds` returned by this plan's change as a primary key list, OR can list-by-status='pending_review'

**Plan 06-04 contract entrypoint:** the response envelope's `queueIds: string[]` field is now the authoritative list of audit rows in state 'pending_review' for a given send invocation. Plan 06-04's UI (PendingReviewQueue in Plan 06-05) will most likely list-by-status rather than threading queueIds through state, but the contract holds either way.

**No new blockers introduced.**

---
*Phase: 06-stream-coherent-templates-and-review-queue*
*Plan: 03*
*Completed: 2026-06-02*

## Self-Check: PASSED

Verified post-write:

```
FOUND: backend/src/routes/apollo.ts (modified +43/-1)
FOUND: commit 3e38d37 on production
FOUND: author jeet-avatar <jm@techcloudpro.com>
FOUND: pushed fast-forward 7306b95..3e38d37 → origin/production
FOUND: Phase 4 firewall byte-clean (git diff phase-04-baseline..HEAD -- campaigns.ts awsSES.ts | wc -l = 0)
FOUND: NetSuiteCampaignWizard.tsx 0-touch (git diff HEAD~1 .. wc -l = 0)
FOUND: 5/5 distinct Claude warning strings still present in personalizeContactWithClaude
FOUND: backend tsc --noEmit reports 0 NEW errors on apollo.ts (pre-existing unrelated errors tolerated per Phase 5 baseline)
```
