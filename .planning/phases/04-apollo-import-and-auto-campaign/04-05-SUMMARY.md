---
phase: 04-apollo-import-and-auto-campaign
plan: 05
subsystem: frontend
tags: [frontend, wizard, apollo, resend, react, modal, send-campaign]
requires:
  - 04-03-PLAN (backend POST /api/apollo/send-campaign Resend dispatcher + GET /api/email-templates?category=... filter)
  - 04-04-PLAN (frontend apolloApi.import + Apollo page that produces importedContactIds + suggestedStream)
provides:
  - NetSuiteCampaignWizard component (4-step modal, presentational)
  - contactsApi.getByIds (frontend)
  - emailTemplatesApi.findByCategory (frontend, first-match)
  - campaignsApi.aiGenerateContent (frontend wrapper for existing AI endpoint)
  - apolloApi.sendCampaign + ApolloSendCampaignResponse type (frontend)
  - GET /api/contacts ?ids=cuid1,cuid2,... filter (backend extension)
affects:
  - frontend/src/services/api.ts (4 new methods + 2 new exported types)
  - backend/src/routes/contacts.ts (3-line ?ids= filter on existing list handler)
  - (NOT YET) ApolloPage host wiring — deferred to plan 04-06
tech-stack:
  added: []
  patterns:
    - 3-layer template fallback (Stream:<x> → Stream:Other → hardcoded literal)
    - sequential setState driven 4-step wizard pattern (mirrors FollowUpWizard.tsx)
    - controlled-component checklist with Set<string> for selectedIds
    - DOMPurify-sanitized HTML preview before send
    - Apollo send path FIREWALL: NO campaignsApi.send/create/addCompany, NO emailComposerApi
key-files:
  created:
    - frontend/src/components/NetSuiteCampaignWizard.tsx (971 lines)
    - .planning/phases/04-apollo-import-and-auto-campaign/04-05-SUMMARY.md
  modified:
    - frontend/src/services/api.ts
    - backend/src/routes/contacts.ts
decisions:
  - Wizard's send button calls apolloApi.sendCampaign → POST /api/apollo/send-campaign (Resend), NOT campaigns.ts SES. USER-LOCKED 2026-05-30. Phase 4 firewall against Rajesh's existing BrandMonkz flow.
  - Wizard does NOT create a Campaign DB row in Phase 4 MVP — send tracking lives only in the Resend dispatcher response `{ sent, failed, failureDetails }`.
  - 3-layer template fallback: Stream:<suggestedStream> → Stream:Other → HARDCODED_FALLBACK constant. On layer 3 (no DB templates), templateId is null and Step 3 send button surfaces a blocking error directing user to seed templates first (because /api/apollo/send-campaign requires a real templateId for tenant-scoped lookup).
  - From-address `Sara <sara@techcloudpro.com>` is HARDCODED in the wizard preview (line 52, `APOLLO_FROM_DISPLAY` const) to match backend apollo.ts:53 `APOLLO_FROM_EMAIL`. Both stay in sync; Phase 4.5 will make this per-stream / configurable.
  - Variable substitution `{{firstName}}` + `{{companyName}}` runs SERVER-SIDE in the Resend dispatcher (per plan 04-03 mirroring campaigns.ts:546-559). Wizard does NOT pre-substitute client-side. Step 2 footer hints to the user that substitution is per-recipient.
  - The wizard imports `campaignsApi` ONLY for `aiGenerateContent` (Step 2 "Let AI write it for me" button) — that endpoint is content-generation only, not a send call. The wizard never calls `campaignsApi.create`, `campaignsApi.send`, or `campaignsApi.addCompany`. Verified via `grep -c == 0`.
  - `contactsApi.getByIds` resolves the `?ids=` query param via a 4-line WHERE extension on the existing GET /api/contacts handler. Acceptable instead of a new endpoint — preserves auth, tenant scoping, and pagination plumbing.
  - Step 3 preview renders body via `DOMPurify.sanitize` (matches FollowUpWizard.tsx:621 pattern) — prevents XSS if a template or AI-generated body contains hostile HTML.
  - Step 4 reports BOTH `sentCount` and `failedCount`. Per-contact failure details are logged to `console.warn` rather than displayed in modal — keeps the "your emails are on their way!" celebration screen clean for the non-technical user.
  - Wizard auto-resets on `isOpen` toggle — clean re-open behavior. State preserved during open (e.g. user can step back to edit subject without losing contact selection).
metrics:
  duration: ~4 min
  completed-date: 2026-05-30
  tasks-completed: 2
  files-created: 1
  files-modified: 2
  commits: 2
---

# Phase 04 Plan 05: NetSuiteCampaignWizard Summary

Built the standalone 4-step `NetSuiteCampaignWizard.tsx` component that turns an Apollo import result (`importedContactIds[] + suggestedStream`) into a sent batch of Resend emails — bypassing the existing SES campaigns route per the locked Phase 4 firewall.

## What Got Built

### Task 1 — api.ts helpers + backend `?ids=` filter (commit `9371f7c`)

**frontend/src/services/api.ts:**
- `contactsApi.getByIds(ids: string[])` — wraps `GET /api/contacts?ids=cuid1,cuid2,...`
- `emailTemplatesApi.findByCategory(category)` — wraps `GET /api/email-templates?category=...`, returns first match or null
- `campaignsApi.aiGenerateContent(goal, tone, companyName)` — wraps existing `POST /api/campaigns/ai/generate-content` (content-generation only, NOT a send call)
- `apolloApi.sendCampaign(contactIds, templateId, suggestedStream)` — wraps NEW `POST /api/apollo/send-campaign` (Resend dispatcher from plan 04-03 Task 3)
- Two exported types: `ApolloSendCampaignResponse`, `ApolloSendCampaignFailure`

**backend/src/routes/contacts.ts:**
- Extended the existing list handler at `router.get('/')` to accept `?ids=cuid1,cuid2,...`. When present, applies `where.id = { in: parsed }`. Auth/tenant scoping/pagination plumbing unchanged.

### Task 2 — NetSuiteCampaignWizard.tsx (commit `2f14467`, 971 lines)

The wizard is a controlled modal with 4 steps and a single `step: 1 | 2 | 3 | 4` state machine.

**Props:**
```ts
interface NetSuiteCampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  importedContactIds: string[];
  suggestedStream: string;
  onSuccess?: () => void;
}
```

**Flow:**

1. **On mount** (`useEffect` keyed on `isOpen + importedContactIds + suggestedStream`):
   - Fetches contacts via `contactsApi.getByIds(importedContactIds)`, pre-ticks ALL.
   - Runs the 3-layer template fallback chain (see below).
   - Cancellation flag prevents stale setState if user closes mid-fetch.

2. **Step 1 — Audience:**
   - Header chip showing imported count + suggested stream.
   - "Select all N contacts" checkbox at top of list (sticky-style row).
   - Per-contact row: checkbox + firstName lastName + company name + email.
   - Live counter "X of Y selected".
   - `Next: Write your email →` button disabled when 0 selected.

3. **Step 2 — Email:**
   - Yellow alert banner ONLY if `usingFallback === true` (layer-3 fallback) — explains sending will be blocked until templates are seeded.
   - Subject input (controlled).
   - "Let AI write it for me ✨" button → `campaignsApi.aiGenerateContent(stream + ' outreach', 'professional', firstCompanyName)`.
     - Replaces `body` with `data.content` on success.
     - On failure, sets `aiError` inline; user can still write manually (non-blocking).
   - HTML body textarea (controlled, monospace).
   - Character count + reminder that `{{firstName}}` and `{{companyName}}` substitute per-recipient server-side.

4. **Step 3 — Review:**
   - Email preview card rendered like an inbox row: From row + Subject row + HTML body (DOMPurified).
   - **From:** `Sara <sara@techcloudpro.com>` — hardcoded literal matching backend `APOLLO_FROM_EMAIL` (apollo.ts:53). VERIFIED via grep on line 52 of the wizard.
   - Live validation warnings (yellow boxes, NOT modal blockers):
     - empty subject
     - body plain-text < 50 chars
     - 0 contacts selected
   - Send error box (red) below validations when `sendError` is set.
   - "Ready to send to N contact(s) via Resend" callout.
   - `Send N email(s) now →` button disabled when validation fails OR `sending === true`.
   - On click → `apolloApi.sendCampaign(selectedContactIds, templateId, suggestedStream)`.
     - **Edge case:** if `templateId === null` (layer-3 fallback), the click sets a friendly `sendError` directing the user to seed templates first — does NOT call backend.
     - On success → `setStep(4)`, fires `onSuccess?.()`.

5. **Step 4 — Done:**
   - Big green checkmark.
   - "Your emails are on their way! ✅"
   - Reports BOTH `sentCount` and `failedCount` from the Resend response.
   - If `failedCount > 0`, an amber sub-line pointing user to browser console for per-contact details (full `failureDetails` array `console.warn`-ed at send time).
   - Two CTAs: `Go see your contacts →` (closes modal + navigates `/contacts`) and `Send another campaign` (resets state to Step 1).

## 3-Layer Template Fallback Chain (Confirmed)

The wizard's mount-time template lookup walks three layers in order:

| Layer | Source | Detail |
|---|---|---|
| 1 | `emailTemplatesApi.findByCategory('Stream:' + suggestedStream)` | First-match DB template for the exact suggested stream. Sets `templateId`. |
| 2 | `emailTemplatesApi.findByCategory('Stream:Other')` | Generic "Other" stream template — fallback when stream-specific is missing. Sets `templateId`. |
| 3 | `HARDCODED_FALLBACK` const in wizard | Last-resort literal. **Sets `templateId = null`** + `usingFallback = true`. Step 3 send is blocked with a clear error directing user to seed templates first (because `/api/apollo/send-campaign` requires a real `templateId` for tenant-scoped lookup). |

This design satisfies the "always show SOMETHING in Step 2" UX goal while keeping `/api/apollo/send-campaign` strict about requiring a real persisted template.

## Send-Path Firewall (USER-LOCKED 2026-05-30)

Confirmed via grep on the committed file:

```bash
$ grep -c "apolloApi\.sendCampaign\|/api/apollo/send-campaign\|'/apollo/send-campaign'" \
    frontend/src/components/NetSuiteCampaignWizard.tsx
4    # ← REQUIRED: wizard calls the Phase 4 Resend backend

$ grep -c "campaignsApi\.send\|campaigns/:id/send\|campaignsApi\.create\|campaignsApi\.addCompany" \
    frontend/src/components/NetSuiteCampaignWizard.tsx
0    # ← REQUIRED: wizard does NOT touch the SES campaigns route

$ grep -c "emailComposerApi" \
    frontend/src/components/NetSuiteCampaignWizard.tsx
0    # ← REQUIRED: wizard does NOT use the TODO-stub emailComposer
```

The wizard imports `campaignsApi` from `services/api`, but the only callsite is `campaignsApi.aiGenerateContent(...)` in the Step 2 AI button — that endpoint is content-generation only, not a send call. Rajesh's BrandMonkz SES campaigns flow stays byte-for-byte untouched.

## From-Address Hardcode (Step 3 Preview)

```bash
$ grep -n "sara@techcloudpro.com" frontend/src/components/NetSuiteCampaignWizard.tsx
52:const APOLLO_FROM_DISPLAY = 'Sara <sara@techcloudpro.com>';
```

Matches backend `apollo.ts:53` `APOLLO_FROM_EMAIL = 'Sara <sara@techcloudpro.com>'`. Per-stream / configurable from-address deferred to Phase 4.5.

## Verification

All 9 verify-block checks PASS:

| # | Check | Result |
|---|---|---|
| 1 | `ls frontend/src/components/NetSuiteCampaignWizard.tsx` | exists |
| 2 | `grep "importedContactIds"` | 5 matches (prop signature + body usage) |
| 3 | `grep -c "apolloApi.sendCampaign\|/api/apollo/send-campaign"` >= 1 | **4** |
| 4 | `grep -c "campaignsApi.send\|campaigns/:id/send\|campaignsApi.create\|campaignsApi.addCompany"` = 0 | **0** |
| 5 | `grep -c "emailComposerApi"` = 0 | **0** |
| 6 | `grep -c "step === [1234]"` = 4 | **4** (Steps 1, 2, 3, 4 all branched) |
| 7 | `grep "findByCategory" frontend/src/services/api.ts` | matches line 246 |
| 8 | `grep "sendCampaign" frontend/src/services/api.ts` | matches line 462 |
| 9 | `grep "sara@techcloudpro.com" Wizard` >= 1 | matches line 52 |
| 10 | `cd frontend && npx tsc --noEmit` exits 0 | **clean, zero errors** |

## Deviations from Plan

**1. [Rule 1 - Bug] Comment containing literal "campaignsApi.create/addCompany/send" string broke negative grep firewall.**
- **Found during:** Task 2 verify block
- **Issue:** A doc comment at line 170 of the wizard read `// Does NOT touch campaignsApi.create/addCompany/send. ...` — this caused `grep -c "campaignsApi\.send\|campaignsApi\.create\|campaignsApi\.addCompany"` to return `1` instead of the required `0`. The verify firewall checks code intent via raw grep and cannot distinguish comments from calls.
- **Fix:** Reworded the comment to convey the same intent without the literal anti-pattern strings: `// Phase 4 firewall: this wizard intentionally bypasses the existing SES campaigns route — no Campaign DB row is created here, tracking lives in the Resend response only.`
- **Files modified:** `frontend/src/components/NetSuiteCampaignWizard.tsx`
- **Commit:** Squashed into Task 2 commit `2f14467` (caught + fixed before commit landed).

No other deviations — plan executed exactly as written.

## Deferred Items

Per plan scope (intentionally out of scope, deferred to plan 04-06):
- Wiring the wizard onto ApolloPage (host-page mount + state plumbing for `showWizard` / `importedContactIds` / `suggestedStream` after a successful import)
- Sidebar nav linking to Apollo page (the host-side mount surface)
- Per-stream / configurable from-address (Phase 4.5)
- Persisting send results to a `Campaign` DB row (Phase 4 MVP intentionally skips this — Resend response is the only tracking surface)
- Failed-contact retry UI (current Step 4 logs to console.warn only)

## Authentication Gates

None — wizard is pure-frontend, no env vars touched, no auth needed at wizard-build time. Backend `/api/apollo/send-campaign` requires `RESEND_API_KEY` on the runtime host (per plan 04-03's module-load fail-fast), but that's a deploy-time concern handled in plan 04-06.

## Commits

| Task | Commit | Files | Author |
|------|--------|-------|--------|
| 1 | `9371f7c` | `backend/src/routes/contacts.ts`, `frontend/src/services/api.ts` | jm@techcloudpro.com |
| 2 | `2f14467` | `frontend/src/components/NetSuiteCampaignWizard.tsx` (new, 971 lines) | jm@techcloudpro.com |
| Close | (next) | This SUMMARY + STATE.md + ROADMAP.md | jm@techcloudpro.com |

## Next Plan

`04-06-PLAN.md` — Handoff/deploy plan. Wires the disabled "Start Campaign" button on `/apollo` (built in 04-04) to mount this wizard with the import's `contactIds + suggestedStream`. Then: `npx prisma db push`, rsync to EC2, pm2 restart, 1-contact smoke test, and the Phase 4 close ceremony.

## Self-Check: PASSED

- [x] `frontend/src/components/NetSuiteCampaignWizard.tsx` exists (971 lines)
- [x] `frontend/src/services/api.ts` has all 4 new methods (verified by grep)
- [x] `backend/src/routes/contacts.ts` has the `?ids=` extension
- [x] Commit `9371f7c` exists (Task 1)
- [x] Commit `2f14467` exists (Task 2)
- [x] All 10 verification checks pass (see Verification table)
- [x] TypeScript clean (`cd frontend && npx tsc --noEmit` exits 0)
- [x] Send-path firewall holds: 0 references to SES campaigns route in wizard
- [x] emailComposerApi NOT imported/used in wizard
- [x] Step 3 preview shows hardcoded `Sara <sara@techcloudpro.com>` from-address
- [x] All commits authored by `jm@techcloudpro.com` / `jeet-avatar` (production branch)
