# TCP v6 Retargeting Pipeline

Branded video retargeting campaign for TechCloudPro. Each prospect gets a personalized ~46s video at `watch.techcloudpro.com/{slug}/`, an inline GIF preview in the email, and tracking via BrandMonkz CRM.

This directory holds the **BrandMonkz-side** of the pipeline: the route handler that wires up the Ready-to-Send button, the prospect mapping, and the email template. The **video-rendering** side (Anthropic research + ElevenLabs narration + headless-Chrome scene capture + FFmpeg stitch) is not yet in version control — see `Pipeline gaps` below.

## Directory layout

```
crm-pipeline/tcp-retargeting/
├── README.md                          # this file
├── data/
│   └── tcp-v6-prospects.json          # 83 prospect kits (email → slug/urls/copy)
├── routes/
│   └── followUps.js                   # Express route — /api/follow-ups/top + /send-video
├── templates/
│   └── tcp-v6-email-template.html     # email body with {{placeholders}}
└── archive/
    └── tcp-v6-prospects-bak-may17.json # snapshot from May 17 backup dir
```

## Required environment variables

| Var | Used by | Source of truth |
|---|---|---|
| `RESEND_API_KEY` | `routes/followUps.js` `/send-video` | Resend dashboard, owns techcloudpro.com domain |
| `DATABASE_URL` | `routes/followUps.js` (Prisma) | EC2 env, existing CRM Postgres |

The route fails fast if `RESEND_API_KEY` is missing — no hardcoded fallback (was stripped during retrieval, May 25 2026).

## Where the live assets live

| Asset | Location |
|---|---|
| 107 prospect landing pages | `s3://watch.techcloudpro.com/{slug}/index.html` — proxied by Cloudflare CNAME |
| ~50+ rendered MP4s | `s3://brandmonkz-video-campaigns/tcp-v6-{slug}-2026-04-27.mp4` |
| ~50+ inline GIFs | `s3://brandmonkz-video-campaigns/tcp-v6-{slug}-inline-2026-04-27.gif` |
| Domain | `https://watch.techcloudpro.com` (Cloudflare → S3 website, SSL = Flexible) |
| Sender | `peter@techcloudpro.com` via Resend |
| Tracking pixel | `https://brandmonkz.com/api/tracking/open/{trackingId}` |
| Visit tracking | `POST https://brandmonkz.com/api/track/visit` |
| Campaign ID | `cmot17773423143549` ("TCP v6 Retargeting Videos") |

## How the Ready-to-Send flow works

1. Operator opens `https://brandmonkz.com/reports` → Follow-Ups tab
2. Backend `GET /api/follow-ups/top` queries `email_logs` aggregated by contact, enriches each row with `videoReady: true` + `video: {slug, watchUrl, gifUrl, industry}` if a prospect kit exists for that email
3. Frontend renders 🟢 **Ready to Send** button for rows with `videoReady === true`
4. Click → `POST /api/follow-ups/send-video {contactId, recipientOverride?}` → renders the email template with the prospect-specific placeholders → Resend send from `peter@techcloudpro.com` → pre-registers an `email_logs` row tagged with `campaignId = cmot17773423143549`

Replies route back to `peter@techcloudpro.com`. Mail-server forwarding rule auto-forwards every incoming message to `rajesh@techcloudpro.com` and `jm@techcloudpro.com`. **No IMAP poller, no inbound webhook — this is by design.**

## Prospect schema

Each entry in `data/tcp-v6-prospects.json` is keyed by lowercased email and has:

```json
{
  "firstName": "Logan",
  "lastName": "Macy",
  "companyName": "REAL Solutions Group",
  "slug": "real-solutions",
  "outputName": "tcp-v6-real-solutions",
  "watchUrl": "https://watch.techcloudpro.com/real-solutions/",
  "gifUrl": "https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/tcp-v6-real-solutions-inline-2026-04-27.gif",
  "videoUrl": "https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/tcp-v6-real-solutions-2026-04-27.mp4",
  "industry": "Pharmaceutical regulatory compliance consulting",
  "painPoints": ["..."],
  "tcpFit": ["..."],
  "whyThisHtml": "<rendered HTML block>"
}
```

## Pipeline gaps (what's NOT in this directory yet)

The video-rendering side existed only on a Mac at `/tmp/tcp-video-template/` and was wiped. Not retrievable from EC2 — never deployed there. To render new prospects right now, the scripts must be rebuilt from the Apr 28 handoff at `~/.claude/handoffs/2026-04-28-tcp-v6-retargeting-batch-shipped.md`.

Specifically missing from this repo:

- `scenes/scene{1,2a,2b,2c,2d,3}.html` — 6-scene HTML templates with inline CSS
- `render-v6.sh` — bash driver that prefetches logo, renders each scene via headless Chrome, FFmpeg-stitches
- `batch-ship-v6.py` — orchestrator: research → narrate → render → GIF → landing → DB row → Resend send
- `research-prospects.py` — Anthropic `web_search` loop
- `generate-segmented-narration.py` — ElevenLabs 6-segment narrator
- `music-eleven-tech.mp3` — shared music bed (reusable across all prospects, lives on S3)
- `video-landing-template.html` — landing-page template (rendered per slug, uploaded to S3)

Rebuilding these is a separate phase (see "Next steps" below).

## Production status (as of May 25, 2026)

⚠️ **The 🟢 Ready to Send button is broken in production.** Both `GET /api/follow-ups/top` and `POST /api/follow-ups/send-video` return 404 since the May 21 redeploy.

⚠️ **Naive restore is unsafe.** The CRM deployment system has accumulated structural debt: two divergent GitHub repos (`crm-email-marketing-platform` here, vs `production-crm` on EC2), three `src/` trees in the EC2 repo, no clean reproducible build, no secrets management. Hot-patching `dist/` only breaks again on the next deploy.

**See `PHASE-PLAN.md`** in this directory for the full findings and the phased plan to fix this properly. Resume that phase when you have 4-8 hours for a focused session.

## How to add a new prospect (current process)

Until the renderer is rebuilt, this is a manual loop:

1. **Research** the prospect company (industry, HQ, size, pain points, TCP fit) — Anthropic web_search or manual.
2. **Render the video** on a Mac with the legacy `/tmp/tcp-video-template/` pipeline (currently broken — needs rebuild).
3. **Upload assets to S3:**
   - `s3://brandmonkz-video-campaigns/tcp-v6-{slug}-2026-04-27.mp4`
   - `s3://brandmonkz-video-campaigns/tcp-v6-{slug}-inline-2026-04-27.gif`
   - `s3://watch.techcloudpro.com/{slug}/index.html`
4. **Add an entry** to `data/tcp-v6-prospects.json` keyed by the lowercase email, matching the schema above.
5. **Deploy** the updated JSON to EC2 at `/var/www/crm-backend/dist/data/tcp-v6-prospects.json` and `pm2 restart crm-backend`.
6. **Verify** the prospect appears in the Follow-Ups tab with a 🟢 button.

## Next steps (not yet done)

This commit captures Step 1 of a larger refactor:

| Step | Status |
|---|---|
| 1. Retrieve pipeline source from EC2 + commit to git | ✅ This commit |
| 2. Restore `followUps.js` to live `dist/routes/` so the button works again | ⏳ |
| 3. Move secrets (`RESEND_API_KEY`) into AWS Secrets Manager + wire EC2 IAM role | ⏳ |
| 4. Rebuild the rendering pipeline (scene HTML, render-v6.sh, batch-ship-v6.py) and host it on EC2 with a `POST /api/admin/render-prospect` endpoint | ⏳ |
| 5. Build the BrandMonkz CRM admin UI at `/reports/tcp-retargeting` (Add prospect → render → preview → enable Ready-to-Send) + embedded SOP doc for Rajesh | ⏳ |
| 6. Hand-off note to Rajesh with the URL | ⏳ |

## References

- Apr 26 handoff (v1-v5 pipeline + design decisions): `~/.claude/handoffs/2026-04-26-tcp-retargeting-video-pipeline.md`
- Apr 28 handoff (v6 batch shipped, 10 prospects, full architecture): `~/.claude/handoffs/2026-04-28-tcp-v6-retargeting-batch-shipped.md`
- Apr 29 handoff (bot-filter + CloudWatch + later prospect expansion context): `~/.claude/handoffs/2026-04-29-tcp-v6-retargeting-bot-filter-v3-and-cf-watch-broken.md`
- BrandMonkz CRM deploy rule: rsync to `/var/www/crm-backend/dist/` (NOT `…/backend/dist/`) then `pm2 restart crm-backend`. See `MEMORY.md` entry "BrandMonkz CRM deploy = /var/www/crm-backend/dist/".
