# Rajesh — TCP v6 Retargeting Operator Handbook

**Audience:** Rajesh (rajesh@techcloudpro.com)
**Last updated:** 2026-05-26
**Status of the system:** Live. Test send confirmed to JM's gmail.

---

## 0. First-time setup (do this once)

### Step 0a — Get the credentials from JM

JM has every secret you need. Read `CREDENTIALS-FOR-RAJESH.md` (in this same directory) — it lists the 5 required + 1 you generate yourself. JM should share them via 1Password / Signal / in-person. Never via plain email or Slack.

### Step 0b — Run the one-shot bootstrap

The pipeline runs from your Mac. Run this command (it does NOT touch production — it only verifies your local setup):

```bash
mkdir -p ~/code && cd ~/code
git clone https://github.com/jeet-avatar/production-crm.git
cd production-crm
git checkout production
cd scripts/video-pipeline
cp .env.example .env
$EDITOR .env   # paste real credentials from Step 0a
chmod 600 .env
./setup-rajesh.sh
```

The script verifies:
- macOS with FFmpeg, Chrome, Python 3.10+, pip packages (requests, boto3, anthropic)
- The repo is at `~/production-crm`, branch `production`
- Your `.env` has real values (not `REPLACE_ME` placeholders)
- Each external service responds: ElevenLabs, Anthropic, AWS S3, Apollo
- Pipeline `apollo-import-prospects.py --dry-run` works

It exits **clean (code 0)** when everything's ready, or fails loud with actionable error messages.

### Step 0c — What happens when Apollo key is bad

If you haven't generated a real Apollo key yet, you'll see exactly this:

```
[apollo] AUTH FAILED (401) — check APOLLO_API_KEY
[apollo] response: Invalid access credentials.
```

That's the only acceptable failure at this stage. Everything else should be green. To fix Apollo:
1. Log into `app.apollo.io` as the TCP account owner
2. Settings → Integrations → API → Generate Key
3. Paste into `.env`, share with JM so it goes into EC2 `.env` too
4. Rerun `./setup-rajesh.sh`

### Step 0d — Done

When `setup-rajesh.sh` exits with `✓ All checks passed`, you're ready. Move to Section 1.

---

## ⚠ Sender rotation (May 26, 2026)

The TCP v6 retargeting emails now go FROM **`Sara <sara@techcloudpro.com>`** instead of `Peter Samuel <peter@techcloudpro.com>`. Mechanical change only — `techcloudpro.com` is domain-verified in Resend so any `@techcloudpro.com` address can send. Verified end-to-end today: send accepted, `email_logs.fromEmail = 'sara@techcloudpro.com'`, message arrived in test inbox.

**Side effect to know about — the existing 84 videos still show "Peter Samuel" + "Talk to Peter" in scene 3.** Re-rendering all 84 would cost ElevenLabs + Apollo credits unnecessarily. The pragmatic call:
- **Email sender, signature, reply-to** → already swapped to Sara
- **Scene HTMLs + landing-page template** → updated in source so any NEW video rendered after today says Sara
- **Existing 84 videos in S3** → unchanged; they still close with Peter

Result for a recipient who clicks 🟢 Ready to Send today on one of the 84 existing prospects: email comes FROM Sara, but if they watch the video the closer says "Peter Samuel." Minor inconsistency. Worth knowing before someone notices and asks.

To fully harmonize, re-run all 84 videos through `batch-ship-v6.py`. Costs roughly: 84 × ($0.05 Anthropic + $0.05 ElevenLabs + 1 Apollo credit) ≈ $10 + 84 credits. Worth it if outreach volume is high; not worth it if you're winding down v6 anyway.

---

## 1. What you have right now

A working TCP v6 retargeting machine. Three pieces:

| Piece | What it does | Where it lives |
|---|---|---|
| **🟢 Ready-to-Send button** in BrandMonkz Follow-Ups tab | One click → personalized 46s video email from sara@techcloudpro.com | `brandmonkz.com/reports` |
| **84 prospect video kits** (mp4 + GIF + landing page) | Pre-rendered, pre-uploaded to S3, indexed by prospect email | `s3://brandmonkz-video-campaigns/` + `s3://watch.techcloudpro.com/` |
| **Render pipeline** for adding prospect #85+ | Local CLI: research → narrate → render → upload → register | `github.com/jeet-avatar/production-crm` → `scripts/video-pipeline/` (branch: `production`) |

**Test send proof from earlier today:**
- POST /api/follow-ups/send-video → 200
- Real Resend `messageId: b1622de0-03ed-4494-a7d2-81b1a31adabe`
- TCP v6 campaign total: 100 sends (was 99)
- The email arrived in JM's gmail. From: `Sara <sara@techcloudpro.com>`.

---

## 2. The .md files you should read (in priority order)

All in `github.com/jeet-avatar/crm-email-marketing-platform/tree/main/crm-pipeline/tcp-retargeting/`:

| # | File | Why you read it |
|---|---|---|
| 1 | **`RAJESH-HANDBOOK.md`** (this file) | Start here. Operator playbook. |
| 1a | **`CREDENTIALS-FOR-RAJESH.md`** | Exact list of secrets JM needs to hand you + how to share them safely. Reference for Section 0. |
| 2 | **`GO-LIVE-PROOF.md`** | Evidence the pipeline works end-to-end. Shows exact API calls + DB rows + email arrival proof. Reference when anything looks off. |
| 3 | **`README.md`** in `production-crm/scripts/video-pipeline/` | Setup + usage of the rendering pipeline. The "how to add prospect #85" recipe. |
| 4 | **`PHASE-PLAN.md`** | Strategic picture: where the codebase has structural debt, what waves remain. Read if you want to understand WHY some things are still broken. |
| 5 | **`WAVE-0-BASELINE.md`** | Pre-Wave-3 snapshot. Useful for diff-vs-now if anything regresses. |
| 6 | **`WAVE-1-DISCOVERY.md`** | The "production-crm has 170 TS errors + 10+ missing Prisma models + schema drift" finding. Why we can't just `npm run build` and call it done. |
| 7 | **`DECISIONS.md`** | The four Wave-2 decisions locked in: production-crm canonical, merge to `production` branch, fix CI, etc. |
| 8 | **`WAVE-3-RUNBOOK.md`** | The runbook we couldn't fully execute. Pre-flight for any future repair attempt. |
| 9 | **`WAVE-3-4-RESULTS.md`** | What ACTUALLY happened in the cleanup session, including the 10-min outage and what we learned about the codebase. |
| 10 | **`RAJESH-OUTAGE-NOTICE.md`** | Drafted message to you about the brief outage during the cleanup. JM may or may not have already sent. |

**If you only have 10 minutes:** read items 1, 3 (the pipeline README), and 9 (results).

---

## 3. How to send a v6 retargeting email (the daily flow)

### Step 1 — Open the Follow-Ups tab

`https://brandmonkz.com/reports` → **Follow-Ups** tab.

The algorithm ranks contacts by `uniqueClicks × 20` over the last 30 days. (Forwards and opens were dropped Apr 29 because pixel-based metrics are 60-90% bot noise — see the `[follow-ups]` code comments.)

### Step 2 — Identify candidates

Two button types appear per row:

| Button | What it does | When you see it |
|---|---|---|
| 🟢 **Ready to Send** | Fires the pre-rendered v6 retargeting email (Peter Samuel → recipient) | Only for the 84 emails that have a v6 video kit |
| 🟠 **Follow Up** | Opens the older Follow-Up Wizard (manual campaign composer) | All other engaged contacts |

If you see only 🟠 and want the green button → that prospect doesn't have a v6 kit yet. Either ship them through the pipeline (Section 4) or use the orange wizard.

### Step 3 — Preview before sending (highly recommended for first time today)

The route exposes `GET /api/follow-ups/preview-video?contactId={id}` that returns the exact subject + HTML body that the next `/send-video` will produce. The UI may not surface this — but JM can pull it via API if you want a sanity check.

### Step 4 — Click 🟢 Ready to Send

The frontend posts:
```json
POST /api/follow-ups/send-video
{
  "contactId": "...",
  "confirmed": true
}
```

If you want to send to a different email than the contact's (for testing), JM can hit the API directly with `recipientOverride`:
```json
{
  "contactId": "...",
  "confirmed": true,
  "recipientOverride": "jm@techcloudpro.com"
}
```

### Step 5 — What the system actually does on click

1. Looks up the v6 kit for the contact's email
2. Verifies the recipient isn't in `email_unsubscribes` (q320 pre-send filter — protects you from accidentally re-sending to opt-outs)
3. Verifies the recipient hasn't previously bounced
4. Creates an `email_logs` row in PENDING status
5. Renders the email template with the prospect-specific kit + tracking pixel + click-wrapped CTAs
6. Calls Resend's `/v1/emails` endpoint as `sara@techcloudpro.com` (from = `Sara <sara@techcloudpro.com>`)
7. Flips `email_logs` row to SENT, stores Resend's `messageId`
8. Returns `{success: true, messageId, trackingId, recipient, slug, company}`

### Step 6 — What the recipient sees

- From: Sara <sara@techcloudpro.com>
- Subject: `{Company}: what TechCloudPro can do`
- Inline 3-second GIF preview at top
- "Watch the video" CTA → `https://watch.techcloudpro.com/{slug}/` (their personalized landing page)
- Research block: "What you do / A few things on our radar / Where we plug in"
- 4 CTAs in footer (Call ARIA, Call a human, Visit TCP, Visit ArthaBuild)
- Working unsubscribe link → `/api/unsubscribe/check/{email}` (the recent fix — was broken for the first 99 sends, working now)

### Step 7 — When the recipient replies

Reply goes to `sara@techcloudpro.com` → mail-server forwarding rule auto-fans to `rajesh@techcloudpro.com` + `jm@techcloudpro.com`. No CRM action needed.

### Step 8 — What happens on click/visit

- Email open → tracking pixel hit → `email_tracking_events` row (pixel inflated by bots; we don't act on these alone)
- CTA click → `/api/tracking/click/{trackingId}?url=...` → 302 redirect to the real URL, log click event
- Landing page visit → JS posts to `/api/track/visit` → `website_visits` row
- Time on page, CTA clicks on landing page, video play/25/50/75/100 milestones all logged

The next morning's TCP daily report aggregates all of these into per-prospect engagement scores.

---

## 4. How to add prospect #85+ (the periodic flow)

You add new prospects when you (or JM, or the daily report) identify someone worth retargeting who doesn't yet have a v6 kit.

### One-time setup (do once per machine)

```bash
# Clone the canonical repo
cd ~
git clone https://github.com/jeet-avatar/production-crm.git
cd production-crm
git checkout production
cd scripts/video-pipeline

# Copy .env template and fill in real keys
cp .env.example .env
# Open .env in editor, fill in:
#   ELEVENLABS_API_KEY  (we have one — JM has it)
#   ANTHROPIC_API_KEY   ⚠ currently exhausted — see Section 7
#   APOLLO_API_KEY      ⚠ currently invalid — see Section 8
#   AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY  (for S3 uploads — JM has them)

# Verify toolchain
which ffmpeg                                                # /opt/homebrew/bin/ffmpeg
ls "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  # exists
python3 -c "import requests, boto3, anthropic"               # no errors
```

### Per-batch flow (every Monday, or whenever you have new prospects)

**Step 1 — Identify prospects to add.** Three sources:
- Daily TCP report's "Top engagers (clicks + visits — NO pixel opens)" section — these are people engaging with TCP content who don't yet have a v6 video
- Apollo.io discovery (see Section 8) — once a valid Apollo key is in `.env`
- Manual list from sales

**Step 2 — Drop the prospects into `cache/prospects-raw.json`:**

```json
[
  {
    "rank": 85,
    "firstName": "Sarah",
    "lastName": "Lee",
    "email": "sarah.lee@acmemfg.com",
    "domain": "acmemfg.com",
    "companyName": "Acme Manufacturing"
  }
]
```

**Step 3 — Research them with Anthropic web_search (requires credit balance):**

```bash
python3 research-prospects.py cache/prospects-raw.json cache/kits.json
```

This calls Claude with `web_search` enabled to produce per-prospect `industry`, `painPoints[3]`, `tcpFit[3]`, `whyThisHtml`. ~3 minutes per prospect (30s rate-limit between calls, plus the API turn itself).

**Step 4 — Render + upload:**

```bash
python3 batch-ship-v6.py cache/kits.json
```

This creates the mp4 (~46s), inline GIF (~150KB), and landing page, then uploads all three to S3 (`brandmonkz-video-campaigns/` for video+GIF, `watch.techcloudpro.com/` for the landing page). Also updates `tcp-v6-prospects.json` in the pipeline directory.

**Step 5 — Merge with the existing 84 prospect mapping:**

```bash
python3 -c "
import json
ex = json.load(open('<path to existing tcp-v6-prospects.json from EC2 or repo>'))
new = json.load(open('tcp-v6-prospects.json'))
open('/tmp/merged.json','w').write(json.dumps({**ex, **new}, indent=2))
"
```

**Step 6 — Deploy the merged file to EC2:**

```bash
# scp to EC2
scp /tmp/merged.json ec2-user@100.24.213.224:/tmp/wave-N.json

# on EC2, chattr dance + pm2 restart
ssh ec2-user@100.24.213.224 'sudo chattr -i /var/www/crm-backend/dist/data/tcp-v6-prospects.json && \
  sudo cp /tmp/wave-N.json /var/www/crm-backend/dist/data/tcp-v6-prospects.json && \
  sudo chown ec2-user:ec2-user /var/www/crm-backend/dist/data/tcp-v6-prospects.json && \
  sudo chattr +i /var/www/crm-backend/dist/data/tcp-v6-prospects.json && \
  pm2 restart crm-backend'

# verify
ssh ec2-user@100.24.213.224 'pm2 logs crm-backend --lines 10 | grep "Loaded.*TCP v6"'
# Expect: "[follow-ups] Loaded 85 TCP v6 prospect kits"
```

The new prospect will now show 🟢 Ready to Send in your Follow-Ups tab.

---

## 5. The two "hardcoded" values in your daily report

You noticed the daily retargeting report always shows the same two identified prospects (Keith Vanwey + Andrew McGroarty). **The code is correct — the data source is stuck.**

### What's happening

The retargeting report at `/opt/tcp-retargeting-report/tcp-retargeting-report.js` queries TCP's `stats.php` endpoint on Hostinger, which reads from a MySQL `hot_leads` table. That table gets new entries only when:
- Someone fills out a form on `techcloudpro.com`
- OR a known email click → fingerprint matches an unidentified visitor

In the last 14 days: zero form-fills, and the email-click → fingerprint matching apparently isn't firing. So `hot_leads` has the same 2 entries every day.

### Verified from cron logs

```
2026-05-20 morning:  61 pageviews, 2 raw hot_leads
2026-05-21 morning:  38 pageviews, 2 raw hot_leads
2026-05-22 morning:  57 pageviews, 2 raw hot_leads
2026-05-23 morning:  13 pageviews, 2 raw hot_leads
2026-05-24 morning:  11 pageviews, 2 raw hot_leads
2026-05-25 morning:  16 pageviews, 2 raw hot_leads
2026-05-26 evening:   5 pageviews, 2 raw hot_leads  ← latest
```

Pageviews varies normally. `hot_leads = 2` is constant.

### The fix (DOES NOT REQUIRE EC2 CODE CHANGE TODAY)

Two paths:

**Path A — Improve the data source.** Figure out why email-click → fingerprint matching isn't firing on `techcloudpro.com`. This is a Hostinger PHP + JS investigation, not a BrandMonkz CRM task.

**Path B — Add a second data source.** Modify the retargeting report to UNION `hot_leads` (form-fills) with **BrandMonkz email-click prospects** (we have rich data in `email_tracking_events` + `email_logs` + `contacts`). This shows recent click-engaged prospects as "identified" too.

I recommend Path B. Specifically, add a query like:

```sql
SELECT DISTINCT
  c."firstName", c."lastName", c.email,
  co.name AS "companyName",
  COUNT(*) AS clicks_30d,
  MAX(ete."createdAt") AS last_click
FROM email_logs el
JOIN email_tracking_events ete ON ete."emailLogId" = el.id AND ete.event = 'CLICKED'
JOIN contacts c ON c.id = el."contactId"
LEFT JOIN companies co ON co.id = c."companyId"
WHERE ete."createdAt" > NOW() - INTERVAL '30 days'
  AND el."fromEmail" = 'sara@techcloudpro.com'
  AND LOWER(c.email) NOT IN (SELECT LOWER(email) FROM email_unsubscribes)
  AND LOWER(c.email) NOT IN ('jeetnair.in@gmail.com', 'jm@techcloudpro.com', 'rajesh@techcloudpro.com')
GROUP BY c."firstName", c."lastName", c.email, co.name
ORDER BY clicks_30d DESC
LIMIT 20;
```

UNION the results with TCP's `hot_leads` and you've expanded "identified prospects" from 2 to whatever-the-actual-number-is.

### Why I didn't fix it today

The retargeting report script lives at `/opt/tcp-retargeting-report/tcp-retargeting-report.js` on EC2 and is **NOT in any git repo** (just like `followUps.js` was before today). Modifying hand-deployed scripts without first capturing them into source control is exactly the pattern that caused the May-18 disaster where 71 dist files got lost.

The right sequence is:
1. **First:** capture the report scripts into `production-crm/scripts/cron/` (commit to git)
2. **Then:** apply the Path B fix in source
3. **Then:** redeploy the patched version to EC2

That's a 1-2 hour task for the next session. Schedule when convenient.

---

## 6. Apollo.io — RESOLVED (May 26, 2026)

**Status:** Working. Rajesh's new key (22 chars; the format is fine, the prior key was just bad/expired) is deployed to EC2 `.env`. Verified end-to-end: pulled 3 real CFOs from Apollo with unlocked emails.

### What was fixed today

1. **Got a real Apollo API key** — generated from `app.apollo.io` → Settings → Integrations → API. The new key is now in EC2 `.env` (`.env.bak.wave7-apollo-1779768745` is the rollback).
2. **Updated the importer to use the new Apollo endpoint.** Apollo deprecated `/mixed_people/search` for API callers in mid-2025; the new endpoint is `/mixed_people/api_search`. Pipeline code updated.
3. **Added `--enrich` flag** that chains to `/v1/people/match` per result to unlock locked emails. Costs ~1 Apollo credit per email reveal. Without `--enrich`, the importer skips locked prospects with a clear warning.
4. **Added email-derived domain fallback** for prospects where Apollo doesn't return `website_url`.

### What returned today (the dogfood test)

With `--limit 3 --dry-run --enrich` against `q_organization_keyword_tags=["NetSuite"]`:

| Name | Title | Company | Email | LinkedIn |
|---|---|---|---|---|
| Joe Alie | CFO | Charted (formerly SquareWorks) | `joe.alie@charted.com` | linkedin.com/in/joe-alie-73286a35 |
| Alex Greco | CFO | Plative | `agreco@plative.com` | linkedin.com/in/alexgreco55 |
| Erik Olsson | CFO | Business Solution Partners | `eolsson@bspny.com` | linkedin.com/in/erikcaolsson |

### ⚠ ICP refinement needed before bulk imports

Note the three companies returned: **Charted, Plative, BSP** — these are all **NetSuite implementation partners / consultancies / resellers**, not NetSuite end-user customers. The keyword tag `"NetSuite"` matches both "uses NetSuite" and "sells NetSuite services" — Apollo doesn't distinguish.

For TCP's actual ICP (companies that USE NetSuite as their ERP), we need more precise filters. Options:

1. **Add industry filter** to exclude consultancies/IT services. Add `--exclude-industries "Information Technology and Services,Management Consulting,Software Development"` to filter them out. (Apollo supports negative industry filtering.)
2. **Switch to `currently_using_any_of_technology_uids`** instead of keyword tags. This filter targets companies whose installed tech stack DETECTS NetSuite — which is end users, not resellers.
3. **Add specific positive industries**: Manufacturing, Distribution, Wholesale Trade, Apparel & Fashion, Construction. These are TCP's actual prospects.

Before Rajesh runs the importer in `--enrich` mode (which spends Apollo credits), agree on the ICP filter with JM. Each enrich call is ~1 Apollo credit; a 20-prospect run with wrong ICP wastes 20 credits.

### Step 2 — Use the importer:

I added `scripts/video-pipeline/apollo-import-prospects.py` to the pipeline. It searches Apollo for people matching TCP's ICP and emits a `prospects-raw.json` directly consumable by `research-prospects.py`.

ICP defaults baked in (overridable via CLI):
- Titles: CFO, VP Finance, Controller, IT Director, ERP Manager
- Tech stack: NetSuite
- Company size: 50-500 employees (mid-market)
- Countries: US, Canada
- Email status: verified only

Usage:
```bash
# Import 10 new prospects matching ICP
APOLLO_API_KEY=<real-key> python3 apollo-import-prospects.py --limit 10

# Dry run first to see what'd come back
APOLLO_API_KEY=<real-key> python3 apollo-import-prospects.py --limit 5 --dry-run

# Custom ICP
python3 apollo-import-prospects.py --titles "CFO,COO" --keywords "NetSuite,SuiteScript" --min-emp 100 --max-emp 1000
```

It dedups against existing prospects in `tcp-v6-prospects.json`, so re-running won't reimport the same people.

**Step 3 — Pipeline this into your weekly flow:**

```bash
# Monday morning ritual
cd scripts/video-pipeline
python3 apollo-import-prospects.py --limit 10                 # discovery
python3 research-prospects.py cache/prospects-raw.json cache/kits.json  # research
python3 batch-ship-v6.py cache/kits.json                      # render + upload
# (then merge + deploy to EC2 per Section 4 Step 5-6)
```

That's "10 new personalized retargeting kits per week" with maybe 30-45 minutes of operator time (mostly waiting for the renders).

---

## 7. Anthropic credits — RESOLVED (May 26, 2026)

Originally the Anthropic key in `.env` belonged to a Dollor.ai workspace which had run out of credits. **Fixed:** JM generated a new key from the TechCloudPro workspace (where credits were freshly topped up) and swapped it into EC2 `.env` (`sk-ant-api03-***...***`, 108 chars). Verified working with a tiny test call from both local and EC2.

**Cost attribution from May 26 onward:** all TCP pipeline Anthropic spend (research-prospects, daily reports if they call Anthropic) charges the TechCloudPro account. Clean separation from Dollor.ai's billing.

**The OLD key (`sk-ant-api03-***...***`) is still live somewhere** — we don't know which workspace owns it. It's no longer in EC2 `.env`. For hygiene, find and revoke it once we identify the workspace. Not urgent — it's just unused.

**To top up the TechCloudPro Anthropic account in the future:**
- `console.anthropic.com/settings/billing` while logged into the TCP account
- Workspace dropdown (top-left): pick the TCP workspace
- Add to balance — $20-50 covers many weeks at TCP volume (~$0.05/prospect researched)

---

## 8. What's safe vs. dangerous

### Safe to do anytime

- Click 🟢 Ready to Send on existing prospects (84 of them right now)
- Run `python3 apollo-import-prospects.py --dry-run` (no writes anywhere)
- Run `python3 research-prospects.py` (after Anthropic credits restored)
- Run `python3 batch-ship-v6.py` (writes to S3 + local files only, doesn't touch EC2)
- Read DB / S3 / logs — no risk

### Dangerous — coordinate with JM first

- Updating `tcp-v6-prospects.json` on EC2 (requires `chattr -i` + `pm2 restart`, ~3 sec service blip)
- Modifying any script under `/opt/tcp-daily-report/` or `/opt/tcp-retargeting-report/` (NOT in git, can be lost)
- Modifying anything under `/var/www/crm-backend/dist/` (also NOT in git for many files)
- `npm run build` or `npm install` on EC2 — caused a 10-min outage today (4GB RAM is not enough for this codebase)
- Force-merging GitHub branches
- Adding GitHub Actions workflow runs (still broken — IPs not whitelisted)

### Hard rules

- Never delete `dist.bak-342-20260517-230856/` on EC2 — it's our only rollback to a known-good pre-May-18 state
- Never `chattr +i` files you don't intend to lock indefinitely
- Never send v6 emails to anyone in `email_unsubscribes` (the q320 filter prevents this, but don't try to bypass)
- Never test sends to real prospects without first sending the same content to JM via `recipientOverride`

---

## 9. Quick reference — endpoints and credentials

| What | Where | Notes |
|---|---|---|
| BrandMonkz CRM | `https://brandmonkz.com/reports` | Login: standard CRM auth |
| Follow-Ups tab | `https://brandmonkz.com/reports` → Follow-Ups | Where 🟢 button lives |
| API base | `https://brandmonkz.com/api/` | Bot-filtered by Cloudflare for curl — use a browser |
| Production EC2 | `ec2-user@100.24.213.224` (Elastic IP) | SSH key needed from JM |
| TCP campaign ID | `cmot17773423143549` | The v6 retargeting campaign in email_logs |
| Sender | `Sara <sara@techcloudpro.com>` | Resend, domain-verified |
| Reply-to | `sara@techcloudpro.com` | Auto-forwards to rajesh + jm at mail-server |
| Tracking pixel | `/api/tracking/open/{trackingId}` | Returns 1x1 GIF, logs to email_tracking_events |
| Visit tracking | `POST /api/track/visit` | JS on landing pages posts here |
| Unsubscribe (template links here now) | `/api/unsubscribe/check/{email}` | The Wave-0 CAN-SPAM fix |
| S3 video bucket | `brandmonkz-video-campaigns` | Public-read |
| S3 landing bucket | `watch.techcloudpro.com` | Cloudflare-fronted, public |
| Source-of-truth repo for pipeline | `github.com/jeet-avatar/production-crm` → `production` branch | Default branch was switched in Wave 3 |
| TCP retargeting docs repo | `github.com/jeet-avatar/crm-email-marketing-platform` → `main` | Will be archived after the codebase repair phase |

---

## 10. When something looks wrong

| Symptom | Likely cause | What to try |
|---|---|---|
| 🟢 button missing for a prospect who should have it | Their email isn't a key in `tcp-v6-prospects.json` (case-sensitivity? typo?) | Check the JSON; their email must be lowercased exactly. |
| Send returns `{success:false, skipped:"recipient unsubscribed"}` | They're in `email_unsubscribes` (q320 filter) | Honor it. Don't bypass. |
| Send returns `{success:false, skipped:"recipient previously bounced"}` | Hard bounce on prior send | Honor it — sender reputation matters. |
| Send returns 502 `{error: "Resend send failed"}` | Resend API issue or domain unverified | Check `app.resend.com/emails` for the failed log. Ping JM if domain auth is off. |
| Daily report missing for a day | Either pm2 down or stats.php unreachable | `pm2 list` should show `crm-backend` online. `curl https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` should return JSON. |
| `[follow-ups] Loaded N TCP v6 prospect kits` shows wrong count after deploy | `chattr +i` didn't get reapplied, OR pm2 didn't restart | SSH in, check `lsattr` on the file + force `pm2 restart crm-backend`. |
| Anything else broken | Check `pm2 logs crm-backend --lines 100` first | Then call JM. |

---

## 11. What's still NOT done (for future sessions)

These were flagged during the cleanup but deferred:

1. **6 other production features still 404** — contracts, quotes, contract-signing, job-leads, ai-code, calendar-auth. The codebase doesn't build cleanly. Needs a multi-day schema-repair phase. See `WAVE-3-4-RESULTS.md`.
2. **Daily reports' "stuck at 2 identified prospects"** — fix recipe in Section 5 above. Needs the cron scripts to be brought into source control first.
3. **Apollo key + ICP definition** — get a real key (Section 6), agree on the ICP criteria with JM, run the importer weekly.
4. **Anthropic credit balance** — top up (Section 7).
5. **The unsubscribed-for-jm@techcloudpro.com state** — you (or JM) may want to remove that row from `email_unsubscribes` if it was set in error.
6. **video-generator pm2 process has plaintext API keys in its env** — separate security pass (Wave 0 Finding #2).

When you (or a future session) tackle any of these, the corresponding doc above has the next steps captured.

---

## 12. Email you should expect

JM may forward you a brief note summarizing this session (the work to restore the Ready-to-Send button, the 10-min outage we caused while trying to do it cleanly, and what's now in place). If you didn't receive it, ask. The full details are in `WAVE-3-4-RESULTS.md`.

---

*This handbook is committed to `crm-email-marketing-platform/main` at `crm-pipeline/tcp-retargeting/RAJESH-HANDBOOK.md`. Update it as the system evolves.*
