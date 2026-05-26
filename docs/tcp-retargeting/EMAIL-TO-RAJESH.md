# Email to Rajesh — draft for JM to send

**To:** rajesh@techcloudpro.com
**From:** jm@techcloudpro.com
**Subject:** TCP v6 retargeting is back online + handbook for you

---

Rajesh,

The TCP v6 retargeting system is back online. The 🟢 Ready to Send button on `brandmonkz.com/reports` → Follow-Ups tab works again. Verified end-to-end today: I fired a test send through the route, Resend accepted it, and the email arrived in my gmail. v6 send count is now 100.

**Read this first:** `https://github.com/jeet-avatar/crm-email-marketing-platform/blob/main/crm-pipeline/tcp-retargeting/RAJESH-HANDBOOK.md` — single doc that covers every operational thing you need.

**Get set up in ~10 minutes:**

1. Read `CREDENTIALS-FOR-RAJESH.md` (same folder) — lists the 5 secrets I'll share via 1Password
2. Once you have my 1Password invite (sending separately), run:
   ```bash
   mkdir -p ~/code && cd ~/code
   git clone https://github.com/jeet-avatar/production-crm.git
   cd production-crm && git checkout production
   cd scripts/video-pipeline
   cp .env.example .env  &&  edit .env  &&  chmod 600 .env
   ./setup-rajesh.sh
   ```
3. The bootstrap script verifies your Mac toolchain + every credential + does an Apollo dry-run. It exits clean when you're ready, or fails loud telling you exactly what to fix.

**Two things that need YOUR action:**

1. **Apollo key in `.env` is invalid** (verified — returns "Invalid access credentials"). Log into `app.apollo.io` → Settings → Integrations → API → generate a real key. Send it to me via 1Password; I'll update the EC2 env and verify the importer works. Without this, the Apollo prospect-importer can't run, but everything else (existing 84 prospects, send button, render pipeline) is fine.

2. **The daily report's "Identified prospects" has been stuck at 2** (Keith Vanwey + Andrew McGroarty) for 14 days. It's not a bug in the report — it's that TCP's `hot_leads` table on Hostinger only has those 2 form-fills. Fix recipe in Section 5 of the handbook: expand the data source to include BrandMonkz email-click prospects. I'll schedule that fix for the next clean-up session.

**One thing I already fixed today:** the Anthropic key in EC2 `.env` previously belonged to a Dollor.ai workspace which ran out of credits. I generated a fresh key in the TechCloudPro Anthropic workspace and swapped it in. From now on, all pipeline research charges TCP's account directly — clean separation from Dollor.ai's billing. Verified working from both my Mac and EC2.

**Heads up — there was a brief outage today.** During the cleanup work I tried to do a full `npm install + npm run build` directly on the 4GB EC2 to deploy the v6 route the right way. It OOM'd and SSH became unresponsive. brandmonkz.com was down for ~10 minutes between 17:18-17:30 PT (May 26 ~05:48-06:00 IST). Recovered via stop+start of the EC2. Elastic IP preserved. No data lost. The S3-hosted landing pages stayed up the whole time. Sorry about that — won't happen again, lessons captured in `WAVE-3-4-RESULTS.md`.

**One side fix shipped today (you'll want to know about):** every TCP v6 retargeting email's "Unsubscribe" link was previously pointing to a 404 page (`brandmonkz.com/unsubscribe` doesn't exist; the real route is `/api/unsubscribe/...`). That's a CAN-SPAM Act risk and it affected the 99 sends made before today. New sends generate working per-recipient unsubscribe URLs. Worth knowing if any of those 99 recipients try to unsubscribe and complain — the fix is now live.

**What works without any action from you:**
- The 84 existing prospect kits, the Follow-Ups tab, all baseline tracking, regular campaigns
- Adding new prospects via the rebuilt pipeline (see Handbook Section 4)
- Sending retargeting from existing kits

**Quick sanity check:** can you open `https://brandmonkz.com/reports` → Follow-Ups tab and confirm you see both 🟠 Follow Up AND 🟢 Ready to Send buttons on the v6-eligible rows? If yes, the system is operating correctly. If you only see orange, ping me — could be a JWT / role thing.

When you have time for a 30-min call this week to walk through the handbook + agree on ICP definition for Apollo, I'll set it up.

— JM

---

*Draft committed to `crm-pipeline/tcp-retargeting/EMAIL-TO-RAJESH.md`. Edit as needed; send via Slack DM or email when ready.*
