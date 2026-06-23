#!/usr/bin/env python3
"""
NetSuite DM Campaign — 9-Day 3-Touch Sequence
================================================
Sends persona-routed cold email sequence to 181 USA decision makers
at confirmed NetSuite companies from decision_makers_netsuite.prospects.

Sequence:
  Day 1  — Main angle per persona (all stage-0 contacts)
  Day 4  — Swapped angle (contacts at stage-1 with no click, 4+ days ago)
  Day 9  — Breakup email (contacts at stage-2 with no click, 5+ days ago)

Sender: Sara Mitchell only (sara@techcloudpro.com) — batch 1 lock.
Rules:  75 emails/day max | 3–5 min gap | start 14:00 UTC | no phones.
"""

from __future__ import annotations
import os, sys, time, random, logging, requests, psycopg2, psycopg2.extras, uuid
from pathlib  import Path
from datetime import datetime, timedelta, timezone

# ── TEST MODE ─────────────────────────────────────────────────────────────────
# Run with --test to send all 4 persona Day-1 emails to TEST_EMAIL only.
# Nothing is written to DB. Use to verify rendering, sender name, and gaps.
TEST_MODE      = "--test" in sys.argv                        # enabled with --test flag
TEST_EMAIL     = "rajesh@techcloudpro.com"                   # all test emails go here

# ── CONFIG ────────────────────────────────────────────────────────────────────
ENV_FILE     = Path("/var/www/crm-backend/.env")            # environment variables file
DM_DB_URL    = "postgresql://brandmonkz:BrandMonkz2024SecureDB@brandmonkz-crm-db-restored.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/decision_makers_netsuite"  # DM pipeline DB
MAIN_DB_KEY  = "DATABASE_URL"                               # key for main CRM DB in .env
RESEND_KEY   = "RESEND_API_KEY"                             # key for Resend API in .env
TRACKING_URL = "https://brandmonkz.com"                     # base URL for click/open tracking

SENDER_NAME  = "Sara Mitchell"                              # BATCH 1: locked to Sara only
SENDER_EMAIL = "sara@techcloudpro.com"                     # Sara's sending address

PER_DAY_MAX  = 75                                           # hard cap on sends per day
MIN_GAP      = 3 * 60                                       # minimum 3 minutes between emails
MAX_GAP      = 5 * 60                                       # maximum 5 minutes between emails

# Days to wait between sequence steps
SEQ_2_AFTER_DAYS = 4                                        # send Email 2 if no reply after 4 days
SEQ_3_AFTER_DAYS = 5                                        # send Email 3 if no reply after 5 more days

# Country targeting (USA only for this campaign)
TARGET_COUNTRY = "USA"

LOG_FILE = Path("/var/www/crm-backend/logs/netsuite-dm-campaign.log")  # log output path

# ── PERSONA ROUTING ───────────────────────────────────────────────────────────
# Map normalized job titles to persona numbers (1–4)
PERSONA_MAP = {
    "CFO":               1,   # persona 1 — peer proof angle
    "CEO":               2,   # persona 2 — challenger angle
    "Founder":           2,   # persona 2 — CEO/Founder group
    "Co-Founder":        2,   # persona 2 — CEO/Founder group
    "Controller":        3,   # persona 3 — specific pain angle
    "COO":               3,   # persona 3 — in the weeds group
    "Owner":             3,   # persona 3 — in the weeds group
    "Managing Partner":  3,   # persona 3 — in the weeds group
    "Finance Director":  3,   # persona 3 — in the weeds group
    "VP Finance":        3,   # persona 3 — in the weeds group
    "VP Operations":     3,   # persona 3 — in the weeds group
    "Operations Director": 3, # persona 3 — in the weeds group
    "Head of Finance":   3,   # persona 3 — in the weeds group
    "CIO":               3,   # persona 3 — in the weeds group
    "CTO":               4,   # persona 4 — integration/technical angle
}
PERSONA_DEFAULT = 3           # fallback persona for unrecognised titles

# ── EMAIL COPY ────────────────────────────────────────────────────────────────
# 4 personas × 3 emails = 12 templates
# Each entry: subject + body (plain text, under 80 words)
# {first_name} is the only placeholder used

EMAILS = {

    # ── PERSONA 1 — CFO ───────────────────────────────────────────────────────
    (1, 1): {
        "subject": "What their CFO stopped doing on month 7",
        "body": """Hi {first_name},

A CFO at a $52M distribution company was still rebuilding their board deck from scratch every quarter. Three analysts. Two days of reconciliation on numbers already in NetSuite.

Month 7 with artha.build: they pull the board deck directly from NetSuite in 40 minutes, model any scenario the board might ask in the same call, and close the quarter without a single export file touching their team's inbox.

Through artha.build your data is stored locally. Nothing leaves your NetSuite environment.

Register free at artha.build, or reply "demo" and I'll send you slots, no deck, no commitment.

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },
    (1, 2): {
        "subject": "The version that wasn't actually final",
        "body": """Hi {first_name},

Someone on your team sent a file labeled "FINAL" last close. It wasn't.

Here's what the same team looks like after: one version of every report, always current, living inside NetSuite, not exported or emailed around. Reconciliation time drops from two days to under an hour. The board sees numbers that come from one source, not three people's best guess.

Through artha.build your data is stored locally. Nothing leaves your NetSuite environment.

Register free at artha.build, or reply "demo" and I'll send you slots, no deck, no commitment.

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },
    (1, 3): {
        "subject": "closing this out",
        "body": """Hi {first_name},

Not a fit? Or bad timing?

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },

    # ── PERSONA 2 — CEO / FOUNDER ─────────────────────────────────────────────
    (2, 1): {
        "subject": "You asked for a number. It came back two days later.",
        "body": """Hi {first_name},

You asked your finance team for last quarter's margin. They came back the next afternoon.

A founder I know at a $35M SaaS company was in the same position until month 6. Now he asks "what's our runway if we miss plan by 15%" and gets the answer in 9 minutes, live, without pulling a single analyst off something else. The question becomes the analysis.

Through artha.build your data is stored locally. Nothing leaves your NetSuite environment.

Register free at artha.build, or reply "demo" and I'll send you slots, no deck, no commitment.

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },
    (2, 2): {
        "subject": "Their CEO got the answer in 9 minutes",
        "body": """Hi {first_name},

Most CEOs don't know how long their finance team spends just getting numbers into a format they can use.

A founder I mentioned runs a $35M SaaS company. Before: two days to model a single scenario. After: 9 minutes. Because the model runs against live NetSuite data, not a two-day-old export. He uses the time he saves to run more scenarios, not fewer.

Through artha.build your data is stored locally. Nothing leaves your NetSuite environment.

Register free at artha.build, or reply "demo" and I'll send you slots, no deck, no commitment.

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },
    (2, 3): {
        "subject": "one last thing",
        "body": """Hi {first_name},

Should I leave you alone, or is the timing just off?

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },

    # ── PERSONA 3 — CONTROLLER / COO / OWNER ─────────────────────────────────
    (3, 1): {
        "subject": "6 people. 4 spreadsheets. One \"final\" that wasn't.",
        "body": """Hi {first_name},

It's the 2nd of the month. NetSuite has the data. But the close report is in four different files, owned by three different people, and none of them match yet.

A controller I worked with had the same setup. After: one report, inside NetSuite, no spreadsheet layer. Close time dropped by six hours. The errors that used to come from reconciling versions disappeared. One version, no reconciliation needed.

Through artha.build your data is stored locally. Nothing leaves your NetSuite environment.

Register free at artha.build, or reply "demo" and I'll send you slots, no deck, no commitment.

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },
    (3, 2): {
        "subject": "The thing most NetSuite teams get wrong about month-end",
        "body": """Hi {first_name},

Most finance teams treat NetSuite as the ledger and Excel as the reporting layer. That split is where close errors happen, version chaos starts, and hours disappear.

The teams that fixed it didn't add more process. They moved reporting back inside the system. Close time came back. Audit trails lived with the data. Month-end numbers stopped needing a second round of corrections.

Through artha.build your data is stored locally. Nothing leaves your NetSuite environment.

Register free at artha.build, or reply "demo" and I'll send you slots, no deck, no commitment.

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },
    (3, 3): {
        "subject": "Should I stop?",
        "body": """Hi {first_name},

Not the right time? Or not a fit?

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },

    # ── PERSONA 4 — CTO ───────────────────────────────────────────────────────
    (4, 1): {
        "subject": "One more tool that touches your NetSuite. Or not.",
        "body": """Hi {first_name},

Every tool that connects to NetSuite becomes something your team owns later: access controls, API limits, data governance, eventual decommissioning.

artha.build is read-only OAuth. No write access, no data stored outside your environment, no new pipelines to maintain. Finance gets their reporting layer. Your team inherits zero new infrastructure. No more spreadsheet-debugging at 11pm before a board meeting.

Through artha.build your data is stored locally. Nothing leaves your NetSuite environment.

Register free at artha.build, or reply "demo" and I'll send you slots, no deck, no commitment.

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },
    (4, 2): {
        "subject": "What your finance team built instead",
        "body": """Hi {first_name},

When finance can't get data out of NetSuite cleanly, they build their own system. Usually a shared drive. Sometimes a Google Sheet with custom scripts. Always something that pages your team when it breaks at 11pm before a board meeting.

artha.build gives finance a reporting layer they own, without your team building or maintaining a pipeline. The shadow system disappears. And you get that 11pm page back.

Through artha.build your data is stored locally. Nothing leaves your NetSuite environment.

Register free at artha.build, or reply "demo" and I'll send you slots, no deck, no commitment.

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },
    (4, 3): {
        "subject": "Closing this thread",
        "body": """Hi {first_name},

Wrong time. Wrong problem. Or just not your call?

Sara Mitchell
NetSuite Consultant · TechCloudPro
artha.build · techcloudpro.com · linkedin.com/company/tech-cloud-pro"""
    },
}

# ── LOGGING ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),                   # print to terminal
        logging.FileHandler(str(LOG_FILE), mode="a"),        # append to log file
    ]
)
log = logging.getLogger(__name__)

# ── ENV LOADER ────────────────────────────────────────────────────────────────
def load_env():
    """Load .env file into os.environ."""
    for line in ENV_FILE.read_text().splitlines():            # each line in .env
        line = line.strip()                                   # strip whitespace
        if line and not line.startswith("#") and "=" in line: # skip blanks and comments
            k, _, v = line.partition("=")                    # split on first =
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))  # set if not set

load_env()

# ── DB SETUP — add sequence columns if missing ────────────────────────────────
def ensure_sequence_columns(dm_conn):
    """Add sequence tracking columns to prospects table if they don't exist yet."""
    with dm_conn.cursor() as cur:
        # sequence_stage: 0=not started, 1=email1 sent, 2=email2 sent, 3=complete
        cur.execute("""
            ALTER TABLE prospects
            ADD COLUMN IF NOT EXISTS sequence_stage    INT       DEFAULT 0,
            ADD COLUMN IF NOT EXISTS seq1_sent_at      TIMESTAMP,
            ADD COLUMN IF NOT EXISTS seq2_sent_at      TIMESTAMP,
            ADD COLUMN IF NOT EXISTS seq3_sent_at      TIMESTAMP,
            ADD COLUMN IF NOT EXISTS persona           INT,
            ADD COLUMN IF NOT EXISTS seq_clicked       BOOLEAN   DEFAULT FALSE
        """)
        dm_conn.commit()                                      # commit schema change
    log.info("Sequence columns verified/added")

# ── PERSONA RESOLVER ──────────────────────────────────────────────────────────
def get_persona(job_title_normalized: str | None) -> int:
    """Map normalized job title to persona number (1–4)."""
    if not job_title_normalized:                             # unknown title
        return PERSONA_DEFAULT                               # default to persona 3
    return PERSONA_MAP.get(job_title_normalized, PERSONA_DEFAULT)  # look up or default

# ── FETCH CONTACTS FOR TODAY ───────────────────────────────────────────────────
def fetch_stage_0(dm_conn, limit: int) -> list:
    """Stage 0: all USA contacts with email who haven't entered sequence yet."""
    with dm_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, first_name, email, job_title_normalized
            FROM   prospects
            WHERE  country = %s                             -- USA only
              AND  email   IS NOT NULL AND email != ''      -- must have email
              AND  sequence_stage = 0                       -- not yet started
            ORDER  BY confidence_score DESC, id
            LIMIT  %s
        """, (TARGET_COUNTRY, limit))
        return [dict(r) for r in cur.fetchall()]            # return as list of dicts

def fetch_stage_1(dm_conn, limit: int) -> list:
    """Stage 1: contacts who got Email 1, no click, 4+ days ago → send Email 2."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=SEQ_2_AFTER_DAYS)  # 4 days ago
    with dm_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, first_name, email, job_title_normalized, persona
            FROM   prospects
            WHERE  country         = %s
              AND  email           IS NOT NULL AND email != ''
              AND  sequence_stage  = 1                      -- got email 1
              AND  seq1_sent_at   <= %s                     -- at least 4 days ago
              AND  seq_clicked     = FALSE                  -- no click (not engaged yet)
            ORDER  BY seq1_sent_at ASC
            LIMIT  %s
        """, (TARGET_COUNTRY, cutoff, limit))
        return [dict(r) for r in cur.fetchall()]

def fetch_stage_2(dm_conn, limit: int) -> list:
    """Stage 2: contacts who got Email 2, no click, 5+ days ago → send Email 3."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=SEQ_3_AFTER_DAYS)  # 5 days ago
    with dm_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, first_name, email, job_title_normalized, persona
            FROM   prospects
            WHERE  country         = %s
              AND  email           IS NOT NULL AND email != ''
              AND  sequence_stage  = 2                      -- got email 2
              AND  seq2_sent_at   <= %s                     -- at least 5 days ago
              AND  seq_clicked     = FALSE                  -- no click
            ORDER  BY seq2_sent_at ASC
            LIMIT  %s
        """, (TARGET_COUNTRY, cutoff, limit))
        return [dict(r) for r in cur.fetchall()]

# ── RENDER EMAIL ──────────────────────────────────────────────────────────────
def render(template: dict, first_name: str, to_email: str) -> tuple[str, str]:
    """Replace {first_name} placeholder in subject and body. Returns (subject, html)."""
    subject = template["subject"].replace("{first_name}", first_name)  # fill subject
    body    = template["body"].replace("{first_name}", first_name)      # fill body

    # Convert plain-text URLs to clickable HTML links (order matters — longest first)
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

    # Unsubscribe footer — small, plain, CAN-SPAM compliant
    unsub = (
        f'<p style="margin:32px 0 0 0;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px;">'
        f'You are receiving this because you work in a NetSuite environment. '
        f'To stop receiving these emails, reply with "Unsubscribe" or '
        f'<a href="mailto:sara@techcloudpro.com?subject=Unsubscribe&body=Please remove {to_email} from your list" '
        f'style="color:#999;">click here</a>.'
        f'</p>'
    )

    # Wrap in minimal HTML — looks personal, not marketing
    html = (
        '<!DOCTYPE html>'
        '<html><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.8;'
        'color:#111;max-width:600px;margin:0 auto;padding:24px 20px;">'
        + "".join(
            f"<p style='margin:0 0 14px 0;'>{line}</p>"
            for line in body.split("\n\n") if line.strip()
        )
        + unsub
        + '</body></html>'
    )
    return subject, html

# ── SEND VIA RESEND ───────────────────────────────────────────────────────────
def send_email(to_email: str, subject: str, html: str) -> bool:
    """Send one email via Resend API. Returns True on success."""
    resend_key = os.environ[RESEND_KEY]                      # get Resend API key
    payload = {
        "from":    f"{SENDER_NAME} <{SENDER_EMAIL}>",        # sender display name + address
        "to":      [to_email],                               # recipient
        "subject": subject,                                  # email subject
        "html":    html,                                     # HTML body
    }
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=30
        )
        if resp.status_code == 200:                          # success
            return True
        log.warning("Resend error %d: %s", resp.status_code, resp.text[:100])
        return False
    except Exception as exc:
        log.warning("Resend exception: %s", exc)
        return False

# ── LOG TO EMAIL_LOGS (main DB) ───────────────────────────────────────────────
def log_send(main_conn, to_email: str, subject: str, sequence_step: int):
    """Insert send record into email_logs in main brandmonkz_crm DB."""
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
            str(uuid.uuid4()),                               # unique ID
            SENDER_EMAIL,                                    # fromEmail
            to_email,                                        # toEmail
            psycopg2.extras.Json({"campaign": "netsuite_dm", "sequence_step": sequence_step})  # metadata
        ))
        main_conn.commit()                                   # commit log entry

# ── UPDATE PROSPECT STAGE ─────────────────────────────────────────────────────
def advance_stage(dm_conn, prospect_id: int, stage: int, persona: int):
    """Bump sequence_stage and record sent timestamp for this stage."""
    now = datetime.now(timezone.utc)                         # current UTC time
    col = {1: "seq1_sent_at", 2: "seq2_sent_at", 3: "seq3_sent_at"}[stage]  # which timestamp col
    with dm_conn.cursor() as cur:
        cur.execute(f"""
            UPDATE prospects
            SET    sequence_stage = %s,
                   {col}          = %s,
                   persona        = COALESCE(persona, %s),
                   updated_at     = NOW()
            WHERE  id = %s
        """, (stage, now, persona, prospect_id))
        dm_conn.commit()                                     # save immediately

# ── MAIN ──────────────────────────────────────────────────────────────────────
def run_test_mode():
    """
    TEST MODE — sends all 4 persona Day-1 emails to TEST_EMAIL.
    No DB reads or writes. Shows rendering, sender name, and gaps.
    """
    log.info("=" * 60)
    log.info("TEST MODE — all emails go to: %s", TEST_EMAIL)
    log.info("Checking: render, sender name, subject lines, gap timing")
    log.info("=" * 60)

    # Fake contacts for each persona — one per persona
    fake_contacts = [
        {"first_name": "Michael",  "persona": 1, "label": "CFO"},        # persona 1
        {"first_name": "Jennifer", "persona": 2, "label": "CEO/Founder"}, # persona 2
        {"first_name": "David",    "persona": 3, "label": "Controller"},  # persona 3
        {"first_name": "Sarah",    "persona": 4, "label": "CTO"},         # persona 4
    ]

    for i, c in enumerate(fake_contacts, 1):
        template      = EMAILS[(c["persona"], 1)]            # Day-1 email for this persona
        subject, html = render(template, c["first_name"], TEST_EMAIL)  # fill first name + unsub
        log.info("[TEST %d/4] Persona %d (%s) → %s", i, c["persona"], c["label"], TEST_EMAIL)
        log.info("  Subject: %s", subject)
        ok = send_email(TEST_EMAIL, subject, html)           # send to test email
        log.info("  → %s", "SENT OK" if ok else "FAILED")
        if i < len(fake_contacts):                           # gap between sends (not after last)
            gap = random.randint(MIN_GAP, MAX_GAP)           # 3–5 min gap
            log.info("  Waiting %d min %d sec before next...", gap//60, gap%60)
            time.sleep(gap)

    log.info("=" * 60)
    log.info("TEST COMPLETE — check rajesh@techcloudpro.com for 4 emails")
    log.info("Verify: plain text renders | sender shows Sara Mitchell | subjects correct")
    log.info("=" * 60)


def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")  # today's date string

    # Run test mode if --test flag passed
    if TEST_MODE:
        run_test_mode()                                       # send 4 test emails and exit
        return

    log.info("=" * 60)
    log.info("NetSuite DM Campaign — %s", today)
    log.info("Sender: %s <%s>", SENDER_NAME, SENDER_EMAIL)
    log.info("Max per day: %d | Gap: %d–%d min", PER_DAY_MAX, MIN_GAP//60, MAX_GAP//60)
    log.info("=" * 60)

    # Connect to both databases
    main_conn = psycopg2.connect(os.environ[MAIN_DB_KEY].replace("?schema=public", ""))
    dm_conn   = psycopg2.connect(DM_DB_URL)

    # Ensure sequence tracking columns exist
    ensure_sequence_columns(dm_conn)

    sent_today = 0                                           # count emails sent this run
    remaining  = PER_DAY_MAX                                 # how many more we can send today

    # ── Fetch all 3 stages' queues ─────────────────────────────────────────────
    q0 = fetch_stage_0(dm_conn, remaining)                   # Day 1 contacts
    q1 = fetch_stage_1(dm_conn, remaining)                   # Day 4 contacts
    q2 = fetch_stage_2(dm_conn, remaining)                   # Day 9 contacts

    log.info("Queue — Day1: %d | Day4: %d | Day9: %d | Daily cap: %d",
             len(q0), len(q1), len(q2), PER_DAY_MAX)

    # ── Process Day 9 (breakup) first — they've waited longest ────────────────
    for c in q2:
        if sent_today >= PER_DAY_MAX:                        # daily cap hit
            break
        persona     = c.get("persona") or get_persona(c["job_title_normalized"])
        template    = EMAILS.get((persona, 3))               # Email 3 for this persona
        if not template:                                     # safety check
            continue
        subject, html = render(template, c["first_name"], c["email"])  # fill placeholders
        log.info("[Day9 P%d] %s → %s", persona, c["first_name"], c["email"])
        if send_email(c["email"], subject, html):            # attempt send
            log_send(main_conn, c["email"], subject, 3)      # log to main DB
            advance_stage(dm_conn, c["id"], 3, persona)      # mark stage 3 complete
            sent_today += 1
            log.info("  → Sent seq3. Total today: %d", sent_today)
            if sent_today < PER_DAY_MAX:                     # more quota left
                gap = random.randint(MIN_GAP, MAX_GAP)       # random gap
                log.info("  Waiting %d min %d sec...", gap//60, gap%60)
                time.sleep(gap)                              # wait before next

    # ── Process Day 4 (follow-up) ──────────────────────────────────────────────
    for c in q1:
        if sent_today >= PER_DAY_MAX:
            break
        persona     = c.get("persona") or get_persona(c["job_title_normalized"])
        template    = EMAILS.get((persona, 2))               # Email 2 for this persona
        if not template:
            continue
        subject, html = render(template, c["first_name"], c["email"])
        log.info("[Day4 P%d] %s → %s", persona, c["first_name"], c["email"])
        if send_email(c["email"], subject, html):
            log_send(main_conn, c["email"], subject, 2)
            advance_stage(dm_conn, c["id"], 2, persona)
            sent_today += 1
            log.info("  → Sent seq2. Total today: %d", sent_today)
            if sent_today < PER_DAY_MAX:
                gap = random.randint(MIN_GAP, MAX_GAP)
                log.info("  Waiting %d min %d sec...", gap//60, gap%60)
                time.sleep(gap)

    # ── Process Day 1 (first touch) ────────────────────────────────────────────
    for c in q0:
        if sent_today >= PER_DAY_MAX:
            break
        persona     = get_persona(c["job_title_normalized"])  # assign persona
        template    = EMAILS.get((persona, 1))                # Email 1 for this persona
        if not template:
            continue
        subject, html = render(template, c["first_name"], c["email"])
        log.info("[Day1 P%d] %s → %s", persona, c["first_name"], c["email"])
        if send_email(c["email"], subject, html):
            log_send(main_conn, c["email"], subject, 1)
            advance_stage(dm_conn, c["id"], 1, persona)       # mark stage 1 sent
            sent_today += 1
            log.info("  → Sent seq1. Total today: %d", sent_today)
            if sent_today < PER_DAY_MAX:
                gap = random.randint(MIN_GAP, MAX_GAP)
                log.info("  Waiting %d min %d sec...", gap//60, gap%60)
                time.sleep(gap)

    # ── Day summary ────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("Campaign run complete — %s", today)
    log.info("Total sent today: %d / %d", sent_today, PER_DAY_MAX)
    log.info("=" * 60)

    main_conn.close()                                        # close main DB
    dm_conn.close()                                          # close DM DB

if __name__ == "__main__":
    main()
