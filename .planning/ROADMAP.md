# BrandMonkz CRM Roadmap

## Milestone 1: Indigo Noir Dark Theme

### Phase 1: Dark Theme Fixes
**Goal:** Fix all remaining orange/rose colors and unreadable text in the Indigo Noir dark theme.
**Requirements:** REQ-001, REQ-002, REQ-003

## Milestone 2: Revenue & Growth Features

### Phase 2: Quote & Contract Lifecycle Management
**Goal:** Enable a full quote-to-signed-contract workflow triggered when a deal reaches Closed Won — including quote builder with line items, quote status tracking, contract editor with variable injection, and a Documents tab on the deal detail page.
**Requirements:** REQ-010, REQ-011, REQ-012, REQ-013
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — DB schema migration (Quote + Contract models) + backend CRUD routes (Complete: c70ad18)
- [x] 02-02-PLAN.md — DealDetail page + Documents tab shell + App.tsx route + frontend API services (Complete: 8776be9)
- [x] 02-03-PLAN.md — QuoteBuilder modal + ContractEditor modal + DocumentsTab fully wired (Complete: 683846e)

### Phase 3: CRM Migration Wizard
**Goal:** Allow users to migrate their existing data from Salesforce, HubSpot, NetSuite, Pipedrive, or any CRM via a guided step-by-step wizard — choose source CRM, download field-mapping template, upload CSV, map columns, preview, and import contacts/companies/deals in one flow.
**Requirements:** REQ-020, REQ-021, REQ-022
**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md — Backend POST /api/deals/bulk-import with stage normalization + FK resolution (Complete: e865340)
- [x] 03-02-PLAN.md — MigrationWizardModal full 5-step wizard: CRM source, entity type, template download, CSV upload, column mapping, import results (Complete: 300d81e)
- [x] 03-03-PLAN.md — SettingsPage Data Import tab + MigrationWizardModal wired (Complete: 85760bf)

### Phase 03.1: Repo + Schema Reconciliation (INSERTED) — COMPLETE 2026-05-30

**Goal:** Reconcile local clone with EC2 prod state — backfill 17 historical migration directories from EC2 filesystem into local git, generate a single new Prisma migration for Phase 4's 6 stream/Apollo columns + indexes via `prisma migrate diff`, and fast-forward push 29 commits to origin/production. Phase 02 (Quote/Contract/ContractOTP) was verified already deployed on origin/production AND prod DB — no preservation work needed (REQ-031D no-op).
**Depends on:** Phase 3
**Requirements:** REQ-031A, REQ-031B, REQ-031C, REQ-031D, REQ-031E, REQ-031F
**Plans:** 4 plans

Plans:
- [x] 03.1-01-PLAN.md — Backup branch + work branch + baseline verification (REQ-031A precondition + REQ-031D no-op confirmation) (Complete: 656afa0)
- [x] 03.1-02-PLAN.md — Backfill 17 EC2-only migration directories via tarball+scp (REQ-031B) (Complete: 24a5c66)
- [x] 03.1-03-PLAN.md — Generate Phase 4 migration via `prisma migrate diff` + REQ-031F gates (REQ-031C, REQ-031F) (Complete: a5872fd)
- [x] 03.1-04-PLAN.md — Fast-forward push to origin/production + ROADMAP/STATE update (REQ-031A, REQ-031D, REQ-031E, REQ-031F) (Complete: 0745cc0 push + a12ff42 doc)

### Phase 4: Apollo Import + Auto-Campaign
**Goal:** Rajesh navigates to a dedicated /apollo page → picks keyword/title/company filter → backend pulls + enriches contacts via Apollo `/v1/mixed_people/api_search` + `/v1/people/match` → contacts saved to existing Contact table with source="apollo" and stream classification (NetSuite | AI/ML | Cloud/DevOps | Cybersecurity | Data/Analytics | Mobile | Enterprise/ERP | Staffing/HR | Other) → on import success a 4-step NetSuiteCampaignWizard launches pre-filled with imported contact IDs and a pre-seeded per-stream EmailTemplate → wizard sends via new /api/apollo/send-campaign Resend endpoint (from Sara <sara@techcloudpro.com>, techcloudpro.com domain verified in Resend). Proves the full UI → backend → Apollo → DB → wizard → send chain end-to-end with one real contact before any bulk run. Existing campaigns.ts SES path (Rajesh's BrandMonkz flow) is NOT modified. ICP filter (exclude-industries) and per-stream from-address configurability deferred to Phase 4.5.
**Requirements:** REQ-040, REQ-041, REQ-042, REQ-043, REQ-044
**Plans:** 6 plans

Plans:
- [x] 04-01-PLAN.md — Prisma schema (Contact/Company stream + Apollo IDs) + classifyStream extraction to lib (Complete: 911e1e2, 79290fe)
- [x] 04-02-PLAN.md — Apollo TS client lib (searchPeople + enrichPerson + typed errors) (Complete: 2113f9e, 5c75d21)
- [x] 04-03-PLAN.md — Backend POST /api/apollo/import + POST /api/apollo/send-campaign (Resend) + stream-template seed endpoint (Complete: 764ce91, 9437281, 243354b)
- [x] 04-04-PLAN.md — NEW dedicated /apollo page + ApolloSearchForm + sidebar nav (ContactList untouched) (Complete: 66a4737, b005169)
- [x] 04-05-PLAN.md — NetSuiteCampaignWizard component (sends via /api/apollo/send-campaign Resend backend + 3-layer template fallback) (Complete: 9371f7c, 2f14467)
- [x] 04-06-PLAN.md — Handoff wiring + deploy (rsync to /var/www/crm-backend/dist + pm2) + 9 stream templates seeded + Resend send-campaign smoke 200 `{sent:1,failed:0}` from Sara <sara@techcloudpro.com>. htmlBody→htmlContent production-blocking field-name fix landed in a72fa4b. Apollo IMPORT 503 verified as upstream-credential-gate (both EC2 keys 401 from app.apollo.io) — deferred to Phase 4.5 reopen-trigger. (Complete 2026-05-30: f7e6482, de87ba1, f44e38a, a72fa4b)

**Phase 4 COMPLETE 2026-05-30** — 6/6 plans done; Resend send-half verified end-to-end live on production; Apollo IMPORT awaits external key refresh per deferred-items.md item #1.

### Phase 5: AI-Personalized Campaign for Apollo Contacts (Intent-Based, Block-Template)
**Goal:** Take Apollo-imported contacts in prod DB → for each: (1) Claude API with web_search researches the company (recent news, tech stack, pain points relevant to the contact's stream classification), (2) Claude generates 3-4 per-contact personalized tokens (intentHook, companyContext, painPoint, CTA), (3) the pre-seeded stream EmailTemplate is rendered with those AI tokens substituted in (alongside {{firstName}}/{{companyName}}/{{title}}), (4) email sent via existing Resend `/api/apollo/send-campaign` path FROM `Sara <sara@techcloudpro.com>`, (5) each rendered body persisted to Campaign / email_logs for audit. Modeled after TCP v6 video pipeline INTENT-BASED pattern but using CRM EmailTemplate "block templates" instead of video. NetSuiteCampaignWizard gets a new "AI Personalize" step between template-pick and send. NOT video (deferred indefinitely — TCP-only infra in /opt/). NO new from-address (Sara stays per Phase 4 locked decision).
**Requirements:** REQ-050, REQ-051, REQ-052, REQ-053, REQ-054
**Plans:** 4 plans

Plans:
- [x] 05-01-PLAN.md — Prisma migration (personalized_email_sends table) + 9 stream templates upgraded to v2 with AI placeholders + idempotent upgrade endpoint (Complete 2026-05-31: b19feec, 820fd4a)
- [x] 05-02-PLAN.md — Backend personalizeContactWithClaude helper (web_search_20250305, 5-fallback contract) + POST /api/apollo/send-personalized-campaign route + frontend apolloApi.sendPersonalizedCampaign client (Complete 2026-05-31: 908e631, 35bbc58)
- [x] 05-03-PLAN.md — NetSuiteCampaignWizard 4→5 step refactor with new AI Personalize preview gate (Step 3) + Review (Step 4 with live send) + Done (Step 5 with cost telemetry) (Complete 2026-05-31: 8344905, 46151a4)
- [x] 05-04-PLAN.md — Deploy backend + frontend to EC2 + apply Prisma migration + upgrade 9 stream templates to v2 + 4-case smoke against Ricardo Deben (cmpsz0d3q000350mxrlau3sg5 / Centella Health Tech / Cybersecurity stream) + close ceremony. Anthropic pre-flight green; migration verified via `_prisma_migrations.finished_at`; template upgrade verified via psql `htmlContent LIKE '%{{intentHook}}%'`. Case A tight acceptance PASSED (personalized=1, intentHook non-null, no raw placeholder). Cases B + C delivered 2 emails to jm@techcloudpro.com from Sara (Resend msgIds e95edd09-2029-4101-846f-a8c36c01954a + 1ab6897c-ddad-44a8-88d8-99494a46d8d5). Case D hard gate $0 spend. Total ~$0.374 Claude+web_search. Phase 4 firewall: 0-line diff vs `phase-04-baseline` tag. (Complete 2026-05-31: 9 commits b19feec..2e1f402 + close commit)

**Phase 5 COMPLETE 2026-05-31** — 4/4 plans done; AI-personalized Apollo campaign verified end-to-end live on production EC2; 2 emails delivered to jm@techcloudpro.com from Sara <sara@techcloudpro.com> with genuinely personalized content about Centella Health Tech (Med-Lab rebrand + Southeast healthtech expansion + HIPAA + connected-device security signals); ~$0.374 total live-verification spend; Phase 4 SES firewall preserved byte-for-byte; deferred immediate-next-work-item: branded TCP v6 template integration (wrap 4 AI tokens in v6 HTML shell, Sara already correct sender).
