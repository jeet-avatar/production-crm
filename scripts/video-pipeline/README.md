# TCP v6 Video Pipeline

Rebuilds the TCP retargeting video pipeline that was previously at `/tmp/tcp-video-template/` on a Mac and got wiped on reboot. This time it lives in version control.

## What it produces (per prospect)

1. A 46s personalized intent video (~3.5 MB mp4)
2. A 3-second inline GIF preview (~1 MB) for email embed
3. A landing page at `watch.techcloudpro.com/{slug}/` with the video + research block + 4 CTAs + tracking
4. An entry in the dist `tcp-v6-prospects.json` mapping so the CRM's 🟢 Ready to Send button surfaces the prospect

## Directory layout

```
scripts/video-pipeline/
├── README.md
├── .env.example            # required env vars (copy to .env, fill in)
├── .gitignore              # excludes output/, cache/, .env
├── scenes/                 # 6 scene HTML templates (Plus Jakarta Sans, TCP orange)
│   ├── scene1.html         # opener (3s)
│   ├── scene2a.html        # body beat 1: industry (10s)
│   ├── scene2b.html        # body beat 2: pain points (10s)
│   ├── scene2c.html        # body beat 3: TCP fit (10s)
│   ├── scene2d.html        # body beat 4: service lines (6s)
│   └── scene3.html         # closer (7s)
├── render-v6.sh            # HTML → PNG (headless Chrome) → mp4 (FFmpeg)
├── generate-segmented-narration.py  # ElevenLabs 6-segment voice
├── research-prospects.py            # Anthropic web_search prospect research
├── batch-ship-v6.py        # orchestrator (research → narrate → render → upload)
├── video-landing-template.html      # watch.tcp.com landing page template
├── cache/                  # narration mp3s, scene PNGs (gitignored)
└── output/                 # final mp4s, GIFs, rendered landing HTMLs (gitignored)
```

## One-time setup

```bash
cd scripts/video-pipeline/
cp .env.example .env       # then edit .env with real keys

# Verify toolchain
which ffmpeg                                                    # /opt/homebrew/bin/ffmpeg
ls -la "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
python3 -c "import requests, boto3, anthropic"                  # no errors
```

Required env vars (see `.env.example`):
- `ELEVENLABS_API_KEY` — voice synthesis (locked voice id `cjVigY5qzO86Huf0OWal`)
- `ANTHROPIC_API_KEY` — prospect research via web_search
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — S3 uploads
- `S3_VIDEO_BUCKET=brandmonkz-video-campaigns` (default)
- `S3_LANDING_BUCKET=watch.techcloudpro.com` (default)
- `MUSIC_BED_MP3` (optional) — path to ambient music track that gets mixed under voice

## How to add new prospects

**Step 1.** Drop the raw prospect list into `cache/prospects-raw.json`:
```json
[
  {"rank": 84, "firstName": "Jane", "lastName": "Doe", "email": "jane@acme.com",
   "domain": "acme.com", "companyName": "Acme Inc"},
  ...
]
```

**Step 2.** Run research (Anthropic web_search, ~3 min per prospect):
```bash
source .env
python3 research-prospects.py cache/prospects-raw.json cache/kits.json
```
This adds `industry`, `painPoints[]`, `tcpFit[]`, `whyThisHtml` per prospect.

**Step 3.** Ship the videos (~3-5 min per prospect, idempotent):
```bash
# ship just rank 84
python3 batch-ship-v6.py cache/kits.json 84 84

# or ship ranks 84-90 in a batch
python3 batch-ship-v6.py cache/kits.json 84 90

# or dry-run first to check rendering without S3 uploads
DRY_RUN=1 python3 batch-ship-v6.py cache/kits.json 84 84
```

This produces `tcp-v6-prospects.json` in this directory — a complete mapping of all shipped prospects (existing + new).

**Step 4.** Deploy the updated mapping to EC2:
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224
sudo chattr -i /var/www/crm-backend/dist/data/tcp-v6-prospects.json
# scp from your Mac to /tmp on EC2, then:
sudo cp /tmp/tcp-v6-prospects.json /var/www/crm-backend/dist/data/
sudo chattr +i /var/www/crm-backend/dist/data/tcp-v6-prospects.json
pm2 restart crm-backend
pm2 logs crm-backend --lines 10 | grep "Loaded.*TCP v6"
# expect: "[follow-ups] Loaded N TCP v6 prospect kits" with N = your new count
```

The new prospects will now show the 🟢 Ready to Send button in the BrandMonkz CRM's Follow-Ups tab.

## Design decisions baked in

These are the lessons from the original (wiped) build, baked into this version:

- **Pure inline CSS in scene HTML, no Tailwind CDN.** The CDN-fetch race condition broke v1's scene 1 + 2 in headless Chrome.
- **`export VAR="${VAR:-default}"` in bash, not `: ${VAR:=default}`.** The latter doesn't export to python subprocess.
- **No apostrophes in bash defaults.** They break parsing. Use "we are" not "we're".
- **Logo prefetched via Google S2 favicon API → base64 data URL.** Clearbit's free tier is dead.
- **6 separate scene HTMLs, each rendered independently.** FFmpeg crossfades the resulting PNGs. No in-scene animation — too brittle.
- **Voice timing matches scene timing.** Narration is 6 segments, each placed at its scene's start offset, with silence between. See `SCENE_OFFSETS_S` in `generate-segmented-narration.py`.
- **Voice id locked to `cjVigY5qzO86Huf0OWal`.** Consistent across all 83+ existing renders. Changing it = brand fragmentation.
- **Caching everywhere.** Narration mp3s, scene PNGs, and final mp4s all cache in `cache/` and `output/`. Re-running ships only what's missing — safe for partial-batch failures.

## Trust & Authority design pattern

The visual style is the "Trust & Authority" pattern (verified via `ui-ux-pro-max` skill in the original session):
- Plus Jakarta Sans typography (700-800 weight for headlines, 500-600 for body)
- Slate-50 background (`#F8FAFC`) for body scenes, slate-900 (`#0F172A`) for closer
- TCP orange anchor (`#F97316` / `#FB923C`), used sparingly for accents
- Subtle radial gradients in corners (no harsh banding)
- Plenty of whitespace (88px side padding)
- One subtle box-shadow on cards (`0 1px 3px rgba(15,23,42,0.04)`)
- **Anti-pattern (avoid):** AI purple/pink gradients, busy gradients, neon colors

## When to NOT use this pipeline

- For non-NetSuite prospects — the message is locked on NetSuite + AI partner positioning
- For prospects who haven't shown engagement (clicks) on prior emails — they get the older Follow Up wizard instead
- For prospects who already received a v6 email recently — check `email_logs.suspectedForwards` first
- For prospects in regulated industries where personalized AI-generated content might trigger compliance review

## Wave 5 follow-ups (not done yet)

- Move secrets from `.env` → AWS Secrets Manager
- Add a `POST /api/admin/render-prospect` endpoint on the CRM backend so Rajesh can trigger a render from the UI (instead of running this CLI)
- Add a Lambda / Modal wrapper so renders can run server-side without tying up a developer Mac
- Wire the inline-GIF preview into the email template (currently hosted via S3, could be base64-inlined for better email-client support)

See also: `crm-pipeline/tcp-retargeting/PHASE-PLAN.md` (in this repo).
