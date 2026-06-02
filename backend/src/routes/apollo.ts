// backend/src/routes/apollo.ts
//
// Phase 4 (USER-LOCKED 2026-05-30) — Apollo.io import + (Task 3) Resend send dispatcher.
//
// This file owns TWO endpoints behind /api/apollo:
//   POST /import         — search Apollo, optionally enrich, classify by stream, upsert to Contact/Company
//   POST /send-campaign  — (added Task 3) dispatch campaign emails via Resend (NOT SES)
//
// Locked decisions (do NOT mutate without re-planning):
//   1. Send transport is Resend SDK. We do NOT import the AWS SES client here.
//   2. From-address is hardcoded `Sara <sara@techcloudpro.com>` for all Phase-4 sends
//      (techcloudpro.com is the domain-verified Resend sender; May 26 2026 Peter→Sara swap).
//   3. RESEND_API_KEY is required at boot. Missing → process.exit(1) (added in Task 3).
//   4. campaigns.ts is byte-for-byte unchanged by this file.
//
// References:
//   - backend/src/lib/apolloClient.ts  (Phase 4 plan 04-02 — HTTP wrapper, library-pure)
//   - backend/src/lib/streamClassifier.ts (Phase 4 plan 04-01 — pure regex classifier)
//   - backend/src/routes/campaigns.ts:540-559 (SES substitution shape we mirror, NOT modify)

import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import {
  searchPeople,
  enrichPerson,
  isEmailLocked,
  ApolloAuthError,
  sleep,
  ApolloPerson,
  ApolloSearchFilters,
} from '../lib/apolloClient';
import { classifyStream } from '../lib/streamClassifier';
// Phase 05 plan 05-02: v2 stream-template body + per-stream null-token fallbacks.
import { STREAM_TEMPLATE_V2_BODY, getStreamFallbacks } from '../seeds/stream-templates';

// Phase 4 USER-LOCKED 2026-05-30: Resend send path.
// We use Resend, NOT SES (campaigns.ts SES flow stays untouched for Rajesh's existing BrandMonkz campaigns).
import { Resend } from 'resend';

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

// Fail-fast at module load if RESEND_API_KEY missing. Pattern mirrors main_new.py JWT_SECRET guard
// (`RuntimeError` at startup). Backend MUST NOT boot without a working send path.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[apollo.send-campaign] FATAL: RESEND_API_KEY env var is not set. Backend cannot start.');
  // eslint-disable-next-line no-console
  console.error('  → Add RESEND_API_KEY=re_... to backend/.env (live key in EC2 /var/www/crm-backend/.env or Resend dashboard).');
  process.exit(1);
}
const resend = new Resend(RESEND_API_KEY);

// Phase 4 from-address. Per-stream / configurable deferred to Phase 4.5.
// techcloudpro.com is domain-verified in Resend (May 26, 2026 Peter→Sara swap).
const APOLLO_FROM_EMAIL = 'Sara <sara@techcloudpro.com>';

// Canonical stream allowlist (mirrors STREAMS export from lib/streamClassifier.ts).
// Used to validate `suggestedStream` in the send-campaign request body.
const VALID_STREAMS = new Set([
  'NetSuite', 'AI/ML', 'Cloud/DevOps', 'Cybersecurity',
  'Data/Analytics', 'Mobile', 'Enterprise/ERP', 'Staffing/HR', 'Other',
]);

const router = Router();
const prisma = new PrismaClient();

// Match job-leads.routes.ts:14 pattern — auth on the whole router.
router.use(authenticate);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApolloImportRequestBody {
  filters: ApolloSearchFilters;
  enrich?: boolean;
  autoNormalize?: boolean;   // quick-7: default true; set false to skip Claude normalization
}

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

// -----------------------------------------------------------------------
// Phase 5: per-contact AI personalization types
// -----------------------------------------------------------------------

interface AITokens {
  intentHook: string | null;
  companyContext: string | null;
  painPoint: string | null;
  cta: string | null;
}

interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  webSearchUses: number;
  costUSD: number;
}

interface PersonalizeResult {
  tokens: AITokens | null;
  usage: ClaudeUsage;
  warning?: string;
}

// Cost constants (Sonnet 4.6 + web_search) — keep in sync with RESEARCH §10
const CLAUDE_INPUT_RATE_PER_TOKEN = 3 / 1_000_000;   // $3 / MTok
const CLAUDE_OUTPUT_RATE_PER_TOKEN = 15 / 1_000_000; // $15 / MTok
const CLAUDE_WEB_SEARCH_RATE = 0.010;                // $10 / 1000 = $0.01 each

// Resend pricing — currently FREE TIER (3K emails/month, $0 incremental).
// Kept as a named constant so future paid-tier moves only edit one line.
// When/if Resend goes paid for TCP: set this to per-email $ (e.g. 0.0001 for the $20/50K plan).
const RESEND_COST_PER_SEND = 0;

const PERSONALIZE_TIMEOUT_MS = 60_000;  // web_search needs headroom (RESEARCH §6)
const PERSONALIZE_BATCH_HARD_CAP = 50;  // cost gate (RESEARCH §7)
const PERSONALIZE_PACING_MS = 250;      // 4 req/sec < Resend's 5/sec limit (RESEARCH §7)

const PHASE5_RESEARCH_SYSTEM_PROMPT = `You are a B2B research analyst for TechCloudPro (TCP), a NetSuite + AI consultancy.

Task: research one target company using web_search, then emit JSON tokens that personalize a stream-specific outreach email.

Use web_search 1-3 times to ground these facts:
- Recent news, fundraising, acquisitions, leadership changes (last 6 months)
- Tech stack signals relevant to the given stream (e.g., for "NetSuite": ERP mentions; for "AI/ML": ML platform mentions)
- A concrete operational pain inferable from public signals

Output STRICT JSON, no markdown, no prose:
{
  "intentHook":     "<one sentence, 8-15 words, refers to recent SPECIFIC signal>",
  "companyContext": "<one sentence, 8-15 words, what they do + scale>",
  "painPoint":      "<one sentence, 8-15 words, REAL operational friction tied to stream>",
  "cta":            "<one short question, 10-15 words, ties pain to TCP offer>"
}

Rules:
- If no public signal supports a hook, return null for that field (NOT a fabrication).
- Tokens MUST be plain text (no HTML, no markdown). Max 160 chars each.
- No URLs. No company-internal jargon.

Return ONLY the JSON object.`;

// Strip HTML tags + URLs and cap length per token. Defense against AI hallucination.
function sanitizeToken(s: string | null | undefined): string | null {
  if (typeof s !== 'string') return null;
  const stripped = s
    .replace(/<[^>]+>/g, '')        // no HTML
    .replace(/https?:\/\/\S+/g, '') // no URLs
    .trim();
  if (!stripped) return null;
  return stripped.length > 160 ? stripped.slice(0, 159) + '…' : stripped;
}

function computeClaudeCost(inputTokens: number, outputTokens: number, webSearchUses: number): number {
  return (
    inputTokens * CLAUDE_INPUT_RATE_PER_TOKEN +
    outputTokens * CLAUDE_OUTPUT_RATE_PER_TOKEN +
    webSearchUses * CLAUDE_WEB_SEARCH_RATE
  );
}

function zeroUsage(): ClaudeUsage {
  return { inputTokens: 0, outputTokens: 0, webSearchUses: 0, costUSD: 0 };
}

/**
 * Pass a curated subset of contact.apolloRawData to the AI (RESEARCH Open Question 3 + locked decision #11).
 * First 10 fields only — token cost guard.
 */
function curatedApolloFields(apolloRawData: any): Record<string, any> {
  if (!apolloRawData || typeof apolloRawData !== 'object') return {};
  const candidates = [
    'title', 'headline', 'seniority', 'departments', 'linkedin_url',
    'employment_history', 'organization_industry', 'organization_size',
    'organization_short_description', 'organization_founded_year',
  ];
  const out: Record<string, any> = {};
  for (const k of candidates) {
    if (apolloRawData[k] !== undefined && apolloRawData[k] !== null) out[k] = apolloRawData[k];
  }
  return out;
}

/**
 * ONE Claude call per contact: research + token generation combined (RESEARCH §2).
 * Mirrors normalizeFiltersWithClaude's contract — NEVER throws.
 * EXACTLY 5 fallback paths (see plan must_haves table):
 *   1. missing key                    → 'Claude not configured'
 *   2. 60s Promise.race timeout       → 'Claude timed out — used per-stream fallback'
 *   3. empty text block               → 'Claude returned empty response'
 *   4. JSON.parse throws OR non-obj   → 'Claude returned malformed JSON'   <- folded
 *   5. anything else (SDK throws,
 *      network, anthropic 4xx/5xx,
 *      web_search error)              → 'Claude unavailable'
 */
async function personalizeContactWithClaude(
  contact: { firstName: string | null; lastName: string | null; title: string | null; apolloRawData: any; company: { name: string | null; industry: string | null } | null },
  stream: string,
): Promise<PersonalizeResult> {
  // Fallback 1: missing key
  if (!anthropicClient) {
    return { tokens: null, usage: zeroUsage(), warning: 'Claude not configured' };
  }

  const userMessage = `Research company "${contact.company?.name ?? 'unknown'}" for an outreach email to ${contact.firstName ?? ''} ${contact.lastName ?? ''}, ${contact.title ?? 'a senior buyer'}.

Stream classification: ${stream}
Industry (from Apollo): ${contact.company?.industry ?? 'unknown'}

Additional Apollo-enriched data (use sparingly):
${JSON.stringify(curatedApolloFields(contact.apolloRawData), null, 2)}

Use web_search to ground the tokens in REAL public signals. Return the strict JSON object.`;

  try {
    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), PERSONALIZE_TIMEOUT_MS),
    );

    const claudePromise = anthropicClient.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      temperature: 0,
      system: PHASE5_RESEARCH_SYSTEM_PROMPT,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
      } as any],
      messages: [{ role: 'user', content: userMessage }],
    });

    const result = await Promise.race([claudePromise, timeoutPromise]);

    // Fallback 2: timeout
    if (result === 'TIMEOUT') {
      return { tokens: null, usage: zeroUsage(), warning: 'Claude timed out — used per-stream fallback' };
    }

    // Extract usage
    const inputTokens = (result as any).usage?.input_tokens ?? 0;
    const outputTokens = (result as any).usage?.output_tokens ?? 0;
    const webSearchUses = (result as any).usage?.server_tool_use?.web_search_requests ?? 0;
    const costUSD = computeClaudeCost(inputTokens, outputTokens, webSearchUses);
    const usage: ClaudeUsage = { inputTokens, outputTokens, webSearchUses, costUSD };

    // Find the FIRST text block (web_search_tool_result blocks come before the final assistant text)
    const blocks = (result as any).content ?? [];
    const textBlock = blocks.find((b: any) => b.type === 'text');

    // Fallback 3: empty response
    if (!textBlock || !textBlock.text) {
      return { tokens: null, usage, warning: 'Claude returned empty response' };
    }

    // Fence-strip then parse
    const raw = String(textBlock.text)
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/g, '')
      .trim();

    // Fallback 4: malformed JSON (covers BOTH JSON.parse throw AND non-object/null parse result).
    // The manual `throw` inside the try block routes non-object results into the same catch path,
    // so we emit only ONE warning string ('Claude returned malformed JSON') for this branch.
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('non-object JSON');
      }
    } catch {
      return { tokens: null, usage, warning: 'Claude returned malformed JSON' };
    }

    const tokens: AITokens = {
      intentHook: sanitizeToken(parsed.intentHook),
      companyContext: sanitizeToken(parsed.companyContext),
      painPoint: sanitizeToken(parsed.painPoint),
      cta: sanitizeToken(parsed.cta),
    };

    return { tokens, usage };
  } catch (err: any) {
    // Fallback 5: SDK throws (covers anthropic 4xx/5xx, network errors, web_search failures, model-access errors, etc.)
    // eslint-disable-next-line no-console
    console.error('[apollo.personalize] Claude error:', err?.message || err);
    return { tokens: null, usage: zeroUsage(), warning: 'Claude unavailable' };
  }
}

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

interface ApolloSendCampaignRequestBody {
  contactIds: string[];
  templateId: string;
  suggestedStream: string;
}

interface ApolloSendCampaignFailure {
  contactId: string;
  email: string | null;
  error: string;
}

interface ApolloSendCampaignResponse {
  sent: number;
  failed: number;
  failureDetails: ApolloSendCampaignFailure[];
}

// ---------------------------------------------------------------------------
// Claude-powered filter normalization (Phase quick-7)
// ---------------------------------------------------------------------------
// Given a raw ApolloSearchFilters object (user input), call Claude with a
// strict-JSON system prompt teaching Apollo's field semantics and return:
//   { normalized: <cleaned filters>, corrections: [...], warning?: string }
//
// Fallback contract (NEVER throws):
//   - If ANTHROPIC_API_KEY missing → return { normalized: <raw>, corrections: [], warning: 'Claude not configured' }
//   - If Claude takes > 8s → race-timeout → return { normalized: <raw>, corrections: [], warning: 'Claude timed out — used your inputs as-is' }
//   - If Claude throws or returns unparseable JSON → return { normalized: <raw>, corrections: [], warning: 'Claude unavailable — used your inputs as-is' }
//
// quick-7 Rule-1 deviation: bumped 3s → 8s after live verify showed claude-sonnet-4-6
// consistently takes 3.3-5s for the full 4KB system prompt + reasoning. 3s budget made
// the feature DEAD on every real call. 8s still well within axios 120s per-call cap.
//
// USER-LOCKED model: claude-sonnet-4-6 (reasoning depth for field disambiguation).
// USER-LOCKED params: temperature 0, max_tokens 1000.

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
      setTimeout(() => resolve('TIMEOUT'), 8000),
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

// ---------------------------------------------------------------------------
// POST /api/apollo/import
// ---------------------------------------------------------------------------
// Search Apollo → enrich (optional) → classify stream → dedupe by apolloPersonId/apolloOrgId
// → upsert Contact + Company. Returns aggregated counts + contact IDs the wizard can
// hand to /send-campaign.

router.post('/import', async (req: Request, res: Response) => {
  // 1. Pre-check env (per plan 04-02: route owns env reads, lib stays pure).
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Apollo not configured',
      hint: 'Set APOLLO_API_KEY in backend/.env (live key lives on EC2 — SCP from /var/www/crm-backend/.env)',
    });
  }

  const { filters, enrich = true, autoNormalize = true } = (req.body || {}) as ApolloImportRequestBody;
  if (!filters || typeof filters !== 'object') {
    return res.status(400).json({ error: 'filters object required' });
  }

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

  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: 'unauthenticated' });

  try {
    // 2. Search Apollo.
    const searchResp = await searchPeople(apiKey, effectiveFilters);
    const people = searchResp.people || [];

    // 3. Enrich + upsert loop.
    const contactIds: string[] = [];
    const errors: ApolloImportResponse['errors'] = [];
    const streamCounts: Record<string, number> = {};
    let skipped = 0;

    for (const baseP of people) {
      let person: ApolloPerson = baseP;

      // Reveal locked emails when caller opts in. Pace per Pitfall 7
      // (Apollo standard tier ~30 req/min).
      if (enrich && isEmailLocked(baseP.email)) {
        await sleep(1500);
        const enriched = await enrichPerson(apiKey, baseP.id);
        if (enriched) {
          person = { ...baseP, ...enriched };
        }
      }

      if (isEmailLocked(person.email)) {
        errors.push({ apolloPersonId: person.id, reason: 'email locked after enrich' });
        continue;
      }

      // Dedup: skip if apolloPersonId already imported (unique constraint on Contact).
      const existing = await prisma.contact.findUnique({
        where: { apolloPersonId: person.id },
      });
      if (existing) {
        skipped++;
        errors.push({ apolloPersonId: person.id, reason: 'already imported' });
        continue;
      }

      // Classify by title + (industry + keywords) so the classifier sees enough
      // text to disambiguate (e.g., "VP Engineering" + "NetSuite consultancy" → NetSuite).
      const org = person.organization || {};
      const classifierText = [
        org.industry || '',
        ...(org.keywords || []),
      ].join(' ');
      const stream = classifyStream(person.title || '', classifierText);
      streamCounts[stream] = (streamCounts[stream] || 0) + 1;

      // Upsert Company — 3-case ladder to avoid P2002 on companies_domain_key.
      let companyId: string | null = null;
      if (org.id) {
        // (a) Already imported via Apollo — reuse by apolloOrgId.
        const existingByApolloId = await prisma.company.findUnique({
          where: { apolloOrgId: org.id },
        });
        if (existingByApolloId) {
          companyId = existingByApolloId.id;
        } else if (org.name) {
          // Company.employeeCount is String? (supports "51-200" ranges).
          // Apollo returns a number — coerce defensively.
          const empCount =
            typeof org.estimated_num_employees === 'number'
              ? String(org.estimated_num_employees)
              : null;
          const domain = org.primary_domain || null;

          // (b) Domain collision — Company.domain is @unique (schema.prisma:340).
          // Pre-existing row may have come from a Job-Lead pull, a manual contact create,
          // or a prior Apollo run with a different apolloOrgId. Link to it AND backfill
          // the Apollo fields so the next Apollo run finds it via path (a).
          let existingByDomain = null;
          if (domain) {
            existingByDomain = await prisma.company.findUnique({
              where: { domain },
            });
          }
          if (existingByDomain) {
            const updated = await prisma.company.update({
              where: { id: existingByDomain.id },
              data: {
                apolloOrgId: org.id,
                apolloRawData: org as any,
                // Only overwrite dataSource if it was unset — don't clobber a manual/job-lead origin record.
                dataSource: existingByDomain.dataSource || 'apollo',
                // Backfill fields the existing record may be missing.
                industry: existingByDomain.industry || org.industry || null,
                employeeCount: existingByDomain.employeeCount || empCount,
                website: existingByDomain.website || org.website_url || null,
                stream: existingByDomain.stream || stream,
              },
            });
            companyId = updated.id;
          } else {
            // (c) Truly new — safe to create.
            const created = await prisma.company.create({
              data: {
                name: org.name,
                website: org.website_url || null,
                domain,
                industry: org.industry || null,
                employeeCount: empCount,
                stream,
                apolloOrgId: org.id,
                apolloRawData: org as any,
                dataSource: 'apollo',
                userId,
              },
            });
            companyId = created.id;
          }
        }
      }

      // Create Contact. firstName/lastName are non-nullable in the schema —
      // fall back to empty string if Apollo omitted them (rare).
      const newContact = await prisma.contact.create({
        data: {
          firstName: person.first_name || '',
          lastName: person.last_name || '',
          email: person.email!,
          title: person.title || null,
          linkedin: person.linkedin_url || null,
          source: 'apollo',
          stream,
          apolloPersonId: person.id,
          apolloRawData: person as any,
          companyId,
          userId,
        },
      });
      contactIds.push(newContact.id);
    }

    // 4. Derive suggestedStream = most common across imported batch.
    const suggestedStream =
      Object.entries(streamCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';

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
    return res.status(200).json(body);
  } catch (err: any) {
    if (err instanceof ApolloAuthError) {
      return res.status(503).json({ error: 'Apollo key invalid or expired' });
    }
    // eslint-disable-next-line no-console
    console.error('[apollo.import] unexpected error', err);
    return res.status(500).json({ error: 'Apollo import failed', detail: err?.message });
  }
});

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

// ---------------------------------------------------------------------------
// POST /api/apollo/send-campaign
// ---------------------------------------------------------------------------
// Phase 4 USER-LOCKED send path. Dispatches campaign emails via Resend (NOT SES).
// Mirrors campaigns.ts:546-559 substitution logic but uses resend.emails.send instead of SESClient.
// Returns aggregated success/failure — never fail-fast on per-contact errors.

router.post('/send-campaign', async (req: Request, res: Response) => {
  const { contactIds, templateId, suggestedStream } = (req.body || {}) as ApolloSendCampaignRequestBody;

  // ===== Validation =====
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return res.status(400).json({ error: 'contactIds must be a non-empty array' });
  }
  if (!templateId || typeof templateId !== 'string') {
    return res.status(400).json({ error: 'templateId required' });
  }
  if (!suggestedStream || !VALID_STREAMS.has(suggestedStream)) {
    return res.status(400).json({
      error: `suggestedStream must be one of: ${[...VALID_STREAMS].join(', ')}`,
    });
  }

  const userId = (req as any).user?.id || (req as any).user?.sub;
  if (!userId) return res.status(401).json({ error: 'unauthenticated' });

  try {
    // ===== Lookup template (must belong to caller) =====
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId },
    });
    if (!template) {
      return res.status(404).json({ error: 'Template not found or not owned by user' });
    }
    const tplSubject = template.subject || '';
    const tplBody = template.htmlContent || '';
    if (!tplSubject || !tplBody) {
      return res.status(400).json({ error: 'Template has no subject or body' });
    }

    // ===== Lookup contacts (must belong to caller; include company for {{companyName}}) =====
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, userId },
      include: { company: { select: { name: true } } },
    });

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'No matching contacts found for caller' });
    }

    // ===== Send loop (sequential with 100ms gap — Resend free tier rate limit ~2/sec) =====
    const failureDetails: ApolloSendCampaignFailure[] = [];
    let sent = 0;

    for (const contact of contacts) {
      // Per-contact try/catch — collect failures, never fail-fast.
      try {
        if (!contact.email) {
          failureDetails.push({
            contactId: contact.id,
            email: null,
            error: 'contact has no email',
          });
          continue;
        }

        // Variable substitution — mirror campaigns.ts:546-559 pattern exactly.
        const vars: Record<string, string> = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          companyName: contact.company?.name || '',
        };
        let subject = tplSubject;
        let html = tplBody;
        for (const [key, val] of Object.entries(vars)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, val);
          html = html.replace(regex, val);
        }

        const result = await resend.emails.send({
          from: APOLLO_FROM_EMAIL,
          to: contact.email,
          subject,
          html,
        });

        // Resend SDK returns { data: { id }, error } — error is non-null on failure
        if ((result as any).error) {
          failureDetails.push({
            contactId: contact.id,
            email: contact.email,
            error: String((result as any).error?.message || (result as any).error),
          });
          continue;
        }

        sent++;

        // 100ms pacing — Resend free tier ~2/sec
        await new Promise<void>((r) => setTimeout(r, 100));
      } catch (err: any) {
        failureDetails.push({
          contactId: contact.id,
          email: contact.email ?? null,
          error: err?.message || 'unknown error',
        });
      }
    }

    const body: ApolloSendCampaignResponse = {
      sent,
      failed: failureDetails.length,
      failureDetails,
    };
    return res.status(200).json(body);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.send-campaign] unexpected error', err);
    return res.status(500).json({ error: 'send-campaign failed', detail: err?.message });
  }
});

// -----------------------------------------------------------------------
// Phase 5: POST /api/apollo/send-personalized-campaign
//
// ADJACENT to /send-campaign — does NOT replace it. Phase 4 send-campaign
// remains byte-for-byte unchanged so the Phase 4 firewall holds.
//
// Per-contact flow:
//   1. Call personalizeContactWithClaude(contact, stream) → { tokens, usage, warning }
//   2. Render body via STREAM_TEMPLATE_V2_BODY + AI tokens (with per-stream fallback for null tokens)
//   3. Persist audit row to personalized_email_sends BEFORE send (status='pending')
//   4. If previewOnly: update audit row to status='preview' and continue (no Resend)
//   5. Else: resend.emails.send(...) with testRecipient override if set
//   6. Update audit row status='sent' + resendMessageId OR status='failed' + resendError
//   7. Sleep 250ms (4 req/sec < Resend's 5/sec limit)
//
// Hard gate: contactIds.length > 50 requires confirmedLargeBatch:true (RESEARCH §9.d)
//
// Phase 06 additive extension:
//   - body.requireReview?: boolean (default false). When true:
//       * Personalize each contact via Claude (same path).
//       * Persist audit row with status='pending_review' (NOT 'pending' or 'preview').
//       * SKIP Resend dispatch entirely — top-level sent=0, failed=0.
//       * Return queuedForReview + queueIds in the response.
//     Old callers (NetSuiteCampaignWizard Step 4) keep working — they don't pass
//     requireReview, so undefined → falsy → existing dispatch path runs unchanged.
//   - Mutual exclusion: when requireReview AND previewOnly are both true,
//     requireReview wins (status='pending_review', not 'preview').
// -----------------------------------------------------------------------
router.post('/send-personalized-campaign', async (req: Request, res: Response) => {
  try {
    // Auth idiom matches existing /send-campaign route above (req.user?.id with ?.sub fallback)
    const userId = (req as any).user?.id || (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const {
      contactIds,
      templateId,
      suggestedStream,
      testRecipient,
      previewOnly,
      confirmedLargeBatch,
      requireReview,
    } = req.body as {
      contactIds: string[];
      templateId: string;
      suggestedStream: string;
      testRecipient?: string;
      previewOnly?: boolean;
      confirmedLargeBatch?: boolean;
      requireReview?: boolean;  // Phase 06: when true, persist with status='pending_review' and skip Resend
    };

    // Validation
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds must be a non-empty array' });
    }
    if (typeof templateId !== 'string' || !templateId) {
      return res.status(400).json({ error: 'templateId required' });
    }
    if (!VALID_STREAMS.has(suggestedStream)) {
      return res.status(400).json({ error: `suggestedStream must be one of ${[...VALID_STREAMS].join(', ')}` });
    }

    // previewOnly always caps at the FIRST contact only (locked decision #12)
    const effectiveContactIds = previewOnly ? contactIds.slice(0, 1) : contactIds;

    // Hard cost gate (skip when previewOnly because preview is 1 contact)
    if (!previewOnly && effectiveContactIds.length > PERSONALIZE_BATCH_HARD_CAP && !confirmedLargeBatch) {
      return res.status(400).json({
        error: 'large_batch_requires_confirmation',
        detail: `Batch of ${effectiveContactIds.length} contacts exceeds the ${PERSONALIZE_BATCH_HARD_CAP}-contact cost gate. Resubmit with confirmedLargeBatch:true to proceed.`,
        estimatedCostUSD: effectiveContactIds.length * 0.069,
      });
    }

    // Template lookup (scoped by userId — tenant isolation)
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId },
    });
    if (!template) {
      return res.status(404).json({ error: 'template_not_found' });
    }

    // Contact lookup with company include
    const contacts = await prisma.contact.findMany({
      where: { id: { in: effectiveContactIds }, userId },
      include: { company: true },
    });
    if (contacts.length === 0) {
      return res.status(404).json({ error: 'no_contacts_found' });
    }

    const audit: any[] = [];
    const failureDetails: any[] = [];
    let sent = 0;
    let failed = 0;
    let personalized = 0;
    let personalizeFailures = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalWebSearchRequests = 0;
    let totalClaudeCostUSD = 0;
    // Phase 06 plan 06-03: pending-review queue tracking (only used when requireReview:true).
    const queueIds: string[] = [];
    let queuedForReview = 0;

    for (const contact of contacts) {
      // 1. Personalize via Claude
      const result = await personalizeContactWithClaude(
        {
          firstName: contact.firstName,
          lastName: contact.lastName,
          title: contact.title,
          apolloRawData: (contact as any).apolloRawData,
          company: contact.company ? { name: contact.company.name, industry: (contact.company as any).industry ?? null } : null,
        },
        suggestedStream,
      );

      if (result.tokens) personalized += 1;
      else personalizeFailures += 1;

      totalInputTokens += result.usage.inputTokens;
      totalOutputTokens += result.usage.outputTokens;
      totalWebSearchRequests += result.usage.webSearchUses;
      totalClaudeCostUSD += result.usage.costUSD;

      // 2. Render body with AI tokens (with per-stream fallback for nulls)
      const fallbacks = getStreamFallbacks(suggestedStream);
      const aiTokens = result.tokens ?? { intentHook: null, companyContext: null, painPoint: null, cta: null };

      const vars: Record<string, string> = {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email,
        companyName: contact.company?.name || '',
        intentHook: aiTokens.intentHook ?? fallbacks.intentHook,
        companyContext: aiTokens.companyContext ?? fallbacks.companyContext,
        painPoint: aiTokens.painPoint ?? fallbacks.painPoint,
        cta: aiTokens.cta ?? fallbacks.cta,
      };

      let subject = template.subject;
      let html = template.htmlContent || STREAM_TEMPLATE_V2_BODY;
      for (const [key, val] of Object.entries(vars)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(regex, val);
        html = html.replace(regex, val);
      }

      const toEmail = testRecipient && typeof testRecipient === 'string' && testRecipient.length > 0
        ? testRecipient
        : contact.email;

      // 3. Persist audit row BEFORE send (status='pending'); use Prisma.InputJsonValue cast instead of `as any`.
      const auditRow = await prisma.personalizedEmailSend.create({
        data: {
          contactId: contact.id,
          templateId: template.id,
          stream: suggestedStream,
          fromEmail: APOLLO_FROM_EMAIL,
          toEmail,
          testRecipient: testRecipient || null,
          subject,
          renderedBody: html,
          aiTokens: result.tokens
            ? (result.tokens as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          aiWarning: result.warning || null,
          claudeInputTokens: result.usage.inputTokens,
          claudeOutputTokens: result.usage.outputTokens,
          webSearchUses: result.usage.webSearchUses,
          claudeCostUSD: result.usage.costUSD,
          status: requireReview ? 'pending_review' : (previewOnly ? 'preview' : 'pending'),
          userId,
        },
      });

      // 4. previewOnly skips Resend
      if (previewOnly) {
        audit.push({
          contactId: contact.id,
          email: toEmail,
          auditId: auditRow.id,
          subject,
          renderedBody: html,
          aiTokens: result.tokens,
          aiWarning: result.warning,
          claudeInputTokens: result.usage.inputTokens,
          claudeOutputTokens: result.usage.outputTokens,
          webSearchUses: result.usage.webSearchUses,
          status: 'preview',
        });
        continue;
      }

      // 4b. Phase 06 plan 06-03: requireReview skips Resend — leaves status='pending_review'
      //     so Plan 06-04's GET /api/apollo/pending-review can surface it for Rajesh's review queue.
      if (requireReview) {
        queueIds.push(auditRow.id);
        queuedForReview += 1;
        audit.push({
          contactId: contact.id,
          email: toEmail,
          auditId: auditRow.id,
          subject,
          renderedBody: html,
          aiTokens: result.tokens,
          aiWarning: result.warning,
          claudeInputTokens: result.usage.inputTokens,
          claudeOutputTokens: result.usage.outputTokens,
          webSearchUses: result.usage.webSearchUses,
          status: 'pending_review',
        });
        // Skip Resend dispatch but still pace so Claude API doesn't get hammered if N is large.
        await new Promise<void>((r) => setTimeout(r, PERSONALIZE_PACING_MS));
        continue;
      }

      // 5. Resend dispatch
      try {
        const { data, error } = await resend.emails.send({
          from: APOLLO_FROM_EMAIL,
          to: toEmail,
          subject,
          html,
        });

        if (error) {
          failed += 1;
          await prisma.personalizedEmailSend.update({
            where: { id: auditRow.id },
            data: { status: 'failed', resendError: error.message || JSON.stringify(error) },
          });
          failureDetails.push({ contactId: contact.id, email: toEmail, error: error.message || 'resend_error' });
        } else {
          sent += 1;
          await prisma.personalizedEmailSend.update({
            where: { id: auditRow.id },
            data: { status: 'sent', resendMessageId: data?.id || null, sentAt: new Date() },
          });
          audit.push({
            contactId: contact.id,
            email: toEmail,
            auditId: auditRow.id,
            resendMessageId: data?.id || null,
            aiTokens: result.tokens,
            aiWarning: result.warning,
            status: 'sent',
          });
        }
      } catch (err: any) {
        failed += 1;
        await prisma.personalizedEmailSend.update({
          where: { id: auditRow.id },
          data: { status: 'failed', resendError: err?.message || 'send_threw' },
        });
        failureDetails.push({ contactId: contact.id, email: toEmail, error: err?.message || 'send_threw' });
      }

      // 7. Pacing (RESEARCH §7)
      await new Promise<void>((r) => setTimeout(r, PERSONALIZE_PACING_MS));
    }

    // Cost accounting:
    //   claudeCostUSD = sum of (inputTokens + outputTokens + webSearchUses) priced per RESEARCH §10
    //   resendCostUSD = sends × RESEND_COST_PER_SEND (currently $0 — free tier)
    //   totalCostUSD  = claudeCostUSD + resendCostUSD (forward-compat for paid Resend)
    const resendCostUSD = sent * RESEND_COST_PER_SEND;
    const totalCostUSD = totalClaudeCostUSD + resendCostUSD;

    return res.json({
      sent,
      failed,
      personalized,
      personalizeFailures,
      failureDetails,
      audit,
      // Phase 06 plan 06-03: pending-review queue summary (additive — old callers ignore).
      queuedForReview,
      queueIds,
      cost: {
        claudeInputTokens: totalInputTokens,
        claudeOutputTokens: totalOutputTokens,
        webSearchRequests: totalWebSearchRequests,
        claudeCostUSD: Number(totalClaudeCostUSD.toFixed(6)),
        resendSendsCounted: sent,
        resendCostUSD: Number(resendCostUSD.toFixed(6)),
        totalCostUSD: Number(totalCostUSD.toFixed(6)),
      },
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.send-personalized-campaign] unexpected error:', err);
    return res.status(500).json({ error: 'send_personalized_failed', detail: err?.message || String(err) });
  }
});

// -----------------------------------------------------------------------
// Phase 06 plan 06-04: GET /api/apollo/unsent-contacts
//
// Lists Apollo-source contacts (source='apollo') for the current user that have
// NO row in personalized_email_sends with status='sent'. Used by Plan 06-05's
// Apollo Campaign button to fetch the batch of contacts that still need outreach.
//
// Optional ?stream=Cybersecurity filter. Optional ?limit=N (1..1000, default 500).
// -----------------------------------------------------------------------
router.get('/unsent-contacts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const streamFilter = typeof req.query.stream === 'string' ? req.query.stream : undefined;
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 500;
    const limit = Math.min(Math.max(limitRaw || 500, 1), 1000);

    // Step 1: collect contactIds already-sent for this user (status='sent').
    const sentRows = await prisma.personalizedEmailSend.findMany({
      where: { userId, status: 'sent' },
      select: { contactId: true },
    });
    const sentContactIds = sentRows.map((r) => r.contactId);

    // Step 2: list Apollo-source contacts for this user excluding the sent set.
    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        source: 'apollo',
        id: sentContactIds.length > 0 ? { notIn: sentContactIds } : undefined,
        ...(streamFilter ? { stream: streamFilter } : {}),
      },
      include: { company: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const items = contacts.map((c) => ({
      id: c.id,
      email: c.email,
      fullName: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email,
      companyName: c.company?.name || null,
      stream: c.stream || null,
      suggestedStream: c.stream || null, // alias for Plan 06-05's wizard handoff
    }));
    return res.json({ contacts: items, total: items.length });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.unsent-contacts] unexpected error:', err);
    return res.status(500).json({ error: 'unsent_contacts_failed', detail: err?.message || String(err) });
  }
});

// -----------------------------------------------------------------------
// Phase 06 plan 06-04: GET /api/apollo/pending-review
//
// Lists audit rows with status='pending_review' for the current user, ordered
// by createdAt DESC. Paginated (default 20/page, max 100/page). Includes the
// persisted renderedBody so the Plan 06-05 Pending Review tab can render
// inbox-card previews without a follow-up call.
//
// Optional ?stream=Cybersecurity filter. Optional ?page=N&pageSize=M.
// -----------------------------------------------------------------------
router.get('/pending-review', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const streamFilter = typeof req.query.stream === 'string' ? req.query.stream : undefined;
    const pageRaw = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
    const pageSizeRaw = typeof req.query.pageSize === 'string' ? parseInt(req.query.pageSize, 10) : 20;
    const page = Math.max(pageRaw || 1, 1);
    const pageSize = Math.min(Math.max(pageSizeRaw || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.PersonalizedEmailSendWhereInput = {
      userId,
      status: 'pending_review',
      ...(streamFilter ? { stream: streamFilter } : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.personalizedEmailSend.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { contact: { include: { company: true } } },
      }),
      prisma.personalizedEmailSend.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      contactId: r.contactId,
      contactEmail: r.toEmail,
      contactName: [r.contact?.firstName, r.contact?.lastName].filter(Boolean).join(' ') || r.toEmail,
      companyName: r.contact?.company?.name || null,
      stream: r.stream,
      subject: r.subject,
      renderedBody: r.renderedBody,
      aiTokens: r.aiTokens,
      aiWarning: r.aiWarning,
      claudeCostUSD: r.claudeCostUSD,
      createdAt: r.createdAt,
    }));
    return res.json({ items, total, page, pageSize });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.pending-review.list] unexpected error:', err);
    return res.status(500).json({ error: 'pending_review_list_failed', detail: err?.message || String(err) });
  }
});

// -----------------------------------------------------------------------
// Phase 06 plan 06-04: POST /api/apollo/pending-review/:id/approve
//
// Dispatches the persisted renderedBody via Resend (no fresh Claude call —
// the body was generated when the row was queued in /send-personalized-campaign
// with requireReview:true, OR re-rendered server-side by /edit after aiTokens
// were overridden). Flips status to 'sent' on success, records resendMessageId.
// Returns 404 if the row is missing OR not in pending_review (prevents
// double-approval). Returns 502 on Resend failure (row stays in pending_review
// for retry).
// -----------------------------------------------------------------------
router.post('/pending-review/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id_required' });

    const row = await prisma.personalizedEmailSend.findFirst({
      where: { id, userId, status: 'pending_review' },
    });
    if (!row) return res.status(404).json({ error: 'pending_review_row_not_found' });

    try {
      const { data, error } = await resend.emails.send({
        from: row.fromEmail || APOLLO_FROM_EMAIL,
        to: row.toEmail,
        subject: row.subject,
        html: row.renderedBody,
      });
      if (error) {
        return res.status(502).json({
          error: 'resend_dispatch_failed',
          detail: error.message || JSON.stringify(error),
        });
      }
      const updated = await prisma.personalizedEmailSend.update({
        where: { id },
        data: {
          status: 'sent',
          resendMessageId: data?.id || null,
          sentAt: new Date(),
        },
      });
      return res.json({
        id: updated.id,
        status: 'sent',
        resendMessageId: updated.resendMessageId,
      });
    } catch (err: any) {
      return res.status(502).json({
        error: 'resend_dispatch_threw',
        detail: err?.message || String(err),
      });
    }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.pending-review.approve] unexpected error:', err);
    return res.status(500).json({ error: 'approve_failed', detail: err?.message || String(err) });
  }
});

// -----------------------------------------------------------------------
// Phase 06 plan 06-04: POST /api/apollo/pending-review/:id/reject
//
// Marks the row as status='rejected' with optional reason written into the
// existing aiWarning column (re-using the column avoids a schema change —
// CONTEXT.md route table accepts reason as optional metadata, not a primary
// field). Returns 404 if the row is missing OR not in pending_review.
// -----------------------------------------------------------------------
router.post('/pending-review/:id/reject', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id_required' });

    const { reason } = (req.body || {}) as { reason?: string };

    const row = await prisma.personalizedEmailSend.findFirst({
      where: { id, userId, status: 'pending_review' },
    });
    if (!row) return res.status(404).json({ error: 'pending_review_row_not_found' });

    const updated = await prisma.personalizedEmailSend.update({
      where: { id },
      data: {
        status: 'rejected',
        aiWarning: reason && typeof reason === 'string' ? reason : row.aiWarning,
      },
    });
    return res.json({ id: updated.id, status: 'rejected' });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.pending-review.reject] unexpected error:', err);
    return res.status(500).json({ error: 'reject_failed', detail: err?.message || String(err) });
  }
});

// -----------------------------------------------------------------------
// Phase 06 plan 06-04: POST /api/apollo/pending-review/:id/edit
//
// Override aiTokens / renderedBody / subject on a pending_review row. WHEN
// aiTokens is provided AND renderedBody is NOT, re-renders renderedBody
// server-side from the row's template + new tokens (same regex loop as
// /send-personalized-campaign apollo.ts:973-982). This prevents the
// stale-preview bug where saved tokens didn't update the body Rajesh sees.
// When renderedBody IS explicitly provided, that value wins — no re-render.
// Status stays 'pending_review'. Returns 404 if row missing OR not in
// pending_review. Returns 409 if aiTokens change requested but the row's
// template no longer exists.
// -----------------------------------------------------------------------
router.post('/pending-review/:id/edit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id_required' });

    const { aiTokens, renderedBody, subject } = (req.body || {}) as {
      aiTokens?: Record<string, string | null>;
      renderedBody?: string;
      subject?: string;
    };

    if (aiTokens === undefined && renderedBody === undefined && subject === undefined) {
      return res.status(400).json({
        error: 'no_fields_to_edit',
        detail: 'Provide at least one of aiTokens, renderedBody, subject',
      });
    }

    const row = await prisma.personalizedEmailSend.findFirst({
      where: { id, userId, status: 'pending_review' },
      include: { contact: { include: { company: true } } },
    });
    if (!row) return res.status(404).json({ error: 'pending_review_row_not_found' });

    let newRenderedBody: string | undefined = renderedBody; // explicit override takes precedence
    if (aiTokens !== undefined && renderedBody === undefined) {
      // Re-render server-side using the row's template + merged tokens.
      // Mirrors /send-personalized-campaign substitution loop at apollo.ts:1002-1006.
      const template = await prisma.emailTemplate.findFirst({
        where: { id: row.templateId, userId },
        select: { htmlContent: true },
      });
      if (!template) {
        return res.status(409).json({
          error: 'template_missing_for_rerender',
          detail: `EmailTemplate ${row.templateId} not found — cannot re-render renderedBody from new aiTokens. Edit the rendered body directly via the renderedBody field instead.`,
        });
      }
      const mergedTokens: Record<string, string> = {
        firstName: row.contact?.firstName || '',
        companyName: row.contact?.company?.name || '',
        title: row.contact?.title || '',
        intentHook: (aiTokens.intentHook as string) || '',
        companyContext: (aiTokens.companyContext as string) || '',
        painPoint: (aiTokens.painPoint as string) || '',
        cta: (aiTokens.cta as string) || '',
      };
      let body = template.htmlContent;
      for (const [key, value] of Object.entries(mergedTokens)) {
        // Same substitution semantics as /send-personalized-campaign — global regex on {{key}}.
        const safeValue = (value ?? '').toString();
        body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safeValue);
      }
      newRenderedBody = body;
    }

    const updateData: Prisma.PersonalizedEmailSendUpdateInput = {};
    if (aiTokens !== undefined) {
      updateData.aiTokens = aiTokens as unknown as Prisma.InputJsonValue;
    }
    if (newRenderedBody !== undefined) {
      updateData.renderedBody = newRenderedBody;
    }
    if (subject !== undefined) {
      updateData.subject = subject;
    }
    const updated = await prisma.personalizedEmailSend.update({
      where: { id },
      data: updateData,
    });
    return res.json({
      id: updated.id,
      status: updated.status,
      subject: updated.subject,
      renderedBody: updated.renderedBody,
      aiTokens: updated.aiTokens,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.pending-review.edit] unexpected error:', err);
    return res.status(500).json({ error: 'edit_failed', detail: err?.message || String(err) });
  }
});

export default router;
