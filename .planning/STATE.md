# Project State

Last activity: 2026-03-19 - Phase 03 COMPLETE: CRM Migration Wizard — backend bulk-import + 5-step wizard modal + SettingsPage Data Import tab

## Current Phase
Phase 03: CRM Migration Wizard — COMPLETE

## Current Position
- Phase: 03-crm-migration-wizard — COMPLETE (all 3 plans done)
- Plan: 03 (complete) — SettingsPage Data Import tab + MigrationWizardModal wired, commit 85760bf
- Next: Phase 04 (TBD)

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
