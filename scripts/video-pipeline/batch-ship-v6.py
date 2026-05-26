#!/usr/bin/env python3
"""
batch-ship-v6.py — TCP v6 video retargeting orchestrator

For each prospect in <kits.json> (the output of research-prospects.py):
  1. Generate ElevenLabs narration (cached)
  2. Render mp4 via render-v6.sh + ffmpeg
  3. Build inline-GIF preview from the mp4 (for emails)
  4. Render & upload watch.techcloudpro.com/<slug>/ landing page to S3
  5. Upload mp4 + GIF to s3://brandmonkz-video-campaigns/
  6. Append prospect to dist tcp-v6-prospects.json mapping

Idempotent — skips steps whose outputs already exist in cache/.

Usage:
    python3 batch-ship-v6.py <kits.json> [<start_rank>] [<end_rank>]

Required env (or .env loaded via direnv/dotenv):
    ELEVENLABS_API_KEY, ANTHROPIC_API_KEY,
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
    S3_VIDEO_BUCKET=brandmonkz-video-campaigns
    S3_LANDING_BUCKET=watch.techcloudpro.com

Optional:
    MUSIC_BED_MP3 — local path; if omitted, voice-only output
    DRY_RUN=1     — render locally but don't upload to S3
"""

import os, sys, json, re, subprocess, html
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).resolve().parent
CACHE_DIR = SCRIPT_DIR / "cache"
OUTPUT_DIR = SCRIPT_DIR / "output"
SCENES_DIR = SCRIPT_DIR / "scenes"
LANDING_TPL = SCRIPT_DIR / "video-landing-template.html"
CACHE_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

VIDEO_BUCKET = os.environ.get("S3_VIDEO_BUCKET", "brandmonkz-video-campaigns")
LANDING_BUCKET = os.environ.get("S3_LANDING_BUCKET", "watch.techcloudpro.com")
DRY_RUN = os.environ.get("DRY_RUN") == "1"
MUSIC_BED = os.environ.get("MUSIC_BED_MP3", "")

DATE_TAG = "2026-04-27"  # legacy tag kept for filename compatibility with existing system


def slugify(company: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", company.lower()).strip("-")
    return s


def write_kit_file(prospect: dict) -> Path:
    kp = CACHE_DIR / f"{prospect['slug']}-kit.json"
    kp.write_text(json.dumps(prospect, indent=2))
    return kp


def run(cmd, env=None):
    print(f"  $ {' '.join(str(c) for c in cmd)}")
    return subprocess.check_call(cmd, env=env)


def render_video(prospect: dict) -> Path:
    slug = prospect["slug"]
    out_mp4 = OUTPUT_DIR / f"tcp-v6-{slug}-{DATE_TAG}.mp4"
    if out_mp4.exists() and out_mp4.stat().st_size > 500_000:
        print(f"  [render]    {out_mp4.name} (cached)")
        return out_mp4

    # 1. narration
    kit_file = write_kit_file(prospect)
    voice_mix = CACHE_DIR / f"{slug}-voice-mix.mp3"
    if not (voice_mix.exists() and voice_mix.stat().st_size > 1000):
        run(["python3", str(SCRIPT_DIR / "generate-segmented-narration.py"),
             slug, str(kit_file)])
    else:
        print(f"  [narration] {voice_mix.name} (cached)")

    # 2. render mp4
    env = os.environ.copy()
    env["FIRSTNAME"] = prospect["firstName"]
    env["COMPANYNAME"] = prospect["companyName"]
    env["INDUSTRY"] = prospect["industry"]
    env["DOMAIN"] = prospect.get("domain", "")
    pps = (prospect.get("painPoints") + ["", "", ""])[:3]
    fits = (prospect.get("tcpFit") + ["", "", ""])[:3]
    env["PAINPOINT1"], env["PAINPOINT2"], env["PAINPOINT3"] = pps
    env["TCPFIT1"], env["TCPFIT2"], env["TCPFIT3"] = fits
    env["WATCHURL_DISPLAY"] = f"watch.techcloudpro.com/{slug}/"
    if MUSIC_BED:
        env["MUSIC_BED_MP3"] = MUSIC_BED

    run([str(SCRIPT_DIR / "render-v6.sh"), slug, str(out_mp4), str(voice_mix)], env=env)
    return out_mp4


def make_inline_gif(mp4: Path, slug: str) -> Path:
    out_gif = OUTPUT_DIR / f"tcp-v6-{slug}-inline-{DATE_TAG}.gif"
    if out_gif.exists() and out_gif.stat().st_size > 50_000:
        print(f"  [gif]       {out_gif.name} (cached)")
        return out_gif

    # 3-second GIF preview from the first scene + start of scene 2a
    # 12fps, 480px wide, palette-optimized for email-friendly size
    palette = CACHE_DIR / f"{slug}-gif-palette.png"
    run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(mp4), "-t", "3",
        "-vf", "fps=12,scale=480:-1:flags=lanczos,palettegen",
        str(palette),
    ])
    run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(mp4), "-i", str(palette), "-t", "3",
        "-filter_complex", "fps=12,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse",
        str(out_gif),
    ])
    palette.unlink(missing_ok=True)
    return out_gif


def render_landing(prospect: dict, watch_url: str) -> Path:
    """Render watch.techcloudpro.com/<slug>/index.html"""
    if not LANDING_TPL.exists():
        raise FileNotFoundError(f"landing template missing: {LANDING_TPL}")
    tpl = LANDING_TPL.read_text()
    pps = (prospect.get("painPoints") + ["", "", ""])[:3]
    fits = (prospect.get("tcpFit") + ["", "", ""])[:3]

    def esc(s): return html.escape(str(s), quote=True)

    rendered = (tpl
        .replace("{{firstName}}", esc(prospect["firstName"]))
        .replace("{{companyName}}", esc(prospect["companyName"]))
        .replace("{{industry}}", esc(prospect["industry"]))
        .replace("{{painPoint1}}", esc(pps[0]))
        .replace("{{painPoint2}}", esc(pps[1]))
        .replace("{{painPoint3}}", esc(pps[2]))
        .replace("{{tcpFit1}}", esc(fits[0]))
        .replace("{{tcpFit2}}", esc(fits[1]))
        .replace("{{tcpFit3}}", esc(fits[2]))
        .replace("{{videoUrl}}", esc(prospect["videoUrl"]))
        .replace("{{slug}}", esc(prospect["slug"]))
    )
    out = OUTPUT_DIR / f"{prospect['slug']}-landing.html"
    out.write_text(rendered)
    print(f"  [landing]   wrote {out}")
    return out


def upload_to_s3(local: Path, bucket: str, key: str, content_type: str | None = None):
    if DRY_RUN:
        print(f"  [s3 dry]    {local.name} → s3://{bucket}/{key}")
        return
    try:
        import boto3
    except ImportError:
        print("missing dependency: pip3 install boto3", file=sys.stderr); sys.exit(1)
    s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1"))
    extra = {"ContentType": content_type} if content_type else {}
    s3.upload_file(str(local), bucket, key, ExtraArgs=extra)
    print(f"  [s3]        {local.name} → s3://{bucket}/{key}")


def ship_one(prospect: dict, mapping: dict) -> dict:
    """End-to-end ship for one prospect. Returns the updated prospect dict."""
    slug = prospect["slug"]
    print(f"\n=== {prospect.get('rank','?')}. {prospect['companyName']} ({slug}) ===")

    mp4 = render_video(prospect)
    gif = make_inline_gif(mp4, slug)

    video_url = f"https://{VIDEO_BUCKET}.s3.us-east-1.amazonaws.com/tcp-v6-{slug}-{DATE_TAG}.mp4"
    gif_url = f"https://{VIDEO_BUCKET}.s3.us-east-1.amazonaws.com/tcp-v6-{slug}-inline-{DATE_TAG}.gif"
    watch_url = f"https://{LANDING_BUCKET}/{slug}/"

    prospect["videoUrl"] = video_url
    prospect["gifUrl"] = gif_url
    prospect["watchUrl"] = watch_url
    prospect["outputName"] = f"tcp-v6-{slug}"

    landing = render_landing(prospect, watch_url)

    upload_to_s3(mp4, VIDEO_BUCKET, f"tcp-v6-{slug}-{DATE_TAG}.mp4", "video/mp4")
    upload_to_s3(gif, VIDEO_BUCKET, f"tcp-v6-{slug}-inline-{DATE_TAG}.gif", "image/gif")
    upload_to_s3(landing, LANDING_BUCKET, f"{slug}/index.html", "text/html")

    # Register into the dist mapping (keyed by lowercased email)
    email_key = prospect["email"].lower()
    mapping[email_key] = {
        "firstName": prospect["firstName"],
        "lastName": prospect.get("lastName", ""),
        "companyName": prospect["companyName"],
        "slug": slug,
        "outputName": prospect["outputName"],
        "watchUrl": watch_url,
        "gifUrl": gif_url,
        "videoUrl": video_url,
        "industry": prospect["industry"],
        "painPoints": prospect.get("painPoints", []),
        "tcpFit": prospect.get("tcpFit", []),
        "whyThisHtml": prospect.get("whyThisHtml", ""),
    }
    return prospect


def main():
    if len(sys.argv) < 2 or len(sys.argv) > 4:
        print(__doc__.strip(), file=sys.stderr); sys.exit(2)

    kits_path = Path(sys.argv[1])
    if not kits_path.exists():
        print(f"input not found: {kits_path}", file=sys.stderr); sys.exit(1)

    prospects = json.loads(kits_path.read_text())
    if isinstance(prospects, dict):
        prospects = list(prospects.values())

    # Slice by rank if start/end given
    start = int(sys.argv[2]) if len(sys.argv) >= 3 else 1
    end = int(sys.argv[3]) if len(sys.argv) >= 4 else len(prospects)
    sliced = prospects[start - 1:end]
    print(f"[ship] running ranks {start}..{end} ({len(sliced)} prospects)")

    # Load or initialize mapping
    mapping_out = SCRIPT_DIR / "tcp-v6-prospects.json"
    mapping = {}
    if mapping_out.exists():
        mapping = json.loads(mapping_out.read_text())
        print(f"[ship] loaded existing mapping: {len(mapping)} prospects")

    for p in sliced:
        if "slug" not in p:
            p["slug"] = slugify(p["companyName"])
        try:
            ship_one(p, mapping)
            mapping_out.write_text(json.dumps(mapping, indent=2))
        except subprocess.CalledProcessError as e:
            print(f"  [ship]    FAILED on {p['companyName']}: {e}", file=sys.stderr)
            continue

    print(f"\n[ship] ✓ wrote {len(mapping)} prospects → {mapping_out}")
    print(f"[ship]   next step: scp {mapping_out} to /var/www/crm-backend/dist/data/tcp-v6-prospects.json")
    print(f"[ship]   (file is chattr +i protected; sudo chattr -i first, then back +i after)")


if __name__ == "__main__":
    main()
