#!/usr/bin/env bash
# render-v6.sh — TCP v6 retargeting video renderer
#
# Usage:
#   ./render-v6.sh <slug> <out_mp4> <voice_mix_mp3>
#
# Required env (no defaults — fail loud if missing):
#   FIRSTNAME COMPANYNAME INDUSTRY DOMAIN
#   PAINPOINT1 PAINPOINT2 PAINPOINT3
#   TCPFIT1 TCPFIT2 TCPFIT3
#   WATCHURL_DISPLAY
#
# Optional:
#   MUSIC_BED_MP3 — path to shared music bed (will be mixed under voice)
#
# CRITICAL design notes (lessons from prior wipes):
#   - Use `export VAR="${VAR:-default}"` — `: ${VAR:=default}` does NOT export
#     to python subprocesses.
#   - Avoid apostrophes inside bash defaults — they break parsing.
#   - Pure inline CSS in scene HTML — no Tailwind CDN, race conditions in
#     headless Chrome.
#   - Logo is prefetched via Google S2 favicon API and inlined as base64
#     data URL — Clearbit free tier is dead.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENES_DIR="$SCRIPT_DIR/scenes"
CACHE_DIR="$SCRIPT_DIR/cache"
OUTPUT_DIR="$SCRIPT_DIR/output"
mkdir -p "$CACHE_DIR" "$OUTPUT_DIR"

SLUG="${1:?usage: render-v6.sh <slug> <out_mp4> <voice_mp3>}"
OUT_MP4="${2:?usage: render-v6.sh <slug> <out_mp4> <voice_mp3>}"
VOICE_MP3="${3:?usage: render-v6.sh <slug> <out_mp4> <voice_mp3>}"

# Verify required env vars exist (fail loud)
for var in FIRSTNAME COMPANYNAME INDUSTRY DOMAIN \
           PAINPOINT1 PAINPOINT2 PAINPOINT3 \
           TCPFIT1 TCPFIT2 TCPFIT3 \
           WATCHURL_DISPLAY; do
  if [ -z "${!var:-}" ]; then
    echo "render-v6.sh: missing required env: $var" >&2
    exit 1
  fi
done

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not installed (brew install ffmpeg)" >&2; exit 1; }
command -v curl   >/dev/null || { echo "curl not installed" >&2; exit 1; }

# ---------- 1. Prefetch logo -> base64 data URL ----------
LOGO_CACHE="$CACHE_DIR/$SLUG-logo.b64"
if [ ! -s "$LOGO_CACHE" ]; then
  echo "[render-v6] fetching logo for $DOMAIN..."
  LOGO_URL="https://www.google.com/s2/favicons?domain=$DOMAIN&sz=128"
  TMP_LOGO=$(mktemp -t logo.XXXXXX)
  curl -sL "$LOGO_URL" -o "$TMP_LOGO" || true
  if [ -s "$TMP_LOGO" ]; then
    # base64 single-line for src=
    printf 'data:image/png;base64,%s' "$(base64 < "$TMP_LOGO" | tr -d '\n')" > "$LOGO_CACHE"
  else
    # 1x1 transparent png fallback
    echo 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=' > "$LOGO_CACHE"
  fi
  rm -f "$TMP_LOGO"
fi
LOGO_DATA_URL="$(cat "$LOGO_CACHE")"

# ---------- 2. Substitute placeholders into each scene HTML, screenshot to PNG ----------
SCENE_DIR_WORK="$CACHE_DIR/$SLUG-scenes"
mkdir -p "$SCENE_DIR_WORK"

# python is used for the substitution — single quotes around the python script
# protect it from bash, and the script reads its substitutions from env vars
# (which `export` above makes available).
export FIRSTNAME COMPANYNAME INDUSTRY DOMAIN \
       PAINPOINT1 PAINPOINT2 PAINPOINT3 \
       TCPFIT1 TCPFIT2 TCPFIT3 \
       WATCHURL_DISPLAY LOGO_DATA_URL

render_scene() {
  local scene="$1"  # e.g. scene1
  local out_html="$SCENE_DIR_WORK/$scene.html"
  local out_png="$SCENE_DIR_WORK/$scene.png"

  # Substitute __TOKENS__ in the HTML
  python3 - <<'PY' "$SCENES_DIR/$scene.html" "$out_html"
import os, sys, html
src, dst = sys.argv[1], sys.argv[2]
text = open(src).read()
tokens = [
    'FIRSTNAME', 'COMPANYNAME', 'INDUSTRY', 'DOMAIN',
    'PAINPOINT1', 'PAINPOINT2', 'PAINPOINT3',
    'TCPFIT1', 'TCPFIT2', 'TCPFIT3',
    'WATCHURL_DISPLAY', 'LOGO_DATA_URL',
]
for t in tokens:
    val = os.environ.get(t, '')
    # LOGO_DATA_URL is already URL-safe; do not html-escape it
    if t != 'LOGO_DATA_URL':
        val = html.escape(val, quote=True)
    text = text.replace(f'__{t}__', val)
open(dst, 'w').write(text)
PY

  # headless Chrome screenshot at 1080x1080
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --no-sandbox \
    --window-size=1080,1080 \
    --virtual-time-budget=4000 \
    --screenshot="$out_png" \
    "file://$out_html" \
    >/dev/null 2>&1

  if [ ! -s "$out_png" ]; then
    echo "render-v6.sh: failed to screenshot $scene" >&2
    exit 1
  fi
  echo "[render-v6]   ✓ $scene"
}

echo "[render-v6] rendering 6 scenes..."
render_scene scene1
render_scene scene2a
render_scene scene2b
render_scene scene2c
render_scene scene2d
render_scene scene3

# ---------- 3. FFmpeg stitch with crossfades + voice + optional music ----------
# Timing plan (frames at 30fps, total ~46s):
#   scene1   3s  (still)  + 0.7s xfade
#   scene2a 10s  (still)  + 0.7s xfade
#   scene2b 10s  (still)  + 0.7s xfade
#   scene2c 10s  (still)  + 0.7s xfade
#   scene2d  6s  (still)  + 0.7s xfade
#   scene3   7s  (still)  + 1.5s fade-out
#
# Total ≈ 46s

FPS=30
echo "[render-v6] stitching with FFmpeg..."

# Build input list with timing
INPUTS=(
  "-loop" "1" "-t" "3.5" "-i" "$SCENE_DIR_WORK/scene1.png"
  "-loop" "1" "-t" "10.5" "-i" "$SCENE_DIR_WORK/scene2a.png"
  "-loop" "1" "-t" "10.5" "-i" "$SCENE_DIR_WORK/scene2b.png"
  "-loop" "1" "-t" "10.5" "-i" "$SCENE_DIR_WORK/scene2c.png"
  "-loop" "1" "-t" "6.5" "-i" "$SCENE_DIR_WORK/scene2d.png"
  "-loop" "1" "-t" "8.0" "-i" "$SCENE_DIR_WORK/scene3.png"
  "-i" "$VOICE_MP3"
)

# xfade filter chain (each next scene starts 0.7s before prev ends)
# offset = sum of durations so far - 0.7
FILTER="[0:v]format=yuv420p,settb=AVTB,fps=$FPS[v0];"
FILTER+="[1:v]format=yuv420p,settb=AVTB,fps=$FPS[v1];"
FILTER+="[2:v]format=yuv420p,settb=AVTB,fps=$FPS[v2];"
FILTER+="[3:v]format=yuv420p,settb=AVTB,fps=$FPS[v3];"
FILTER+="[4:v]format=yuv420p,settb=AVTB,fps=$FPS[v4];"
FILTER+="[5:v]format=yuv420p,settb=AVTB,fps=$FPS[v5];"
FILTER+="[v0][v1]xfade=transition=fade:duration=0.7:offset=2.8[x1];"
FILTER+="[x1][v2]xfade=transition=fade:duration=0.7:offset=12.6[x2];"
FILTER+="[x2][v3]xfade=transition=fade:duration=0.7:offset=22.4[x3];"
FILTER+="[x3][v4]xfade=transition=fade:duration=0.7:offset=32.2[x4];"
FILTER+="[x4][v5]xfade=transition=fade:duration=0.7:offset=38.0[x5];"
FILTER+="[x5]fade=t=out:st=44:d=1.5[vout]"

# Audio: if a music bed is provided, mix it under the voice at low volume
if [ -n "${MUSIC_BED_MP3:-}" ] && [ -f "$MUSIC_BED_MP3" ]; then
  INPUTS+=( "-i" "$MUSIC_BED_MP3" )
  # voice is input idx 6, music is 7
  FILTER+=";[6:a]aformat=fltp:44100:stereo,volume=1.0[voice]"
  FILTER+=";[7:a]aformat=fltp:44100:stereo,volume=0.18,afade=t=in:ss=0:d=1,afade=t=out:st=44:d=2[music]"
  FILTER+=";[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]"
else
  # voice only
  FILTER+=";[6:a]aformat=fltp:44100:stereo,volume=1.0,afade=t=out:st=44:d=1.5[aout]"
fi

ffmpeg -y -hide_banner -loglevel error \
  "${INPUTS[@]}" \
  -filter_complex "$FILTER" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -pix_fmt yuv420p -profile:v high -preset medium -crf 20 -r $FPS \
  -c:a aac -b:a 128k -shortest \
  "$OUT_MP4"

if [ ! -s "$OUT_MP4" ]; then
  echo "render-v6.sh: FFmpeg produced no output" >&2
  exit 1
fi

echo "[render-v6] ✓ wrote $OUT_MP4 ($(du -h "$OUT_MP4" | awk '{print $1}'))"
