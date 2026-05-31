// backend/src/seeds/stream-templates.ts
//
// Idempotent seeder for stream-specific EmailTemplate rows.
//
// Phase 4 plan 04-03. Called by:
//   - POST /api/email-templates/seed-streams (one-shot per user, added in this plan)
//   - (Future) a user-signup hook so every new account gets the canonical 9 templates.
//
// Each row uses `EmailTemplate.category = 'Stream:<name>'` so the wizard in plan 04-05
// can `findFirst({ where: { category: 'Stream:NetSuite', userId } })`.
//
// Signature: "Sara, TechCloudPro" (Phase 4 locked from-address Sara <sara@techcloudpro.com>,
// May 26 2026 Peter→Sara swap — techcloudpro.com is the Resend-verified domain).
//
// The "Other" template is INCLUDED — Plan 04-05's 3-layer fallback chain ends here when
// the classifier returns a legacy bucket (Full-Stack, Web3, Product/Design, QA/Testing)
// outside the canonical 9 streams.

import { PrismaClient } from '@prisma/client';

export interface StreamTemplateSeed {
  stream: string;
  subject: string;
  htmlSnippet: string;
}

export const STREAM_TEMPLATE_SEEDS: StreamTemplateSeed[] = [
  {
    stream: 'NetSuite',
    subject: 'NetSuite implementation help — quick chat?',
    htmlSnippet:
      "<p>Hi {{firstName}},</p><p>We help companies like {{companyName}} cut NetSuite go-live time by 40%. Open to a 15-min call?</p><p>— Sara, TechCloudPro</p>",
  },
  {
    stream: 'AI/ML',
    subject: 'AI/ML engineering capacity for {{companyName}}',
    htmlSnippet:
      "<p>Hi {{firstName}},</p><p>Our AI/ML bench has GPU-trained engineers available immediately. Could we share two profiles for {{companyName}}?</p><p>— Sara, TechCloudPro</p>",
  },
  {
    stream: 'Cloud/DevOps',
    subject: 'AWS/Azure architects for {{companyName}}',
    htmlSnippet:
      "<p>Hi {{firstName}},</p><p>Senior cloud architects with multi-region experience are on our bench. Want to see a few profiles for {{companyName}}?</p><p>— Sara, TechCloudPro</p>",
  },
  {
    stream: 'Cybersecurity',
    subject: 'Security engineers — bench available',
    htmlSnippet:
      "<p>Hi {{firstName}},</p><p>Cleared SOC analysts + AppSec engineers available. Quick chat for {{companyName}}?</p><p>— Sara, TechCloudPro</p>",
  },
  {
    stream: 'Data/Analytics',
    subject: 'Data engineering capacity for {{companyName}}',
    htmlSnippet:
      "<p>Hi {{firstName}},</p><p>Snowflake + dbt engineers available. Want to walk through {{companyName}}'s pipeline?</p><p>— Sara, TechCloudPro</p>",
  },
  {
    stream: 'Mobile',
    subject: 'iOS/Android engineers for {{companyName}}',
    htmlSnippet:
      "<p>Hi {{firstName}},</p><p>Native + cross-platform mobile engineers on bench. 15-min intro for {{companyName}}?</p><p>— Sara, TechCloudPro</p>",
  },
  {
    stream: 'Enterprise/ERP',
    subject: 'ERP implementation help — quick chat?',
    htmlSnippet:
      "<p>Hi {{firstName}},</p><p>Cross-platform ERP consultants (SAP / NetSuite / Oracle) for {{companyName}}. Worth a chat?</p><p>— Sara, TechCloudPro</p>",
  },
  {
    stream: 'Staffing/HR',
    subject: 'Tech staffing partnership for {{companyName}}',
    htmlSnippet:
      "<p>Hi {{firstName}},</p><p>We supplement in-house recruiting with pre-vetted tech profiles. Worth a 15-min call for {{companyName}}?</p><p>— Sara, TechCloudPro</p>",
  },
  {
    stream: 'Other',
    subject: 'Tech engineers available for {{companyName}}',
    htmlSnippet:
      "<p>Hi {{firstName}},</p><p>We place senior engineers across the stack. Quick chat about {{companyName}}'s near-term needs?</p><p>— Sara, TechCloudPro</p>",
  },
];

/**
 * Idempotent: skips streams whose `Stream:<name>` category already exists
 * for the given user. Safe to call repeatedly (e.g., on signup AND from the
 * wizard's settings page).
 *
 * Plain-text version is derived by stripping HTML tags so the schema's
 * non-optional `textContent` field — wait, textContent is `String?` per
 * schema, so it CAN stay empty. We populate it for accessibility / spam-score
 * reasons regardless.
 */
export async function seedStreamTemplates(
  prisma: PrismaClient,
  userId: string,
): Promise<{ created: string[]; skipped: string[] }> {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const seed of STREAM_TEMPLATE_SEEDS) {
    const category = `Stream:${seed.stream}`;
    const existing = await prisma.emailTemplate.findFirst({
      where: { userId, category },
    });
    if (existing) {
      skipped.push(seed.stream);
      continue;
    }

    // Strip HTML for the plaintext fallback (basic — preserves accessibility).
    const textContent = seed.htmlSnippet
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    await prisma.emailTemplate.create({
      data: {
        userId,
        name: `Stream: ${seed.stream}`,
        subject: seed.subject,
        htmlContent: seed.htmlSnippet,
        textContent,
        // category field added to EmailTemplate in plan 04-03 schema migration
        // (manual/04-add-email-template-category.sql).
        category,
        variables: ['firstName', 'companyName'],
      } as any,
    });
    created.push(seed.stream);
  }

  return { created, skipped };
}

// ---------------------------------------------------------------------------
// Phase 05 Plan 01: v2 body shape with AI placeholders.
// The 9 existing Stream:* rows get their htmlContent updated in-place via
// upgradeStreamTemplatesToV2() — idempotent (only updates rows whose body
// lacks the {{intentHook}} marker).
//
// Per-token stream-generic fallback strings live HERE so the Wave 2 send-route
// can call getStreamFallbacks(stream) when Claude returns null tokens.
// ---------------------------------------------------------------------------

export const STREAM_TEMPLATE_V2_BODY = `<p>Hi {{firstName}},</p>

<p>{{intentHook}}</p>

<p>{{companyContext}}</p>

<p>{{painPoint}}</p>

<p>{{cta}}</p>

<p>— Sara, TechCloudPro</p>`;

// Per-stream generic fallback tokens (used when Claude returns null for a field).
// Keeps the body never-empty even when web_search produces nothing actionable.
export interface StreamFallbackTokens {
  intentHook: string;
  companyContext: string;
  painPoint: string;
  cta: string;
}

const GENERIC_FALLBACK: StreamFallbackTokens = {
  intentHook: 'Quick note from TechCloudPro.',
  companyContext: 'We help finance and ops teams move faster.',
  painPoint: 'Many teams in your space are wrestling with manual workflows that slow close and reporting.',
  cta: 'Open to a 15-minute chat next week to compare notes?',
};

const STREAM_FALLBACKS: Record<string, StreamFallbackTokens> = {
  'NetSuite': {
    intentHook: "Quick note from TCP's NetSuite practice.",
    companyContext: 'You scale fast — NetSuite needs to keep up.',
    painPoint: 'Manual data entry, slow close cycles, and reporting bottlenecks are the usual suspects.',
    cta: 'Worth a 15-minute call to compare notes on your NetSuite stack?',
  },
  'AI/ML': {
    intentHook: "Quick note from TCP's AI/ML practice.",
    companyContext: 'AI-forward teams move fast and need ops to keep up.',
    painPoint: 'Model deployment, monitoring, and cost control rarely scale linearly.',
    cta: 'Open to a 15-minute chat about your AI/ML ops stack?',
  },
  'Cloud/DevOps': {
    intentHook: "Quick note from TCP's Cloud/DevOps practice.",
    companyContext: 'Cloud teams move fast — costs and observability rarely keep up.',
    painPoint: 'Multi-account sprawl and cost reporting often outpace tooling.',
    cta: 'Open to a 15-minute call about your cloud cost or observability roadmap?',
  },
  'Cybersecurity': {
    intentHook: "Quick note from TCP's Cybersecurity practice.",
    companyContext: 'Security teams in your space are stretched thin.',
    painPoint: 'Compliance, vendor risk, and IAM tooling rarely scale linearly with company growth.',
    cta: 'Worth a 15-minute chat about your security ops priorities this quarter?',
  },
  'Data/Analytics': {
    intentHook: "Quick note from TCP's Data/Analytics practice.",
    companyContext: 'Data teams are the unsung backbone of fast-growing companies.',
    painPoint: 'Pipeline reliability, governance, and reporting latency are the usual suspects.',
    cta: 'Open to a 15-minute chat about your data platform priorities?',
  },
  'Mobile': {
    intentHook: "Quick note from TCP's Mobile practice.",
    companyContext: 'Mobile-first teams ship fast — release ops rarely keeps up.',
    painPoint: 'Release pipelines, store ops, and observability often lag the product.',
    cta: 'Open to a 15-minute call about your mobile release ops?',
  },
  'Enterprise/ERP': {
    intentHook: "Quick note from TCP's Enterprise/ERP practice.",
    companyContext: 'ERP transformations live or die on data quality and change management.',
    painPoint: 'Manual reconciliations, slow month-end close, and brittle integrations are common.',
    cta: 'Worth a 15-minute chat about your ERP roadmap?',
  },
  'Staffing/HR': {
    intentHook: "Quick note from TCP's Staffing/HR practice.",
    companyContext: 'HR tech stacks rarely scale with headcount.',
    painPoint: 'Onboarding, payroll integrations, and reporting often outgrow the original tools.',
    cta: 'Open to a 15-minute call about your HR tech roadmap?',
  },
  'Other': GENERIC_FALLBACK,
};

export function getStreamFallbacks(stream: string): StreamFallbackTokens {
  return STREAM_FALLBACKS[stream] ?? GENERIC_FALLBACK;
}

/**
 * Idempotent in-place upgrade of the 9 Stream:* email_templates rows for a given user.
 * Only updates rows whose htmlContent does NOT already contain {{intentHook}}.
 * Returns counts so callers (the upgrade endpoint, future seeders) can report status.
 */
export async function upgradeStreamTemplatesToV2(
  prisma: PrismaClient,
  userId: string,
): Promise<{ upgraded: string[]; alreadyV2: string[]; total: number }> {
  const rows = await prisma.emailTemplate.findMany({
    where: { userId, category: { startsWith: 'Stream:' } },
    select: { id: true, name: true, htmlContent: true },
  });

  const upgraded: string[] = [];
  const alreadyV2: string[] = [];

  for (const row of rows) {
    if ((row.htmlContent || '').includes('{{intentHook}}')) {
      alreadyV2.push(row.name);
      continue;
    }
    await prisma.emailTemplate.update({
      where: { id: row.id },
      data: { htmlContent: STREAM_TEMPLATE_V2_BODY },
    });
    upgraded.push(row.name);
  }

  return { upgraded, alreadyV2, total: rows.length };
}
