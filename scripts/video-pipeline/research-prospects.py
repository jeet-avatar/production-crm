#!/usr/bin/env python3
"""
research-prospects.py — Anthropic web-search prospect research

Given a JSON list of prospects with at minimum {firstName, lastName,
companyName, domain, email}, queries Anthropic with web_search enabled
and produces a kit per prospect:
    {
      "industry":     "...",
      "painPoints":   ["...", "...", "..."],  # 3 max, 1-2 sentences each
      "tcpFit":       ["...", "...", "..."],  # 3 max, 1-2 sentences each
      "whyThisHtml":  "<rendered HTML block>"
    }

Output: writes to <output_json> with the same prospects + the new fields.

Rate-limited: sleeps 30s between calls.

Usage:
    python3 research-prospects.py <prospects_in.json> <kits_out.json>

Required env:
    ANTHROPIC_API_KEY
"""

import os, sys, json, time, html
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("missing dependency: pip3 install anthropic", file=sys.stderr); sys.exit(1)

API_KEY = os.environ.get("ANTHROPIC_API_KEY")
if not API_KEY:
    print("ANTHROPIC_API_KEY env var required", file=sys.stderr); sys.exit(1)

# Anti-hallucination + grounding instructions for the model
SYSTEM_PROMPT = """You are a B2B sales research analyst working for TechCloudPro
(TCP), a NetSuite + AI consultancy founded in 2015. Your job is to research a
target company using web search, then produce a structured, grounded analysis
that a TCP partner can use to send a personalized outreach.

Rules:
1. Use web_search liberally. Cite signals from the company's actual site, press
   releases, LinkedIn, news, regulatory filings.
2. NEVER fabricate. If a claim isn't supported by something you found, drop it.
3. Pain points must be REAL operational frictions inferable from public info —
   regulated industry (compliance load), multi-state ops (license sprawl),
   procurement (catalog complexity), supply chain (vendor mgmt), etc. NOT
   generic "increase efficiency" filler.
4. TCP fit must speak to what TCP actually offers: NetSuite practice (15 years),
   ArthaBuild AI (NetSuite copilot at artha.build), AI consulting, transparent
   staffing at $1/contract. NOT generic "we can help."
5. Industry should be one specific descriptive line, not a sector code.

Output format: STRICT JSON with the shape:
{
  "industry":   "single sentence describing what they do",
  "painPoints": ["sentence 1", "sentence 2", "sentence 3"],
  "tcpFit":     ["sentence 1", "sentence 2", "sentence 3"],
  "whyThisHtml":"<rendered HTML block, see template below>"
}

whyThisHtml template:
<div class="why-block">
  <h3>What you do</h3>
  <p>{industry}</p>
  <h3>A few things on our radar</h3>
  <ul>
    <li>{painPoint 1}</li>
    <li>{painPoint 2}</li>
    <li>{painPoint 3}</li>
  </ul>
  <h3>Where we plug in</h3>
  <ul>
    <li>{tcpFit 1}</li>
    <li>{tcpFit 2}</li>
    <li>{tcpFit 3}</li>
  </ul>
</div>

Output ONLY the JSON object, no commentary, no markdown fences.
"""


def research_one(client: anthropic.Anthropic, prospect: dict) -> dict | None:
    """Run a single web_search-enabled research turn for one prospect."""
    company = prospect["companyName"]
    domain = prospect.get("domain", "")
    contact = f"{prospect.get('firstName','')} {prospect.get('lastName','')}".strip()
    user = (
        f"Research target: **{company}**"
        f"{f' (website: {domain})' if domain else ''}.\n"
        f"Primary contact at that company: {contact}.\n\n"
        "Produce the structured JSON per the system instructions. "
        "Use 4-6 web searches to ground your claims."
    )
    try:
        resp = client.messages.create(
            model="claude-opus-4-5",  # high quality for research
            max_tokens=2500,
            system=SYSTEM_PROMPT,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 6}],
            messages=[{"role": "user", "content": user}],
        )
    except Exception as e:
        print(f"  [research]   ERROR: {e}", file=sys.stderr)
        return None

    # Find the final text block (after any tool calls)
    text = ""
    for block in resp.content:
        if getattr(block, "type", None) == "text":
            text += block.text
    text = text.strip()

    # Strip ```json fences if model added them despite instructions
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip("` \n")

    try:
        kit = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"  [research]   parse error: {e}", file=sys.stderr)
        print(f"  [research]   raw output: {text[:300]}", file=sys.stderr)
        return None

    # Validate shape
    if not all(k in kit for k in ("industry", "painPoints", "tcpFit", "whyThisHtml")):
        print(f"  [research]   missing required keys in {company}", file=sys.stderr)
        return None
    return kit


def main():
    if len(sys.argv) != 3:
        print(__doc__.strip(), file=sys.stderr); sys.exit(2)

    in_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    if not in_path.exists():
        print(f"input not found: {in_path}", file=sys.stderr); sys.exit(1)

    prospects = json.loads(in_path.read_text())
    if isinstance(prospects, dict):
        # map form: email → {firstName, lastName, ...}
        items = [dict(email=k, **v) for k, v in prospects.items()]
    else:
        items = prospects

    # Resume support: if out_path already has some kits, skip those companies
    existing = {}
    if out_path.exists():
        try:
            existing = {p["companyName"]: p for p in json.loads(out_path.read_text())}
            print(f"[research] resuming with {len(existing)} already-researched prospects")
        except Exception:
            pass

    client = anthropic.Anthropic(api_key=API_KEY)
    results = []
    for i, p in enumerate(items, 1):
        company = p["companyName"]
        if company in existing and existing[company].get("industry"):
            print(f"[research] {i}/{len(items)} {company} (cached)")
            results.append(existing[company])
            continue

        print(f"[research] {i}/{len(items)} {company} (calling Anthropic + web_search...)")
        kit = research_one(client, p)
        if kit is None:
            print(f"  [research]   SKIPPED — research failed", file=sys.stderr)
            continue
        merged = {**p, **kit}
        results.append(merged)

        # Persist after each successful research so a crash doesn't lose work
        out_path.write_text(json.dumps(results, indent=2))

        # Rate-limit to be polite to Anthropic web_search backend
        if i < len(items):
            time.sleep(30)

    out_path.write_text(json.dumps(results, indent=2))
    print(f"[research] ✓ wrote {len(results)}/{len(items)} kits → {out_path}")


if __name__ == "__main__":
    main()
