---
phase: 05-ai-personalized-apollo-campaign
plan: 01
subsystem: database
tags: [prisma, postgres, email-templates, anthropic, resend, ai-personalization]

# Dependency graph
requires:
  - phase: 04-apollo-import-and-auto-campaign
    provides: "9 seeded Stream:* email_templates rows + Phase 4 Resend send route + Contact stream classification"
provides:
  - "Isolated audit table personalized_email_sends (new model, new migration) for Phase 5 AI-personalized sends"
  - "STREAM_TEMPLATE_V2_BODY shape with 4 AI placeholders ({{intentHook}}, {{companyContext}}, {{painPoint}}, {{cta}}) ready for in-place template upgrade"
  - "Per-stream generic fallback tokens (9 streams + GENERIC_FALLBACK) so Claude null tokens never render empty <p></p> blocks"
  - "Idempotent upgradeStreamTemplatesToV2() function + POST /api/email-templates/upgrade-streams-v2 endpoint"
affects: [05-02, 05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Isolated audit table pattern (NEW model + FKs) — avoids polluting email_logs with NOT NULL campaignId requirement"
    - "Idempotent in-place template upgrade via sentinel-substring detection ({{intentHook}} presence guards against re-run)"
    - "Per-token stream-keyed fallback dictionary — defends never-empty-body invariant when AI returns null"

key-files:
  created:
    - "backend/prisma/migrations/20260531120000_phase05_personalized_email_send/migration.sql"
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-01-SUMMARY.md"
  modified:
    - "backend/prisma/schema.prisma (PersonalizedEmailSend model + 3 inverse relations)"
    - "backend/src/seeds/stream-templates.ts (STREAM_TEMPLATE_V2_BODY + STREAM_FALLBACKS + upgradeStreamTemplatesToV2)"
    - "backend/src/routes/emailTemplates.ts (POST /upgrade-streams-v2 endpoint + import)"

key-decisions:
  - "Used NEW PersonalizedEmailSend table instead of extending email_logs — avoids campaignId NOT NULL FK regression (RESEARCH §5 option c)"
  - "Per-stream tailored fallback strings (not generic-only) — each of 9 streams has stream-specific intentHook/painPoint/cta defensible enough to ship to real prospects"
  - "Idempotency via includes('{{intentHook}}') sentinel — works whether row was upgraded or not, no transaction needed"
  - "Actual file is backend/src/routes/emailTemplates.ts (camelCase), NOT email-templates.ts as plan stated — followed actual filesystem reality"
  - "Used req.user?.id (matches existing seed-streams handler idiom) NOT req.user?.userId (plan-suggested but wrong for this codebase)"
  - "Migration directory uses 14-digit 20260531120000 (noon UTC) precedent from Plan 03.1-03"
  - "Force-add migration .sql past backend/.gitignore — precedent: Phase 04-01, 03.1-02, 03.1-03"
  - "Did NOT run prisma migrate dev/deploy in this plan — defer to Plan 05-04 deploy wave; only generated migration .sql and validated schema"

patterns-established:
  - "Phase 5 audit isolation: each per-contact send writes one row to personalized_email_sends with full snapshot (rendered body, AI tokens, cost telemetry, dispatch outcome) — Rajesh-auditable per row"
  - "Idempotent template upgrade pattern: detect via sentinel substring + short-circuit — Plan 05-04 deploy can curl the endpoint multiple times safely"
  - "Stream fallback strings live next to STREAM_TEMPLATE_V2_BODY (one file, one mental model) — Wave 2 send-route imports getStreamFallbacks(stream) when Claude returns null"

requirements-completed: [REQ-052, REQ-054]

# Metrics
duration: 3min
completed: 2026-05-31
---

# Phase 05 Plan 01: PersonalizedEmailSend schema + Stream template v2 upgrade Summary

**Isolated PersonalizedEmailSend audit table with 5 indexes + 3 FKs, plus idempotent in-place upgrade of 9 Stream:* email_templates rows to v2 body shape with 4 AI placeholders + per-stream fallback dictionary.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-31T01:41:30Z
- **Completed:** 2026-05-31T01:44:24Z
- **Tasks:** 2 (both committed atomically)
- **Files modified:** 3 modified + 1 created (migration.sql)

## Accomplishments

- New Prisma model `PersonalizedEmailSend` with 20 columns covering contact + template + AI tokens + cost telemetry + Resend dispatch outcome — schema validates clean with `prisma 5.4.2 validate`
- Migration `20260531120000_phase05_personalized_email_send/migration.sql` ready to apply (5 indexes + 3 FKs: contacts CASCADE, email_templates RESTRICT, users CASCADE)
- 3 inverse relations added (User.personalizedSends, Contact.personalizedSends, EmailTemplate.personalizedSends) — Prisma client typegen will expose them after Plan 05-04 `prisma generate`
- `STREAM_TEMPLATE_V2_BODY` constant: 7-paragraph body with {{firstName}} + 4 AI placeholders + "— Sara, TechCloudPro" sign-off
- `STREAM_FALLBACKS` dict: per-token defensible strings for all 9 canonical streams (NetSuite, AI/ML, Cloud/DevOps, Cybersecurity, Data/Analytics, Mobile, Enterprise/ERP, Staffing/HR) + GENERIC_FALLBACK for unknown
- `upgradeStreamTemplatesToV2(prisma, userId)` function: scans `category LIKE 'Stream:%'` rows, short-circuits any whose htmlContent already contains `{{intentHook}}`, returns `{ upgraded: string[], alreadyV2: string[], total: number }`
- `POST /api/email-templates/upgrade-streams-v2` endpoint: 401 if unauthenticated, 500 on error with detail, idempotent by construction (re-call returns `{ upgraded: [], alreadyV2: [...9 names], total: 9 }`)

## Task Commits

1. **Task 1: Prisma migration + PersonalizedEmailSend model** — `b19feec` (feat)
2. **Task 2: Stream template v2 body + idempotent upgrade endpoint** — `820fd4a` (feat)

_Plan metadata commit will follow this SUMMARY._

## Files Created/Modified

- `backend/prisma/schema.prisma` — Added `model PersonalizedEmailSend` + 3 inverse relations on existing Contact, EmailTemplate, User models. **Zero modifications to existing fields** (additive only).
- `backend/prisma/migrations/20260531120000_phase05_personalized_email_send/migration.sql` — CREATE TABLE with 20 columns, 5 CREATE INDEX statements, 3 ALTER TABLE ADD CONSTRAINT statements (FKs). **Zero ALTER TABLE on existing tables.**
- `backend/src/seeds/stream-templates.ts` — Appended STREAM_TEMPLATE_V2_BODY constant, StreamFallbackTokens interface, GENERIC_FALLBACK, STREAM_FALLBACKS dict (9 streams), getStreamFallbacks() helper, upgradeStreamTemplatesToV2() function. **STREAM_TEMPLATE_SEEDS and seedStreamTemplates() unchanged.**
- `backend/src/routes/emailTemplates.ts` — Added `upgradeStreamTemplatesToV2` to existing seeds-import statement, added POST `/upgrade-streams-v2` route immediately after existing `/seed-streams` route. **All other endpoints unchanged.**

## Per-stream fallback strings (Rajesh may want to tune these)

These ship to real prospects when Claude returns null for a token. Each is intentionally short and defensible.

| Stream | intentHook | painPoint |
|---|---|---|
| NetSuite | "Quick note from TCP's NetSuite practice." | "Manual data entry, slow close cycles, and reporting bottlenecks are the usual suspects." |
| AI/ML | "Quick note from TCP's AI/ML practice." | "Model deployment, monitoring, and cost control rarely scale linearly." |
| Cloud/DevOps | "Quick note from TCP's Cloud/DevOps practice." | "Multi-account sprawl and cost reporting often outpace tooling." |
| Cybersecurity | "Quick note from TCP's Cybersecurity practice." | "Compliance, vendor risk, and IAM tooling rarely scale linearly with company growth." |
| Data/Analytics | "Quick note from TCP's Data/Analytics practice." | "Pipeline reliability, governance, and reporting latency are the usual suspects." |
| Mobile | "Quick note from TCP's Mobile practice." | "Release pipelines, store ops, and observability often lag the product." |
| Enterprise/ERP | "Quick note from TCP's Enterprise/ERP practice." | "Manual reconciliations, slow month-end close, and brittle integrations are common." |
| Staffing/HR | "Quick note from TCP's Staffing/HR practice." | "Onboarding, payroll integrations, and reporting often outgrow the original tools." |
| Other / GENERIC | "Quick note from TechCloudPro." | "Many teams in your space are wrestling with manual workflows that slow close and reporting." |

Full cta/companyContext text lives in `backend/src/seeds/stream-templates.ts` STREAM_FALLBACKS dict.

## Idempotency Proof

`upgradeStreamTemplatesToV2()` uses single-pass scan with includes-check:

```ts
for (const row of rows) {
  if ((row.htmlContent || '').includes('{{intentHook}}')) {
    alreadyV2.push(row.name);
    continue;
  }
  await prisma.emailTemplate.update({ where: { id: row.id }, data: { htmlContent: STREAM_TEMPLATE_V2_BODY } });
  upgraded.push(row.name);
}
```

- **First call** on 9 fresh Phase 4 v1 templates (none contain `{{intentHook}}`): returns `{ upgraded: [9 names], alreadyV2: [], total: 9 }`
- **Second call** immediately after: all 9 rows now contain `{{intentHook}}` (substring of STREAM_TEMPLATE_V2_BODY), all hit the short-circuit branch — returns `{ upgraded: [], alreadyV2: [9 names], total: 9 }`
- **No transaction needed** — each row update is independent and the sentinel-check is idempotent under both partial-failure (re-run resumes from where it stopped) and concurrent calls (last writer wins, both produce the same `htmlContent` body).

## Firewall Verification

```bash
$ git diff cc964ad..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l
0
$ git diff HEAD~2 -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts \
    frontend/src/components/NetSuiteCampaignWizard.tsx frontend/src/pages/Contacts/ContactList.tsx | wc -l
0
$ git diff backend/prisma/schema.prisma | grep -c "^-.*email_log"
0
```

Phase 4 firewall holds. No email_logs deletions. PersonalizedEmailSend lives in its own model block at the END of schema.prisma (line 2334+).

## Decisions Made

See `key-decisions` frontmatter above for full list. Highlights:

1. **NEW table over email_logs extension** — RESEARCH §5 ruled this out due to `campaignId NOT NULL` FK that Phase 4 intentionally doesn't populate. New table is the lowest-risk choice; zero coupling with Phase 4 SES/campaigns/tracking/scheduler consumers of email_logs.
2. **Per-stream fallbacks tailored, not generic-only** — Plan 05-02 send route will call `getStreamFallbacks(stream)` when Claude returns null. Per-stream language survives surface inspection by real prospects; "Quick note from TCP's NetSuite practice" beats "Quick note from TechCloudPro" for a CFO who knows the topic.
3. **File path correction: emailTemplates.ts (camelCase), not email-templates.ts** — Plan was wrong; actual file confirmed via `grep -rn "seed-streams" backend/src/`. Imports + endpoint placement adapted to real file structure.
4. **req.user?.id idiom, not req.user?.userId** — Existing /seed-streams handler at line 76-83 uses `req.user?.id`. Followed local convention for consistency.
5. **Schema models 53 → 54** — Verified via `grep -c "^model" baseline-vs-current`. Only PersonalizedEmailSend added. No models deleted (162-line deletion in commit diff is `prisma format` reflowing whitespace, not content removal).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] File path correction: emailTemplates.ts (not email-templates.ts)**
- **Found during:** Task 2 (Stream template v2 + upgrade endpoint)
- **Issue:** Plan said `backend/src/routes/email-templates.ts` but `grep -rn "seed-streams" backend/src/` showed the actual file is `backend/src/routes/emailTemplates.ts` (camelCase). Two stub files exist: `email-templates.ts` (older, uses nodemailer + has no seed-streams) and `emailTemplates.ts` (current, uses SES + has the live `/seed-streams` route). Edited the latter.
- **Fix:** Added `upgradeStreamTemplatesToV2` to the existing seeds-import block in emailTemplates.ts, added POST `/upgrade-streams-v2` route adjacent to `/seed-streams`.
- **Files modified:** backend/src/routes/emailTemplates.ts
- **Verification:** `grep -c "router.post('/upgrade-streams-v2'" backend/src/routes/emailTemplates.ts → 1`; `grep -c "router.post('/seed-streams'" backend/src/routes/emailTemplates.ts → 1` (intact)
- **Committed in:** `820fd4a` (Task 2 commit)

**2. [Rule 3 - Blocking] Auth idiom adapted to existing file convention**
- **Found during:** Task 2 (upgrade-streams-v2 endpoint)
- **Issue:** Plan suggested `(req as any).user?.userId` but existing `/seed-streams` handler at line 76-83 uses `req.user?.id`. Adopted local convention to avoid drift.
- **Fix:** Used `req.user?.id` matching the proven pattern from the seed-streams handler 5 lines above.
- **Files modified:** backend/src/routes/emailTemplates.ts
- **Verification:** Both handlers now share identical auth-guard structure.
- **Committed in:** `820fd4a` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking adaptations to actual codebase structure)
**Impact on plan:** Zero scope creep. Both fixes are mechanical file-path / API-convention corrections discovered by reading actual code; the plan's intent (idempotent v2 upgrade endpoint) ships exactly as designed.

## Issues Encountered

- **Initial confusion: two email-templates route files exist** in `backend/src/routes/`. Resolved by grepping for actual mount of `/seed-streams` endpoint — `emailTemplates.ts` is the live one. `email-templates.ts` appears to be a dormant stub from earlier work; not touched.
- **`prisma format` reflowed whitespace** producing 162 deletions in the schema.prisma diff. Verified model count went from 53 → 54 (correct: added PersonalizedEmailSend only). All other models intact, no behavioral change.

## User Setup Required

None for Plan 05-01. The migration .sql file is committed and ready, but `prisma migrate deploy` execution is deferred to **Plan 05-04 (deploy wave)** per plan envelope. Similarly, the `/upgrade-streams-v2` endpoint is code-only — actual prod template upgrade happens via curl in Plan 05-04 deploy.

## Next Phase Readiness

- **Plan 05-02 (AI helper + send-personalized-campaign route):** Can now import `STREAM_TEMPLATE_V2_BODY`, `getStreamFallbacks`, and `PersonalizedEmailSend` Prisma model. Plan 05-02 will wire the Claude helper + the new send route + the audit row writes.
- **Plan 05-03 (wizard Step 3 injection):** No coupling — Plan 05-03 is frontend-only.
- **Plan 05-04 (deploy + smoke):** Will need to run `npx prisma migrate deploy` on EC2 (idempotent: re-runs do nothing on already-applied 20260531120000 migration) + run `prisma generate` to refresh client types + curl `/api/email-templates/upgrade-streams-v2` to update prod templates.
- **No blockers** for Plan 05-02 to begin.

## Self-Check: PASSED

Verified existence of all claimed artifacts:

```
FOUND: backend/prisma/migrations/20260531120000_phase05_personalized_email_send/migration.sql
FOUND: backend/prisma/schema.prisma (model PersonalizedEmailSend at line 2334+)
FOUND: backend/src/seeds/stream-templates.ts (STREAM_TEMPLATE_V2_BODY, STREAM_FALLBACKS, upgradeStreamTemplatesToV2)
FOUND: backend/src/routes/emailTemplates.ts (POST /upgrade-streams-v2)
FOUND: commit b19feec (Task 1)
FOUND: commit 820fd4a (Task 2)
```

---
*Phase: 05-ai-personalized-apollo-campaign*
*Completed: 2026-05-31*
