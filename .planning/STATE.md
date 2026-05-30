# Project State

Last activity: 2026-05-30 - Plan 04-02 COMPLETE: typed Apollo.io TS client library (searchPeople + enrichPerson + isEmailLocked + sleep + ApolloAuthError) at backend/src/lib/apolloClient.ts

## Current Phase
Phase 04: Apollo Import + Auto-Campaign — IN PROGRESS (2/6 plans done)

## Current Position
- Phase: 04-apollo-import-and-auto-campaign — IN PROGRESS
- Plan: 02 (complete) — Apollo TS client lib, commits 2113f9e + 5c75d21
- Next: Plan 04-03 — Backend POST /api/apollo/import + send-campaign (Resend) + stream-template seed

## Decisions Made (Phase 04 additions — Plan 04-02)
- apolloClient.ts is library-pure: does NOT read process.env. Caller (route in 04-03) injects the key. Keeps the wrapper reusable from scripts and testable in isolation.
- Apollo auth errors (401/403) surface as a named `ApolloAuthError` class so the route in 04-03 can map → HTTP 503 "Apollo key invalid or expired" without trying to parse axios error shapes.
- `enrichPerson()` returns null on ANY failure (404, 401, network) rather than throwing — lets the import loop in 04-03 simply `continue` instead of wrapping every iteration in try/catch.
- ICP filter (q_organization_industry_tag_ids whitelist or exclude-industries) deferred to Phase 4.5 — documented as an inline TODO in apolloClient.ts so future planners can grep for it.
- APOLLO_API_KEY placeholder in .env.example is intentionally empty; live key lives on EC2 only per CLAUDE.md ops policy.

## Decisions Made
- Prisma migration applied via `db push` (non-interactive) instead of `migrate dev` (requires TTY); manual migration SQL file created for audit trail
- Decimal fields serialized with `Number()` helper in quotes route to prevent Prisma Decimal serialization issues
- Hard delete (not soft delete) used for quotes and contracts per plan spec
- Deal ownership validated before creating quote/contract
- New Quote button gated to CLOSED_WON stage in DocumentsTab shell; Wave 3 will wire the actual handlers
- ArrowTopRightOnSquareIcon used for view-detail button on DealBoard cards (confirmed in heroicons package)
- dealsApi.getById was already present in api.ts — no addition needed
- Plan 03: Modal state (showQuoteBuilder/showContractEditor) owned inside DocumentsTab, not passed as callbacks from DealDetail — reduces coupling
- Plan 03: resolveVariables stores resolved content at submit time; raw template (with placeholders) is not persisted separately
- Plan 03: window.prompt used for SIGNED contract signer name — keeps UI simple for an edge-case interaction
- Plan 03: Subtotal/total computed inline during render (not useState + useEffect) to avoid stale state

## Decisions Made (Phase 03 additions)
- DealStage enum cast used in bulk-import — STAGE_MAP string values map exactly to Prisma enum members
- Missing FK lookups result in null (deal still imports) — avoids blocking import on unresolvable contacts/companies
- router.use(authenticate) covers bulk-import route — no per-route middleware needed

## Blockers/Concerns
None

## Phase 04 Progress
| Plan | Name | Status | Commit |
|------|------|--------|--------|
| 01 | Prisma schema (Contact/Company stream + Apollo IDs) + classifyStream extraction | Complete | 911e1e2 |
| 02 | Apollo TS client lib (searchPeople + enrichPerson + typed errors) | Complete | 2113f9e, 5c75d21 |
| 03 | Backend POST /api/apollo/import + /api/apollo/send-campaign (Resend) | Pending | - |
| 04 | Dedicated /apollo page + ApolloSearchForm + sidebar nav | Pending | - |
| 05 | NetSuiteCampaignWizard component (Resend send + 3-layer template fallback) | Pending | - |
| 06 | Handoff wiring + deploy (rsync + pm2) + 1-contact smoke | Pending | - |

## Phase 03 Progress
| Plan | Name | Status | Commit |
|------|------|--------|--------|
| 01 | Backend POST /api/deals/bulk-import | Complete | e865340 |
| 02 | MigrationWizardModal full 5-step wizard | Complete | 300d81e |
| 03 | SettingsPage Data Import tab + MigrationWizardModal wired | Complete | 85760bf |

## Phase 02 Progress
| Plan | Name | Status | Commit |
|------|------|--------|--------|
| 01 | Quote + Contract data layer (Prisma + routes) | Complete | c70ad18 |
| 02 | DealDetail page + Documents tab shell + route wiring | Complete | 8776be9 |
| 03 | QuoteBuilder modal + ContractEditor modal + DocumentsTab fully wired | Complete | 683846e |

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 1 | Fix Indigo Noir dark theme: remap orange/rose CSS to indigo/purple, fix missing gray text classes, fix light badge backgrounds | 2026-03-17 | f3301d7 | Verified | [1-fix-indigo-noir-dark-theme-remap-orange-](.planning/quick/1-fix-indigo-noir-dark-theme-remap-orange-/) |
| 2 | Build Job Leads Pipeline: Remotive API fetch + 4-stream classification + /job-leads page + Company+Contact import | 2026-03-26 | 9a23c86, d32ec65 | Deployed | [2-build-job-leads-pipeline-for-brandmonkz-](.planning/quick/2-build-job-leads-pipeline-for-brandmonkz-/) |
| 3 | Enhance Job Leads: domain emails (hr@), hero CTA + pulse animation, dismissible guide panel, email pill column, email on Contact import | 2026-03-26 | 10a7f0a, 667df4f, fda181e | Deployed | [3-enhance-job-leads-page-real-company-emai](.planning/quick/3-enhance-job-leads-page-real-company-emai/) |
