# Rajesh — TCP v6 Retargeting Laptop Setup

**Audience:** Rajesh (rajesh@techcloudpro.com)
**Goal:** Get your Mac to the same working state as JM's so you can run the full TCP v6 retargeting pipeline (Apollo import → Anthropic research → ElevenLabs narration → FFmpeg render → S3 upload → EC2 mapping deploy).
**Time:** ~45 min if you already have Homebrew + Chrome; ~90 min from a clean Mac.
**Final test:** `./setup-rajesh.sh` exits with `✓ All checks passed.`

---

## 0. Quick map — what you're building

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────┐
│  Your Mac       │ →  │  Apollo /    │ →  │ ElevenLabs / │ →  │   S3    │
│  (CLI tools)    │     │  Anthropic   │     │  FFmpeg      │     │ + EC2   │
└─────────────────┘     └──────────────┘     └──────────────┘     └─────────┘
       ↑
   .env file with 5 keys + SSH key
```

You need: **(A)** the right OS + tools, **(B)** the repo, **(C)** the credentials, **(D)** the verifier passing.

---

## 1. Hardware + OS requirements

| Item | Requirement | Why |
|---|---|---|
| **Mac** | Apple Silicon (M1/M2/M3) or Intel | Pipeline is Mac-tested only. Linux works but Chrome path differs — don't try it. |
| **macOS** | Sonoma 14+ recommended (Ventura 13 works) | Homebrew + FFmpeg + Chrome all current. |
| **RAM** | 16 GB+ recommended | FFmpeg + Chrome + Python can use 4-6 GB during a render. |
| **Disk** | 10 GB free | Repo + cache + output videos (~50 MB per prospect kit) + Homebrew. |
| **Internet** | Stable broadband | ElevenLabs streams audio; S3 uploads ~5 MB per prospect. |

---

## 2. Install the toolchain

Run these in **Terminal.app**. Each step has a "verify" command — run it before moving to the next step.

### 2a. Homebrew (the package manager)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After install, follow the on-screen instruction to add Homebrew to your shell PATH (it prints two lines starting with `echo` and `eval`). Run them.

**Verify:**
```bash
brew --version
# Expect: Homebrew 4.x.x
```

### 2b. Git + GitHub CLI

```bash
brew install git gh
gh auth login    # Choose: GitHub.com → HTTPS → Login with browser
```

**Verify:**
```bash
git --version          # git version 2.x
gh auth status         # ✓ Logged in to github.com as <your-handle>
```

### 2c. Python 3.10+

```bash
brew install python@3.12
```

**Verify:**
```bash
python3 --version      # Python 3.12.x (or 3.10+/3.11+)
pip3 --version
```

### 2d. Python packages used by the pipeline

```bash
pip3 install --user requests boto3 anthropic
```

**Verify:**
```bash
python3 -c "import requests, boto3, anthropic; print('ok')"
# Expect: ok
```

### 2e. FFmpeg (video assembly + GIF generation)

```bash
brew install ffmpeg
```

**Verify:**
```bash
ffmpeg -version | head -1
# Expect: ffmpeg version 6.x or 7.x
```

### 2f. Google Chrome (headless render of scene HTML → PNG)

Install Chrome from https://www.google.com/chrome (NOT Chromium — the pipeline expects the exact bundle path).

**Verify:**
```bash
ls "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# Expect: the file exists (no error)
```

### 2g. AWS CLI (S3 uploads + the setup-rajesh.sh smoke test)

```bash
brew install awscli
```

**Verify:**
```bash
aws --version
# Expect: aws-cli/2.x or 1.42+ ... Darwin
```

### 2h. (Recommended) 1Password CLI for secret retrieval

If JM is going to drop credentials into a 1Password shared vault:

```bash
brew install --cask 1password 1password-cli
op signin    # follow prompts to link to your TechCloudPro account
```

### 2i. (Optional) jq for pretty-printing JSON during troubleshooting

```bash
brew install jq
```

---

## 3. Clone the repo

The single source of truth is `github.com/jeet-avatar/production-crm`, branch **`production`**. You do NOT need the `crm-email-marketing-platform` repo to run the pipeline — only to read the operator handbook.

```bash
mkdir -p ~/code
cd ~/code

# Pipeline repo (REQUIRED)
git clone https://github.com/jeet-avatar/production-crm.git
cd production-crm
git checkout production
cd scripts/video-pipeline

# Confirm you're in the right place
pwd
# Expect: /Users/<you>/code/production-crm/scripts/video-pipeline
ls
# Expect to see: render-v6.sh  batch-ship-v6.py  setup-rajesh.sh  scenes/  README.md
```

**Note:** `setup-rajesh.sh` defaults to `~/production-crm` (not `~/code/production-crm`). Either:
- Clone directly to `~/production-crm` instead (simpler), OR
- Export `PIPELINE_REPO_DIR=~/code/production-crm` before running the script

I recommend the first option:

```bash
# Cleaner — clone straight to ~/production-crm
cd ~
git clone https://github.com/jeet-avatar/production-crm.git
cd production-crm
git checkout production
cd scripts/video-pipeline
```

**Operator docs (`RAJESH-HANDBOOK.md` + the rest) now live next to the code:** `production-crm/docs/tcp-retargeting/`. Start at the [INDEX](../../docs/tcp-retargeting/INDEX.md). Public — no separate clone or invite needed.

---

## 4. Get the credentials from JM

These are **NOT in git** — JM has them. Ask him via 1Password / Signal / in-person. **Never plain email or Slack.**

| # | Secret | What it's for | Where JM gets it | Format |
|---|---|---|---|---|
| 1 | `ELEVENLABS_API_KEY` | Voice narration (locked voice id `cjVigY5qzO86Huf0OWal`) | `console.elevenlabs.io` → Profile → API Keys | `sk_...` 51 chars |
| 2 | `ANTHROPIC_API_KEY` | Prospect research via `web_search` (TCP workspace key, not Dollor.ai) | The key JM swapped in May 26 — `sk-ant-api03-VG4U2...IQAA` | `sk-ant-api03-...` 108 chars |
| 3 | `AWS_ACCESS_KEY_ID` | Upload to `brandmonkz-video-campaigns` + `watch.techcloudpro.com` S3 buckets | BrandMonkz AWS acct 134607809447, IAM user `CRMaccesskey` | `AKIA...` 20 chars |
| 4 | `AWS_SECRET_ACCESS_KEY` | Pair with #3 | Same IAM user | 40 chars random |
| 5 | `brandmonkz-crm.pem` | SSH to EC2 (deploy `tcp-v6-prospects.json` updates) | Hard copy from JM | private key file ~1.6 KB |

**Plus one you generate yourself:**

| # | Secret | How |
|---|---|---|
| 6 | `APOLLO_API_KEY` | Log into `app.apollo.io` as TCP account owner → Settings → Integrations → API → **Generate Key**. Share back with JM so the EC2 `.env` matches yours. |

### Why each one matters (in plain English)

- **ElevenLabs** — speaks the 6 scene narrations in Sara's locked voice. Without it: silent video.
- **Anthropic** — researches each prospect's company (industry, pain points, fit). Without it: can't make personalized kits.
- **AWS** — pushes the mp4, GIF preview, and landing-page HTML to S3 so the CRM email can link to them. Without it: kit renders locally but never reaches the recipient.
- **SSH key** — only needed if YOU (not JM) push the updated prospects mapping to EC2. Optional for read-only operation.
- **Apollo** — discovers NEW prospects matching ICP. Optional — you can also hand-paste prospects into `cache/prospects-raw.json`.

### How to receive the secrets safely

**Best (preferred):** JM shares a 1Password vault named "TCP Retargeting" with your `rajesh@techcloudpro.com` account. The vault holds all 5 secrets + the SSH key as an attachment. You access via 1Password app or CLI:

```bash
op vault item get "Anthropic API Key" --fields=password
op vault item get "AWS Access Key" --fields=username
op vault item get "AWS Access Key" --fields=password
# (etc.)
```

**Acceptable:** Signal disappearing message, 24-hour TTL. Copy into `.env` immediately, delete the message.

**Acceptable:** In-person screen-share or paper handoff.

**Never:** plain email, Slack DM, Notion, Google Docs, GitHub Issues. These are searchable/logged/backed-up.

---

## 5. Set up the `.env` file

```bash
cd ~/production-crm/scripts/video-pipeline
cp .env.example .env
chmod 600 .env          # owner-only read/write — important
$EDITOR .env            # or: nano .env, or: code .env
```

Paste your real values. The file should look like this (with REAL values where it says `<paste-here>`):

```bash
# TCP v6 video pipeline — required env vars

# ElevenLabs API key (voice + music generation)
ELEVENLABS_API_KEY=<paste real ElevenLabs key>
ELEVENLABS_VOICE_ID=cjVigY5qzO86Huf0OWal

# Anthropic API (web search for prospect research)
ANTHROPIC_API_KEY=<paste real Anthropic key from TCP workspace>

# AWS — for S3 uploads
AWS_ACCESS_KEY_ID=<paste AKIA... key>
AWS_SECRET_ACCESS_KEY=<paste 40-char secret>
AWS_REGION=us-east-1

# S3 buckets (already provisioned — don't change these)
S3_VIDEO_BUCKET=brandmonkz-video-campaigns
S3_LANDING_BUCKET=watch.techcloudpro.com

# Apollo (you generated this from app.apollo.io)
APOLLO_API_KEY=<paste your Apollo key>
```

**Sanity check the file:**

```bash
ls -la .env
# Expect: -rw-------  1 <you>  staff  ...  .env   (only owner perms!)

grep -c "REPLACE_ME" .env
# Expect: 0   (no unfilled placeholders)
```

---

## 6. Drop the SSH key into place

```bash
# Copy the brandmonkz-crm.pem JM gave you to ~/.ssh/
cp /path/to/where/jm/gave/it/brandmonkz-crm.pem ~/.ssh/
chmod 600 ~/.ssh/brandmonkz-crm.pem

# Quick test (should NOT prompt for password, should show EC2 hostname)
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 'hostname && uptime'
# Expect: ip-172-31-xx-xx + load averages
# Type 'yes' when asked to trust the host fingerprint (first time only)
```

If you see `Permission denied (publickey)`: the key file is wrong, perms aren't 600, or JM gave you the wrong file. Re-check with JM.

---

## 7. Configure AWS CLI (optional but recommended)

The `.env` file already has the AWS keys, but configuring the CLI lets you run `aws s3 ls` ad-hoc without exporting variables.

```bash
aws configure
# AWS Access Key ID:     <paste AKIA... key>
# AWS Secret Access Key: <paste 40-char secret>
# Default region name:   us-east-1
# Default output format: json
```

**Verify:**
```bash
aws s3 ls s3://brandmonkz-video-campaigns/ | head -5
# Expect: list of existing prospect videos (e.g., "PRE 0  .../jane-doe-acme/...")
```

---

## 8. Run the verifier

This is the single command that confirms your laptop is ready. It exits **0** (success) or non-zero with a clear error message telling you exactly what's missing.

```bash
cd ~/production-crm/scripts/video-pipeline
./setup-rajesh.sh
```

### What it checks (10 steps)

| Step | What it verifies |
|---|---|
| 1 | macOS (Darwin) |
| 2 | FFmpeg installed and on PATH |
| 3 | Google Chrome installed at `/Applications/Google Chrome.app/...` |
| 4 | Python 3.10+ |
| 5 | Python packages: `requests`, `boto3`, `anthropic` |
| 6 | `~/production-crm` repo exists, on branch `production` |
| 7 | `.env` exists with no REPLACE_ME placeholders |
| 8 | SSH key at `~/.ssh/brandmonkz-crm.pem` with mode 0600 |
| 9 | All 4 credentials work: ElevenLabs ping, Anthropic message, AWS S3 list, Apollo search |
| 10 | Pipeline dry-run (`apollo-import-prospects.py --dry-run --limit 3`) |

### Expected good output (tail)

```
══════════════════════════════════════════════════
✓ All checks passed. You can operate the pipeline.
══════════════════════════════════════════════════

ℹ Next steps:
ℹ   1. Add a real prospect to cache/prospects-raw.json
ℹ   2. python3 research-prospects.py cache/prospects-raw.json cache/kits.json
ℹ   3. python3 batch-ship-v6.py cache/kits.json
ℹ   4. Merge into EC2 prospects.json + pm2 restart (handbook Section 4)
```

### If something fails — diagnose by exit code

| Exit code | Meaning | Fix |
|---|---|---|
| **0** | All green | You're done with setup. Go to Section 9. |
| **1** | Missing tool or package | The script prints which one. Re-run Section 2 step. |
| **2** | Credential test failed | One of the 5 keys is wrong/expired. Re-check Section 4 with JM. |
| **3** | Repo clone failed | Check network + `gh auth status`. |

### Common failure: Apollo says "Invalid access credentials"

If everything else passes but Apollo fails with:

```
✗ Apollo: 'Invalid access credentials' — key in .env is bad
ℹ   Log into app.apollo.io → Settings → Integrations → API → Generate Key
```

That means your Apollo key is wrong/expired. **This is the ONLY acceptable single-failure to defer** — the rest of the pipeline still works without Apollo (you just can't auto-discover new prospects). Fix at your leisure:
1. Log into `app.apollo.io` as TCP account owner
2. Settings → Integrations → API → **Generate Key**
3. Paste into `.env`, share with JM
4. Re-run `./setup-rajesh.sh`

---

## 9. Smoke test the full pipeline (5-minute dry run)

Once the verifier passes, prove the end-to-end works WITHOUT spending real Apollo credits or sending any email:

```bash
cd ~/production-crm/scripts/video-pipeline

# 9a. Apollo discovery in dry-run mode (no credits spent)
python3 apollo-import-prospects.py --limit 3 --dry-run
# Expect: 3 prospects pretty-printed, no file written

# 9b. Hand-make a tiny test prospect (use YOUR own email so nothing real goes out)
cat > cache/prospects-raw.json <<'EOF'
[
  {
    "rank": 999,
    "firstName": "Rajesh",
    "lastName": "Test",
    "email": "rajesh@techcloudpro.com",
    "domain": "techcloudpro.com",
    "companyName": "TechCloudPro (test render)"
  }
]
EOF

# 9c. Research it (uses ~$0.05 Anthropic credit — takes ~3 min)
python3 research-prospects.py cache/prospects-raw.json cache/kits.json
# Expect: cache/kits.json file with industry/painPoints/tcpFit fields

# 9d. Render + upload in DRY_RUN (local mp4 + GIF only, no S3 upload)
DRY_RUN=1 python3 batch-ship-v6.py cache/kits.json 999 999
# Expect: ~3-5 minutes, produces output/rajesh-test-techcloudpro/*.mp4 + .gif
ls -lh output/rajesh-test-techcloudpro/
# Expect: video.mp4 (~3.5 MB), preview.gif (~150 KB-1 MB), landing.html
```

Open the mp4 in QuickTime — Sara should narrate the 46-second video. If she does, **your pipeline is fully operational.** Delete the test output:

```bash
rm -rf output/rajesh-test-techcloudpro/ cache/kits.json cache/prospects-raw.json
```

---

## 10. Daily / weekly operational flow

### Daily (1-2 min): Send a 🟢 Ready to Send email

Don't even need your laptop for this — it's all in the BrandMonkz UI.

1. Open https://brandmonkz.com/reports
2. Click **Follow-Ups** tab
3. Find a row with 🟢 **Ready to Send** button → click it
4. Email goes from `Sara <sara@techcloudpro.com>` to the prospect
5. Reply (if any) auto-forwards to you + JM

### Weekly (~30-45 min): Add prospect #85+

Only needed when you have new prospects without a v6 video kit. Full recipe in `RAJESH-HANDBOOK.md` Section 4. Short version:

```bash
cd ~/production-crm/scripts/video-pipeline

# 1. Auto-discover via Apollo (or hand-craft prospects-raw.json)
python3 apollo-import-prospects.py --limit 10

# 2. Research with Anthropic
python3 research-prospects.py cache/prospects-raw.json cache/kits.json

# 3. Render + upload
python3 batch-ship-v6.py cache/kits.json

# 4. Merge with existing 84 and deploy to EC2 (see handbook Section 4 Step 5-6)
```

---

## 11. Troubleshooting cheat sheet

| Symptom | Likely cause | Fix |
|---|---|---|
| `command not found: brew` | Homebrew install didn't add to PATH | Re-run the `echo` + `eval` lines Homebrew installer printed |
| `command not found: ffmpeg` | FFmpeg not installed or shell not refreshed | `brew install ffmpeg`, then open a NEW terminal window |
| `Permission denied (publickey)` on ssh | SSH key wrong / perms not 600 | `chmod 600 ~/.ssh/brandmonkz-crm.pem` |
| `setup-rajesh.sh: Permission denied` | Script not executable | `chmod +x setup-rajesh.sh` |
| `pip3 install ... externally-managed-environment` | macOS 14+ blocks system pip | Add `--user` or `--break-system-packages` flag |
| `Anthropic: credit balance too low` | TCP workspace ran out | Top up at `console.anthropic.com/settings/billing` (TCP workspace) |
| `Apollo: Invalid access credentials` | Key is bad/expired | Generate a fresh one at `app.apollo.io` → Settings → API |
| `botocore.exceptions.NoCredentialsError` | AWS keys not in env | Source `.env` OR run `aws configure` |
| Chrome render fails with blank PNGs | Chrome quarantine on first launch | Open Chrome manually once, accept the macOS warning |
| `pm2 logs crm-backend` shows wrong prospect count | EC2 file wasn't `chattr +i`-protected or pm2 not restarted | Re-run the chattr dance + `pm2 restart crm-backend` |

---

## 12. Where to read more (in priority order)

All public — no separate invite or clone needed.

| # | File | Where it lives | When to read |
|---|---|---|---|
| 1 | **`RAJESH-LAPTOP-SETUP.md`** (this file) | `production-crm/scripts/video-pipeline/` | Right now — first time setup |
| 2 | **`INDEX.md`** | `production-crm/docs/tcp-retargeting/` | Landing page for all operator docs |
| 3 | **`RAJESH-HANDBOOK.md`** | `production-crm/docs/tcp-retargeting/` | After setup is green — full operator playbook (12 sections) |
| 4 | **`CREDENTIALS-FOR-RAJESH.md`** | `production-crm/docs/tcp-retargeting/` | Reference for what each secret is, who has it, how to share safely |
| 5 | **`GO-LIVE-PROOF.md`** | `production-crm/docs/tcp-retargeting/` | If anything looks off and you want to compare against a known-good baseline |
| 6 | **`README.md`** | `production-crm/scripts/video-pipeline/` | Pipeline internals — scene HTMLs, FFmpeg flags, design decisions |

---

## 13. After you're set up — three things to do right away

1. **Reply to JM**: confirm `./setup-rajesh.sh` exited with `✓ All checks passed.` (paste the last 10 lines of output).
2. **Test send to yourself**: ask JM to do a test send to your `rajesh@techcloudpro.com` via the `recipientOverride` API path. Confirm email arrived from Sara. (You can do this without any local work — pure UI/API.)
3. **Pick a Monday for the first Apollo run**: agree with JM on the ICP filter (per RAJESH-HANDBOOK Section 6, default Apollo `"NetSuite"` keyword pulls consultancies; you want end-user customers). Don't run `--enrich` mode until ICP is locked.

---

## 14. Safety rules (don't skip these)

| ❌ Never | ✅ Instead |
|---|---|
| Commit `.env` to git | `.gitignore` already excludes it — verify with `git status` after editing |
| Paste secrets into Slack / email / Notion | Use 1Password / Signal / in-person |
| Run `npm install` or `npm run build` on EC2 | Caused a 10-min outage on May 26. Coordinate with JM. |
| Delete `dist.bak-342-20260517-230856/` on EC2 | It's the rollback to last known-good state |
| Send v6 emails to anyone in `email_unsubscribes` | The q320 filter prevents this automatically — don't bypass |
| Modify scripts under `/opt/tcp-*-report/` on EC2 | They're NOT in git — can be lost. Capture to source first. |

---

## 15. When things go wrong

Order of escalation:

1. **Re-run `./setup-rajesh.sh`** — most issues are config drift. The script will tell you what changed.
2. **Check `RAJESH-HANDBOOK.md` Section 10** (troubleshooting) for the specific symptom.
3. **`pm2 logs crm-backend --lines 100`** on EC2 (if it's a send issue, not a render issue).
4. **Ping JM** — paste the failing command + last 20 lines of output. Don't paste secrets.

---

*Last updated: 2026-05-26. Lives at `production-crm/scripts/video-pipeline/RAJESH-LAPTOP-SETUP.md` (public repo). Update as the system evolves.*
