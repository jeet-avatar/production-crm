# Phase 04 — Apollo Campaign Port — VERIFICATION

**Date:** 2026-06-02
**Branch:** seconf
**Status:** ✅ COMPLETE — all goals achieved + deployed live to brandmonkz.com + live-verify Sara end-to-end PASS

---

## Goal-backward check

| Phase 04 promised | Delivered? | Evidence |
|---|---|---|
| Apollo prospect import via Apollo API | ✓ | `POST /api/apollo/import` mounted, returns 401 (auth-gated, not 404), source apollo.ts has searchPeople + enrichPerson |
| Apollo send-campaign via Resend (separate from existing SES path) | ✓ | `POST /api/apollo/send-campaign` mounted, dispatcher confirmed sending FROM `sara@techcloudpro.com` |
| 9 per-stream coherent email bodies (Cybersecurity = Cybersecurity chrome, not NetSuite) | ✓ | All 9 Stream:* templates V3-coherent in prod DB; sentinel `<!-- STREAM_V3:* -->` present |
| AI personalization (Claude Sonnet 4.6 + web_search) | ✓ | personalize.ts + PersonalizedEmailSend model + /send-personalized-campaign route deployed |
| Send Now / 5 min / 10 min schedule picker | ✓ | Schedule picker in deployed JS (Send Now ×2, Send in 5 min ×1, Send in 10 min ×1); scheduledDispatcher booted and dispatched test row |
| Apollo Campaign indigo button on /campaigns | ✓ | "Apollo Campaign" string ×3 in deployed JS; Send NetSuite Campaign preserved; no orange, no tabs |
| /apollo standalone page in sidebar | ✓ | GET /apollo → 200; sidebar nav entry with rocket icon |
| QoL: ?source=apollo filter + P2002 ladder + Claude normalize-filters | ✓ | ContactList accepts URL filter; upsertCompany with race catch; /normalize-filters route mounted |
| Unified analytics — Apollo sends visible in existing /campaigns/<id>/analytics | ✓ | Campaign.source='apollo' column applied; live-verify Campaign row visible via analytics URL pattern |
| Existing CampaignAnalytics report preserved | ✓ | 18 refs to /analytics+emailLogs+Export Report+Send Follow-up in deployed JS (was 17 pre-deploy) |
| Sara/Resend protection (3 layers) | ✓ | hardcoded APOLLO_FROM_EMAIL constant; .env preserved (rsync to dist/ only); video-generator pm2 untouched (8D uptime continuous); live test confirmed fromEmail = sara@techcloudpro.com |
| No Phase 6 UI mistakes re-introduced | ✓ | No PendingReviewQueue.tsx in repo; no tab toggle on /campaigns; no orange Apollo button (verified all 7 plans' commits) |

---

## Deploy ledger

| # | Step | Result |
|---|---|---|
| 1 | Snapshot /var/www/ as insurance | ✓ `/tmp/pre-apollo-port-redeploy.tar.gz` 749KB |
| 2 | 3 prod DB ALTERs + 2 indexes (Campaign.source, EmailStatus.SCHEDULED, EmailLog.scheduledAt) | ✓ All idempotent, all verified present |
| 3 | Backend rsync to /var/www/crm-backend/dist/ | ✓ 2.05MB transferred |
| 4 | Frontend rsync to /var/www/brandmonkz/ | ✓ 1.60MB transferred, asset rotated to index-BoUXGyL2.js |
| 5 | scp prisma/schema.prisma to /var/www/crm-backend/prisma/ + npx prisma generate | ✓ Required Ralph fix — initial rsync of dist/ only left old schema source on EC2; prisma generate regenerated client against OLD schema, dispatcher polled with PrismaClientValidationError; resolved by shipping schema + regen + restart |
| 6 | pm2 restart crm-backend with env reload | ✓ Online, restart count 19, fresh logs show dispatcher booted clean |
| 7 | Stream:* seed | ✓ No-op (already V3-coherent in prod from prior Phase 5/6 partial restore) |
| 8 | 10 post-deploy verification gates | ✓ 10/10 green |
| 9 | Live-verify Sara end-to-end | ✓ EmailLog.fromEmail = sara@techcloudpro.com, Campaign auto-rolled to SENT, video-generator unaffected |

---

## 7 commits shipped (on seconf, pushed to origin)

| Wave | Plan | Commit | Description |
|---|---|---|---|
| 1 | 04-01 | `a444016` | Apollo backend foundation — schema + client + classifier + routes |
| 1 | 04-06 | `58ea813` | Per-stream coherent email bodies (CONTENT ONLY, no Phase 6 UI) |
| 2 | 04-02 | `71a0b08` | Apollo /apollo page + sidebar nav + service client |
| 3 | 04-03 | `86fc81d` | Apollo Campaign indigo button + wizard initialMode (lean 3-step rewrite) |
| 3 | 04-04 | `6080242` | Apollo QoL — source filter + P2002 race catch + Claude normalize-filters |
| 3 | 04-05 | `11fbf13` | Apollo AI personalization — Claude+web_search + wizard preview block |
| 3 | 04-08 | `9f4ee0e` | Send Now/5 min/10 min schedule picker + scheduledDispatcher |

Origin push: `f76981c..9f4ee0e seconf -> seconf` (pre-deploy insurance).

---

## Ralph iterations performed

1. **04-03 agent stalled after committing** (reporting hung, code intact) — verified commit on branch, mark complete, continue.
2. **04-05 wizard contract** — plan assumed 4-step wizard; 04-03 had rewritten to 3-step lean. Briefed 04-05 agent to add AI Preview block on Step 2 Review instead of inserting new step.
3. **04-08 wizard contract** — same lean 3-step adaptation; picker placed on Apollo Step 2 Review and NetSuite Step 1 Confirm.
4. **Mid-deploy PrismaClientValidationError** — scheduledDispatcher polled with errors because dist/ rsync didn't include schema.prisma; on-EC2 prisma generate used old schema. Fix: scp schema.prisma + re-generate + restart.

No retries exceeded 2 attempts. No checkpoint bypassed.

---

## Phase 6 UI rollback lessons honored

| Lesson | How honored |
|---|---|
| No tab toggle that auto-switches default view | Apollo Campaign button opens wizard, default /campaigns view stays campaigns list |
| No orange accents on indigo brand pages | All 7 commits verified zero new visual-orange (existing Tailwind orange-* classes are remapped to indigo via index.css per Indigo Noir migration) |
| Visual sign-off BEFORE deploy approval | 3 mandatory checkpoints in 04-07: visual sign-off → deploy approval → live-verify, all 3 received explicit user approval recorded in 04-07-SIGNOFF.md |
| No PendingReviewQueue UI | Verified absent from repo and bundle |

---

## What's live on brandmonkz.com NOW

- New asset: `index-BoUXGyL2.js`
- New routes: `/apollo` (SPA), `/api/apollo/import`, `/api/apollo/send-campaign`, `/api/apollo/send-personalized-campaign`, `/api/apollo/normalize-filters`, `/api/apollo/stream-template/:stream`
- New wizard buttons on `/campaigns`: Apollo Campaign (indigo, opens wizard in apollo mode)
- New schedule picker: Send Now / Send in 5 min / Send in 10 min on wizard Apollo Step 2 + NetSuite Step 1
- AI Personalize Preview on wizard Apollo Step 2 (Claude Sonnet 4.6 + web_search, ~$0.01/preview, cached per (firstContactId, templateId))
- New sidebar nav entry: Apollo with rocket icon
- ?source=apollo filter on /contacts + Apollo + stream badges
- 9 per-stream coherent email bodies seeded in prod DB
- scheduledDispatcher service running with 30s poll + boot catch-up + Sara-protected dispatch path
- Apollo Campaigns surface in existing /campaigns list and /campaigns/<id>/analytics (unified analytics via Campaign.source)

## Rollback path (if needed)

```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  'sudo tar -xzf /tmp/pre-apollo-port-redeploy.tar.gz -C / && \
   cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env'
```
Note: DB ALTERs are additive and safe to leave in place even if code rolls back (old code won't use them).
