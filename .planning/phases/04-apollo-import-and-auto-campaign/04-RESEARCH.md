# Phase 4: Apollo Import + Auto-Campaign — Research

**Researched:** 2026-05-30
**Domain:** Apollo.io REST integration + Prisma persistence + React multi-step wizard + AWS SES send
**Confidence:** HIGH (all source-of-truth files read; one EC2-side fact stays UNVERIFIABLE per quick-354)

---

## Summary

Phase 4 is a **wire-up phase, not a discovery phase**. The four moving pieces already exist independently in the codebase:

| Piece | Status | Where |
|-------|--------|-------|
| Apollo API client logic | EXISTS in Python | `scripts/video-pipeline/apollo-import-prospects.py` (lines 76-145) |
| Apollo import modal UI shell | EXISTS, commented out | `frontend/src/components/ApolloImportModal.tsx` + `ContactList.tsx:13,72,1118-1127` |
| Stream classifier | EXISTS as a pure function | `backend/src/routes/job-leads.routes.ts:44-82` |
| 4-step wizard pattern | EXISTS in `FollowUpWizard` + `quick/4-PLAN.md` spec | `frontend/src/components/FollowUpWizard.tsx`, `JobLeads/JobLeadsPage.tsx:6` |
| Email send pipeline (SES, tracking pixel) | EXISTS | `backend/src/routes/campaigns.ts:474-609` |
| Contact/Company Prisma create patterns | EXISTS | `backend/src/routes/job-leads.routes.ts:462-503`, `enrichment.ts:80-141` |

What does **not** exist: (a) backend route `POST /api/contacts/apollo-import`; (b) TypeScript port of the Python Apollo client; (c) backend `stream` field on `Contact` (currently a Python-script-only concept that Job Leads computes ad-hoc); (d) `NetSuiteCampaignWizard.tsx` component (designed in `quick/4-PLAN.md`, never built); (e) stream → EmailTemplate routing; (f) wiring from import-success → wizard.

**Primary recommendation:** Build 4 thin tasks — (1) Prisma migration + classifier extraction, (2) TS Apollo client + `/api/contacts/apollo-import` route, (3) restore + extend `ApolloImportModal` (move from Contacts page to Job Leads page since the wizard already lives there and Phase 4's goal is "auto-campaign", not "manual import"), (4) build `NetSuiteCampaignWizard` per `quick/4-PLAN.md` with one additive change: accept `preSelectedIds` AND `streamHint` AND default to the imported contacts' DB IDs instead of `JobLead[]`. **Use Option (a) — pre-seeded one EmailTemplate per stream — for stream→template routing.** Defer ICP-filter gap (`--exclude-industries`) to Phase 4.5 or treat as smoke-test scope limitation (use a known-good ICP query for the end-to-end smoke).

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **REQ-040** | "Import from Apollo" button launches an import flow | Restore `ApolloImportModal.tsx:1-321` (commented at `ContactList.tsx:13,72,1118-1127`); decide host page (Contacts vs JobLeads — recommend JobLeads, see Section 6). Button styling: mirror `JobLeadsPage.tsx` "Get Fresh Leads" pattern. |
| **REQ-041** | Backend route hits `/v1/mixed_people/api_search` + `/v1/people/match` | New file `backend/src/routes/apollo.ts` (mounted at `app.ts:302` next to enrichmentRoutes). Port Python logic from `scripts/video-pipeline/apollo-import-prospects.py:76-145` to TypeScript using `axios` (already in deps, `aiEnrichment.ts:11`). Endpoint: `POST /api/apollo/import` (cleaner than nesting under `/contacts`). |
| **REQ-042** | Imported contacts get stream classification | Extract `classifyStream()` from `job-leads.routes.ts:44-82` into `backend/src/lib/streamClassifier.ts`. Add `stream String?` to Contact + Company in `prisma/schema.prisma`. Classify on save inside the Apollo route using the person's title + their organization's industry/keywords. |
| **REQ-043** | On import success, NetSuiteCampaignWizard launches pre-filled | Build `NetSuiteCampaignWizard.tsx` per `quick/4-PLAN.md` BUT with adjusted props: `(importedContactIds: string[], suggestedStream: string)` instead of `(leads: JobLead[], preSelectedIds: Set<number>)`. ApolloImportModal returns the contact IDs in its success response; ContactList/JobLeadsPage handles the modal→wizard handoff via React state. |
| **REQ-044** | End-to-end smoke: 1 real Apollo contact → DB → wizard → real email send | Smoke command in `verify` block. Requires APOLLO_API_KEY in EC2 `.env` (key `TQHaQL…sGGA` per memory `project_brandmonkz_two_divergent_repos`). Plan must NOT depend on key at plan-time; only smoke-test time. SES already wired (`campaigns.ts:475`). |

---

## 1. Existing Code Reuse — File-Line Map

### Direct reuse (extend, don't rewrite)

| What | File:Line | Reuse Pattern |
|------|-----------|--------------|
| `ApolloImportModal.tsx` (321 lines) | `frontend/src/components/ApolloImportModal.tsx:1-321` | Restore from commented state. Keep 3-step flow (Filters → Importing → Complete). Extend Step 3 to add a "Start campaign now →" button that surfaces `importResults.contactIds`. |
| `classifyStream(title, description)` pure fn | `backend/src/routes/job-leads.routes.ts:44-82` | EXTRACT into `backend/src/lib/streamClassifier.ts` so both Job Leads and Apollo import use the same logic. Zero behavioral change. |
| `companyToDomain(name)` pure fn | `backend/src/routes/job-leads.routes.ts:23-31` | Optionally extract to same lib file. Useful when Apollo doesn't surface a domain. |
| `prisma.company.findFirst + create` pattern | `backend/src/routes/job-leads.routes.ts:464-480` | Copy the find-or-create flow verbatim. Use Apollo's `organization.name` instead of `lead.companyName`. |
| `prisma.contact.create` with `source` field | `backend/src/routes/job-leads.routes.ts:485-497`, `enrichment.ts:117-130` | Copy. Set `source: 'apollo'`. Set `firstName`/`lastName` from Apollo `first_name`/`last_name`, not literal "Hiring Manager". |
| 4-step wizard skeleton + step indicator | `frontend/src/components/FollowUpWizard.tsx:127-400` | Use as visual + state-management reference for `NetSuiteCampaignWizard.tsx`. Pattern: `useState<1|2|3|4>(1)` + dot indicator + back/next buttons. The `quick/4-PLAN.md` task 1 already specifies the visual; FollowUpWizard is the existing in-codebase precedent. |
| `emailComposerApi.create + send` per-recipient loop | `quick/4-PLAN.md:147-154`, `api.ts:263-276` | The quick-04 plan already specifies this send strategy. Verified: `emailComposerApi.send` is wired (`api.ts:273-276`) AND backend `/email-composer/:id/send` exists (`emailComposer.ts:177-218`). |
| `STREAMS` array + `STREAM_BADGE_STYLES` map | `frontend/src/pages/JobLeads/JobLeadsPage.tsx:6-22` | Canonical stream list (14 streams incl. "All"). Wizard must filter to the suggested stream the same way `JobLeadsPage` does. |
| AWS SES send + tracking pixel | `backend/src/routes/campaigns.ts:474-609` | If we send via `Campaign` (not `EmailComposer`) the wizard gets free SES + open-tracking. See Section 6 for the decision. |
| AI generate content endpoint | `backend/src/routes/campaigns.ts:373-450` | Existing `POST /api/campaigns/ai/generate-content` — wizard Step 2 "Let AI write it for me ✨" button calls this. No new endpoint needed. |

### Net-new code (no existing equivalent)

| What | Why |
|------|-----|
| `backend/src/lib/apolloClient.ts` (~120 LOC) | TS port of Python script. Two functions: `searchPeople(filters)` and `enrichPerson(personId)`. |
| `backend/src/routes/apollo.ts` (~140 LOC) | Express route: `POST /api/apollo/import` orchestrates search → enrich → classify → upsert Company → create Contact → return IDs. |
| `frontend/src/components/NetSuiteCampaignWizard.tsx` (~600 LOC per `quick/4-PLAN.md`) | The 4-step wizard. Variant adjustment: accept `importedContactIds` (string[]) and `suggestedStream` (string). |
| `prisma/migrations/{ts}_add_stream_and_apollo_id/migration.sql` | Add `stream` to Contact + Company; add `apolloId` + `apolloOrgId` for dedup. |
| `seeds/stream-templates.ts` (~150 LOC) | One-time seed: 8 stream-specific `EmailTemplate` rows. Idempotent (only inserts if missing). |

---

## 2. Schema Migrations Needed

### Current state (verified against `prisma/schema.prisma`)

| Field | Contact | Company | EmailTemplate | Notes |
|-------|---------|---------|---------------|-------|
| `stream` | **MISSING** | **MISSING** | **MISSING** | Currently a runtime concept (Job Leads computes per-fetch, throws away). Phase 4 needs it persisted on Contact + Company. |
| `apolloId` / `apolloPersonId` | **MISSING** | n/a | n/a | Needed for dedup on re-import. |
| `apolloOrgId` | n/a | **MISSING** | n/a | Same. |
| `source: String?` | EXISTS (line 248) | n/a (uses `dataSource`, line 318) | n/a | Already used: `'AI_ENRICHMENT'` (enrichment.ts:126), `'job_board'` (job-leads.routes.ts:491). Add new value `'apollo'` — no schema change needed. |
| `Company.dataSource` already lists `"apollo"` in the comment | EXISTS (line 318: `"manual", "apollo", "csv_import", "ai_enrichment"`) | n/a | The comment was aspirational; **field exists, value is undefined elsewhere in code**. Use it. |

### Required migration

```prisma
// File: prisma/schema.prisma — additions only

model Contact {
  // ... existing fields unchanged ...

  // Stream classification (Phase 4)
  stream         String?   // 'NetSuite' | 'AI/ML' | 'Cloud/DevOps' | 'Cybersecurity' |
                           // 'Data/Analytics' | 'Mobile' | 'Enterprise/ERP' |
                           // 'Staffing/HR' | 'Other'

  // Apollo origin tracking (Phase 4)
  apolloPersonId String?   @unique // Apollo's person.id — used for dedup
  apolloRawData  Json?              // Raw Apollo person payload for debugging

  // ... existing relationships ...

  @@index([stream])  // wizards filter on this
  @@index([apolloPersonId])
}

model Company {
  // ... existing fields unchanged ...

  // Stream classification (Phase 4)
  stream         String?   // mirrors Contact.stream; helps when wizard groups by company

  // Apollo origin tracking
  apolloOrgId    String?   @unique
  apolloRawData  Json?

  @@index([stream])
  @@index([apolloOrgId])
}
```

**EmailTemplate** needs **NO schema changes** — existing `category` field (line 551, defaults `"General"`) is used to route by stream. Plan seeds 8 templates with `category` = `"Stream:NetSuite"`, `"Stream:AI/ML"`, etc. The wizard queries `prisma.emailTemplate.findFirst({ where: { category: \`Stream:\${suggestedStream}\`, userId } })`.

### Migration commands

Per `STATE.md:14`: Phase 3 already established that `prisma migrate dev` requires TTY. Use the same pattern Phase 3 used:

```bash
# Local dev
cd backend && npx prisma db push --skip-generate
# Production (via CI)
cd backend && npx prisma migrate deploy  # already in deploy-aws.yml:55
```

For audit trail, hand-write the SQL file: `prisma/migrations/manual/04-add-stream-and-apollo-fields.sql`.

---

## 3. Apollo TypeScript Port

### Endpoints + request shape (from Python script)

| Operation | URL | Method | Headers | Body | Source |
|-----------|-----|--------|---------|------|--------|
| Search people | `https://api.apollo.io/api/v1/mixed_people/api_search` | POST | `X-Api-Key`, `Content-Type: application/json`, `Cache-Control: no-cache` | `{ person_titles, q_organization_keyword_tags, organization_num_employees_ranges, person_locations, page, per_page, contact_email_status }` | `apollo-import-prospects.py:87-103` |
| Enrich person (reveal email) | `https://api.apollo.io/api/v1/people/match` | POST | same | `{ id, reveal_personal_emails: false }` | `apollo-import-prospects.py:129-135` |

### TypeScript types (minimum viable)

```typescript
// backend/src/lib/apolloClient.ts

const APOLLO_BASE = 'https://api.apollo.io/api/v1';

export interface ApolloSearchFilters {
  personTitles?: string[];
  personLocations?: string[];
  organizationDomains?: string[];          // exists in modal but unused in Python script — Apollo supports `q_organization_domains_list`
  organizationIndustries?: string[];        // Apollo: `organization_industry_tag_ids` (needs UID lookup) OR free-text
  organizationKeywordTags?: string[];       // Apollo: `q_organization_keyword_tags` (free-text, what Python uses)
  minEmployees?: number;
  maxEmployees?: number;
  page?: number;
  perPage?: number;
}

export interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;                            // may be "email_not_unlocked@domain.com"
  title?: string;
  linkedin_url?: string;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    primary_domain?: string;
    industry?: string;
    estimated_num_employees?: number;
    keywords?: string[];
  };
}

export interface ApolloSearchResponse {
  people: ApolloPerson[];
  pagination?: { page: number; per_page: number; total_entries: number; total_pages: number };
}

export async function searchPeople(
  apiKey: string,
  filters: ApolloSearchFilters,
): Promise<ApolloSearchResponse> {
  const payload: Record<string, unknown> = {
    page: filters.page ?? 1,
    per_page: filters.perPage ?? 25,
  };
  if (filters.personTitles?.length) payload.person_titles = filters.personTitles;
  if (filters.personLocations?.length) payload.person_locations = filters.personLocations;
  if (filters.organizationKeywordTags?.length) payload.q_organization_keyword_tags = filters.organizationKeywordTags;
  if (filters.organizationDomains?.length) payload.q_organization_domains_list = filters.organizationDomains;
  if (filters.minEmployees != null && filters.maxEmployees != null) {
    payload.organization_num_employees_ranges = [`${filters.minEmployees},${filters.maxEmployees}`];
  }

  const response = await axios.post<ApolloSearchResponse>(
    `${APOLLO_BASE}/mixed_people/api_search`,
    payload,
    { headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, timeout: 60000 },
  );
  return response.data;
}

export async function enrichPerson(apiKey: string, personId: string): Promise<ApolloPerson | null> {
  try {
    const response = await axios.post(
      `${APOLLO_BASE}/people/match`,
      { id: personId, reveal_personal_emails: false },
      { headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' }, timeout: 30000 },
    );
    return response.data?.person ?? response.data ?? null;
  } catch (err: any) {
    logger.warn(`Apollo enrich failed for ${personId}: ${err?.response?.status} ${err?.message}`);
    return null;
  }
}

export function isEmailLocked(email?: string): boolean {
  if (!email) return true;
  if (!email.includes('@')) return true;
  if (email.startsWith('email_not_unlocked')) return true;
  return false;
}
```

**Plan must note:** Apollo's search returns ~80% locked emails on standard plans. The route MUST call `enrichPerson` for each locked record to unlock the email — and this **costs ~1 Apollo credit per enriched record** per `apollo-import-prospects.py:84-85`. The route should accept an `enrich: boolean` flag from the modal so the user opts into credit consumption explicitly.

### Apollo key sourcing in backend

Process env: `process.env.APOLLO_API_KEY`. If missing, route returns `503 { error: 'Apollo not configured' }` (don't 500 — this is operator misconfig). Document in `.env.example` (the production-crm `.env.example` does not currently list `APOLLO_API_KEY` per quick-354 Section B.3).

---

## 4. Stream Classifier — Live Where?

### Decision: backend on save (not frontend on display)

**Rationale:**
- Backend: classify once on import, persist to `Contact.stream` + `Company.stream`. Wizard reads from DB, no client-side regex.
- Frontend: would require running the classifier in two places (backend + browser) and the wizard would have to re-classify on every render. Bad.
- Already-imported contacts (pre-Phase-4) get `stream = null` → wizard treats as "Other" or skips.

### Classifier input adjustment

`job-leads.routes.ts:44` signature is `classifyStream(title, description)`. For Apollo, we have:
- `person.title` (e.g. "VP Finance") → maps title side
- `person.organization.industry` (e.g. "Computer Software") → no current branch handles this
- `person.organization.keywords[]` (e.g. `["netsuite", "erp", "saas"]`) → strong signal

**Recommended signature:** `classifyStream(title: string, descriptionOrKeywords: string): string`. Caller concatenates `[title, industry, ...keywords].join(' ')` into the second arg. **Zero code change to the existing regex branches** — they already match on the combined `text` variable. This preserves Job Leads behavior bit-for-bit.

### Edge case: no stream matches

`classifyStream` returns `'Other'` at line 81 if nothing matches. The wizard MUST handle the `'Other'` bucket — Section 5 below addresses this in the template routing.

---

## 5. Stream → EmailTemplate Routing

### Recommendation: Option (a) — pre-seeded EmailTemplate per stream

**Why:**

| Criterion | (a) Pre-seeded per stream | (b) Master template + variables | (c) AI-generated on first use, cached |
|-----------|---------------------------|--------------------------------|--------------------------------------|
| Complexity | LOW — one seed script | MEDIUM — variable substitution engine | HIGH — Anthropic call + cache layer |
| Failure modes | Template missing → fall back to "General" | Substitution bug → broken email body | Anthropic rate-limit or 5xx → blocks wizard |
| Rajesh visibility | HIGH — he can edit templates in `/settings/email-templates` | LOW — master template hidden behind logic | MEDIUM — generated content surfaces but he can't easily edit |
| First-import latency | 0 ms (just `findFirst`) | 0 ms | 2-8 sec (Anthropic call) |
| Time to ship | 1 task (~30 min seed) | 2 tasks (~2 hr) | 3 tasks + caching infra (~4 hr) |
| Phase-4 fit | matches the "wire pieces together" spirit | overkill | overkill |

**Verdict:** (a). Seed 8 templates on first run.

### Seed strategy

```typescript
// backend/src/seeds/stream-templates.ts (new file)
// Invoked from a one-shot route OR as part of user signup flow.
// Idempotent: only creates if (userId, category) pair doesn't exist.

const STREAM_TEMPLATES: Array<{ stream: string; subject: string; htmlSnippet: string }> = [
  { stream: 'NetSuite', subject: 'NetSuite implementation help — quick chat?', htmlSnippet: '...' },
  { stream: 'AI/ML', subject: 'AI/ML engineering capacity for {{companyName}}', htmlSnippet: '...' },
  { stream: 'Cloud/DevOps', subject: 'AWS/Azure architects for {{companyName}}', htmlSnippet: '...' },
  { stream: 'Cybersecurity', subject: 'Security engineers — bench available', htmlSnippet: '...' },
  { stream: 'Data/Analytics', subject: 'Data engineering capacity for {{companyName}}', htmlSnippet: '...' },
  { stream: 'Mobile', subject: 'iOS/Android engineers for {{companyName}}', htmlSnippet: '...' },
  { stream: 'Enterprise/ERP', subject: 'ERP implementation help — quick chat?', htmlSnippet: '...' },
  { stream: 'Staffing/HR', subject: 'Tech staffing partnership for {{companyName}}', htmlSnippet: '...' },
];

// 9th template for 'Other' = recycle 'Staffing/HR' generic copy as fallback
```

Each row uses existing `EmailTemplate.category` field (line 551) with value `Stream:<name>`. Templates are user-scoped (`userId`) — each Rajesh account gets its own copy on first import, editable via existing `/api/email-templates` CRUD.

### Wizard lookup logic

```typescript
// inside NetSuiteCampaignWizard, on mount with suggestedStream:
const template = await emailTemplatesApi.findByCategory(`Stream:${suggestedStream}`)
  ?? await emailTemplatesApi.findByCategory(`Stream:Other`)
  ?? null;  // last-resort: use hardcoded fallback from quick/4-PLAN.md:107-117
```

Endpoint `findByCategory` doesn't exist today — need a thin GET `/api/email-templates?category=Stream:NetSuite` (likely a 5-line addition to `emailTemplates.ts`).

### What if EmailTemplate for stream is missing?

Three-layer fallback:
1. Exact match `Stream:<suggestedStream>` → use it
2. `Stream:Other` → use it (always seeded)
3. Hardcoded template literal from `quick/4-PLAN.md:107-117` → use it; surface yellow banner: "Using built-in template — go to Email Templates to customize"

---

## 6. NetSuiteCampaignWizard Build — Differences from quick/4-PLAN.md

### What stays the same (~80%)

- 4-step modal pattern, step indicator, modal styling per `quick/4-PLAN.md:158-167`
- Step 1 / 2 / 3 / 4 structure exactly as specified in `quick/4-PLAN.md:85-156`
- "Let AI write it for me" button → `POST /api/campaigns/ai/generate-content` (`quick/4-PLAN.md:119`)
- Live validation in Step 3 (`quick/4-PLAN.md:124-133`)
- Send-via-emailComposer pattern in Step 3 (`quick/4-PLAN.md:147-154`)
- Step 4 success view + "Send another campaign" + "Go see your contacts →" (`quick/4-PLAN.md:135-144`)

### What changes for Phase 4

| `quick/4-PLAN.md` (Phase 4-design) | Phase 4 (Apollo-driven) |
|-------------------------------------|---------------------------|
| Props: `(isOpen, onClose, leads: JobLead[], preSelectedIds?: Set<number>)` | Props: `(isOpen, onClose, importedContactIds: string[], suggestedStream: string, onSuccess?: () => void)` |
| Step 1 filters `leads.filter(l => l.stream === 'NetSuite')` (hardcoded) | Step 1 fetches `GET /api/contacts?ids=<importedContactIds>` and shows ALL imported contacts. Pre-tick all by default. Allow filtering by stream within the imported set. |
| Step 1 source: in-memory `JobLead[]` from page state | Step 1 source: fresh DB read by ID. Contacts have firstName/lastName/email + company.name. |
| Subject/body pre-fill: hardcoded NetSuite template (lines 104-117) | Subject/body pre-fill: look up `EmailTemplate` by `category = Stream:<suggestedStream>` (see Section 5). Fall back to hardcoded if not seeded. |
| Send uses `lead.companyEmail` (hr@domain inferred) | Send uses `contact.email` (real Apollo-verified email) |
| Send via `emailComposerApi.create + send` (per-recipient loop) | **DECISION POINT** — see below |

### Decision point: send via EmailComposer or Campaign?

| | EmailComposer.create + send (per `quick/4-PLAN.md:147-154`) | Campaign.create + link companies + /send |
|---|------------------------------------------------------------|-----------------------------------------|
| Tracking pixel | NO (`emailComposer.ts:194` is a TODO stub) | YES (`campaigns.ts:579-589`) |
| Per-recipient personalization | Manual via wizard pre-substitution | Auto via `{{firstName}}/{{companyName}}` in body (`campaigns.ts:546-559`) |
| Variables in template | None | YES |
| Campaign analytics surface | NO (drafts don't appear in `/campaigns`) | YES (`Campaign` row visible to Rajesh) |
| Recipient model | `toEmails: string[]` per draft | One Campaign → many Company → many Contact join |
| Matches Phase 4 "auto-campaign" intent | Weak | **Strong** — phase name literally says "campaign" |

**Recommendation: use Campaign, not EmailComposer.** Follow the `FollowUpWizard.handleSend` pattern (`FollowUpWizard.tsx:298-353`):

1. `POST /api/campaigns` with `{ name, subject, htmlContent, status: 'DRAFT', templateId }`
2. For each unique companyId in imported contacts: `POST /api/campaigns/:id/companies/:companyId`
3. `POST /api/campaigns/:id/send` — triggers SES + tracking (`campaigns.ts:491-609`)

This deviates from `quick/4-PLAN.md` send logic but matches the existing successful `FollowUpWizard` pattern AND honors phase goal "auto-campaign". Document this as a planner-discretion override.

---

## 7. Wizard Prefilled State — Modal → Wizard Handoff

### Recommended flow

```
ApolloImportModal (Step 3, success)
  ├── importResults = { imported: 10, total: 25, contactIds: ['cuid_1', ...], suggestedStream: 'NetSuite' }
  ├── User clicks "Start campaign now →"
  └── Calls props.onImportComplete({ contactIds, suggestedStream })

Host page (JobLeadsPage or ContactList) state:
  ├── const [importedContactIds, setImportedContactIds] = useState<string[]>([])
  ├── const [suggestedStream, setSuggestedStream] = useState<string>('Other')
  ├── const [showWizard, setShowWizard] = useState(false)
  └── handleApolloImportComplete = ({ contactIds, suggestedStream }) => {
        setImportedContactIds(contactIds);
        setSuggestedStream(suggestedStream);
        setShowApollo(false);
        setShowWizard(true);  // chained open
      }

NetSuiteCampaignWizard:
  ├── Props: importedContactIds, suggestedStream
  └── On mount: fetch contacts by IDs, pre-tick all, jump to Step 1
```

### Backend contract for the import endpoint

```typescript
// POST /api/apollo/import response shape
interface ApolloImportResponse {
  imported: number;              // contacts successfully created
  skipped: number;                // dedups
  total: number;                  // apollo returned
  contactIds: string[];           // for wizard handoff (REQ-043)
  suggestedStream: string;        // most common stream among imported contacts
  errors: Array<{ apolloPersonId: string; reason: string }>;
}
```

**`suggestedStream` derivation:** count classification results, return the modal value. If tie → return first match. If all `'Other'` → return `'Other'`.

### Host page decision: JobLeadsPage or ContactList?

| Criterion | ContactList | JobLeadsPage |
|-----------|-------------|--------------|
| Where Apollo modal is currently commented | YES (`ContactList.tsx:13,72`) | NO |
| Where NetSuiteCampaignWizard was designed to live | NO | YES (`quick/4-PLAN.md:29`) |
| Where Rajesh expects "outbound prospecting" tools | Maybe | YES (per RAJESH-HANDBOOK Section 6 context) |
| Visual hierarchy match | Contacts is reactive (work the leads I have) | Job Leads is proactive (find new leads) |

**Recommendation: move Apollo modal to JobLeadsPage** (next to "Get Fresh Leads" button per `JobLeadsPage.tsx:32-85`). Apollo IS lead generation — pairs naturally with Remotive/Jobicy fetch. Then both the import modal AND the campaign wizard live on the same page, making the modal→wizard chain visually obvious. Alternative: keep on ContactList per the comments. Either is acceptable — flag this as a Claude's-discretion decision in CONTEXT.md if the user wants input.

---

## 8. Pitfalls

### Pitfall 1: Apollo returns locked emails by default

**What goes wrong:** Search response includes `email: "email_not_unlocked@domain.com"` for ~80% of records on standard plans.
**Why:** Apollo charges credits per email reveal; search is free, enrichment costs.
**How to avoid:** Always call `enrichPerson(personId)` for any record where `isEmailLocked(email)` is true, gated behind a user-opted `enrich: true` flag in the request body. If still locked after enrich → skip the record with `errors.push({ reason: 'email locked after enrich' })`.
**Warning sign:** Imported count << searched count after enrich.

### Pitfall 2: Duplicate contacts on re-import

**What goes wrong:** Rajesh re-runs the same query and we create duplicate `Contact` rows.
**Why:** No dedup key exists today on Apollo origin.
**How to avoid:** Use the new `Contact.apolloPersonId` field (unique) added in Section 2. Before create, `findUnique({ where: { apolloPersonId } })`. If exists, skip with `errors.push({ reason: 'already imported' })`. Same for `Company.apolloOrgId`.
**Warning sign:** "Skipped" count in modal Step 3 climbs every re-import.

### Pitfall 3: APOLLO_API_KEY 401 silently breaks

**What goes wrong:** Per quick-354 Section A.3, the local Mac `.env` has an expired key (`6_v0Xg…zr5g`, 401). EC2 has the working key (`TQHaQL…sGGA` per memory). If a developer runs locally without setting `APOLLO_API_KEY`, they see a generic 500.
**How to avoid:** Route returns `503 { error: 'Apollo not configured', hint: 'Set APOLLO_API_KEY in backend/.env' }` when env var missing. Add Apollo to `.env.example`. Add a `try/catch` around `searchPeople` that checks for `401` specifically and returns `503 { error: 'Apollo key invalid or expired' }`.
**Warning sign:** Identical 401 from both endpoints from the same key.

### Pitfall 4: ICP filter gap — burns credits on consultancies

**What goes wrong:** `q_organization_keyword_tags: ['NetSuite']` matches NetSuite *partners* (Plative, BSP, Charted) NOT NetSuite end users. Each `--enrich` costs ~1 credit. A 25-prospect batch with bad ICP burns 25 credits for 0 valid leads.
**Source:** RAJESH-HANDBOOK Section 6 + memory `project_brandmonkz_two_divergent_repos`.
**How to avoid in Phase 4:**
- (a) Smoke test: use a known-good ICP query (e.g., titles=`["CFO"]`, keywordTags=`["manufacturing"]`, NOT `["NetSuite"]`) for the one-real-contact verification. Document in smoke section.
- (b) Defer the `--exclude-industries` filter to Phase 4.5 / Phase 5. Add a TODO in `apolloClient.ts` referencing this pitfall.
- (c) Surface a Rajesh-visible UI warning in `ApolloImportModal` Step 1: "⚠ Filtering by tech tag (e.g. NetSuite) may match consultancies. Use with care."
**Warning sign:** Multiple consecutive imports return `org.industry = "Information Technology and Services"` or `"Management Consulting"`.

### Pitfall 5: Email send authorization — SES from address must be verified

**What goes wrong:** `campaigns.ts:476` defaults `FROM_EMAIL = 'support@brandmonkz.com'`. This is verified in production SES. Smoke test from a dev environment without verified sender → SES 553/554 bounce.
**How to avoid:** Smoke test must run via the production-crm EC2 stack (where SES is configured) — not from laptop. Document explicitly in the smoke section.
**Warning sign:** SES `MessageRejected` error in `campaigns.ts:594` catch.

### Pitfall 6: Stream classifier returns 'Other' for non-tech titles

**What goes wrong:** Apollo can return finance/operations titles ("VP Finance", "Controller") which the classifier maps to nothing (the regex branches are tech-centric).
**Why:** `classifyStream` was built for job-board postings, not Apollo personas.
**How to avoid:** Either (a) extend `classifyStream` to add a finance branch → `Enterprise/ERP` bucket; (b) accept `'Other'` and route via the `Stream:Other` template fallback (Section 5). Recommend (b) for Phase 4 — minimal change. Add (a) as a follow-up if Other bucket grows uncomfortably large.
**Warning sign:** `suggestedStream = 'Other'` on most imports.

### Pitfall 7: Apollo rate limits

**What goes wrong:** Apollo rate-limits search at ~50/min and enrich at ~30/min on standard plans. Bulk import of 100 records with enrich = 100 enrich calls = ~3-4 min hard wait.
**How to avoid:** (a) Cap `perPage` at 25 in the modal (already done at `ApolloImportModal.tsx:198-203`). (b) Add `await sleep(1500)` between enrich calls. (c) Show progress in modal Step 2 ("Enriching contact 7 of 25...").
**Warning sign:** Apollo HTTP 429.

### Pitfall 8: Email body has `{{firstName}}` but EmailComposer doesn't substitute

**What goes wrong:** `quick/4-PLAN.md` plan uses `emailComposerApi`, which does NOT substitute template variables (`emailComposer.ts:194` is a TODO). Email arrives literally containing `{{firstName}}`.
**How to avoid:** Section 6 recommendation (use Campaign path) sidesteps this — `campaigns.ts:546-559` substitutes correctly.
**Warning sign:** Rajesh sees `Hi {{firstName}},` in test inbox.

---

## 9. Smoke Test Design

### Smoke success criterion

> One real Apollo person → DB Contact + Company → wizard launches with that contact pre-selected → real campaign created → SES sends → recipient (a designated test inbox) receives email with correct stream-mapped copy + tracking pixel.

### Exact command sequence

Run from EC2 (where APOLLO_API_KEY + SES are configured):

```bash
# 0. Confirm preconditions
ssh ec2-user@100.24.213.224 'cd /var/www/crm-backend && grep -E "APOLLO_API_KEY|SES_FROM_EMAIL" .env | sed "s/=.*$/=<set>/"'
# Expected: both present
# Confirm Apollo key still works
ssh ec2-user@100.24.213.224 'cd /var/www/crm-backend && source <(grep APOLLO_API_KEY .env) && curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://api.apollo.io/api/v1/mixed_people/api_search -H "X-Api-Key: $APOLLO_API_KEY" -H "Content-Type: application/json" -d "{\"page\":1,\"per_page\":1}"'
# Expected: 200

# 1. Login to CRM, get JWT
TOKEN=$(curl -sS -X POST https://brandmonkz.com/api/auth/login -H 'Content-Type: application/json' -d '{"email":"rajesh@brandmonkz.com","password":"<redacted>"}' | jq -r .token)
[ -n "$TOKEN" ] && echo "auth ok"

# 2. Run a tiny Apollo import — use a deliberately ICP-safe query
curl -sS -X POST https://brandmonkz.com/api/apollo/import \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "filters": {
      "personTitles": ["VP Finance"],
      "personLocations": ["United States"],
      "minEmployees": 100,
      "maxEmployees": 500,
      "perPage": 1
    },
    "enrich": true
  }' | tee /tmp/apollo-smoke.json
# Expected: { imported: 1, contactIds: ["cuid..."], suggestedStream: "Enterprise/ERP" or "Other" }

# 3. Confirm DB write
CONTACT_ID=$(jq -r '.contactIds[0]' /tmp/apollo-smoke.json)
curl -sS "https://brandmonkz.com/api/contacts/$CONTACT_ID" -H "Authorization: Bearer $TOKEN" | jq '{firstName, lastName, email, stream, apolloPersonId, source, company}'
# Expected: real name, real email, stream is non-null, apolloPersonId is non-null, source="apollo", company is non-null

# 4. Confirm stream-matched EmailTemplate exists
SUGGESTED=$(jq -r .suggestedStream /tmp/apollo-smoke.json)
curl -sS "https://brandmonkz.com/api/email-templates?category=Stream:$SUGGESTED" -H "Authorization: Bearer $TOKEN" | jq '.templates[0] | {id, name, subject}'
# Expected: one row

# 5. Click-path proof (manual — Rajesh):
#    - Open https://brandmonkz.com/job-leads (or /contacts)
#    - See toast "1 contact imported from Apollo"
#    - NetSuiteCampaignWizard modal auto-opens
#    - Step 1: pre-ticked contact visible
#    - Step 2: subject + body pre-filled from Stream:<suggested> template
#    - Step 3: preview renders, no warnings
#    - Click "Send 1 email now →"
#    - Step 4: green confirmation "Sent to 1 company"

# 6. Confirm Campaign row + EmailLog
CAMP_ID=$(curl -sS https://brandmonkz.com/api/campaigns -H "Authorization: Bearer $TOKEN" | jq -r '.campaigns[0].id')
curl -sS https://brandmonkz.com/api/campaigns/$CAMP_ID -H "Authorization: Bearer $TOKEN" | jq '{status, totalSent, sentAt, subject}'
# Expected: status=SENT, totalSent=1, sentAt is recent

# 7. Confirm SES sent + recipient received (out-of-band: check designated test inbox)
# Tracking pixel: verify HTML in email source contains <img src="...api/tracking/open/...">
```

### Smoke success matrix

| Step | Pass criterion | Failure indicator |
|------|---------------|-------------------|
| 2 | HTTP 200, `imported >= 1` | 401 → key dead; 503 → key missing; 500 → check pm2 logs |
| 3 | All non-null fields | Stream null → classifier bug; apolloPersonId null → migration not applied |
| 4 | Template found | 404 → seed script didn't run |
| 5 | Wizard pre-fills | Empty Step 1 → handoff bug; missing template content → fallback chain bug |
| 6 | Campaign SENT | DRAFT → send failed; check `campaigns.ts:594` console.error logs |
| 7 | Email received with tracking pixel | No email → SES bounce; no pixel → `campaigns.ts:580-589` skipped |

---

## 10. Deploy Considerations

### CI workflow exists; manual EC2 path is the actual production path

| Workflow file | Triggers | Notes |
|---------------|----------|-------|
| `.github/workflows/deploy-aws.yml` | push to `main`, manual dispatch | Builds Docker image → ECR → ECS. Includes `npx prisma migrate deploy` (`:50-55`) — migrations auto-apply. |
| `.github/workflows/deploy-production.yml` | (not read this session) | Likely similar pattern. |

**BUT** per memory `project_brandmonkz_crm_deploy_path`: the working production path is **rsync to EC2 + pm2 restart**, NOT ECS. PM2 runs `node /var/www/crm-backend/dist/server.js`. The ECS workflow may be a legacy / staging path. Plan must verify this against latest commits before relying on ECS.

### Recommended deploy sequence for Phase 4

| Wave | Task |
|------|------|
| Schema | `cd backend && npx prisma generate && npx prisma db push` locally; commit migration SQL to `prisma/migrations/manual/04-add-stream-and-apollo-fields.sql` |
| Backend code | Push to `production` branch → rsync to `/var/www/crm-backend/dist/` → `pm2 restart crm-backend` (per memory `project_brandmonkz_crm_deploy_path`) |
| EC2 prisma migrate | `ssh ec2-user@100.24.213.224 'cd /var/www/crm-backend && npx prisma migrate deploy'` |
| Frontend | Rebuild + push to frontend S3 + CloudFront invalidation. ⚠ Watch for Vite stale lazy-chunk trap per memory `reference_vite_stale_lazy_chunk_trap` — entry hash stable but lazy chunk rotates. |
| Seed templates | One-off: `POST /api/email-templates/seed-streams` (new endpoint) OR run seed script via `node dist/seeds/stream-templates.js` |
| Restart | `pm2 restart crm-backend && pm2 logs --lines 20` |
| Verify | Run smoke test sequence from Section 9 |

### Risk: Apollo key only on EC2

If the smoke test runs from local laptop with `npm run dev`, it will fail at Step 2 with 401 (Mac key is stale per quick-354 Section A.3). Smoke MUST run against production EC2 backend.

### Deploy gotcha: rsync target

Per memory `project_brandmonkz_crm_deploy_path` (May 18, 2026):
- `deploy.sh` rsyncs to `/var/www/crm-backend/backend/dist/` (STALE parallel tree)
- PM2 actually runs from `/var/www/crm-backend/dist/`
- **Always rsync to `/var/www/crm-backend/dist/`** then `pm2 restart crm-backend`
- Do NOT use `deploy.sh` as-is

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Apollo `/v1/mixed_people/search` | `/v1/mixed_people/api_search` | mid-2025 | Old endpoint deprecated for API callers. `ApolloImportModal.tsx:52` targets the missing in-CRM route, but if it called Apollo directly with the legacy endpoint it would 404 too. |
| Search returns unlocked emails | Search returns locked emails; `/people/match` reveals | Apollo plan change | Adds ~1 credit per record + 30s round-trip per enrich call. |

---

## Open Questions

1. **Should the Apollo modal live on Contacts or Job Leads?**
   - What we know: ApolloImportModal is commented out in ContactList; quick/4-PLAN.md spec'd NetSuiteCampaignWizard for JobLeadsPage.
   - What's unclear: User intent. Lead generation tools could go either place.
   - Recommendation: JobLeadsPage (Section 7 rationale). Flag for CONTEXT.md.

2. **Do we send via Campaign or EmailComposer?**
   - What we know: quick/4-PLAN.md says EmailComposer; FollowUpWizard uses Campaign; phase goal says "auto-campaign".
   - What's unclear: Whether tracking pixel + campaign analytics are must-haves for the smoke.
   - Recommendation: Campaign (Section 6 rationale). Flag for CONTEXT.md if user wants to override.

3. **ICP filter gap — defer or fix in Phase 4?**
   - What we know: RAJESH-HANDBOOK Section 6 + quick-354 GAP #4 both call it out. Burns credits on consultancies.
   - What's unclear: Whether smoke test scope alone is enough to ship Phase 4 without the filter.
   - Recommendation: Defer. Smoke uses a safe query (Section 9 step 2). Add `--exclude-industries` in Phase 4.5.

4. **Is `EmailComposer.send` doing real SES, or still a TODO?**
   - What we know: `emailComposer.ts:194` literally says `// TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)` — it ONLY marks the row as sent without sending.
   - What's unclear: Whether anyone has wired SES into it since the file was written.
   - Recommendation: Don't rely on `emailComposer.send` until verified. **Strong support for Section 6 recommendation to use Campaign path.**

5. **Per-recipient personalization — is `{{firstName}}` substitution wanted?**
   - What we know: Campaign send substitutes (`campaigns.ts:546-559`). EmailComposer does not.
   - What's unclear: Does the wizard want one identical email to all selected vs personalized per recipient.
   - Recommendation: Personalized (Campaign path). Aligns with FollowUpWizard precedent.

---

## Sources

### Primary (HIGH confidence)

- Local file reads — all paths cited with line numbers:
  - `/Users/jeet/production-crm/.planning/STATE.md`
  - `/Users/jeet/production-crm/.planning/ROADMAP.md`
  - `/Users/jeet/production-crm/.planning/quick/4-build-guided-netsuite-campaign-wizard-fo/4-PLAN.md`
  - `/Users/jeet/production-crm/frontend/src/pages/JobLeads/JobLeadsPage.tsx`
  - `/Users/jeet/production-crm/frontend/src/pages/Contacts/ContactList.tsx`
  - `/Users/jeet/production-crm/frontend/src/components/ApolloImportModal.tsx`
  - `/Users/jeet/production-crm/frontend/src/components/FollowUpWizard.tsx`
  - `/Users/jeet/production-crm/frontend/src/services/api.ts`
  - `/Users/jeet/production-crm/backend/src/app.ts`
  - `/Users/jeet/production-crm/backend/src/routes/enrichment.ts`
  - `/Users/jeet/production-crm/backend/src/routes/job-leads.routes.ts`
  - `/Users/jeet/production-crm/backend/src/routes/emailComposer.ts`
  - `/Users/jeet/production-crm/backend/src/routes/campaigns.ts`
  - `/Users/jeet/production-crm/backend/src/routes/emailTemplates.ts`
  - `/Users/jeet/production-crm/scripts/video-pipeline/apollo-import-prospects.py`
  - `/Users/jeet/production-crm/prisma/schema.prisma`
  - `/Users/jeet/production-crm/.github/workflows/deploy-aws.yml`
- Apollo endpoint behavior — verified against canonical Python script comments (lines 79-86, 119-126).
- Cross-tree state — `/Users/jeet/doordash-p2p/.planning/quick/354-verify-apollo-io-end-to-end-across-in-cr/354-VERIFICATION.md` (live audit 2026-05-30).

### Secondary (MEDIUM confidence, memory-sourced)

- Apollo key on EC2 (`TQHaQL…sGGA`) — memory `project_brandmonkz_two_divergent_repos`.
- ICP gap unresolved — memory + RAJESH-HANDBOOK Section 6 (file read confirmed Section 6 exists with this content).
- production-crm deploy path = rsync to `/var/www/crm-backend/dist/` + pm2 restart — memory `project_brandmonkz_crm_deploy_path` (May 18, 2026).
- Vite lazy-chunk deploy trap — memory `reference_vite_stale_lazy_chunk_trap` (May 26, 2026).

### Tertiary (LOW confidence — flag for validation)

- Whether `.github/workflows/deploy-aws.yml` is the live deploy path or legacy. Plan must verify against most recent successful deploy commit before relying on it.
- Whether Apollo plan has changed pricing/rate-limit behavior since the Python script was written (May 2026). Re-confirm at smoke time.

---

## Metadata

**Confidence breakdown:**
- Existing code reuse map: HIGH — verified every file:line by reading the source
- Schema migrations: HIGH — read schema.prisma directly
- Apollo TS port: HIGH — direct read of Python source, well-documented endpoints
- Stream classifier reuse: HIGH — read the regex function directly
- Stream → template routing (Option a): MEDIUM — recommendation is sound but un-piloted in this codebase
- NetSuiteCampaignWizard build: MEDIUM — quick/4-PLAN.md is detailed but un-implemented; FollowUpWizard provides the precedent
- Wizard prefilled state handoff: HIGH — standard React state pattern
- Pitfalls: HIGH for #1-#3, #6, #8 (code-verified); MEDIUM for #4 (ICP, memory-sourced); MEDIUM for #5 (SES verified sender) / #7 (rate limits)
- Smoke test: HIGH for commands; MEDIUM for expected outputs (depends on Apollo's live state at smoke time)
- Deploy: MEDIUM — two competing memories (ECS workflow vs rsync). Plan must verify.

**Research date:** 2026-05-30
**Valid until:** 2026-06-30 (30 days; Apollo API behavior, SES verified senders, and production deploy path are stable surfaces). Re-validate sooner if Apollo key gets rotated or production deploy workflow changes.
