# Credentials Rajesh needs from JM

JM has these — they're not in any git repo. Rajesh: ask JM directly. JM: please share these via 1Password / Signal / in-person — **never via email or Slack DM in plaintext.**

## Required for `setup-rajesh.sh` to pass

| # | Secret | Where JM gets it | Format | Notes |
|---|---|---|---|---|
| 1 | **`ELEVENLABS_API_KEY`** | JM's `.env` snapshot (or `console.elevenlabs.io` → Profile → API Keys) | `sk_...` 51 chars | Same key currently in EC2 `.env`. Voice id is locked to `cjVigY5qzO86Huf0OWal` — don't change. |
| 2 | **`ANTHROPIC_API_KEY`** (new TCP one) | The key JM swapped in on May 26 — `sk-ant-api03-***...***`, 108 chars. From the **TechCloudPro** Anthropic workspace. | `sk-ant-api03-...` 108 chars | Charges TCP account, not Dollor.ai. JM can re-share via 1Password. |
| 3 | **`AWS_ACCESS_KEY_ID`** | BrandMonkz AWS account 134607809447, IAM user `CRMaccesskey` | `AKIA...` 20 chars | Read/write on `brandmonkz-video-campaigns` and `watch.techcloudpro.com` S3 buckets. |
| 4 | **`AWS_SECRET_ACCESS_KEY`** | Same IAM user | 40 chars random | Pair with #3. |
| 5 | **`brandmonkz-crm.pem`** SSH key file | Hard copy from JM | private key file, ~1.6 KB | Save to `~/.ssh/brandmonkz-crm.pem` and `chmod 600`. Only needed if YOU (not JM) deploy mapping updates to EC2. |

## Required if Rajesh wants to use Apollo (recommended for Monday flow)

| # | Secret | Where to get it | Format |
|---|---|---|---|
| 6 | **`APOLLO_API_KEY`** | **Rajesh generates this himself** from `app.apollo.io` → Settings → Integrations → API → Generate Key. The existing one in JM's `.env` is invalid (22 chars, returns "Invalid access credentials"). | ~40 chars alphanumeric | Once generated, share with JM so it goes into EC2 `.env` too. |

## Optional / per-script

| # | Secret | Where | Notes |
|---|---|---|---|
| 7 | `RESEND_API_KEY` | EC2 `.env` already. JM has it. | `re_...` — for emailing from `peter@techcloudpro.com`. The pipeline doesn't fire emails directly; the CRM does. Only needed if running ad-hoc sends from CLI. |
| 8 | `TCP_STATS_SECRET` | `/opt/tcp-retargeting-report/...js` on EC2 has it embedded | For querying TCP's Hostinger stats.php. Only needed if Rajesh wants to rebuild/test the daily report locally. |

## How JM shares them safely

**Best:** 1Password "TCP Retargeting" vault, shared with rajesh@techcloudpro.com. One vault holds all 5 secrets + the SSH key file as an attachment. Rajesh installs 1Password CLI (`brew install --cask 1password-cli`) and can pull values directly into `.env`:

```bash
op vault item get "Anthropic API Key" --fields=password > /tmp/k.txt
# ... etc
```

**Acceptable:** Signal disappearing messages, 24-hour TTL. Rajesh copies values immediately into `.env`, deletes the message.

**Acceptable:** In-person via screen-share or paper.

**Never:** plain email, Slack DM, GitHub Issues, Google Docs, Notion. These are searchable/logged/backed up by third parties.

## After Rajesh has all the credentials

```bash
# 1. Save to a temp .env (don't paste secrets into chat history!)
cd ~/production-crm/scripts/video-pipeline
$EDITOR .env  # paste real values

# 2. chmod 600 it
chmod 600 .env

# 3. Save SSH key
cp /path/to/brandmonkz-crm.pem ~/.ssh/
chmod 600 ~/.ssh/brandmonkz-crm.pem

# 4. Run the setup verifier
./setup-rajesh.sh
# expect: ✓ All checks passed.

# 5. Now Rajesh can operate the pipeline (see RAJESH-HANDBOOK.md Section 4)
```

## What to do if Rajesh leaves the team

Rotate every secret on this list. Concretely:

- **ElevenLabs:** generate new key in console, revoke old
- **Anthropic:** generate new key in TCP workspace, revoke old, update EC2 `.env`
- **AWS:** rotate `CRMaccesskey` access keys in IAM
- **SSH:** generate new `brandmonkz-crm.pem` (this requires getting onto EC2 via the AWS Instance Connect web console, since you'll be locked out of SSH otherwise)
- **Apollo:** revoke his generated key from Apollo console, generate a new one for the next person
- **Resend:** rotate from Resend dashboard

This list intentionally has no actual secrets in it — it's the index of WHAT to share, not the values themselves.
