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
- [ ] 02-01-PLAN.md — DB schema migration (Quote + Contract models) + backend CRUD routes
- [ ] 02-02-PLAN.md — DealDetail page + Documents tab shell + App.tsx route + frontend API services
- [ ] 02-03-PLAN.md — QuoteBuilder modal + ContractEditor modal + DocumentsTab fully wired

### Phase 3: CRM Migration Wizard
**Goal:** Allow users to migrate their existing data from Salesforce, HubSpot, NetSuite, Pipedrive, or any CRM via a guided step-by-step wizard — choose source CRM, download field-mapping template, upload CSV, map columns, preview, and import contacts/companies/deals in one flow.
**Requirements:** REQ-020, REQ-021, REQ-022
