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
