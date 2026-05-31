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

// ---------------------------------------------------------------------------
// Phase quick-8: v3 body shape — port of the TCP v6 branded email shell
// (source: /Users/jeet/Documents/CRM Module/crm-pipeline/tcp-retargeting/templates/tcp-v6-email-template.html)
//
// Differences from the source v6 shell:
//   1. STRIP the video poster row (the <a href="{{videoUrl}}"> + <img {{inlineGifUrl}}>
//      + VML round-rect + "Watch with sound" button + their wrapping <table> at navy bgcolor #0F172A).
//   2. STRIP the tracking pixel ({{trackingId}} <img src=brandmonkz.com/api/tracking/open/...>).
//   3. REPLACE the {{whyThis}} block in the orange-tinted "About this note to {{companyName}}" callout
//      with 4 separate <p> tags, one per Phase 5 AI token, each styled to match the surrounding body:
//        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{intentHook}}</p>
//        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{companyContext}}</p>
//        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{painPoint}}</p>
//        <p style="margin:0 0 0 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{cta}}</p>
//      (Color #7C2D12 = darker orange, matches the C2410C label tone in the callout. Last <p> has 0 bottom margin.)
//   4. Replace {{unsubscribeUrl}} hardcoded mailto:sara@techcloudpro.com?subject=Unsubscribe (per scope: hardcoded mailto, NOT a tracking URL).
//   5. Leave KEPT placeholders ({{firstName}}, {{companyName}}) untouched — Phase 5 substitution loop handles them.
//
// Total placeholder set in v3:
//   - {{firstName}}, {{companyName}}  — substituted by Phase 5 vars loop (apollo.ts:973-982)
//   - {{intentHook}}, {{companyContext}}, {{painPoint}}, {{cta}}  — substituted by Phase 5 vars loop (same)
//
// No {{whyThis}}, no {{videoUrl}}, no {{inlineGifUrl}}, no {{trackingId}}, no {{unsubscribeUrl}}.
//
// Phase 5 variable-substitution loop (apollo.ts:984-990) uses `\{\{key\}\}` regex per known var,
// so any token NOT in `vars` survives as a literal in the rendered body. We MUST NOT introduce
// new placeholders v3-only — only the 4 AI tokens + 2 contact tokens that vars already covers.
// ---------------------------------------------------------------------------

export const STREAM_TEMPLATE_V3_BODY = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>What TechCloudPro can do for {{companyName}}</title>
<style>
  body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100% !important; }
  table { border-collapse: collapse !important; }
  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
    .em-header, .em-body, .em-footer { padding-left: 20px !important; padding-right: 20px !important; }
    .video-poster { width: 100% !important; max-width: 100% !important; height: auto !important; }
    .h1-headline { font-size: 18px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9">
<tr><td align="center" style="padding:24px 12px;">

<!-- Hidden preheader -->
<div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
Quick 45-second look at how we can help {{companyName}}. NetSuite, ArthaBuild AI, custom AI work, and our $1 staffing model.
</div>

<div class="email-container" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.06);font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">

  <!-- Top accent bar -->
  <div style="height:3px;background:linear-gradient(90deg, #2563EB 0%, #1E40AF 40%, #F97316 100%);"></div>

  <!-- Dark navy header -->
  <div class="em-header" style="background:#0F172A;padding:28px 34px 26px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td width="48" valign="top" style="padding-right:18px;">
          <div style="width:48px;height:48px;background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:10px;text-align:center;line-height:48px;box-shadow:0 6px 20px rgba(37,99,235,0.4);">
            <span style="color:#fff;font-size:22px;font-weight:900;font-family:'Plus Jakarta Sans',sans-serif;line-height:48px;">T</span>
          </div>
        </td>
        <td valign="top">
          <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.35);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
            TechCloudPro &middot; Certified Solutions Provider &middot; 1000+ Implementations
          </div>
          <h1 class="h1-headline" style="font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;margin:0 0 10px;letter-spacing:-0.02em;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
            For the team at {{companyName}}.<br><span style="color:#F97316;">Four ways</span> we can help.
          </h1>
          <span style="display:inline-block;background:rgba(37,99,235,0.2);border:1px solid rgba(37,99,235,0.35);border-radius:20px;padding:4px 12px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#60A5FA;margin-right:6px;vertical-align:middle;"></span>
            <span style="font-size:10px;font-weight:700;color:#93C5FD;letter-spacing:0.06em;text-transform:uppercase;vertical-align:middle;">NetSuite Next &middot; ArthaBuild AI &middot; $1 Staffing</span>
          </span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Metrics row -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#F8FAFC;border-top:1px solid #E8EDF4;border-bottom:1px solid #E8EDF4;">
    <tr>
      <td align="center" valign="top" style="padding:16px 8px;border-right:1px solid #E8EDF4;width:25%;">
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:800;color:#0F172A;line-height:1;letter-spacing:-0.03em;">1000<span style="color:#F97316;">+</span></div>
        <div style="font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;">Implementations</div>
      </td>
      <td align="center" valign="top" style="padding:16px 8px;border-right:1px solid #E8EDF4;width:25%;">
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:800;color:#0F172A;line-height:1;letter-spacing:-0.03em;">Since<span style="color:#F97316;"> 2015</span></div>
        <div style="font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;">NetSuite Practice</div>
      </td>
      <td align="center" valign="top" style="padding:16px 8px;border-right:1px solid #E8EDF4;width:25%;">
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:800;color:#0F172A;line-height:1;letter-spacing:-0.03em;">94<span style="color:#F97316;">%</span></div>
        <div style="font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;">Faster Close</div>
      </td>
      <td align="center" valign="top" style="padding:16px 8px;width:25%;">
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:800;color:#0F172A;line-height:1;letter-spacing:-0.03em;"><span style="color:#F97316;">$</span>1<span style="color:#F97316;">/contract</span></div>
        <div style="font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;">Staffing Fee</div>
      </td>
    </tr>
  </table>

  <!-- Body -->
  <div class="em-body" style="padding:28px 34px 24px;color:#1E293B;">

    <p style="font-size:15px;line-height:1.8;margin:0 0 18px;color:#334155;">
      Hi <strong>{{firstName}}</strong>,
    </p>

    <!-- Why this for {{companyName}} (research-driven) -->
    <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:14px 18px;margin:0 0 22px;">
      <div style="font-size:11px;font-weight:800;color:#C2410C;letter-spacing:0.10em;text-transform:uppercase;margin-bottom:8px;">About this note to {{companyName}}</div>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{intentHook}}</p>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{companyContext}}</p>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{painPoint}}</p>
      <p style="margin:0 0 0 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{cta}}</p>
    </div>

    <!-- Intro paragraph -->
    <p style="font-size:15px;line-height:1.75;margin:0 0 18px;color:#334155;">
      We're a senior NetSuite and AI team. <strong>Certified. Around since 2015. Over 1,000 implementations.</strong> Here's what we actually do, and how it lines up with {{companyName}}. Pricing is upfront on every piece.
    </p>

    <!-- AI banner -->
    <div style="background:linear-gradient(135deg,#EFF6FF,#F0F4FF);border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;margin-bottom:22px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="36" valign="top" style="padding-right:14px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:8px;text-align:center;line-height:36px;box-shadow:0 4px 10px rgba(37,99,235,0.3);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:9px;">
                <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M8 15h.01M12 15h.01M16 15h.01"/>
              </svg>
            </div>
          </td>
          <td valign="top">
            <div style="font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">A note on NetSuite Next 2026</div>
            <p style="font-size:13px;color:#1E40AF;line-height:1.6;margin:0;">
              <strong style="color:#1E3A8A;">SuiteCloud AI, Predictive Planning, AI Workspaces.</strong> They take a lot more than SuiteScript. Our team plus our own NetSuite copilot, <strong style="color:#1E3A8A;">ArthaBuild AI</strong>, handle the modern stack end to end.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- 4 Service Value Props -->
    <div style="padding:11px 15px;background:#F8FAFC;border-left:3px solid #2563EB;border-radius:0 6px 6px 0;margin-bottom:9px;">
      <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:2px;letter-spacing:-0.01em;">01 &middot; NetSuite Practice. Senior team, since 2015.</div>
      <div style="font-size:12px;color:#64748B;line-height:1.55;">Full-cycle implementation, optimization, managed services. Multi-entity, OneWorld, NetSuite Next 2026. Senior architects on the engagement, never juniors.</div>
    </div>
    <div style="padding:11px 15px;background:#F8FAFC;border-left:3px solid #F97316;border-radius:0 6px 6px 0;margin-bottom:9px;">
      <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:2px;letter-spacing:-0.01em;">02 &middot; ArthaBuild AI. Your NetSuite copilot.</div>
      <div style="font-size:12px;color:#64748B;line-height:1.55;">Writes <strong style="color:#0F172A;">SuiteScript</strong>, drafts <strong style="color:#0F172A;">BRDs</strong>, builds <strong style="color:#0F172A;">technical documentation</strong>, and suggests <strong style="color:#0F172A;">improvements to your environment</strong>. Live at <a href="https://artha.build" target="_blank" style="color:#F97316;font-weight:600;text-decoration:none;">artha.build</a>.</div>
    </div>
    <div style="padding:11px 15px;background:#F8FAFC;border-left:3px solid #2563EB;border-radius:0 6px 6px 0;margin-bottom:9px;">
      <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:2px;letter-spacing:-0.01em;">03 &middot; Dedicated AI Consulting</div>
      <div style="font-size:12px;color:#64748B;line-height:1.55;">Custom RAG, agents, anti-hallucination workflows. Grounded in your data, built for production. We don't ship demo-room work.</div>
    </div>
    <div style="padding:11px 15px;background:#0F172A;border-left:3px solid #F97316;border-radius:0 6px 6px 0;margin-bottom:9px;">
      <div style="font-size:13px;font-weight:700;color:#ffffff;margin-bottom:2px;letter-spacing:-0.01em;">04 &middot; Transparent staffing. <span style="color:#F97316;">$1 per contract.</span></div>
      <div style="font-size:12px;color:#CBD5E1;line-height:1.55;">Same fee for candidates and companies. No hidden cuts. No 15 to 20% markup. *Conditions apply.</div>
    </div>

    <!-- 30-day guarantee -->
    <div style="display:block;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 18px;margin:18px 0 26px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="38" valign="middle" style="padding-right:14px;">
            <div style="width:38px;height:38px;background:#16A34A;border-radius:50%;text-align:center;line-height:38px;box-shadow:0 4px 12px rgba(22,163,74,0.3);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:10px;"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </td>
          <td valign="middle">
            <div style="font-size:13px;font-weight:700;color:#15803D;margin-bottom:3px;letter-spacing:-0.01em;">30-Day Performance Guarantee</div>
            <div style="font-size:12px;color:#166534;line-height:1.5;">If your hire isn't delivering inside 30 days, we replace them at no cost. Zero risk on your end.</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- 4 CTA Buttons -->
    <div style="background:#F8FAFC;border:1px solid #E8EDF4;border-radius:12px;padding:22px 20px;margin-bottom:6px;">
      <div style="text-align:center;font-size:14px;font-weight:700;color:#0F172A;margin-bottom:4px;letter-spacing:-0.01em;">Pick whichever path makes sense.</div>
      <div style="text-align:center;font-size:12px;color:#64748B;margin-bottom:18px;line-height:1.5;">ARIA answers around the clock. A human is one tap away. Or just poke around the websites.</div>

      <!-- Row 1: Aria + Human (2 cols) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;margin-bottom:10px;">
        <tr>
          <td width="49%" valign="top" style="padding-right:5px;">
            <a href="tel:+12602548829" style="display:block;background-color:#1E40AF;background-image:linear-gradient(135deg,#1E40AF,#2563EB);border-radius:9px;padding:14px;text-decoration:none;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td width="36" valign="middle" style="padding-right:10px;">
                  <div style="width:36px;height:36px;background:rgba(255,255,255,0.18);border-radius:8px;text-align:center;line-height:36px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:9px;"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M8 15h.01M12 15h.01M16 15h.01"/></svg>
                  </div>
                </td>
                <td valign="middle">
                  <div style="font-size:13px;font-weight:700;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">Call ARIA</div>
                  <div style="font-size:10px;color:rgba(255,255,255,0.75);margin-top:2px;line-height:1.2;">AI Receptionist · 24/7</div>
                </td>
              </tr></table>
            </a>
          </td>
          <td width="49%" valign="top" style="padding-left:5px;">
            <a href="tel:+14156966429" style="display:block;background-color:#1E293B;border-radius:9px;padding:14px;text-decoration:none;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td width="36" valign="middle" style="padding-right:10px;">
                  <div style="width:36px;height:36px;background:rgba(255,255,255,0.10);border-radius:8px;text-align:center;line-height:36px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:9px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                </td>
                <td valign="middle">
                  <div style="font-size:13px;font-weight:700;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">Call a Human</div>
                  <div style="font-size:10px;color:rgba(255,255,255,0.55);margin-top:2px;line-height:1.2;">+1 (415) 696-6429</div>
                </td>
              </tr></table>
            </a>
          </td>
        </tr>
      </table>

      <!-- Row 2: Visit TechCloudPro (full width, teal) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin-bottom:10px;"><tr><td>
        <a href="https://techcloudpro.com/" target="_blank" style="display:block;background-color:#0891B2;background-image:linear-gradient(135deg,#0891B2,#0E7490);border-radius:9px;padding:16px 20px;text-decoration:none;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td width="40" valign="middle" style="padding-right:12px;">
              <div style="width:40px;height:40px;background:rgba(255,255,255,0.18);border-radius:8px;text-align:center;line-height:40px;">
                <span style="display:inline-block;width:26px;height:26px;background-color:#1E40AF;border-radius:5px;line-height:26px;color:#fff;font-size:14px;font-weight:900;font-family:'Plus Jakarta Sans',sans-serif;vertical-align:middle;margin-top:7px;">T</span>
              </div>
            </td>
            <td valign="middle">
              <div style="font-size:14px;font-weight:700;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">Visit TechCloudPro</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.8);margin-top:3px;line-height:1.2;">NetSuite Next · AI Consulting · $1 Staffing</div>
            </td>
            <td width="20" valign="middle" align="right">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </td>
          </tr></table>
        </a>
      </td></tr></table>

      <!-- Row 3: Visit artha.build (full width, orange, Artha brand) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td>
        <a href="https://artha.build" target="_blank" style="display:block;background-color:#EA6C0A;background-image:linear-gradient(135deg,#EA6C0A,#F97316);border-radius:9px;padding:16px 20px;text-decoration:none;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td width="40" valign="middle" style="padding-right:12px;">
              <div style="width:40px;height:40px;background:rgba(255,255,255,0.20);border-radius:8px;text-align:center;line-height:40px;">
                <span style="color:#fff;font-size:18px;font-weight:900;font-family:'Plus Jakarta Sans',sans-serif;line-height:40px;">A</span>
              </div>
            </td>
            <td valign="middle">
              <div style="font-size:14px;font-weight:700;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">Visit ArthaBuild AI</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.85);margin-top:3px;line-height:1.2;">Your NetSuite copilot · SuiteScript, BRDs, docs · artha.build</div>
            </td>
            <td width="20" valign="middle" align="right">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </td>
          </tr></table>
        </a>
      </td></tr></table>

      <div style="text-align:center;font-size:11px;color:#94A3B8;margin-top:14px;line-height:1.6;">
        <strong style="color:#2563EB;">ARIA</strong> is our AI receptionist. She knows NetSuite Next 2026, SuiteCloud AI, and our full services portfolio.<br>
        Available 24/7 · Powered by <strong style="color:#64748B;">VibingTicket AI Employees</strong>
      </div>
    </div>

    <!-- Divider -->
    <div style="height:1px;background:#F1F5F9;margin:24px 0 20px;"></div>

    <!-- Signature -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td width="44" valign="middle" style="padding-right:14px;">
          <div style="width:44px;height:44px;background:linear-gradient(135deg,#1E40AF,#2563EB);border-radius:50%;text-align:center;line-height:44px;color:#ffffff;font-weight:800;font-size:15px;">S</div>
        </td>
        <td valign="middle">
          <div style="font-size:14px;font-weight:700;color:#0F172A;letter-spacing:-0.01em;">Sara</div>
          <div style="font-size:12px;color:#64748B;margin:2px 0 3px;">Sales, TechCloudPro</div>
          <a href="https://techcloudpro.com" style="font-size:12px;font-weight:600;color:#2563EB;text-decoration:none;">techcloudpro.com</a>
        </td>
      </tr>
    </table>

  </div>

  <!-- Footer -->
  <div style="height:16px;"></div>
  <div class="em-footer" style="background:#F8FAFC;border-top:1px solid #E8EDF4;padding:16px 34px;text-align:center;">
    <p style="margin:0 0 4px;font-size:11px;color:#94A3B8;line-height:1.6;">TechCloudPro · 8383 Wilshire Blvd, Suite 800, Beverly Hills, CA 90211</p>
    <p style="margin:0;font-size:11px;color:#94A3B8;line-height:1.6;">You received this because you are on our list. <a href="mailto:sara@techcloudpro.com?subject=Unsubscribe" style="color:#F97316;text-decoration:none;font-weight:600;">Unsubscribe</a></p>
  </div>

</div>

</td></tr></table>
</body>
</html>`;

/**
 * Idempotent in-place upgrade of the 9 Stream:* email_templates rows from v2 → v3.
 * Detection sentinel: structural marker UNIQUE to v3 vs. v2 — the v6 shell always contains
 * the literal string `1000+ Implementations` from the metrics row. v2 body (~150 chars,
 * 5 <p> tags) does NOT contain this string. Use it as the v3 sentinel.
 *
 * Returns the same shape as upgradeStreamTemplatesToV2:
 *   { upgraded: string[], alreadyV3: string[], total: number }
 */
export async function upgradeStreamTemplatesToV3(
  prisma: PrismaClient,
  userId: string,
): Promise<{ upgraded: string[]; alreadyV3: string[]; total: number }> {
  const rows = await prisma.emailTemplate.findMany({
    where: { userId, category: { startsWith: 'Stream:' } },
    select: { id: true, name: true, htmlContent: true },
  });

  const upgraded: string[] = [];
  const alreadyV3: string[] = [];

  for (const row of rows) {
    if ((row.htmlContent || '').includes('1000+ Implementations')) {
      alreadyV3.push(row.name);
      continue;
    }
    await prisma.emailTemplate.update({
      where: { id: row.id },
      data: { htmlContent: STREAM_TEMPLATE_V3_BODY },
    });
    upgraded.push(row.name);
  }

  return { upgraded, alreadyV3, total: rows.length };
}
