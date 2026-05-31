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
import { PrismaClient } from '@prisma/client';
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
//   - If Claude takes > 3s → race-timeout → return { normalized: <raw>, corrections: [], warning: 'Claude timed out — used your inputs as-is' }
//   - If Claude throws or returns unparseable JSON → return { normalized: <raw>, corrections: [], warning: 'Claude unavailable — used your inputs as-is' }
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

export default router;
