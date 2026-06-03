# Phase 04 — Apollo Campaign Port Research

**Created:** 2026-06-02
**Source-of-truth for:** all `04-NN-PLAN.md` files in this directory
**Working tree:** `/Users/jeet/Documents/production-crm-backup` (on `seconf` branch)
**Source repo for ports:** `/Users/jeet/production-crm` (on `production` branch)

---

## Why this phase exists

The Apollo Campaign capability was built on the parallel `production` branch of the same repo over the last week (Phases 4, 5, quick-5/6/7, Phase 6). **None of it landed on `seconf`** — which is the branch that actually deploys to `brandmonkz.com` (per [[feedback_brandmonkz_operational_repo_is_seconf_branch]]).

Phase 6's UI was rolled back same-day (orange Apollo button + auto-switching Pending Review tab triggered "two designs" + "campaigns disappeared" UX complaints). The **content** improvements from Phase 6 (per-stream coherent email bodies) are still valuable and port over without the UI.

This phase = Stage D scope = port everything useful, leave Phase 6's UI mistakes behind.

---

## Operational state going in (verified 2026-06-02)

| Check | Result |
|---|---|
| brandmonkz.com asset hash | `index-CXpa1G7X.js` (matches seconf HEAD f76981c) |
| Indigo brand class count in deployed JS | 119 (expect ≥50) |
| `Send NetSuite Campaign` button in deployed JS | 1 (expect ≥1) |
| `ApiSubscription` anti-marker in deployed JS | 0 (expect 0) |
| `seconf` local vs origin/seconf | in sync (13 commits pushed 2026-06-02) |
| Apollo DB columns | `companies.{apolloOrgId, apolloRawData, domain, stream}` + `contacts.{apolloPersonId, apolloRawData, stream}` already in prod |

**→ No `prisma migrate deploy` against prod DB needed for Phase 4 schema additions** (columns already exist). `prisma generate` only.

---

## Source commits to port (from `/Users/jeet/production-crm` `production` branch)

### Phase-4-equivalent — core Apollo (must-have)

| SHA | Purpose |
|---|---|
| `911e1e2` / `79290fe` | Prisma schema additions + `classifyStream` helper |
| `2113f9e` / `5c75d21` | Apollo TS client (`lib/apolloClient.ts`) + `ApolloAuthError` typed error |
| `764ce91` / `9437281` / `243354b` | `routes/apollo.ts` — `POST /api/apollo/import` + `POST /api/apollo/send-campaign` + Stream:* templates seed |
| `66a4737` / `b005169` | `pages/Apollo/ApolloPage.tsx` + `ApolloSearchForm.tsx` + sidebar nav (RocketLaunchIcon) |
| `9371f7c` / `2f14467` | `NetSuiteCampaignWizard.tsx` — 4-step Apollo flow with 3-layer template fallback |
| `f7e6482` / `de87ba1` / `f44e38a` / `a72fa4b` | Handoff wiring + htmlContent fix |

### quick-5/6/7 QoL (nice-to-have, Stage B+)

| SHA | Purpose |
|---|---|
| `8b99d33` | ContactList `?source=apollo` filter + dismissible chip + Apollo/stream badges |
| `861ed00` | Apollo client 120s axios timeout + Company P2002 3-case ladder (find-by-apolloOrgId → find-by-domain → update \| create) |
| `d0a3708` / `17c2ceb` | Claude `normalizeFiltersWithClaude` for auto-correcting ICP search inputs |

### Phase-5-equivalent — AI personalization (Stage C+)

| SHA | Purpose |
|---|---|
| `b19feec` / `820fd4a` | `PersonalizedEmailSend` Prisma model + migration + stream-template v2 upgrade |
| `908e631` / `35bbc58` | `personalizeContactWithClaude` helper + frontend client wiring |
| `8344905` / `46151a4` | Wizard 4→5 step "AI Personalize" preview gate (cached per firstContactId+templateId) |
| `9d6c5ed` / `2e1f402` | Phase 5 deploy + 4-case smoke against Ricardo Deben |

### Phase-6-equivalent — per-stream bodies (Stage D — CONTENT ONLY)

| SHA | Purpose | Port what |
|---|---|---|
| `01fe98a` | `STREAM_TEMPLATE_V3_BODIES` dict with 9 per-stream variants in `backend/src/seeds/stream-templates.ts` | **CONTENT ONLY** — the dict + the seed logic |
| `01fe98a` | `PendingReviewQueue.tsx` + tab toggle + orange Apollo Campaign button | **DO NOT PORT** — rolled back |

### Sara sender rotation (port IF Apollo send path needs it)

| SHA | Purpose |
|---|---|
| `3de4b8b` | Sender rotation Peter → Sara across scene/landing/narration in video-pipeline |

`seconf` is pre-Sara (May 11). Verify whether the Apollo `/send-campaign` route hardcodes Peter; if so, cherry-pick the Sara constants only (not the video-pipeline changes which are in a different subdirectory).

---

## Cherry-pick strategy: manual file-copy, NOT `git cherry-pick`

`production` and `seconf` have diverged on key files:

| File | Divergence |
|---|---|
| `frontend/src/pages/Campaigns/CampaignsPage.tsx` | `seconf` has "Send NetSuite Campaign" button + Quote/Contract Documents tab + placement email model; `production` lacks all three. `git cherry-pick` will produce a mess. |
| `backend/prisma/schema.prisma` | `seconf` has Quote + Contract + Placement models from Phases 02/03 + recent commits; `production` doesn't. Cherry-pick will clobber. |
| `backend/src/routes/campaigns.ts` | Both branches modified — different evolutions. |

**Recommended pattern for each port:**

1. **New files** (no conflict possible) — `git show <sha>:<path>` from `/Users/jeet/production-crm` → `Write` to same path in `production-crm-backup`. Example:
   ```bash
   cd /Users/jeet/production-crm && git show 2113f9e:backend/src/lib/apolloClient.ts > /tmp/apolloClient.ts
   cp /tmp/apolloClient.ts /Users/jeet/Documents/production-crm-backup/backend/src/lib/apolloClient.ts
   ```

2. **Modified files** (need merge with seconf-side changes) — read both versions, hand-merge keeping seconf's unique features (Send NetSuite button, Quote/Contract, placement model, etc.) AND adding the Apollo additions on top.

3. **Schema additions** — additive only. Add new fields/models/indexes to `prisma/schema.prisma`. Do NOT run `prisma migrate deploy` against prod (columns already exist). Run `prisma generate` only.

---

## UI placement rules (locked by [[feedback_brandmonkz_ui_signoff_before_deploy]] + [[project_brandmonkz_phase6_rolled_back]])

1. **No tab toggle** that auto-switches state on click. Existing `/campaigns` page default view must stay the campaigns list.
2. **No orange accents.** Indigo brand (`gradients.brand.primary.gradient`) for any new button.
3. **One new button** added to `/campaigns` header: "Apollo Campaign" (indigo), positioned left of "Send NetSuite Campaign". Order: `Apollo Campaign | Send NetSuite Campaign | Help | Create Campaign`.
4. **Click behavior:** opens existing `NetSuiteCampaignWizard` pre-loaded with Apollo contacts (filter on `source='apollo'`). Existing wizard pattern, NOT a new modal.
5. **Mandatory visual sign-off CHECKPOINT** in plan 04-07 before deploy approval. Show user the rendered header text + button colors + click flow; wait for explicit OK.

## Deploy rules (locked by [[feedback_brandmonkz_deploy_approval]])

1. Local commits + push to `origin/seconf` are free — no approval needed.
2. **Deploy to `/var/www/` on EC2 requires typed `deploy` from user.** Show infra preview first (files changed, snapshot path, pm2 restart, expected diff).
3. **Live Resend dispatch to real recipients requires a SEPARATE second approval.** Staging the queue is one approval; sending is the second.
4. After deploy: re-run 4 diagnostic gates + new Apollo button presence gate.

## Snapshot path for this phase's deploy

`/tmp/pre-apollo-port-redeploy.tar.gz` on EC2 (third snapshot in the BrandMonkz series).

---

## Plan structure

| Plan | Wave | Depends on | Scope |
|---|---|---|---|
| 04-01 | 1 | — | Backend foundation: schema + apolloClient + classifyStream + routes/apollo.ts + register in app.ts |
| 04-02 | 2 | 04-01 | Frontend `/apollo` page + ApolloSearchForm + sidebar nav |
| 04-03 | 3 | 04-01, 04-02 | CampaignsPage Apollo Campaign indigo button + wizard wiring |
| 04-04 | 3 | 04-01 | QoL: ContactList filter + apolloClient timeout + Company P2002 ladder + normalize-filters |
| 04-05 | 3 | 04-01 | Phase 5 AI personalization: PersonalizedEmailSend model + helper + 5-step wizard |
| 04-06 | 1 | — | Per-stream coherent bodies (STREAM_TEMPLATE_V3_BODIES dict) — content only, NO Phase 6 UI |
| 04-07 | 4 | all above | Build + 🛑 visual sign-off CHECKPOINT + 🛑 deploy approval CHECKPOINT + rsync + 5 gates + 🛑 live-verify CHECKPOINT |

Waves 1 (04-01 + 04-06) and Wave 3 (04-03 + 04-04 + 04-05) can run in parallel. Wave 2 (04-02) and Wave 4 (04-07) are sequential.

---

## Things to LOAD into working memory when executing this phase

- `~/.claude/handoffs/2026-06-02-brandmonkz-apollo-campaign-port-to-seconf.md`
- Memory: `feedback_brandmonkz_operational_repo_is_seconf_branch`
- Memory: `feedback_brandmonkz_deploy_approval`
- Memory: `feedback_brandmonkz_ui_signoff_before_deploy`
- Memory: `feedback_brandmonkz_stream_coherence`
- Memory: `project_brandmonkz_phase6_rolled_back`

## 📊 Unified analytics constraint (HARD CONSTRAINT — DO NOT DUPLICATE)

The existing `CampaignAnalytics` page (`frontend/src/pages/Campaigns/CampaignAnalytics.tsx`, route `/campaigns/:campaignId/analytics`) is the report Rajesh uses today for per-campaign sent-email visibility. It has Export Report (CSV download), Send Follow-up (navigates back to /campaigns), and per-recipient status/opens/clicks/engagement. Verified live on brandmonkz.com 2026-06-02 (deployed JS contains `/analytics` × 7, `emailLogs` × 9, `Export Report` × 1).

**The Apollo Campaign port MUST surface Apollo sends in the SAME `/analytics` page.** Don't build a separate "Apollo Analytics" page. Don't wire the orphan `CampaignEmailReport.tsx` (it's dead-code from a parallel implementation; leave it alone).

### Implementation rule

Every Apollo dispatch (immediate OR scheduled) MUST create a `Campaign` DB row first, then `EmailLog` rows linked via `campaignId`. The Campaign row pattern:

```typescript
const campaign = await prisma.campaign.create({
  data: {
    name: `Apollo Campaign — ${stream ?? 'Multi-stream'} — ${new Date().toISOString().slice(0, 10)}`,
    subject: template.subject,
    htmlContent: template.htmlContent,
    status: scheduledAt && scheduledAt > new Date() ? 'SCHEDULED' : 'SENDING',
    scheduledAt: scheduledAt ?? null,
    source: 'apollo',  // new column to distinguish from NetSuite — additive
    userId: req.user!.id,
  },
});

for (const contact of contacts) {
  await prisma.emailLog.create({
    data: {
      campaignId: campaign.id,
      contactId: contact.id,
      toEmail: contact.email,
      status: scheduledAt && scheduledAt > new Date() ? 'SCHEDULED' : 'PENDING',
      scheduledAt: scheduledAt ?? null,
      // sender filled in by dispatch (apollo.ts or scheduledDispatcher)
    },
  });
}
```

If `Campaign.source` column doesn't exist yet, add it (additive — String?). Check prod DB first; likely missing on seconf branch. Apply via ALTER at deploy step in 04-07 if so.

### What this gives Rajesh

- `/campaigns` list shows ALL campaigns including Apollo ones, distinguished by `source` column (badge: "Apollo" vs "NetSuite")
- Click any Apollo Campaign row → `/campaigns/<id>/analytics` loads the same analytics view he uses for NetSuite campaigns
- Export Report CSV works uniformly
- Send Follow-up button works uniformly

### Anti-pattern (DO NOT do)

- ❌ Wire the orphan `CampaignEmailReport.tsx` — it's dead code, leave it as dead code (deleting is also fine but not required)
- ❌ Build a separate `/apollo-analytics` or `/reports` page — duplicates the existing surface
- ❌ Show Apollo sends only inside `/apollo` page workflow — Rajesh wouldn't find them in his usual /campaigns workflow

---

## 🛡 Sara / Resend preservation (HARD CONSTRAINT — MUST NOT BREAK)

Rajesh has set up the **Sara sender on Resend** for production email. The Apollo Campaign port MUST NOT break this. Sara is used by:

1. **`video-generator` pm2 process** (separate from `crm-backend`) — Python service at `/var/www/video-generator-service/`. Sends TCP retargeting emails via Resend FROM `Sara <sara@techcloudpro.com>`. Untouched by this phase's deploy (separate process, separate code, separate restart).
2. **Resend account** — single `RESEND_API_KEY` shared between video-generator AND the new Apollo /send-campaign route.
3. **techcloudpro.com domain** — DKIM/SPF/DMARC verified in Resend (May 26, 2026 Peter→Sara swap). Any `@techcloudpro.com` address can send.

### Required guards in Apollo port code

| Guard | Where | Why |
|---|---|---|
| Hardcoded `const APOLLO_FROM_EMAIL = 'Sara <sara@techcloudpro.com>'` | `backend/src/routes/apollo.ts` (top of file) | Prevents accidentally sending FROM an unverified domain (e.g., brandmonkz.com would be rejected by Resend AND could flag the account) |
| Fail-fast on missing RESEND_API_KEY at module load | `backend/src/routes/apollo.ts` (lines 41-47 of source) | If key missing, backend refuses to start — catches deploy mistakes early instead of silently failing on first send attempt |
| Use `process.env.RESEND_API_KEY` (NOT a different env var) | Apollo routes + personalize | Matches existing convention in .env, shared with video-generator |
| Reply-to header set to `sara@techcloudpro.com` | Apollo send dispatch | Mail server already forwards sara@ → rajesh + jm; setting reply-to keeps the routing intact |

### Required guards at deploy time (04-07)

| Guard | Step | Why |
|---|---|---|
| rsync target is `/var/www/crm-backend/dist/` ONLY | Task 4 | .env lives at `/var/www/crm-backend/.env` (parent dir) — out of rsync scope. Confirm `--delete` is scoped to `dist/`. |
| Pre-deploy sanity: `grep -c "RESEND_API_KEY" /var/www/crm-backend/.env` == 1 | Task 4 (before rsync) | Confirm Sara's key is present before we touch anything |
| Post-deploy sanity: same grep returns 1 + crm-backend can read it | Task 4 (after restart) | Confirm restart didn't somehow blow away env |
| `pm2 list` shows BOTH crm-backend AND video-generator online | Task 5 | Confirm we didn't crash the sibling Sara process |
| Live-verify test = send from new Apollo path FROM Sara TO JM | Task 7 (MANDATORY, not optional) | Single end-to-end test that proves the new Apollo dispatch still uses Sara correctly. If this fails, rollback. |

### What would actually break Sara

| Bad action | Effect | Plan defense |
|---|---|---|
| Modifying `/var/www/crm-backend/.env` | RESEND_API_KEY changes, Sara fails | rsync target is `dist/` not parent — no plan modifies .env |
| Code that sends FROM `noreply@brandmonkz.com` or similar | Resend rejects, repeated rejects flag account | Hardcoded APOLLO_FROM_EMAIL constant from source |
| Bad blast (1000 emails to invalid addresses) triggers Resend abuse flag | Whole account degraded, Sara stops working | Live-verify checkpoint = 1 email to JM first, no bulk until proven |
| DNS changes on techcloudpro.com | DKIM breaks, Sara fails | No plan touches DNS |
| `pm2 stop video-generator` or `pm2 delete video-generator` | Sara TCP retargeting stops | No plan touches video-generator process |
| Force-push to `seconf` branch | Code reverts, but Sara unaffected | No force-push needed (we push forward only) |

---

## Things to NOT do (anti-patterns)

- ❌ `git checkout production` over `seconf` (loses Send NetSuite Campaign button + Quote/Contract)
- ❌ `git merge production` into `seconf` without per-file conflict review
- ❌ `git cherry-pick` Phase 4-6 commits onto `seconf` (CampaignsPage + schema diverged — manual merge required)
- ❌ `prisma migrate deploy` against prod DB without checking columns already exist (they do)
- ❌ Orange accent colors on `/campaigns` header (rolled back already)
- ❌ Auto-switching tab toggle that hides existing content (rolled back already)
- ❌ `PendingReviewQueue.tsx` or any of Phase 6's UI — content only port
- ❌ Deploy to `/var/www/` without typed user `deploy` approval
- ❌ Real Resend dispatch without separate live-verify approval

---

## Git author identity (PERMANENT)

All commits in this phase: `user.email="jm@techcloudpro.com"` + `user.name="jeet-avatar"`. Pass inline if needed:
```bash
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "..."
```
