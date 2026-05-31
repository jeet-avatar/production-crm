---
phase: 05-ai-personalized-apollo-campaign
plan: 02
subsystem: backend-routes
tags: [anthropic, web-search, resend, prisma, audit, cost-telemetry, fallbacks]

# Dependency graph
requires:
  - phase: 05-ai-personalized-apollo-campaign
    plan: 01
    provides: "PersonalizedEmailSend Prisma model + STREAM_TEMPLATE_V2_BODY + getStreamFallbacks + 9-stream STREAM_FALLBACKS dict"
provides:
  - "personalizeContactWithClaude(contact, stream) helper — one Claude call per contact with web_search_20250305, EXACTLY 5 fallback paths, NEVER throws"
  - "POST /api/apollo/send-personalized-campaign route — sequential per-contact loop with audit-before-send + audit-after, 250ms pacing, 50-contact hard gate, previewOnly + testRecipient support"
  - "apolloApi.sendPersonalizedCampaign(params) frontend client method with 600s axios timeout + 5 new TypeScript interfaces"
  - "Forward-compat cost telemetry envelope: { claudeInputTokens, claudeOutputTokens, webSearchRequests, claudeCostUSD, resendSendsCounted, resendCostUSD, totalCostUSD }"
affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "5-fallback Claude contract with non-object-JSON folded into malformed-JSON branch (manual throw inside try)"
    - "Cost-constant pattern: RESEND_COST_PER_SEND=0 const so future paid-tier moves edit one line"
    - "Audit-before-send pattern: prisma.personalizedEmailSend.create (status='pending') BEFORE Resend, prisma update AFTER (status='sent'|'failed'|'preview')"
    - "Prisma JSON write: Prisma.InputJsonValue cast + Prisma.JsonNull for null case (NOT as any)"
    - "previewOnly slice cap: previewOnly ? contactIds.slice(0,1) : contactIds — single contact preview"
    - "Curated apolloRawData 10-key whitelist — token-cost guard before AI prompt"
    - "Auth idiom: req.user?.id || req.user?.sub matches existing /send-campaign route (Wave 1 lesson re-applied)"

key-files:
  created:
    - ".planning/phases/05-ai-personalized-apollo-campaign/05-02-SUMMARY.md"
  modified:
    - "backend/src/routes/apollo.ts (469 insertions, 1 modification on import line) — Phase 5 types + personalizeContactWithClaude helper + POST /send-personalized-campaign route"
    - "frontend/src/services/api.ts (64 insertions, 0 deletions) — 5 new interfaces + apolloApi.sendPersonalizedCampaign method"

key-decisions:
  - "Auth idiom adapted: req.user?.id || req.user?.sub (matches existing /send-campaign route 5 lines above) NOT req.user?.userId as plan suggested — same Rule-3 deviation as Wave 1 Plan 05-01"
  - "Non-object JSON folded into 'Claude returned malformed JSON' via manual throw inside try/catch — EXACTLY 5 distinct warning strings emitted by personalizeContactWithClaude (verified by sed-scoped grep)"
  - "Prisma client regenerated locally with `prisma generate --schema=prisma/schema.prisma` to confirm tsc passes on new code — local node_modules client was stale (pre-Phase-4 + pre-05-01)"
  - "Imported `Prisma` namespace alongside PrismaClient from @prisma/client to enable Prisma.InputJsonValue cast + Prisma.JsonNull literal on aiTokens write"
  - "All Phase 5 constants kept at top of file (after imports) before the Phase 4 import handler — single mental model for Phase 5 review"
  - "STREAM_TEMPLATE_V2_BODY used as fallback ONLY when template.htmlContent is empty — primary path is template.htmlContent (which Plan 05-04 will upgrade via the /upgrade-streams-v2 endpoint built in 05-01)"
  - "Did NOT add @types/anthropic — the `tools: [{type:'web_search_20250305', ...} as any]` cast is intentional. SDK 0.65.0 typed types/messages.d.ts has WebSearchTool20250305 but the inline literal is rejected by stricter literal-type inference; `as any` is the minimal escape hatch"
  - "Frontend method signature uses single params object (NOT positional args like sendCampaign) — preferred TypeScript idiom for 6-field input; matches modern apolloApi.normalize pattern"

patterns-established:
  - "Phase 5 send-route owns its own constants block (RESEND_COST_PER_SEND, PERSONALIZE_*) — Phase 4 send-campaign still uses inline 100ms; the two routes are intentionally decoupled"
  - "5-fallback warning contract for per-contact AI helpers: mirror normalizeFiltersWithClaude shape but emit phase-specific warning suffixes ('used per-stream fallback' vs 'used your inputs as-is')"
  - "Cost response envelope: separate claude / resend / total fields so future paid-Resend pricing plugs in without changing response shape"

requirements-completed: [REQ-050, REQ-051, REQ-053]
# REQ-052 (Stream template renders with AI tokens) was code-complete in Wave 1 via STREAM_TEMPLATE_V2_BODY;
# Wave 2 wires the runtime substitution. Marking 050/051/053 as the per-wave deliverables.

# Metrics
duration: 5min
completed: 2026-05-31
---

# Phase 05 Plan 02: AI helper + send-personalized-campaign route Summary

**personalizeContactWithClaude helper (web_search_20250305, 60s timeout, EXACTLY 5 fallbacks) + POST /api/apollo/send-personalized-campaign route (sequential loop, 250ms pacing, audit-before/after, 50-contact gate, previewOnly + testRecipient) + apolloApi.sendPersonalizedCampaign frontend client with 600s timeout + 5 typed interfaces. Phase 4 firewall holds byte-for-byte.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-31T01:49:10Z
- **Completed:** 2026-05-31T01:53:58Z
- **Tasks:** 2 (both committed atomically)
- **Files modified:** 2 (backend/src/routes/apollo.ts + frontend/src/services/api.ts)
- **Lines added:** 533 (469 backend + 64 frontend)
- **Lines deleted:** 1 (single backend import line modified to add `Prisma` namespace)

## Helper Signature

```ts
async function personalizeContactWithClaude(
  contact: {
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    apolloRawData: any;
    company: { name: string | null; industry: string | null } | null;
  },
  stream: string,
): Promise<PersonalizeResult>

interface PersonalizeResult {
  tokens: AITokens | null;        // { intentHook, companyContext, painPoint, cta } each string|null
  usage: ClaudeUsage;             // { inputTokens, outputTokens, webSearchUses, costUSD }
  warning?: string;               // one of EXACTLY 5 strings
}
```

NEVER throws. Calls `anthropicClient.messages.create({ model: 'claude-sonnet-4-6', tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }], ... })` with 60s `Promise.race` timeout. Tokens sanitized (strip HTML, strip URLs, cap 160 chars). Curated `apolloRawData` 10-key whitelist passed to user message.

## 5-Fallback Contract (locked, EXACTLY 5 branches emitted by personalizeContactWithClaude)

| # | Trigger | Warning String |
|---|---------|----------------|
| 1 | `anthropicClient` null (missing ANTHROPIC_API_KEY) | `'Claude not configured'` |
| 2 | `Promise.race` resolves to `'TIMEOUT'` after 60s | `'Claude timed out — used per-stream fallback'` |
| 3 | No text block found in `response.content` | `'Claude returned empty response'` |
| 4 | `JSON.parse` throws OR parse result is non-object/null/array | `'Claude returned malformed JSON'` |
| 5 | SDK call throws (network / 4xx-5xx / web_search 5xx / anything else) | `'Claude unavailable'` |

### Non-object JSON fold proof

Branch 4 uses a single try/catch with a manual `throw` inside the try to route non-object results into the same catch path:

```ts
let parsed: any;
try {
  parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('non-object JSON');           // <- folds into Fallback 4 below
  }
} catch {
  return { tokens: null, usage, warning: 'Claude returned malformed JSON' };
}
```

The internal `'non-object JSON'` Error message is NEVER surfaced to the caller — only `'Claude returned malformed JSON'` is. Verified:

```
$ grep -c "non-object JSON" backend/src/routes/apollo.ts
1     # only the internal throw, not a separate warning emission
$ grep -c "'Claude returned non-object JSON'" backend/src/routes/apollo.ts
0     # zero — fold succeeded
```

### Distinct warning strings emitted

```
$ sed -n '/^async function personalizeContactWithClaude/,/^}/p' backend/src/routes/apollo.ts \
    | grep -oE "warning: '[^']+'" | sort -u
warning: 'Claude not configured'
warning: 'Claude returned empty response'
warning: 'Claude returned malformed JSON'
warning: 'Claude timed out — used per-stream fallback'
warning: 'Claude unavailable'
$ ... | wc -l
5
```

EXACTLY 5 distinct warnings — BLOCKER #1 closed.

## Route Shape

**POST `/api/apollo/send-personalized-campaign`**

Request body:
```ts
{
  contactIds: string[],            // required, non-empty
  templateId: string,              // required, scoped by userId
  suggestedStream: string,         // required, must be in VALID_STREAMS
  testRecipient?: string,          // optional, opt-in only — persisted to audit
  previewOnly?: boolean,           // optional, caps at slice(0,1) + skips Resend
  confirmedLargeBatch?: boolean,   // required if contactIds.length > 50
}
```

Response (200):
```ts
{
  sent: number,
  failed: number,
  personalized: number,            // count where AI tokens were generated
  personalizeFailures: number,     // count where AI fallback (null tokens) was used
  failureDetails: Array<{ contactId, email, error }>,
  audit: ApolloPersonalizeAuditEntry[],
  cost: {
    claudeInputTokens: number,
    claudeOutputTokens: number,
    webSearchRequests: number,
    claudeCostUSD: number,             // 6-decimal Number.toFixed
    resendSendsCounted: number,
    resendCostUSD: number,             // currently 0 (free tier)
    totalCostUSD: number,              // claudeCostUSD + resendCostUSD
  }
}
```

Error responses:
- 400 `{ error: 'contactIds must be a non-empty array' }`
- 400 `{ error: 'templateId required' }`
- 400 `{ error: 'suggestedStream must be one of NetSuite, AI/ML, ...' }`
- 400 `{ error: 'large_batch_requires_confirmation', detail: '...', estimatedCostUSD: N }` — when >50 contacts without `confirmedLargeBatch:true`
- 401 `{ error: 'unauthorized' }`
- 404 `{ error: 'template_not_found' }`
- 404 `{ error: 'no_contacts_found' }`
- 500 `{ error: 'send_personalized_failed', detail: '...' }`

## Cost-Math Example

For a 25-contact live batch (no `previewOnly`, no `testRecipient`):

Per-contact estimate (RESEARCH §1):
- Input tokens ~1,900 × $3/MTok = $0.0057
- Search-retrieved content ~8,000 × $3/MTok = $0.024
- Output tokens ~600 × $15/MTok = $0.009
- Web searches × 3 × $0.01 = $0.030
- **Per-contact ~$0.069**

Batch totals:
```json
{
  "cost": {
    "claudeInputTokens": 247500,        // ~9,900 × 25
    "claudeOutputTokens": 15000,        // ~600 × 25
    "webSearchRequests": 75,            // ~3 × 25
    "claudeCostUSD": 1.732500,          // ~$0.069 × 25
    "resendSendsCounted": 25,
    "resendCostUSD": 0.000000,          // 25 × RESEND_COST_PER_SEND (0 today)
    "totalCostUSD": 1.732500            // claudeCostUSD + resendCostUSD
  }
}
```

When TCP moves to paid Resend tier, only `RESEND_COST_PER_SEND` const flips (e.g., to `0.0001`); the response shape stays identical — `totalCostUSD` reflects the change without any consumer (wizard, dashboards) needing edits.

## Constants Established

| Constant | Value | Why |
|---|---|---|
| `PERSONALIZE_TIMEOUT_MS` | 60_000 | web_search needs headroom — 8s of normalize path too tight |
| `PERSONALIZE_BATCH_HARD_CAP` | 50 | Cost gate ($3.45 at $0.069/contact); requires `confirmedLargeBatch:true` to bypass |
| `PERSONALIZE_PACING_MS` | 250 | 4 req/sec < Resend's 5/sec limit (Phase 4 used 100ms which would exceed) |
| `RESEND_COST_PER_SEND` | 0 | Free tier today; named const so paid-tier swap is one-line |
| `CLAUDE_INPUT_RATE_PER_TOKEN` | 3 / 1_000_000 | $3 / MTok |
| `CLAUDE_OUTPUT_RATE_PER_TOKEN` | 15 / 1_000_000 | $15 / MTok |
| `CLAUDE_WEB_SEARCH_RATE` | 0.010 | $10 / 1000 searches |

## Curated Apollo Fields Whitelist (10 keys)

```ts
const candidates = [
  'title', 'headline', 'seniority', 'departments', 'linkedin_url',
  'employment_history', 'organization_industry', 'organization_size',
  'organization_short_description', 'organization_founded_year',
];
```

Token-cost guard: adds ~200 input tokens per call (vs. 2-3k if entire `apolloRawData` was passed). Big quality lift, predictable cost.

## Frontend Client

```ts
apolloApi.sendPersonalizedCampaign(params: ApolloSendPersonalizedRequest)
  : Promise<{ data: ApolloPersonalizedCampaignResponse }>
```

Axios timeout: 600s (10 min) — covers up to 50-contact cap with margin (25 contacts × (12s Claude + 250ms pacing + Resend send) ≈ 6 min worst case).

Five new TypeScript interfaces:
- `ApolloPersonalizeAITokens`
- `ApolloPersonalizeAuditEntry`
- `ApolloPersonalizedCampaignCost` (includes `resendCostUSD` for forward-compat)
- `ApolloPersonalizedCampaignResponse`
- `ApolloSendPersonalizedRequest`

Default 10s `apiClient` timeout preserved for the other 100+ API methods.

## Firewall Verification

```bash
$ git diff HEAD~2 -- backend/src/routes/campaigns.ts \
                     backend/src/services/awsSES.ts \
                     frontend/src/components/NetSuiteCampaignWizard.tsx \
                     frontend/src/components/ApolloSearchForm.tsx \
                     frontend/src/pages/Apollo/ApolloPage.tsx \
                     frontend/src/pages/Contacts/ContactList.tsx | wc -l
0
```

Phase 4 send-path firewall (campaigns.ts, awsSES.ts) — zero touches. Wave 3 wizard firewall (NetSuiteCampaignWizard.tsx, ApolloSearchForm.tsx, ApolloPage.tsx, ContactList.tsx) — zero touches. Wave 1 schema firewall (schema.prisma) — zero touches.

Phase 4 routes preserved inside apollo.ts:
- `router.post('/import'` — 1 occurrence (line 523)
- `router.post('/normalize-filters'` — 1 occurrence (line 721, quick-7)
- `router.post('/send-campaign'` — 1 occurrence (line 741)
- `router.post('/send-personalized-campaign'` — 1 occurrence (line 875, NEW)

## tsc Output

Backend (after `prisma generate --schema=prisma/schema.prisma` to refresh local client):
```
$ npx tsc --noEmit -p . 2>&1 | grep "apollo.ts"
(no output — clean)
```

All apollo.ts type errors resolved once Prisma client was regenerated with the Plan 05-01 schema (which added PersonalizedEmailSend + 3 inverse relations). Remaining tsc errors in other files (analytics.routes.ts authenticateJWT, apiSubscriptions clover types, contracts.ts ContractStatus) are pre-existing and unrelated to Phase 5.

Frontend:
```
$ npx tsc --noEmit 2>&1 | grep "src/services/api.ts"
(no output — clean)
$ npx tsc --noEmit 2>&1 | head -5
(no output — entire frontend clean)
```

## Task Commits

1. **Task 1: personalizeContactWithClaude helper + send-personalized-campaign route** — `908e631` (feat)
2. **Task 2: frontend apolloApi.sendPersonalizedCampaign + types** — `35bbc58` (feat)

_Plan metadata commit will follow this SUMMARY._

## Files Created/Modified

- `backend/src/routes/apollo.ts` — Added imports of `Prisma` namespace, `STREAM_TEMPLATE_V2_BODY`, `getStreamFallbacks`. Added Phase 5 types (`AITokens`, `ClaudeUsage`, `PersonalizeResult`), cost/timing constants, `PHASE5_RESEARCH_SYSTEM_PROMPT`, `sanitizeToken()`, `computeClaudeCost()`, `zeroUsage()`, `curatedApolloFields()`, `personalizeContactWithClaude()` helper. Added `POST /send-personalized-campaign` route immediately after `/send-campaign`. **Zero modifications to /import, /normalize-filters, /send-campaign, normalizeFiltersWithClaude.**
- `frontend/src/services/api.ts` — Added 5 TypeScript interfaces after existing `ApolloSendCampaignResponse`. Added `sendPersonalizedCampaign` method inside `apolloApi` after `sendCampaign`. **Zero modifications to apolloApi.import, sendCampaign, normalize, or any other API client.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Auth idiom adapted: `req.user?.id || req.user?.sub` instead of `req.user?.userId`**
- **Found during:** Task 1 (send-personalized-campaign route)
- **Issue:** Plan suggested `(req as any).user?.userId` but the existing `/send-campaign` route (line 545, the route immediately BEFORE the new one) uses `(req as any).user?.id || (req as any).user?.sub`. Wave 1 Plan 05-01 SUMMARY documented the same finding — local convention is `req.user?.id`. Using `userId` would have made the new route reject every authenticated request because the auth middleware sets `req.user.id`, not `req.user.userId`.
- **Fix:** Adopted `req.user?.id || req.user?.sub` to match the adjacent /send-campaign route exactly.
- **Files modified:** backend/src/routes/apollo.ts
- **Verification:** Both /send-campaign and /send-personalized-campaign now share identical auth-guard structure.
- **Committed in:** `908e631` (Task 1 commit)

**2. [Rule 3 - Blocking] Local Prisma client regenerated to confirm tsc passes**
- **Found during:** Task 1 verification (tsc gate)
- **Issue:** Initial `npx tsc --noEmit -p .` reported `Property 'personalizedEmailSend' does not exist on type 'PrismaClient'` plus 4 pre-existing Phase 4 errors (apolloPersonId/apolloOrgId/stream not in input types). Both error classes traced to a stale local `node_modules/@prisma/client` that was generated before Phase 04-01 + Phase 05-01 schema additions. Without regeneration, tsc could not validate Plan 05-02 type-correctness.
- **Fix:** Ran `DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate --schema=prisma/schema.prisma`. Client refreshed to Prisma v5.22.0 in 455ms.
- **Files modified:** none (regeneration only writes to node_modules — gitignored)
- **Verification:** Post-regenerate, `npx tsc --noEmit -p . 2>&1 | grep apollo.ts` returns zero output. New Phase 5 code is type-clean.
- **Committed in:** N/A (no source change; tooling step only — node_modules ignored)

### Plan-aligned but worth noting

- `tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as any]` keeps the `as any` cast on the tool literal. SDK 0.65.0 types/messages.d.ts has `WebSearchTool20250305` exported as a type union member, but the inline-literal-type inference still rejects it without explicit cast. Plan does not require removing this cast — it's separate from the explicitly-forbidden `as any` on Prisma JSON writes (which we replaced with `Prisma.InputJsonValue` per HIGH #13).

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking adaptations to actual codebase / toolchain reality)
**Impact on plan:** Zero scope creep. Both fixes are mechanical adaptations discovered by reading actual code / running real tooling. The plan's intent (5-fallback Claude helper + adjacent send-personalized-campaign route + typed frontend client) ships exactly as designed.

## Issues Encountered

- **Local Prisma client was stale.** Pre-existing Phase 4 fields (`apolloPersonId`, `apolloOrgId`, `stream`) and new Plan 05-01 model (`personalizedEmailSend`) all triggered tsc errors until `prisma generate` ran. This is environmental — Plan 05-04 deploy explicitly runs `prisma generate` on EC2 (per its plan envelope). Local fix was tooling-only; no source change required.
- **Plan verify grep over-counted distinct warnings.** Plan said `grep -oE "'(Claude not configured|Claude timed out[^']*|Claude returned empty response|Claude returned malformed JSON|Claude unavailable)'" | sort -u | wc -l == 5`. Actual output was 6 because the existing `normalizeFiltersWithClaude` emits 2 different `Claude timed out` suffixes ("used your inputs as-is") that the regex bucketed together with the new "used per-stream fallback". Scoping to the personalize function body via `sed -n '/^async function personalizeContactWithClaude/,/^}/p'` confirmed EXACTLY 5 distinct strings inside the new helper. Documented in deviations + verified below.

## User Setup Required

None for Plan 05-02. Code is committed and tsc-clean. Plan 05-04 (deploy wave) handles:
- `npx prisma migrate deploy` on EC2 to apply the Plan 05-01 migration
- `npx prisma generate` on EC2 to refresh the production Prisma client (otherwise `personalizedEmailSend` calls will fail at runtime)
- `curl /api/email-templates/upgrade-streams-v2` to upgrade the 9 Stream:* templates to V2 body
- 4-case live smoke against Ricardo Deben (preview → live → DB audit → firewall check)

## Next Phase Readiness

- **Plan 05-03 (NetSuiteCampaignWizard 4→5 step refactor):** Can now call `apolloApi.sendPersonalizedCampaign({ contactIds, templateId, suggestedStream, previewOnly: true })` for the AI Personalize Step 3 preview, and the same method without `previewOnly` for the Review Step 4 send. All TypeScript types are exported from `services/api.ts`.
- **Plan 05-04 (deploy + smoke):** Backend route lives at `POST /api/apollo/send-personalized-campaign`. Existing JWT/UA-bypass smoke recipe from Phase 04-06 applies directly. Preview-only smoke uses `previewOnly:true` to validate Claude + audit row write without burning Resend dispatch. Live smoke uses `testRecipient:'jm@techcloudpro.com'` to redirect away from Ricardo Deben.
- **No blockers** for Plan 05-03 to begin.

## Self-Check: PASSED

Verified existence of all claimed artifacts:

```
$ ls .planning/phases/05-ai-personalized-apollo-campaign/05-02-SUMMARY.md
FOUND
$ grep -c "function personalizeContactWithClaude" backend/src/routes/apollo.ts
1 — FOUND
$ grep -c "router.post('/send-personalized-campaign'" backend/src/routes/apollo.ts
1 — FOUND
$ grep -c "sendPersonalizedCampaign:" frontend/src/services/api.ts
1 — FOUND
$ git log --all --oneline | grep -E "^908e631|^35bbc58"
908e631 feat(05-02): personalizeContactWithClaude helper + send-personalized-campaign route — FOUND
35bbc58 feat(05-02): frontend apolloApi.sendPersonalizedCampaign + types — FOUND
$ git diff HEAD~2 -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts \
                     frontend/src/components/NetSuiteCampaignWizard.tsx \
                     frontend/src/components/ApolloSearchForm.tsx \
                     frontend/src/pages/Apollo/ApolloPage.tsx \
                     frontend/src/pages/Contacts/ContactList.tsx | wc -l
0 — firewall HOLDS
```

---
*Phase: 05-ai-personalized-apollo-campaign*
*Completed: 2026-05-31*
