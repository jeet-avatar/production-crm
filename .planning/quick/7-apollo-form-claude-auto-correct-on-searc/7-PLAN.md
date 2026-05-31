---
phase: quick-7
plan: 7
type: execute
wave: 1
depends_on: [quick-6]
files_modified:
  - backend/src/routes/apollo.ts
  - frontend/src/services/api.ts
  - frontend/src/components/ApolloSearchForm.tsx
  - frontend/src/pages/Apollo/ApolloPage.tsx
autonomous: true
requirements:
  - APOLLO-7A   # Backend /normalize-filters route + auto-normalize injection into /import
  - APOLLO-7B   # Frontend form UX upgrades (placeholders, per-field hints, ICP presets) + results-panel corrections block
  - APOLLO-7C   # Deploy backend+frontend + 3-case live verify (corrections, no-false-positive, no-regression)

must_haves:
  truths:
    - "Rajesh enters 'Saas Companies in Irvine' in keyword tags and clicks Search; Apollo returns real contacts (HTTP 200, imported >= 1)."
    - "Results panel shows a 'Claude refined your filters' block listing the corrections (e.g., 'Irvine moved from keywords to locations', 'SaaS extracted as tag')."
    - "Form has 3-4 clickable ICP example presets at the top that auto-fill all fields."
    - "Each form field shows a concrete placeholder AND a per-field ✓/✗ hint distinguishing valid syntax from common mistakes."
    - "When inputs are already clean (no Apollo-semantic mismatches), corrections is empty array (no false positives)."
    - "When Claude SDK call exceeds 3 seconds or throws, /import falls back to raw filters + 'Claude unavailable' warning — never blocks search."
  artifacts:
    - path: "backend/src/routes/apollo.ts"
      provides: "POST /normalize-filters route + normalizeFiltersWithClaude() helper + autoNormalize injection inside /import"
      contains: "normalizeFiltersWithClaude"
    - path: "frontend/src/services/api.ts"
      provides: "apolloApi.import response type extended with corrections + warning; apolloApi.normalize standalone method"
      contains: "corrections"
    - path: "frontend/src/components/ApolloSearchForm.tsx"
      provides: "Placeholders + per-field ✓/✗ hints + 'Common ICP examples' <details> collapsible with 3-4 presets"
      contains: "Common ICP examples"
    - path: "frontend/src/pages/Apollo/ApolloPage.tsx"
      provides: "Results panel renders 'Claude refined your filters' block when corrections is non-empty; yellow Claude-unavailable warning when warning is set"
      contains: "Claude refined your filters"
  key_links:
    - from: "backend/src/routes/apollo.ts (POST /import handler)"
      to: "normalizeFiltersWithClaude() (same file, module-level helper)"
      via: "if req.body.autoNormalize !== false, call helper before searchPeople; append corrections to response body"
      pattern: "autoNormalize"
    - from: "normalizeFiltersWithClaude()"
      to: "Anthropic SDK (@anthropic-ai/sdk already in package.json, model claude-sonnet-4-6, temp 0, max_tokens 1000)"
      via: "Promise.race([anthropic.messages.create(...), timeout(3000)]) — fallback to raw + warning, never throws"
      pattern: "claude-sonnet-4-6"
    - from: "frontend ApolloSearchForm.tsx 'Common ICP examples' presets"
      to: "form state (titlesInput, locationsInput, keywordsInput, minEmployees, maxEmployees, perPage)"
      via: "onClick handler calls setters with preset values"
      pattern: "Common ICP examples"
    - from: "frontend ApolloPage.tsx result panel"
      to: "result.corrections + result.warning"
      via: "conditional render — info block when corrections.length > 0, yellow warn when warning truthy"
      pattern: "Claude refined your filters"
---

<objective>
Make Rajesh's Apollo search Forgiving + Self-Teaching: when he types "Saas Companies in Irvine" in keyword tags (a real bug we saw in this session), Claude API auto-corrects the filters server-side before hitting Apollo (moves Irvine → personLocations, keeps SaaS as tag), Apollo returns real contacts, and the UI explains what Claude changed so Rajesh learns Apollo's semantics. In parallel, upgrade the form with concrete placeholders + per-field ✓/✗ hints + a "Common ICP examples" collapsible with 3-4 one-click presets.

Purpose: Lower the cliff between "what Rajesh writes" and "what Apollo's tag dictionary expects" so he doesn't waste Apollo credits on dead searches. Plus teach him Apollo's distinct field semantics (titles vs locations vs tags vs employees) on the form itself — visually, not by reading docs.

Output:
- Backend POST /api/apollo/normalize-filters route (standalone, for future tooling)
- normalizeFiltersWithClaude() helper auto-applied inside /api/apollo/import (autoNormalize: true default)
- Frontend form: placeholders, per-field hints with ✓ good examples and ✗ common mistakes, "📋 Common ICP examples" <details> block with 3-4 clickable presets
- Frontend results panel: "🤖 Claude refined your filters" info block (when corrections non-empty) + yellow "Claude unavailable" warning (when fallback was used)
- Single atomic commit on `production` branch, fast-forward push to `origin/production`
- Deploy backend + frontend to EC2 via tarball+scp + pm2 env-reload-restart (locked recipe)
- 3-case live verify: corrections fire on dirty input, corrections=[] on clean input, never blocks search

Phase-4 firewall (untouched, verified post-commit): campaigns.ts, awsSES.ts, NetSuiteCampaignWizard.tsx, ContactList.tsx, schema.prisma → 0 line changes.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md

Working directory for ALL ops: `/Users/jeet/production-crm/` (NOT `/Users/jeet/doordash-p2p`).

Git author identity (per global memory rule — every commit MUST use this):
```
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit ...
```

Branch: `production` (current, per STATE.md). Push fast-forward only. Never `--force`.

EC2 deploy paths (verified in quick-5 / quick-6 SUMMARYs):
- Backend dist target: `/var/www/crm-backend/dist/`
- Frontend dist target: `/var/www/brandmonkz/` (with `--delete` semantics — evict stale Vite lazy chunks)
- pm2 restart recipe (locked):
  ```
  cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env
  ```

EC2 SSH: assumed pre-configured per quick-5/quick-6 ops history (same host, same key).

Live smoke gotchas (from quick-6 SUMMARY decisions):
- nginx 403's default `curl/8.x` UA → always set `User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0`
- JWT MUST include `userId` claim (NOT `sub`) + `issuer:'crm-api'` + `audience:'crm-client'` — middleware reads payload.userId
- Owner user for smoke: `cmmziuiuy0000vp5wstob71f7` (Rajesh's user row — same as quick-5/6)
- Vite minifier converts `3000` literal to scientific notation in dist — verify with `grep -E '3e3|3000'` not just `3000`
</execution_context>

<context>
@/Users/jeet/production-crm/.planning/STATE.md
@/Users/jeet/production-crm/backend/src/routes/apollo.ts
@/Users/jeet/production-crm/backend/src/services/ai-orchestrator.service.ts
@/Users/jeet/production-crm/frontend/src/components/ApolloSearchForm.tsx
@/Users/jeet/production-crm/frontend/src/pages/Apollo/ApolloPage.tsx
@/Users/jeet/production-crm/frontend/src/services/api.ts
@/Users/jeet/production-crm/.planning/quick/6-fix-apollo-bugs-120s-per-route-timeout-c/6-SUMMARY.md

# Key snippets from reads:
# - @anthropic-ai/sdk ^0.65.0 already in backend/package.json:42 — DO NOT add as new dep
# - ai-orchestrator.service.ts shows the canonical SDK init pattern:
#     import Anthropic from '@anthropic-ai/sdk';
#     const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
#   Reuse this exact pattern in apollo.ts (module-level singleton).
# - ANTHROPIC_API_KEY already on EC2 (memory `anthropic-key-tcp-workspace` — billed to TCP workspace).
# - ApolloImportResponse interface lives at frontend/src/services/api.ts:428-435.
# - apolloApi.import already has { timeout: 120000 } per-call override from quick-6 → covers Claude+Apollo+enrich budget.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — add normalizeFiltersWithClaude() + /normalize-filters route + autoNormalize injection into /import</name>
  <files>backend/src/routes/apollo.ts</files>
  <action>
**Edit `backend/src/routes/apollo.ts` (single file, additive edits — do NOT touch the /send-campaign handler, do NOT touch the 3-case Company ladder from quick-6).**

**Step 1.1 — Add Anthropic SDK import at the top of the file (after the existing `import { Resend } from 'resend';` line):**

```ts
// Phase quick-7: Claude-powered Apollo filter normalization.
// Auto-corrects common user input mistakes (e.g., location strings in keyword-tags field,
// industry phrases instead of discrete tags) BEFORE the Apollo HTTP call so Rajesh
// doesn't burn Apollo credits on semantically wrong searches.
//
// We REUSE the existing @anthropic-ai/sdk dep (already in package.json:42) and mirror
// the init pattern from services/ai-orchestrator.service.ts:2-9 — module-level singleton,
// reads ANTHROPIC_API_KEY at module load. Missing key is NOT fatal: normalizeFiltersWithClaude
// will fall back to raw inputs and emit a warning. Claude is best-effort, never blocking.
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;
```

**Step 1.2 — Add the normalization helper as a module-level function (place it AFTER the type declarations block, BEFORE the `router.post('/import', ...)` handler).** Paste this verbatim:

```ts
// ---------------------------------------------------------------------------
// Claude-powered filter normalization (Phase quick-7)
// ---------------------------------------------------------------------------
// Given a raw ApolloSearchFilters object (user input), call Claude with a
// strict-JSON system prompt teaching Apollo's field semantics and return:
//   { normalized: <cleaned filters>, corrections: [...], warning?: string }
//
// Fallback contract (NEVER throws):
//   - If ANTHROPIC_API_KEY missing → return { normalized: <raw>, corrections: [], warning: 'Claude not configured' }
//   - If Claude takes > 3s → race-timeout → return { normalized: <raw>, corrections: [], warning: 'Claude timed out — used your inputs as-is' }
//   - If Claude throws or returns unparseable JSON → return { normalized: <raw>, corrections: [], warning: 'Claude unavailable — used your inputs as-is' }
//
// USER-LOCKED model: claude-sonnet-4-6 (reasoning depth for field disambiguation).
// USER-LOCKED params: temperature 0, max_tokens 1000.

interface ApolloFilterCorrection {
  field: string;          // e.g., 'organizationKeywordTags' | 'personLocations'
  from: string;           // raw value as user typed it
  to: string;             // normalized value Claude moved it to
  reason: string;         // human-readable explanation Rajesh can learn from
}

interface ApolloNormalizeResult {
  normalized: ApolloSearchFilters;
  corrections: ApolloFilterCorrection[];
  warning?: string;
}

const APOLLO_NORMALIZE_SYSTEM_PROMPT = `You are an Apollo.io search-filter normalizer. You take a JSON object of user filters and return a CLEANED version plus a list of corrections explaining what you changed and why.

APOLLO FIELD SEMANTICS (these are RULES, not suggestions):

1. personTitles — array of DISCRETE job titles, OR-matched.
   ✓ Good: ["CFO", "Controller", "VP Finance"]
   ✗ Bad: ["Finance leaders"] (too vague, not a real title)
   ✗ Bad: ["CFO in California"] (location belongs in personLocations, not embedded in title)

2. personLocations — array of GEOGRAPHIC strings ONLY (cities, states, countries, metro areas).
   ✓ Good: ["United States", "California", "San Francisco CA", "Irvine California"]
   ✗ Bad: ["West Coast"] (too vague — pick states or major cities)
   ✗ Bad: ["Big cities"] (not a geographic identifier)
   ✗ Bad: ["SaaS companies in Irvine"] (industry phrase, not a location — extract "Irvine" only)

3. organizationKeywordTags — array of DISCRETE dictionary tags (one concept per tag), NEVER free-form phrases, NEVER locations, NEVER industries-as-prose.
   ✓ Good: ["SaaS", "FinTech", "Cybersecurity", "Manufacturing"]
   ✗ Bad: ["SaaS companies in Irvine"] (mixes industry + location — extract "SaaS" tag, move "Irvine" to personLocations)
   ✗ Bad: ["companies that use NetSuite"] (prose phrase — extract "NetSuite" tag only)
   ✗ Bad: ["West Coast"] (location, not an org tag — move to personLocations)

4. minEmployees / maxEmployees — integers.
   ✓ Good: 100, 500, 1000
   ✗ Bad: "100-500" (string range — split into min=100, max=500)
   ✗ Bad: "medium-sized" (qualitative — leave alone, can't infer)

NORMALIZATION RULES:
- If a value in organizationKeywordTags contains a clear geographic word (city/state/country/region), EXTRACT it to personLocations and KEEP the remaining industry/tech tag in organizationKeywordTags.
- If a value in personLocations contains a clear industry/tech phrase (SaaS, FinTech, NetSuite, ERP, etc.), EXTRACT it to organizationKeywordTags and KEEP the location.
- If a personTitle value is a vague descriptor ("Finance leaders", "Senior management"), leave it AS-IS but emit a correction with reason explaining it's too vague (do NOT silently drop).
- If a tag is a prose phrase like "companies that use X", extract the noun "X" as the tag.
- If a value is already clean and Apollo-compatible, DO NOT include it in corrections.

OUTPUT FORMAT (strict JSON, no markdown, no prose outside the JSON):
{
  "normalized": {
    "personTitles": [...],
    "personLocations": [...],
    "organizationKeywordTags": [...],
    "minEmployees": <int or null>,
    "maxEmployees": <int or null>
  },
  "corrections": [
    {
      "field": "organizationKeywordTags",
      "from": "Saas Companies in Irvine",
      "to": "SaaS (moved 'Irvine' to personLocations)",
      "reason": "Tag field expects discrete dictionary tags like 'SaaS'. 'Irvine' is a city — it belongs in personLocations."
    }
  ]
}

If no corrections are needed, return { "normalized": <input unchanged>, "corrections": [] }.

Return ONLY the JSON object. No prose. No markdown fences.`;

async function normalizeFiltersWithClaude(
  rawFilters: ApolloSearchFilters,
): Promise<ApolloNormalizeResult> {
  // Fast-path 1: SDK not configured → raw passthrough.
  if (!anthropicClient) {
    return {
      normalized: rawFilters,
      corrections: [],
      warning: 'Claude not configured — used your inputs as-is',
    };
  }

  try {
    // Race Claude against a 3-second budget. If Claude wins, parse + return.
    // If timeout wins, return raw + warning. Either way, /import is unblocked.
    const claudePromise = anthropicClient.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      temperature: 0,
      system: APOLLO_NORMALIZE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Normalize these Apollo filters:\n\n${JSON.stringify(rawFilters, null, 2)}`,
        },
      ],
    });

    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), 3000),
    );

    const winner = await Promise.race([claudePromise, timeoutPromise]);

    if (winner === 'TIMEOUT') {
      return {
        normalized: rawFilters,
        corrections: [],
        warning: 'Claude timed out — used your inputs as-is',
      };
    }

    // Claude responded — extract text block.
    const response = winner as Awaited<typeof claudePromise>;
    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : '';
    if (!text) {
      return {
        normalized: rawFilters,
        corrections: [],
        warning: 'Claude returned empty response — used your inputs as-is',
      };
    }

    // Parse strict JSON. Defensive: strip markdown fences if Claude added them.
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
    const parsed = JSON.parse(cleaned) as {
      normalized?: ApolloSearchFilters;
      corrections?: ApolloFilterCorrection[];
    };

    if (!parsed || typeof parsed !== 'object' || !parsed.normalized) {
      return {
        normalized: rawFilters,
        corrections: [],
        warning: 'Claude returned malformed JSON — used your inputs as-is',
      };
    }

    // Preserve fields Claude doesn't manage (organizationDomains, page, perPage).
    const merged: ApolloSearchFilters = {
      ...rawFilters,
      personTitles: parsed.normalized.personTitles ?? rawFilters.personTitles,
      personLocations: parsed.normalized.personLocations ?? rawFilters.personLocations,
      organizationKeywordTags:
        parsed.normalized.organizationKeywordTags ?? rawFilters.organizationKeywordTags,
      minEmployees: parsed.normalized.minEmployees ?? rawFilters.minEmployees,
      maxEmployees: parsed.normalized.maxEmployees ?? rawFilters.maxEmployees,
    };

    return {
      normalized: merged,
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
    };
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.normalize] Claude error:', err?.message || err);
    return {
      normalized: rawFilters,
      corrections: [],
      warning: 'Claude unavailable — used your inputs as-is',
    };
  }
}
```

**Step 1.3 — Update the `ApolloImportRequestBody` and `ApolloImportResponse` interfaces (they live just above the /import route):**

Change `ApolloImportRequestBody` to:
```ts
interface ApolloImportRequestBody {
  filters: ApolloSearchFilters;
  enrich?: boolean;
  autoNormalize?: boolean;   // quick-7: default true; set false to skip Claude normalization
}
```

Change `ApolloImportResponse` to include 2 new optional fields:
```ts
interface ApolloImportResponse {
  imported: number;
  skipped: number;
  total: number;
  contactIds: string[];
  suggestedStream: string;
  errors: Array<{ apolloPersonId: string; reason: string }>;
  corrections?: ApolloFilterCorrection[];   // quick-7: Claude's normalization explanations
  warning?: string;                          // quick-7: Claude unavailable / timed out message
}
```

**Step 1.4 — Inject autoNormalize into the /import handler.** Locate the existing line:
```ts
const { filters, enrich = true } = (req.body || {}) as ApolloImportRequestBody;
```

Change to:
```ts
const { filters, enrich = true, autoNormalize = true } = (req.body || {}) as ApolloImportRequestBody;
```

Then, immediately after the existing `filters` validation block:
```ts
if (!filters || typeof filters !== 'object') {
  return res.status(400).json({ error: 'filters object required' });
}
```

ADD this block (before the `const userId = ...` line):
```ts
// quick-7: Auto-normalize filters via Claude before hitting Apollo.
// Default ON — set autoNormalize:false in request body to opt out (e.g., scripted callers).
let effectiveFilters: ApolloSearchFilters = filters;
let corrections: ApolloFilterCorrection[] = [];
let normalizeWarning: string | undefined;
if (autoNormalize) {
  const nr = await normalizeFiltersWithClaude(filters);
  effectiveFilters = nr.normalized;
  corrections = nr.corrections;
  normalizeWarning = nr.warning;
}
```

Then in the `try` block, change:
```ts
const searchResp = await searchPeople(apiKey, filters);
```
to:
```ts
const searchResp = await searchPeople(apiKey, effectiveFilters);
```

Then at the end of the handler, update the response-body construction (line ~267) to append `corrections` and `warning`:
```ts
const body: ApolloImportResponse = {
  imported: contactIds.length,
  skipped,
  total: people.length,
  contactIds,
  suggestedStream,
  errors,
  corrections,
  ...(normalizeWarning ? { warning: normalizeWarning } : {}),
};
```

**Step 1.5 — Add a standalone POST /normalize-filters route immediately AFTER the /import handler closes (before the /send-campaign handler).** Paste verbatim:

```ts
// ---------------------------------------------------------------------------
// POST /api/apollo/normalize-filters  (quick-7)
// ---------------------------------------------------------------------------
// Standalone Claude-normalization endpoint. Returns { normalized, corrections, warning? }
// without performing an Apollo search. Useful for future client-side "preview my filters
// before searching" UX, scripted callers, or debugging.
//
// Auth: shares the router-level authenticate middleware.

router.post('/normalize-filters', async (req: Request, res: Response) => {
  const { filters } = (req.body || {}) as { filters?: ApolloSearchFilters };
  if (!filters || typeof filters !== 'object') {
    return res.status(400).json({ error: 'filters object required' });
  }

  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: 'unauthenticated' });

  const result = await normalizeFiltersWithClaude(filters);
  return res.status(200).json(result);
});
```

**Verification (local file edits):**
- `grep -c "normalizeFiltersWithClaude" backend/src/routes/apollo.ts` should return **3** (1 function decl + 1 call inside /import + 1 call inside /normalize-filters)
- `grep -c "autoNormalize" backend/src/routes/apollo.ts` should return **3** (interface field + destructure default + comment)
- `grep -c "claude-sonnet-4-6" backend/src/routes/apollo.ts` should return **1**
- `grep -c "Promise.race" backend/src/routes/apollo.ts` should return **1**
- `grep -c "router.post('/normalize-filters'" backend/src/routes/apollo.ts` should return **1**
- Phase-4 firewall verify: `git diff --name-only backend/src/routes/campaigns.ts backend/src/services/awsSES.ts backend/prisma/schema.prisma | wc -l` should return **0**

**DO NOT touch:**
- The /send-campaign handler (lines 286-408 in original)
- The 3-case Company find-or-update-or-create ladder from quick-6
- The Resend init block
- The VALID_STREAMS set
- backend/src/routes/campaigns.ts, backend/src/services/awsSES.ts, backend/prisma/schema.prisma (Phase 4 firewall)
  </action>
  <verify>
```bash
cd /Users/jeet/production-crm
grep -c "normalizeFiltersWithClaude" backend/src/routes/apollo.ts   # 3
grep -c "autoNormalize" backend/src/routes/apollo.ts                # 3
grep -c "claude-sonnet-4-6" backend/src/routes/apollo.ts            # 1
grep -c "Promise.race" backend/src/routes/apollo.ts                 # 1
grep -c "router.post('/normalize-filters'" backend/src/routes/apollo.ts  # 1
git diff --name-only backend/src/routes/campaigns.ts backend/src/services/awsSES.ts backend/prisma/schema.prisma | wc -l   # 0
```
  </verify>
  <done>
Backend apollo.ts has the normalizeFiltersWithClaude helper, the autoNormalize default-true injection in /import, and the standalone /normalize-filters route. Phase-4 firewall files untouched. Local `tsc --noEmit` is NOT required (production-crm has 170 known pre-existing TS errors in unrelated files per quick-5 SUMMARY; build script uses `tsc;` not `tsc &&` so apollo.js still emits).
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — api.ts types + ApolloSearchForm UX upgrades + ApolloPage results-panel corrections block</name>
  <files>frontend/src/services/api.ts, frontend/src/components/ApolloSearchForm.tsx, frontend/src/pages/Apollo/ApolloPage.tsx</files>
  <action>
**Three files. Edits are additive — DO NOT touch ContactList.tsx, NetSuiteCampaignWizard.tsx, or any other Phase-4 firewall files.**

---

**Step 2.1 — Edit `frontend/src/services/api.ts`** to extend the response type and add a standalone normalize method.

Locate the `ApolloImportResponse` interface (line ~428) and ADD 2 fields at the bottom:
```ts
export interface ApolloImportResponse {
  imported: number;
  skipped: number;
  total: number;
  contactIds: string[];
  suggestedStream: string;
  errors: Array<{ apolloPersonId: string; reason: string }>;
  // quick-7: Claude normalization output (when autoNormalize was true on the backend, default).
  corrections?: Array<{ field: string; from: string; to: string; reason: string }>;
  warning?: string;   // present when Claude was unavailable / timed out / errored — search still ran with raw filters
}
```

ADD a new interface immediately after `ApolloImportResponse`:
```ts
// quick-7: Standalone normalization response (from POST /api/apollo/normalize-filters).
export interface ApolloNormalizeResponse {
  normalized: ApolloSearchFilters;
  corrections: Array<{ field: string; from: string; to: string; reason: string }>;
  warning?: string;
}
```

ADD a new method to the `apolloApi` object (place it AFTER the `import:` method, BEFORE the `sendCampaign:` method):
```ts
  // quick-7: Standalone Claude normalization preview — no Apollo search performed.
  // Returns { normalized, corrections, warning? } so the UI can preview the corrections
  // BEFORE clicking Search. (Optional method — current Search flow piggybacks corrections
  // on /import's response. Kept here for future "preview" button or scripted callers.)
  normalize: async (
    filters: ApolloSearchFilters,
  ): Promise<ApolloNormalizeResponse> => {
    // Claude has its own 3s server-side budget — 10s axios default is plenty.
    const response = await apiClient.post('/apollo/normalize-filters', { filters });
    return response.data;
  },
```

**Step 2.2 — Edit `frontend/src/components/ApolloSearchForm.tsx`** to add placeholders + per-field ✓/✗ hints + "Common ICP examples" presets block.

REPLACE the entire file with the version below (keeps existing styles, types, and onSubmit contract — adds preset block at top, replaces 3 input groups' hints, leaves employee/perPage/enrich rows + submit button untouched):

```tsx
// frontend/src/components/ApolloSearchForm.tsx
//
// Phase 4 Plan 04 — Apollo prospecting search form.
// quick-7 — added: concrete placeholders + per-field ✓/✗ hints + "Common ICP examples" presets.
//
// Filters: titles, locations, keyword tags, employee range, perPage, enrich toggle.
// ICP industry-include / tech_uids filters are intentionally NOT here (locked-deferred to Phase 4.5).
//
// The form emits a normalized `ApolloSearchFilters` shape that matches the backend
// `POST /api/apollo/import` contract from plan 04-03 (see apollo.ts:filters).

import { useState } from 'react';
import type { ApolloSearchFilters } from '../services/api';

interface Props {
  onSubmit: (filters: ApolloSearchFilters, enrich: boolean) => void;
  isLoading: boolean;
}

interface IcpPreset {
  name: string;
  titles: string;
  locations: string;
  keywords: string;
  minEmp: string;
  maxEmp: string;
  note?: string;
}

// quick-7: Common ICP presets. Click → auto-fill the form. Note field surfaces ICP-refinement gotchas.
const ICP_PRESETS: IcpPreset[] = [
  {
    name: 'SaaS CFOs in California',
    titles: 'CFO, Controller, VP Finance',
    locations: 'California',
    keywords: 'SaaS',
    minEmp: '100',
    maxEmp: '500',
  },
  {
    name: 'NetSuite end-user customers (US)',
    titles: 'CFO, Controller, VP Finance',
    locations: 'United States',
    keywords: '',
    minEmp: '100',
    maxEmp: '1000',
    note: '⚠ Tag "NetSuite" returns consultancies. Leave blank + filter results manually for true end-users.',
  },
  {
    name: 'FinTech CFOs in New York',
    titles: 'CFO, Controller, VP Finance',
    locations: 'New York',
    keywords: 'FinTech',
    minEmp: '50',
    maxEmp: '500',
  },
  {
    name: 'Manufacturing VP Finance (US)',
    titles: 'VP Finance, CFO',
    locations: 'United States',
    keywords: 'Manufacturing',
    minEmp: '100',
    maxEmp: '500',
  },
];

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#CBD5E1',
  marginBottom: '6px',
  letterSpacing: '0.02em',
};

const fieldHintStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748B',
  marginTop: '4px',
  lineHeight: '1.5',
};

const goodHintStyle: React.CSSProperties = {
  color: '#34D399',
  fontWeight: 600,
};

const badHintStyle: React.CSSProperties = {
  color: '#FCA5A5',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  color: '#F1F5F9',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: '18px',
};

export function ApolloSearchForm({ onSubmit, isLoading }: Props) {
  const [titlesInput, setTitlesInput] = useState('CFO, Controller, VP Finance');
  const [locationsInput, setLocationsInput] = useState('United States');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [minEmployees, setMinEmployees] = useState('100');
  const [maxEmployees, setMaxEmployees] = useState('500');
  const [perPage, setPerPage] = useState('25');
  const [enrich, setEnrich] = useState(true);

  function applyPreset(p: IcpPreset) {
    setTitlesInput(p.titles);
    setLocationsInput(p.locations);
    setKeywordsInput(p.keywords);
    setMinEmployees(p.minEmp);
    setMaxEmployees(p.maxEmp);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const splitCsv = (s: string) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

    const filters: ApolloSearchFilters = {
      personTitles: splitCsv(titlesInput),
      personLocations: splitCsv(locationsInput),
      organizationKeywordTags: splitCsv(keywordsInput),
      minEmployees: parseInt(minEmployees, 10) || undefined,
      maxEmployees: parseInt(maxEmployees, 10) || undefined,
      perPage: Math.min(parseInt(perPage, 10) || 25, 25),
    };
    onSubmit(filters, enrich);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'rgba(22, 22, 37, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* quick-7: Common ICP examples collapsible */}
      <details
        style={{
          marginBottom: '20px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '12px',
          padding: '12px 14px',
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontWeight: 700,
            color: '#A5B4FC',
            fontSize: '13px',
            outline: 'none',
          }}
        >
          📋 Common ICP examples (click to fill)
        </summary>
        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
          {ICP_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#F1F5F9',
                cursor: 'pointer',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            >
              <div style={{ fontWeight: 700, color: '#A5B4FC', marginBottom: '2px' }}>
                {p.name}
              </div>
              <div style={{ color: '#94A3B8', fontSize: '12px' }}>
                Titles: {p.titles} · Locations: {p.locations} ·{' '}
                Tags: {p.keywords || '(none)'} · Emp: {p.minEmp}-{p.maxEmp}
              </div>
              {p.note && (
                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: '#FCD34D',
                    lineHeight: '1.4',
                  }}
                >
                  {p.note}
                </div>
              )}
            </button>
          ))}
        </div>
      </details>

      {/* Consultancy warning banner — RAJESH-HANDBOOK Section 6 / Pitfall 4 */}
      <div
        style={{
          background: 'rgba(234, 179, 8, 0.12)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          color: '#FCD34D',
          padding: '12px 14px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '13px',
          lineHeight: '1.5',
        }}
      >
        <strong>⚠ Heads up:</strong> Filtering by tech keyword tag (e.g. <code>NetSuite</code>)
        may match consultancies/partners instead of end-user customers. Prefer specific industry
        terms like <code>Manufacturing</code> or <code>Wholesale</code> when targeting buyers.
      </div>

      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>Job titles</label>
        <input
          type="text"
          value={titlesInput}
          onChange={(e) => setTitlesInput(e.target.value)}
          placeholder="CFO, Controller, VP Finance"
          style={inputStyle}
        />
        <div style={fieldHintStyle}>
          Comma-separated discrete titles. Apollo OR-matches across them.
          <br />
          <span style={goodHintStyle}>✓</span> CFO, Controller, VP Finance &nbsp;&nbsp;
          <span style={badHintStyle}>✗</span> Finance leaders, Senior management
        </div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>Locations</label>
        <input
          type="text"
          value={locationsInput}
          onChange={(e) => setLocationsInput(e.target.value)}
          placeholder="Irvine California, San Francisco CA, United States"
          style={inputStyle}
        />
        <div style={fieldHintStyle}>
          Geographic only — cities, states, countries.
          <br />
          <span style={goodHintStyle}>✓</span> Irvine California, San Francisco CA, United States &nbsp;&nbsp;
          <span style={badHintStyle}>✗</span> West Coast, Big cities
        </div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={fieldLabelStyle}>Company keyword tags</label>
        <input
          type="text"
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
          placeholder="SaaS, FinTech, Cybersecurity"
          style={inputStyle}
        />
        <div style={fieldHintStyle}>
          One discrete tag per CSV value. NOT a free-form phrase.
          <br />
          <span style={goodHintStyle}>✓</span> SaaS, FinTech, Cybersecurity &nbsp;&nbsp;
          <span style={badHintStyle}>✗</span> "SaaS companies in Irvine" — location belongs in Locations field
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div>
          <label style={fieldLabelStyle}>Min employees</label>
          <input
            type="number"
            min="1"
            value={minEmployees}
            onChange={(e) => setMinEmployees(e.target.value)}
            placeholder="100"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>Max employees</label>
          <input
            type="number"
            min="1"
            value={maxEmployees}
            onChange={(e) => setMaxEmployees(e.target.value)}
            placeholder="500"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>Per page (max 25)</label>
          <input
            type="number"
            min="1"
            max="25"
            value={perPage}
            onChange={(e) => setPerPage(e.target.value)}
            placeholder="25"
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '10px',
          marginBottom: '20px',
        }}
      >
        <input
          id="enrich-toggle"
          type="checkbox"
          checked={enrich}
          onChange={(e) => setEnrich(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <label
          htmlFor="enrich-toggle"
          style={{ fontSize: '13px', color: '#CBD5E1', cursor: 'pointer', flex: 1 }}
        >
          Reveal emails (uses ~1 Apollo credit per contact)
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: isLoading
            ? 'rgba(99, 102, 241, 0.3)'
            : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontWeight: 700,
          fontSize: '14px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          boxShadow: isLoading ? 'none' : '0 4px 16px rgba(99, 102, 241, 0.3)',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {isLoading ? 'Searching…' : '🔍 Search Apollo →'}
      </button>
    </form>
  );
}
```

**Step 2.3 — Edit `frontend/src/pages/Apollo/ApolloPage.tsx`** to render the corrections block + Claude-unavailable warning in the results panel.

Locate the result panel block (starts at `{result && !isLoading && (` around line 180). INSIDE the inner `<div>` (the one with `padding: '20px 22px'`), AFTER the existing `<h2>Import results</h2>` line but BEFORE the StatCard grid, ADD this conditional block:

```tsx
            {/* quick-7: Claude-refined-filters info block */}
            {result.corrections && result.corrections.length > 0 && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '12px 14px',
                  background: 'rgba(99, 102, 241, 0.10)',
                  border: '1px solid rgba(99, 102, 241, 0.28)',
                  borderRadius: '10px',
                  color: '#C7D2FE',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '6px', color: '#A5B4FC' }}>
                  🤖 Claude refined your filters
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {result.corrections.map((c, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>
                      <code style={codeStyle}>{c.field}</code>: "{c.from}" → "{c.to}" — {c.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* quick-7: Claude-unavailable warning (raw inputs were used) */}
            {result.warning && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '10px 14px',
                  background: 'rgba(234, 179, 8, 0.10)',
                  border: '1px solid rgba(234, 179, 8, 0.28)',
                  borderRadius: '10px',
                  color: '#FCD34D',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              >
                ⚠ {result.warning}
              </div>
            )}

```

**Verification (local file edits):**
```bash
cd /Users/jeet/production-crm
grep -c "corrections?" frontend/src/services/api.ts                  # >= 1
grep -c "ApolloNormalizeResponse" frontend/src/services/api.ts       # >= 2 (interface + return type)
grep -c "normalize:" frontend/src/services/api.ts                    # >= 1 (new apolloApi.normalize method)
grep -c "Common ICP examples" frontend/src/components/ApolloSearchForm.tsx   # 1
grep -c "ICP_PRESETS" frontend/src/components/ApolloSearchForm.tsx   # 2 (declaration + map call)
grep -c "applyPreset" frontend/src/components/ApolloSearchForm.tsx   # 2 (declaration + onClick)
grep -c "Claude refined your filters" frontend/src/pages/Apollo/ApolloPage.tsx  # 1
grep -c "result.corrections" frontend/src/pages/Apollo/ApolloPage.tsx           # >= 2 (length check + map)
git diff --name-only frontend/src/pages/Contacts/ContactList.tsx frontend/src/components/NetSuiteCampaignWizard.tsx | wc -l  # 0
```

**DO NOT touch:**
- ContactList.tsx
- NetSuiteCampaignWizard.tsx
- Any campaigns/* files
- backend/prisma/schema.prisma
  </action>
  <verify>
```bash
cd /Users/jeet/production-crm
grep -c "corrections?" frontend/src/services/api.ts
grep -c "ApolloNormalizeResponse" frontend/src/services/api.ts
grep -c "normalize:" frontend/src/services/api.ts
grep -c "Common ICP examples" frontend/src/components/ApolloSearchForm.tsx
grep -c "ICP_PRESETS" frontend/src/components/ApolloSearchForm.tsx
grep -c "Claude refined your filters" frontend/src/pages/Apollo/ApolloPage.tsx
git diff --name-only frontend/src/pages/Contacts/ContactList.tsx frontend/src/components/NetSuiteCampaignWizard.tsx | wc -l
```
  </verify>
  <done>
api.ts has the new corrections/warning fields on ApolloImportResponse plus ApolloNormalizeResponse interface + apolloApi.normalize method. ApolloSearchForm.tsx has the ICP presets <details> block, applyPreset() handler, concrete placeholders, and per-field ✓/✗ hints on all 3 CSV inputs. ApolloPage.tsx renders the "🤖 Claude refined your filters" block when corrections is non-empty and a yellow "Claude unavailable" warning when warning is set. ContactList.tsx and NetSuiteCampaignWizard.tsx untouched.
  </done>
</task>

<task type="auto">
  <name>Task 3: Commit + build + deploy backend & frontend to EC2 + 3-case live verify</name>
  <files>
    backend/src/routes/apollo.ts,
    frontend/src/services/api.ts,
    frontend/src/components/ApolloSearchForm.tsx,
    frontend/src/pages/Apollo/ApolloPage.tsx
  </files>
  <action>
**All work happens in `/Users/jeet/production-crm/`.**

**Step 3.1 — Single atomic commit on `production` branch.**

```bash
cd /Users/jeet/production-crm
git status
git diff --stat backend/src/routes/apollo.ts \
                frontend/src/services/api.ts \
                frontend/src/components/ApolloSearchForm.tsx \
                frontend/src/pages/Apollo/ApolloPage.tsx

git add backend/src/routes/apollo.ts \
        frontend/src/services/api.ts \
        frontend/src/components/ApolloSearchForm.tsx \
        frontend/src/pages/Apollo/ApolloPage.tsx

# Phase-4 firewall: confirm nothing else was staged
git diff --cached --name-only
# Expected exactly 4 lines, matching the files above. If anything else shows → unstage with git reset HEAD <path>.

git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "$(cat <<'EOF'
feat(quick-7): Apollo Claude auto-normalize on search + form UX upgrades

Backend (apollo.ts):
- Add normalizeFiltersWithClaude() helper using claude-sonnet-4-6 with strict-JSON
  system prompt teaching Apollo's field semantics (titles vs locations vs tags vs employees)
- 3-second Promise.race timeout falls back to raw filters + warning — never blocks search
- New POST /api/apollo/normalize-filters route (standalone preview endpoint)
- Inject autoNormalize (default true) into POST /api/apollo/import; append corrections + warning to response

Frontend:
- api.ts: ApolloImportResponse extended with corrections + warning; new ApolloNormalizeResponse
  interface; new apolloApi.normalize() method for future preview UX
- ApolloSearchForm.tsx: "Common ICP examples" <details> collapsible with 4 clickable presets
  (SaaS CFOs CA, NetSuite end-users US, FinTech NYC, Manufacturing US) + per-field placeholders +
  per-field ✓/✗ green/red hints distinguishing valid syntax from common mistakes
- ApolloPage.tsx: results panel renders "🤖 Claude refined your filters" info block when
  corrections is non-empty; yellow "Claude unavailable" warning when fallback was used

Closes: Rajesh's "Saas Companies in Irvine" keyword-tag bug (now auto-fixes to
SaaS tag + Irvine location with corrections explanation).

Phase-4 firewall verified: campaigns.ts, awsSES.ts, NetSuiteCampaignWizard.tsx,
ContactList.tsx, schema.prisma → 0 line changes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git log --oneline -1
# Verify: author should show jeet-avatar <jm@techcloudpro.com>
git log -1 --format='%an <%ae>'

# Fast-forward push (NEVER --force)
git push origin production
```

**Step 3.2 — Build backend & frontend locally.**

```bash
cd /Users/jeet/production-crm/backend
npm run build
# tsc; cp src/routes/emailTracking.js dist/routes/emailTracking.js
# 170 pre-existing TS errors in unrelated files (quotes, contracts, etc.) are EXPECTED — build script uses `tsc;` not `tsc &&`
ls -la dist/routes/apollo.js
grep -c "normalizeFiltersWithClaude" dist/routes/apollo.js   # >= 3 (function + 2 callers)
grep -c "claude-sonnet-4-6" dist/routes/apollo.js            # 1
grep -c "Promise.race" dist/routes/apollo.js                 # 1

cd /Users/jeet/production-crm/frontend
npm run build
ls -la dist/index.html dist/assets/ | head -20
grep -rE "Common ICP examples" dist/assets/ | head -3        # >= 1
grep -rE "Claude refined your filters" dist/assets/ | head -3  # >= 1
```

**Step 3.3 — Deploy backend dist to EC2 `/var/www/crm-backend/dist/`.**

```bash
# Local tarball
cd /Users/jeet/production-crm/backend
tar -czf /tmp/quick7-backend.tar.gz -C dist .
ls -la /tmp/quick7-backend.tar.gz

# scp to EC2 home
scp /tmp/quick7-backend.tar.gz ec2-user@<EC2_HOST>:/tmp/quick7-backend.tar.gz
# (Use the EC2 host from prior quick tasks — same key, same user, same host)

# Remote extract: stage in /tmp/, then sudo rsync into /var/www/crm-backend/dist/
ssh ec2-user@<EC2_HOST> <<'REMOTE'
  set -e
  mkdir -p /tmp/quick7-stage
  tar -xzf /tmp/quick7-backend.tar.gz -C /tmp/quick7-stage
  sudo rsync -a /tmp/quick7-stage/ /var/www/crm-backend/dist/
  rm -rf /tmp/quick7-stage /tmp/quick7-backend.tar.gz
  sudo grep -c "normalizeFiltersWithClaude" /var/www/crm-backend/dist/routes/apollo.js
  sudo grep -c "claude-sonnet-4-6" /var/www/crm-backend/dist/routes/apollo.js
  sudo grep -c "Promise.race" /var/www/crm-backend/dist/routes/apollo.js
REMOTE

# Expected outputs: 3 (or more), 1, 1
```

**Step 3.4 — Deploy frontend dist to EC2 `/var/www/brandmonkz/` (with stale-chunk eviction).**

```bash
# Local tarball
cd /Users/jeet/production-crm/frontend
tar -czf /tmp/quick7-frontend.tar.gz -C dist .
ls -la /tmp/quick7-frontend.tar.gz

scp /tmp/quick7-frontend.tar.gz ec2-user@<EC2_HOST>:/tmp/quick7-frontend.tar.gz

ssh ec2-user@<EC2_HOST> <<'REMOTE'
  set -e
  # CRITICAL: evict stale Vite lazy chunks per global memory rule
  # (reference_vite_stale_lazy_chunk_trap.md — entry hash stable, lazy hash rotates)
  sudo rm -rf /var/www/brandmonkz/assets
  mkdir -p /tmp/quick7-fe-stage
  tar -xzf /tmp/quick7-frontend.tar.gz -C /tmp/quick7-fe-stage
  sudo rsync -a --delete /tmp/quick7-fe-stage/ /var/www/brandmonkz/
  rm -rf /tmp/quick7-fe-stage /tmp/quick7-frontend.tar.gz
  ls -la /var/www/brandmonkz/index.html
  sudo grep -roE "Common ICP examples" /var/www/brandmonkz/assets/ | wc -l   # >= 1
  sudo grep -roE "Claude refined your filters" /var/www/brandmonkz/assets/ | wc -l   # >= 1
REMOTE
```

**Step 3.5 — pm2 restart with env reload (locked recipe from quick-6).**

```bash
ssh ec2-user@<EC2_HOST> <<'REMOTE'
  cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env
  pm2 status crm-backend
  # Verify ANTHROPIC_API_KEY made it into pm2 env (substring only — never echo full secret):
  pm2 env crm-backend 2>/dev/null | grep -E "^ANTHROPIC_API_KEY=" | sed 's/=.*/= [REDACTED LENGTH-CHECK]/'
  # Expect a non-empty value present
REMOTE
```

**Step 3.6 — Live verify (3 cases). Mint JWT with userId claim per quick-6 gotcha.**

Use the existing JWT-minting pattern from quick-6: `userId: 'cmmziuiuy0000vp5wstob71f7'`, `issuer: 'crm-api'`, `audience: 'crm-client'`, 15-min exp. Set browser-like User-Agent.

```bash
# Mint a 15-min JWT on EC2 using the live secret (do NOT export to local):
JWT=$(ssh ec2-user@<EC2_HOST> 'cd /var/www/crm-backend && node -e "
  require(\"dotenv\").config();
  const jwt = require(\"jsonwebtoken\");
  console.log(jwt.sign(
    { userId: \"cmmziuiuy0000vp5wstob71f7\" },
    process.env.JWT_SECRET,
    { issuer: \"crm-api\", audience: \"crm-client\", expiresIn: \"15m\" }
  ));
"')
echo "JWT minted (length): ${#JWT}"
# Expect length > 200

UA='Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0'
BASE='https://brandmonkz.com'

# ---- Case A: /normalize-filters with dirty input ----
# Expect: corrections array shows Irvine moved to personLocations + SaaS extracted as tag
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/api/apollo/normalize-filters" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "User-Agent: $UA" \
  -d '{"filters":{"personTitles":["CFO"],"personLocations":["United States"],"organizationKeywordTags":["Saas Companies in Irvine"]}}' \
  | tee /tmp/quick7-caseA.json
# Assertions:
#  - HTTP 200
#  - corrections is non-empty
#  - normalized.organizationKeywordTags includes "SaaS" (or similar) WITHOUT the "Irvine" substring
#  - normalized.personLocations includes "Irvine" (case-insensitive)

# ---- Case B: /import with dirty input + autoNormalize true (default) + small perPage ----
# Expect: HTTP 200, imported >= 0 (real Apollo response — could be 0 if no matches but no crash),
#         corrections non-empty, no P2002, no regression
curl -s -w "\nHTTP %{http_code}\n" --max-time 130 -X POST "$BASE/api/apollo/import" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "User-Agent: $UA" \
  -d '{"filters":{"personTitles":["CFO"],"personLocations":["United States"],"organizationKeywordTags":["Saas Companies in Irvine"]},"enrich":true,"perPage":3}' \
  | tee /tmp/quick7-caseB.json
# Assertions:
#  - HTTP 200
#  - response.corrections is non-empty
#  - response.imported is a number (>= 0; real Apollo data may vary)
#  - response.warning is NOT present (Claude succeeded)

# ---- Case C: /import with CLEAN input (no false positives) ----
# Expect: HTTP 200, corrections is [] (empty), search runs normally
curl -s -w "\nHTTP %{http_code}\n" --max-time 130 -X POST "$BASE/api/apollo/import" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "User-Agent: $UA" \
  -d '{"filters":{"personTitles":["CFO","Controller","VP Finance"],"personLocations":["United States"],"organizationKeywordTags":["SaaS"],"minEmployees":100,"maxEmployees":500,"perPage":3},"enrich":true}' \
  | tee /tmp/quick7-caseC.json
# Assertions:
#  - HTTP 200
#  - response.corrections is [] (zero false positives)
#  - response.imported is a number >= 0

# ---- pm2 error-log scan post-deploy ----
ssh ec2-user@<EC2_HOST> 'pm2 logs crm-backend --err --lines 200 --nostream | grep -cE "P2002|companies_domain_key|PrismaClientKnownRequestError|normalizeFiltersWithClaude"'
# Expect 0 NEW errors (the 2 pre-existing P2002 from old code may still appear — confirm by checking timestamps in pm2 logs)
```

**Step 3.7 — Browser-driven user-facing smoke (final sanity).**

Open `https://brandmonkz.com/apollo` in Rajesh's already-logged-in browser. Verify visually:
1. The "📋 Common ICP examples (click to fill)" <details> block is present at the top of the form
2. Clicking "SaaS CFOs in California" populates all 4 inputs
3. Each of titles / locations / keyword tags fields shows a green ✓ example and a red ✗ counter-example below the input
4. Type `Saas Companies in Irvine` into the keyword tags field → click Search
5. Within ~10-60s, the results panel renders with:
   - A purple-bordered "🤖 Claude refined your filters" info block listing the correction
   - The 4 StatCards (Imported / Skipped / Total / Suggested stream) below the corrections block
6. Re-run with the SaaS CFOs CA preset — the corrections block should NOT appear (corrections=[])

**Step 3.8 — Self-check checklist.**

- [ ] `git log -1 --format='%an <%ae>'` shows `jeet-avatar <jm@techcloudpro.com>`
- [ ] `git log -1 --name-only` lists exactly the 4 modified files
- [ ] Phase-4 firewall: `git diff HEAD~1 -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts frontend/src/components/NetSuiteCampaignWizard.tsx frontend/src/pages/Contacts/ContactList.tsx backend/prisma/schema.prisma | wc -l` returns **0**
- [ ] origin/production HEAD matches local HEAD
- [ ] Backend dist on EC2 has normalizeFiltersWithClaude (>= 3 refs)
- [ ] Frontend dist on EC2 has "Common ICP examples" and "Claude refined your filters" strings
- [ ] pm2 status = online, no new P2002 errors
- [ ] Case A: 200 + corrections non-empty
- [ ] Case B: 200 + corrections non-empty + imported is a number
- [ ] Case C: 200 + corrections=[] (no false positives)
- [ ] Browser visual smoke passed (presets, hints, corrections block)

**Step 3.9 — Write SUMMARY.md.**

Create `/Users/jeet/production-crm/.planning/quick/7-apollo-form-claude-auto-correct-on-searc/7-SUMMARY.md` following the structure of `6-SUMMARY.md`. Include:
- Frontmatter (commit hash, files modified, decisions, metrics)
- "What Shipped" section (3-bullet summary: backend, frontend api+form, frontend results panel)
- Commit table (hash, subject, author, branch)
- Deploy section (backend dist + frontend dist + pm2 verification)
- Live Verification section (Case A/B/C with HTTP codes + JSON excerpts)
- Phase-4 firewall verification (git diff line-count proof)
- Self-Check: PASSED checklist

Then commit the SUMMARY:

```bash
cd /Users/jeet/production-crm
git add .planning/quick/7-apollo-form-claude-auto-correct-on-searc/7-PLAN.md \
        .planning/quick/7-apollo-form-claude-auto-correct-on-searc/7-SUMMARY.md
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "$(cat <<'EOF'
docs(quick-7): PLAN + SUMMARY for Apollo Claude auto-correct on Search

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin production
```

Then update STATE.md `Last activity` line per the established pattern (one paragraph, what shipped + commit hash + live-verify summary).
  </action>
  <verify>
```bash
cd /Users/jeet/production-crm
git log -2 --oneline
git log -1 --format='%an <%ae>'  # jeet-avatar <jm@techcloudpro.com>

# Firewall proof
git diff HEAD~2 -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts frontend/src/components/NetSuiteCampaignWizard.tsx frontend/src/pages/Contacts/ContactList.tsx backend/prisma/schema.prisma | wc -l
# Expect 0

# Files-modified proof (code commit + docs commit = HEAD~2..HEAD)
git diff HEAD~2 --name-only
# Expect exactly 6 files: 4 code + 2 docs (PLAN + SUMMARY)

# Origin sync
git rev-parse HEAD
git rev-parse origin/production
# Both SHAs equal

# Live smoke recap (assuming Case A/B/C tee'd to /tmp/)
jq '.corrections | length' /tmp/quick7-caseA.json     # > 0
jq '.corrections | length' /tmp/quick7-caseB.json     # > 0
jq '.corrections | length' /tmp/quick7-caseC.json     # == 0
```
  </verify>
  <done>
- Single atomic code commit on `production` with all 4 file edits; SUMMARY commit follows
- `origin/production` fast-forward push successful (local HEAD == origin SHA)
- Backend dist on EC2 has normalizeFiltersWithClaude (>= 3 refs) and claude-sonnet-4-6 + Promise.race
- Frontend dist on EC2 has "Common ICP examples" and "Claude refined your filters" strings
- pm2 crm-backend = online, restart_time incremented by 1, ANTHROPIC_API_KEY in env
- Case A (`/normalize-filters` with dirty input) → 200 + non-empty corrections
- Case B (`/import` with dirty input + autoNormalize true) → 200 + corrections non-empty + imported is a number
- Case C (`/import` with clean input) → 200 + corrections=[] (no false positives)
- Phase-4 firewall: git diff between HEAD~2 (pre-quick-7) and HEAD over campaigns.ts / awsSES.ts / NetSuiteCampaignWizard.tsx / ContactList.tsx / schema.prisma → 0 lines
- SUMMARY.md committed and pushed
- STATE.md `Last activity` updated
- Rajesh can type "Saas Companies in Irvine" → click Search → see Apollo contacts AND see "🤖 Claude refined your filters" explanation
  </done>
</task>

</tasks>

<verification>
## Phase-level checks (run after all 3 tasks complete)

**Code surface:**
- `grep -c "normalizeFiltersWithClaude" /Users/jeet/production-crm/backend/src/routes/apollo.ts` returns **3**
- `grep -c "Common ICP examples" /Users/jeet/production-crm/frontend/src/components/ApolloSearchForm.tsx` returns **1**
- `grep -c "Claude refined your filters" /Users/jeet/production-crm/frontend/src/pages/Apollo/ApolloPage.tsx` returns **1**

**Firewall (most-critical):**
```bash
cd /Users/jeet/production-crm
git diff HEAD~2 -- \
  backend/src/routes/campaigns.ts \
  backend/src/services/awsSES.ts \
  frontend/src/components/NetSuiteCampaignWizard.tsx \
  frontend/src/pages/Contacts/ContactList.tsx \
  backend/prisma/schema.prisma | wc -l
# Expect: 0
```

**Live smoke:**
- Case A POST `/api/apollo/normalize-filters` with dirty input → HTTP 200 + corrections.length > 0
- Case B POST `/api/apollo/import` with dirty input + autoNormalize:true → HTTP 200 + corrections.length > 0 + imported is a number
- Case C POST `/api/apollo/import` with clean input → HTTP 200 + corrections.length === 0

**pm2 health:**
- `pm2 status crm-backend` = `online`
- pm2 error log shows 0 NEW P2002 or normalizeFiltersWithClaude crashes since post-deploy restart

**Browser visual:**
- `https://brandmonkz.com/apollo` shows ICP presets <details>, per-field ✓/✗ hints, and (when filters are dirty) the "🤖 Claude refined your filters" block in results
</verification>

<success_criteria>
1. **Rajesh's "Saas Companies in Irvine" bug closes end-to-end:** Type it into the keyword tags field → click Search → Apollo returns real contacts → results panel shows the Claude corrections.
2. **Form teaches Apollo semantics visually:** 4 ICP presets at the top + per-field ✓/✗ hints make it obvious what each field expects.
3. **Zero false positives:** When inputs are already clean, corrections=[] and there's no spurious info block.
4. **Never blocks search:** If Claude times out (>3s) or errors, /import still completes with raw filters and a yellow "Claude unavailable" warning.
5. **No regression:** quick-6's per-call 120s timeout, 3-case Company ladder, and pre-Phase-4 firewall (campaigns.ts/awsSES.ts/NetSuiteCampaignWizard.tsx/ContactList.tsx/schema.prisma) all remain intact and untouched.
6. **Single atomic code commit + docs commit on `production`, fast-forward push, author = `jeet-avatar <jm@techcloudpro.com>`.**
7. **Deployed via tarball+scp + locked pm2 env-reload-restart recipe** — no manual ECS/ECR/docker, no deploy.sh, no force-push.
</success_criteria>

<output>
After completion, create `/Users/jeet/production-crm/.planning/quick/7-apollo-form-claude-auto-correct-on-searc/7-SUMMARY.md` following the structure of `6-SUMMARY.md` (frontmatter + What Shipped + Commit + Deploy + Live Verification + Firewall + Self-Check). Update STATE.md `Last activity` line.
</output>
