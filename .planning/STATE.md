# Project State

Last activity: 2026-05-30 - Phase 03.1 Plan 02 COMPLETE — 17 EC2-only migration directories backfilled into local `backend/prisma/migrations/` via tarball+scp recipe (byte-for-byte preserved, 5/5 spot-check sizes match RESEARCH §1.2). Single atomic commit 24a5c66 on `sync/03.1-reconcile-with-ec2`. Total dir count now 29 (matches EC2 filesystem exactly). REQ-031B closed.

## Current Phase
Phase 03.1: Repo + Schema Reconciliation — IN PROGRESS (2/4 plans done; baseline + branches + migration tree backfill complete)

## Current Position
- Phase: 03.1-repo-schema-reconciliation — IN PROGRESS
- Plan: 02 COMPLETE (commit 24a5c66); next is 03.1-03 (Phase 4 migration generation via `prisma migrate diff`)
- Active branch: `sync/03.1-reconcile-with-ec2` (work branch for Waves 2-3)
- Rollback target: `backup/pre-3.1-production-state` (local + origin)
- Next: Plan 03.1-03 — generate `20260530_phase04_stream_apollo_columns/migration.sql` via `prisma migrate diff` (use `npx -y prisma@5.4.2 ...` workaround pattern from Plan 02 — local node_modules not installed; Prisma 7.x default rejects schema syntax)

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

## Decisions Made (Phase 04 additions — Plan 04-05)
- NetSuiteCampaignWizard send button POSTs `/api/apollo/send-campaign` (Resend), NOT `/api/campaigns/:id/send` (SES). USER-LOCKED 2026-05-30 firewall. Verified via `grep -c "campaignsApi\.send\|campaignsApi\.create\|campaignsApi\.addCompany" wizard.tsx == 0`.
- Wizard does NOT create a Campaign DB row in Phase 4 MVP — send tracking lives only in the Resend dispatcher response `{ sent, failed, failureDetails }`. Phase 4.5 or beyond may add a `Campaign` row if Rajesh requests historical reporting.
- 3-layer template fallback: `Stream:<suggestedStream>` → `Stream:Other` → `HARDCODED_FALLBACK` const. Layer 3 yields `templateId = null`, which Step 3 send button intercepts with a friendly "go seed templates first" error rather than letting the backend 404. Keeps the UX clean while preserving the backend invariant that `/api/apollo/send-campaign` requires a real persisted template.
- From-address in Step 3 preview hardcoded to literal `'Sara <sara@techcloudpro.com>'` (line 52, `APOLLO_FROM_DISPLAY`). Matches backend `apollo.ts:53 APOLLO_FROM_EMAIL`. Both stay in sync — Phase 4.5 will make per-stream / configurable in one swap.
- `campaignsApi.aiGenerateContent` IS imported and used in the wizard (Step 2 "Let AI write it for me ✨" button). That endpoint is content-generation only, NOT a send call — the firewall is on send paths, not on AI-content. Verified by counting only the send-related strings in the negative grep.
- `contactsApi.getByIds` extends the existing `GET /api/contacts` handler with a `?ids=cuid1,cuid2,...` filter (4-line WHERE addition) instead of a new endpoint — preserves auth, tenant scoping, pagination. Acceptable per the verify block's "if file is named contact.routes.ts, edit that one" guidance (production-crm uses `contacts.ts`).
- Body preview in Step 3 runs through `DOMPurify.sanitize` (mirrors `FollowUpWizard.tsx:621` pattern) — defense in depth against hostile HTML in templates or AI output.
- Doc comment containing literal `"campaignsApi.create/addCompany/send"` strings was rewritten before commit because it broke the negative grep firewall (returned 1 instead of 0). Reworded to convey the same intent without the literal anti-pattern strings.

## Decisions Made (Phase 03.1 additions — Plan 03.1-01)
- Backup branch `backup/pre-3.1-production-state` forked from `production` POST-log-commit (SHA 656afa0), not pre-log (0139337) — rollback restores log artifact AND original 23 Phase 4 commits in one shot
- Backup pushed to origin (`origin/backup/pre-3.1-production-state`) — survives any local-only disaster
- Work branch `sync/03.1-reconcile-with-ec2` forked from same SHA — Waves 2-3 start aligned with backup
- Baseline verification log force-added past .gitignore (precedent: Phase 04-01 audit SQL was also force-added)
- REQ-031D verified as a no-op: `git show origin/production:backend/prisma/schema.prisma | grep -c '^model (Quote|Contract|ContractOTP)'` returned 3 — Phase 02 models already on origin/production AND in EC2 prod DB; no preservation work needed
- Remote name correction: production-crm repo pushes to `github.com/jeet-avatar/production-crm`, NOT `github.com/jeet-avatar/crm-email-marketing-platform` (the latter is the BrandMonkz repo per MEMORY)
- No commit on work branch yet — Task 2's deliverable is the branch refs themselves; plan was designed as git-refs-only

## Decisions Made (Phase 03.1 additions — Plan 03.1-02)
- Tarball+scp recipe (RESEARCH §5.1) chosen over per-dir scp — single network round-trip, binary stream preservation guaranteed by tar, no SSH line-ending translation risk; critical for Prisma checksum validation
- Single atomic commit for all 17 backfilled files (per RESEARCH Open Question 3) — backfill is one logical operation, not 17 independent changes
- Tarballs cleaned on both ends as final Task 1 step BEFORE Task 2 commit — verified via `ls /tmp/phase31-migrations.tar.gz` returning "No such file" on both local and EC2
- Force-add 17 migration.sql files via `git add -f` per established Phase 04-01 + Phase 03.1-01 precedent (`backend/.gitignore` line 49 blocks `prisma/migrations/**/*.sql`)
- EC2 `/var/www/crm-backend/` left untouched — only `/tmp/` written then cleaned; post-task `git status` on EC2 matches RESEARCH §1.5 baseline exactly (only pre-existing stray backend/schema.prisma + 3 .env.bak files)
- Prisma 5.4.2 fallback validate pattern: `DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx -y prisma@5.4.2 validate` — works around missing local node_modules + Prisma 7.x's breaking schema-syntax change (Plan 03.1-03 will use the same pattern)
- Pre-existing condition documented: `npx prisma validate` (without version pin) fails with Prisma 7.8.0 P1012 error regardless of backfill state — confirmed by stashing Task 1 output and re-running validate; the failure is environmental, not behavioral
- Byte-for-byte preservation verified: 5/5 spot-check sizes match RESEARCH §1.2 expected values exactly (194 / 93 / 7898 / 1414 / 316)

## Decisions Made (Phase 04 additions — Plan 04-06 PARTIAL)
- Plan 04-06 is intentionally PARTIAL. Only Task 1 (handoff wiring on ApolloPage) executed — commit `f7e6482`. Tasks 2 (deploy: rsync + pm2 + prisma migrate deploy), 3 (seed stream templates), 4 (1-real-contact Resend smoke) are PAUSED by explicit user instruction pending EC2 access + RESEND_API_KEY on EC2 + DATABASE_URL availability. Do NOT mark Plan 06 complete and do NOT write 04-06-SUMMARY.md until those tasks finish.
- Task 1 implementation: imported `NetSuiteCampaignWizard` named export, added `showWizard` state, replaced disabled placeholder button (with "Wizard handoff lands in plan 04-05" tooltip) with an enabled gradient button gated on `result?.contactIds.length > 0`, mounted wizard at top of result section with `importedContactIds=result.contactIds` + `suggestedStream=result.suggestedStream` + no-op `onSuccess` that keeps result panel visible. `tsc --noEmit` clean.
- `ContactList.tsx` remains untouched per Plan 04-04/04-05 locked decision — verified `git diff frontend/src/pages/Contacts/ContactList.tsx | wc -l == 0` post-commit.

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

## Accumulated Context

### Roadmap Evolution
- Phase 03.1 inserted after Phase 03: Repo + Schema Reconciliation (URGENT) — blocks Phase 04 Wave 4 (deploy + smoke). Local schema.prisma is 32 models / 1399 lines; prod is 50 models / 2184 lines. 18 prod-only models (ApiKey, AuditLog, UserSession, MediaAccess, PartnerProgram, EmailUnsubscribe, etc.) would be silently dropped by current Phase 04 deploy plan. 3 local-only models (Quote, Contract, ContractOTP from Phase 02). 14 migrations in prod _prisma_migrations table not in local backend/prisma/migrations/. Local clone is 23 commits ahead of origin/production.

## Blockers/Concerns
- Phase 04 Wave 4 (Plan 04-06 Tasks 2-4: deploy + seed + smoke) BLOCKED on Phase 03.1 reconciliation. Code Waves 1-3 of Phase 04 stay locally; reconciled deploy resumes after 03.1 verified.
- Phase 02 (Quote/Contract/ContractOTP) — RESOLVED. Verified via Plan 03.1-01 Verification 5: already deployed on origin/production AND in EC2 prod DB (`_prisma_migrations` row `20260319000000_add_quotes_contracts` applied). No preservation work needed (REQ-031D no-op).

## Phase 03.1 Progress
| Plan | Name | Status | Commit |
|------|------|--------|--------|
| 01 | Backup branch + work branch + baseline verification (REQ-031A precondition + REQ-031D no-op confirmation) | Complete | 656afa0 |
| 02 | Backfill 17 EC2-only migration directories via tarball+scp (REQ-031B) | Complete | 24a5c66 |
| 03 | Generate Phase 4 migration via `prisma migrate diff` + REQ-031F gates (REQ-031C, REQ-031F) | Pending | - |
| 04 | Fast-forward push to origin/production + ROADMAP/STATE update (REQ-031A, REQ-031D, REQ-031E, REQ-031F) | Pending | - |

## Phase 04 Progress
| Plan | Name | Status | Commit |
|------|------|--------|--------|
| 01 | Prisma schema (Contact/Company stream + Apollo IDs) + classifyStream extraction | Complete | 911e1e2, 79290fe |
| 02 | Apollo TS client lib (searchPeople + enrichPerson + typed errors) | Complete | 2113f9e, 5c75d21 |
| 03 | Backend POST /api/apollo/import + /api/apollo/send-campaign (Resend) | Complete | 764ce91, 9437281, 243354b |
| 04 | Dedicated /apollo page + ApolloSearchForm + sidebar nav | Complete | 66a4737, b005169 |
| 05 | NetSuiteCampaignWizard component (Resend send + 3-layer template fallback) | Complete | 9371f7c, 2f14467 |
| 06 | Handoff wiring + deploy (rsync + pm2) + 1-contact smoke | Partial (Task 1/4 done; 2-4 paused on EC2 + DATABASE_URL) | f7e6482 |

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
