#!/usr/bin/env python3
"""
generate-segmented-narration.py — TCP v6 narration generator

Produces 6 scene-synced narration segments via ElevenLabs, then pre-mixes
to a single voice.mp3 matching the scene timings used by render-v6.sh.

Usage:
    python3 generate-segmented-narration.py <slug> <prospect_kit_json>

The prospect_kit_json file must contain at least:
    {
      "firstName": "Logan",
      "companyName": "REAL Solutions Group",
      "industry": "Pharmaceutical regulatory compliance consulting",
      "painPoints": ["...", "...", "..."],
      "tcpFit":     ["...", "...", "..."]
    }

Output:
    cache/<slug>-voice-mix.mp3           - the premixed voice track
    cache/<slug>-voice-{s1,s2a,...s3}.mp3 - individual scene segments

Idempotent: skips ElevenLabs calls if cached files exist.

Required env:
    ELEVENLABS_API_KEY
    ELEVENLABS_VOICE_ID (default: cjVigY5qzO86Huf0OWal)
"""

import os, sys, json, subprocess, tempfile, time
from pathlib import Path

try:
    import requests
except ImportError:
    print("missing dependency: pip3 install requests", file=sys.stderr); sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
CACHE_DIR = SCRIPT_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "cjVigY5qzO86Huf0OWal")
if not ELEVENLABS_API_KEY:
    print("ELEVENLABS_API_KEY env var required", file=sys.stderr); sys.exit(1)

# Scene cumulative offsets in seconds — matches render-v6.sh xfade timing.
# Each scene begins at this offset in the final video.
SCENE_OFFSETS_S = {
    "s1":  0.0,   # 3s opener
    "s2a": 2.8,   # crossfade starts 0.7s before scene1 ends
    "s2b": 12.6,
    "s2c": 22.4,
    "s2d": 32.2,
    "s3":  38.0,
}

def _first_sentence(s: str, max_chars: int = 90) -> str:
    """Return first sentence of s, capped at max_chars. The on-screen card has
    the full text — narration just needs the gist."""
    if not s:
        return ""
    # Take up to first period or first max_chars whichever is shorter
    s = s.strip()
    for end in ['. ', '; ', ': ']:
        idx = s.find(end)
        if 0 < idx < max_chars:
            return s[:idx].strip() + "."
    if len(s) <= max_chars:
        return s if s.endswith(('.', '!', '?')) else s + "."
    # Truncate at word boundary
    cut = s[:max_chars].rsplit(' ', 1)[0]
    return cut + "."


def script_for(kit: dict) -> dict:
    """Compose 6 short narration strings from the prospect kit.

    Each segment must fit its scene budget when spoken at normal pace
    (~14 chars/sec via ElevenLabs Multilingual v2). The visual card carries
    the full text — narration is the gist.

    Budgets vs target chars (at ~14 chars/sec):
      s1: 3.5s -> ~45 chars
      s2a: 10.5s -> ~140 chars
      s2b: 10.5s -> ~140 chars
      s2c: 10.5s -> ~140 chars
      s2d: 6.5s -> ~90 chars
      s3: 8.0s -> ~110 chars
    """
    first = kit["firstName"]
    company = kit["companyName"]

    pps = kit.get("painPoints", []) + ["", "", ""]
    fits = kit.get("tcpFit", []) if isinstance(kit.get("tcpFit"), list) else []
    fits = (fits + ["", "", ""])[:3]

    # short framing keywords for pain points (rotate by position)
    pp_short = [_first_sentence(p, 35) for p in pps[:3]]

    return {
        # ~3s, ~40 chars
        "s1": f"Hi {first}. A short read on {company}.",
        # ~10s, ~140 chars — frame the industry, don't recite it
        "s2a": f"Here is what we noticed. We pulled a quick public read on {company} and where the workflow gets heavy.",
        # ~10s, ~140 chars — high-level signal, the bullets carry detail
        "s2b": f"Three places we expect friction shows up. Inventory and production flow. System consolidation. And growth-stage operations.",
        # ~10s, ~140 chars
        "s2c": f"Where we plug in for {company}. NetSuite practice. ArthaBuild AI copilot. And focused consulting on what you are actually doing.",
        # ~6s, ~80 chars
        "s2d": "Four service lines. NetSuite. ArthaBuild AI. Consulting. Staffing.",
        # ~7s, ~110 chars
        "s3": f"Want a deeper read, {first}? Reply or open the link. Peter at TechCloudPro.",
    }


def elevenlabs_tts(text: str, out_mp3: Path) -> None:
    """Synthesize one segment via ElevenLabs."""
    if out_mp3.exists() and out_mp3.stat().st_size > 1000:
        print(f"  [tts]   {out_mp3.name} (cached)")
        return

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.78,
            "style": 0.15,
            "use_speaker_boost": True,
        },
    }
    print(f"  [tts]   {out_mp3.name} ({len(text)} chars)...")
    resp = requests.post(url, headers=headers, json=payload, timeout=90)
    if resp.status_code != 200:
        print(f"ElevenLabs error {resp.status_code}: {resp.text[:300]}", file=sys.stderr)
        sys.exit(1)
    out_mp3.write_bytes(resp.content)


def get_duration_s(mp3: Path) -> float:
    """ffprobe duration."""
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(mp3)
    ]).decode().strip()
    return float(out)


def build_mix(slug: str, segments: dict[str, Path]) -> Path:
    """Concat segments into a single track placed at SCENE_OFFSETS_S.

    Result is a stereo mp3 ~46s long, with each segment starting at its
    scene's offset and silence between them where needed.
    """
    mix_path = CACHE_DIR / f"{slug}-voice-mix.mp3"
    if mix_path.exists() and mix_path.stat().st_size > 1000:
        print(f"  [mix]   {mix_path.name} (cached)")
        return mix_path

    # Build ffmpeg filter: each input gets a `adelay=Nms|Nms` to position
    # at its scene offset, then they're mixed together (amix).
    keys = ["s1", "s2a", "s2b", "s2c", "s2d", "s3"]
    inputs = []
    filters = []
    labels = []
    for i, k in enumerate(keys):
        inputs += ["-i", str(segments[k])]
        offset_ms = int(SCENE_OFFSETS_S[k] * 1000)
        filters.append(
            f"[{i}:a]aformat=fltp:44100:stereo,adelay={offset_ms}|{offset_ms}[a{i}]"
        )
        labels.append(f"[a{i}]")
    filter_complex = ";".join(filters) + ";" + "".join(labels) + \
                     f"amix=inputs={len(keys)}:duration=longest:dropout_transition=0[aout]"

    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[aout]",
        "-t", "47",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(mix_path),
    ]
    print(f"  [mix]   ffmpeg amix → {mix_path.name}")
    subprocess.check_call(cmd)
    return mix_path


def main():
    if len(sys.argv) != 3:
        print(__doc__.strip(), file=sys.stderr); sys.exit(2)

    slug = sys.argv[1]
    kit_path = Path(sys.argv[2])
    if not kit_path.exists():
        print(f"prospect kit not found: {kit_path}", file=sys.stderr); sys.exit(1)
    kit = json.loads(kit_path.read_text())

    scripts = script_for(kit)
    segments = {}
    print(f"[narration] generating 6 segments for {slug}")
    for k, text in scripts.items():
        out = CACHE_DIR / f"{slug}-voice-{k}.mp3"
        elevenlabs_tts(text, out)
        segments[k] = out

    # Report each segment's actual duration vs scene budget
    print(f"[narration] segment durations vs scene budgets:")
    BUDGETS = {"s1": 3.5, "s2a": 10.5, "s2b": 10.5, "s2c": 10.5, "s2d": 6.5, "s3": 8.0}
    for k in ["s1", "s2a", "s2b", "s2c", "s2d", "s3"]:
        d = get_duration_s(segments[k])
        b = BUDGETS[k]
        flag = "" if d <= b else "  ⚠ over budget"
        print(f"  {k:5s} {d:5.2f}s (budget {b:.1f}){flag}")

    mix = build_mix(slug, segments)
    total = get_duration_s(mix)
    print(f"[narration] ✓ mix duration {total:.2f}s → {mix}")

if __name__ == "__main__":
    main()
