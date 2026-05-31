# Phase 6 Context — User Decisions Captured 2026-05-31

This document captures design decisions made during the discussion between user (jm@techcloudpro.com) and AI on 2026-05-31, AFTER quick-8 (v3 branded TCP shell port) shipped but BEFORE Phase 6 was planned. The decisions arose from a live verification of v3 (sent to JM + Rajesh from Sara, msgIds in `.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/sends/V3-SEND-*.json`) that exposed a structural messaging incoherence in the shell.

`/gsd:plan-phase 6` should read this file as the authoritative source of design intent. Skip generic discovery — these decisions are locked.

---

## The problem that triggered Phase 6

Quick-8 ported the TCP v6 retargeting email shell as `STREAM_TEMPLATE_V3_BODY` and upgraded all 9 prod Stream:* email_templates rows to v3. The 4 AI-personalized paragraphs land inside the orange-tinted callout (`{{intentHook}}` / `{{companyContext}}` / `{{painPoint}}` / `{{cta}}`); everything else is the v6 branded shell.

But the v6 shell is **structurally NetSuite-specific**, not just NetSuite-flavored. Concrete evidence inside `backend/src/seeds/stream-templates.ts STREAM_TEMPLATE_V3_BODY`:

| Section | Hardcoded NetSuite copy |
|---|---|
| Preheader (line 27) | "NetSuite, ArthaBuild AI, custom AI work, and our $1 staffing model" |
| Header chrome (line 46) | "TechCloudPro · Certified Solutions Provider · 1000+ Implementations" *(implementations = NetSuite implementations)* |
| Tag pill (line 53) | "NetSuite Next · ArthaBuild AI · $1 Staffing" |
| Metric label (line 69) | "Since 2015 / NetSuite Practice" |
| Intro paragraph (line 100) | "We're a senior NetSuite and AI team. Certified. Around since 2015. Over 1,000 implementations." |
| Inline callout (line 115-117) | "A note on NetSuite Next 2026 — SuiteCloud AI, Predictive Planning, AI Workspaces…" |
| Service prop 01 (line 126-127) | "NetSuite Practice. Senior team, since 2015. Full-cycle implementation, optimization, managed services. Multi-entity, OneWorld, NetSuite Next 2026." |
| Service prop 02 (line 130) | "ArthaBuild AI. Your NetSuite copilot." |
| Footer reprise (line 211) | "NetSuite Next · AI Consulting · $1 Staffing" |
| ArthaBuild banner (line 231) | "Your NetSuite copilot · SuiteScript, BRDs, docs · artha.build" |
| ARIA blurb (line 241) | "ARIA is our AI receptionist. She knows NetSuite Next 2026, SuiteCloud AI…" |

Phase 5 personalizes per *Stream* — Stream:Cybersecurity, Stream:NetSuite, Stream:RPA, Stream:Web3, Stream:Data, Stream:Cloud, Stream:Mobile, Stream:AI-ML, Stream:Other. When a Cybersecurity-stream recipient (Ricardo Deben at Centella Health Tech) opens the email:

- Subject line: "Security engineers — bench available" *(from Stream:Cybersecurity template)*
- Header: "TechCloudPro · 1000+ Implementations" + "Four ways we can help"
- Metrics: "Since 2015 / NetSuite Practice"
- Intro: "We're a senior NetSuite and AI team"
- Orange callout (the AI-personalized part): 4 paragraphs about Centella's Med-Lab rebrand, Southeast healthtech expansion, HIPAA exposure, connected-device security gaps
- Service props 01-04: all NetSuite-anchored
- Footer: "NetSuite Next · AI Consulting · $1 Staffing"

The recipient cannot tell what TechCloudPro is actually selling. The user (JM) and Rajesh both received this on 2026-05-31 and the user immediately flagged: *"the headline starts with netsuite team — then we speak about netsuite — user will get confused whats our actual message."*

An apology was sent to rajesh@techcloudpro.com (Resend msgId `06536925-0b2e-4571-867e-149466bee316`) explaining the template was mid-revision.

## User's stated intent

> "ensure the intent is perfectly [h]onored"

Translation: the recipient's stream-specific context should drive EVERY visible element of the email (subject, header, intro, value props, AI callout), not just the orange callout.

> "we need to have a provision for rajesh to ensure the message is right"

Translation: even with stream coherence, a human-in-the-loop review gate is required before any AI-generated email is dispatched.

## The 3 threads that compose Phase 6

### Thread 1 — Stream-coherent v3 bodies

**Decision:** 9 per-stream `STREAM_TEMPLATE_V3_BODY` variants, one for each `Stream:*` category. Shared visual chrome (navy `#0F172A` header, orange `#F97316` accents, metrics row layout, Sara signature footer, `mailto:sara@techcloudpro.com` unsubscribe) — different stream-coherent COPY everywhere NetSuite text currently sits.

**Naming:** `STREAM_TEMPLATE_V3_BODIES` dict in `backend/src/seeds/stream-templates.ts` keyed by stream label (`{ 'Stream: Cybersecurity': '...', 'Stream: NetSuite': '...', ... }`). Existing single `STREAM_TEMPLATE_V3_BODY` const can stay as a deprecated alias OR be deleted (planner decides — preference: delete and migrate the 9 prod rows to the per-stream variants).

**Per-stream copy direction (planner: synthesize the actual HTML per stream, do NOT just rename NetSuite → CapabilityName):**

| Stream | Capability framing | Sample value prop pairs |
|---|---|---|
| `Stream: Cybersecurity` | Senior security architects + AI-augmented audits | "Cybersecurity Practice. Senior auditors, since 2015." / "ArthaBuild AI. Your security copilot — threat modeling, IR docs, compliance maps." |
| `Stream: NetSuite` | *Keep current copy* — the v6 shell was designed for this stream | unchanged from current v3 |
| `Stream: RPA` | Automation engineering + ArthaBuild AI orchestration | "Automation Practice. UiPath/BluePrism since 2015." / "ArthaBuild AI. Your bot copilot — process discovery, exception triage." |
| `Stream: Web3` | Smart-contract auditing + on-chain infra | "Web3 Practice. Audits + integrations since 2018." / "ArthaBuild AI. Your contract copilot — Solidity reviews, gas analysis." |
| `Stream: Data` | Data engineering + ML pipelines + warehouse modernization | "Data Practice. Senior DEs, Snowflake/Databricks." / "ArthaBuild AI. Your data copilot — dbt models, lineage, anomaly detection." |
| `Stream: Cloud` | Cloud architecture + DevOps + cost optimization | "Cloud Practice. AWS/GCP/Azure architects." / "ArthaBuild AI. Your infra copilot — IaC, cost surfaces, drift." |
| `Stream: Mobile` | iOS/Android + cross-platform + design ops | "Mobile Practice. Native + Flutter/RN since 2015." / "ArthaBuild AI. Your mobile copilot — UI test gen, perf baselines." |
| `Stream: AI-ML` | LLM apps + RAG + classical ML | "AI/ML Practice. Production LLM + classical." / "ArthaBuild AI. Your AI copilot — eval harnesses, prompt versioning." |
| `Stream: Other` | Generic TechCloudPro consulting (catch-all) | "Senior consulting team, since 2015." / "ArthaBuild AI. Your custom copilot." |

**What stays shared across all 9:** the `1000+ Implementations` count (it's the real TechCloudPro track record — across all practices, not just NetSuite), the "Since 2015" anchor, the orange `$1/contract` callout (the $1 staffing offer is brand-wide), Sara's signature, the navy/orange visual palette.

**What gets dropped from non-NetSuite v3 variants:** the "A note on NetSuite Next 2026" inline callout (Stream:NetSuite v3 keeps it; the other 8 either drop it entirely OR replace with stream-relevant context — planner's call but preference is DROP for simplicity).

**Idempotent upgrade endpoint must become stream-aware:** the existing `POST /api/email-templates/upgrade-streams-v3` either (a) stays at v3 endpoint name but now picks the right body per stream from `STREAM_TEMPLATE_V3_BODIES[row.category]`, or (b) gets renamed to `/upgrade-streams-v4` for the new per-stream behavior. Planner chooses; preference is **(a) reuse endpoint name** since v3 was never sent to a paying customer — we treat quick-8 as a draft revision. Sentinel for idempotent re-detection should now be a stream-specific string (e.g., `'1000+ Cybersecurity engagements'` for Cybersecurity, the existing `'1000+ Implementations'` for NetSuite, etc.) or a v3-marker comment baked into each body.

### Thread 2 — Pending Review queue (human-in-the-loop gate)

**Decision:** Add `'pending_review'` to the `personalized_email_sends.status` enum (currently `'preview' | 'sent' | 'failed'`). Add `'rejected'` while we're at it for completeness. New Prisma migration with explicit `_prisma_migrations` table entry (same pattern as Phase 5's `20260531120000_phase05_personalized_email_send`).

**Backend route changes:**

| Route | Method | Purpose | Change scope |
|---|---|---|---|
| `/api/apollo/send-personalized-campaign` | POST | Existing Phase 5 send route | **Additive:** new optional body field `requireReview: boolean` (default false). When true: personalize + render + persist with `status='pending_review'`, SKIP Resend dispatch, return queueId list. Existing callers (NetSuiteCampaignWizard Step 4 live send) continue to work — they don't pass `requireReview`, so behavior is unchanged. **CRITICAL: signature is additive only — no breaking change.** |
| `/api/apollo/pending-review` | GET | List the current user's pending_review queue | **New.** Returns `[{ id, contactId, contactEmail, contactName, companyName, stream, subject, renderedBody, aiTokens, claudeCostUSD, createdAt }]` ordered by createdAt DESC. Optional `?stream=Cybersecurity` filter, optional `?page=N&pageSize=M` pagination. |
| `/api/apollo/pending-review/:id/approve` | POST | Dispatch via Resend, flip `status='sent'` | **New.** Re-fetches the row, sends via Resend with the persisted renderedBody (no fresh personalization), records resendMessageId, flips status. Returns `{ id, status, resendMessageId }`. |
| `/api/apollo/pending-review/:id/reject` | POST | Mark `status='rejected'` with optional reason | **New.** Body: `{ reason?: string }`. Flips status to rejected, never dispatches. |
| `/api/apollo/pending-review/:id/edit` | POST | Override aiTokens OR renderedBody, then keep status='pending_review' for re-review | **New.** Body: `{ aiTokens?: {...}, renderedBody?: string, subject?: string }`. Updates the row in place, status stays pending_review. Rajesh re-reviews and then approves. |

**Frontend route + UI changes:**

- New "Pending Review" tab on `CampaignsPage.tsx` (right after the existing campaign list).
- Tab content: list of inbox-card previews (subject + from + preview snippet + AI cost), one per pending_review row.
- Click row → expand to full inbox-style render of `renderedBody` (DOMPurify-sanitized per the existing Phase 5 pattern in `NetSuiteCampaignWizard.tsx:621`).
- Per-row actions: **Approve** (single click → POST /approve), **Reject** (modal: optional reason → POST /reject), **Edit** (opens token-edit modal where Rajesh can revise any of the 4 AI tokens, then POST /edit, then re-render preview).
- Bulk action above the list: **Approve all on this page** (sequential POST /approve calls with progress indicator).
- Empty state: "No pending emails. Click 'Apollo Campaign' above to generate the next batch."

### Thread 3 — Apollo Campaign entry-point button

**Decision:** New button labeled exactly **"Apollo Campaign"** placed in the `CampaignsPage.tsx` header at the top-right, **BEFORE** the existing "Create Campaign" button (line 246 today). Same visual style as "Create Campaign" but with a different lead icon (suggest `RocketLaunchIcon` from heroicons — already used in the Apollo sidebar nav).

**Click handler flow:**

1. POST `/api/apollo/unsent-contacts` (new GET endpoint, see below) → fetch all `Contact` rows with `source='apollo'` AND `id NOT IN (SELECT contactId FROM personalized_email_sends WHERE status='sent' AND userId=req.user.id)`.
2. If `count > 50`: show confirmation modal asking Rajesh to OK the larger batch (`confirmedLargeBatch:true`). If `count > 200`: show stronger warning, hard cap at 200 per click.
3. Call POST `/api/apollo/send-personalized-campaign` with `{ contactIds: [...], templateId: null /* auto-pick per stream */, suggestedStream: null /* per-contact */, requireReview: true, confirmedLargeBatch: count > 50 }`.
4. Show progress indicator while batch personalizes (each contact = ~$0.12 Claude+web_search, ~7-9 sec — for 50 contacts that's ~$6 and ~7 min).
5. On completion: auto-switch active tab to **"Pending Review"** so Rajesh starts working through the queue immediately.

**New supporting backend endpoint:**

| Route | Method | Purpose |
|---|---|---|
| `/api/apollo/unsent-contacts` | GET | Returns `[{ id, email, fullName, companyName, stream, suggestedStream }]` for the current user's unsent Apollo contacts. Optional `?stream=Cybersecurity` filter, `?limit=N` cap. |

**Template auto-pick logic:** When `templateId: null` and `suggestedStream: null` are passed to `/send-personalized-campaign`, the backend looks up `EmailTemplate.findFirst({ where: { userId, category: 'Stream:' + contact.stream } })` per contact. This is the same per-stream lookup that NetSuiteCampaignWizard already uses (`api.ts:244` first-match-by-category pattern). Falls back to `Stream: Other` if exact match missing.

## Firewalls that MUST hold

These come straight from Phase 4 and Phase 5 SUMMARYs and are non-negotiable for Phase 6:

1. **Phase 4 SES firewall:** `git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l == 0` at the END of Phase 6. Rajesh's SES BrandMonkz flow must remain byte-for-byte unchanged across the entire phase. This forbids any "while we're in there" cleanup of campaigns.ts.
2. **Phase 5 send-path signature compatibility:** `POST /api/apollo/send-personalized-campaign` gains a new OPTIONAL `requireReview` body field — all existing callers (NetSuiteCampaignWizard Step 4) continue to omit it and continue to dispatch via Resend immediately. The route's existing 5-fallback contract on `personalizeContactWithClaude` MUST be preserved (any helper changes are additive, never replace the fallback shape).
3. **Phase 4 UI firewall:** `NetSuiteCampaignWizard.tsx` should NOT be modified by Phase 6 unless absolutely necessary. The Pending Review tab is a NEW component on `CampaignsPage.tsx`; the existing wizard stays as the "send immediately" path on /apollo.
4. **DB compatibility:** The new `pending_review` and `rejected` enum values must be additive — existing rows with `status='preview'` / `'sent'` / `'failed'` continue to behave identically.

## Live verification target for Phase 6 close

REQ-066 (in ROADMAP): after deploy, re-send to JM + Rajesh from each of the 9 streams (one contact per stream — pick from existing prod Apollo contacts or seed test contacts if needed), confirm the chrome is coherent end-to-end for each, and have Rajesh approve at least 1 via the Pending Review queue UI. Estimated live-verify cost: ~$1.50 Claude (9 streams × ~$0.12 + buffer for re-tries) + $0 Resend.

## Prior session artifacts to consume

- `.planning/STATE.md` — full Phase 5 + quick-8 history
- `.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/8-PLAN.md` — what quick-8 built
- `.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/8-SUMMARY.md` — what shipped
- `.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/V3-PREVIEW.json` — sample v3 rendered body (NetSuite chrome + Cybersecurity content — the exact problem this phase fixes)
- `.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/sends/V3-SEND-JM.json` + `V3-SEND-RAJESH.json` — the 2 live sends that triggered the problem report
- `.planning/phases/05-ai-personalized-apollo-campaign/05-SUMMARY.md` — Phase 5 aggregate
- `backend/src/seeds/stream-templates.ts` — current STREAM_TEMPLATE_V3_BODY (the file the Thread 1 rewrite touches)
- `backend/src/routes/emailTemplates.ts` — current /upgrade-streams-v3 endpoint
- `backend/src/routes/apollo.ts` — current /send-personalized-campaign route (additive change for requireReview)
- `frontend/src/pages/Campaigns/CampaignsPage.tsx` — where the new button + Pending Review tab live
- `frontend/src/services/api.ts` — where the new apolloApi.unsentContacts / pendingReview methods get added

## What the planner should NOT do

- Do not modify `backend/src/routes/campaigns.ts` or `backend/src/services/awsSES.ts`. Phase 4 firewall.
- Do not touch `frontend/src/components/NetSuiteCampaignWizard.tsx`. The wizard stays as the immediate-send path on /apollo. The new flow on /campaigns is a parallel surface, not a wizard refactor.
- Do not delete the existing `STREAM_TEMPLATE_V2_BODY` or `upgradeStreamTemplatesToV2`. Keep them in place — they're working seeds even though v3 supersedes them at runtime.
- Do not introduce a separate v4 endpoint without strong justification. Prefer reusing `/upgrade-streams-v3` with stream-aware body lookup.
- Do not auto-send during live verification. Use the Pending Review queue to keep human-in-the-loop discipline — this is the whole point of Thread 2.

## 🛑 DEPLOY-TO-LIVE REQUIRES EXPLICIT USER APPROVAL (locked 2026-05-31 by user)

User directive: "once this task is completed — make sure without my approval [you do NOT] send this to live."

**Hard rule:** No automated deployment to production EC2 (`ec2-user@100.24.213.224`) during Phase 6 execution. This overrides any default GSD auto-advance behavior, any executor convenience, any "while we're already in the SSH session" shortcut.

**What this forbids without an explicit `→ Type "deploy" to proceed` user confirmation:**

- `scp` / `rsync` of backend dist to `/var/www/crm-backend/dist/`
- `scp` / `rsync` of frontend dist to `/var/www/brandmonkz/`
- `pm2 restart crm-backend` on the EC2 host
- `prisma migrate deploy` against the prod `DATABASE_URL`
- `POST /api/email-templates/upgrade-streams-v3` against `https://brandmonkz.com`
- Any live `POST /api/apollo/send-personalized-campaign` call (whether `requireReview:true` or false)
- Any GitHub Actions workflow trigger that ends with a prod deploy (`gh workflow run` for staging or prod)
- Any direct AWS CLI command against production-tier resources (ECS, S3 prod buckets, secrets in `production/` namespace)
- Mutating the prod DB via psql (read-only verification SELECTs are allowed)

**What this allows freely (no approval needed):**

- All local code changes (Wave 1 + Wave 2 + Wave 3 backend/frontend file edits)
- Local `npm run build`, `tsc --noEmit`, frontend Vite build
- Local commits + push to `origin/production` (push is git-side, not deploy-side — production EC2 only changes when something pulls the dist there)
- Reading prod state via psql SELECT, curl GETs against `https://brandmonkz.com/api/health`, `gh run list`, etc.
- Writing planning artifacts, SUMMARYs, evidence JSONs
- Running the planner / checker / executor agents locally

**How the deploy plan (06-06 or whatever its final number is) MUST be structured:**

1. `autonomous: false` in frontmatter — explicitly NOT autonomous.
2. The first task in the deploy plan reads `→ CHECKPOINT: Deploy Approval Required` and stops; user must explicitly reply with the literal word `deploy` (or operator equivalent) before any production-facing command runs.
3. The plan presents the user with a deploy preview BEFORE asking for approval: which files change in `/var/www/crm-backend/dist/`, which migration applies, which pm2 process restarts, what the expected diff is, what the rollback looks like. Approval is informed, not blind.
4. After approval, the deploy executes via the locked recipes from quick-8 / Phase 5 SUMMARYs (tarball + scp + rsync + pm2 env-reload-restart + prisma migrate deploy + psql verification).
5. Live verification (REQ-066, 9-stream send to JM + Rajesh with Rajesh approving 1) ALSO requires a separate approval gate — staging the queue is one approval, dispatching real emails to real inboxes is a second approval. Two checkpoints, not one.
6. If a smoke step fails, do NOT auto-rollback or auto-retry. Stop, report the failure, ask the user how to proceed.

**Why this rule exists:** Phase 5 + quick-8 shipped via continuous-deploy with verification baked into the plan. That worked for those phases because the surface area was narrow and the user was watching the session in real time. Phase 6 is larger (3 threads, 6 plans, real email dispatch to recipients) and the user has explicitly removed the implicit auto-deploy permission. Honor it.

**Honored at:** planner output (deploy plan frontmatter + first task), executor behavior (must respect the checkpoint), and any future SUMMARY claim of "deployed to production" — that claim is only valid if it cites the user's approval message verbatim alongside the deploy commits/runIds.

## Author identity (for all commits)

```
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit ...
```

## Deploy + ops gotchas the planner should account for (from quick-8 / Phase 5 SUMMARYs)

- pm2 env reload: `pm2 restart --update-env` does NOT auto-read .env. Recipe: `cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env`
- nginx bad_bot rule: default `curl` UA gets 403. All EC2-facing curls need `-H "User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0"`
- JWT claim: backend auth reads `payload.userId`, NOT `payload.sub`
- psql DATABASE_URL `?schema=public` query param: psql 14 rejects it. Strip with `sed -E 's/[?&]schema=[^&]+//g'` before passing
- EC2 .env quoted-value warnings (`Williams: command not found`) are non-fatal — ignore
- Backend deploy path: `/var/www/crm-backend/dist/` (via tarball+scp+rsync, see quick-8 SUMMARY § Deploy)
- Frontend deploy path: `/var/www/brandmonkz/` (rsync --delete for Vite lazy-chunk eviction)
- Live URL: `https://brandmonkz.com` (SPA + same-origin API at `/api/*`)
