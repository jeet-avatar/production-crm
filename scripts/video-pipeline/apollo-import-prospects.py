#!/usr/bin/env python3
"""
apollo-import-prospects.py — Apollo.io prospect discovery → BrandMonkz pipeline feeder

Searches Apollo for people matching TCP's ICP and emits a `prospects-raw.json`
that's directly consumable by `research-prospects.py` → `batch-ship-v6.py`.

Usage:
    python3 apollo-import-prospects.py [--limit 10] [--page 1] [--titles "CFO,VP Finance,Controller"]
                                       [--out cache/prospects-raw.json]

ICP defaults (overridable via CLI):
    - Titles: CFO, VP Finance, Controller, IT Director, ERP Manager, Director of IT
    - Technology: NetSuite (Apollo tag `q_organization_keyword_tags`)
    - Company size: 50-500 employees (mid-market sweet spot for TCP)
    - Country: United States, Canada
    - Email status: verified

Idempotent — checks against the existing `tcp-v6-prospects.json` mapping
and skips emails already in the system.

Required env:
    APOLLO_API_KEY    Apollo.io API key (NOT the same as the master account
                      password). Get from app.apollo.io → Settings → Integrations
                      → API → Generate Key. Typical format: ~40 chars,
                      alphanumeric with no special separators.

Optional env:
    EXISTING_PROSPECTS_JSON  Path to tcp-v6-prospects.json for dedup.
                             Default: ./tcp-v6-prospects.json (sibling file).
"""

import os, sys, json, argparse, time
from pathlib import Path

try:
    import requests
except ImportError:
    print("missing dep: pip3 install requests", file=sys.stderr); sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUT = SCRIPT_DIR / "cache" / "prospects-raw.json"
DEFAULT_EXISTING = SCRIPT_DIR / "tcp-v6-prospects.json"

APOLLO_BASE = "https://api.apollo.io/api/v1"

# TCP ICP defaults
DEFAULT_TITLES = [
    "CFO", "Chief Financial Officer",
    "VP Finance", "VP of Finance",
    "Controller",
    "IT Director", "Director of IT",
    "ERP Manager", "ERP Director",
    "VP Operations", "COO",
]
DEFAULT_KEYWORDS = ["NetSuite"]  # company tech stack tag
DEFAULT_MIN_EMP = 50
DEFAULT_MAX_EMP = 500
DEFAULT_COUNTRIES = ["United States", "Canada"]


def load_existing(path: Path) -> set[str]:
    """Return set of lowercased emails already in the v6 system."""
    if not path.exists():
        return set()
    try:
        data = json.loads(path.read_text())
        if isinstance(data, dict):
            return {k.lower() for k in data.keys()}
        return {p.get("email", "").lower() for p in data if p.get("email")}
    except Exception as e:
        print(f"  [dedup] warning: couldn't parse {path}: {e}", file=sys.stderr)
        return set()


def apollo_search(api_key: str, titles: list[str], keywords: list[str],
                  min_emp: int, max_emp: int, countries: list[str],
                  page: int, per_page: int) -> dict:
    """Run a single page of Apollo mixed_people/search."""
    url = f"{APOLLO_BASE}/mixed_people/search"
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": api_key,
    }
    payload = {
        "person_titles": titles,
        "q_organization_keyword_tags": keywords,
        "organization_num_employees_ranges": [f"{min_emp},{max_emp}"],
        "person_locations": countries,
        "page": page,
        "per_page": per_page,
        "contact_email_status": ["verified"],
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    if resp.status_code == 401 or resp.status_code == 403:
        print(f"  [apollo] AUTH FAILED ({resp.status_code}) — check APOLLO_API_KEY", file=sys.stderr)
        print(f"  [apollo] response: {resp.text[:200]}", file=sys.stderr)
        sys.exit(2)
    if resp.status_code != 200:
        print(f"  [apollo] HTTP {resp.status_code}: {resp.text[:300]}", file=sys.stderr)
        sys.exit(3)
    try:
        return resp.json()
    except ValueError:
        print(f"  [apollo] non-JSON response: {resp.text[:300]}", file=sys.stderr)
        sys.exit(4)


def normalize_person(p: dict, rank_base: int) -> dict | None:
    """Convert Apollo person record into our prospects-raw.json schema."""
    email = (p.get("email") or "").strip().lower()
    if not email or "@" not in email or email.startswith("email_not_unlocked"):
        return None
    org = p.get("organization") or {}
    domain = org.get("website_url", "") or org.get("primary_domain", "") or ""
    # strip http(s):// and trailing /
    if domain.startswith("http"):
        domain = domain.split("://", 1)[1].split("/", 1)[0]
    if domain.startswith("www."):
        domain = domain[4:]
    return {
        "rank": rank_base,
        "firstName": p.get("first_name", "").strip() or "",
        "lastName": p.get("last_name", "").strip() or "",
        "email": email,
        "domain": domain,
        "companyName": org.get("name", "").strip() or "",
        # bonus fields useful for downstream research/personalization
        "_apollo_title": p.get("title", ""),
        "_apollo_linkedin": p.get("linkedin_url", ""),
        "_apollo_company_size": org.get("estimated_num_employees"),
        "_apollo_industry": org.get("industry"),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, default=10, help="max prospects to import (default 10)")
    parser.add_argument("--page", type=int, default=1, help="starting Apollo page (default 1)")
    parser.add_argument("--titles", type=str, default=None,
                        help=f"comma-separated titles (default: {','.join(DEFAULT_TITLES[:3])}...)")
    parser.add_argument("--keywords", type=str, default=None,
                        help=f"comma-separated tech keywords (default: {','.join(DEFAULT_KEYWORDS)})")
    parser.add_argument("--min-emp", type=int, default=DEFAULT_MIN_EMP)
    parser.add_argument("--max-emp", type=int, default=DEFAULT_MAX_EMP)
    parser.add_argument("--countries", type=str, default=None,
                        help=f"comma-separated countries (default: {','.join(DEFAULT_COUNTRIES)})")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT,
                        help=f"output path (default: {DEFAULT_OUT})")
    parser.add_argument("--existing", type=Path, default=DEFAULT_EXISTING,
                        help=f"existing prospects to dedup against (default: {DEFAULT_EXISTING})")
    parser.add_argument("--dry-run", action="store_true",
                        help="show what would be imported, don't write file")
    args = parser.parse_args()

    api_key = os.environ.get("APOLLO_API_KEY")
    if not api_key:
        print("APOLLO_API_KEY env var required", file=sys.stderr); sys.exit(1)

    titles = [t.strip() for t in args.titles.split(",")] if args.titles else DEFAULT_TITLES
    keywords = [k.strip() for k in args.keywords.split(",")] if args.keywords else DEFAULT_KEYWORDS
    countries = [c.strip() for c in args.countries.split(",")] if args.countries else DEFAULT_COUNTRIES

    print(f"[apollo] searching with:")
    print(f"  titles:    {titles[:5]}{'...' if len(titles) > 5 else ''}")
    print(f"  keywords:  {keywords}")
    print(f"  emp range: {args.min_emp}-{args.max_emp}")
    print(f"  countries: {countries}")
    print(f"  limit:     {args.limit}")
    print()

    existing_emails = load_existing(args.existing)
    print(f"[dedup] {len(existing_emails)} emails already in v6 system")
    print()

    prospects = []
    rank = 100  # start above existing 83-84 to avoid collision
    page = args.page
    per_page = min(args.limit * 2, 25)  # pad for dedup churn

    while len(prospects) < args.limit and page < args.page + 5:
        print(f"[apollo] page {page} (per_page={per_page})...")
        data = apollo_search(api_key, titles, keywords, args.min_emp, args.max_emp,
                             countries, page, per_page)
        people = data.get("people", [])
        if not people:
            print(f"  no more results from Apollo")
            break
        for p in people:
            normalized = normalize_person(p, rank)
            if not normalized:
                continue
            if normalized["email"] in existing_emails:
                print(f"  [skip-dup] {normalized['email']}")
                continue
            prospects.append(normalized)
            existing_emails.add(normalized["email"])
            rank += 1
            print(f"  [+] {normalized['firstName']} {normalized['lastName']} · {normalized['companyName']} · {normalized['email']}")
            if len(prospects) >= args.limit:
                break
        page += 1
        if len(people) < per_page:
            break  # exhausted

    print()
    print(f"[apollo] selected {len(prospects)} new prospects")

    if not prospects:
        print("[apollo] nothing to write; exiting", file=sys.stderr)
        sys.exit(0)

    if args.dry_run:
        print("\n[apollo] DRY RUN — would write:")
        print(json.dumps(prospects, indent=2))
        return

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(prospects, indent=2))
    print(f"[apollo] ✓ wrote {args.out}")
    print()
    print("[apollo] next step: research these with Anthropic web_search")
    print(f"  python3 research-prospects.py {args.out} cache/kits.json")
    print()
    print("[apollo] then ship them:")
    print(f"  python3 batch-ship-v6.py cache/kits.json")


if __name__ == "__main__":
    main()
