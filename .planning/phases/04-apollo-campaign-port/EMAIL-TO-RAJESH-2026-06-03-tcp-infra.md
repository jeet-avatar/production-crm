**To:** rajesh@techcloudpro.com
**From:** Sara <sara@techcloudpro.com>
**Subject:** TCP website infrastructure + everything you need to make changes to techcloudpro.com

Hey Rajesh,

Second email today — first one was about BrandMonkz CRM (Apollo Campaign live, daily reports fixed). This one is the **techcloudpro.com website + supporting infrastructure** map so you can make changes confidently.

Paste this into your Claude Code session alongside the first email for full operational context.

⚠️ **Secrets are NOT in this email** (per the CREDENTIALS-FOR-RAJESH.md policy — never plaintext via email). The end of this email has the checklist of what to ask JM for via 1Password / Signal.

---

## TL;DR — where techcloudpro.com lives

| Component | Where | What it runs |
|---|---|---|
| **DNS** | Cloudflare (nameservers `summer.ns.cloudflare.com` + `nicolas.ns.cloudflare.com`) | Proxied A records: `104.21.48.79` + `172.67.181.189` (Cloudflare CDN) → origin `147.93.101.51` (Hostinger) |
| **Website hosting** | **Hostinger** (LiteSpeed backend, origin IP `147.93.101.51`) | WordPress (`/wp-login.php` returns 200 — confirmed WP) |
| **Email (inbound)** | Microsoft Outlook 365 (MX: `techcloudpro-com.mail.protection.outlook.com`) | Mailboxes for rajesh@, jm@, support@, peter@, sara@, etc. |
| **Email (outbound — sales/marketing)** | **Resend** via SMTP gateway `smtp.resend.com`. DKIM signed at `resend._domainkey.techcloudpro.com` (verified). | Sara@ + Peter@ campaign sends (BrandMonkz CRM, TCP retargeting pipeline) |
| **SES bounce/feedback subdomain** | AWS SES at `send.techcloudpro.com` → `feedback-smtp.us-east-1.amazonses.com` (AWS account 134607809447). | Used by Resend for bounce handling. **NOTE: SES DKIM verification FAILED today** — separate orphan identity, see "Known issues" below |
| **TCP analytics pipeline** | Hostinger PHP + MySQL | `/tcp-analytics/stats.php` reads `hot_leads` MySQL table. Cross-referenced by BrandMonkz daily reports. |
| **Landing pages (watch.techcloudpro.com)** | AWS S3 bucket `watch.techcloudpro.com`, Cloudflare-fronted, public | Personalized 84+ prospect videos for TCP v6 retargeting |
| **Video kits** | AWS S3 bucket `brandmonkz-video-campaigns` (account 134607809447, IAM user `CRMaccesskey`) | mp4 + GIF + landing HTML per prospect |
| **BrandMonkz CRM (NOT techcloudpro.com)** | AWS EC2 `100.24.213.224` at `brandmonkz.com` | Separate from TCP website — the CRM Rajesh uses to send campaigns |

---

## DNS topology (full record set)

```
techcloudpro.com.        IN MX     0 techcloudpro-com.mail.protection.outlook.com.
techcloudpro.com.        IN TXT    "v=spf1 include:spf.protection.outlook.com -all"
techcloudpro.com.        IN TXT    "google-site-verification=Kb76Tq8SuLSmrhyjXMKWUnzkLWG3kImpu6nLstQsqkA"
techcloudpro.com.        IN TXT    "google-site-verification=Nrm2FZhHrttLuFn3q2vWIw7viCFnTqznQNkhnvS8LSM"
_dmarc.techcloudpro.com. IN TXT    "v=DMARC1; p=quarantine; fo=1"
resend._domainkey.       IN TXT    "p=MIGfMA0GCS..." (1024-bit Resend DKIM public key — VERIFIED)
send.techcloudpro.com.   IN MX     0 feedback-smtp.us-east-1.amazonses.com.
send.techcloudpro.com.   IN TXT    "v=spf1 include:amazonses.com ~all"
techcloudpro.com.        IN A      104.21.48.79, 172.67.181.189  (Cloudflare proxy)
techcloudpro.com.        IN NS     summer.ns.cloudflare.com, nicolas.ns.cloudflare.com

Cloudflare origin (bypasses proxy): 147.93.101.51 (Hostinger)
```

---

## To make changes to techcloudpro.com

### A. WordPress content (blog posts, pages, plugins)

Login at: `https://techcloudpro.com/wp-admin/` OR `https://techcloudpro.com/wp-login.php`
- **You need:** WordPress admin username + password (ask JM via 1Password — see checklist below)
- For pages/posts: standard WP editor
- For plugins/theme: WP admin → Plugins / Appearance

### B. Static files (assets, CSS, custom PHP scripts like stats.php)

Two ways:
1. **Hostinger File Manager** (web GUI): log into `https://hpanel.hostinger.com/` → Hosting → techcloudpro.com → File Manager → navigate to `public_html/`
2. **FTP/SFTP** (faster for many files): host, user, password from Hostinger Files → FTP Accounts

The `/tcp-analytics/stats.php` endpoint lives at `public_html/tcp-analytics/stats.php` on Hostinger (this is what the daily report queries).

### C. MySQL (`hot_leads` table + WordPress DB)

Access via:
1. **phpMyAdmin** in Hostinger panel: hPanel → Hosting → techcloudpro.com → Databases → phpMyAdmin
2. **MySQL CLI** if you have remote MySQL enabled (check hPanel → Databases → Remote MySQL)

Key table you care about: `hot_leads` (in the WordPress DB or a custom DB — confirm with JM)

### D. DNS records (add/remove/edit)

Cloudflare dashboard: `https://dash.cloudflare.com/` → Websites → techcloudpro.com → DNS
- **You need:** Cloudflare account login (ask JM)
- Useful for: adding new subdomains, adjusting MX/TXT for email vendor changes, updating DKIM keys

### E. Email config (Outlook mailboxes, forwarding rules)

Microsoft 365 admin center: `https://admin.microsoft.com/`
- **You need:** M365 admin login (ask JM)
- The sara@ → rajesh@ + jm@ forwarding rule lives in M365 transport rules
- Adding new mailboxes / changing aliases happens here

### F. AWS S3 / SES (Resend bounce subdomain, video buckets)

AWS Console: `https://aws.amazon.com/console/` → account `134607809447` → us-east-1
- **You need:** AWS console login OR IAM access key (CRMaccesskey already exists per CREDENTIALS-FOR-RAJESH.md)
- S3: brandmonkz-video-campaigns (video kits), watch.techcloudpro.com (landing pages)
- SES: domain identity `techcloudpro.com` (currently DKIM-failed — separate issue)

---

## Known issues to fix on techcloudpro.com

### 1. AWS SES DKIM verification FAILED for techcloudpro.com (June 2, 2026 notification)

- AWS account 134607809447, us-east-1
- Orphan SES domain identity: someone set up `techcloudpro.com` in SES, never added the 3 DKIM CNAMEs, AWS gave up after 3 days
- **NOT used by BrandMonkz** (BrandMonkz uses Resend SMTP, not direct SES)
- Recommended action: **delete the SES identity** if nothing in 134607809447 actually needs it. AWS Console → SES → Verified identities → techcloudpro.com → Delete

### 2. TCP analytics `hot_leads` MySQL table stuck at 2 rows for 14+ days

The PHP stats endpoint reads from `hot_leads` (in Hostinger MySQL). Only 2 rows: Keith Vanwey (ONSITE Woodwork) + Andrew McGroarty (LexisNexis), both from email-clicks weeks ago. Reasons:
- Zero form-fills on techcloudpro.com in last 14d
- Email-click → fingerprint matching JS (on TCP website) isn't firing

**Where to look:** the JS/PHP that captures visitor fingerprints + matches them to email_logs entries. Likely lives in `public_html/tcp-analytics/` on Hostinger. Find the function that writes to `hot_leads`, debug why it's silent.

**Workaround already shipped (BrandMonkz side, Phase 05):** the daily report now UNIONs `hot_leads` with BrandMonkz `email_tracking_events`, so the report shows 22 prospects instead of 2. But the underlying `hot_leads` table is still stale — fixing TCP-side fingerprint matching would compound the value.

### 3. Ahrefs Site Audit findings (Health Score 99/100 — generally healthy)

198 internal URLs audited. Issues:
- **2 critical errors:** 1 page links to broken page, 1 4XX page, 1 404 page → fix in WordPress admin (find dead links/redirects)
- **108 warnings:** 98 3XX redirects (consider consolidating), 8 pages link to broken pages, 2 missing meta descriptions, 1 slow page
- **100 notices:** mostly redirect noise + redirected pages with no incoming internal links
- **11 schema.org validation errors:** structured data on certain pages is malformed — find the JSON-LD blocks and validate

To dig into specific issues: Ahrefs UI → Site Audit → Issues tab → click each row for the specific URL + fix suggestion.

### 4. New sender Sara hits spam for some specific recipients

Pattern: Gmail tracks reputation per FROM address. When Peter → Sara rotation happened on May 26, new Sara emails to some recipients (e.g., my own jeetnair.in@gmail.com) silently went to spam. Fix: recipient marks one Sara email "Not Spam" — single click resets reputation, future emails land in inbox.

Sara is working broadly: 343 clicks + 180 opens in last 7 days across prospects. Just per-recipient warmup needed.

---

## Operational status (verified today June 3, 2026 03:00 UTC)

| Service | Status |
|---|---|
| techcloudpro.com (Cloudflare → Hostinger) | ✅ Live, Health Score 99/100 |
| wp-login.php accessible | ✅ 200 |
| BrandMonkz CRM at brandmonkz.com | ✅ Live, asset `index-BoUXGyL2.js`, Apollo Campaign feature deployed |
| EC2 crm-backend pm2 process | ✅ Online, 12h uptime since Phase 04 deploy |
| EC2 video-generator pm2 process (TCP retargeting Sara sends) | ✅ Online, 8D uptime continuous, 0 restarts |
| TCP retargeting report systemd timer | ✅ Active, next fire Wed 2026-06-03 14:00 UTC + Thu 02:00 UTC |
| TCP daily report systemd timer | ✅ Active, next fire Thu 2026-06-04 02:30 UTC |
| Resend domain auth (techcloudpro.com) | ✅ DKIM verified |
| AWS SES domain identity for techcloudpro.com | ❌ DKIM FAILED — orphan, safe to delete (or add 3 CNAMEs if intentional) |

---

## Credentials checklist (ask JM via 1Password — NOT via email)

Per existing CREDENTIALS-FOR-RAJESH.md policy. To make changes to TCP website, you'll need:

| # | Credential | For | Where JM gets it |
|---|---|---|---|
| 1 | Hostinger account login (hpanel.hostinger.com) | File Manager, FTP, MySQL access, plugin installs | JM's 1Password "Hostinger" vault |
| 2 | WordPress admin user + password | Editing posts/pages/plugins/themes | JM's 1Password "techcloudpro.com WP" entry |
| 3 | Hostinger MySQL credentials (host, port, user, password, db name) | Direct MySQL queries against `hot_leads` etc. | Hostinger panel → Databases → MySQL Databases |
| 4 | Cloudflare account login + API token (optional) | DNS changes for techcloudpro.com | JM's 1Password "Cloudflare" |
| 5 | Microsoft 365 admin login | Email config, forwarding rules, alias additions | JM's 1Password "M365 admin" |
| 6 | AWS Console login OR `CRMaccesskey` IAM access key/secret (account 134607809447) | S3, SES, EC2 management | Existing — already in CREDENTIALS-FOR-RAJESH.md |
| 7 | `TCP_STATS_SECRET` (the secret param for `/tcp-analytics/stats.php`) | Querying TCP stats endpoint from new scripts | Embedded in `/opt/tcp-retargeting-report/tcp-retargeting-report.js` on EC2 — ask JM, who has SSH access |
| 8 | EC2 SSH key `brandmonkz-crm.pem` | SSH to 100.24.213.224 (BrandMonkz EC2, NOT techcloudpro.com) | Already in CREDENTIALS-FOR-RAJESH.md |

If JM doesn't have one of these in 1Password yet (likely Hostinger + Cloudflare + M365), he creates a 1Password vault entry, shares with rajesh@techcloudpro.com, you accept.

---

## File paths reference

| Thing | Path |
|---|---|
| **TCP website root (Hostinger)** | `/home/<hostinger-user>/public_html/` (find exact user in Hostinger panel) |
| TCP analytics endpoint | `public_html/tcp-analytics/stats.php` |
| WordPress core | `public_html/wp-admin/`, `public_html/wp-content/`, `public_html/wp-includes/` |
| WordPress config | `public_html/wp-config.php` (has DB credentials — careful) |
| **BrandMonkz CRM** (separate from TCP — on EC2) | `/var/www/crm-backend/` + `/var/www/brandmonkz/` on `ec2-user@100.24.213.224` |
| BrandMonkz .env | `/var/www/crm-backend/.env` |
| TCP retargeting report (Node) | `/opt/tcp-retargeting-report/tcp-retargeting-report.js` (tracked in repo: `production-crm-backup/infra/tcp-retargeting-report/`) |
| TCP daily report (Node) | `/opt/tcp-daily-report/daily-tcp-report.js` (tracked in repo: `production-crm-backup/infra/tcp-daily-report/`) |
| Video generator service (Python) | `/var/www/video-generator-service/app.py` on EC2 |
| Rollback snapshots (today) | `/tmp/pre-apollo-port-redeploy.tar.gz` + `/opt/tcp-*/*.bak.pre-phase*` |
| Local mirror of BrandMonkz repo | `~/Documents/production-crm-backup/` on JM's MacBook |
| CRM Module pipeline (TCP retargeting docs + scripts) | `~/Documents/CRM Module/crm-pipeline/tcp-retargeting/` (RAJESH-HANDBOOK + CREDENTIALS-FOR-RAJESH live here) |

---

## What to do FIRST in your next Claude Code session

1. **Paste the previous email** ("Apollo Campaign live + both daily reports fixed") so Claude has BrandMonkz context
2. **Paste this email** so Claude has TCP website context
3. **Ask JM via Signal** for credentials checklist items #1-5 (Hostinger, WordPress, MySQL, Cloudflare, M365). #6 + #7 + #8 you already have.
4. **Confirm Wed 14:00 UTC retargeting report arrives + looks correct** — reply to this email with screenshot or "looks good"
5. **Pick a priority for techcloudpro.com fixes:** SES DKIM cleanup (5 min) OR fingerprint-matching bug on `hot_leads` (1-2h debugging) OR Ahrefs critical errors (2 broken pages, ~15 min)

---

## Memories your Claude should load

Same list as the first email — particularly:
- `feedback_brandmonkz_operational_repo_is_seconf_branch` (BrandMonkz repo identity)
- `feedback_brandmonkz_sara_resend_shared_dont_break` (Sara dispatch protection)
- `feedback_sender_rotation_gmail_reputation_warmup` (per-recipient Gmail reputation)
- `reference_brandmonkz_deploy_must_ship_schema_prisma` (Prisma deploy gotcha)
- `reference_github_push_protection_blocks_newly_tracked_files_with_secrets` (today's lesson when adding /opt/ files to git)

---

Reply if anything's unclear. Reply to `sara@techcloudpro.com` and the mail-server rule auto-fans to both you + JM.

— JM (via Sara)
