---
phase: 06-stream-coherent-templates-and-review-queue
plan: 01b
subsystem: backend/email-templates
tags: [stream-coherent, html-comment-sentinels, per-stream-bodies, idempotent-upgrade, REQ-060]

# Dependency graph
requires:
  - phase: 06-stream-coherent-templates-and-review-queue
    provides: "06-01a wrote 06-STREAM-COPY.md with 9-section user-readable copy drafts; user approval received 2026-06-01"
  - phase: quick-8
    provides: "STREAM_TEMPLATE_V3_BODY single-body (now replaced) + /upgrade-streams-v3 endpoint URL preserved"
  - phase: 05-ai-personalized-apollo-campaign
    provides: "Stream:* template seeds + 6-placeholder set ({{firstName}}, {{companyName}}, {{intentHook}}, {{companyContext}}, {{painPoint}}, {{cta}})"
provides:
  - "STREAM_TEMPLATE_V3_BODIES: Record<string, string> with 9 entries keyed by NO-SPACE 'Stream:<bare>' format"
  - "buildStreamV3Body(opts) internal helper that interpolates per-stream copy spans into the shared v6 visual chrome"
  - "stream-aware upgradeStreamTemplatesToV3 with per-row HTML-comment sentinel idempotency"
  - "9 unique <!-- STREAM_V3:<bareStream> --> sentinels baked as first line after <body> per body"
affects: [06-04, 06-05, 06-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-stream dict keyed by EXACT prod DB email_templates.category writes (NO space after colon, matches `Stream:${seed.stream}` template at stream-templates.ts:102)"
    - "HTML-comment sentinels as authoritative per-stream idempotency anchor (survives copy revisions, unique by construction)"
    - "Internal builder function that takes 13-field copy opts and returns rendered HTML — single source of truth for shared chrome across all 9 streams"
    - "Conditional secondary callout (only NetSuite keeps 'A note on NetSuite Next 2026'; other 8 omit the entire AI-banner block)"

key-files:
  created: []
  modified:
    - "backend/src/seeds/stream-templates.ts (single-body STREAM_TEMPLATE_V3_BODY replaced with 9-entry STREAM_TEMPLATE_V3_BODIES dict + buildStreamV3Body helper + stream-aware upgradeStreamTemplatesToV3)"
    - "backend/src/routes/emailTemplates.ts (/upgrade-streams-v3 endpoint doc comment updated; URL preserved)"

key-decisions:
  - "User approval message captured verbatim per CONTEXT.md citation rule: 'lets call it approved - and send email to jm@techcloudpro.com'"
  - "Dict keys use NO-SPACE 'Stream:<bare>' format (not 'Stream: <bare>') — matches prod DB email_templates.category values per seed code template-literal at line 102"
  - "Sentinel detection beats visible-copy detection for idempotency — survives future copy revisions within a stream, unique by construction"
  - "buildStreamV3Body is INTERNAL (not exported) — single source of truth for shared chrome, future copy edits per stream go through the dict opts not the function"
  - "Only Stream:NetSuite carries 'A note on NetSuite Next 2026' secondary callout — other 8 set noteCalloutTitle:'OMIT' which drops the entire <!-- AI banner --> block (per CONTEXT.md What-gets-dropped rule)"
  - "Service props 03 + 04 are SHARED byte-for-byte across all 9 ('Dedicated AI Consulting' + 'Transparent staffing. $1 per contract.') — only props 01 + 02 carry per-stream copy"
  - "Quick-8-era single-body STREAM_TEMPLATE_V3_BODY const DELETED entirely (not kept as deprecated alias) — quick-8 v3 was only sent to JM + Rajesh (apology already sent), no paying-customer rows used it"
  - "v2 exports preserved byte-for-byte: STREAM_TEMPLATE_V2_BODY, upgradeStreamTemplatesToV2, getStreamFallbacks, STREAM_TEMPLATE_SEEDS, seedStreamTemplates"
  - "/upgrade-streams-v3 endpoint URL UNCHANGED — only the inline doc comment updated to reference Phase 06 plan 06-01b + per-stream dict lookup + HTML-comment sentinel"
  - "Phase 4 firewall PRESERVED byte-for-byte: git diff phase-04-baseline..HEAD -- campaigns.ts awsSES.ts = 0 lines"
  - "Phase 5 send-path firewall PRESERVED: apollo.ts 0-touch in HEAD~1..HEAD"
  - "NetSuiteCampaignWizard.tsx 0-touch (working tree clean) — wizard's existing flow unchanged"

patterns-established:
  - "HTML-comment sentinel for idempotent in-place template upgrades: bake `<!-- STREAM_V3:<bare> -->` as first line after <body>, detect via htmlContent.includes(); unique by construction, survives copy revisions"
  - "Per-prod-stream dict with EXACT category-string keys matching seed-code writes: keys derived from `Stream:${seed.stream}` template at the seed function ensures every prod row has a matching entry"
  - "Runtime guard at module-load that fails fast if any prod seed stream has no dict entry — load-bearing safety check against the silent-fallback-to-Other bug"
  - "Cross-contamination check: assert each entry contains its OWN sentinel AND NO other stream's sentinel — catches copy-paste errors during dict synthesis"
  - "Single-builder function with copy-opts dict: shared chrome stays in one place, per-stream copy spans become typed opts fields, conditional blocks (OMIT marker) are localized"

requirements-completed: [REQ-060]

# Metrics
duration: 4min
completed: 2026-06-01
---

# Phase 6 Plan 01b: Per-stream STREAM_TEMPLATE_V3_BODIES dict synthesis Summary

**9-entry per-stream v3 body dict with HTML-comment sentinels replaces quick-8 single-body — stream-aware upgrade helper, byte-for-byte v2 preservation, Phase 4 + Phase 5 firewalls held.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-01T20:55:00Z
- **Completed:** 2026-06-01T20:59:00Z
- **Tasks:** 2 (1 checkpoint:human-action approved + 1 mechanical synthesis)
- **Files modified:** 2 (`backend/src/seeds/stream-templates.ts`, `backend/src/routes/emailTemplates.ts`)

## User Approval (verbatim)

Per CONTEXT.md rule ("any SUMMARY claim of 'shipped' is only valid if it cites the user's approval message verbatim"), the user's approval message for the 9-stream copy direction is captured here in full:

> **"lets call it approved - and send email to jm@techcloudpro.com"**

The orchestrator interpreted the first clause as the literal `copy-approved` token required by Task 1's checkpoint:human-action gate. The second clause (send email to jm@techcloudpro.com) is handled by the orchestrator separately after this plan's commits land.

## Accomplishments

- 9-entry `STREAM_TEMPLATE_V3_BODIES: Record<string, string>` dict exported from `backend/src/seeds/stream-templates.ts`
- All 9 entries carry the SHARED v6 visual chrome (navy `#0F172A` header, orange `#F97316` accents, 4-cell metrics row, 4 CTA buttons, 30-day guarantee, Sara signature, mailto:sara@techcloudpro.com footer)
- All 9 entries carry the SHARED 6-placeholder set (`{{firstName}}`, `{{companyName}}`, `{{intentHook}}`, `{{companyContext}}`, `{{painPoint}}`, `{{cta}}`) — Phase 5 substitution loop in apollo.ts continues to work byte-for-byte
- Per-stream visible copy varies across 13 fields (sentinel, preheaderTail, tagPillText, metricLabel, introSentence, noteCalloutTitle, noteCalloutBody, servicePropTitle1+Body1, servicePropTitle2+Body2, footerReprise, arthaBannerSubtitle, ariaBlurb)
- HTML-comment sentinel `<!-- STREAM_V3:<bareStream> -->` baked as FIRST line immediately after `<body>` for each entry — unique by construction, idempotency-safe
- `buildStreamV3Body(opts: StreamV3CopyOpts)` internal helper interpolates the 13 copy spans into the shared chrome via JS template-literal substitution; conditional secondary callout dropped when `noteCalloutTitle === 'OMIT'`
- `upgradeStreamTemplatesToV3(prisma, userId)` rewritten to per-row dict lookup: derives sentinel from `row.category.slice('Stream:'.length)`, checks `htmlContent.includes(sentinel)` for idempotency, falls back to `STREAM_TEMPLATE_V3_BODIES['Stream:Other']` for unknown categories
- `/api/email-templates/upgrade-streams-v3` endpoint doc comment updated to reference Phase 06 plan 06-01b + per-stream dict lookup + HTML-comment sentinel
- Single-body `STREAM_TEMPLATE_V3_BODY` const DELETED entirely
- v2 exports preserved byte-for-byte: `STREAM_TEMPLATE_V2_BODY`, `upgradeStreamTemplatesToV2`, `getStreamFallbacks`, `STREAM_TEMPLATE_SEEDS`, `seedStreamTemplates`
- Phase 4 firewall PRESERVED byte-for-byte; Phase 5 send-path firewall PRESERVED (apollo.ts untouched)

## Task Commits

1. **Task 1: 🛑 CHECKPOINT — Copy Approval Required** — user approved with the message above; no commit (checkpoint task, no source edits)
2. **Task 2: STREAM_TEMPLATE_V3_BODIES dict + stream-aware upgrade helper** — `01fe98a` (feat) — 2 files changed, 254 insertions, 70 deletions

Push fast-forward `3f8ce4c..01fe98a` to `origin/production`. Author `jeet-avatar <jm@techcloudpro.com>`.

## Files Modified

- `backend/src/seeds/stream-templates.ts` — single-body STREAM_TEMPLATE_V3_BODY const removed; 9-entry STREAM_TEMPLATE_V3_BODIES dict + buildStreamV3Body helper + stream-aware upgradeStreamTemplatesToV3 added; v2 exports + seeds preserved byte-for-byte
- `backend/src/routes/emailTemplates.ts` — doc comment above `router.post('/upgrade-streams-v3', ...)` rewritten to reference Phase 06 plan 06-01b + per-stream dict lookup + HTML-comment sentinel; endpoint URL UNCHANGED

## Runtime Guard Output

```
$ cd backend && node -e "..." (per-stream dict + cross-contamination guard)
OK 9/9
CROSS-CONTAM CHECK: PASS
```

Per-stream body lengths (rendered HTML):

| Stream | Body size (chars) | Has secondary callout? |
|---|---|---|
| Stream:NetSuite | 21,283 | YES (only stream with 'A note on NetSuite Next 2026') |
| Stream:AI/ML | 19,567 | No (OMIT) |
| Stream:Cloud/DevOps | 19,580 | No (OMIT) |
| Stream:Cybersecurity | 19,584 | No (OMIT) |
| Stream:Data/Analytics | 19,623 | No (OMIT) |
| Stream:Mobile | 19,589 | No (OMIT) |
| Stream:Enterprise/ERP | 19,675 | No (OMIT) |
| Stream:Staffing/HR | 19,635 | No (OMIT) |
| Stream:Other | 19,531 | No (OMIT) |

All 9 entries exceed the 15,000-char threshold required by the plan.

## Sentinel Uniqueness Verification

| Stream | HTML-comment sentinel | Found in own body | Found in any other body |
|---|---|---|---|
| NetSuite | `<!-- STREAM_V3:NetSuite -->` | YES | no |
| AI/ML | `<!-- STREAM_V3:AI/ML -->` | YES | no |
| Cloud/DevOps | `<!-- STREAM_V3:Cloud/DevOps -->` | YES | no |
| Cybersecurity | `<!-- STREAM_V3:Cybersecurity -->` | YES | no |
| Data/Analytics | `<!-- STREAM_V3:Data/Analytics -->` | YES | no |
| Mobile | `<!-- STREAM_V3:Mobile -->` | YES | no |
| Enterprise/ERP | `<!-- STREAM_V3:Enterprise/ERP -->` | YES | no |
| Staffing/HR | `<!-- STREAM_V3:Staffing/HR -->` | YES | no |
| Other | `<!-- STREAM_V3:Other -->` | YES | no |

CROSS-CONTAM CHECK: PASS (verified at runtime via dist/seeds/stream-templates.js).

## Firewall Verification

| Firewall | Diff line count | Status |
|---|---|---|
| Phase 4 SES (campaigns.ts + awsSES.ts vs phase-04-baseline) | 0 | PASS |
| Phase 5 send-path (apollo.ts in HEAD~1..HEAD) | 0 | PASS |
| NetSuiteCampaignWizard.tsx 0-touch (working tree + HEAD~1..HEAD) | 0 | PASS |

Files in this commit (must be exactly 2 — stream-templates.ts + emailTemplates.ts):

```
backend/src/routes/emailTemplates.ts  |  12 +-
backend/src/seeds/stream-templates.ts | 312 +++++++++++++++++++++++++++-------
2 files changed, 254 insertions(+), 70 deletions(-)
```

Files NOT in commit (must be 0): campaigns.ts, awsSES.ts, NetSuiteCampaignWizard.tsx, CampaignsPage.tsx, api.ts, schema.prisma, apollo.ts — verified via grep count 0.

## Decisions Made

See `key-decisions` in frontmatter for the complete list. Highlights:

1. **User approval message captured verbatim** ("lets call it approved - and send email to jm@techcloudpro.com") per CONTEXT.md rule — this SUMMARY's claim of "shipped" is anchored to that approval.
2. **NO-SPACE dict keys** match the EXACT prod DB writes from `seed.category = \`Stream:${seed.stream}\`` at stream-templates.ts:102; using `'Stream: <bare>'` (with space) would have silent-fallback-to-Other on every prod row.
3. **HTML-comment sentinel beats visible-copy sentinel** for idempotency — survives future copy revisions within a stream, unique by construction, can't be accidentally matched in another stream's body.
4. **Quick-8 single-body deleted, not deprecated** — quick-8 v3 was only sent to JM + Rajesh (apology already sent 2026-05-31 via Resend msgId `06536925-0b2e-4571-867e-149466bee316`); no paying-customer rows used it.
5. **Only Stream:NetSuite keeps the secondary callout** — per CONTEXT.md "What gets dropped from non-NetSuite v3 variants" rule, the 8 non-NetSuite entries drop the entire `<!-- AI banner -->` block.
6. **Service props 03 + 04 SHARED byte-for-byte** — 'Dedicated AI Consulting' + 'Transparent staffing. $1 per contract.' stay identical across all 9. Only props 01 + 02 carry per-stream copy.

## Deviations from Plan

None — Task 2 executed exactly STEP A through STEP I as written. No Rule 1/2/3 auto-fixes triggered, no Rule 4 architectural decisions required. The build had 8 pre-existing TypeScript errors in unrelated files (apiSubscriptions.controller.ts, analytics.routes.ts, subscriptions.ts, cronScheduler.ts, export.service.ts, etc.) — tolerated per Phase 5 SUMMARY baseline; zero new errors in stream-templates.ts or emailTemplates.ts.

## Issues Encountered

None. The dict synthesis was a clean mechanical translation of the 9 user-approved sections in 06-STREAM-COPY.md into TypeScript dict entries via the buildStreamV3Body helper. The runtime guard's cross-contamination check passed on the first run.

## Self-Check: PASSED

- File `/Users/jeet/production-crm/backend/src/seeds/stream-templates.ts` exists (modified)
- File `/Users/jeet/production-crm/backend/src/routes/emailTemplates.ts` exists (modified)
- File `/Users/jeet/production-crm/.planning/phases/06-stream-coherent-templates-and-review-queue/06-01b-SUMMARY.md` exists (this file)
- Commit `01fe98a` exists in git log on `production` branch
- Push to origin/production succeeded fast-forward `3f8ce4c..01fe98a`
- Runtime guard reproduces: `OK 9/9` + `CROSS-CONTAM CHECK: PASS`
- All 9 NO-SPACE dict keys present (verified)
- All 9 HTML-comment sentinels present (verified)
- 0 invented streams (RPA, Web3, AI-ML grep counts all 0)
- 0 `'Stream: ` with space (grep count 0)
- Phase 4 firewall: 0 lines (verified)
- Phase 5 send-path firewall: 0 lines (verified)
- NetSuiteCampaignWizard.tsx 0-touch: 0 lines (verified)

## Next Phase Readiness

- **Plan 06-04 UNBLOCKED:** 4 new pending-review routes (GET /pending-review + POST /:id/approve + POST /:id/reject + POST /:id/edit with server-side renderedBody re-render after aiTokens override). Can consume `queueIds` from Plan 06-03's response envelope OR list-by-status='pending_review'.
- **Plan 06-05 UNBLOCKED (after 06-04):** PendingReviewQueue component + Apollo Campaign button on CampaignsPage.tsx.
- **Plan 06-06 (deploy gate) waits for 06-04 + 06-05:** autonomous:false; 2 checkpoint:human-action approvals (deploy + live-verify); 9-stream live verify with Rajesh approval.
- **No blockers introduced.** All firewalls hold. Working tree clean (modulo pre-existing untracked Phase 05 planning files).

---
*Phase: 06-stream-coherent-templates-and-review-queue*
*Plan: 01b*
*Completed: 2026-06-01*
