#!/usr/bin/env python3
"""
NetSuite DM Campaign — AI-Personalized 9-Day 3-Touch Sequence
=============================================================
Day 1 : Claude generates a personalised, research-based email per prospect
Day 4 : Claude generates a follow-up referencing Day 1 scenario question (no click gate)
Day 9 : Claude generates a breakup email referencing same scenario question

Sender : Sara Mitchell (sara@techcloudpro.com) — locked to Sara for this batch
Cron   : 5 18 * * 1-4  (18:05 UTC Mon-Thu = 1:05 PM EST)
DB     : decision_makers_netsuite.prospects
Max    : 75/day | Gap: 3-5 min | USA contacts only
"""

from __future__ import annotations
import os, sys, time, random, logging, requests, psycopg2, psycopg2.extras, uuid, re
from pathlib  import Path
from datetime import datetime, timedelta, timezone
import anthropic

# ── TEST MODE FLAGS ────────────────────────────────────────────────────────────
TEST_MODE     = "--test" in sys.argv           # --test: full 3-email sequence test
TEST_DAY1     = "--test-day1" in sys.argv      # --test-day1: Day 1 only, instant iteration
TEST_EMAIL    = "rajesh@techcloudpro.com"      # all test sends go here, no DB writes

# ── CONFIG ────────────────────────────────────────────────────────────────────
ENV_FILE          = Path("/var/www/crm-backend/.env")                   # environment file
DM_DB_URL         = "postgresql://brandmonkz:BrandMonkz2024SecureDB@brandmonkz-crm-db-restored.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/decision_makers_netsuite"  # DM pipeline DB
MAIN_DB_KEY       = "DATABASE_URL"                                      # .env key for main CRM DB
RESEND_KEY_ENV    = "RESEND_API_KEY"                                    # .env key for Resend
ANTHROPIC_KEY_ENV = "ANTHROPIC_API_KEY"                                 # .env key for Anthropic
CLAUDE_MODEL      = "claude-sonnet-4-6"                                 # model for all 3 email types

SENDER_NAME       = "Sara Mitchell"                                     # display name on all sends
SENDER_EMAIL      = "sara@techcloudpro.com"                             # sending address

PER_DAY_MAX       = 75                                                  # hard daily send cap
MIN_GAP           = 3 * 60                                              # minimum gap between sends (3 min)
MAX_GAP           = 5 * 60                                              # maximum gap between sends (5 min)
SEQ_2_AFTER_DAYS  = 4                                                   # days before Day 4 send
SEQ_3_AFTER_DAYS  = 5                                                   # days before Day 9 send (from Day 4)
TARGET_COUNTRY    = "USA"                                               # only process USA contacts

LOG_FILE = Path("/var/www/crm-backend/logs/netsuite-dm-campaign.log")   # log output path

# ── DAY 1 — GENERATION PROMPT ─────────────────────────────────────────────────
# Use .replace() for substitution (not .format()) to avoid brace conflicts with examples
DAY1_PROMPT = """You are an expert B2B outbound SDR writing cold emails for Artha, an AI-powered financial analysis solution that works within NetSuite.

INPUTS:
* Company name: {{company_name}}
* Company website: {{website}}
* Prospect name: {{prospect_name}}
* Prospect title: {{title}}
* LinkedIn profile (if available): {{linkedin}}
* Additional company data: {{company_data}}

STEP 1: RESEARCH THE COMPANY
Analyze all publicly available information and extract:
1. Industry and business model
2. Estimated company size (employees, revenue range if available)
3. Whether they use NetSuite or are likely NetSuite users
4. Recent company news (funding, expansion, acquisitions, hiring, new products, partnerships)
5. Key financial or operational drivers specific to the industry
6. Likely challenges for a CFO, VP Finance, Controller, or Finance Director
7. One highly relevant financial scenario question leadership might ask

Examples by industry:
* SaaS: runway, ARR growth, burn rate, hiring plans
* Manufacturing: margins, raw material costs, inventory turns
* Services: utilization, project profitability, staffing
* E-commerce: gross margin, inventory levels, promotions
* Healthcare: reimbursement rates, labor costs
* Distribution: inventory, demand forecasting, working capital

STEP 2: SELECT THE BEST INDUSTRY-SPECIFIC SCENARIO
Create ONE realistic question that the prospect's leadership team would likely ask.
Examples:
* "What's our runway if bookings miss plan by 15%?"
* "What happens to margin if raw material costs rise 8%?"
* "How does EBITDA change if utilization drops 5%?"
* "What's the impact of carrying 20% more inventory next quarter?"

STEP 3: WRITE THE EMAIL
Requirements:
* 80-120 words
* Conversational and direct
* No hype, no buzzwords, no generic personalization
* Mention only facts found during research
* Use the scenario question as the centerpiece
* Include the phrase: "The question becomes the analysis."
* Mention that Artha works within NetSuite and data remains in the customer's environment
* Single CTA: Reply "demo"
* No em dashes (use periods or commas instead)
* The scenario question must have at most one or two variables — keep it easy to scan at a glance
* Do NOT assume you know the prospect's internal workflow or reporting process

EMAIL STRUCTURE:
Opening: Pick ONE financial driver for this industry — the single most relevant cost, margin, or planning challenge. Write one clean sentence about it. Do NOT combine multiple variables. Do NOT describe their internal process as if you know it. Use "can take" (not "often takes") — example: "In [industry], understanding the impact of [X] can take several planning cycles before leadership has a clear answer."
Middle: Frame the scenario question with a lead-in on its own line, then the question on the next line. Format exactly like this:
Finance teams in this space often ask:
[scenario question here]
The scenario question must follow directly from the financial driver in the opening. One variable max. Use plain, universally-understood financial terms — do NOT use unexplained acronyms or niche technical terms (e.g. avoid raw "CTV", "TAC", "DSP" without context; say "connected TV revenue" or "traffic acquisition costs" in full).
Proof: Do NOT write "Finance teams at similar companies..." or make peer comparisons. Write exactly: "With Artha, that becomes the analysis. Teams ask it directly in NetSuite and get a modeled answer in minutes."
Security: Write exactly: "Everything runs inside NetSuite. Nothing is exported."
CTA: Write exactly: "Reply 'demo' and I'll send a few slots."

OUTPUT FORMAT (follow exactly):
Research Summary:
* Industry: [industry]
* Company Size: [size estimate]
* Recent Trigger: [trigger or "none found"]
* Finance Pain Point: [pain point]
* Scenario Question: [the question — include the quotation marks]

Subject Line: [subject line only, no quotes around it]

Email:
[Final email only. Start with "Hi {{prospect_name}}," — no labels or headers above the greeting.]"""

# ── DAY 4 — FOLLOW-UP TEMPLATE ────────────────────────────────────────────────
# No Claude call — fixed template using stored Day 1 scenario question only.
# Rules: same scenario question, same industry angle, no new research, under 80 words.
DAY4_SUBJECT = "following up"
DAY4_BODY    = """Hi {first_name},

Following up on the question below:

"{scenario_question}"

Many finance teams still need to pull reports, build spreadsheets, and validate numbers before they can answer it.

With Artha, that question can be asked directly in NetSuite and answered in minutes.

Worth a quick look?

Sara"""

# ── DAY 9 — CLOSE-OUT TEMPLATE ────────────────────────────────────────────────
# No Claude call — fixed close-out using same scenario question. Under 60 words.
DAY9_SUBJECT = "closing the loop"
DAY9_BODY    = """Hi {first_name},

I'll close the loop after this.

If solving questions like:

"{scenario_question}"

isn't a priority right now, no worries.

If it is, reply "demo" and I'll send a few times.

Sara"""

# ── LOGGING ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),                    # print to terminal
        logging.FileHandler(str(LOG_FILE), mode="a"),         # append to log file
    ]
)
log = logging.getLogger(__name__)

# ── ENV LOADER ────────────────────────────────────────────────────────────────
def load_env():
    """Load .env file into os.environ (skip blanks and comments)."""
    for line in ENV_FILE.read_text().splitlines():            # each line in file
        line = line.strip()                                   # strip whitespace
        if line and not line.startswith("#") and "=" in line: # skip blank/comment lines
            k, _, v = line.partition("=")                    # split on first =
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))  # set if missing

load_env()                                                    # load env on script start

# ── DB MIGRATION ──────────────────────────────────────────────────────────────
def ensure_sequence_columns(dm_conn):
    """Add all sequence and Day 1 storage columns if they don't exist yet."""
    with dm_conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE prospects
            ADD COLUMN IF NOT EXISTS sequence_stage          INT       DEFAULT 0,
            ADD COLUMN IF NOT EXISTS seq1_sent_at            TIMESTAMP,
            ADD COLUMN IF NOT EXISTS seq2_sent_at            TIMESTAMP,
            ADD COLUMN IF NOT EXISTS seq3_sent_at            TIMESTAMP,
            ADD COLUMN IF NOT EXISTS seq_clicked             BOOLEAN   DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS day1_scenario_question  TEXT,
            ADD COLUMN IF NOT EXISTS day1_industry           TEXT,
            ADD COLUMN IF NOT EXISTS day1_research_summary   TEXT,
            ADD COLUMN IF NOT EXISTS day1_email_body         TEXT
        """)                                                  # all 9 cols in one statement
        dm_conn.commit()                                      # commit schema change
    log.info("Sequence columns verified/added")

# ── FETCH QUEUES ──────────────────────────────────────────────────────────────
def fetch_stage_0(dm_conn, limit: int) -> list:
    """Return up to limit USA contacts with email who have not started the sequence."""
    with dm_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, first_name, email, job_title, job_title_normalized,
                   company_name, company_domain, linkedin_url, source_url
            FROM   prospects
            WHERE  country         = %s                       -- USA only
              AND  email           IS NOT NULL AND email != '' -- must have email
              AND  sequence_stage  = 0                        -- not started yet
            ORDER  BY confidence_score DESC, id               -- highest confidence first
            LIMIT  %s
        """, (TARGET_COUNTRY, limit))
        return [dict(r) for r in cur.fetchall()]              # list of row dicts

def fetch_stage_1(dm_conn, limit: int) -> list:
    """Return contacts who got Day 1, no click, 4+ days ago — ready for Day 4 send."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=SEQ_2_AFTER_DAYS)  # 4 days ago
    with dm_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, first_name, email, day1_scenario_question
            FROM   prospects
            WHERE  country                = %s
              AND  email                  IS NOT NULL AND email != ''
              AND  sequence_stage         = 1                 -- got Day 1
              AND  seq1_sent_at          <= %s                -- waited long enough
              AND  seq_clicked            = FALSE             -- no click yet
              AND  day1_scenario_question IS NOT NULL         -- must have stored scenario
            ORDER  BY seq1_sent_at ASC                        -- oldest first
            LIMIT  %s
        """, (TARGET_COUNTRY, cutoff, limit))
        return [dict(r) for r in cur.fetchall()]

def fetch_stage_2(dm_conn, limit: int) -> list:
    """Return contacts who got Day 4, no click, 5+ days ago — ready for Day 9 send."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=SEQ_3_AFTER_DAYS)  # 5 days ago
    with dm_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, first_name, email, day1_scenario_question
            FROM   prospects
            WHERE  country                = %s
              AND  email                  IS NOT NULL AND email != ''
              AND  sequence_stage         = 2                 -- got Day 4
              AND  seq2_sent_at          <= %s                -- waited long enough
              AND  seq_clicked            = FALSE             -- no click yet
              AND  day1_scenario_question IS NOT NULL         -- must have stored scenario
            ORDER  BY seq2_sent_at ASC
            LIMIT  %s
        """, (TARGET_COUNTRY, cutoff, limit))
        return [dict(r) for r in cur.fetchall()]

# ── CLAUDE HELPERS ────────────────────────────────────────────────────────────
def fill_prompt(template: str, **values) -> str:
    """Replace {{key}} placeholders in prompt with actual values."""
    result = template
    for key, val in values.items():                           # iterate substitution pairs
        result = result.replace(f"{{{{{key}}}}}", str(val))  # replace {{key}} with value
    return result                                             # return filled prompt

def claude_call(prompt: str, retries: int = 2) -> str | None:
    """
    Send a prompt to Claude and return the response text.
    Retries up to `retries` times on failure. Returns None if all attempts fail.
    """
    client = anthropic.Anthropic(api_key=os.environ[ANTHROPIC_KEY_ENV])  # create client
    for attempt in range(1, retries + 2):                     # 1 attempt + retries
        try:
            message = client.messages.create(
                model      = CLAUDE_MODEL,                    # claude-sonnet-4-6
                max_tokens = 1000,                            # enough for research + email
                messages   = [{"role": "user", "content": prompt}]  # single-turn
            )
            return message.content[0].text                    # success — return text
        except Exception as exc:
            log.warning("Claude API attempt %d/%d failed: %s", attempt, retries + 1, exc)
            if attempt <= retries:                            # more attempts left
                time.sleep(5)                                 # brief pause before retry
    return None                                               # all attempts exhausted

def parse_subject_and_body(text: str) -> tuple[str, str] | None:
    """
    Extract subject line and email body from Claude's output.
    Tries multiple patterns to handle variation in Claude's formatting.
    Returns (subject, body) or None if parsing fails.
    """
    # Extract subject — try with and without bold/markdown
    subject_match = re.search(
        r"(?:\*\*)?Subject Line:?(?:\*\*)?\s*(.+?)(?:\n|$)", text, re.IGNORECASE
    )
    if not subject_match:                                     # no subject found
        log.warning("Could not parse subject. Response head: %s", text[:200])
        return None
    subject = subject_match.group(1).strip().strip("*").strip()  # clean markdown artifacts

    # Extract email body — try "Email:\n", "Email Body:\n", or fall back to "Hi "
    email_match = (
        re.search(r"(?:^|\n)(?:\*\*)?Email(?:\s+Body)?:?(?:\*\*)?\s*\n(.*)", text, re.IGNORECASE | re.DOTALL)
        or re.search(r"(Hi\s+\w+,.*)", text, re.DOTALL)      # fallback: find "Hi Name," start
    )
    if not email_match:                                       # nothing found
        log.warning("Could not parse email body. Response head: %s", text[:200])
        return None
    body = email_match.group(1).strip()                       # clean body

    return subject, body                                      # return pair

# ── DAY 1 GENERATOR ───────────────────────────────────────────────────────────
def generate_day1_email(contact: dict) -> dict | None:
    """
    Generate a personalised Day 1 email for this contact.
    Returns a dict with subject, body, scenario_question, industry, research_summary,
    or None if generation or parsing fails.
    """
    # Build extra company data string from available DB fields
    extra = []
    if contact.get("source_url"):                             # URL where we found them
        extra.append(f"Found at: {contact['source_url']}")
    company_data_str = ", ".join(extra) if extra else "none"  # combine extras

    # Fill Day 1 prompt with this contact's data
    filled = fill_prompt(
        DAY1_PROMPT,
        company_name  = contact.get("company_domain", ""),    # domain as company name hint
        website       = f"https://{contact.get('company_domain', '')}",  # full URL
        prospect_name = contact.get("first_name", ""),        # first name
        title         = contact.get("job_title", ""),         # full job title
        linkedin      = contact.get("linkedin_url") or "not available",  # LinkedIn or none
        company_data  = company_data_str,                     # extra data
    )

    text = claude_call(filled)                                # call Claude
    if not text:                                              # API failure
        return None

    parsed = parse_subject_and_body(text)                     # extract subject + body
    if not parsed:                                            # parsing failure
        return None
    subject, body = parsed

    # Extract scenario question from Research Summary
    sq_match = re.search(r"\*\s*Scenario Question:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    scenario_question = sq_match.group(1).strip() if sq_match else ""  # e.g. "What's our..."

    # Extract industry from Research Summary
    ind_match = re.search(r"\*\s*Industry:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    industry = ind_match.group(1).strip() if ind_match else ""  # e.g. "SaaS / Ad-Tech"

    # Extract full research summary block (everything between "Research Summary:" and "Subject Line:")
    rs_match = re.search(r"Research Summary:(.*?)Subject Line:", text, re.IGNORECASE | re.DOTALL)
    research_summary = rs_match.group(1).strip() if rs_match else ""  # full summary text

    return {                                                  # return all parsed fields
        "subject":           subject,
        "body":              body,
        "scenario_question": scenario_question,
        "industry":          industry,
        "research_summary":  research_summary,
    }

# ── DAY 4 GENERATOR ───────────────────────────────────────────────────────────
def generate_day4_email(contact: dict) -> tuple[str, str]:
    """
    Build Day 4 follow-up from fixed template — no Claude call.
    Uses stored scenario question from Day 1. Returns (subject, body).
    """
    scenario = contact.get("day1_scenario_question") or ""    # scenario stored at Day 1
    body = DAY4_BODY.replace("{first_name}", contact.get("first_name", "there"))  # fill name
    body = body.replace("{scenario_question}", scenario)      # fill scenario question
    return DAY4_SUBJECT, body                                 # fixed subject + filled body

# ── DAY 9 GENERATOR ───────────────────────────────────────────────────────────
def generate_day9_email(contact: dict) -> tuple[str, str]:
    """
    Build Day 9 close-out from fixed template — no Claude call.
    Uses stored scenario question from Day 1. Returns (subject, body).
    """
    scenario = contact.get("day1_scenario_question") or ""    # scenario stored at Day 1
    body = DAY9_BODY.replace("{first_name}", contact.get("first_name", "there"))  # fill name
    body = body.replace("{scenario_question}", scenario)      # fill scenario question
    return DAY9_SUBJECT, body                                 # fixed subject + filled body

# ── HTML RENDERER ─────────────────────────────────────────────────────────────
def render_html(body: str, to_email: str) -> str:
    """
    Convert plain-text email body to clean HTML.
    Converts URLs to clickable links and appends CAN-SPAM unsubscribe footer.
    """
    # Convert plain-text URLs to HTML anchor tags — longest first to avoid double-replacing
    body = body.replace(
        "linkedin.com/company/tech-cloud-pro",
        '<a href="https://www.linkedin.com/company/tech-cloud-pro" style="color:#1a1a1a;">linkedin.com/company/tech-cloud-pro</a>'
    )
    body = body.replace(
        "techcloudpro.com",
        '<a href="https://www.techcloudpro.com" style="color:#1a1a1a;">techcloudpro.com</a>'
    )
    body = body.replace(
        "artha.build",
        '<a href="https://artha.build" style="color:#1a1a1a;">artha.build</a>'
    )

    # CAN-SPAM compliant unsubscribe footer
    unsub = (
        f'<p style="margin:32px 0 0 0;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px;">'
        f'You are receiving this because you work in a NetSuite environment. '
        f'To stop receiving these emails, reply with "Unsubscribe" or '
        f'<a href="mailto:sara@techcloudpro.com?subject=Unsubscribe&body=Please remove {to_email} from your list" '
        f'style="color:#999;">click here</a>.'
        f'</p>'
    )

    # Wrap body in minimal HTML — personal-looking, not marketing-blast style
    html = (
        '<!DOCTYPE html>'
        '<html><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.8;'
        'color:#111;max-width:600px;margin:0 auto;padding:24px 20px;">'
        + "".join(
            f"<p style='margin:0 0 14px 0;'>{line}</p>"
            for line in body.split("\n\n") if line.strip()   # one <p> per blank-line block
        )
        + unsub
        + '</body></html>'
    )
    return html

# ── SEND VIA RESEND ───────────────────────────────────────────────────────────
def send_email(to_email: str, subject: str, html: str) -> bool:
    """Send one email via Resend API. Returns True on success."""
    resend_key = os.environ[RESEND_KEY_ENV]                   # pull key from env
    payload = {
        "from":    f"{SENDER_NAME} <{SENDER_EMAIL}>",         # sender display + address
        "to":      [to_email],                                # recipient
        "subject": subject,                                   # subject line
        "html":    html,                                      # rendered HTML body
    }
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=30                                        # 30 second timeout
        )
        if resp.status_code == 200:                           # success
            return True
        log.warning("Resend error %d: %s", resp.status_code, resp.text[:120])
        return False
    except Exception as exc:
        log.warning("Resend exception: %s", exc)
        return False

# ── LOG TO MAIN DB ────────────────────────────────────────────────────────────
def log_send(main_conn, to_email: str, subject: str, sequence_step: int):
    """Insert a send record into email_logs in main brandmonkz_crm DB."""
    with main_conn.cursor() as cur:
        cur.execute("""
            INSERT INTO email_logs
                (id, status, "sentAt", "fromEmail", "toEmail", "serverUsed",
                 "totalOpens", "totalClicks", "uniqueOpens", "uniqueClicks",
                 metadata)
            VALUES
                (%s, 'SENT', NOW(), %s, %s, 'resend', 0, 0, 0, 0, %s)
            ON CONFLICT DO NOTHING
        """, (
            str(uuid.uuid4()),                                # unique row ID
            SENDER_EMAIL,                                     # fromEmail
            to_email,                                         # toEmail
            psycopg2.extras.Json({"campaign": "netsuite_dm", "sequence_step": sequence_step})
        ))
        main_conn.commit()                                    # commit immediately

# ── ADVANCE SEQUENCE STAGE ────────────────────────────────────────────────────
def advance_stage(dm_conn, prospect_id: int, stage: int, day1_data: dict = None):
    """
    Bump sequence_stage and stamp the sent timestamp.
    For stage 1 only, pass day1_data dict to store scenario/industry/summary/body.
    """
    now = datetime.now(timezone.utc)                          # current UTC timestamp
    col = {1: "seq1_sent_at", 2: "seq2_sent_at", 3: "seq3_sent_at"}[stage]  # timestamp col

    if stage == 1 and day1_data:                              # stage 1 — store Day 1 fields
        with dm_conn.cursor() as cur:
            cur.execute(f"""
                UPDATE prospects
                SET    sequence_stage         = %s,
                       {col}                  = %s,
                       day1_scenario_question = %s,
                       day1_industry          = %s,
                       day1_research_summary  = %s,
                       day1_email_body        = %s,
                       updated_at             = NOW()
                WHERE  id = %s
            """, (
                stage,
                now,
                day1_data.get("scenario_question", ""),       # store for Day 4/9 use
                day1_data.get("industry", ""),                 # store for Day 4/9 use
                day1_data.get("research_summary", ""),         # store for Day 4/9 use
                day1_data.get("body", ""),                     # store Day 1 email text
                prospect_id
            ))
            dm_conn.commit()
    else:                                                     # stage 2 or 3 — simple bump
        with dm_conn.cursor() as cur:
            cur.execute(f"""
                UPDATE prospects
                SET    sequence_stage = %s,
                       {col}          = %s,
                       updated_at     = NOW()
                WHERE  id = %s
            """, (stage, now, prospect_id))
            dm_conn.commit()

# ── TEST DAY 1 ONLY ───────────────────────────────────────────────────────────
def run_test_day1():
    """
    Send a single Day 1 email to TEST_EMAIL for rapid iteration.
    Use python3 scripts/netsuite-dm-campaign.py --test-day1
    No gap. No Day 4/9. Just the Claude-generated Day 1 email.
    """
    log.info("=" * 60)
    log.info("TEST-DAY1 — single Day 1 email → %s", TEST_EMAIL)
    log.info("Claude model: %s", CLAUDE_MODEL)
    log.info("=" * 60)

    contact = {                                               # CFO at Viant — consistent test contact
        "first_name":   "Michael",
        "email":        TEST_EMAIL,
        "job_title":    "Chief Financial Officer",
        "company_domain": "viantinc.com",
        "linkedin_url": None,
        "source_url":   "https://viantinc.com/about-us",
    }

    log.info("Generating Day 1 email via Claude for %s @ %s...",
             contact["job_title"], contact["company_domain"])
    result = generate_day1_email(contact)                     # Claude API call

    if not result:
        log.error("Generation FAILED — check ANTHROPIC_API_KEY in .env")
        return

    html = render_html(result["body"], TEST_EMAIL)            # render HTML
    log.info("Subject  : %s", result["subject"])
    log.info("Scenario : %s", result["scenario_question"])
    log.info("Body preview:\n%s", result["body"][:300])       # first 300 chars of body
    ok = send_email(TEST_EMAIL, result["subject"], html)      # send via Resend
    log.info("→ %s", "SENT OK" if ok else "FAILED")
    log.info("=" * 60)

# ── TEST MODE ─────────────────────────────────────────────────────────────────
def run_test_mode():
    """
    Send exactly 3 emails to TEST_EMAIL — one per sequence stage.
    Email 1: Day 1 — Claude-personalized for a CFO at a real company (Viant)
    Email 2: Day 4 — Fixed template using the scenario question from Email 1
    Email 3: Day 9 — Fixed close-out using the same scenario question
    No DB reads or writes.
    """
    log.info("=" * 60)
    log.info("TEST MODE — 3 emails (Day1 / Day4 / Day9) → %s", TEST_EMAIL)
    log.info("Claude model: %s (Day1 only — Day4/9 are fixed templates)", CLAUDE_MODEL)
    log.info("=" * 60)

    # Single test contact — CFO at a known NetSuite company
    contact = {
        "first_name":   "Michael",
        "email":        TEST_EMAIL,
        "job_title":    "Chief Financial Officer",
        "company_domain": "viantinc.com",                     # Viant Technology (ad-tech/SaaS)
        "linkedin_url": None,
        "source_url":   "https://viantinc.com/about-us",
    }

    # ── Email 1 — Day 1 via Claude ───────────────────────────────────────────
    log.info("[TEST 1/3] Day 1 — generating via Claude for %s @ %s",
             contact["job_title"], contact["company_domain"])
    result = generate_day1_email(contact)                     # Claude API call
    if not result:
        log.error("  Day1 generation FAILED — check ANTHROPIC_API_KEY in .env")
        return                                                # can't continue without scenario

    html1 = render_html(result["body"], TEST_EMAIL)           # convert to HTML
    log.info("  Subject : %s", result["subject"])
    log.info("  Scenario: %s", result["scenario_question"])
    ok1 = send_email(TEST_EMAIL, result["subject"], html1)    # send via Resend
    log.info("  → %s", "SENT OK" if ok1 else "FAILED")

    # Build follow-up contact with stored Day 1 data
    followup_contact = {
        **contact,                                            # copy base contact fields
        "day1_scenario_question": result["scenario_question"],  # scenario for Day4/9 templates
    }

    gap = random.randint(MIN_GAP, MAX_GAP)                    # 3-5 min gap
    log.info("  Waiting %d min %d sec...", gap // 60, gap % 60)
    time.sleep(gap)

    # ── Email 2 — Day 4 fixed template ───────────────────────────────────────
    log.info("[TEST 2/3] Day 4 — fixed template with stored scenario")
    subject4, body4 = generate_day4_email(followup_contact)   # template fill, no Claude
    html4 = render_html(body4, TEST_EMAIL)                    # convert to HTML
    log.info("  Subject: %s", subject4)
    ok4 = send_email(TEST_EMAIL, subject4, html4)             # send via Resend
    log.info("  → %s", "SENT OK" if ok4 else "FAILED")

    gap = random.randint(MIN_GAP, MAX_GAP)
    log.info("  Waiting %d min %d sec...", gap // 60, gap % 60)
    time.sleep(gap)

    # ── Email 3 — Day 9 fixed close-out ──────────────────────────────────────
    log.info("[TEST 3/3] Day 9 — fixed close-out with same scenario")
    subject9, body9 = generate_day9_email(followup_contact)   # template fill, no Claude
    html9 = render_html(body9, TEST_EMAIL)                    # convert to HTML
    log.info("  Subject: %s", subject9)
    ok9 = send_email(TEST_EMAIL, subject9, html9)             # send via Resend
    log.info("  → %s", "SENT OK" if ok9 else "FAILED")

    log.info("=" * 60)
    log.info("TEST COMPLETE — check %s for 3 emails", TEST_EMAIL)
    log.info("Email 1: Day1 (Claude personalised) | Email 2: Day4 follow-up | Email 3: Day9 close-out")
    log.info("Verify: scenario question consistent across all 3 | links clickable | unsubscribe present")
    log.info("=" * 60)

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")   # today's date for logging

    if TEST_DAY1:                                             # --test-day1: single Day 1 email only
        run_test_day1()
        return

    if TEST_MODE:                                             # --test: full 3-email sequence
        run_test_mode()
        return

    log.info("=" * 60)
    log.info("NetSuite DM Campaign — %s", today)
    log.info("Sender: %s <%s>", SENDER_NAME, SENDER_EMAIL)
    log.info("Max per day: %d | Gap: %d-%d min | Model: %s",
             PER_DAY_MAX, MIN_GAP // 60, MAX_GAP // 60, CLAUDE_MODEL)
    log.info("=" * 60)

    # Connect to both databases
    main_conn = psycopg2.connect(os.environ[MAIN_DB_KEY].replace("?schema=public", ""))  # main CRM
    dm_conn   = psycopg2.connect(DM_DB_URL)                  # DM pipeline DB

    ensure_sequence_columns(dm_conn)                         # add columns if first run

    sent_today = 0                                            # count of sends this run
    remaining  = PER_DAY_MAX                                  # quota remaining

    # Fetch all 3 queues upfront
    q0 = fetch_stage_0(dm_conn, remaining)                    # Day 1 — never emailed
    q1 = fetch_stage_1(dm_conn, remaining)                    # Day 4 — no click after 4 days
    q2 = fetch_stage_2(dm_conn, remaining)                    # Day 9 — no click after 5 more days

    log.info("Queue — Day1: %d | Day4: %d | Day9: %d | Daily cap: %d",
             len(q0), len(q1), len(q2), PER_DAY_MAX)

    # ── Day 9 first (waited longest) ──────────────────────────────────────────
    for c in q2:
        if sent_today >= PER_DAY_MAX:                         # daily cap
            break
        subject, body = generate_day9_email(c)               # template fill — no Claude call
        html = render_html(body, c["email"])                  # render HTML
        log.info("[Day9] %s → %s | Subject: %s", c["first_name"], c["email"], subject)
        if send_email(c["email"], subject, html):
            log_send(main_conn, c["email"], subject, 3)       # log to main DB
            advance_stage(dm_conn, c["id"], 3)                # mark stage 3 complete
            sent_today += 1
            log.info("  → Sent seq3 | Total today: %d", sent_today)
            if sent_today < PER_DAY_MAX:
                gap = random.randint(MIN_GAP, MAX_GAP)
                log.info("  Waiting %d min %d sec...", gap // 60, gap % 60)
                time.sleep(gap)

    # ── Day 4 ─────────────────────────────────────────────────────────────────
    for c in q1:
        if sent_today >= PER_DAY_MAX:
            break
        subject, body = generate_day4_email(c)               # template fill — no Claude call
        html = render_html(body, c["email"])                  # render HTML
        log.info("[Day4] %s → %s | Subject: %s", c["first_name"], c["email"], subject)
        if send_email(c["email"], subject, html):
            log_send(main_conn, c["email"], subject, 2)
            advance_stage(dm_conn, c["id"], 2)
            sent_today += 1
            log.info("  → Sent seq2 | Total today: %d", sent_today)
            if sent_today < PER_DAY_MAX:
                gap = random.randint(MIN_GAP, MAX_GAP)
                log.info("  Waiting %d min %d sec...", gap // 60, gap % 60)
                time.sleep(gap)

    # ── Day 1 — Claude generates unique email per contact ─────────────────────
    for c in q0:
        if sent_today >= PER_DAY_MAX:
            break
        log.info("[Day1] Generating for %s (%s) @ %s",
                 c["first_name"], c["job_title"], c["email"])
        result = generate_day1_email(c)                       # Claude Day 1 call
        if not result:
            log.warning("  Day1 generation failed for %s — skipping", c["email"])
            continue
        html = render_html(result["body"], c["email"])        # render HTML
        if send_email(c["email"], result["subject"], html):
            log_send(main_conn, c["email"], result["subject"], 1)
            advance_stage(dm_conn, c["id"], 1, day1_data=result)  # store scenario/industry
            sent_today += 1
            log.info("  → Sent seq1 | Subject: %s | Total today: %d",
                     result["subject"], sent_today)
            if sent_today < PER_DAY_MAX:
                gap = random.randint(MIN_GAP, MAX_GAP)
                log.info("  Waiting %d min %d sec...", gap // 60, gap % 60)
                time.sleep(gap)

    # ── Summary ───────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("Campaign run complete — %s", today)
    log.info("Total sent today: %d / %d", sent_today, PER_DAY_MAX)
    log.info("=" * 60)

    main_conn.close()                                         # close main CRM DB
    dm_conn.close()                                           # close DM DB

if __name__ == "__main__":
    main()
