#!/usr/bin/env bash
# setup-rajesh.sh — One-shot toolchain + credentials verification for the TCP v6 pipeline
#
# Run on your Mac the FIRST time you want to operate the pipeline:
#
#   curl -sL https://raw.githubusercontent.com/jeet-avatar/production-crm/production/scripts/video-pipeline/setup-rajesh.sh | bash
#
# Or if you already cloned the repo:
#
#   cd ~/production-crm/scripts/video-pipeline
#   ./setup-rajesh.sh
#
# What it does:
#   1. Verifies macOS Mac with the right tools (FFmpeg, Chrome, Python 3.10+, pip packages)
#   2. Clones the production-crm repo to ~/production-crm if not already there
#   3. Scaffolds a .env file with placeholders (NOT real secrets — see CREDENTIALS-FOR-RAJESH.md)
#   4. Pings each external service to confirm credentials work
#   5. Runs apollo-import-prospects.py --dry-run --limit 0 to verify the importer wires correctly
#
# Exit codes:
#   0 — everything green, you can run the pipeline
#   1 — missing tool or package; instructions printed
#   2 — credential test failed; instructions printed
#   3 — repo clone failed (check git remote / network)

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; }
info()  { echo -e "${BLUE}ℹ${NC} $*"; }
step()  { echo ""; echo -e "${BLUE}── Step $1 ──────────────────────${NC} $2"; }

REPO_DIR="${PIPELINE_REPO_DIR:-$HOME/production-crm}"
PIPELINE_DIR="$REPO_DIR/scripts/video-pipeline"
SSH_KEY="${BRANDMONKZ_SSH_KEY:-$HOME/.ssh/brandmonkz-crm.pem}"

step 1 "macOS + shell"
if [[ "$(uname)" != "Darwin" ]]; then
    fail "Not running on macOS. The pipeline is Mac-tested only."
    fail "Linux should work too but Chrome path differs; ask JM if you need it."
    exit 1
fi
ok "macOS detected"

step 2 "FFmpeg"
if ! command -v ffmpeg >/dev/null 2>&1; then
    fail "FFmpeg not installed."
    info "Install with: brew install ffmpeg"
    info "Don't have brew? https://brew.sh"
    exit 1
fi
ok "FFmpeg: $(ffmpeg -version 2>&1 | head -1 | awk '{print $1, $2, $3}')"

step 3 "Headless Chrome"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
    fail "Chrome not found at the expected path:"
    fail "  $CHROME"
    info "Install Chrome from google.com/chrome and rerun."
    exit 1
fi
ok "Chrome: $("$CHROME" --version 2>&1 | head -1)"

step 4 "Python 3.10+"
if ! command -v python3 >/dev/null 2>&1; then
    fail "python3 not on PATH."
    info "Install with: brew install python@3.12"
    exit 1
fi
PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
PY_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')
if [[ "$PY_MAJOR" -lt 3 ]] || { [[ "$PY_MAJOR" -eq 3 ]] && [[ "$PY_MINOR" -lt 10 ]]; }; then
    fail "Python $PY_VER too old (need 3.10+)"
    info "Install newer with: brew install python@3.12"
    exit 1
fi
ok "Python: $PY_VER"

step 5 "Python packages (requests, boto3, anthropic)"
for pkg in requests boto3 anthropic; do
    if python3 -c "import $pkg" 2>/dev/null; then
        ok "  $pkg"
    else
        warn "  $pkg NOT installed"
        info "    pip3 install $pkg"
        MISSING_PY=1
    fi
done
if [[ "${MISSING_PY:-0}" == "1" ]]; then
    fail "Install missing packages and rerun."
    info "  pip3 install requests boto3 anthropic"
    exit 1
fi

step 6 "Repo at $REPO_DIR"
if [[ -d "$REPO_DIR/.git" ]]; then
    ok "Repo already cloned at $REPO_DIR"
    if [[ -d "$PIPELINE_DIR" ]]; then
        ok "Pipeline dir: $PIPELINE_DIR"
    else
        fail "Repo exists but $PIPELINE_DIR missing — wrong branch?"
        info "  cd $REPO_DIR && git checkout production"
        exit 1
    fi
else
    info "Cloning github.com/jeet-avatar/production-crm to $REPO_DIR..."
    if git clone https://github.com/jeet-avatar/production-crm.git "$REPO_DIR" >/dev/null 2>&1; then
        cd "$REPO_DIR"
        git checkout production >/dev/null 2>&1 || true
        ok "Cloned + on production branch"
    else
        fail "Clone failed. Network? SSH/HTTPS auth? gh auth status?"
        exit 3
    fi
fi

step 7 ".env file"
ENV_FILE="$PIPELINE_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
    ok ".env exists at $ENV_FILE"
    info "Verifying required keys are NOT placeholders..."
    for k in ELEVENLABS_API_KEY ANTHROPIC_API_KEY AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY APOLLO_API_KEY; do
        VAL=$(grep "^$k=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
        if [[ -z "$VAL" ]] || [[ "$VAL" == *REPLACE_ME* ]] || [[ "$VAL" == *PLACEHOLDER* ]]; then
            warn "  $k = (placeholder or empty) — needs real value"
            NEEDS_ENV=1
        else
            ok "  $k = ${VAL:0:8}...${VAL: -4} (${#VAL} chars)"
        fi
    done
else
    warn "No .env found. Scaffolding from .env.example..."
    cp "$PIPELINE_DIR/.env.example" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    ok "Created $ENV_FILE (chmod 600)"
    NEEDS_ENV=1
fi

if [[ "${NEEDS_ENV:-0}" == "1" ]]; then
    echo ""
    warn "Edit $ENV_FILE and replace placeholder values with real keys."
    info "What you need (and who has it):"
    info "  ELEVENLABS_API_KEY    — JM has it"
    info "  ANTHROPIC_API_KEY     — JM has the TCP-workspace key from May 26 swap"
    info "  AWS_ACCESS_KEY_ID     — JM (BrandMonkz account 134607809447)"
    info "  AWS_SECRET_ACCESS_KEY — JM"
    info "  APOLLO_API_KEY        — YOU generate from app.apollo.io"
    info ""
    info "Full credential checklist: CREDENTIALS-FOR-RAJESH.md in this directory"
    info ""
    info "After updating .env, rerun this script."
    exit 2
fi

step 8 "SSH key for EC2"
if [[ ! -r "$SSH_KEY" ]]; then
    warn "Brandmonkz SSH key not at $SSH_KEY"
    info "  Ask JM for brandmonkz-crm.pem and place at ~/.ssh/"
    info "  Then: chmod 600 ~/.ssh/brandmonkz-crm.pem"
    info "  (you don't need this for rendering — only for deploying the prospects.json mapping to EC2)"
else
    PERMS=$(stat -f "%Mp%Lp" "$SSH_KEY")
    if [[ "$PERMS" != "0600" ]]; then
        warn "SSH key has overly-open permissions ($PERMS)"
        info "  chmod 600 $SSH_KEY"
    fi
    ok "SSH key: $SSH_KEY (perms $PERMS)"
fi

step 9 "Credential smoke tests"
cd "$PIPELINE_DIR"
set +e

# Load env vars from .env into current shell
set -a
. ./.env
set +a

info "Testing ElevenLabs API..."
EL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" \
    "https://api.elevenlabs.io/v1/user")
if [[ "$EL_STATUS" == "200" ]]; then
    ok "  ElevenLabs: 200"
else
    fail "  ElevenLabs: $EL_STATUS — key invalid or hit rate limit"
    HAS_FAIL=1
fi

info "Testing Anthropic API..."
AN_RESP=$(curl -s -X POST "https://api.anthropic.com/v1/messages" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{"model":"claude-haiku-4-5-20251001","max_tokens":3,"messages":[{"role":"user","content":"hi"}]}')
if echo "$AN_RESP" | grep -q '"type":"message"'; then
    ok "  Anthropic: working"
elif echo "$AN_RESP" | grep -q "credit balance"; then
    fail "  Anthropic: balance too low — top up at console.anthropic.com"
    HAS_FAIL=1
else
    fail "  Anthropic: failed — $(echo "$AN_RESP" | head -c 200)"
    HAS_FAIL=1
fi

info "Testing AWS S3 access (list video bucket)..."
if AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
   aws s3 ls "s3://${S3_VIDEO_BUCKET:-brandmonkz-video-campaigns}/" >/dev/null 2>&1; then
    ok "  AWS S3: video bucket accessible"
else
    fail "  AWS S3: cannot list ${S3_VIDEO_BUCKET:-brandmonkz-video-campaigns}"
    info "    Check AWS keys + region (us-east-1)"
    HAS_FAIL=1
fi

info "Testing Apollo API..."
AP_STATUS=$(curl -s -X POST "https://api.apollo.io/api/v1/mixed_companies/search" \
    -H "X-Api-Key: $APOLLO_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"q_organization_keyword_tags":["NetSuite"],"page":1,"per_page":1}')
if echo "$AP_STATUS" | grep -q '"organizations"'; then
    ok "  Apollo: working"
elif echo "$AP_STATUS" | grep -q "Invalid access credentials"; then
    fail "  Apollo: 'Invalid access credentials' — key in .env is bad"
    info "    Log into app.apollo.io → Settings → Integrations → API → Generate Key"
    HAS_FAIL=1
else
    warn "  Apollo: unexpected response — $(echo "$AP_STATUS" | head -c 200)"
fi

set -e

if [[ "${HAS_FAIL:-0}" == "1" ]]; then
    echo ""
    fail "Some credentials failed. Fix the failures above and rerun."
    exit 2
fi

step 10 "Pipeline dry-run"
info "Running apollo-import-prospects.py --dry-run --limit 3 (no writes)..."
if APOLLO_API_KEY="$APOLLO_API_KEY" python3 apollo-import-prospects.py --limit 3 --dry-run 2>&1 | tail -10; then
    ok "Pipeline dry-run succeeded"
else
    warn "Pipeline dry-run had warnings — review above"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All checks passed. You can operate the pipeline.${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
info "Next steps:"
info "  1. Add a real prospect to cache/prospects-raw.json"
info "  2. python3 research-prospects.py cache/prospects-raw.json cache/kits.json"
info "  3. python3 batch-ship-v6.py cache/kits.json"
info "  4. Merge into EC2 prospects.json + pm2 restart (handbook Section 4)"
echo ""
info "Full handbook: $REPO_DIR/scripts/video-pipeline/README.md"
info "Operational handbook: github.com/jeet-avatar/crm-email-marketing-platform → crm-pipeline/tcp-retargeting/RAJESH-HANDBOOK.md"
