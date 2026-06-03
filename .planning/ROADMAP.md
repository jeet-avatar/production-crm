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

### Phase 4: Apollo Campaign Port + Schedule-Picker Restore (Stage D — full port)
**Goal:** Bring the Apollo Campaign capability (built on the parallel `production` branch over Phases 4/5/quick-5..7/Phase 6) into the operational `seconf` branch so it ships on brandmonkz.com — without re-introducing the rolled-back Phase 6 UI (no tab toggles, no orange accents). ALSO restore the lost Send-Now/5-min/10-min schedule picker on the campaign wizard so Rajesh's original NetSuite Send Campaign workflow works again.
**Requirements:** REQ-030 (Apollo prospect import + send-campaign), REQ-031 (AI personalization with Claude+web_search), REQ-032 (per-stream coherent email bodies), REQ-033 (visual sign-off before deploy), REQ-034 (3-option schedule picker on wizard for both NetSuite + Apollo modes)
**Plans:** 8 plans (04-01..04-07 + 04-08 schedule picker)

Scope (Stage D — full port + schedule restore):
- Phase-4-equivalent: `/apollo` page, Apollo import + send-campaign routes, classifyStream helper, stream templates seeded
- quick-5/6/7-equivalent: `?source=apollo` contact filter, 120s axios timeout + Company P2002 ladder, Claude normalize-filters
- Phase-5-equivalent: AI personalization with Claude+web_search, PersonalizedEmailSend model, 4→5 step wizard with AI Preview gate
- Phase-6-content-only: 9 `STREAM_TEMPLATE_V3_BODIES` per-stream copy variants (NO Pending Review tab, NO orange Apollo Campaign button — explicitly excluded)
- Schedule picker (NEW from user 2026-06-02): Send Now / Send in 5 min / Send in 10 min on wizard final step in BOTH NetSuite + Apollo modes; backend scheduledDispatcher service polls every 30s + boot catch-up
- UI placement: ONE new indigo "Apollo Campaign" button on `/campaigns` header, no view-switching, opens existing wizard pre-loaded with Apollo contacts
- Sara/Resend hard constraint: hardcoded `Sara <sara@techcloudpro.com>` sender in all dispatch paths (apollo.ts + scheduledDispatcher.ts) — see [[feedback_brandmonkz_sara_resend_shared_dont_break]]
- Mandatory visual sign-off checkpoint BEFORE deploy approval (per [[feedback_brandmonkz_ui_signoff_before_deploy]])
- Mandatory live-verify (single Sara test send through new code path) BEFORE bulk dispatch

Constraints:
- DB columns already present in prod (`apolloPersonId`, `apolloOrgId`, `apolloRawData`, `stream`, `domain`) — no `prisma migrate deploy` needed
- Working tree: `/Users/jeet/Documents/production-crm-backup` on `seconf` (NOT `/Users/jeet/production-crm/`)
- Cherry-pick strategy: manual file copy preferred over `git cherry-pick` (CampaignsPage.tsx + schema.prisma have diverged between branches)
- All commits: `jm@techcloudpro.com` / `jeet-avatar`
