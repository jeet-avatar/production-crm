# Project State

Last activity: 2026-05-30 - Plan 04-04 COMPLETE: dedicated /apollo page + ApolloSearchForm + apolloApi client + sidebar nav (ContactList.tsx UNTOUCHED)

## Current Phase
Phase 04: Apollo Import + Auto-Campaign — IN PROGRESS (4/6 plans done)

## Current Position
- Phase: 04-apollo-import-and-auto-campaign — IN PROGRESS
- Plan: 04 (complete) — Frontend /apollo route, commits 66a4737 + b005169
- Next: Plan 04-05 — NetSuiteCampaignWizard component (Resend send + 3-layer template fallback)

## Decisions Made (Phase 04 additions — Plan 04-01)
- Manual audit SQL uses lowercase @@map() table names ("contacts", "companies") instead of plan-example PascalCase — production DB uses lowercase per every prior migration.sql; PascalCase ALTER would fail
- STREAMS[] in lib exports only the 9 canonical Phase 4 streams; classifyStream() can still return broader legacy labels (Full-Stack/Web3/Product-Design/QA-Testing) — those fall through to template-fallback in Apollo wizard
- classifyStream() function body copied byte-for-byte (regex order preserved) into streamClassifier.ts — zero behavior drift between Job Leads and upcoming Apollo route
- prisma db push intentionally deferred to plan 04-06 — executor env has no DATABASE_URL per execution_context env_state
- Audit .sql file force-added (git add -f) — backend/.gitignore line 49 ignores prisma/migrations/**/*.sql; prior migration.sql files at 20251003210116_crmstartup/migration.sql were committed the same way

## Decisions Made (Phase 04 additions — Plan 04-02)
- apolloClient.ts is library-pure: does NOT read process.env. Caller (route in 04-03) injects the key. Keeps the wrapper reusable from scripts and testable in isolation.
- Apollo auth errors (401/403) surface as a named `ApolloAuthError` class so the route in 04-03 can map → HTTP 503 "Apollo key invalid or expired" without trying to parse axios error shapes.
- `enrichPerson()` returns null on ANY failure (404, 401, network) rather than throwing — lets the import loop in 04-03 simply `continue` instead of wrapping every iteration in try/catch.
- ICP filter (q_organization_industry_tag_ids whitelist or exclude-industries) deferred to Phase 4.5 — documented as an inline TODO in apolloClient.ts so future planners can grep for it.
- APOLLO_API_KEY placeholder in .env.example is intentionally empty; live key lives on EC2 only per CLAUDE.md ops policy.

## Decisions Made (Phase 04 additions — Plan 04-04)
- `apiClient.baseURL` already ends in `/api` (`api.ts:3`), so `apolloApi.import` posts to bare `/apollo/import`. Matches every other `*Api` client in the file. Including `/api` in the resource path would have double-prefixed.
- "Start campaign with these contacts →" button renders DISABLED with tooltip "Wizard handoff lands in plan 04-05". Lets `/apollo` ship in a usable state for isolated verification without coupling to wizard code that does not yet exist. Plan 04-05 just removes `disabled`/`title` and adds an `onClick` that mounts `NetSuiteCampaignWizard` with `result.contactIds` + `result.suggestedStream`.
- "See imported contacts" deep-links to `/contacts?source=apollo` to lean on the existing ContactList source filter — zero ContactList code change required (user-locked).
- Sidebar nav uses `RocketLaunchIcon` (existing heroicons dep) placed immediately after "Job Leads" because both are lead-generation sources. Active-state styling inherits the existing indigo-glow treatment for free.
- ApolloSearchForm prefills sensible CFO/Finance ICP defaults (CFO, Controller, VP Finance / United States / 100-500 emp / perPage=25). One-click search works without typing.
- `perPage` is clamped to max 25 in `handleSubmit` to enforce Apollo's per-call limit at the frontend layer (defense in depth — backend also enforces).
- Consultancy warning banner verbatim from RAJESH-HANDBOOK Section 6 / Pitfall 4 — rendered above the keyword input, not the title input (matches the actual hallucination risk surface).
- ICP industry-include / tech_uids filter UI deliberately NOT added (same Phase 4.5 deferral as plans 04-02, 04-03).
- ContactList.tsx fully untouched — `git diff frontend/src/pages/Contacts/ContactList.tsx | wc -l == 0`. Dead-code `ApolloImportModal` reference count unchanged at 2.
- Page-level error handling categorizes by HTTP status: 503 → yellow warning + operator hint, 401/403 → auth-red message, other → generic red. Pattern is reusable for other backend-key-dependent features.
- `result.contactIds` and `result.suggestedStream` are kept in component state but the IDs are NOT rendered in DOM — only the count via `result.imported`. Wizard handoff in 04-05 reads them directly from state.

## Decisions Made (Phase 04 additions — Plan 04-03)
- Resend SDK direct (not SES) for Phase 4 send path — campaigns.ts SES path stays byte-for-byte unchanged (Rajesh's BrandMonkz flow untouched). Verified via `git diff backend/src/routes/campaigns.ts | wc -l == 0`.
- From-address hardcoded to `Sara <sara@techcloudpro.com>` in apollo.ts module-level const — per-stream / configurable from-address deferred to Phase 4.5 per the locked Phase 4 scope.
- RESEND_API_KEY missing → `process.exit(1)` at module load — backend MUST NOT boot without a working send path. Pattern mirrors main_new.py JWT_SECRET RuntimeError guard.
- VALID_STREAMS allowlist Set inlined into apollo.ts validates suggestedStream body param — duplicates the canonical 9 streams from lib/streamClassifier.ts (acceptable duplication; both are small).
- Variable substitution mirrors campaigns.ts:546-559 byte-for-byte (regex `\{\{key\}\}` per known var) — kept identical so Rajesh sees the same {{firstName}}/{{companyName}} behavior in both flows.
- Per-contact try/catch with 100ms sleep — aggregated `{ sent, failed, failureDetails }` response. Never fail-fast, never bulk-throw. Resend free tier is ~2/sec, so 100ms is the natural pacing.
- Stream-template seeder uses Prisma `createMany({ skipDuplicates: true })` on unique `(userId, name)` — idempotent by construction; second call returns `skipped:9 created:0`.
- category filter on GET /api/email-templates extends the existing list endpoint via WHERE clause (no new GET route) — wizard in 04-05 calls `GET /api/email-templates?category=Stream:<x>` and consumes the first row.
- @aws-sdk/client-ses import explicitly forbidden in apollo.ts — verified zero via `grep -c "@aws-sdk/client-ses" apollo.ts == 0`. This is the firewall keeping Resend and SES code paths separate.
- Boot-time fail-fast smoke deferred to plan 04-06 deploy — executor env has no DATABASE_URL so `npm run dev` cannot reach the Resend guard locally (Prisma crashes first). The static guard code is deterministic.

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
| 01 | Prisma schema (Contact/Company stream + Apollo IDs) + classifyStream extraction | Complete | 911e1e2, 79290fe |
| 02 | Apollo TS client lib (searchPeople + enrichPerson + typed errors) | Complete | 2113f9e, 5c75d21 |
| 03 | Backend POST /api/apollo/import + /api/apollo/send-campaign (Resend) | Complete | 764ce91, 9437281, 243354b |
| 04 | Dedicated /apollo page + ApolloSearchForm + sidebar nav | Complete | 66a4737, b005169 |
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
