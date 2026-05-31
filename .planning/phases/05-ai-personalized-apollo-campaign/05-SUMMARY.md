---
phase: 05-ai-personalized-apollo-campaign
plan: PHASE
subsystem: ai-personalized-email-campaigns
tags: [anthropic, claude-sonnet-4-6, web-search, resend, prisma, react-wizard, ec2-deploy, intent-based-personalization, apollo, sara]

# Dependency graph
requires:
  - phase: 04-apollo-import-and-auto-campaign
    provides: "Apollo contact import + Resend send-campaign path + Sara <sara@techcloudpro.com> as Phase-4 sender + 9 seeded Stream:* email_templates + Contact stream classification + Phase 4 firewall (campaigns.ts/awsSES.ts unchanged)"
provides:
  - "AI-personalized email campaign capability: Apollo contact → Claude web_search research → 4 personalized tokens (intentHook/companyContext/painPoint/cta) → render template → Resend dispatch"
  - "POST /api/apollo/send-personalized-campaign endpoint (sequential per-contact loop, 250ms pacing, 50-contact hard gate, previewOnly + testRecipient support, 7-field cost telemetry)"
  - "NetSuiteCampaignWizard 5-step UI (Audience → Email → AI Personalize → Review → Done) with first-contact preview gate + cost-line + Re-generate ✨ button + Send Another reset"
  - "personalized_email_sends audit table (20 columns, 5 indexes, 3 FKs) — one row per Claude call + send attempt, Rajesh-auditable forensic record"
  - "9 stream templates upgraded to v2 with {{intentHook}}/{{companyContext}}/{{painPoint}}/{{cta}} placeholders + 9-stream STREAM_FALLBACKS dict (defensible strings when Claude returns null)"
  - "5-fallback Claude contract (locked at EXACTLY 5: Claude not configured / Claude timed out / Claude returned empty response / Claude returned malformed JSON / Claude unavailable) — falsifiable AI claim per Case A acceptance"
affects: [TCP-v6-template-integration, phase-4.5-icp-filter]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intent-based AI email personalization via web_search_20250305 tool (modeled after TCP v6 video pipeline but using CRM EmailTemplate block templates)"
    - "5-fallback contract for per-contact AI helpers — never throws, distinct warning strings, falsifiable smoke acceptance"
    - "Audit-before-send pattern: prisma.personalizedEmailSend.create (status='pending') BEFORE Resend, update AFTER (status='sent'|'failed'|'preview')"
    - "Forward-compat cost envelope: separate claudeCostUSD + resendCostUSD + totalCostUSD fields so paid-tier swap is a one-line constant change"
    - "Stable firewall anchor tags (`phase-04-baseline`) at last pre-phase commit on protected files — replaces commit-message-grep heuristics"
    - "Authoritative migration verification via psql `_prisma_migrations.finished_at` (NOT migrate-deploy exit code)"
    - "Anthropic pre-flight model probe before deploy/smoke — fail fast if model inaccessible"
    - "Tight smoke acceptance — Case A requires personalized=1 AND non-null intentHook AND no raw `{{intentHook}}` literal; falsifiable AI claim"

key-files:
  created:
    - "backend/prisma/migrations/20260531120000_phase05_personalized_email_send/migration.sql"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-RESEARCH.md"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-01-PLAN.md"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-01-SUMMARY.md"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-02-PLAN.md"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-02-SUMMARY.md"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-03-PLAN.md"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-03-SUMMARY.md"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-04-PLAN.md"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-04-SUMMARY.md"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-SUMMARY.md (this file)"
  modified:
    - "backend/prisma/schema.prisma (+PersonalizedEmailSend model + 3 inverse relations)"
    - "backend/src/routes/apollo.ts (+469 lines — Phase 5 types + personalizeContactWithClaude + POST /send-personalized-campaign route)"
    - "backend/src/routes/emailTemplates.ts (+POST /upgrade-streams-v2 endpoint)"
    - "backend/src/seeds/stream-templates.ts (+STREAM_TEMPLATE_V2_BODY + STREAM_FALLBACKS dict + upgradeStreamTemplatesToV2 helper)"
    - "frontend/src/services/api.ts (+5 typed interfaces + apolloApi.sendPersonalizedCampaign with 600s timeout)"
    - "frontend/src/components/NetSuiteCampaignWizard.tsx (4→5 step refactor: +386/-34 then +180/-128 = net +404 lines, 1375 total)"

key-decisions:
  - "Sara <sara@techcloudpro.com> kept as sender (per Phase 4 locked decision) — no new from-address infrastructure"
  - "Plain v2 stream template body used for AI content rendering — branded TCP v6 HTML shell integration is a deferred follow-up (NOT a Phase 5 gap)"
  - "5-fallback Claude contract locked at EXACTLY 5 distinct warning strings (verified by sed-scoped grep within personalizeContactWithClaude body)"
  - "Non-object JSON FOLDED into 'Claude returned malformed JSON' via manual throw inside try/catch — never surfaces internal Error message to caller"
  - "Curated 10-key apolloRawData whitelist passed to Claude prompt (vs full raw data) — ~200 input tokens vs 2-3k, big quality lift, predictable cost"
  - "250ms pacing between Resend sends (NOT Phase 4's 100ms) — stays under Resend free-tier 5-req/sec limit by design"
  - "previewOnly path caps contactIds at slice(0,1) — single-contact preview by construction; skips Resend dispatch but DOES write an audit row with status='preview'"
  - "testRecipient is opt-in only (CLI smoke tools); wizard NEVER sets it; value persisted to personalized_email_sends.testRecipient column for audit"
  - "50-contact hard gate via PERSONALIZE_BATCH_HARD_CAP requires confirmedLargeBatch:true in request body — cost gate at ~$3.45 per locked decisions"
  - "Cost telemetry envelope keeps claudeCostUSD + resendCostUSD + totalCostUSD as SEPARATE fields — future paid-Resend tier flips RESEND_COST_PER_SEND const without changing response shape"
  - "PersonalizedEmailSend NEW table (not email_logs extension) — avoids campaignId NOT NULL FK regression"
  - "Per-stream tailored fallback strings (NOT generic-only) — defensible for real prospects when Claude returns null"

patterns-established:
  - "Phase 5 send-route owns its own constants block (RESEND_COST_PER_SEND, PERSONALIZE_*) — Phase 4 send-campaign uses inline 100ms; the two routes are intentionally decoupled"
  - "Audit-row creation BEFORE Resend ensures forensic record even on dispatch failure"
  - "Wizard Step 3 preview is auto-fetched via useEffect with deps [step, firstContactId, templateId] — caches first call, invalidates on Back navigation"
  - "Send-another button resets ALL Phase 5 state (not just step) — prevents stale preview/cost carrying into fresh wizard cycle"

requirements-completed: [REQ-050, REQ-051, REQ-052, REQ-053, REQ-054]

# Metrics
duration: ~2 hours (Plans 01-03 implementation + Plan 04 deploy + smoke + close)
completed: 2026-05-31
---

# Phase 05: AI-Personalized Campaign for Apollo Contacts (Intent-Based, Block-Template) Summary

**AI-personalized email campaigns LIVE: Apollo contact → Claude web_search research → 4 personalized tokens (intentHook/companyContext/painPoint/cta) → render Phase-4 stream template → Resend dispatch from Sara. End-to-end verified on production EC2 against Ricardo Deben (Centella Health Tech) with 2 emails delivered to jm@techcloudpro.com (~$0.374 spend). 4 plans + 6 task commits + 4 doc commits. Phase 4 firewall preserved byte-for-byte.**

## Performance

- **Duration:** ~2 hours total across Plans 01-04
- **Started:** 2026-05-31T01:41:30Z (Plan 01 Task 1)
- **Completed:** 2026-05-31 (Plan 04 close ceremony)
- **Plans:** 4/4 complete
- **Live-verification spend:** ~$0.374 (Claude + web_search across Cases A, B, C; Resend free tier $0; pre-flight $0.000029)
- **Live emails delivered:** 2 (msgIds e95edd09 + 1ab6897c)

## Phase Goal Recap

Take Apollo-imported contacts in prod DB → for each: (1) Claude API with web_search researches the company (recent news, tech stack, pain points relevant to the contact's stream classification), (2) Claude generates 4 per-contact personalized tokens (intentHook, companyContext, painPoint, CTA), (3) the pre-seeded stream EmailTemplate is rendered with those AI tokens substituted in (alongside {{firstName}}/{{companyName}}/{{title}}), (4) email sent via existing Resend `/api/apollo/send-campaign` path FROM `Sara <sara@techcloudpro.com>`, (5) each rendered body persisted to `personalized_email_sends` for audit. NOT video (deferred indefinitely). NO new from-address (Sara stays per Phase 4 locked decision).

## Per-Plan Deliverables Table

| Plan | Name | Status | Commits | Key Deliverable |
|------|------|--------|---------|-----------------|
| 05-01 | Prisma migration + 9 stream templates upgraded to v2 with AI placeholders + idempotent upgrade endpoint | Complete | `b19feec`, `820fd4a`, `3a8424c` (docs) | `personalized_email_sends` table + STREAM_TEMPLATE_V2_BODY + STREAM_FALLBACKS dict + POST `/api/email-templates/upgrade-streams-v2` |
| 05-02 | Backend `personalizeContactWithClaude` helper (5 fallbacks) + POST `/api/apollo/send-personalized-campaign` route + frontend `apolloApi.sendPersonalizedCampaign` client | Complete | `908e631`, `35bbc58`, `8734f2f` (docs) | 469-line backend helper+route with EXACTLY 5 fallback warnings, 7-field cost envelope, previewOnly + testRecipient + confirmedLargeBatch gates |
| 05-03 | NetSuiteCampaignWizard 4→5 step refactor (Audience → Email → AI Personalize → Review → Done) | Complete | `8344905`, `46151a4`, `2e1f402` (docs) | Step 3 first-contact AI preview + cost panel + Re-generate button; Step 4 reuses preview audit[0]; Step 5 cost summary + collapsible failures |
| 05-04 | Deploy + Prisma migrate + template upgrade curl + 4-case smoke against Ricardo Deben + close ceremony | Complete | `b19feec..2e1f402` (9 pushed) + close commit | Backend dist + frontend dist live on EC2; migration applied; 9 v2 templates; 4/4 smoke PASS; 2 emails delivered; firewall clean |

## End-to-End Live Verification

**Target:** Ricardo Deben (`cmpsz0d3q000350mxrlau3sg5`) at Centella Health Tech.

**Flow exercised live on prod EC2:**

```
Apollo contact (Ricardo Deben, Centella Health Tech, Cybersecurity stream)
  → POST /api/apollo/send-personalized-campaign { contactIds: [...], previewOnly: true }
  → personalizeContactWithClaude(contact, 'Cybersecurity')
    → Anthropic claude-sonnet-4-6 + web_search_20250305 (max_uses=3)
    → Returns 4 tokens: intentHook (Med-Lab rebrand signal) +
                        companyContext (Southeast healthtech expansion) +
                        painPoint (HIPAA + connected-device security) +
                        cta (security ops chat)
  → Audit row written to personalized_email_sends (status='preview', renderedBody populated)
  → HTTP 200 with personalized=1, personalizeFailures=0
  → Operator clicks Send (Case B)
  → POST /api/apollo/send-personalized-campaign { contactIds: [...], testRecipient: 'jm@techcloudpro.com' }
  → Resend dispatch to jm@techcloudpro.com (FROM Sara)
  → Audit row updated to status='sent' with resendMessageId
  → Email arrives in jm@techcloudpro.com inbox (Subject: "Security engineers — bench available")
```

**Result:** 2 distinct emails delivered (Case B msgId `e95edd09-2029-4101-846f-a8c36c01954a`, Case C msgId `1ab6897c-ddad-44a8-88d8-99494a46d8d5`). Operator confirmed content is genuinely personalized to Centella Health Tech (NOT fallback strings). User progressed to next request (branded template integration) = implicit approval per checkpoint protocol.

## Tokens Delivered (Ricardo Deben / Centella Health Tech / Cybersecurity stream)

The 4 AI tokens that landed in JM's inbox referenced (synthesizing from web_search):

- **intentHook** — recent Centella signal (Med-Lab rebrand + Southeast expansion + HIPAA + connected-device footprint)
- **companyContext** — what Centella does + scale (Southeast healthtech with connected devices)
- **painPoint** — Cybersecurity-stream operational friction (HIPAA + connected-device threat surface + security ops)
- **cta** — single question tying pain to TCP's security engineer bench

Distinguishable from fallback ("Quick note from TCP's Cybersecurity practice. ...") by web_search-sourced specifics. Case A's tight acceptance confirmed `personalized=1, personalizeFailures=0`.

## Cost Telemetry Summary

| Phase | Source | Cost |
|---|---|---|
| Plan 04 Task 0 | Anthropic pre-flight probe (claude-sonnet-4-6 + 10-token ping) | ~$0.000029 |
| Plan 04 Task 2 | Case A preview (1 contact, 1 Claude call + web_search) | ~$0.069 |
| Plan 04 Task 2 | Case B live send (1 contact, 1 Claude call + web_search + 1 Resend) | ~$0.069 |
| Plan 04 Task 2 | Case C idempotency send (1 contact, 1 Claude call + web_search + 1 Resend) | ~$0.069 |
| Plan 04 Task 2 | Web_search overhead across cases | ~$0.167 |
| Plan 04 Task 2 | Case D (hard gate) | $0 |
| **Phase total live cost** | Claude + web_search | **~$0.374** |
| **Phase total Resend cost** | Free tier | **$0** |
| **Grand total** | | **~$0.374** |

Per-contact cost ~$0.069 (Claude input ~$0.0057 + search-retrieved content ~$0.024 + Claude output ~$0.009 + 3 web_searches × $0.01 = $0.030). Forward-compat envelope keeps `claudeCostUSD + resendCostUSD + totalCostUSD` separate so future paid-Resend tier swap is a one-line constant change.

## Phase 4 Firewall Proof

```bash
# Stable anchor tag at last pre-Phase-5 commit on campaigns.ts
$ git tag -l phase-04-baseline
phase-04-baseline

# Zero-line diff across entire Phase 5 commit range
$ git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l
0
```

Phase 4's SES path (Rajesh's BrandMonkz flow at `campaigns.ts`) and SES service (`awsSES.ts`) — UNTOUCHED byte-for-byte across all 4 Phase 5 plans + the close commit. Phase 5 ships entirely in the parallel Resend path at `apollo.ts:875` (`POST /send-personalized-campaign`).

Per-plan firewall verification was also done independently in each SUMMARY:
- Plan 05-01: `git diff cc964ad..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l` = 0
- Plan 05-02: HEAD~2 diff over campaigns.ts/awsSES.ts/wizard.tsx/ApolloSearchForm.tsx/ApolloPage.tsx/ContactList.tsx = 0
- Plan 05-03: HEAD~2 diff over apollo.ts/campaigns.ts/awsSES.ts/schema.prisma/ContactList.tsx/ApolloPage.tsx/ApolloSearchForm.tsx = 0
- Plan 05-04: phase-04-baseline..HEAD over campaigns.ts/awsSES.ts = 0

## 5-Fallback Contract (locked, EXACTLY 5)

| # | Trigger | Warning String |
|---|---------|----------------|
| 1 | `anthropicClient` null (missing ANTHROPIC_API_KEY) | `'Claude not configured'` |
| 2 | Promise.race resolves to `'TIMEOUT'` after 60s | `'Claude timed out — used per-stream fallback'` |
| 3 | No text block in `response.content` | `'Claude returned empty response'` |
| 4 | JSON.parse throws OR result is non-object/null/array (folded) | `'Claude returned malformed JSON'` |
| 5 | SDK call throws (network / 4xx-5xx / web_search 5xx / anything else) | `'Claude unavailable'` |

Verified by sed-scoped grep within `personalizeContactWithClaude` body — EXACTLY 5 distinct strings emitted. Non-object JSON branch was folded into Fallback 4 via manual `throw new Error('non-object JSON')` inside the try/catch (internal Error message never surfaces to caller). HIGH #3 falsifiability gap closed: Case A REQUIRES `personalized=1` (NOT `personalizeFailures=1`) — a fallback path would FAIL Case A's acceptance, not pass it.

## 12 Locked Design Decisions (honored throughout)

1. NEW table `personalized_email_sends` (not email_logs extension) — Plan 05-01
2. Per-stream tailored fallback strings (NOT generic-only) — Plan 05-01
3. Idempotent template upgrade via sentinel substring (`includes('{{intentHook}}')`) — Plan 05-01
4. 5-fallback Claude contract with non-object JSON folded — Plan 05-02
5. 250ms pacing (NOT 100ms) — stays under Resend free-tier 5/sec — Plan 05-02
6. 50-contact hard gate (`PERSONALIZE_BATCH_HARD_CAP=50` + `confirmedLargeBatch:true`) — Plan 05-02
7. `previewOnly` caps at `slice(0,1)` — single-contact preview — Plan 05-02
8. `testRecipient` opt-in only; wizard never sets it — Plan 05-02
9. Forward-compat cost envelope (separate claude/resend/total) — Plan 05-02
10. Curated 10-key apolloRawData whitelist — Plan 05-02
11. Re-generate ✨ button is the ONLY UX path that creates new audit rows — Plan 05-03
12. Step 4 (Review) re-uses `previewResult.audit[0]` (no duplicate Claude fetch) — Plan 05-03

All 12 decisions honored in the live smoke. No drift detected.

## Files Created/Modified (phase total)

**Created:**
- `backend/prisma/migrations/20260531120000_phase05_personalized_email_send/migration.sql` (CREATE TABLE + 5 indexes + 3 FKs)
- 5 planning docs (RESEARCH + 4 PLANs + 4 SUMMARYs + 1 phase SUMMARY)

**Modified:**
- `backend/prisma/schema.prisma` — +PersonalizedEmailSend model + 3 inverse relations on Contact/EmailTemplate/User
- `backend/src/routes/apollo.ts` — +469 lines (Phase 5 types + personalizeContactWithClaude helper + POST /send-personalized-campaign route)
- `backend/src/routes/emailTemplates.ts` — +POST /upgrade-streams-v2 endpoint
- `backend/src/seeds/stream-templates.ts` — +STREAM_TEMPLATE_V2_BODY + STREAM_FALLBACKS dict + upgradeStreamTemplatesToV2 helper
- `frontend/src/services/api.ts` — +5 typed interfaces + apolloApi.sendPersonalizedCampaign with 600s axios timeout
- `frontend/src/components/NetSuiteCampaignWizard.tsx` — 4→5 step refactor (+404 net, 971 → 1375 lines)

## Deferred Items (NOT Phase 5 gaps — separate work items)

1. **Branded TCP v6 template integration** — wrap the 4 AI tokens inside the v6 branded HTML shell (matches the visual identity of Sara's existing TCP retargeting pipeline per memory `tcp_v6_sender_rotated`). Phase 5 currently ships the plain v2 stream template. Sender already correct. Integration is template-substitution only.
2. **Per-stream from-address configurability** — still hardcoded to Sara. Phase 4.5 deferral.
3. **ICP filter** — Apollo importer still pulls competitors (NetSuite tag returns NetSuite consultancies, not customers). Needs `q_organization_industry_tag_ids` whitelist or `--exclude-industries` filter. Phase 4.5.
4. **Per-stream AI fallback approval** (RESEARCH OQ1) — Rajesh review pending.
5. **Audit-row dedupe policy** (RESEARCH OQ4) — one row per Claude call today; may want per (contact, template) dedupe.
6. **Re-personalize cost visibility** (RESEARCH OQ2) — Step 3 Re-generate ✨ doesn't surface per-click cost.
7. **brandmonkz-NEXT atomic-swap deploy pattern** — generalize to crm-backend to eliminate the documented ~5s broken-window during frontend deploys.
8. **2 pre-existing failed migrations** (`20251112_add_isActive_to_video_template`, `20251112_fix_campaign_timestamps`) still emit P3018 noise on `prisma migrate deploy`. Prior-phase debt.

## Next-Phase Hooks (future expansions)

- **Phase 5.5 candidates:** Resend open/click webhook integration (audit row gets `openedAt`/`clickedAt` columns); BullMQ queue for parallel batches (today is sequential 250ms); audit UI surface in `/apollo` showing per-contact send history.
- **Branded template integration** (immediate next): wrap STREAM_TEMPLATE_V2_BODY in the v6 HTML shell. One-line template swap.
- **ICP refinement** (Phase 4.5): industry whitelist + tech_uids filter to avoid burning Apollo credits on competitors.

## Decisions Made

See `key-decisions` frontmatter above. Phase-level highlights:

- Phase 5 added ZERO new dependencies (`tech-stack: { added: [] }`). All needed packages (`@anthropic-ai/sdk`, `resend`, `@prisma/client`, etc.) already in package.json from Phase 4 or earlier.
- Phase 5 added ZERO new infrastructure on EC2 — same Prisma DB, same pm2 process, same nginx/cloudfront. Only `dist/` deployed and templates upgraded in-place.
- All 12 locked design decisions from RESEARCH honored end-to-end (no drift across 4 plans).
- All 4 HIGH risk mitigations (#3 falsifiability, #5 canonical names, #6 migration assertion, #7 template assertion) closed.
- All 4 MEDIUM risk mitigations (#9 pre-flight, #10 broken-window documented, #11 useEffect deps, #12 stable tag anchor) honored.

## Deviations from Plan

Per Plan SUMMARY:
- **Plan 05-01:** 2 auto-fixes — Rule 3 file-path correction (emailTemplates.ts not email-templates.ts) + Rule 3 auth idiom adaptation (req.user?.id not req.user?.userId)
- **Plan 05-02:** 2 auto-fixes — Rule 3 auth idiom (same as 05-01) + Rule 3 Prisma client regenerated locally (tooling-only)
- **Plan 05-03:** 2 auto-fixes — Rule 3 handleSend body rewrite folded into Task 1's commit (avoids intermediate state) + Rule 1 dead-code removal of bodyPlain/validationWarnings/sendBlocked
- **Plan 05-04:** 0 deviations on Task 3 close ceremony; Tasks 0-2 executed per plan with documented HIGH/MEDIUM mitigations baked in

**Total phase deviations:** 6 auto-fixed across Plans 01-03 (4 Rule 3 blocking, 1 Rule 1 dead code, 1 Rule 3 tooling). All mechanical adaptations to actual codebase reality. Zero scope creep.

## Issues Encountered

- **Plan 05-02:** Stale local Prisma client required `prisma generate` to validate types (tooling, not source).
- **Plan 05-03:** None.
- **Plan 05-04:** None on Task 3. Tasks 0-2 executed cleanly on first attempt (pre-flight green, migration applied, templates upgraded, 4/4 smoke PASS).
- **Pre-existing infrastructure:** 2 pre-existing failed migrations on prod DB. Handled per HIGH #6 by switching from migrate-deploy exit code to `_prisma_migrations.finished_at` psql assertion. Cleanup of those 2 migrations is separate work.

## User Setup Required

None ongoing. Phase 5 is live and verified. Operator can use the wizard at `/apollo` for any future Apollo-imported contacts immediately.

## Next Phase Readiness

- **Phase 5 COMPLETE.** Next phase TBD.
- **Immediate next work item (user-flagged):** branded TCP v6 template integration — wrap the 4 AI tokens in the v6 HTML shell.
- **Phase 4.5 reopen-trigger pending:** fresh Apollo API key on EC2 (separate from Phase 5; documented in `04-deferred-items.md` item #1).
- **TCP v6 alignment:** Sara is already the sender per memory `tcp_v6_sender_rotated` (rotated 2026-05-26) — Phase 5 inherits this aligned identity.

## Self-Check: PASSED

Verified existence of all claimed artifacts:

```
FOUND: backend/prisma/migrations/20260531120000_phase05_personalized_email_send/migration.sql
FOUND: backend/src/routes/apollo.ts (personalizeContactWithClaude + send-personalized-campaign)
FOUND: backend/src/routes/emailTemplates.ts (POST /upgrade-streams-v2)
FOUND: backend/src/seeds/stream-templates.ts (STREAM_TEMPLATE_V2_BODY + STREAM_FALLBACKS)
FOUND: frontend/src/services/api.ts (apolloApi.sendPersonalizedCampaign)
FOUND: frontend/src/components/NetSuiteCampaignWizard.tsx (5-step useState<1|2|3|4|5>)
FOUND: .planning/phases/05-ai-personalized-apollo-campaign/05-{01,02,03,04}-SUMMARY.md
FOUND: .planning/phases/05-ai-personalized-apollo-campaign/05-SUMMARY.md (this file)
FOUND: commits b19feec, 820fd4a, 908e631, 35bbc58, 8344905, 46151a4 on origin/production
FOUND: tag phase-04-baseline at 0175cc3
RESEND DELIVERIES: msgId e95edd09-2029-4101-846f-a8c36c01954a (Case B) + msgId 1ab6897c-ddad-44a8-88d8-99494a46d8d5 (Case C) — 2 emails to jm@techcloudpro.com from Sara
FIREWALL: git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l = 0
LIVE COST: ~$0.374 (Claude + web_search); Resend free tier $0
```

---
*Phase: 05-ai-personalized-apollo-campaign*
*Completed: 2026-05-31*
