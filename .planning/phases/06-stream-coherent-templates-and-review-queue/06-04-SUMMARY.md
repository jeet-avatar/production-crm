---
phase: 06-stream-coherent-templates-and-review-queue
plan: 04
subsystem: backend-routes
tags: [apollo, pending-review, resend, claude, tenant-isolation, additive-routes]
requires:
  - Phase 5 PersonalizedEmailSend model (renderedBody String @db.Text + fromEmail String + status field admits 'pending_review' per Phase 06 plan 06-02 migration)
  - Phase 06 plan 06-03 requireReview additive field on /send-personalized-campaign (queues rows with status='pending_review' that these new routes consume)
  - Phase 4 firewall held byte-for-byte (campaigns.ts + awsSES.ts untouched)
provides:
  - GET /api/apollo/unsent-contacts (Apollo-source contacts with no successful send, used by Plan 06-05 Apollo Campaign button)
  - GET /api/apollo/pending-review (paginated audit queue with persisted renderedBody for Plan 06-05 inbox-card previews)
  - POST /api/apollo/pending-review/:id/approve (dispatches persisted body via Resend, no fresh Claude call — $0 Claude on approval)
  - POST /api/apollo/pending-review/:id/reject (status='rejected' + optional reason → aiWarning re-use, no schema change)
  - POST /api/apollo/pending-review/:id/edit (override aiTokens/renderedBody/subject; re-renders renderedBody server-side when aiTokens changes — MEDIUM 1 fix)
affects:
  - Plan 06-05 (PendingReviewQueue.tsx + Apollo Campaign button consume these 5 routes)
  - Plan 06-06 (deploy gate + 9-stream live verify exercises /approve via Pending Review UI for Rajesh's 1 approval)
tech-stack:
  added: []
  patterns:
    - Tenant isolation via userId in every Prisma where clause (defense in depth — auth middleware already covers, but every query re-asserts)
    - Single findFirst with combined `{ id, userId, status: 'pending_review' }` for mutation routes (atomic intent; locks out double-approval and stale-row edits)
    - aiWarning column re-used for reject reason (no schema change)
    - Server-side re-render in /edit mirrors /send-personalized-campaign substitution loop byte-for-byte (apollo.ts:1002-1006 pattern)
key-files:
  created:
    - .planning/phases/06-stream-coherent-templates-and-review-queue/06-04-SUMMARY.md
  modified:
    - backend/src/routes/apollo.ts (313 insertions, 0 deletions; 5 new routes added between existing /send-personalized-campaign route and `export default router`)
decisions:
  - /approve re-uses persisted renderedBody (NO fresh Claude call) — cost on approval = 0 Claude tokens + 1 Resend send. The personalization spend (~$0.069/contact) was already incurred when the row was queued via Plan 06-03's requireReview:true path
  - /edit re-renders renderedBody server-side when aiTokens provided AND renderedBody NOT explicitly provided — closes MEDIUM 1 stale-preview bug from earlier plan iteration. Explicit renderedBody override wins if both provided
  - /edit re-render uses static regex substitution (NOT a fresh Claude call) — same 7-placeholder set as /send-personalized-campaign (firstName, companyName, title, intentHook, companyContext, painPoint, cta). Cost on edit = $0 Claude + $0 Resend (pure DB + regex)
  - /reject writes optional reason into existing aiWarning column — additive-only Phase 6 schema strategy preserved, no new column needed. CONTEXT.md route table treats reason as optional metadata, not a primary field
  - All 3 mutation routes (approve, reject, edit) gate on status='pending_review' via single findFirst (atomic — prevents racing double-approve, prevents edit of already-sent rows)
  - All 5 routes enforce userId tenant isolation via Prisma where clause (defense in depth — `router.use(authenticate)` at line 82 already covers, but explicit `userId` in WHERE prevents IDOR even if auth middleware ever has a regression)
  - 502 on Resend dispatch failure deliberately LEAVES row in status='pending_review' so user can retry approving without losing the queued state — matches must_have truth
  - 409 on /edit when EmailTemplate is missing for re-render — user can still edit by explicitly passing renderedBody (workaround path documented in error detail message)
  - Single atomic commit (Task 1 + Task 2 squashed per plan STEP D-E instruction) — 1 file, 313 insertions, no helper extracted (skip pattern is inline, not reused)
  - personalizeContactWithClaude helper UNTOUCHED — 5/5 distinct warning strings still emit (Phase 5 fallback contract preserved byte-for-byte; verified via line-scoped grep in helper body lines 222-322)
  - APOLLO_FROM_EMAIL + RESEND_COST_PER_SEND constants re-used (no new top-level constants introduced)
metrics:
  duration: 2m
  completed: 2026-06-02
  files-changed: 1
  insertions: 313
  deletions: 0
  routes-added: 5
  commit: d8b3350
---

# Phase 6 Plan 04: Pending Review CRUD Routes Summary

5 new backend routes on `/api/apollo` powering the Pending Review queue and Apollo Campaign batch entry point — `/approve` re-uses the persisted body for $0 Claude cost, `/edit` re-renders server-side from the template + new aiTokens so Rajesh's saved overrides produce a fresh preview (MEDIUM 1 fix), `/reject` recycles the existing `aiWarning` column for optional reason. Tenant isolation enforced via `userId` in every Prisma where clause; all mutation routes gate on `status='pending_review'` in a single `findFirst` (atomic, locks out double-approval). Phase 4 SES firewall and Phase 5 5-fallback Claude contract preserved byte-for-byte. Single commit `d8b3350`.

## Route Signatures and Response Shapes

### GET `/api/apollo/unsent-contacts`

- **Query params:** `?stream=Cybersecurity` (optional), `?limit=N` (optional, default 500, clamped 1..1000)
- **Auth:** `req.user?.id || req.user?.sub` (matches Phase 5 idiom on /send-personalized-campaign)
- **Behavior:** Two-step query. (1) Collect `contactId` set from `personalized_email_sends` where `status='sent' AND userId={userId}`. (2) `findMany` contacts where `source='apollo' AND userId={userId} AND id NOT IN sentContactIds`, ordered by `createdAt DESC`, with `company` relation included.
- **Response shape:**
  ```json
  {
    "contacts": [
      { "id": "...", "email": "...", "fullName": "...", "companyName": "...", "stream": "Cybersecurity", "suggestedStream": "Cybersecurity" }
    ],
    "total": 47
  }
  ```
- **Errors:** 401 (no userId), 500 (`unsent_contacts_failed`)

### GET `/api/apollo/pending-review`

- **Query params:** `?stream=Cybersecurity` (optional), `?page=N` (default 1), `?pageSize=M` (default 20, clamped 1..100)
- **Auth:** same as above
- **Behavior:** `prisma.$transaction([findMany, count])` for atomic paginated read. Includes `contact.company` relation for `companyName`/`contactName` derivation. Excludes server-only fields like `resendError` from the response.
- **Response shape:**
  ```json
  {
    "items": [
      {
        "id": "...", "contactId": "...", "contactEmail": "...", "contactName": "...",
        "companyName": "...", "stream": "Cybersecurity", "subject": "...",
        "renderedBody": "<html>...</html>", "aiTokens": {...}, "aiWarning": null,
        "claudeCostUSD": "0.0690", "createdAt": "2026-06-02T..."
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 20
  }
  ```
- **Errors:** 401, 500 (`pending_review_list_failed`)

### POST `/api/apollo/pending-review/:id/approve`

- **Body:** none required
- **Auth:** same
- **Behavior:**
  1. Single `findFirst({ where: { id, userId, status: 'pending_review' } })` — combined gate
  2. `resend.emails.send({ from: row.fromEmail || APOLLO_FROM_EMAIL, to: row.toEmail, subject: row.subject, html: row.renderedBody })` — uses persisted body, NO Claude call
  3. On success: `prisma.personalizedEmailSend.update({ status: 'sent', resendMessageId, sentAt: NOW() })`
  4. On Resend error/throw: 502, row LEFT in `pending_review` for retry
- **Response shape:** `{ "id": "...", "status": "sent", "resendMessageId": "..." }`
- **Errors:** 401, 400 (`id_required`), 404 (`pending_review_row_not_found` — row missing OR status mismatch, locks out double-approval), 502 (`resend_dispatch_failed` / `resend_dispatch_threw`), 500 (`approve_failed`)
- **Cost guarantee:** $0 Claude + 1 Resend send. Personalization spend already paid when row was queued by Plan 06-03.

### POST `/api/apollo/pending-review/:id/reject`

- **Body:** `{ "reason"?: string }`
- **Auth:** same
- **Behavior:**
  1. Same single findFirst gate
  2. `prisma.personalizedEmailSend.update({ status: 'rejected', aiWarning: reason || row.aiWarning })` — re-uses existing `aiWarning` column for reason (no schema change). When `reason` not provided, preserves existing `aiWarning` value.
- **Response shape:** `{ "id": "...", "status": "rejected" }`
- **Errors:** 401, 400, 404, 500 (`reject_failed`)
- **No Resend dispatch.** Pure DB update.

### POST `/api/apollo/pending-review/:id/edit`

- **Body:** `{ "aiTokens"?: Record<string, string|null>, "renderedBody"?: string, "subject"?: string }` (at least one required)
- **Auth:** same
- **Behavior:**
  1. Same single findFirst gate, plus `include: { contact: { include: { company: true } } }` because re-rendering needs `firstName/title/company.name`
  2. **Re-render branch (MEDIUM 1 fix):** if `aiTokens !== undefined && renderedBody === undefined`:
     - Re-load `EmailTemplate.findFirst({ where: { id: row.templateId, userId }, select: { htmlContent: true } })`
     - If template missing → 409 `template_missing_for_rerender` with workaround hint
     - Build 7-placeholder map: `{ firstName, companyName, title, intentHook, companyContext, painPoint, cta }` from `row.contact` + `aiTokens`
     - Substitute via `body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safeValue)` for each key — **identical semantics to `/send-personalized-campaign` at apollo.ts:1002-1006**
  3. **Explicit override branch:** if `renderedBody !== undefined`, that value wins. No re-render.
  4. Build partial `updateData` (only provided fields) and `prisma.personalizedEmailSend.update`
  5. Status stays `'pending_review'` (no state change)
- **Response shape:** `{ "id": "...", "status": "pending_review", "subject": "...", "renderedBody": "...", "aiTokens": {...} }`
- **Errors:** 401, 400 (`id_required` / `no_fields_to_edit`), 404, 409 (`template_missing_for_rerender`), 500 (`edit_failed`)
- **Cost guarantee:** $0 Claude + $0 Resend. Pure DB read + regex substitution + DB write.

## Tenant Isolation Pattern (userId in WHERE)

Every Prisma operation in every new route includes `userId` in its first `where` clause:

| Route                                          | First Prisma op `where`                                                | Defense layer |
|------------------------------------------------|-------------------------------------------------------------------------|--------------|
| GET /unsent-contacts (step 1)                  | `personalized_email_sends.findMany({ where: { userId, status:'sent'}})` | Per-row      |
| GET /unsent-contacts (step 2)                  | `contacts.findMany({ where: { userId, source:'apollo', ... }})`         | Per-row      |
| GET /pending-review (txn)                      | `personalized_email_sends.{findMany,count}({ where: { userId, status:'pending_review' }})` | Per-row      |
| POST /pending-review/:id/approve               | `personalized_email_sends.findFirst({ where: { id, userId, status:'pending_review' }})` | Per-row      |
| POST /pending-review/:id/reject                | `personalized_email_sends.findFirst({ where: { id, userId, status:'pending_review' }})` | Per-row      |
| POST /pending-review/:id/edit (gate)           | `personalized_email_sends.findFirst({ where: { id, userId, status:'pending_review' }})` | Per-row      |
| POST /pending-review/:id/edit (template fetch) | `email_templates.findFirst({ where: { id: row.templateId, userId }})`   | Per-row      |

Combined with `router.use(authenticate)` at `apollo.ts:82` (route-prefix gate). Result: a logged-in user cannot list, approve, reject, or edit a row owned by another tenant — even with a crafted `:id` matching another user's row, the `findFirst` returns null and the route returns 404 (`pending_review_row_not_found`).

## /approve Cost-Zero Rationale

The plan's hard guarantee: **approving a queued row costs $0 Claude tokens.**

Mechanism: the row was created with `status='pending_review'` by Plan 06-03's requireReview:true branch in `/send-personalized-campaign` (apollo.ts:1054-1075). That branch:
- Calls `personalizeContactWithClaude` ONCE (~$0.069 with web_search)
- Substitutes tokens into the EmailTemplate body
- **Persists the substituted body into `row.renderedBody`**
- Skips Resend dispatch (queued for human review)

`/approve` then:
- Re-fetches the row
- Calls `resend.emails.send({ html: row.renderedBody })` — re-uses the persisted body verbatim
- Never calls `personalizeContactWithClaude` (grep verified: 0 hits inside /approve handler block)
- Updates row to `status='sent'`

Net cost on approval: 0 Claude tokens + 1 Resend send (currently $0 on free tier, $0.0004 once paid tier).

The personalization cost (`~$0.069`) was already paid when the row was queued. Approval is pure dispatch.

## /edit Re-render Rationale (MEDIUM 1 Fix)

Earlier plan iteration: when Rajesh hit Edit and changed an aiToken, only `aiTokens` JSON was persisted — the `renderedBody` column still held the OLD body with OLD substitutions. Plan 06-05's Pending Review tab reads `renderedBody` for the inbox-card preview, so Rajesh would see his edit "saved" but the preview wouldn't update. Stale-preview bug.

Fix: when `aiTokens` provided AND `renderedBody` NOT explicitly provided, the route MUST re-render `renderedBody` server-side. Re-load the row's `EmailTemplate.htmlContent` and run the same 7-placeholder substitution loop as `/send-personalized-campaign`. Persist updated `renderedBody`. Pending Review tab now shows the fresh preview on next fetch.

The 7-placeholder set is locked at `firstName + companyName + title + intentHook + companyContext + painPoint + cta` — identical to Phase 5 Plan 05-02 SUMMARY's locked decision. Adding a new placeholder would break this contract; the planner explicitly notes to keep it byte-for-byte.

Explicit `renderedBody` override wins: when Rajesh edits the rendered body directly (e.g., to fix a typo Claude missed), the route does NOT re-render — his manual edit is preserved.

409 fallback: if the row's `EmailTemplate` was deleted between queuing and editing, re-rendering is impossible. Route returns 409 `template_missing_for_rerender` with detail message instructing the user to edit `renderedBody` directly instead. No silent fallback; explicit failure mode.

## /reject Reason → aiWarning Re-use Rationale

CONTEXT.md route table (line 102): "Body: `{ reason?: string }`. Flips status to rejected, never dispatches."

Reason is optional metadata, not a primary field. Adding a dedicated `rejectionReason` column would:
- Require a new Prisma migration
- Contradict the additive-only Phase 6 schema strategy locked at Plan 06-02 (only the enum string list expanded; no new columns)
- Need to be NULL on every non-rejected row

Existing `aiWarning` column (already NULLable, already TEXT) is semantically close enough: it captures "why this row didn't go as planned." Rejection reason fits that bucket. Re-using it costs zero schema impact and matches CONTEXT.md's metadata framing.

When `reason` not provided in body, the route preserves any existing `aiWarning` value (e.g., the Phase 5 "Claude timed out" warning that may have triggered the manual review in the first place). When `reason` provided, it overwrites — accepted tradeoff; CONTEXT.md does not call out reason-vs-aiWarning preservation as a requirement.

## /edit Partial-Update Pattern

The route accepts ANY subset of `{ aiTokens, renderedBody, subject }`. At least one required (400 `no_fields_to_edit` otherwise).

Build pattern:
```ts
const updateData: Prisma.PersonalizedEmailSendUpdateInput = {};
if (aiTokens !== undefined) updateData.aiTokens = aiTokens as unknown as Prisma.InputJsonValue;
if (newRenderedBody !== undefined) updateData.renderedBody = newRenderedBody;
if (subject !== undefined) updateData.subject = subject;
```

`newRenderedBody` may be:
- The caller's explicit `renderedBody` (override wins)
- The server-re-rendered body (when aiTokens changed and no explicit body)
- `undefined` (no aiTokens AND no explicit body — only `subject` provided)

`Prisma.InputJsonValue` cast on `aiTokens` matches the existing Plan 05-02 pattern at apollo.ts:1023-1025 — avoids `as any`.

## 5-Fallback Claude Contract Preservation

`personalizeContactWithClaude` helper at lines 222-322 untouched by this commit. Plan 06-04 added 0 lines inside the helper body. Verified post-commit:

```bash
sed -n '222,322p' backend/src/routes/apollo.ts | grep -c "Claude not configured"          # → 1
sed -n '222,322p' backend/src/routes/apollo.ts | grep -c "Claude timed out"               # → 1
sed -n '222,322p' backend/src/routes/apollo.ts | grep -c "Claude returned empty response" # → 1
sed -n '222,322p' backend/src/routes/apollo.ts | grep -c "Claude returned malformed JSON" # → 2 (1 emit + 1 comment) — emit count = 1
sed -n '222,322p' backend/src/routes/apollo.ts | grep -c "Claude unavailable"             # → 1
```

5/5 distinct warning strings emitted exactly once each from the helper body (line 228 `Claude not configured`, 263 `Claude timed out — used per-stream fallback`, 279 `Claude returned empty response`, 298 `Claude returned malformed JSON`, 313 `Claude unavailable`). Phase 5 fallback contract preserved byte-for-byte.

Whole-file `grep -c` counts higher than 5/5 for some strings because the new comment blocks and the existing `normalizeFiltersWithClaude` function (separate helper) reference some of the same warning strings. Helper-body-scoped grep is the authoritative measure.

## Phase 4 Firewall (Byte-Clean Diff)

```bash
$ git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l
0
```

Plan 06-04 added 0 lines to `campaigns.ts` and 0 lines to `awsSES.ts`. Phase 4 SES BrandMonkz send path untouched.

## NetSuiteCampaignWizard.tsx 0-Touch

```bash
$ git diff HEAD~1..HEAD -- frontend/src/components/NetSuiteCampaignWizard.tsx | wc -l
0
```

Wizard continues to call `apolloApi.sendPersonalizedCampaign({...})` (the existing wizard call from Phase 5 Plan 05-03). It never calls any of the 5 new Plan 06-04 routes — those land on the new Pending Review tab introduced by Plan 06-05 on CampaignsPage.tsx.

## Verification Snapshot

| Gate                                                                      | Expected | Actual |
|---------------------------------------------------------------------------|----------|--------|
| `grep -c "renderedBody\s*String" backend/prisma/schema.prisma`            | ≥ 1      | 1      |
| `grep -c "fromEmail\s*String" backend/prisma/schema.prisma`               | ≥ 1      | 5      |
| `grep -c "router\.get('/unsent-contacts'" backend/src/routes/apollo.ts`   | 1        | 1      |
| `grep -c "router\.get('/pending-review'" backend/src/routes/apollo.ts`    | 1        | 1      |
| `grep -c "router\.post('/pending-review/:id/approve'" apollo.ts`          | 1        | 1      |
| `grep -c "router\.post('/pending-review/:id/reject'" apollo.ts`           | 1        | 1      |
| `grep -c "router\.post('/pending-review/:id/edit'" apollo.ts`             | 1        | 1      |
| `git diff HEAD~1..HEAD -- apollo.ts \| grep -c "^+router\."`              | 5        | 5      |
| `git diff HEAD~1..HEAD -- apollo.ts \| grep -c "^+.*personalizeContactWithClaude"` | 0 | 0      |
| `git diff phase-04-baseline..HEAD -- campaigns.ts awsSES.ts \| wc -l`     | 0        | 0      |
| `git diff HEAD~1..HEAD --stat \| grep -cE "frontend/"`                    | 0        | 0      |
| `git diff HEAD~1..HEAD --stat \| grep -cE "schema\.prisma\|migrations/"`  | 0        | 0      |
| `git diff HEAD~1..HEAD -- NetSuiteCampaignWizard.tsx \| wc -l`            | 0        | 0      |
| 5-fallback Claude warning strings inside helper body (lines 222-322)      | 5/5      | 5/5    |
| `npx tsc --noEmit` errors in apollo.ts                                    | 0 new    | 0 new (baseline-only errors in apiSubscriptions.controller.ts + analytics.routes.ts + subscriptions.ts + cronScheduler.ts + export.service.ts tolerated per Phase 5 SUMMARY) |
| Commit author                                                              | jeet-avatar <jm@techcloudpro.com> | jeet-avatar <jm@techcloudpro.com> |
| Single atomic commit                                                       | 1        | 1 (`d8b3350`) |
| Push fast-forward                                                          | clean    | `44b4eac..d8b3350` to origin/production |

## Deviations from Plan

None. Plan executed verbatim through Task 1 STEP 0 (pre-flight) + STEP A (GET /unsent-contacts) + STEP B (GET /pending-review) and Task 2 STEP A (POST /:id/approve) + STEP B (POST /:id/reject) + STEP C (POST /:id/edit with re-render) + STEP D (single atomic commit). No Rule-1/2/3/4 triggered. No architectural decisions required.

## Approval Note (Citation Per CONTEXT.md Rule)

User's verbatim message "lets call it approved - and send email to jm@techcloudpro.com" (logged in STATE.md Plan 06-01b) approved the **9-stream copy drafts** in Plan 06-01a's `06-STREAM-COPY.md` — NOT Plan 06-04's routes. Plan 06-04 is `autonomous: true` in its frontmatter; no approval required. This summary cites the message only to clarify scope (a future reader scanning STATE.md might assume the approval extended to Plan 06-04 routes — it did not).

## Commit

```
commit d8b3350 (HEAD -> production, origin/production)
Author: jeet-avatar <jm@techcloudpro.com>
Date:   2026-06-02

    feat(06-04): add unsent-contacts + pending-review CRUD routes — edit re-renders renderedBody (REQ-063)

 backend/src/routes/apollo.ts | 313 +++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 313 insertions(+)
```

## Self-Check: PASSED

- File `backend/src/routes/apollo.ts` exists and now contains 5 new route handlers (FOUND via `git show d8b3350 --stat`)
- Commit `d8b3350` exists on `production` and pushed to `origin/production` (FOUND via `git log --oneline -1`)
- All verification greps pass (table above)
- Phase 4 firewall byte-clean (0-line diff)
- NetSuiteCampaignWizard.tsx 0-touch in HEAD~1..HEAD diff
- TypeScript baseline preserved (0 new errors in apollo.ts)
