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
const APOLLO_FROM_EMAIL = 'Sara <sara@techcloudpro.com>';
const APOLLO_REPLY_TO = 'sara@techcloudpro.com';

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
// POST /api/apollo/send-campaign
// ---------------------------------------------------------------------------
// Phase 04 USER-LOCKED send path. Dispatches campaign emails via Resend (NOT SES).
// Uses 3-layer template fallback: Stream:<x> -> Stream:Other -> HARDCODED.
// Creates a Campaign DB row + per-contact EmailLog rows so sends appear in the
// existing /campaigns/<id>/analytics view that Rajesh already uses.

router.post('/send-campaign', async (req: Request, res: Response) => {
  const { contactIds, stream, fromEmail: requestFromEmail } =
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
    const today = new Date().toISOString().slice(0, 10);
    const campaign = await prisma.campaign.create({
      data: {
        name: `Apollo Campaign — ${stream} — ${today}`,
        subject: templateSubject,
        htmlContent: templateHtml,
        status: 'SENDING',
        source: 'apollo',
        userId,
      },
    });

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

export default router;
