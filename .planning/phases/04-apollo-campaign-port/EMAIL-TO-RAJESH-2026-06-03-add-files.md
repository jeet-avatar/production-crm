**To:** rajesh@techcloudpro.com
**From:** Sara <sara@techcloudpro.com>
**Subject:** Quick — add these 2 files to your Claude Code session so we're operationally aligned

Hey Rajesh,

Heard you couldn't find Phase 4 / Phase 04 from your side. They DO exist — just at a specific path. Quick fix below + how to make sure your Claude Code session has the same context as mine.

## Where Phase 04 lives (the files DO exist)

**Repo:** `github.com/jeet-avatar/production-crm`
**Branch:** `seconf` (NOT `production`, NOT `main`)
**Directory:** `.planning/phases/04-apollo-campaign-port/` (zero-padded `04-`, not `phase-4`)

```bash
# If you've already cloned:
cd ~/production-crm
git checkout seconf
git pull origin seconf
ls .planning/phases/04-apollo-campaign-port/
```

You'll see:
```
04-01-PLAN.md  04-02-PLAN.md  04-03-PLAN.md  04-04-PLAN.md
04-05-PLAN.md  04-06-PLAN.md  04-07-PLAN.md  04-07-SIGNOFF.md
04-08-PLAN.md  04-RESEARCH.md  04-VERIFICATION.md
deferred-items.md
EMAIL-TO-RAJESH-2026-06-03.md            ← the BrandMonkz/Phase status primer
EMAIL-TO-RAJESH-2026-06-03-tcp-infra.md  ← the TCP/Hostinger infra primer
EMAIL-TO-RAJESH-2026-06-03-add-files.md  ← this email
```

If `~/production-crm` doesn't exist yet, clone it:
```bash
git clone https://github.com/jeet-avatar/production-crm.git ~/production-crm
cd ~/production-crm
git checkout seconf
```

**If you're looking at `~/Documents/CRM Module/`** — that's the OLDER orange-brand pre-Indigo Noir codebase, NOT the operational repo. Phase 04 doesn't exist there. Use `production-crm` `seconf` instead.

## Add the 2 primer files to your Claude Code session

Once you have the repo cloned + on `seconf` branch, in your Claude Code session use the `@` syntax to attach the 2 primer .md files. That gives your Claude the same operational context as mine.

```
# In your Claude prompt, type:
@.planning/phases/04-apollo-campaign-port/EMAIL-TO-RAJESH-2026-06-03.md
@.planning/phases/04-apollo-campaign-port/EMAIL-TO-RAJESH-2026-06-03-tcp-infra.md

# Or just paste the content of both directly into your first message.
```

After Claude reads them, you can ask things like:
- "What's the status of Apollo Campaign on brandmonkz.com?"
- "How do I fix the hot_leads MySQL table on Hostinger?"
- "What's the rollback command if Phase 07 fire goes sideways tomorrow?"
- "Which Twilio credentials do I need to rotate and how?"

Your Claude will know — because the primer files have all the topology, paths, commits, memories.

## Also new since the first email (Phase 08 shipping right now)

I'm deploying a 3rd campaign type: **"Send arthaBuild Campaign"** button on `/campaigns`. Same wizard pattern as Apollo Campaign + NetSuite Send, but pre-loaded with arthaBuild ICP filters (NetSuite Administrator / Developer / SuiteScript Developer / ERP Administrator titles in US/Canada) and the new Stream:ArthaBuild email template with the "Superpowers for the NetSuite superuser" positioning from artha.build's landing page.

The button is leftmost. Order: `Send arthaBuild Campaign | Apollo Campaign | Send NetSuite Campaign | Help | Create Campaign`.

Deploying as I write this — but NOT sending any prospect emails yet. You + JM control when to click the button for the first batch.

## Recent commits to pull

```
8699ae4 feat(08-02): Send arthaBuild Campaign button + wizard arthabuild mode
dbc6325 feat(08-01): ArthaBuild marketing template + Apollo ICP preset
c61c177 feat(07): tcp-daily-report — PETER→SENDERS + Twilio env vars + label polish
f1cd352 fix(05): drop dev jargon from Section 4 user-visible text
d1fa6f1 feat(05): TCP daily report — PETER→SENDERS + BM UNION + Apollo enrich
ae4ff20 docs(04): Phase 04 Apollo Campaign port — PLANS + RESEARCH + VERIFICATION + SIGNOFF
9f4ee0e feat(04-08): restore Send Now/5 min/10 min schedule picker on campaign wizard
11fbf13 feat(04-05): Apollo AI personalization — Claude+web_search per-contact + wizard preview block
86fc81d feat(04-03): Apollo Campaign indigo button on /campaigns header + wizard initialMode
6080242 feat(04-04): Apollo QoL — source filter + P2002 race catch + Claude normalize-filters
71a0b08 feat(04-02): Apollo /apollo page + sidebar nav + service client
a444016 feat(04-01): Apollo backend foundation — schema + client + classifier + routes
58ea813 feat(04-06): per-stream coherent email bodies — CONTENT ONLY (no Phase 6 UI)
```

`git pull origin seconf` will fetch all of this.

— JM (via Sara)
