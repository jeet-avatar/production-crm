**To:** rajesh@techcloudpro.com
**From:** jm@techcloudpro.com
**Subject:** Apollo Campaign live + both daily reports fixed — context for your Claude session

Hey Rajesh,

Big day today on BrandMonkz CRM + the two daily reports. Read this once for context, then paste the whole thing into your Claude Code session (it has everything Claude needs to continue work on your end).

---

## TL;DR

1. **Apollo Campaign feature is live on brandmonkz.com** — new "Apollo Campaign" button on /campaigns header (indigo, left of "Send NetSuite Campaign"). Whole wizard with AI personalization + Send Now / 5 min / 10 min scheduling.
2. **Daily retargeting report (morning + evening fires)** — was stuck showing only Keith Vanwey + Andrew McGroarty for 14+ days. Now shows 22 prospects with Apollo-enriched company data (industry, employees, LinkedIn).
3. **Daily TCP engagement report (02:30 UTC fire)** — was crashing for 3 days (since 2026-05-30) due to a missing data file. Fixed + also fixed the Peter@→Sara hardcode (now shows 19 Sara/Peter campaigns vs the 1 it was finding).
4. **Sara deliverability** — was filtered as spam in jeetnair.in@gmail.com (one-time issue, fixed by marking as Not Spam). Sara is working broadly: 343 clicks + 180 opens across 7 days for other recipients. Same will apply to your inbox if Sara hits spam: search `from:sara@techcloudpro.com`, click "Not Spam" once, you're good.

---

## What changed today (technical summary)

### BrandMonkz CRM at brandmonkz.com (Phase 04)

| Surface | New |
|---|---|
| /campaigns header | New indigo "Apollo Campaign" button before "Send NetSuite Campaign". Click → wizard in Apollo mode. |
| /apollo | New standalone page in sidebar (rocket icon). Apollo prospect import workflow. |
| /contacts | `?source=apollo` filter + per-row Apollo + stream badges |
| /campaigns/<id>/analytics | Now shows Apollo Campaign sends too (via `Campaign.source='apollo'`) |
| NetSuiteCampaignWizard | Rewrote to lean 3-step (Audience → Review → Done). Both modes now have **Send Now / 5 min / 10 min** schedule picker on the final step. Apollo mode also has AI Personalize Preview block (Claude Sonnet 4.6 + web_search, ~$0.01/preview, cached). |
| Email templates | 9 per-stream coherent bodies seeded (Cybersecurity recipient gets Cybersecurity chrome, etc. — fixes the quick-8 stream-coherence bug) |
| Backend | New scheduledDispatcher service polls every 30s + boot catch-up for SCHEDULED EmailLogs. Sara hardcoded as APOLLO_FROM_EMAIL throughout. |

Live asset hash: `index-BoUXGyL2.js` (verify with `curl https://brandmonkz.com/ -H "User-Agent: Mozilla/5.0" | grep -oE "index-[A-Za-z0-9_-]+\.js"`).

### TCP Retargeting Report at /opt/tcp-retargeting-report/ (Phase 05)

Three bundled fixes:
- **PETER → SENDERS array** (now includes peter@ + sara@) → Section 4 "Campaign activity" surfaces both senders
- **UNION BrandMonkz email_tracking_events with TCP hot_leads** → Section 2 grew from 2 stuck rows to 22 prospects (real Sara/Peter click engagements from last 7d)
- **Apollo /v1/organizations/enrich per prospect** → Section 2 company cell now shows `industry · employee count · LinkedIn URL` inline (e.g. "Charlotte Pipe and Foundry Co · building materials · 1500 emp · LinkedIn")

Next fire: **Wed 2026-06-03 14:00 UTC** (~10h from this email). That's when you'll first see the new format in your inbox.

### TCP Daily Engagement Report at /opt/tcp-daily-report/ (Phase 07)

- Same PETER → SENDERS fix (was finding 1 peter@ campaign, now finds 19 Sara/Peter)
- All "Peter@" user-visible labels → "Sara/Peter"
- **Restored missing data file** (`/var/www/crm-backend/dist/data/tcp-v6-prospects.json`) that was lost during Phase 04 rollback — report had been crashing since 2026-05-30
- **Twilio credentials moved from hardcoded to env vars** (was blocking GitHub push protection)

Next fire: **Thu 2026-06-04 02:30 UTC** (~22h from this email).

### Sara protection

Sara is shared between video-generator pm2 (TCP retargeting, live) AND crm-backend pm2 Apollo routes (new). All dispatch paths use the SAME `APOLLO_FROM_EMAIL = 'Sara <sara@techcloudpro.com>'` constant. video-generator stayed online all session (8D uptime, 0 restarts — untouched).

If you ever send an Apollo Campaign and Sara emails don't land at a specific recipient, first thing to check is THEIR spam folder. Pattern documented in memory `feedback_sender_rotation_gmail_reputation_warmup`.

---

## Open items (your call after Wed/Thu fires validate)

### 1. Rotate keys exposed today

| Key | Why | Where |
|---|---|---|
| Twilio Account SID + API Key SID + API Key Secret | Were hardcoded in daily-tcp-report.js, in chat transcript today | Twilio Console → API Keys → revoke + regenerate → update `/var/www/crm-backend/.env` |
| Ahrefs API key | Pasted twice in chat today (Trial tier so low impact) | Ahrefs → API tokens → revoke + regenerate → update `/var/www/crm-backend/.env` |

### 2. Visitor identification tool decision

Section 3 of the retargeting report still shows generic ASN names (Microsoft Azure, China Mobile etc.) because real company-from-IP requires a paid SaaS tool. Options:
- **Leadfeeder** ($99/mo) — visitor company ID
- **RB2B** ($199/mo) — identifies INDIVIDUAL visitors (most powerful for B2B sales)
- **Albacross** / **Dealfront** — similar
- **Apollo tier upgrade** — Apollo has Website Visitors as a UI feature but no public API for it. Not worth upgrading just for this.

### 3. Ahrefs $29 Starter

Confirms Site Audit access (which is useful — you saw Health Score 99 with 2 critical errors + 108 warnings). API data endpoints still gated (`Insufficient plan` for organic-keywords, backlinks, overview) — Standard $249 + API add-on $500+/mo needed for API.

For the daily report's SEO data: skip Ahrefs API, use Google Search Console API instead (free, gives top organic queries + impressions + clicks per page). Setup is ~10 min in GCP Console. Phase 06 paused; pick it back up after Wed fire.

### 4. Other report Phase 07 follow-up

Phase 07's tcp-daily-report.js had agent flag 9 comment lines (q320 migration notes) that still say "peter@" in code comments. They're developer-only, NOT in the user-visible email. Safe to leave; optional polish.

---

## Repo + paths

| Thing | Path |
|---|---|
| Operational BrandMonkz CRM repo | github.com/jeet-avatar/production-crm, branch `seconf` |
| Local mirror | `~/Documents/production-crm-backup/` |
| BrandMonkz frontend | `/var/www/brandmonkz/` on EC2 100.24.213.224 |
| BrandMonkz backend dist | `/var/www/crm-backend/dist/` |
| BrandMonkz .env | `/var/www/crm-backend/.env` (now has TWILIO_*, AHREFS_API_KEY, APOLLO_API_KEY, plus existing RESEND_*) |
| TCP retargeting report | `/opt/tcp-retargeting-report/tcp-retargeting-report.js` (now tracked in `production-crm-backup/infra/tcp-retargeting-report/`) |
| TCP daily report | `/opt/tcp-daily-report/daily-tcp-report.js` (now tracked in `production-crm-backup/infra/tcp-daily-report/`) |
| Phase planning | `production-crm-backup/.planning/phases/04-apollo-campaign-port/` (RESEARCH + 8 PLANs + VERIFICATION + SIGNOFF) |
| Rollback snapshots on EC2 | `/tmp/pre-apollo-port-redeploy.tar.gz` (Phase 04, 749KB) + `.bak.pre-phase05-...` + `.bak.pre-phase07-...` files in /opt/tcp-*/ |
| SSH key for EC2 | `~/.ssh/brandmonkz-crm.pem` |

Recent commits on seconf:
```
c61c177 feat(07): tcp-daily-report — PETER→SENDERS + Twilio env vars + label polish
ae4ff20 docs(04): Phase 04 Apollo Campaign port — PLANS + RESEARCH + VERIFICATION + SIGNOFF
f1cd352 fix(05): drop dev jargon from Section 4 user-visible text
d1fa6f1 feat(05): TCP daily report — PETER→SENDERS + BM UNION + Apollo enrich
9f4ee0e feat(04-08): restore Send Now/5 min/10 min schedule picker on campaign wizard
11fbf13 feat(04-05): Apollo AI personalization — Claude+web_search per-contact + wizard preview block
86fc81d feat(04-03): Apollo Campaign indigo button on /campaigns header + wizard initialMode
6080242 feat(04-04): Apollo QoL — source filter + P2002 race catch + Claude normalize-filters
71a0b08 feat(04-02): Apollo /apollo page + sidebar nav + service client
a444016 feat(04-01): Apollo backend foundation — schema + client + classifier + routes
58ea813 feat(04-06): per-stream coherent email bodies — CONTENT ONLY (no Phase 6 UI)
```

---

## Key memories your Claude should load (worth pasting into a new session)

These were saved during today's work. Useful to know:

1. **`feedback_brandmonkz_operational_repo_is_seconf_branch`** — production-crm `seconf` branch is the operational repo. NOT `production`, NOT main, NOT `~/Documents/CRM Module/`.
2. **`feedback_brandmonkz_sara_resend_shared_dont_break`** — Sara on Resend is shared between two pm2 processes. Don't rotate keys naively + always preserve the APOLLO_FROM_EMAIL constant.
3. **`feedback_brandmonkz_deploy_approval`** — deploys to /var/www/ on EC2 require typed user approval.
4. **`feedback_brandmonkz_ui_signoff_before_deploy`** — UI changes need visual sign-off BEFORE deploy approval (Phase 6 rollback lesson).
5. **`reference_brandmonkz_deploy_must_ship_schema_prisma`** — when deploying backend, scp `prisma/schema.prisma` BEFORE running `prisma generate` on EC2, otherwise Prisma client regenerates against old schema and PrismaClientValidationError at runtime.
6. **`feedback_sender_rotation_gmail_reputation_warmup`** — Gmail tracks reputation per FROM address. New senders may hit spam; one "Not Spam" click resets.
7. **`reference_github_push_protection_blocks_newly_tracked_files_with_secrets`** — GitHub scans ALL commits in a push for secrets. When first-tracking a file from /opt/ or /var/www/, grep for hardcoded keys + move to env vars BEFORE first commit.

---

## What I need from you (in priority order)

1. **Confirm Wed 14:00 UTC retargeting report email arrives + looks correct.** I'm waiting on that to validate Phase 05 end-to-end. Reply "looks good" or "this section looks off" with screenshot.
2. **Confirm Thu 02:30 UTC daily report email arrives + the Sara/Peter labels render.**
3. **Decide on visitor-ID tool budget** (Leadfeeder / RB2B / etc.) so we can unblock Section 3 anonymous companies → real company names.
4. **Rotate Twilio + Ahrefs keys** (links above).

If anything breaks: instant rollback for Phase 05 is `ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 'sudo cp /opt/tcp-retargeting-report/tcp-retargeting-report.js.bak.pre-phase05-20260603-032043 /opt/tcp-retargeting-report/tcp-retargeting-report.js'`. Phase 07 rollback is the same pattern with `.bak.pre-phase07-20260603-034129`.

— JM
