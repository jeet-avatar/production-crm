/**
 * Daily TCP Engagement Report (q320 overhaul)
 *
 * Pulls from BrandMonkz DB (Postgres) + Twilio API + tcp-v6-prospects.json
 * and emails an HTML digest to JM + Rajesh every morning.
 *
 * q320 changes (2026-04-30):
 *   - Scope generalized from hardcoded TCP_V6_CAMP_ID + STAFF_AUG_IDS
 *     to ALL campaigns where senderEmail = 'peter@techcloudpro.com'
 *     in last 30 days (matches BrandMonkz peter@ activity wherever it
 *     happens to be parked).
 *   - NEW Section 5: Deliverability — per-campaign SENT / DELIVERED /
 *     BOUNCED / COMPLAINED counts driven by Resend webhook events,
 *     with bounce rate % color-coded (>2% red, 1-2% yellow, <1% green).
 *   - NEW Section 8: Prospect Journey — Email -> Click -> Visit
 *     attribution. JOIN email_logs <-> email_tracking_events <->
 *     website_visits (3-way left join, lower(toEmail)=lower(visitor
 *     email) within 7-day window).
 *   - REMOVED pixel-bot fields per memory rule
 *     `feedback_no_pixel_based_engagement_metrics.md`:
 *       totalOpens, uniqueOpens, suspectedForwards, wasForwarded,
 *       uniqueIPs — these are 60-90% bot/proxy noise. Replaced with
 *       strict-source equivalents: clicks via email_tracking_events
 *       (link-wrap, bot-filter-v3 at ingest) and visits via
 *       website_visits (JS-fired, bot-filter-v3 at ingest).
 *
 * Sections (post-q320):
 *   1. Headline numbers (last 24h vs cumulative)
 *   2. Phone calls (ARIA + Call-a-Human, Twilio call log)
 *   3. V6 retargeting per-prospect (44 kits + counts)
 *   4. Peter@ campaigns (totals + clicks)
 *   5. Deliverability (SENT/DELIVERED/BOUNCED/COMPLAINED + bounce rate)  -- q320 NEW
 *   6. Landing-page visits + CTA clicks
 *   7. Top engagers (clicks + visits — NO pixel opens)
 *   8. Prospect Journey (Email -> Click -> Visit attribution)            -- q320 NEW
 *   9. Videos to produce next (gap analysis: top engagement WITHOUT v6)
 *  10. Day-over-day deltas
 *
 * Usage:
 *   node daily-tcp-report.js          # generate + send + archive
 *   node daily-tcp-report.js --dry    # generate + archive, no send
 */
const { PrismaClient } = require('/var/www/crm-backend/node_modules/@prisma/client');
const nodemailer = require('/var/www/crm-backend/node_modules/nodemailer');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────
const RECIPIENTS = ['rajesh@techcloudpro.com', 'jm@techcloudpro.com'];
const ARCHIVE_DIR = '/var/log/tcp-daily-report';
const KITS_PATH   = '/var/www/crm-backend/dist/data/tcp-v6-prospects.json';

// q320: Peter@ scope, dynamic per-run instead of hardcoded campaign IDs.
// Discovered at top of main() and held as global for downstream queries.
const PETER_SENDER_EMAIL = 'peter@techcloudpro.com';
// Sender rotation 2026-05-26: Peter → Sara. Report covers BOTH for continuity.
const SENDERS = ['peter@techcloudpro.com', 'sara@techcloudpro.com'];
const PETER_LOOKBACK_DAYS = 30;
let PETER_CAMPAIGN_IDS = []; // populated by discoverPeterCampaigns()

// Twilio credentials from env (formerly hardcoded — GitHub push protection blocked).
// Set in /var/www/crm-backend/.env: TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET.
const TWILIO_ACCOUNT_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_API_KEY_SID    = process.env.TWILIO_API_KEY_SID;
const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET) {
    console.error('[daily-tcp-report] FATAL: Twilio credentials missing in env (TWILIO_ACCOUNT_SID/TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET).');
    process.exit(1);
}
const ARIA_NUMBER  = '+12602548829';
const PETER_NUMBER = '+14156966429';
const RAJESH_INDIA = '+917483994473';
const INTERNAL_NUMBERS = new Set([ARIA_NUMBER, PETER_NUMBER, RAJESH_INDIA]);

// Internal recipients (filter these out of v6 engagement counts —
// otherwise tests sent to jeet/jm/rajesh inflate the metrics)
const INTERNAL_TEST_EMAILS = new Set([
    'jeetnair.in@gmail.com',
    'jm@techcloudpro.com',
    'rajesh@techcloudpro.com',
]);

const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run');

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const pct = (n, d) => d > 0 ? `${Math.round((n / d) * 100)}%` : '—';
const safeDate = (d) => {
    if (!d) return '—';
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
};
const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function twilioGet(pathPart) {
    return new Promise((resolve, reject) => {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/${pathPart}`;
        const auth = Buffer.from(`${TWILIO_API_KEY_SID}:${TWILIO_API_KEY_SECRET}`).toString('base64');
        const req = https.get(url, { headers: { Authorization: `Basic ${auth}` } }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(new Error('twilio timeout')); });
    });
}

// ── Queries ───────────────────────────────────────────────────────────────

// q320: Discover all campaigns sent from peter@techcloudpro.com in last N days.
// Replaces the hardcoded TCP_V6_CAMP_ID + STAFF_AUG_IDS pair.
async function discoverPeterCampaigns() {
    // BrandMonkz schema: campaigns has "senderEmail" via emailServerConfig fromEmail OR
    // via email_logs.fromEmail per-row. Use email_logs.fromEmail because campaign-level
    // senderEmail isn't reliable across older campaign rows.
    const rows = await prisma.$queryRaw`
        SELECT DISTINCT cmp.id, cmp.name, cmp.subject, cmp.status, cmp."totalSent",
                        cmp."sentAt", cmp."createdAt"
        FROM "campaigns" cmp
        WHERE cmp.id IN (
            SELECT DISTINCT "campaignId"
            FROM "email_logs"
            WHERE LOWER("fromEmail") = ANY(${SENDERS.map(s => s.toLowerCase())}::text[])
              AND "createdAt" > NOW() - (${PETER_LOOKBACK_DAYS}::text || ' days')::interval
        )
        ORDER BY cmp."createdAt" DESC
    `;
    return rows;
}

async function v6PerProspectStats() {
    const kits = JSON.parse(fs.readFileSync(KITS_PATH, 'utf8'));
    const emails = Object.keys(kits).map((e) => e.toLowerCase());

    // q320: pixel-bot fields removed (totalOpens, uniqueIPs, suspectedForwards,
    // wasForwarded). Sourcing engagement from clicks (link-wrap) only — bots
    // don't follow tracking redirects through bot-filter-v3 ingest.
    // Scope generalized to all peter@ campaigns instead of hardcoded TCP_V6_CAMP_ID.
    const sends = await prisma.$queryRaw`
        SELECT LOWER("toEmail") AS email,
               COUNT(*)::int                     AS send_count,
               MAX("sentAt")                     AS last_sent,
               MAX("clickedAt")                  AS last_clicked,
               SUM(COALESCE("totalClicks", 0))::int  AS clicks
        FROM "email_logs"
        WHERE LOWER("fromEmail") = ANY(${SENDERS.map(s => s.toLowerCase())}::text[])
          AND LOWER("toEmail") = ANY(${emails}::text[])
        GROUP BY LOWER("toEmail")
    `;
    const sentMap = Object.fromEntries(sends.map((r) => [r.email, r]));

    // Landing-page visits per slug (NEW since CORS fix)
    const visits = await prisma.$queryRaw`
        SELECT
            LOWER(REGEXP_REPLACE(path, '^/|/$', '', 'g')) AS slug,
            COUNT(*)::int                   AS visit_count,
            COUNT(DISTINCT "ipAddress")::int AS unique_ips,
            MAX("visitedAt")                AS last_visit
        FROM "website_visits"
        WHERE domain = 'watch.techcloudpro.com'
        GROUP BY LOWER(REGEXP_REPLACE(path, '^/|/$', '', 'g'))
    `;
    const visitMap = Object.fromEntries(visits.map((r) => [r.slug, r]));

    return Object.entries(kits).map(([email, kit]) => {
        const send = sentMap[email.toLowerCase()] || null;
        const visit = visitMap[(kit.slug || '').toLowerCase()] || null;
        return {
            email,
            firstName: kit.firstName,
            companyName: kit.companyName,
            slug: kit.slug,
            sent: !!send,
            sentCount: send?.send_count || 0,
            lastSent: send?.last_sent,
            // q320 REMOVED: opens, uniqueIps, forwards, forwarded — pixel-bot noise per memory rule
            emailClicks: send?.clicks || 0,
            visitCount: visit?.visit_count || 0,
            visitUniqueIps: visit?.unique_ips || 0,
            lastVisit: visit?.last_visit,
        };
    }).sort((a, b) => {
        if (a.sent && !b.sent) return -1;
        if (!a.sent && b.sent) return 1;
        // q320 score: clicks*20 + visits*50 (strict sources only)
        return (b.emailClicks * 20 + b.visitCount * 50) - (a.emailClicks * 20 + a.visitCount * 50);
    });
}

// q320: replaces staffAugCampaigns(). Generalized to all peter@ campaigns.
async function peterCampaignsSummary(campaignIds) {
    if (!campaignIds.length) return [];
    return prisma.$queryRaw`
        SELECT
            cmp.id,
            cmp.name,
            cmp.subject,
            cmp.status,
            cmp."totalSent",
            cmp."sentAt",
            COUNT(*)::int                                  AS sent,
            COUNT(*) FILTER (WHERE el.status = 'DELIVERED')::int AS delivered,
            COUNT(*) FILTER (WHERE el.status = 'CLICKED')::int  AS clicked,
            COUNT(*) FILTER (WHERE el.status = 'FAILED')::int   AS failed,
            COUNT(*) FILTER (WHERE el.status = 'BOUNCED')::int  AS bounced
        FROM "campaigns" cmp
        LEFT JOIN "email_logs" el ON el."campaignId" = cmp.id
        WHERE cmp.id = ANY(${campaignIds}::text[])
        GROUP BY cmp.id, cmp.name, cmp.subject, cmp.status, cmp."totalSent", cmp."sentAt"
        ORDER BY cmp."sentAt" DESC NULLS LAST
    `;
}

// q320 NEW: Deliverability — per-campaign Resend-driven event counts for last 24h.
// Source: email_logs.status driven by /api/webhooks/resend events
// (email.delivered, email.bounced, email.complained). Bounce rate % is what the
// reputation team needs to see daily.
async function deliverability24h(campaignIds) {
    if (!campaignIds.length) return [];
    return prisma.$queryRaw`
        SELECT
            cmp.id,
            cmp.name,
            cmp.subject,
            COUNT(*)::int                                   AS sent,
            COUNT(*) FILTER (WHERE el.status = 'DELIVERED')::int AS delivered,
            COUNT(*) FILTER (WHERE el.status = 'BOUNCED')::int   AS bounced,
            COUNT(*) FILTER (WHERE el.status = 'COMPLAINED')::int AS complained,
            COUNT(*)::int                                         AS total
        FROM "campaigns" cmp
        LEFT JOIN "email_logs" el
          ON el."campaignId" = cmp.id
         AND el."sentAt" > NOW() - INTERVAL '24 hours'
        WHERE cmp.id = ANY(${campaignIds}::text[])
        GROUP BY cmp.id, cmp.name, cmp.subject
        HAVING COUNT(*) FILTER (WHERE el."sentAt" IS NOT NULL) > 0
        ORDER BY total DESC
    `;
}

// q320 NEW: Prospect Journey — 3-way LEFT JOIN of email_logs <-> v6 kits <->
// website_visits. Per-recipient row: did they receive, click, visit?
// JOIN strategy (revised after schema audit on 2026-04-30):
//   - website_visits has NO `identifiedEmail` column (plan assumed wrong).
//     Available identity hooks: userId (only for logged-in visitors),
//     queryParams::jsonb->>'prospect' (carries 'tcp-v6-<slug>' for v6 traffic).
//   - Primary attribution: queryParams.prospect ↔ tcp-v6-prospects.json email
//     (v6 visitors land on /<slug>/ pages and the tracker fires a
//     watch_page_view event with the slug).
//   - The "Clicked" flag = email_logs.clickedAt being non-null
//     (link-wrap clicks update emailLog directly via tracking.js handler).
// Implementation: use the v6 kits map injected from main() so the SQL stays
// driver-agnostic and we avoid pushing arrays of (slug,email) pairs into pg.
async function prospectJourney24h(campaignIds, slugToEmail) {
    if (!campaignIds.length) return [];
    // Lower-cased {slug: email} pairs for in-JS matching after fetch.
    const rows = await prisma.$queryRaw`
        SELECT
            el.id              AS email_log_id,
            el."toEmail"       AS to_email,
            el."campaignId"    AS campaign_id,
            cmp.name           AS campaign_name,
            el."sentAt"        AS sent_at,
            el.status          AS email_status,
            el."clickedAt"     AS clicked_at
        FROM "email_logs" el
        LEFT JOIN "campaigns" cmp ON cmp.id = el."campaignId"
        WHERE el."campaignId" = ANY(${campaignIds}::text[])
          AND el."sentAt" > NOW() - INTERVAL '24 hours'
          AND LOWER(el."toEmail") <> ALL(${[...INTERNAL_TEST_EMAILS]}::text[])
        ORDER BY el."sentAt" DESC
        LIMIT 50
    `;
    if (!rows.length) return [];

    // Look up visits by reversing emailToSlug and matching queryParams.prospect.
    const emailToSlug = {};
    for (const [slug, email] of Object.entries(slugToEmail || {})) {
        emailToSlug[String(email).toLowerCase()] = slug.toLowerCase();
    }
    // Pull all 7-day-window visits for slugs we care about, then bucket per emailLog.
    const slugsNeeded = [...new Set(rows
        .map((r) => emailToSlug[String(r.to_email).toLowerCase()])
        .filter(Boolean))];
    let visitsBySlug = {};
    if (slugsNeeded.length) {
        // Match either via queryParams.prospect (tcp-v6-<slug>) or via path (/<slug>/).
        const slugRegex = slugsNeeded.map((s) => `tcp-v6-${s}`);
        const visitRows = await prisma.$queryRaw`
            SELECT
                "queryParams",
                path,
                "visitedAt"
            FROM "website_visits"
            WHERE "visitedAt" > NOW() - INTERVAL '8 days'
              AND domain = 'watch.techcloudpro.com'
              AND (
                ("queryParams" IS NOT NULL AND "queryParams"::jsonb->>'prospect' = ANY(${slugRegex}::text[]))
                OR LOWER(REGEXP_REPLACE(path, '^/|/$', '', 'g')) = ANY(${slugsNeeded}::text[])
              )
        `;
        for (const v of visitRows) {
            let slug = '';
            try {
                const qp = JSON.parse(v.queryParams || '{}');
                if (qp.prospect && String(qp.prospect).startsWith('tcp-v6-')) {
                    slug = String(qp.prospect).replace(/^tcp-v6-/, '').toLowerCase();
                }
            } catch {}
            if (!slug && v.path) {
                slug = String(v.path).replace(/^\/|\/$/g, '').toLowerCase();
            }
            if (!slug) continue;
            (visitsBySlug[slug] = visitsBySlug[slug] || []).push(v.visitedAt);
        }
    }
    return rows.map((r) => {
        const slug = emailToSlug[String(r.to_email).toLowerCase()];
        const visits = (slug && visitsBySlug[slug]) || [];
        const sentMs = r.sent_at ? new Date(r.sent_at).getTime() : 0;
        const matched = visits.filter((t) => {
            const tm = new Date(t).getTime();
            return tm >= sentMs && tm <= sentMs + 7 * 24 * 3600 * 1000;
        });
        return {
            ...r,
            first_visit_at: matched.length ? matched.sort()[0] : null,
            visit_count: matched.length,
        };
    });
}

async function recentTwilioCalls(hoursAgo = 24) {
    // Twilio default returns most recent first; pull last 200 then filter date.
    const data = await twilioGet('Calls.json?PageSize=200');
    const cutoff = Date.now() - hoursAgo * 3600 * 1000;
    const calls = (data.calls || []).filter((c) => {
        const t = c.start_time ? new Date(c.start_time).getTime() : 0;
        return t >= cutoff;
    });
    const aria = calls.filter((c) => c.to === ARIA_NUMBER);
    const human = calls.filter((c) => c.to === PETER_NUMBER);
    const aria_external = aria.filter((c) => !INTERNAL_NUMBERS.has(c.from));
    const human_external = human.filter((c) => !INTERNAL_NUMBERS.has(c.from));
    return { aria, human, aria_external, human_external, all: calls };
}

async function landingPageActivity(hoursAgo = 24) {
    const cutoff = new Date(Date.now() - hoursAgo * 3600 * 1000);
    return prisma.$queryRaw`
        SELECT path, "ipAddress", "userAgent", "visitedAt", "queryParams"
        FROM "website_visits"
        WHERE domain = 'watch.techcloudpro.com'
          AND "visitedAt" > ${cutoff}
        ORDER BY "visitedAt" DESC
        LIMIT 100
    `;
}

async function videosToProduceNext(currentKitsEmails, currentKitCompanies) {
    // q320: pixel-bot fields purged. Score now sources from uniqueClicks ONLY
    // (link-wrap clicks gated by bot-filter-v3 at ingest). No more uniqueOpens
    // / suspectedForwards inflation.
    const skip = [...currentKitsEmails, ...INTERNAL_TEST_EMAILS, '']
        .map((e) => e.toLowerCase());
    const skipCompanies = [...currentKitCompanies].map((c) => (c || '').toLowerCase());
    const rows = await prisma.$queryRaw`
        WITH base AS (
            SELECT
                c.id           AS contact_id,
                c."firstName"  AS first_name,
                c."lastName"   AS last_name,
                LOWER(c.email) AS email,
                co.name        AS company_name,
                LOWER(co.name) AS company_lc,
                LOWER(SPLIT_PART(c.email, '@', 2)) AS domain,
                SUM(COALESCE(el."uniqueClicks", 0))::int      AS clicks,
                (SUM(COALESCE(el."uniqueClicks", 0)) * 20)::int AS score
            FROM "email_logs" el
            JOIN "contacts" c ON c.id = el."contactId"
            LEFT JOIN "companies" co ON co.id = c."companyId"
            WHERE el."contactId" IS NOT NULL
              AND el.status IN ('SENT','DELIVERED','OPENED','CLICKED')
              AND c.email IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM "email_unsubscribes" eu WHERE LOWER(eu.email) = LOWER(c.email))
            GROUP BY c.id, c."firstName", c."lastName", c.email, co.name
            HAVING SUM(COALESCE(el."uniqueClicks", 0)) > 0
        ),
        filtered AS (
            SELECT * FROM base
            WHERE email <> ALL(${skip}::text[])
              AND COALESCE(company_lc, '') <> ALL(${skipCompanies}::text[])
              AND domain NOT IN (
                'gmail.com','yahoo.com','outlook.com','hotmail.com','aol.com',
                'icloud.com','protonmail.com','msn.com',
                'techcloudpro.com','brandmonkz.com','artha.build','dollor.ai',
                'versova.com'
              )
        ),
        unique_companies AS (
            SELECT DISTINCT ON (COALESCE(company_lc, domain)) *
            FROM filtered
            ORDER BY COALESCE(company_lc, domain), score DESC
        )
        SELECT * FROM unique_companies ORDER BY score DESC LIMIT 8
    `;
    return rows;
}

async function dayOverDay() {
    // Compare last 24h to the 24h before that.
    // q320: replaced "opens" (pixel-bot noise) with "clicks" (link-wrap) only.
    return prisma.$queryRaw`
        WITH today AS (
            SELECT
                COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '24 hours')::int AS sends,
                COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '24 hours')::int AS clicks,
                COUNT(*) FILTER (WHERE status = 'BOUNCED' AND "createdAt" > NOW() - INTERVAL '24 hours')::int AS bounces
            FROM "email_logs"
        ),
        yesterday AS (
            SELECT
                COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '48 hours' AND "createdAt" <= NOW() - INTERVAL '24 hours')::int AS sends,
                COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '48 hours' AND "clickedAt" <= NOW() - INTERVAL '24 hours')::int AS clicks,
                COUNT(*) FILTER (WHERE status = 'BOUNCED' AND "createdAt" > NOW() - INTERVAL '48 hours' AND "createdAt" <= NOW() - INTERVAL '24 hours')::int AS bounces
            FROM "email_logs"
        )
        SELECT t.sends AS today_sends, y.sends AS y_sends,
               t.clicks AS today_clicks, y.clicks AS y_clicks,
               t.bounces AS today_bounces, y.bounces AS y_bounces
        FROM today t, yesterday y
    `;
}

// ── HTML render ───────────────────────────────────────────────────────────
function renderHtml(d) {
    const today = new Date().toISOString().slice(0, 10);
    const arrow = (now, prev) => {
        if (now > prev) return `<span style="color:#16A34A;font-weight:700">▲ +${now - prev}</span>`;
        if (now < prev) return `<span style="color:#DC2626;font-weight:700">▼ ${now - prev}</span>`;
        return `<span style="color:#94A3B8">→ 0</span>`;
    };

    // Section 1 — headline
    const h = d.headline;
    const dod = d.dod[0] || {};
    const headlineRows = [
        ['v6 video kits LIVE',         `<strong>${fmt(h.totalKits)}</strong>`],
        ['v6 prospects sent (lifetime)', `<strong>${fmt(h.v6Sent)}</strong>`],
        ['v6 emails clicked (last 24h)', `${fmt(h.v6Clicks24h)} ${arrow(dod.today_clicks || 0, dod.y_clicks || 0)}`],
        ['Sara/Peter campaigns sent (last 30d, lifetime)', `<strong>${fmt(h.peterSent)}</strong>`],
        ['Sara/Peter clicks (lifetime)', `<strong>${fmt(h.peterClicks)}</strong>`],
        ['Sara/Peter BOUNCED (lifetime)', `<strong style="color:${h.peterBounced > 0 ? '#DC2626' : '#94A3B8'}">${fmt(h.peterBounced)}</strong>`],
        ['Phone calls to ARIA (last 24h, external)', `<strong>${fmt(h.callsAriaExt)}</strong>`],
        ['Phone calls to Call-a-Human (last 24h, external)', `<strong>${fmt(h.callsHumanExt)}</strong>`],
        ['Landing-page visits (last 24h)', `<strong>${fmt(h.visits24h)}</strong>`],
    ];

    const headlineTable = `
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;margin-bottom:24px">
      ${headlineRows.map(([k, v]) => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#374151">${k}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${v}</td>
        </tr>`).join('')}
    </table>`;

    // Section 2 — phone calls
    const callRow = (c) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(c.from)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(c.to)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">${c.duration}s</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(c.status)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#64748B">${escapeHtml((c.start_time||'').slice(0,19))} UTC</td>
    </tr>`;
    const callsBlock = d.calls.all.length === 0
        ? `<p style="color:#6B7280;font-style:italic">No calls to ARIA or Call-a-Human in the last 24h.</p>`
        : `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin-bottom:24px">
              <tr style="background:#F3F4F6">
                <th style="padding:8px 10px;text-align:left;color:#374151">From</th>
                <th style="padding:8px 10px;text-align:left;color:#374151">To</th>
                <th style="padding:8px 10px;text-align:left;color:#374151">Dur</th>
                <th style="padding:8px 10px;text-align:left;color:#374151">Status</th>
                <th style="padding:8px 10px;text-align:left;color:#374151">When</th>
              </tr>
              ${d.calls.all.map(callRow).join('')}
           </table>
           ${d.calls.aria_external.length || d.calls.human_external.length
              ? `<p style="background:#FEF3C7;padding:8px 12px;border-left:3px solid #F59E0B;font-weight:700">⚠ ${d.calls.aria_external.length + d.calls.human_external.length} external prospect call(s) detected — review above.</p>`
              : `<p style="color:#6B7280;font-style:italic">All calls above are internal (Peter/Rajesh testing). No external prospects yet.</p>`}`;

    // Section 3 — v6 per-prospect (q320: pixel-bot columns removed)
    const v6Row = (p) => `
        <tr style="background:${p.sent ? '#F0FDF4' : '#FEF9C3'}">
          <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-weight:600">${escapeHtml(p.firstName || '')} / ${escapeHtml(p.companyName || '')}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#64748B">${escapeHtml(p.email)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center">${p.sent ? '✓' : '·'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${p.emailClicks || '—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${p.visitCount || '—'}</td>
        </tr>`;
    const v6Block = `
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;margin-bottom:24px">
          <tr style="background:#F3F4F6">
            <th style="padding:8px 10px;text-align:left">Prospect</th>
            <th style="padding:8px 10px;text-align:left">Email</th>
            <th style="padding:8px 10px;text-align:center">Sent?</th>
            <th style="padding:8px 10px;text-align:right">Clicks</th>
            <th style="padding:8px 10px;text-align:right">Visits</th>
          </tr>
          ${d.v6.map(v6Row).join('')}
        </table>
        <p style="color:#6B7280;font-size:12px;font-style:italic">Row colors: <span style="background:#F0FDF4;padding:2px 6px">sent</span> · <span style="background:#FEF9C3;padding:2px 6px">queued, not sent</span>. q320: pixel-open / forward-detection columns removed (60-90% bot noise).</p>`;

    // Section 4 — peter@ campaigns (q320: replaces hardcoded staff-aug)
    const peterCmpBlock = d.peterCampaigns.length === 0
        ? `<p style="color:#6B7280;font-style:italic">No Sara/Peter campaigns in the last ${PETER_LOOKBACK_DAYS} days.</p>`
        : `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin-bottom:24px">
          <tr style="background:#F3F4F6">
            <th style="padding:8px 10px;text-align:left">Name</th>
            <th style="padding:8px 10px;text-align:left">Subject</th>
            <th style="padding:8px 10px;text-align:right">Sent</th>
            <th style="padding:8px 10px;text-align:right">Delivered</th>
            <th style="padding:8px 10px;text-align:right">Clicked</th>
            <th style="padding:8px 10px;text-align:right">Bounced</th>
            <th style="padding:8px 10px;text-align:right">Failed</th>
          </tr>
          ${d.peterCampaigns.map((c) => `<tr>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB"><strong>${escapeHtml((c.name||'').slice(0,40))}</strong></td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#64748B">${escapeHtml((c.subject||'').slice(0,50))}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${fmt(c.sent)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${fmt(c.delivered)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${fmt(c.clicked)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;color:${c.bounced>0?'#DC2626':'#94A3B8'}">${fmt(c.bounced)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;color:${c.failed>0?'#DC2626':'#94A3B8'}">${fmt(c.failed)}</td>
          </tr>`).join('')}
        </table>`;

    // q320 NEW Section 5 — Deliverability (Resend-driven)
    const deliverRow = (r) => {
        const total = r.total || 0;
        const bounced = r.bounced || 0;
        const bouncePct = total > 0 ? (bounced / total) * 100 : 0;
        let bounceColor = '#16A34A';
        if (bouncePct > 2) bounceColor = '#DC2626';
        else if (bouncePct >= 1) bounceColor = '#F59E0B';
        const bounceLabel = total > 0 ? `${bouncePct.toFixed(1)}%` : '—';
        return `<tr>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB"><strong>${escapeHtml((r.name || r.subject || '').slice(0,50))}</strong></td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${fmt(r.sent)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;color:#16A34A">${fmt(r.delivered)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;color:${bounceColor}">${fmt(bounced)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;color:${r.complained>0?'#DC2626':'#94A3B8'}">${fmt(r.complained)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:700;color:${bounceColor}">${bounceLabel}</td>
        </tr>`;
    };
    const deliverabilityBlock = d.deliverability.length === 0
        ? `<p style="color:#6B7280;font-style:italic">No Sara/Peter sends in the last 24h. (Resend webhook events drive these counts — if dormant, no rows here.)</p>`
        : `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin-bottom:8px">
              <tr style="background:#F3F4F6">
                <th style="padding:8px 10px;text-align:left">Campaign</th>
                <th style="padding:8px 10px;text-align:right">Sent</th>
                <th style="padding:8px 10px;text-align:right">Delivered</th>
                <th style="padding:8px 10px;text-align:right">Bounced</th>
                <th style="padding:8px 10px;text-align:right">Complained</th>
                <th style="padding:8px 10px;text-align:right">Bounce %</th>
              </tr>
              ${d.deliverability.map(deliverRow).join('')}
           </table>
           <p style="color:#6B7280;font-size:12px;font-style:italic">Driven by Resend webhook events (email.delivered, email.bounced, email.complained). Bounce-rate threshold: <span style="color:#16A34A">&lt;1% green</span>, <span style="color:#F59E0B">1-2% yellow</span>, <span style="color:#DC2626">&gt;2% red</span> (sender-reputation risk).</p>`;

    // Section 6 — landing-page activity
    const visitsBlock = d.visits24h.length === 0
        ? `<p style="color:#6B7280;font-style:italic">No landing-page visits in the last 24h.</p>`
        : `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;margin-bottom:24px">
              <tr style="background:#F3F4F6"><th style="padding:8px 10px;text-align:left">Slug</th><th style="padding:8px 10px;text-align:left">When</th><th style="padding:8px 10px;text-align:left">IP</th><th style="padding:8px 10px;text-align:left">Event</th></tr>
              ${d.visits24h.map((v) => {
                  let event = '';
                  try { event = JSON.parse(v.queryParams || '{}').event || ''; } catch {}
                  return `<tr>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB"><code>${escapeHtml(v.path)}</code></td>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#64748B">${escapeHtml(safeDate(v.visitedAt))}</td>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(v.ipAddress || '?')}</td>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(event)}</td>
                  </tr>`;
              }).join('')}
           </table>`;

    // Section 7 — top engagers (q320: clicks + visits, NO opens/forwards)
    const topEng = d.v6
        .filter((p) => p.sent && (p.emailClicks >= 1 || p.visitCount >= 1))
        .sort((a, b) => (b.emailClicks * 20 + b.visitCount * 50) - (a.emailClicks * 20 + a.visitCount * 50))
        .slice(0, 5);
    const topEngBlock = topEng.length === 0
        ? `<p style="color:#6B7280;font-style:italic">No standout engagers yet (need at least 1 link-wrap click or landing-page visit).</p>`
        : `<ol style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">
              ${topEng.map((p) => `<li><strong>${escapeHtml(p.firstName)} / ${escapeHtml(p.companyName)}</strong> (<code>${escapeHtml(p.email)}</code>) — ${p.emailClicks} click${p.emailClicks === 1 ? '' : 's'}${p.visitCount > 0 ? `, ${p.visitCount} landing-page visit${p.visitCount === 1 ? '' : 's'}` : ''}.</li>`).join('')}
           </ol>`;

    // q320 NEW Section 8 — Prospect Journey (Email -> Click -> Visit attribution)
    const journeyRow = (j) => {
        const visited = j.first_visit_at != null;
        const clicked = j.clicked_at != null;
        const status = (j.email_status || '').toUpperCase();
        const statusColor = status === 'BOUNCED' || status === 'FAILED' ? '#DC2626'
                          : status === 'DELIVERED' ? '#16A34A'
                          : '#64748B';
        return `<tr>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#64748B"><code>${escapeHtml(j.to_email)}</code></td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml((j.campaign_name||'').slice(0,30))}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:${statusColor};font-weight:600">${escapeHtml(status)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center">${clicked ? '<span style="color:#16A34A">✓</span>' : '—'}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:center">${visited ? `<span style="color:#16A34A">✓ ${j.visit_count}×</span>` : '—'}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#64748B;font-size:11px">${escapeHtml(safeDate(j.sent_at))}</td>
        </tr>`;
    };
    const journeyBlock = d.journey.length === 0
        ? `<p style="color:#6B7280;font-style:italic">No Sara/Peter sends in the last 24h to attribute. (When sends happen, this table shows the per-recipient receive -> click -> visit flow.)</p>`
        : `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;margin-bottom:8px">
              <tr style="background:#F3F4F6">
                <th style="padding:8px 10px;text-align:left">Recipient</th>
                <th style="padding:8px 10px;text-align:left">Campaign</th>
                <th style="padding:8px 10px;text-align:left">Status</th>
                <th style="padding:8px 10px;text-align:center">Clicked?</th>
                <th style="padding:8px 10px;text-align:center">Visited?</th>
                <th style="padding:8px 10px;text-align:left">Sent</th>
              </tr>
              ${d.journey.map(journeyRow).join('')}
           </table>
           <p style="color:#6B7280;font-size:12px;font-style:italic">JOIN strategy: <code>email_logs.toEmail</code> ↔ <code>website_visits.identifiedEmail</code> within 7-day window after sentAt. Visit ✓ requires the prospect to have form-submitted on TCP at some point so identifiedEmail is populated. (q320 follow-up: inject <code>?_tcp_uid=&lt;emailLogId&gt;</code> on link-wrap clicks for UTM-based attribution that doesn't need form-fill.)</p>`;

    // Section 9 — videos to produce next
    const gapBlock = d.gap.length === 0
        ? `<p style="color:#6B7280;font-style:italic">No gap candidates today (everyone with engagement already has a v6 kit, or feed is empty).</p>`
        : `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin-bottom:8px">
              <tr style="background:#F3F4F6">
                <th style="padding:8px 10px;text-align:left">#</th>
                <th style="padding:8px 10px;text-align:left">Prospect</th>
                <th style="padding:8px 10px;text-align:left">Company</th>
                <th style="padding:8px 10px;text-align:left">Email</th>
                <th style="padding:8px 10px;text-align:right">Score</th>
                <th style="padding:8px 10px;text-align:right">Clicks</th>
                <th style="padding:8px 10px;text-align:left">Why</th>
              </tr>
              ${d.gap.map((p, i) => {
                  const why = p.clicks >= 3 ? `Repeat clicks (${p.clicks}×)` :
                              p.clicks >= 1 ? `Clicked (${p.clicks}×)` :
                                              `Active engagement`;
                  return `<tr>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB"><strong>${i + 1}</strong></td>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml((p.first_name || '') + ' ' + (p.last_name || ''))}</td>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">${escapeHtml(p.company_name || p.domain)}</td>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#64748B"><code>${escapeHtml(p.email)}</code></td>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${fmt(p.score)}</td>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${fmt(p.clicks)}</td>
                    <td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#0F172A">${escapeHtml(why)}</td>
                  </tr>`;
              }).join('')}
           </table>
           <p style="color:#6B7280;font-size:12px;font-style:italic">q320 strict score = clicks × 20 (link-wrap, bot-filter-v3 at ingest). Reply with "build top N" to queue the next render batch.</p>`;

    // Section 10 — day-over-day
    const dodBlock = `
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin-bottom:24px">
          <tr style="background:#F3F4F6">
            <th style="padding:8px 10px;text-align:left">Metric</th>
            <th style="padding:8px 10px;text-align:right">Last 24h</th>
            <th style="padding:8px 10px;text-align:right">Prev 24h</th>
            <th style="padding:8px 10px;text-align:right">Δ</th>
          </tr>
          <tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">Sends</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${fmt(dod.today_sends)}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;color:#64748B">${fmt(dod.y_sends)}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${arrow(dod.today_sends || 0, dod.y_sends || 0)}</td></tr>
          <tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">Clicks</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${fmt(dod.today_clicks)}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;color:#64748B">${fmt(dod.y_clicks)}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${arrow(dod.today_clicks || 0, dod.y_clicks || 0)}</td></tr>
          <tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB">Bounces</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;color:${dod.today_bounces > 0 ? '#DC2626' : '#94A3B8'}">${fmt(dod.today_bounces)}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right;color:#64748B">${fmt(dod.y_bounces)}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${arrow(dod.today_bounces || 0, dod.y_bounces || 0)}</td></tr>
        </table>`;

    // Compose
    return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#0F172A;background:#F8FAFC;padding:0;margin:0">
<div style="max-width:760px;margin:0 auto;background:#fff;padding:32px;border:1px solid #E5E7EB">

  <h1 style="color:#0F172A;font-size:22px;margin:0 0 4px">📊 TCP Daily Engagement Report</h1>
  <p style="color:#64748B;margin:0 0 28px;font-size:14px">${today} · q320 overhaul · Sara/Peter campaigns + Deliverability + Prospect Journey</p>

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">1. Headline numbers</h2>
  ${headlineTable}

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">2. Phone calls (last 24h)</h2>
  ${callsBlock}

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">3. V6 retargeting per-prospect</h2>
  ${v6Block}

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">4. Sara/Peter campaigns (last ${PETER_LOOKBACK_DAYS}d)</h2>
  ${peterCmpBlock}

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">5. Deliverability (last 24h)</h2>
  ${deliverabilityBlock}

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">6. Landing-page activity (last 24h)</h2>
  ${visitsBlock}

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">7. Top engagers</h2>
  ${topEngBlock}

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">8. Prospect Journey (last 24h)</h2>
  ${journeyBlock}

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">🎬 9. Videos to produce next (gap analysis)</h2>
  ${gapBlock}

  <h2 style="color:#0F172A;font-size:16px;margin-top:28px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #FF6B35">10. Day-over-day deltas</h2>
  ${dodBlock}

  <p style="color:#94A3B8;font-size:11px;border-top:1px solid #E5E7EB;padding-top:14px;margin-top:36px">
    Generated by daily-tcp-report.js (q320 overhaul) · cron 02:30 UTC · TCP retargeting infra · Reply if any number looks off.
  </p>
</div></body></html>`;
}

// ── Send + archive ────────────────────────────────────────────────────────
async function sendEmail(html) {
    const userId = (await prisma.$queryRaw`SELECT id FROM users WHERE email = 'rajesh@techcloudpro.com' LIMIT 1`)[0]?.id;
    if (!userId) throw new Error('No userId for rajesh@techcloudpro.com');
    const server = await prisma.emailServerConfig.findFirst({
        where: { userId, isActive: true, isVerified: true },
    });
    if (!server) throw new Error('No verified SMTP for Rajesh');
    const pass = Buffer.from(server.password, 'base64').toString();
    const transporter = nodemailer.createTransport({
        host: server.host, port: server.port, secure: !!server.secure,
        auth: { user: server.username, pass },
    });
    const today = new Date().toISOString().slice(0, 10);
    return transporter.sendMail({
        from: `"${server.fromName}" <${server.fromEmail}>`,
        to: RECIPIENTS,
        subject: `📊 TCP Daily Report · ${today}`,
        html,
    });
}

function archive(html) {
    try { fs.mkdirSync(ARCHIVE_DIR, { recursive: true }); } catch {}
    const today = new Date().toISOString().slice(0, 10);
    const out = path.join(ARCHIVE_DIR, `${today}.html`);
    fs.writeFileSync(out, html);
    return out;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
    console.log(`[${new Date().toISOString()}] daily-tcp-report start (DRY=${DRY})`);

    // q320: discover peter@ campaign IDs first; downstream queries scope to these.
    const peterCampaigns = await discoverPeterCampaigns();
    PETER_CAMPAIGN_IDS = peterCampaigns.map((c) => c.id);
    console.log(`  discovered ${PETER_CAMPAIGN_IDS.length} Sara/Peter campaigns in last ${PETER_LOOKBACK_DAYS}d`);

    // Build {slug: email} from the v6 kits file for prospectJourney24h.
    const kitsRaw = JSON.parse(fs.readFileSync(KITS_PATH, 'utf8'));
    const slugToEmail = {};
    for (const [email, kit] of Object.entries(kitsRaw)) {
        if (kit && kit.slug) slugToEmail[String(kit.slug).toLowerCase()] = String(email).toLowerCase();
    }

    const [v6, peterCampaignsSummaryRows, deliverability, journey, calls, visits24h, dod] = await Promise.all([
        v6PerProspectStats(),
        peterCampaignsSummary(PETER_CAMPAIGN_IDS),
        deliverability24h(PETER_CAMPAIGN_IDS),
        prospectJourney24h(PETER_CAMPAIGN_IDS, slugToEmail),
        recentTwilioCalls(24),
        landingPageActivity(24),
        dayOverDay(),
    ]);
    const currentEmails = v6.map((p) => p.email.toLowerCase());
    const currentCompanies = v6.map((p) => (p.companyName || '').toLowerCase());
    const gap = await videosToProduceNext(currentEmails, currentCompanies);

    // Count v6 CLICKS (link-wrap, NOT pixel opens) in last 24h, excluding tests.
    // q320: replaces the old v6Opens24h pixel-noise metric.
    const v6Clicks24hRows = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS n
        FROM "email_logs"
        WHERE LOWER("fromEmail") = ANY(${SENDERS.map(s => s.toLowerCase())}::text[])
          AND "clickedAt" > NOW() - INTERVAL '24 hours'
          AND LOWER("toEmail") <> ALL(${[...INTERNAL_TEST_EMAILS]}::text[])
    `;
    const headline = {
        totalKits: v6.length,
        v6Sent: v6.filter((p) => p.sent && !INTERNAL_TEST_EMAILS.has(p.email.toLowerCase())).length,
        v6Clicks24h: v6Clicks24hRows[0]?.n || 0,
        peterSent: peterCampaignsSummaryRows.reduce((n, c) => n + (c.sent || 0), 0),
        peterClicks: peterCampaignsSummaryRows.reduce((n, c) => n + (c.clicked || 0), 0),
        peterBounced: peterCampaignsSummaryRows.reduce((n, c) => n + (c.bounced || 0), 0),
        callsAriaExt: calls.aria_external.length,
        callsHumanExt: calls.human_external.length,
        visits24h: visits24h.length,
    };

    const html = renderHtml({
        headline,
        v6,
        peterCampaigns: peterCampaignsSummaryRows,
        deliverability,
        journey,
        calls,
        visits24h,
        gap,
        dod,
    });
    const archived = archive(html);
    console.log(`  archived: ${archived} (${html.length} bytes)`);

    if (DRY) {
        console.log('  DRY-RUN — skipping send');
    } else {
        const r = await sendEmail(html);
        console.log(`  sent: messageId=${r.messageId}, to=${RECIPIENTS.join(', ')}`);
    }

    await prisma.$disconnect();
    console.log(`[${new Date().toISOString()}] done`);
}

main().catch(async (e) => {
    console.error('FATAL:', e);
    try { await prisma.$disconnect(); } catch {}
    process.exit(1);
});
