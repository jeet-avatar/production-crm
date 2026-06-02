// backend/src/routes/apollo.ts
//
// Phase 04 — Apollo.io import + Resend send dispatcher with unified analytics.
//
// This file owns TWO endpoints behind /api/apollo:
//   POST /import         — search Apollo, optionally enrich, classify by stream, upsert to Contact/Company
//   POST /send-campaign  — dispatch campaign emails via Resend (NOT SES) with 3-layer template fallback
//                          (Stream:<x> -> Stream:Other -> HARDCODED). Creates a Campaign row + EmailLog
//                          rows so the existing /campaigns/:id/analytics page shows Apollo sends too.
//
// Locked decisions (do NOT mutate without re-planning):
//   1. Send transport is Resend SDK. We do NOT import the AWS SES client here.
//   2. From-address is HARDCODED `Sara <sara@techcloudpro.com>` for all Phase-04 sends
//      (techcloudpro.com is the domain-verified Resend sender; May 26 2026 Peter→Sara swap).
//      Request body `fromEmail` is IGNORED — Sara is shared with the video-generator pm2 process
//      and a bad blast could degrade the whole Resend account.
//   3. RESEND_API_KEY is required at module load. Missing → process.exit(1).
//   4. campaigns.ts is byte-for-byte unchanged by this file.
//   5. Every Apollo dispatch creates a Campaign DB row + EmailLog rows so sends appear in the
//      existing /campaigns/<id>/analytics view that Rajesh already uses for NetSuite campaigns.
//
// References:
//   - backend/src/lib/apolloClient.ts (HTTP wrapper, library-pure)
//   - backend/src/lib/streamClassifier.ts (pure regex classifier)
//   - backend/src/routes/campaigns.ts (SES path stays untouched for existing BrandMonkz campaigns)
//   - .planning/phases/04-apollo-campaign-port/04-RESEARCH.md (Sara preservation + unified analytics)

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
import { normalizeFiltersWithClaude } from '../lib/claudeClient';
import { personalizeContactWithClaude } from '../lib/personalize';
import { STREAM_TEMPLATE_V2_BODY, getStreamFallbacks } from '../seeds/stream-templates';

// Phase 04 USER-LOCKED: Resend send path.
// We use Resend, NOT SES (campaigns.ts SES flow stays untouched for Rajesh's existing BrandMonkz campaigns).
import { Resend } from 'resend';

// Fail-fast at module load if RESEND_API_KEY missing. Pattern mirrors main_new.py JWT_SECRET guard
// (RuntimeError at startup). Backend MUST NOT boot without a working send path.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[apollo.send-campaign] FATAL: RESEND_API_KEY env var is not set. Backend cannot start.');
  // eslint-disable-next-line no-console
  console.error('  → Add RESEND_API_KEY=re_... to backend/.env (live key in EC2 /var/www/crm-backend/.env or Resend dashboard).');
  process.exit(1);
}
const resend = new Resend(RESEND_API_KEY);

// Phase 04 hardcoded from-address. NOT configurable per request — Sara is shared with the
// video-generator pm2 process and a bad blast could degrade the whole Resend account.
// techcloudpro.com is domain-verified in Resend (May 26, 2026 Peter→Sara swap).
//
// EXPORTED for the Phase 04-08 scheduledDispatcher to reuse — single source of truth for
// the Sara sender. Any new send path MUST import these constants instead of duplicating
// the string, so a Sara swap is a one-line edit.
export const APOLLO_FROM_EMAIL = 'Sara <sara@techcloudpro.com>';
export const APOLLO_REPLY_TO = 'sara@techcloudpro.com';

// Canonical stream allowlist. Used to validate `stream` in /send-campaign body and
// to label Campaign rows. Matches streamClassifier.STREAMS + seeds/stream-templates.ts.
const VALID_STREAMS = new Set([
  'NetSuite', 'AI/ML', 'Cloud/DevOps', 'Cybersecurity',
  'Data/Analytics', 'Mobile', 'Enterprise/ERP', 'Staffing/HR', 'Other',
]);

// 3-layer template fallback — Stream:<x> -> Stream:Other -> HARDCODED.
// This is the safety net: if both Stream:<x> and Stream:Other templates are missing
// (e.g., user never ran the seed), we still send something useful instead of 500-ing.
const HARDCODED_FALLBACK_SUBJECT = 'Tech engineering capacity for {{companyName}}';
const HARDCODED_FALLBACK_HTML =
  "<p>Hi {{firstName}},</p>" +
  "<p>We place senior engineers across the stack. Could we share a couple of profiles relevant to {{companyName}}'s near-term needs?</p>" +
  "<p>— Sara, TechCloudPro</p>";

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
}

interface ApolloImportResponse {
  imported: number;
  skipped: number;
  total: number;
  contactIds: string[];
  suggestedStream: string;
  errors: Array<{ apolloPersonId: string; reason: string }>;
}

interface ApolloSendCampaignRequestBody {
  contactIds: string[];
  stream: string; // Stream key — used for 3-layer fallback Stream:<x> -> Stream:Other -> HARDCODED
  scheduledAt?: string; // Phase 04-08 — ISO datetime; if > now(), stage SCHEDULED rows instead of immediate send.
  // fromEmail / fromName from request body are IGNORED — see APOLLO_FROM_EMAIL constant.
}

interface ApolloSendCampaignFailure {
  contactId: string;
  email: string | null;
  error: string;
}

interface ApolloSendCampaignResponse {
  sent: number;
  failed: number;
  campaignId: string;
  templateSource: 'stream' | 'stream-other' | 'hardcoded';
  failureDetails: ApolloSendCampaignFailure[];
}

// ---------------------------------------------------------------------------
// POST /api/apollo/import
// ---------------------------------------------------------------------------
// Search Apollo → enrich (optional) → classify stream → dedupe by apolloPersonId/apolloOrgId
// → upsert Contact + Company. Returns aggregated counts + contact IDs the wizard can
// hand to /send-campaign.

router.post('/import', async (req: Request, res: Response) => {
  // 1. Pre-check env (route owns env reads; lib stays pure).
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Apollo not configured',
      hint: 'Set APOLLO_API_KEY in backend/.env (live key lives on EC2 — SCP from /var/www/crm-backend/.env)',
    });
  }

  const { filters, enrich = true } = (req.body || {}) as ApolloImportRequestBody;
  if (!filters || typeof filters !== 'object') {
    return res.status(400).json({ error: 'filters object required' });
  }

  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: 'unauthenticated' });

  try {
    // 2. Search Apollo.
    const searchResp = await searchPeople(apiKey, filters);
    const people = searchResp.people || [];

    // 3. Enrich + upsert loop.
    const contactIds: string[] = [];
    const errors: ApolloImportResponse['errors'] = [];
    const streamCounts: Record<string, number> = {};
    let skipped = 0;

    for (const baseP of people) {
      let person: ApolloPerson = baseP;

      // Reveal locked emails when caller opts in. Pace per Apollo standard tier ~30 req/min.
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

      // Classify by title + (industry + keywords) so the classifier sees enough text to
      // disambiguate (e.g., "VP Engineering" + "NetSuite consultancy" → NetSuite).
      const org = person.organization || {};
      const classifierText = [
        org.industry || '',
        ...(org.keywords || []),
      ].join(' ');
      const stream = classifyStream(person.title || '', classifierText);
      streamCounts[stream] = (streamCounts[stream] || 0) + 1;

      // Upsert Company — 3-case ladder to avoid P2002 on companies_domain_key (quick-6 fix).
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

          // (b) Domain collision — Company.domain is @unique. Pre-existing row may have come
          // from a Job-Lead pull, a manual contact create, or a prior Apollo run with a
          // different apolloOrgId. Link to it AND backfill the Apollo fields so the next
          // Apollo run finds it via path (a).
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
            // (c) Truly new — safe to create. Wrap in try/catch to handle the rare race
            // where two parallel /import calls both passed the findUnique checks and now
            // both attempt INSERT — Postgres rejects the second with P2002 on
            // companies_domain_key or companies_apolloOrgId_key. Re-fetch the winner.
            try {
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
            } catch (e: any) {
              if (e?.code === 'P2002') {
                // Race condition — another concurrent /import won the INSERT. Re-fetch.
                const racedByApollo = await prisma.company.findUnique({
                  where: { apolloOrgId: org.id },
                });
                if (racedByApollo) {
                  companyId = racedByApollo.id;
                } else if (domain) {
                  const racedByDomain = await prisma.company.findUnique({
                    where: { domain },
                  });
                  if (racedByDomain) companyId = racedByDomain.id;
                  else throw e;
                } else {
                  throw e;
                }
              } else {
                throw e;
              }
            }
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
    };
    return res.status(200).json(body);
  } catch (err: any) {
    if (err instanceof ApolloAuthError) {
      // Plan-spec error shape — frontend renders an actionable message.
      return res.status(401).json({
        error: 'apollo_key_invalid',
        message: 'Your Apollo API key is invalid or expired. Get a new one from app.apollo.io.',
      });
    }
    // eslint-disable-next-line no-console
    console.error('[apollo.import] unexpected error', err);
    return res.status(500).json({ error: 'Apollo import failed', detail: err?.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/apollo/normalize-filters
// ---------------------------------------------------------------------------
// Phase 04 (quick-7) — proxy user free-text titles/industries/keywords through
// Claude Haiku to return Apollo's canonical taxonomy + pitfall warnings.
// Saves Apollo credits on misclassified ICPs (e.g., "NetSuite" keyword returns
// consultancies, not customers). Wired by frontend ApolloSearchForm "Refine with AI" button.
router.post('/normalize-filters', async (req: Request, res: Response) => {
  const { titles, industries, keywords } = (req.body || {}) as {
    titles?: string;
    industries?: string;
    keywords?: string;
  };

  // At least one of the three must be present, otherwise there's nothing to refine.
  if (!titles && !industries && !keywords) {
    return res.status(400).json({
      error: 'At least one of titles, industries, or keywords is required.',
    });
  }

  try {
    const result = await normalizeFiltersWithClaude({ titles, industries, keywords });
    return res.status(200).json(result);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.normalize-filters] Claude call failed', err);
    // Common case: ANTHROPIC_API_KEY missing → 503 (service unavailable) so frontend can
    // disable the "Refine with AI" button gracefully.
    if (err?.message?.includes('ANTHROPIC_API_KEY')) {
      return res.status(503).json({
        error: 'claude_unavailable',
        message: 'AI filter refinement is not configured on this server.',
      });
    }
    return res.status(500).json({
      error: 'normalize_failed',
      message: err?.message || 'Claude filter normalization failed.',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/apollo/send-campaign
// ---------------------------------------------------------------------------
// Phase 04 USER-LOCKED send path. Dispatches campaign emails via Resend (NOT SES).
// Uses 3-layer template fallback: Stream:<x> -> Stream:Other -> HARDCODED.
// Creates a Campaign DB row + per-contact EmailLog rows so sends appear in the
// existing /campaigns/<id>/analytics view that Rajesh already uses.

router.post('/send-campaign', async (req: Request, res: Response) => {
  const { contactIds, stream, scheduledAt, fromEmail: requestFromEmail } =
    (req.body || {}) as ApolloSendCampaignRequestBody & { fromEmail?: string };

  // ===== Validation =====
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return res.status(400).json({ error: 'contactIds must be a non-empty array' });
  }
  if (!stream || typeof stream !== 'string' || !VALID_STREAMS.has(stream)) {
    return res.status(400).json({
      error: `stream must be one of: ${[...VALID_STREAMS].join(', ')}`,
    });
  }

  // Phase 04-08 — Parse scheduledAt. delayMs > 0 means stage SCHEDULED rows;
  // <= 0 (or unset) falls through to the existing immediate-dispatch path.
  let scheduleTime: Date | null = null;
  if (scheduledAt) {
    const parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'scheduledAt must be a valid ISO datetime string' });
    }
    scheduleTime = parsed;
  }

  // Sara protection — log + ignore any request-side fromEmail attempts.
  if (requestFromEmail && requestFromEmail !== APOLLO_FROM_EMAIL) {
    // eslint-disable-next-line no-console
    console.warn(
      `[apollo.send-campaign] ignored client-supplied fromEmail=${requestFromEmail} ; forcing APOLLO_FROM_EMAIL=${APOLLO_FROM_EMAIL}`,
    );
  }

  const userId = (req as any).user?.id || (req as any).user?.sub;
  if (!userId) return res.status(401).json({ error: 'unauthenticated' });

  try {
    // ===== 3-layer template resolution: Stream:<x> -> Stream:Other -> HARDCODED =====
    let templateSubject = HARDCODED_FALLBACK_SUBJECT;
    let templateHtml = HARDCODED_FALLBACK_HTML;
    let templateSource: 'stream' | 'stream-other' | 'hardcoded' = 'hardcoded';

    const streamCategory = `Stream:${stream}`;
    const streamTemplate = await prisma.emailTemplate.findFirst({
      where: { category: streamCategory, userId },
    });
    if (streamTemplate?.subject && streamTemplate?.htmlContent) {
      templateSubject = streamTemplate.subject;
      templateHtml = streamTemplate.htmlContent;
      templateSource = 'stream';
    } else {
      // Fallback layer 2: Stream:Other
      const otherTemplate = await prisma.emailTemplate.findFirst({
        where: { category: 'Stream:Other', userId },
      });
      if (otherTemplate?.subject && otherTemplate?.htmlContent) {
        templateSubject = otherTemplate.subject;
        templateHtml = otherTemplate.htmlContent;
        templateSource = 'stream-other';
      }
      // else: HARDCODED defaults already set above.
    }

    // ===== Lookup contacts (must belong to caller; include company for {{companyName}}) =====
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, userId },
      include: { company: { select: { name: true } } },
    });

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'No matching contacts found for caller' });
    }

    // ===== Unified analytics: create Campaign row FIRST so EmailLogs can link via campaignId =====
    // Phase 04-08 — when scheduledAt is in the future, the Campaign starts in SCHEDULED status
    // (visible in /campaigns list immediately) and EmailLog rows are staged for the dispatcher.
    const isScheduled = !!scheduleTime && scheduleTime.getTime() > Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const campaign = await prisma.campaign.create({
      data: {
        name: `Apollo Campaign — ${stream} — ${today}`,
        subject: templateSubject,
        htmlContent: templateHtml,
        status: isScheduled ? 'SCHEDULED' : 'SENDING',
        scheduledAt: isScheduled ? scheduleTime : null,
        source: 'apollo',
        userId,
      },
    });

    // ===== Phase 04-08 — SCHEDULED branch: stage rows + return immediately =====
    if (isScheduled && scheduleTime) {
      // Pre-render subject + html per contact (same {{var}} substitution as immediate path)
      // and stash on EmailLog.metadata so the dispatcher is a dumb transport.
      let stagedCount = 0;
      const failed: ApolloSendCampaignFailure[] = [];
      for (const contact of contacts) {
        if (!contact.email) {
          failed.push({ contactId: contact.id, email: null, error: 'contact has no email' });
          await prisma.emailLog.create({
            data: {
              campaignId: campaign.id,
              contactId: contact.id,
              toEmail: null,
              fromEmail: APOLLO_REPLY_TO,
              status: 'FAILED',
              errorMessage: 'contact has no email',
            },
          });
          continue;
        }
        const vars: Record<string, string> = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          companyName: contact.company?.name || '',
        };
        let subject = templateSubject;
        let html = templateHtml;
        for (const [key, val] of Object.entries(vars)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, val);
          html = html.replace(regex, val);
        }
        await prisma.emailLog.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            toEmail: contact.email,
            fromEmail: APOLLO_REPLY_TO,
            status: 'SCHEDULED',
            scheduledAt: scheduleTime,
            metadata: { subject, html, transport: 'resend', source: 'apollo' },
          },
        });
        stagedCount += 1;
      }
      return res.status(200).json({
        scheduled: true,
        scheduledAt: scheduleTime.toISOString(),
        count: stagedCount,
        campaignId: campaign.id,
        templateSource,
        failureDetails: failed,
      });
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
          await prisma.emailLog.create({
            data: {
              campaignId: campaign.id,
              contactId: contact.id,
              toEmail: null,
              fromEmail: APOLLO_REPLY_TO,
              status: 'FAILED',
              errorMessage: 'contact has no email',
            },
          });
          continue;
        }

        // Variable substitution — mirror campaigns.ts pattern.
        const vars: Record<string, string> = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          companyName: contact.company?.name || '',
        };
        let subject = templateSubject;
        let html = templateHtml;
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
          replyTo: APOLLO_REPLY_TO,
        });

        // Resend SDK returns { data: { id }, error } — error is non-null on failure
        if ((result as any).error) {
          const errMsg = String((result as any).error?.message || (result as any).error);
          failureDetails.push({
            contactId: contact.id,
            email: contact.email,
            error: errMsg,
          });
          await prisma.emailLog.create({
            data: {
              campaignId: campaign.id,
              contactId: contact.id,
              toEmail: contact.email,
              fromEmail: APOLLO_REPLY_TO,
              status: 'FAILED',
              errorMessage: errMsg,
            },
          });
          continue;
        }

        sent++;
        await prisma.emailLog.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            toEmail: contact.email,
            fromEmail: APOLLO_REPLY_TO,
            messageId: (result as any).data?.id || null,
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        // 100ms pacing — Resend free tier ~2/sec
        await new Promise<void>((r) => setTimeout(r, 100));
      } catch (err: any) {
        const errMsg = err?.message || 'unknown error';
        failureDetails.push({
          contactId: contact.id,
          email: contact.email ?? null,
          error: errMsg,
        });
        try {
          await prisma.emailLog.create({
            data: {
              campaignId: campaign.id,
              contactId: contact.id,
              toEmail: contact.email ?? null,
              fromEmail: APOLLO_REPLY_TO,
              status: 'FAILED',
              errorMessage: errMsg,
            },
          });
        } catch {
          // Best-effort logging — don't let an EmailLog write failure mask the send error.
        }
      }
    }

    // Mark Campaign SENT (or CANCELLED if 0 sent + at least one failure). CampaignStatus enum
    // does not have FAILED — use CANCELLED for "tried to send but all attempts failed".
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: sent > 0 ? 'SENT' : 'CANCELLED',
        sentAt: sent > 0 ? new Date() : null,
        totalSent: sent,
      },
    });

    const body: ApolloSendCampaignResponse = {
      sent,
      failed: failureDetails.length,
      campaignId: campaign.id,
      templateSource,
      failureDetails,
    };
    return res.status(200).json(body);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.send-campaign] unexpected error', err);
    return res.status(500).json({ error: 'send-campaign failed', detail: err?.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/apollo/stream-template/:stream
// ---------------------------------------------------------------------------
// Phase 04-05 helper — returns the Stream:<x> template id + subject for the
// given stream so the wizard's AI Personalize block can hand it to
// /send-personalized-campaign without making the frontend hit /email-templates
// directly (which doesn't return `category`).
//
// Resolves via the same 3-layer ladder as /send-campaign:
//   Stream:<x> -> Stream:Other -> 404 (frontend should hide the AI Preview button).
router.get('/stream-template/:stream', async (req: Request, res: Response) => {
  const stream = req.params.stream;
  const userId = (req as any).user?.id || (req as any).user?.sub;
  if (!userId) return res.status(401).json({ error: 'unauthenticated' });
  if (!stream || !VALID_STREAMS.has(stream)) {
    return res.status(400).json({ error: 'invalid_stream' });
  }

  const t1 = await prisma.emailTemplate.findFirst({
    where: { category: `Stream:${stream}`, userId },
    select: { id: true, name: true, subject: true, category: true },
  });
  if (t1) return res.status(200).json({ template: t1, source: 'stream' });

  const t2 = await prisma.emailTemplate.findFirst({
    where: { category: 'Stream:Other', userId },
    select: { id: true, name: true, subject: true, category: true },
  });
  if (t2) return res.status(200).json({ template: t2, source: 'stream-other' });

  return res.status(404).json({ error: 'no_stream_template_found' });
});

// ---------------------------------------------------------------------------
// POST /api/apollo/send-personalized-campaign
// ---------------------------------------------------------------------------
// Phase 04-05 — Per-contact AI personalization via Claude + web_search.
//
// ADJACENT to /send-campaign. Phase 04-01 /send-campaign stays byte-for-byte
// unchanged so the Phase 4 firewall holds.
//
// Two modes (body `mode` field):
//   - 'preview' (default): personalize the FIRST contact only and return the
//                          rendered email + cost telemetry. Caches per
//                          (firstContactId, templateId) so re-clicking
//                          "Generate Preview" doesn't re-spend Claude credits.
//                          Does NOT create a Campaign row (no analytics surface).
//   - 'send':              full dispatch — personalize each contact, render with
//                          per-stream null-token fallback, send via Resend (Sara),
//                          create ONE Campaign row + per-contact EmailLog rows
//                          so the existing /campaigns/:id/analytics page shows
//                          these AI-personalized sends (filter source='apollo-ai').
//
// Hard guards (Sara protection):
//   - 100-contact cap in 'send' mode (Resend account quality score). 'preview'
//     is implicitly 1-contact.
//   - APOLLO_FROM_EMAIL is the ONLY accepted sender. Request-body fromEmail is
//     logged + ignored. Singleton Resend client reused from the file head.
//   - APOLLO_FROM_EMAIL string stored in personalized_email_sends.fromEmail
//     and emailLog.fromEmail (analytics filter on Sara's identity).

const PERSONALIZE_SEND_CAP = 100; // 'send' mode max contacts (Sara protection)
const PERSONALIZE_PACING_MS = 250; // 4 req/sec < Resend's 5/sec limit

interface ApolloSendPersonalizedRequestBody {
  contactIds: string[];
  templateId: string;
  mode?: 'preview' | 'send';
  scheduledAt?: string; // Phase 04-08 — ISO datetime; in 'send' mode, stage SCHEDULED rows if > now().
  // `fromEmail` from request body is IGNORED — APOLLO_FROM_EMAIL constant.
}

router.post('/send-personalized-campaign', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const {
      contactIds,
      templateId,
      mode = 'preview',
      scheduledAt,
      fromEmail: requestFromEmail,
    } = (req.body || {}) as ApolloSendPersonalizedRequestBody & { fromEmail?: string };

    // ===== Validation =====
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds must be a non-empty array' });
    }
    if (!templateId || typeof templateId !== 'string') {
      return res.status(400).json({ error: 'templateId required' });
    }
    if (mode !== 'preview' && mode !== 'send') {
      return res.status(400).json({ error: 'mode must be "preview" or "send"' });
    }

    // Phase 04-08 — parse optional scheduledAt (only honored in 'send' mode).
    let scheduleTime: Date | null = null;
    if (scheduledAt) {
      const parsed = new Date(scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'scheduledAt must be a valid ISO datetime string' });
      }
      scheduleTime = parsed;
    }

    // Sara guard — log + ignore any request-side fromEmail attempts.
    if (requestFromEmail && requestFromEmail !== APOLLO_FROM_EMAIL) {
      // eslint-disable-next-line no-console
      console.warn(
        `[apollo.send-personalized-campaign] ignored client-supplied fromEmail=${requestFromEmail} ; forcing APOLLO_FROM_EMAIL=${APOLLO_FROM_EMAIL}`,
      );
    }

    // Sara protection cap (send mode only — preview is implicitly 1 contact)
    if (mode === 'send' && contactIds.length > PERSONALIZE_SEND_CAP) {
      return res.status(400).json({
        error: 'batch_too_large',
        message: `Max ${PERSONALIZE_SEND_CAP} contacts per send to protect Resend account quality score.`,
        attempted: contactIds.length,
      });
    }

    // ===== Template lookup (must belong to caller) =====
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId },
    });
    if (!template) return res.status(404).json({ error: 'template_not_found' });

    // ===== PREVIEW MODE — first contact only, cached per (firstContactId, templateId) =====
    if (mode === 'preview') {
      const firstContactId = contactIds[0];
      const firstContact = await prisma.contact.findFirst({
        where: { id: firstContactId, userId },
        include: { company: true },
      });
      if (!firstContact) return res.status(404).json({ error: 'contact_not_found' });

      // Cache: re-use existing preview row for this (contactId, templateId, status='preview').
      // Re-clicking "Generate Preview" returns the same row — no Claude credit re-spend.
      const cached = await prisma.personalizedEmailSend.findFirst({
        where: {
          contactId: firstContact.id,
          templateId,
          status: 'preview',
          userId,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (cached) {
        return res.status(200).json({ preview: cached, cached: true });
      }

      // Determine stream — prefer contact.stream (set by /import classifier), else 'Other'.
      const stream = firstContact.stream || 'Other';

      // Call Claude (never throws — returns warning string on failure).
      const result = await personalizeContactWithClaude(
        {
          firstName: firstContact.firstName,
          lastName: firstContact.lastName,
          title: firstContact.title,
          apolloRawData: (firstContact as any).apolloRawData,
          company: firstContact.company
            ? {
                name: firstContact.company.name,
                industry: (firstContact.company as any).industry ?? null,
              }
            : null,
        },
        stream,
      );

      // Render body with AI tokens (per-stream fallback for null tokens)
      const fallbacks = getStreamFallbacks(stream);
      const aiTokens = result.tokens ?? {
        intentHook: null,
        companyContext: null,
        painPoint: null,
        cta: null,
      };
      const vars: Record<string, string> = {
        firstName: firstContact.firstName || '',
        lastName: firstContact.lastName || '',
        email: firstContact.email || '',
        companyName: firstContact.company?.name || '',
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

      // Persist preview row (status='preview') — becomes the cache key for next call.
      const saved = await prisma.personalizedEmailSend.create({
        data: {
          contactId: firstContact.id,
          templateId: template.id,
          stream,
          fromEmail: APOLLO_FROM_EMAIL,
          toEmail: firstContact.email || '',
          subject,
          renderedBody: html,
          aiTokens: (result.tokens as any) ?? undefined,
          aiWarning: result.warning ?? null,
          claudeInputTokens: result.usage.inputTokens,
          claudeOutputTokens: result.usage.outputTokens,
          webSearchUses: result.usage.webSearchUses,
          claudeCostUSD: result.usage.costUSD,
          status: 'preview',
          userId,
        },
      });

      return res.status(200).json({ preview: saved, cached: false });
    }

    // ===== SEND MODE — personalize each contact, dispatch via Resend, write Campaign + EmailLog =====
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, userId },
      include: { company: true },
    });
    if (contacts.length === 0) return res.status(404).json({ error: 'no_contacts_found' });

    // Unified analytics: ONE Campaign row covers the whole batch.
    // source='apollo-ai' distinguishes from non-personalized 'apollo' (04-01) sends.
    const today = new Date().toISOString().slice(0, 10);
    // Best-effort batch stream label = the most common stream across the selected contacts.
    const streamCounts: Record<string, number> = {};
    for (const c of contacts) {
      const s = c.stream || 'Other';
      streamCounts[s] = (streamCounts[s] || 0) + 1;
    }
    const batchStream =
      Object.entries(streamCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';

    // Phase 04-08 — When scheduledAt is in the future, Campaign starts SCHEDULED + EmailLog
    // rows are staged (still personalized upfront via Claude — the AI cost is incurred at
    // staging time, NOT dispatch time, so Rajesh sees the cost line item right away).
    const isScheduledSend = !!scheduleTime && scheduleTime.getTime() > Date.now();

    const campaign = await prisma.campaign.create({
      data: {
        name: `Apollo AI-Personalized — ${batchStream} — ${today}`,
        subject: template.subject,
        htmlContent: template.htmlContent || STREAM_TEMPLATE_V2_BODY,
        status: isScheduledSend ? 'SCHEDULED' : 'SENDING',
        scheduledAt: isScheduledSend ? scheduleTime : null,
        source: 'apollo-ai',
        userId,
      },
    });

    const failureDetails: Array<{
      contactId: string;
      email: string | null;
      error: string;
    }> = [];
    const audit: any[] = [];
    let sent = 0;
    let staged = 0; // Phase 04-08 — counts rows staged for later dispatch (scheduled path)
    let personalized = 0;
    let personalizeFailures = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalWebSearchUses = 0;
    let totalClaudeCostUSD = 0;

    for (const contact of contacts) {
      const stream = contact.stream || batchStream;

      // 1. Personalize (never throws — returns warning on failure)
      const result = await personalizeContactWithClaude(
        {
          firstName: contact.firstName,
          lastName: contact.lastName,
          title: contact.title,
          apolloRawData: (contact as any).apolloRawData,
          company: contact.company
            ? {
                name: contact.company.name,
                industry: (contact.company as any).industry ?? null,
              }
            : null,
        },
        stream,
      );

      if (result.tokens) personalized += 1;
      else personalizeFailures += 1;

      totalInputTokens += result.usage.inputTokens;
      totalOutputTokens += result.usage.outputTokens;
      totalWebSearchUses += result.usage.webSearchUses;
      totalClaudeCostUSD += result.usage.costUSD;

      // 2. Render body (per-stream fallback for null tokens)
      const fallbacks = getStreamFallbacks(stream);
      const aiTokens = result.tokens ?? {
        intentHook: null,
        companyContext: null,
        painPoint: null,
        cta: null,
      };
      const vars: Record<string, string> = {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
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

      // 3. Persist personalized_email_sends row (status='pending') BEFORE Resend dispatch.
      const auditRow = await prisma.personalizedEmailSend.create({
        data: {
          contactId: contact.id,
          templateId: template.id,
          stream,
          fromEmail: APOLLO_FROM_EMAIL,
          toEmail: contact.email || '',
          subject,
          renderedBody: html,
          aiTokens: (result.tokens as any) ?? undefined,
          aiWarning: result.warning ?? null,
          claudeInputTokens: result.usage.inputTokens,
          claudeOutputTokens: result.usage.outputTokens,
          webSearchUses: result.usage.webSearchUses,
          claudeCostUSD: result.usage.costUSD,
          status: 'pending',
          userId,
        },
      });

      // 4. Resend dispatch — Sara only.
      if (!contact.email) {
        await prisma.personalizedEmailSend.update({
          where: { id: auditRow.id },
          data: { status: 'failed', resendError: 'contact has no email' },
        });
        await prisma.emailLog.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            toEmail: null,
            fromEmail: APOLLO_REPLY_TO,
            status: 'FAILED',
            errorMessage: 'contact has no email',
            metadata: { personalizedSendId: auditRow.id },
          },
        });
        failureDetails.push({
          contactId: contact.id,
          email: null,
          error: 'contact has no email',
        });
        continue;
      }

      // Phase 04-08 — SCHEDULED branch: stage EmailLog with status='SCHEDULED', pre-rendered
      // subject+html on metadata. Dispatcher fires it at scheduleTime via the SAME Sara sender.
      // Skip per-row resend pacing in scheduled mode (no Resend call here).
      if (isScheduledSend && scheduleTime) {
        await prisma.emailLog.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            toEmail: contact.email,
            fromEmail: APOLLO_REPLY_TO,
            status: 'SCHEDULED',
            scheduledAt: scheduleTime,
            metadata: {
              subject,
              html,
              personalizedSendId: auditRow.id,
              transport: 'resend',
              source: 'apollo-ai',
            },
          },
        });
        staged += 1;
        audit.push({
          contactId: contact.id,
          email: contact.email,
          auditId: auditRow.id,
          aiTokens: result.tokens,
          aiWarning: result.warning,
          status: 'scheduled',
        });
        continue;
      }

      try {
        const sendResult = await resend.emails.send({
          from: APOLLO_FROM_EMAIL,
          to: contact.email,
          subject,
          html,
          replyTo: APOLLO_REPLY_TO,
        });

        if ((sendResult as any).error) {
          const errMsg = String(
            (sendResult as any).error?.message || (sendResult as any).error,
          );
          await prisma.personalizedEmailSend.update({
            where: { id: auditRow.id },
            data: { status: 'failed', resendError: errMsg },
          });
          await prisma.emailLog.create({
            data: {
              campaignId: campaign.id,
              contactId: contact.id,
              toEmail: contact.email,
              fromEmail: APOLLO_REPLY_TO,
              status: 'FAILED',
              errorMessage: errMsg,
              metadata: { personalizedSendId: auditRow.id },
            },
          });
          failureDetails.push({
            contactId: contact.id,
            email: contact.email,
            error: errMsg,
          });
        } else {
          const messageId = (sendResult as any).data?.id || null;
          sent += 1;
          await prisma.personalizedEmailSend.update({
            where: { id: auditRow.id },
            data: {
              status: 'sent',
              resendMessageId: messageId,
              sentAt: new Date(),
            },
          });
          await prisma.emailLog.create({
            data: {
              campaignId: campaign.id,
              contactId: contact.id,
              toEmail: contact.email,
              fromEmail: APOLLO_REPLY_TO,
              messageId,
              status: 'SENT',
              sentAt: new Date(),
              metadata: { personalizedSendId: auditRow.id },
            },
          });
          audit.push({
            contactId: contact.id,
            email: contact.email,
            auditId: auditRow.id,
            messageId,
            aiTokens: result.tokens,
            aiWarning: result.warning,
            status: 'sent',
          });
        }
      } catch (err: any) {
        const errMsg = err?.message || 'send_threw';
        await prisma.personalizedEmailSend.update({
          where: { id: auditRow.id },
          data: { status: 'failed', resendError: errMsg },
        });
        try {
          await prisma.emailLog.create({
            data: {
              campaignId: campaign.id,
              contactId: contact.id,
              toEmail: contact.email,
              fromEmail: APOLLO_REPLY_TO,
              status: 'FAILED',
              errorMessage: errMsg,
              metadata: { personalizedSendId: auditRow.id },
            },
          });
        } catch {
          // Best-effort logging — don't let an EmailLog write failure mask the send error.
        }
        failureDetails.push({
          contactId: contact.id,
          email: contact.email,
          error: errMsg,
        });
      }

      // 5. Pacing — 4 req/sec to stay under Resend's 5/sec rate limit.
      await new Promise<void>((r) => setTimeout(r, PERSONALIZE_PACING_MS));
    }

    // Phase 04-08 — scheduled batch: Campaign stays SCHEDULED, return immediately.
    // Dispatcher will roll it to SENT/CANCELLED after the last EmailLog dispatches.
    if (isScheduledSend && scheduleTime) {
      return res.status(200).json({
        scheduled: true,
        scheduledAt: scheduleTime.toISOString(),
        count: staged,
        sent: 0,
        failed: failureDetails.length,
        personalized,
        personalizeFailures,
        campaignId: campaign.id,
        failureDetails,
        audit,
        cost: {
          claudeInputTokens: totalInputTokens,
          claudeOutputTokens: totalOutputTokens,
          webSearchRequests: totalWebSearchUses,
          claudeCostUSD: Number(totalClaudeCostUSD.toFixed(6)),
          resendSendsCounted: 0,
          resendCostUSD: 0,
          totalCostUSD: Number(totalClaudeCostUSD.toFixed(6)),
        },
      });
    }

    // Mark Campaign SENT (or CANCELLED if 0 succeeded)
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: sent > 0 ? 'SENT' : 'CANCELLED',
        sentAt: sent > 0 ? new Date() : null,
        totalSent: sent,
      },
    });

    return res.status(200).json({
      sent,
      failed: failureDetails.length,
      personalized,
      personalizeFailures,
      campaignId: campaign.id,
      failureDetails,
      audit,
      cost: {
        claudeInputTokens: totalInputTokens,
        claudeOutputTokens: totalOutputTokens,
        webSearchRequests: totalWebSearchUses,
        claudeCostUSD: Number(totalClaudeCostUSD.toFixed(6)),
        resendSendsCounted: sent,
        resendCostUSD: 0, // Resend free tier — keep one named line for future paid-tier swap
        totalCostUSD: Number(totalClaudeCostUSD.toFixed(6)),
      },
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[apollo.send-personalized-campaign] unexpected error:', err);
    return res
      .status(500)
      .json({ error: 'send_personalized_failed', detail: err?.message || String(err) });
  }
});

export default router;
