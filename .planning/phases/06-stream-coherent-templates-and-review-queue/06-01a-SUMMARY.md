---
phase: 06-stream-coherent-templates-and-review-queue
plan: 01a
subsystem: planning-docs
tags: [stream-templates, email-copy, human-review, no-source-changes, req-060-step-1-of-2]

# Dependency graph
requires:
  - phase: 06-CONTEXT
    provides: locked per-stream copy direction table + naming conventions (NO-SPACE dict keys, HTML-comment sentinels, OMIT semantics for non-NetSuite callout)
  - phase: quick-8
    provides: STREAM_TEMPLATE_V3_BODY shell (the v3 chrome that Stream:NetSuite section in this doc preserves verbatim)
provides:
  - human-readable-9-stream-copy-draft
  - source-of-truth-for-plan-06-01b-dict-literal-synthesis
  - per-stream-metricLabel-uniqueness-evidence
  - per-stream-html-comment-sentinel-uniqueness-evidence
  - netsuite-callout-preservation-evidence
affects:
  - 06-01b (mechanical dict-literal synthesis after copy-approved checkpoint)
  - 06-06 (psql + JSON per-stream sentinel verify will grep for these metricLabel + sentinel literals)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - human-reviewable-copy-draft-before-typescript-synthesis (gate: user reads markdown, then replies 'copy-approved' at 06-01b checkpoint)
    - no-source-changes-in-prep-plans (only planning markdown created)
    - per-stream-sentinel-uniqueness-by-construction (HTML-comment + bare-stream-suffix guarantees no collision across 9 streams)
    - OMIT-marker-semantics (noteCalloutTitle: OMIT drops the entire callout block — used by 8 of 9 streams to preserve the NetSuite-only callout)

key-files:
  created:
    - .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md
  modified: []

key-decisions:
  - "Single markdown file with 9 sections + preamble + trailer — chose ONE file over per-stream files for easier diff review and atomic copy-approved acceptance"
  - "Stream:NetSuite section preserves quick-8 v3 copy verbatim (it's the one stream the v6 shell was designed for); other 8 streams set noteCalloutTitle: OMIT and drop the entire 'A note on NetSuite Next 2026' inline callout"
  - "NO-SPACE dict-key format ('Stream:NetSuite', 'Stream:AI/ML', etc.) matches the prod DB email_templates.category writes at backend/src/seeds/stream-templates.ts:102 (seed.category = `Stream:${seed.stream}`) byte-for-byte"
  - "HTML-comment sentinel format <!-- STREAM_V3:<bareName> --> uses bare-stream suffix (the part after Stream:) so each sentinel is unique-by-construction and survives any future copy changes"
  - "Per-stream metricLabel literal is each stream's name + ' Practice' (e.g., 'NetSuite Practice', 'AI/ML Practice', 'TCP Practice' for Stream:Other) — this is the unique grep-anchor Plan 06-06 STEP K/L will use as the per-stream psql sentinel"

patterns-established:
  - "Pattern: copy-before-code — when 9 prospect-facing email bodies need TypeScript dict instantiation, write the human-readable markdown first, get explicit user 'copy-approved' at a human-action checkpoint, THEN mechanically synthesize. Prevents auto-shipping unreviewed prospect-facing copy."
  - "Pattern: sentinel-by-construction — use HTML-comment markers with unique-per-target suffix instead of relying on visible-copy uniqueness. Survives copy edits, deterministic detection."
  - "Pattern: OMIT-marker for conditional blocks — use a special string ('OMIT') in the copy spec to mean 'drop the entire block' rather than 'render as empty string'. Distinguishes intentional-empty from intentional-absent."

requirements-completed: [REQ-060]

# Metrics
duration: 4min
completed: 2026-06-02
---

# Phase 06 Plan 01a: 9-Stream Copy Drafts Summary

**Human-readable markdown draft of 9 per-stream email body copy proposals (NetSuite preserved verbatim from quick-8 v3; AI/ML, Cloud/DevOps, Cybersecurity, Data/Analytics, Mobile, Enterprise/ERP, Staffing/HR, Other all newly drafted with OMIT'd NetSuite callout) — source of truth for Plan 06-01b's dict-literal synthesis after user replies `copy-approved`.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-02T03:33:59Z
- **Completed:** 2026-06-02T03:36:46Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments

- Created `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md` (~18.4 KB, 268 lines) with:
  - File-level preamble explaining what / why / how-user-approves
  - Naming-conventions block (dict-key NO-SPACE format, HTML-comment sentinel format, NetSuite callout OMIT semantics)
  - Shared-visual-chrome block (navy `#0F172A` header, orange `#F97316` callout accent, 4-cell metrics row, 4 CTA buttons, Sara signature)
  - 12-per-stream-fields enumeration
  - Shared-service-props-03+04 block (Dedicated AI Consulting + Transparent staffing $1/contract)
  - 9 stream sections in VALID_STREAMS order (NetSuite, AI/ML, Cloud/DevOps, Cybersecurity, Data/Analytics, Mobile, Enterprise/ERP, Staffing/HR, Other)
  - Per-section: dict-key header, HTML-comment sentinel header, 12-row field table, optional Notes block
  - Trailing block: how-to-approve / how-to-edit / verification-before-06-01b-unblocked
- Zero production source touched: backend/, frontend/, prisma/ all untouched (verified `git diff HEAD~1 --stat | grep -cE "(backend/|frontend/|prisma/)" = 0`)
- Single atomic commit `f9c909f` by `jeet-avatar <jm@techcloudpro.com>`, pushed fast-forward `eb6dd24..f9c909f` to origin/production
- REQ-060 step 1/2 closed; step 2/2 (mechanical dict-literal synthesis + /upgrade-streams-v3 stream-aware rewire) belongs to Plan 06-01b after `copy-approved` checkpoint

## Task Commits

Each task was committed atomically:

1. **Task 1: Write 06-STREAM-COPY.md with 9-stream human-readable draft** — `f9c909f` (docs)

_Single-task plan — one commit covers the entire deliverable._

## Files Created/Modified

- `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md` — 268-line human-reviewable draft of 9 per-stream email body copy proposals (preamble + 9 sections + trailer)

## Decisions Made

- **NetSuite preservation strategy:** the Stream:NetSuite section copies the quick-8 v3 copy verbatim into the field table — Stream:NetSuite is the ONLY stream with `noteCalloutTitle != OMIT` (it carries the existing `A note on NetSuite Next 2026` callout). All other 8 streams set `noteCalloutTitle: OMIT` and the entire callout block disappears (Plan 06-01b's `buildStreamV3Body` will branch on OMIT to skip the block emit).
- **Naming conventions verbatim from CONTEXT.md:** dict-key NO-SPACE format (`'Stream:NetSuite'`), HTML-comment sentinel format (`<!-- STREAM_V3:NetSuite -->`), `OMIT` literal as conditional-block marker — all locked. No improvisation; each is anchored to a specific upstream file:line reference cited in the doc preamble.
- **Per-stream metricLabel anchor:** chosen as `<Stream label> Practice` (e.g., `NetSuite Practice`, `AI/ML Practice`, `TCP Practice` for Stream:Other) because it (a) gives each stream a unique grep-anchor for Plan 06-06's psql sentinel verify, (b) makes the metrics row read naturally with `Since 2015 / <Stream label> Practice`, (c) survives any future copy edits to surrounding paragraphs.
- **Stream:Other framing:** `TCP Practice` + "senior consulting" + "custom copilot" — generic catch-all that name-checks TCP itself rather than picking a fake-specific framing. Recipients who land in Stream:Other are by definition out-of-taxonomy, so a generic-but-honest framing beats over-promising stream-specific expertise.
- **Stream:Staffing/HR positioning:** leads with `$1/contract staffing` since that's TCP's actual brand-wide pricing model (per CLAUDE.md Pricing table). Other streams mention `$1 Staffing` in the footerReprise but Staffing/HR puts it in the metricLabel + servicePropTitle1 too.

## Deviations from Plan

None - plan executed exactly as written. Every field value in the 9 sections is byte-for-byte the plan's STEP C "authoritative per-stream content" table. Preamble (STEP A), trailing block (STEP D), and commit recipe (STEP E) all followed verbatim.

## Issues Encountered

None. One observation worth noting: the plan's verify-block `grep -cE "Stream:Cloud\b"` and `grep -cE "Stream:Data\b"` are listed with expected value `0`, but in practice they returned `3` each because:

- `\b` in regex matches between word and non-word characters
- Both `:` and `/` are non-word characters
- So `Stream:Cloud\b` matches `Stream:Cloud/DevOps` (the slash IS the word boundary that closes the match)
- Hits are: (a) line 9 of the preamble where the OLD wrong taxonomy names (`Cloud`, `Data`) appear inside backticks as quoted historical references, plus (b) the legitimate `## Stream:Cloud/DevOps` and `## Stream:Data/Analytics` section headers

This is content-correct — the file does NOT contain invented bare `Stream:Cloud` or `Stream:Data` streams. The verify-spec's expected-zero assertion was an unintended consequence of the chosen regex; the actual semantic check (no invented streams beyond the 9 in VALID_STREAMS) is satisfied. Logged here so 06-01b's mechanical synthesis (which doesn't re-run this specific grep) is not blocked.

## Next Phase Readiness

- **06-01b unblocked** — copy doc exists and is ready for user review. Plan 06-01b's first task is a `checkpoint:human-action` asking the user to reply `copy-approved` (or send line-edits which get re-applied to 06-STREAM-COPY.md, then re-shown for approval). Only after `copy-approved` does the mechanical TypeScript dict synthesis run.
- **06-06 sentinel-verify pre-condition satisfied** — every metricLabel is unique per stream (NetSuite Practice / AI/ML Practice / Cloud/DevOps Practice / Cybersecurity Practice / Data/Analytics Practice / Mobile Practice / Enterprise/ERP Practice / Staffing/HR Practice / TCP Practice). 06-06's psql STEP K/L + JSON STEP M can grep for these as positive sentinels with cross-contamination negative checks already defined.
- **Wave 1 status:** Plan 06-02 (Prisma additive migration for `pending_review`+`rejected` enum) is the parallel sibling in Wave 1 — its SUMMARY appeared in the phase dir during this plan's execution (separate agent). Wave 2 unblocked once both Wave 1 plans land.

---

## Self-Check: PASSED

**File existence:**
- FOUND: .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md (268 lines, 18,404 bytes)

**Commit existence:**
- FOUND: f9c909f docs(06-01a): 9-stream per-stream copy drafts for human review (REQ-060 step 1/2)
- Author verified: jeet-avatar <jm@techcloudpro.com>

**No source code touched:**
- backend/ touches: 0 lines
- frontend/ touches: 0 lines
- prisma/ touches: 0 lines

**Per-stream sentinel uniqueness:**
- 9/9 HTML-comment sentinels present (NetSuite, AI/ML, Cloud/DevOps, Cybersecurity, Data/Analytics, Mobile, Enterprise/ERP, Staffing/HR, Other)
- 9/9 metricLabels unique (each "<Stream> Practice" literal appears at least once)

**Dict-key format:**
- WRONG `'Stream: '` (with space) count: 0
- Correct `'Stream:NetSuite'` (NO space) count: 2 (header + dict-key line in section)
- Correct `'Stream:Cybersecurity'` (NO space) count: 1 (dict-key line)

**NetSuite callout preservation:**
- "A note on NetSuite Next 2026" appears 2 times: once as noteCalloutTitle, once in Stream:NetSuite ariaBlurb (mentions "NetSuite Next 2026, SuiteCloud AI")
- "OMIT" appears 12 times (8 noteCalloutTitle = OMIT + 4 ignored-callout-body references) — satisfies the >=8 plan criterion

**Push:**
- Pushed fast-forward eb6dd24..f9c909f to origin/production
- Branch parity: 0 commits ahead of origin/production

---
*Phase: 06-stream-coherent-templates-and-review-queue*
*Plan: 01a*
*Completed: 2026-06-02*
