#!/usr/bin/env node
/**
 * TCP Retargeting Report — twice-daily (morning 14:00 UTC, evening 02:00 UTC)
 *
 * Inputs:
 *   - TCP stats.php JSON (Hostinger MySQL → page_views + identified_visitors)
 *     URL:  https://techcloudpro.com/tcp-analytics/stats.php?s=<TCP_STATS_SECRET>
 *   - BrandMonkz Postgres (local — same DB the daily report uses)
 *     Tables: campaigns, email_logs, email_tracking_events, contact
 *
 * Output:
 *   - HTML email to rajesh@techcloudpro.com + jm@techcloudpro.com
 *   - Subject: "TCP Retargeting — <Morning|Evening> brief (<date>)"
 *
 * Cross-reference logic:
 *   1. TCP hot_leads contains identified prospects (form-fill + email-click + fingerprint).
 *      Email-click prospects' emails will match BM email_logs.toEmail → that's the
 *      "this campaign produced this site visit" chain.
 *   2. TCP by_org gives top companies visiting (via IP-to-company resolver). Cross
 *      with hot_leads emails to show "company has identified prospect" vs "anonymous".
 *   3. TCP by_page filtered to /blog/* gives blog magnets. Anyone reading 3+ blogs
 *      in a day is consideration-stage.
 *   4. TCP by_source for chatgpt/perplexity/claude shows AI-search visibility.
 *
 * Test row exclusion:
 *   - is_test=1 already filtered server-side in stats.php (quick-317).
 *   - Additional client-side regex filter for "+test-", "+e2e-", "+q\\d+-",
 *     "+verify-", "@example.com" patterns to catch verify-style synthetic rows.
 */
const https     = require('https');
const fs        = require('fs');
const nodemailer= require('/var/www/crm-backend/node_modules/nodemailer');
const { PrismaClient } = require('/var/www/crm-backend/node_modules/@prisma/client');

// ── Config ────────────────────────────────────────────────────────────────
const RECIPIENTS  = ['rajesh@techcloudpro.com', 'jm@techcloudpro.com'];
const TCP_STATS_URL = 'https://techcloudpro.com/tcp-analytics/stats.php';
const TCP_STATS_SECRET = process.env.TCP_STATS_SECRET || 'TcpSecureAdmin2026';
// Sara/Peter (sender rotation lives in SENDERS const)
const SENDERS = ['peter@techcloudpro.com', 'sara@techcloudpro.com'];
// Synthetic-email patterns — catches my own test aliases (jeetnair.in+ANYTHING@gmail)
// and the legacy +q317- / +318- / +verify- patterns from the identity stack build.
// Real prospects don't use numeric-prefix Gmail aliases.
const TEST_EMAIL_REGEX = /(\+test-|\+e2e-|\+q\d+-|\+verify-|\+\d+-real-|\+\d+-msgid-|^jeetnair\.in[+@]|@example\.com$|^test@)/i;

// First CLI arg drives subject + window framing; defaults to "Morning"
const MODE = (process.argv[2] || '').toLowerCase() === 'evening' ? 'Evening' : 'Morning';
const DRY  = process.argv.includes('--dry') || process.argv.includes('--dry-run');
const TO_OVERRIDE = (process.argv.find(a => a.startsWith('--to=')) || '').slice(5);

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────────
// Bypass Cloudflare by hitting Hostinger origin directly (CF challenges EC2 IP).
// Origin IP can be overridden via TCP_ORIGIN_IP env var if Hostinger ever changes it.
const TCP_ORIGIN_IP = process.env.TCP_ORIGIN_IP || '147.93.101.51';

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        const opts = {
            host: TCP_ORIGIN_IP,
            servername: 'techcloudpro.com',  // SNI for valid TLS cert
            port: 443,
            path,
            headers: {
                'Host': 'techcloudpro.com',
                'User-Agent': 'TCP-Retargeting-Report/1.0',
                'Accept': 'application/json'
            }
        };
        https.get(opts, (res) => {
            if (res.statusCode !== 200) {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => reject(new Error(`stats.php returned ${res.statusCode}: ${body.slice(0,200)}`)));
                return;
            }
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
        }).on('error', reject);
    });
}

function isSyntheticEmail(email) {
    if (!email) return true;
    return TEST_EMAIL_REGEX.test(email);
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatDuration(seconds) {
    if (!seconds || seconds < 60) return `${seconds || 0}s`;
    const m = Math.floor(seconds / 60);
    return `${m}m ${seconds % 60}s`;
}

// ── Section builders ────────────────────────────────────────────────────────
// Section 4 attribution — DELTA mode. Scoped to clicks/sends in last 24h so
// each report shows what's NEW since the previous fire instead of repeating
// the same rows. Deduplicates by (recipient, campaign) collapsing multi-row
// sends/clicks into one summary row with totals.
async function loadCampaignAttribution(prospectEmails) {
    if (!prospectEmails.length) return [];
    return prisma.$queryRaw`
        SELECT
            c.name                                                             AS campaign_name,
            LOWER(el."toEmail")                                                AS recipient,
            COUNT(*)::int                                                       AS sends,
            COUNT(*) FILTER (WHERE el.status = 'CLICKED')::int                  AS clicks,
            COUNT(*) FILTER (WHERE el.status = 'DELIVERED')::int                AS delivered,
            COUNT(*) FILTER (WHERE el.status = 'BOUNCED')::int                  AS bounced,
            MAX(el."sentAt")                                                    AS last_send,
            MAX(el."clickedAt")                                                 AS last_click
        FROM "email_logs" el
        JOIN "campaigns" c ON c.id = el."campaignId"
        WHERE LOWER(el."fromEmail") = ANY(${SENDERS.map(s=>s.toLowerCase())}::text[])
          AND LOWER(el."toEmail") = ANY(${prospectEmails.map(e=>e.toLowerCase())}::text[])
          AND (
                el."sentAt" > NOW() - INTERVAL '24 hours'
             OR el."clickedAt" > NOW() - INTERVAL '24 hours'
          )
        GROUP BY c.name, LOWER(el."toEmail")
        ORDER BY MAX(el."clickedAt") DESC NULLS LAST, MAX(el."sentAt") DESC
        LIMIT 50
    `;
}

// Watch-page activity by prospect-slug. Each row in BM `website_visits` for
// domain=watch.techcloudpro.com carries `prospect=<slug>` in queryParams JSON.
// We tally watch_page_view events + max time_on_page per slug.
async function loadWatchActivity() {
    const rows = await prisma.$queryRaw`
        SELECT
            "queryParams",
            "ipAddress",
            "visitedAt"
        FROM "website_visits"
        WHERE "domain" = 'watch.techcloudpro.com'
          AND "visitedAt" > NOW() - INTERVAL '7 days'
        ORDER BY "visitedAt" DESC
        LIMIT 1000
    `;
    const bySlug = {};
    for (const r of rows) {
        let qp = {};
        try { qp = JSON.parse(r.queryParams || '{}'); } catch { continue; }
        const slug = String(qp.prospect || '').replace(/^tcp-v6-/, '');
        if (!slug) continue;
        const evt = String(qp.event || '');
        const tip = Number(qp.timeOnPage) || 0;
        const cur = bySlug[slug] || { slug, watchPageViews: 0, videoStarted: false, videoComplete: false, maxTimeOnPage: 0, latestAt: null, distinctIps: new Set() };
        if (evt === 'watch_page_view') cur.watchPageViews++;
        if (evt === 'video_play')      cur.videoStarted  = true;
        if (evt === 'video_complete')  cur.videoComplete = true;
        if (evt === 'time_on_page' && tip > cur.maxTimeOnPage) cur.maxTimeOnPage = tip;
        if (r.ipAddress) cur.distinctIps.add(r.ipAddress);
        if (!cur.latestAt || (r.visitedAt && r.visitedAt > cur.latestAt)) cur.latestAt = r.visitedAt;
        bySlug[slug] = cur;
    }
    // freeze sets to numbers
    for (const s of Object.values(bySlug)) s.distinctIps = s.distinctIps.size;
    return bySlug;
}

// Phase 05-03: Apollo domain-enrichment helpers. Surfaces industry, employee
// count, and LinkedIn URL inline in Section 2's company cell.
const GENERIC_EMAIL_DOMAINS = new Set([
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'aol.com', 'icloud.com', 'protonmail.com', 'live.com', 'msn.com',
]);

function domainFromEmail(email) {
    const at = String(email || '').lastIndexOf('@');
    if (at < 0) return null;
    const dom = email.slice(at + 1).trim().toLowerCase();
    if (!dom || GENERIC_EMAIL_DOMAINS.has(dom)) return null;
    return dom;
}

function apolloEnrichDomain(domain) {
    return new Promise((resolve) => {
        const key = process.env.APOLLO_API_KEY;
        if (!key) return resolve(null);
        const payload = JSON.stringify({ domain });
        const opts = {
            host: 'api.apollo.io',
            port: 443,
            path: '/api/v1/organizations/enrich',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Api-Key': key,
                'Content-Length': Buffer.byteLength(payload),
            },
        };
        const req = https.request(opts, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode !== 200) return resolve(null);
                try {
                    const j = JSON.parse(body);
                    resolve(j && j.organization ? j.organization : null);
                } catch { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(5000, () => { try { req.destroy(); } catch {} resolve(null); });
        req.write(payload);
        req.end();
    });
}

async function enrichProspectsViaApollo(prospects) {
    const out = {};
    if (!process.env.APOLLO_API_KEY) {
        console.log('  Apollo enrichment skipped: APOLLO_API_KEY not set');
        return out;
    }
    const domains = new Set();
    for (const p of prospects) {
        const d = domainFromEmail(p.email);
        if (d) domains.add(d);
    }
    const list = Array.from(domains).slice(0, 25);
    let ok = 0;
    for (const dom of list) {
        const org = await apolloEnrichDomain(dom);
        if (org) { out[dom] = org; ok++; }
    }
    console.log(`  enriched ${ok}/${list.length} prospects via Apollo`);
    return out;
}

// Phase 05-02: Pull email-click/open engaged contacts from BrandMonkz tracking
// tables to UNION with TCP hot_leads. The TCP hot_leads table is form-fill only
// and has been stuck at 2 rows for weeks; this surfaces prospects who opened/
// clicked Sara/Peter emails in the last 7 days even if they never form-filled.
async function loadBrandMonkzEmailEngagedProspects() {
    try {
        const rows = await prisma.$queryRaw`
            SELECT DISTINCT
                c."firstName" || ' ' || c."lastName" AS name,
                COALESCE(co.name, '(unknown company)') AS company,
                c.email                              AS email,
                'bm-email-click'                     AS source,
                COUNT(ete.id)::int                   AS score,
                MAX(ete.timestamp)                   AS last_event_at
            FROM email_tracking_events ete
            JOIN email_logs el ON ete."emailLogId" = el.id
            JOIN contacts c    ON el."contactId" = c.id
            LEFT JOIN companies co ON c."companyId" = co.id
            WHERE ete."eventType" IN ('CLICK', 'OPEN')
              AND ete.timestamp > NOW() - INTERVAL '7 days'
              AND c.email IS NOT NULL
              AND c.email !~* ${TEST_EMAIL_REGEX.source}
              AND LOWER(el."fromEmail") = ANY(${SENDERS.map(s=>s.toLowerCase())}::text[])
            GROUP BY c."firstName", c."lastName", co.name, c.email
            ORDER BY MAX(ete.timestamp) DESC
            LIMIT 20
        `;
        return rows.map(r => ({
            name: r.name,
            company: r.company,
            email: r.email,
            source_form: r.source,
            score: Number(r.score) || 0,
            pageviews: 0,                       // unknown — they came in via email, not tracked pageviews
            last_event_at: r.last_event_at,
        }));
    } catch (e) {
        console.warn('  loadBrandMonkzEmailEngagedProspects failed:', e.message);
        return [];
    }
}

function slugForProspect(p) {
    // Match TCP identified_visitors row to a watch-page slug.
    // We don't have a direct mapping, but the company name tends to be unique
    // and the slug encodes the company. Fallback: use email local-part.
    const co = String(p.company || '').toLowerCase();
    const email = String(p.email || '').toLowerCase();
    // Try a few heuristic matches against known v6 slugs.
    const aliases = {
        'akoya biosciences': 'akoya',
        'specified components': 'specified-megana',
        'pulmac systems international': 'pulmac',
        'block institute': 'block-institute',
        'block real estate services': 'block-real-estate',
        'sturtevant richmont': 'sturtevant-richmont',
        'industrial service group': 'isg',
        'innovative office solutions': 'innovative-office',
        'interior supply inc': 'interior-supply',
        'interior supply': 'interior-supply',
        'jc licht': 'jc-licht',
    };
    return aliases[co] || null;
}

function recommendAction(prospect, attribution, watch) {
    const isClick = prospect.source_form === 'email-click';
    const isBmClick = prospect.source_form === 'bm-email-click';
    const watched = watch && watch.watchPageViews > 0;
    const dwell   = watch ? watch.maxTimeOnPage : 0;
    const completed = watch && watch.videoComplete;

    if (isClick && completed)            return '🔥 CALL TODAY — they watched the full video.';
    if (isClick && watched && dwell >= 30) return '📞 Direct call — landed on watch page, dwelled ' + dwell + 's.';
    if (isClick && watched)               return '📧 Personal email — saw the page, did not deeply watch yet.';
    if (isClick && !watched)              return '📧 Send personal email with plain text watch link — they clicked the tracker but the watch page never loaded for them.';
    if (watched && completed)             return '📞 Strong inbound — full video watched even without email click.';
    if (watched)                          return '👀 Anonymous watch — see if their company has a known buyer to reach out to.';
    if (isBmClick)                        return '📨 Recent email engagement — send personalized follow-up referencing the campaign they clicked.';
    return '👀 Single touch, monitor for return.';
}

// ── Main render ────────────────────────────────────────────────────────────
async function render(stats, today) {
    const w = stats.windows || {};
    const todayW = w.today || {};
    const last7  = w.last_7d || {};
    const last30 = w.last_30d || {};

    // 1. Filter hot_leads to non-synthetic prospects
    const hotLeadProspects = (stats.hot_leads || []).filter(p => !isSyntheticEmail(p.email));

    // 1b. Phase 05-02: UNION BrandMonkz email-click/open engaged contacts from
    // the last 7 days. Dedupe by email (hot_leads wins — it has explicit form-fill
    // data), sort by score desc + recency desc, cap at 25 rows total.
    const bmProspects = (await loadBrandMonkzEmailEngagedProspects())
        .filter(p => !isSyntheticEmail(p.email));
    console.log(`  loaded ${bmProspects.length} BM email-click prospects`);

    const byEmailMap = new Map();
    for (const p of hotLeadProspects) {
        const k = (p.email || '').toLowerCase();
        if (k) byEmailMap.set(k, p);
    }
    for (const p of bmProspects) {
        const k = (p.email || '').toLowerCase();
        if (!k) continue;
        if (byEmailMap.has(k)) continue;        // hot_leads wins on duplicates
        byEmailMap.set(k, p);
    }
    const realProspects = Array.from(byEmailMap.values())
        .sort((a, b) => {
            const sb = (Number(b.score) || 0) - (Number(a.score) || 0);
            if (sb !== 0) return sb;
            const ra = a.last_event_at ? new Date(a.last_event_at).getTime() : 0;
            const rb = b.last_event_at ? new Date(b.last_event_at).getTime() : 0;
            return rb - ra;
        })
        .slice(0, 25);
    console.log(`  merged to ${realProspects.length} prospects total (hot_leads=${hotLeadProspects.length}, bm=${bmProspects.length})`);

    // 1c. Phase 05-03: Apollo per-domain enrichment for Section 2 rows.
    const enrichmentByDomain = await enrichProspectsViaApollo(realProspects);
    for (const p of realProspects) {
        const dom = domainFromEmail(p.email);
        if (dom && enrichmentByDomain[dom]) p.enrichment = enrichmentByDomain[dom];
    }

    // 2. Campaign attribution for these prospects
    const attribByEmail = {};
    if (realProspects.length) {
        const emails = realProspects.map(p => p.email);
        const rows = await loadCampaignAttribution(emails);
        for (const r of rows) {
            const k = (r.recipient || '').toLowerCase();
            (attribByEmail[k] = attribByEmail[k] || []).push(r);
        }
    }

    // q322 follow-up: watch-page activity from BM website_visits joined by slug.
    // Tells us "did they actually load the video page" — was missing before, which
    // caused the retargeting report to falsely warn 'Check link' on every click.
    const watchBySlug = await loadWatchActivity();

    // 3. Companies visiting today — from by_org
    const todayOrgs = (todayW.by_org || []).slice(0, 25);
    const knownCompanyEmails = new Set(realProspects.map(p => (p.company || '').toLowerCase()));
    const anonymousOrgs = todayOrgs.filter(o => !knownCompanyEmails.has((o.org || '').toLowerCase()));

    // 4. Blog magnets — pages starting with /blog/
    const blogPages = (todayW.by_page || []).filter(p => (p.page || '').startsWith('/blog/')).slice(0, 10);

    // 5. AI referrals — sources matching AI engines
    const aiSources = (todayW.by_source || []).filter(s => /chatgpt|perplexity|claude|google-gemini|copilot/i.test(s.source));

    // ── Render HTML ──────────────────────────────────────────────────────────
    const subject = `TCP Retargeting — ${MODE} brief (${today.slice(0,10)})`;
    const window_label = MODE === 'Morning' ? 'last 12h overnight + today so far' : 'today\'s business day';

    let body = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1F2937;max-width:780px;margin:0 auto;padding:24px;background:#fff">`;
    body += `<h1 style="font-size:22px;color:#0F172A;margin:0 0 4px;border-bottom:3px solid #FF6B35;padding-bottom:10px">TCP Retargeting — ${MODE} brief</h1>`;
    body += `<p style="color:#6B7280;font-size:13px;margin:8px 0 24px">Window: ${escapeHtml(window_label)} · Generated ${escapeHtml(today)} · Source: stats.php (Hostinger) + BM Postgres (EC2)</p>`;

    // Section 1 — Headlines (24h window, not UTC-day-so-far which is misleading
    // for an evening brief that fires at 02:00 UTC and would only see 2h of data).
    // We compute last-24h pageviews from stats.php's last_7d.by_day series.
    const todayUTC = new Date().toISOString().slice(0,10);
    const yesterdayUTC = new Date(Date.now() - 24*60*60*1000).toISOString().slice(0,10);
    const byDay = (last7.by_day || []).reduce((acc, r) => { acc[r.day] = r.views; return acc; }, {});
    const last24hPV = (byDay[todayUTC] || 0) + (byDay[yesterdayUTC] || 0);
    const yesterdayPV = byDay[yesterdayUTC] || 0;
    const todayUTCpv = byDay[todayUTC] || 0;
    body += `<h2 style="color:#0F172A;font-size:16px;margin-top:24px;border-bottom:2px solid #E5E7EB;padding-bottom:6px">1. Headlines</h2>`;
    body += `<table style="width:100%;border-collapse:collapse;font-size:13px">`;
    body += `<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#374151;width:60%">Pageviews last 24h <span style="color:#9CA3AF;font-size:11px">(today UTC + yesterday UTC)</span></td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right"><strong>${last24hPV}</strong></td></tr>`;
    body += `<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#374151">  ↳ today UTC (${escapeHtml(todayUTC)})</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${todayUTCpv}</td></tr>`;
    body += `<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#374151">  ↳ yesterday UTC (${escapeHtml(yesterdayUTC)})</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${yesterdayPV}</td></tr>`;
    body += `<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#374151">Unique sessions today UTC</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${todayW.unique_sessions || 0}</td></tr>`;
    body += `<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#374151">Identified prospects on retarget list <span style="color:#9CA3AF;font-size:11px">(lifetime, real-only)</span></td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right"><strong>${realProspects.length}</strong></td></tr>`;
    body += `<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;color:#374151">Companies visiting today UTC <span style="color:#9CA3AF;font-size:11px">(top-25)</span></td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;text-align:right">${todayOrgs.length}</td></tr>`;
    body += `<tr><td style="padding:6px 10px;color:#374151">Pageviews last 7d</td><td style="padding:6px 10px;text-align:right">${last7.total_pageviews || 0}</td></tr>`;
    body += `</table>`;

    // Section 2 — Identified prospects (priority retarget list)
    body += `<h2 style="color:#0F172A;font-size:16px;margin-top:28px;border-bottom:2px solid #E5E7EB;padding-bottom:6px">2. 🔥 Identified prospects — retarget list</h2>`;
    if (!realProspects.length) {
        body += `<p style="color:#6B7280;font-style:italic;font-size:13px">No identified real prospects in current window. (Synthetic test rows are filtered.)</p>`;
    } else {
        body += `<table style="width:100%;border-collapse:collapse;font-size:13px">`;
        body += `<thead><tr style="background:#F9FAFB;font-weight:600">
            <th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Name</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Company</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Email</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Source</th>
            <th style="padding:8px;text-align:right;border-bottom:1px solid #E5E7EB">Pages</th>
            <th style="padding:8px;text-align:right;border-bottom:1px solid #E5E7EB">Score</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Recommended action</th>
        </tr></thead><tbody>`;
        for (const p of realProspects.slice(0, 25)) {
            const attrib = attribByEmail[(p.email || '').toLowerCase()] || [];
            const slug = slugForProspect(p);
            const watch = slug ? watchBySlug[slug] : null;
            const action = recommendAction(p, attrib, watch);
            const attribTag = attrib.length ? ` <span style="color:#FF6B35;font-size:11px">[${attrib.length} campaign${attrib.length>1?'s':''}]</span>` : '';

            // Phase 05-03: inline Apollo enrichment in the company cell.
            // Format: {company name} · {industry} · {employees} · LinkedIn
            let companyCell = escapeHtml(p.company || '—');
            const e = p.enrichment;
            if (e) {
                const bits = [];
                if (e.industry) bits.push(escapeHtml(e.industry));
                const emp = e.estimated_num_employees || e.employee_count;
                if (emp) bits.push(`${emp} emp`);
                if (e.linkedin_url) {
                    bits.push(`<a href="${escapeHtml(e.linkedin_url)}" style="color:#0066CC">LinkedIn</a>`);
                }
                if (bits.length) {
                    companyCell += ` <span style="color:#6B7280;font-size:11px">· ${bits.join(' · ')}</span>`;
                }
            }

            body += `<tr>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB"><strong>${escapeHtml(p.name || '(no name)')}</strong>${attribTag}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">${companyCell}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-family:monospace;font-size:11px"><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">${escapeHtml(p.source_form || '?')}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${p.pageviews || 0}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right"><strong>${p.score || 0}</strong></td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">${escapeHtml(action)}</td>
            </tr>`;
        }
        body += `</tbody></table>`;
    }

    // Section 3 — Companies visiting (anonymous = sales prospect goldmine)
    body += `<h2 style="color:#0F172A;font-size:16px;margin-top:28px;border-bottom:2px solid #E5E7EB;padding-bottom:6px">3. 🏢 Companies visiting today (anonymous — find a name)</h2>`;
    if (!anonymousOrgs.length) {
        body += `<p style="color:#6B7280;font-style:italic;font-size:13px">No anonymous companies in window.</p>`;
    } else {
        body += `<table style="width:100%;border-collapse:collapse;font-size:13px">`;
        body += `<thead><tr style="background:#F9FAFB"><th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Company / ASN</th><th style="padding:8px;text-align:right;border-bottom:1px solid #E5E7EB">Page views</th></tr></thead><tbody>`;
        for (const o of anonymousOrgs) {
            body += `<tr><td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">${escapeHtml(o.org)}</td><td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${o.views}</td></tr>`;
        }
        body += `</tbody></table>`;
        body += `<p style="font-size:12px;color:#6B7280;margin-top:8px;font-style:italic">💡 These companies have no identified contact yet. Sales action: pull LinkedIn / Apollo / ZoomInfo on these companies for the IT/finance buyers, then send a personalized email referencing what they read on TCP.</p>`;
    }

    // Section 4 — Campaign attribution (DELTA: only last 24h activity, deduplicated)
    body += `<h2 style="color:#0F172A;font-size:16px;margin-top:28px;border-bottom:2px solid #E5E7EB;padding-bottom:6px">4. 📨 Campaign activity — NEW in last 24h</h2>`;
    const allAttrib = Object.values(attribByEmail).flat();
    if (!allAttrib.length) {
        body += `<p style="color:#6B7280;font-style:italic;font-size:13px">No new Sara/Peter campaign activity in the last 24h for our identified prospects. (Reports will only show fresh sends/clicks since the previous fire — same prospect with the same campaign won't repeat report after report.)</p>`;
    } else {
        body += `<table style="width:100%;border-collapse:collapse;font-size:13px">`;
        body += `<thead><tr style="background:#F9FAFB"><th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Recipient</th><th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Campaign</th><th style="padding:8px;text-align:right;border-bottom:1px solid #E5E7EB">Sent</th><th style="padding:8px;text-align:right;border-bottom:1px solid #E5E7EB">Delivered</th><th style="padding:8px;text-align:right;border-bottom:1px solid #E5E7EB">Clicks</th><th style="padding:8px;text-align:right;border-bottom:1px solid #E5E7EB">Bounced</th><th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Last click</th></tr></thead><tbody>`;
        for (const r of allAttrib.slice(0, 30)) {
            const lastClick = r.last_click ? new Date(r.last_click).toISOString().slice(0,16).replace('T',' ') : '—';
            const clickHl = (r.clicks || 0) > 0 ? 'background:#FEF3C7' : '';
            body += `<tr style="${clickHl}">
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-family:monospace;font-size:11px">${escapeHtml(r.recipient)}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">${escapeHtml(r.campaign_name || '(no name)')}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${r.sends || 0}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${r.delivered || 0}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right"><strong>${r.clicks || 0}</strong></td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${r.bounced || 0}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-size:11px">${lastClick}</td>
            </tr>`;
        }
        body += `</tbody></table>`;
        body += `<p style="font-size:11px;color:#6B7280;margin-top:6px;font-style:italic">Yellow rows = clicks recorded. Same recipient + campaign collapses to one row with totals.</p>`;
    }

    // Section 5 — Blog magnets
    body += `<h2 style="color:#0F172A;font-size:16px;margin-top:28px;border-bottom:2px solid #E5E7EB;padding-bottom:6px">5. 📚 Blog magnets — top consideration-stage content today</h2>`;
    if (!blogPages.length) {
        body += `<p style="color:#6B7280;font-style:italic;font-size:13px">No blog views today.</p>`;
    } else {
        body += `<table style="width:100%;border-collapse:collapse;font-size:13px">`;
        body += `<thead><tr style="background:#F9FAFB"><th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">Blog post</th><th style="padding:8px;text-align:right;border-bottom:1px solid #E5E7EB">Views</th></tr></thead><tbody>`;
        for (const b of blogPages) {
            const slug = (b.page || '').replace(/^\/blog\//, '').replace(/\/$/, '');
            body += `<tr><td style="padding:6px 8px;border-bottom:1px solid #E5E7EB"><a href="https://techcloudpro.com${escapeHtml(b.page)}" style="color:#0066CC">${escapeHtml(slug)}</a></td><td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${b.views}</td></tr>`;
        }
        body += `</tbody></table>`;
    }

    // Section 6 — AI search referrals
    body += `<h2 style="color:#0F172A;font-size:16px;margin-top:28px;border-bottom:2px solid #E5E7EB;padding-bottom:6px">6. 🤖 AI search referrals — visibility on ChatGPT / Perplexity / Claude</h2>`;
    if (!aiSources.length) {
        body += `<p style="color:#6B7280;font-style:italic;font-size:13px">No AI-search referrals today. (Could be intermittent — track over weeks for trend.)</p>`;
    } else {
        body += `<table style="width:100%;border-collapse:collapse;font-size:13px">`;
        body += `<thead><tr style="background:#F9FAFB"><th style="padding:8px;text-align:left;border-bottom:1px solid #E5E7EB">AI engine</th><th style="padding:8px;text-align:right;border-bottom:1px solid #E5E7EB">Visits</th></tr></thead><tbody>`;
        for (const s of aiSources) {
            body += `<tr><td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">${escapeHtml(s.source)}</td><td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${s.views}</td></tr>`;
        }
        body += `</tbody></table>`;
    }

    // Footer
    body += `<p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:16px">Generated by TCP Retargeting Report · Sources: <code>stats.php</code> (Hostinger) + BM Postgres (EC2) · Recipient: rajesh@ + jm@techcloudpro.com<br>Memory rule: opens / forwards / pixel metrics excluded — clicks / visits / time-on-page only.</p>`;
    body += `</body></html>`;

    return { subject, body };
}

async function getActiveServerConfig() {
    // Prefer a config whose fromEmail matches one of our SENDERS (Sara/Peter);
    // fall back to any active emailServerConfig.
    let cfg = null;
    for (const s of SENDERS) {
        cfg = await prisma.emailServerConfig.findFirst({ where: { isActive: true, fromEmail: { contains: s } } });
        if (cfg) break;
    }
    if (!cfg) cfg = await prisma.emailServerConfig.findFirst({ where: { isActive: true } });
    if (!cfg) throw new Error('no active emailServerConfig');
    return cfg;
}

(async () => {
    const today = new Date().toISOString().slice(0, 19) + 'Z';
    console.log(`[${today}] retargeting-report start (mode=${MODE} dry=${DRY})`);

    let stats;
    try {
        stats = await fetchJson(`/tcp-analytics/stats.php?s=${encodeURIComponent(TCP_STATS_SECRET)}`);
    } catch (e) {
        console.error('FAILED to fetch TCP stats:', e.message);
        process.exit(1);
    }
    console.log(`  fetched stats.php — ${stats.windows?.today?.total_pageviews || 0} pageviews today, ${(stats.hot_leads||[]).length} raw hot_leads`);

    const { subject, body } = await render(stats, today);

    // Archive the rendered HTML
    try {
        const archiveDir = '/var/log/tcp-retargeting-report';
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        const fname = `${archiveDir}/${today.slice(0,10)}-${MODE.toLowerCase()}.html`;
        fs.writeFileSync(fname, body);
        console.log(`  archived: ${fname} (${body.length} bytes)`);
    } catch (e) {
        console.warn('  archive failed:', e.message);
    }

    if (DRY) {
        console.log('  DRY-RUN — skipping send');
        await prisma.$disconnect();
        return;
    }

    const cfg = await getActiveServerConfig();
    const pwd = Buffer.from(cfg.password, 'base64').toString('utf8');
    const transporter = nodemailer.createTransport({
        host: cfg.host, port: cfg.port, secure: cfg.port === 465,
        auth: { user: cfg.username, pass: pwd }
    });

    const recipients = TO_OVERRIDE ? [TO_OVERRIDE] : RECIPIENTS;
    const info = await transporter.sendMail({
        from: `"${cfg.fromName || 'TCP Retargeting'}" <${cfg.fromEmail}>`,
        to: recipients,
        subject,
        html: body,
    });
    console.log(`  sent: messageId=${info.messageId}, to=${recipients.join(', ')}`);
    await prisma.$disconnect();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
