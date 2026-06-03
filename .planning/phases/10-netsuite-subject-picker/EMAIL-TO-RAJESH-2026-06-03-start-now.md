**To:** rajesh@techcloudpro.com
**From:** Sara <sara@techcloudpro.com>
**Subject:** Repo is clean + everything live — start working now (3 steps)

Rajesh,

5th email. Repo is fully committed + pushed. Everything you need is on `seconf`. Start with these 3 steps.

## 1. Pull the repo (~30s)

```bash
# If first time:
git clone https://github.com/jeet-avatar/production-crm.git ~/production-crm
cd ~/production-crm
git checkout seconf

# If you already cloned:
cd ~/production-crm
git checkout seconf
git pull origin seconf
```

DO NOT use `~/Documents/CRM Module/` — that's the older orange-brand pre-Indigo Noir codebase. NOT operational.

## 2. Open Claude Code in that dir + paste bootstrap prompt

```bash
cd ~/production-crm
claude  # or open VSCode and use Claude Code extension
```

In Claude, paste the BOOTSTRAP PROMPT from email #4 ("Phase 09 live — copy-paste this prompt"). It's stored in repo at:

```
.planning/phases/09-resume-feature/EMAIL-TO-RAJESH-2026-06-03-phase09-bootstrap.md
```

Open it, copy everything between the `=== BrandMonkz CRM ... Operational Bootstrap ===` and `=== END BOOTSTRAP ===` markers, paste as your FIRST message to Claude. Your Claude immediately has the same operational context I had today.

## 3. Try a campaign in the UI to confirm

Visit `https://brandmonkz.com/campaigns` and click any of the 4 buttons:

| Button | What you'll see (post-Phase 04-10 today) |
|---|---|
| **Send arthaBuild Campaign** | Wizard auto-loads ICP preset (NetSuite Admin/Dev titles, US+Canada). AI Personalize Preview block. Send Now/5/10 min. Resume chip hides already-sent contacts. |
| **Apollo Campaign** | Same wizard, lets you pick a stream. AI Personalize Preview. Schedule picker. Resume chip. |
| **Send NetSuite Campaign** | NEW: dropdown with 9 subject options (5 hardcoded + 4 DB-rich-body ones with ARIA/Sara/unsubscribe). Pick + schedule. Resume chip. |
| Create Campaign | Original generic flow — full template picker (all 87 templates) + throttled send pacing. |

All 4 paths send via Sara@techcloudpro.com (via Resend). Resume feature: "Hiding N already-sent" chip at top of contact list hides anyone who already received any prior campaign.

## What shipped today (6 phases, all live)

| # | What | Surface |
|---|---|---|
| 04 | Apollo Campaign Port — /apollo page + Apollo Campaign button + AI Personalize + 9 stream templates + scheduledDispatcher | brandmonkz.com |
| 05 | TCP retargeting morning/evening reports — fixed PETER→Sara hardcode + UNION'd BrandMonkz click events (was stuck at 2 prospects, now 22 with Apollo company enrichment) | rajesh@ + jm@ inbox, fires 14:00 + 02:00 UTC |
| 07 | TCP daily report — same PETER→Sara fix (1→19 campaigns) + Twilio env-var migration + restored missing kits JSON | rajesh@ + jm@ inbox, fires 02:30 UTC |
| 08 | arthaBuild Campaign — 4th wizard button + 10th Stream:ArthaBuild template + ICP preset for NetSuite admin/dev titles | brandmonkz.com /campaigns |
| 09 | Resume feature — sent badges + "Hiding N already-sent" chip restored across all 3 wizard modes | brandmonkz.com /campaigns wizard |
| 10 | NetSuite picker — 9 subject options (5 hardcoded + 4 DB-rich-body, all visible in dropdown) | brandmonkz.com /campaigns NetSuite mode wizard |

## Repo status (as of this email)

- Branch: `seconf` (operational)
- Latest commit: `c3d9932 docs(10): Phase 10 NetSuite subject picker — RESEARCH + verification trail`
- All commits pushed to origin
- 11 phase planning artifacts in `.planning/phases/`
- 5 emails to you in `.planning/phases/04-apollo-campaign-port/` + `.planning/phases/09-resume-feature/` + `.planning/phases/10-netsuite-subject-picker/`

## Rollback if anything goes sideways

All 6 phase deploys have snapshots on EC2 at `/tmp/pre-phase*-redeploy.tar.gz`:

```bash
# Phase 10 (latest)
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  'sudo tar -xzf /tmp/pre-phase10-redeploy.tar.gz -C / && cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env'

# Earlier phases:
# pre-phase09-redeploy.tar.gz (Phase 09 — frontend-only)
# pre-phase08-redeploy.tar.gz (Phase 08)
# pre-apollo-port-redeploy.tar.gz (Phase 04)
# pre-phase07-redeploy.tar.gz (Phase 07)
```

## Open items (in your court)

1. **Rotate Twilio + Ahrefs keys** — both landed in JM's chat transcript today. Twilio console → API keys → revoke `SKbac86502...` + regenerate + update `/var/www/crm-backend/.env`. Ahrefs API tokens → revoke + regenerate.
2. **Validate Wed 14:00 UTC retargeting report email** — should land in your inbox with 22 prospects + Apollo enrichment + clean Sara/Peter labels. Reply "looks good" or "this section looks off".
3. **Visitor-ID tool decision** for Section 3 of retargeting report (anonymous companies) — Leadfeeder ($99/mo) / RB2B ($199/mo) / Albacross — pick one.
4. **Optional Phase 11:** import TCP v6 retargeting template (the one used by video-generator pm2 with ARIA + Sara + unsubscribe) into BrandMonkz DB + wizard so it's pickable too. Currently lives only on disk at CRM Module/crm-pipeline/tcp-retargeting/templates/tcp-v6-email-template.html — deferred per your earlier "smallest scope" call.

Reply to sara@techcloudpro.com — auto-fans to JM + you.

— JM (via Sara)
