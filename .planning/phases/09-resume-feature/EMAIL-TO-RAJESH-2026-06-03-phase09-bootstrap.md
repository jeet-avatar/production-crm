**To:** rajesh@techcloudpro.com
**From:** Sara <sara@techcloudpro.com>
**Subject:** Phase 09 live — resume feature restored + copy-paste this prompt into Claude tomorrow to continue from where I left off

Hey Rajesh,

4th email today. Two things below:

1. **Status update on Phase 09** — the "where I left off" resume feature you mentioned was missing. Restored without breaking Apollo.
2. **BOOTSTRAP PROMPT** at the end of this email — copy-paste it into a fresh Claude Code session and your Claude immediately has the same operational context I do. You can continue from where I left off tonight.

---

## Phase 09 — Resume feature restored

You flagged that the "pick up where I left off after the last batch" feature for bulk sends was missing on the new wizards. Found it — it was dropped in commit `86fc81d` (the 04-03 lean wizard rewrite). The feature still exists in CampaignWizard.tsx (the "Create Campaign" button's flow); just got dropped from NetSuiteCampaignWizard.tsx (the wizard that Apollo / NetSuite / arthaBuild buttons all share).

Fixed in Phase 09 commit `c484f25`, deployed to brandmonkz.com (asset hash `index-azN6tI7N.js`).

### What you'll see when you open any wizard now

Open `/campaigns` → click **Send NetSuite Campaign** (or Apollo Campaign / Send arthaBuild Campaign — same behavior):

| Step | New behavior |
|---|---|
| 1 | Wizard silently fetches `/api/campaigns/sent-contact-ids` on mount. Lists how many contacts have prior sends. |
| 1 | At top of contact list: purple chip `✓ Hiding N already-sent` (default ON). Already-sent contacts hidden by default. |
| 1 | Per-contact row: small purple "**Sent**" badge if that contact has any prior send |
| 1 | Toggle the chip OFF → chip says "Show all", already-sent contacts re-appear with the badge |
| 1 | Manual checkbox selection still works on any contact (sent or not). The chip filters DISPLAY only, never SELECTION. |
| 2 (Apollo/arthaBuild) | AI Personalize Preview block — unchanged |
| 2 / 1 | Send Now / Send in 5 min / Send in 10 min schedule picker — unchanged |
| 3 | Done confirmation — unchanged |

### Your 21000-contact workflow now

- Open wizard
- 19,700 prior sends auto-hidden behind the chip → you immediately see the ~1,300 unsent
- Select your batch → send via Send Now / 5 / 10 min
- Re-open wizard tomorrow → those just-sent now also hidden → fresh batch visible
- No more manual "I was on page 197" tracking

### Apollo / NetSuite / arthaBuild dispatch — UNCHANGED

This was the binding constraint. All dispatch paths preserved exactly:
- `apolloApi.sendCampaign(contactIds, stream)` — apollo + arthabuild modes
- `apolloApi.sendPersonalizedCampaign(...)` — AI-personalized sends
- `/api/campaigns/quick-send` — NetSuite mode
- Sara `APOLLO_FROM_EMAIL` constant — backend untouched

Verified via 9 regression gates (all baseline counts preserved exactly):
- Apollo dispatch refs: 6 → 6
- sendPersonalizedCampaign: 14 → 14
- Schedule picker labels: 8 → 8
- ICP preset / ARTHABUILD: 6 → 6
- All 4 buttons present: Send arthaBuild × 1, Apollo × 3, Send NetSuite × 3, Create × 4
- video-generator pm2 (Sara TCP retargeting): 8D uptime continuous, 0 restarts

### Rollback (if you ever need it)

```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  'sudo tar -xzf /tmp/pre-phase09-redeploy.tar.gz -C /'
```
~5 seconds, nginx serves the prior asset hash automatically.

---

## All 5 phases shipped today (recap)

| Phase | What | Status |
|---|---|---|
| 04 (Apollo Campaign Port) | New /apollo page, Apollo Campaign button, AI Personalize, 9 stream-coherent templates, scheduled dispatcher | ✅ live |
| 05 (TCP retargeting report) | PETER→Sara fix, BM UNION (2→22 prospects), Apollo company enrichment | ✅ live, next fire Wed 14:00 UTC |
| 07 (TCP daily report) | PETER→Sara fix (1→19 campaigns), Twilio env-var migration, kits-file restored | ✅ live, next fire Thu 02:30 UTC |
| 08 (arthaBuild Campaign) | New "Send arthaBuild Campaign" button, 10th Stream:ArthaBuild template, ICP preset | ✅ live |
| 09 (Resume feature) | Sent badges + "Hiding N already-sent" chip restored in NetSuiteCampaignWizard | ✅ live |

---

## ⬇️ COPY-PASTE THIS INTO YOUR CLAUDE CODE SESSION TOMORROW ⬇️

(Everything below the line is one self-contained prompt. Paste it as your FIRST message to a fresh Claude session — Claude will have full operational context to continue work.)

```
=== BrandMonkz CRM + TechCloudPro Operational Bootstrap (2026-06-03) ===

I am Rajesh, continuing work that JM (Jeet) shipped on 2026-06-03. You are taking
over context for the BrandMonkz CRM + TCP retargeting + arthaBuild marketing stack.

## Project roots

| Repo | Local path | Branch | Purpose |
|---|---|---|---|
| github.com/jeet-avatar/production-crm | ~/production-crm | seconf | Operational BrandMonkz CRM (brandmonkz.com) |
| github.com/jeet-avatar/arthabuild | ~/arthaBuild | (main) | arthaBuild product (artha.build landing page) |
| github.com/jeet-avatar/arthabuild | ~/arthabuild-launch-video | (main) | Launch video assets (Remotion) |

First step: `cd ~/production-crm && git checkout seconf && git pull origin seconf`. If
~/production-crm doesn't exist, clone:
`git clone https://github.com/jeet-avatar/production-crm.git ~/production-crm && cd ~/production-crm && git checkout seconf`.

DO NOT use ~/Documents/CRM Module/ — that's the OLDER orange-brand pre-Indigo Noir
codebase and is NOT operational.

## Operational state as of 2026-06-03 evening UTC

| Service | Status |
|---|---|
| brandmonkz.com frontend | live, asset index-azN6tI7N.js (after Phase 09 deploy) |
| brandmonkz.com backend | pm2 crm-backend online on EC2 100.24.213.224 |
| /opt/tcp-retargeting-report (morning + evening fires) | live, Phase 05 deployed, next fire Wed 2026-06-04 14:00 UTC |
| /opt/tcp-daily-report (02:30 UTC fire) | live, Phase 07 deployed, next fire Thu 2026-06-04 02:30 UTC |
| video-generator pm2 (Sara TCP retargeting) | online, 8D uptime continuous, 0 restarts — DO NOT TOUCH |
| Sara on Resend (sara@techcloudpro.com) | working broadly (343 clicks + 180 opens last 7d) |
| Apollo Campaign + arthaBuild Campaign | both live on /campaigns header |
| Resume feature (sent badges + "Hiding N already-sent" chip) | live in NetSuiteCampaignWizard for all 3 modes (NetSuite + Apollo + arthaBuild) |

## Recent commits (top of seconf)

```
3b9ef8f docs(08, 09): Phase 08 + 09 planning + Rajesh email archives
c484f25 feat(09-01): restore sent-tracking in NetSuiteCampaignWizard — resume feature
8699ae4 feat(08-02): Send arthaBuild Campaign button + wizard arthabuild mode
dbc6325 feat(08-01): ArthaBuild marketing template + Apollo ICP preset
c61c177 feat(07): tcp-daily-report — PETER→SENDERS + Twilio env vars + label polish
3b9ef8f...ae4ff20 Phase 04-08 planning artifacts
f1cd352 fix(05): drop dev jargon from Section 4 user-visible text
d1fa6f1 feat(05): TCP daily report — PETER→SENDERS + BM UNION + Apollo enrich
9f4ee0e + 11fbf13 + 86fc81d + 6080242 + 71a0b08 + a444016 + 58ea813 = Phase 04 Apollo Campaign Port
```

## Hard constraints YOU MUST RESPECT

1. **Sara protection** — `APOLLO_FROM_EMAIL = 'Sara <sara@techcloudpro.com>'` is hardcoded in
   backend/src/routes/apollo.ts and backend/src/services/scheduledDispatcher.ts. Never modify.
   Sara is shared between Apollo Campaign + video-generator TCP retargeting; breaking it
   silently affects 343+ ongoing clicks/opens per week.
2. **Don't break Apollo** when modifying NetSuiteCampaignWizard.tsx — all 3 modes
   (netsuite / apollo / arthabuild) share that file. Verification: baseline grep counts
   for `apolloApi.sendCampaign`, `sendPersonalizedCampaign`, schedule picker labels,
   ICP preset refs must match before+after.
3. **Deploy approval gate** — never deploy to /var/www/ on EC2 without explicit user
   approval. Always do dry-run first, present visual sign-off, wait for "deploy" reply.
4. **GitHub Push Protection** — scans ALL commits in a push for secrets. When first-
   tracking a file from /opt/ or /var/www/, grep for hardcoded API keys + move to env
   vars BEFORE first commit. If push rejected: git reset origin/branch + single clean
   commit with env-var version.
5. **scp prisma/schema.prisma BEFORE prisma generate on EC2** — otherwise client
   regenerates against old schema and new-field queries throw PrismaClientValidationError.

## Files to @-mention in your Claude session for operational context

The 3 primer emails are in the repo (under .planning/phases/04-apollo-campaign-port/).
Type these in your Claude prompt:

  @.planning/phases/04-apollo-campaign-port/EMAIL-TO-RAJESH-2026-06-03.md
  @.planning/phases/04-apollo-campaign-port/EMAIL-TO-RAJESH-2026-06-03-tcp-infra.md
  @.planning/phases/09-resume-feature/EMAIL-TO-RAJESH-2026-06-03-phase09-bootstrap.md

Plus the Phase 04 verification trail:

  @.planning/phases/04-apollo-campaign-port/04-VERIFICATION.md
  @.planning/phases/04-apollo-campaign-port/04-07-SIGNOFF.md

## Common things you'll do

| Task | How |
|---|---|
| Send an Apollo Campaign | brandmonkz.com → /campaigns → click Apollo Campaign → pick stream + contacts → Step 2 generate AI Preview → Send Now/5/10 min |
| Send an arthaBuild Campaign | brandmonkz.com → /campaigns → click "Send arthaBuild Campaign" (leftmost) → ICP preset auto-loads → Step 2 AI Preview → Send |
| See the daily report | Check your inbox at 02:30 UTC + 14:00 UTC + 02:00 UTC for HTML emails from JM |
| Find what changed | `cd ~/production-crm && git log --since="1 week ago" --oneline` |
| Verify what's live on brandmonkz.com | curl -sS -H "User-Agent: Mozilla/5.0" https://brandmonkz.com/ \| grep -oE "index-[A-Za-z0-9_-]+\.js" |
| Rollback last deploy | ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 'sudo tar -xzf /tmp/pre-phase09-redeploy.tar.gz -C /' |

## Open items waiting for decisions

1. Rotate Twilio + Ahrefs keys (exposed in JM's chat transcript today)
   - Twilio: Console → API Keys → revoke SKbac86502... + create new → update /var/www/crm-backend/.env on EC2
   - Ahrefs: API tokens → revoke + regenerate (Trial tier, low impact)
2. Visitor-identification tool for Section 3 of retargeting report (anonymous companies):
   Leadfeeder ($99/mo) / RB2B ($199/mo) / Albacross — pick one
3. Phase 06 GSC integration paused — needs Google Cloud service account setup
   (10 min in console.cloud.google.com → enable Search Console API → create service
   account → add as user in Search Console for techcloudpro.com)
4. Validate Wed 14:00 UTC retargeting report email lands correctly with the new
   format (22 prospects, Apollo enrichment, Sara/Peter coverage). If it does not
   land or looks off, rollback command above + tell me.

## Memories your Claude should reference if asked

These are saved in JM's Claude memory system (not transferable to your session, but
the patterns matter):

- BrandMonkz operational repo = production-crm seconf branch (NOT CRM Module, NOT
  production branch)
- Sara on Resend is shared between video-generator + crm-backend pm2 — preserve
  APOLLO_FROM_EMAIL constant
- Gmail tracks reputation per FROM address — new senders may hit spam, recipient
  marks "Not Spam" to reset
- BrandMonkz deploys must include backend/prisma/schema.prisma in rsync target,
  otherwise on-EC2 prisma generate uses old schema
- GitHub Push Protection blocks commits with hardcoded secrets — squash + use env
  vars before push

I have full context to continue work. What would you like me to do first?

=== END BOOTSTRAP ===
```

---

Reply to sara@techcloudpro.com — auto-fans to JM + you. Talk tomorrow.

— JM (via Sara)
