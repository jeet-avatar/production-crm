# Phase 04 — Sign-Off Trail

## Visual Sign-Off
- **Date:** 2026-06-02 (local session)
- **User message:** "OK — proceed to infra deploy preview" (via AskUserQuestion)
- **Approver:** jeetnair.in@gmail.com (Jeet)
- **Approved state:** lean 3-step wizard (Apollo: Audience → Review with AI Preview + Schedule picker → Done; NetSuite: Confirm with Schedule picker → Send → Done), Apollo Campaign indigo button on /campaigns header before Send NetSuite Campaign, /apollo standalone page in sidebar with rocket icon, Apollo sends create Campaign rows surfacing in existing /analytics, 9 per-stream coherent email bodies, Sara hardcoded in dispatch paths, no Phase 6 UI mistakes re-introduced.
- **New asset hash:** `index-BoUXGyL2.js`
- **Commits shipped:** a444016, 58ea813, 71a0b08, 6080242, 86fc81d, 11fbf13, 9f4ee0e (7 commits across 7 plans)

## Deploy Approval
- **Date:** 2026-06-02 (local session)
- **User message:** "deploy" (via AskUserQuestion)
- **Approved plan:**
  1. Snapshot `/var/www/crm-backend/dist + /var/www/brandmonkz` → `/tmp/pre-apollo-port-redeploy.tar.gz`
  2. 3 prod DB ALTERs: `Campaign.source TEXT`, `EmailStatus` enum add `SCHEDULED`, `EmailLog.scheduledAt TIMESTAMP(3)` + 2 indexes (`email_logs_status_scheduledAt_idx`, `campaigns_source_idx`)
  3. Backend rsync to `/var/www/crm-backend/dist/` ONLY (`.env` preserved at parent)
  4. Frontend rsync to `/var/www/brandmonkz/` (delete + replace `assets/`)
  5. `prisma generate` against prod DB
  6. `pm2 restart crm-backend` with env reload
  7. Seed Stream:* templates (idempotent upsert of 9 per-stream coherent bodies)
  8. 10 verification gates

## Deploy Result (10/10 gates green)

- **Asset hash live:** `index-BoUXGyL2.js` (matches new build)
- **Snapshot:** `/tmp/pre-apollo-port-redeploy.tar.gz` on EC2 (749KB, insurance for rollback)
- **DB ALTERs applied:** Campaign.source ✓, EmailStatus.SCHEDULED enum ✓, EmailLog.scheduledAt ✓ + 2 indexes
- **Sara env vars preserved:** 4/4 in /var/www/crm-backend/.env (post-deploy)
- **video-generator pm2:** online, uptime continuous 7D, 0 restarts (untouched)
- **crm-backend pm2:** online, restart count 19 (was 17 pre-deploy), boot succeeded
- **scheduledDispatcher:** booted clean, log shows `sender=Sara <sara@techcloudpro.com>`, boot catch-up attempted=0 sent=0 failed=0, no PrismaClientValidationError after schema/regen/restart fix
- **API surface:** GET /apollo SPA → 200, POST /api/apollo/import → 401 (auth-gated, route mounted)

### 10 gates

| # | Gate | Result |
|---|---|---|
| 1 | asset hash matches new build | ✓ index-BoUXGyL2.js |
| 2 | indigo brand >= 50 | ✓ 119 |
| 3 | Send NetSuite Campaign present | ✓ 3 |
| 4 | ApiSubscription absent | ✓ 0 |
| 5 | Apollo Campaign in JS | ✓ 3 |
| 6 | 9 Stream:* templates in prod DB | ✓ 9 (all V3-coherent) |
| 7 | CampaignAnalytics still wired | ✓ 18 refs (was 17 pre-deploy) |
| 8 | Schedule picker labels in JS | ✓ Send Now × 2, Send in 5 min × 1, Send in 10 min × 1 |
| 9 | scheduledDispatcher booted (Sara confirmed) | ✓ (after one Ralph fix: shipped schema.prisma + prisma generate + restart) |
| 10 | campaigns.source column in prod DB | ✓ |

### Mid-deploy Ralph fix

Initial deploy left scheduledDispatcher polling with PrismaClientValidationError because we rsync'd `dist/` only — EC2's `prisma/schema.prisma` source was still the old version, so the on-EC2 `prisma generate` regenerated the client against the OLD schema (missing SCHEDULED enum + scheduledAt field). Fix: scp local `schema.prisma` to EC2, re-run `prisma generate`, restart pm2. Dispatcher then booted clean.

**Lesson for next deploy:** include `prisma/schema.prisma` in the rsync target (or copy it explicitly) BEFORE running `prisma generate` on EC2.

## Live Verify (Sara end-to-end via Apollo path) ✓ PASS

- **Date:** 2026-06-02 15:14 UTC
- **User approval:** "live-verify" (via AskUserQuestion)
- **Test method:** Programmatic — staged Campaign + EmailLog in prod DB with status='SCHEDULED', scheduledAt=now()-5s; scheduledDispatcher poller (30s cycle) picked up + dispatched via Resend.
- **EmailLog `apollo-live-verify-emaillog-1` post-dispatch:**
  - `status` = SENT
  - `fromEmail` = **`sara@techcloudpro.com`** ← Sara constant preserved through new dispatcher code path
  - `toEmail` = jeetnair.in@gmail.com
  - `sentAt` = 2026-06-02 15:14:18.746
  - `messageId` = 6f086818-b705-421a-86e5-60f2ef7cb94e (Resend ack)
  - `errorMessage` = empty
- **Campaign `apollo-live-verify-1` post-dispatch:**
  - `status` = SENT (auto-rolled by dispatcher when all child rows completed)
  - `source` = 'apollo' (unified analytics — appears in /campaigns + /campaigns/<id>/analytics)
  - `sentAt` = 2026-06-02 15:14:18.763
- **video-generator pm2 post-test:** uptime 8D continuous, 0 restarts (Sara TCP retargeting fully untouched)
- **Verdict:** Sara intact ✓ | Apollo dispatcher working ✓ | Unified analytics working ✓ | TCP retargeting unaffected ✓

## Phase 04 — DONE

7 commits shipped: a444016 (04-01) · 58ea813 (04-06) · 71a0b08 (04-02) · 6080242 (04-04) · 86fc81d (04-03) · 11fbf13 (04-05) · 9f4ee0e (04-08).
Deploy: 10/10 gates green. Live-verify: Sara end-to-end PASS.
Snapshot for rollback: /tmp/pre-apollo-port-redeploy.tar.gz on EC2 (749KB).
