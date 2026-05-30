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

### Phase 4: Apollo Import + Auto-Campaign
**Goal:** Rajesh navigates to a dedicated /apollo page → picks keyword/title/company filter → backend pulls + enriches contacts via Apollo `/v1/mixed_people/api_search` + `/v1/people/match` → contacts saved to existing Contact table with source="apollo" and stream classification (NetSuite | AI/ML | Cloud/DevOps | Cybersecurity | Data/Analytics | Mobile | Enterprise/ERP | Staffing/HR | Other) → on import success a 4-step NetSuiteCampaignWizard launches pre-filled with imported contact IDs and a pre-seeded per-stream EmailTemplate → wizard sends via new /api/apollo/send-campaign Resend endpoint (from Sara <sara@techcloudpro.com>, techcloudpro.com domain verified in Resend). Proves the full UI → backend → Apollo → DB → wizard → send chain end-to-end with one real contact before any bulk run. Existing campaigns.ts SES path (Rajesh's BrandMonkz flow) is NOT modified. ICP filter (exclude-industries) and per-stream from-address configurability deferred to Phase 4.5.
**Requirements:** REQ-040, REQ-041, REQ-042, REQ-043, REQ-044
**Plans:** 6 plans

Plans:
- [ ] 04-01-PLAN.md — Prisma schema (Contact/Company stream + Apollo IDs) + classifyStream extraction to lib
- [ ] 04-02-PLAN.md — Apollo TS client lib (searchPeople + enrichPerson + typed errors)
- [ ] 04-03-PLAN.md — Backend POST /api/apollo/import + POST /api/apollo/send-campaign (Resend) + stream-template seed endpoint
- [ ] 04-04-PLAN.md — NEW dedicated /apollo page + ApolloSearchForm + sidebar nav (ContactList untouched)
- [ ] 04-05-PLAN.md — NetSuiteCampaignWizard component (sends via /api/apollo/send-campaign Resend backend + 3-layer template fallback)
- [ ] 04-06-PLAN.md — Handoff wiring + deploy (rsync to /var/www/crm-backend/dist + pm2) + 1-contact smoke (verifies Resend send from Sara)
