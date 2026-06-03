# Phase 09 — Restore "where I left off" resume tracking in NetSuiteCampaignWizard

**Created:** 2026-06-03
**Working tree:** `/Users/jeet/Documents/production-crm-backup` on `seconf`
**HARD CONSTRAINT:** **Must not break Apollo Campaign**, NetSuite Send, or arthaBuild Campaign behavior. Additive-only changes to NetSuiteCampaignWizard.

## What got lost

Commit `86fc81d feat(04-03)` rewrote NetSuiteCampaignWizard.tsx to lean 3-step and dropped the sent-contact-ids tracking that exists in `CampaignWizard.tsx` (the older "Create Campaign" wizard, still live).

Rajesh's workflow (paraphrased): sending to 21000 contacts, finds himself on page 197 because the prior 19,700 were already sent and auto-excluded, picks up at unsent contacts from there. Without sent-tracking, every wizard open shows the FULL list and he has to manually remember where he was.

## What exists (reference patterns)

| Where | What |
|---|---|
| `backend/src/routes/campaigns.ts:158` | `GET /api/campaigns/sent-contact-ids` route (LIVE — no backend work needed). Returns `{sentContactIds: [contactId1, contactId2, ...]}` |
| `frontend/src/components/CampaignWizard.tsx:85` | `const [sentContactIds, setSentContactIds] = useState<Set<string>>(new Set());` |
| `frontend/src/components/CampaignWizard.tsx:97` | `isSelectable = isValidEmail && !sentContactIds.has(contact.id)` |
| `frontend/src/components/CampaignWizard.tsx:166` | `fetch(${API_URL}/api/campaigns/sent-contact-ids, ...)` on wizard open |
| `frontend/src/components/CampaignWizard.tsx:1442` | Per-company "(N already sent)" count |
| `frontend/src/components/CampaignWizard.tsx:1491` | Per-contact "Sent" badge rendering |

## What to port (MINIMAL ADDITIVE — Apollo preservation paramount)

| Change | Where | Risk |
|---|---|---|
| Add `sentContactIds: Set<string>` state | NetSuiteCampaignWizard.tsx | 🟢 zero-risk — new state, no existing reads |
| Fetch `/api/campaigns/sent-contact-ids` on mount (useEffect with `[]`) | NetSuiteCampaignWizard.tsx | 🟢 zero-risk — backend already returns 200, just stores in state |
| Add `<span className="bg-purple-100 text-purple-700">Sent</span>` badge next to contact rows when `sentContactIds.has(contact.id)` | NetSuiteCampaignWizard.tsx (Step 1 audience render) | 🟢 zero-risk — visual-only |
| Add "Hide already-sent" filter chip at top of Step 1 contact list (default ON) — when ON, filters out contacts in sentContactIds | NetSuiteCampaignWizard.tsx | 🟡 low-risk — modifies what's displayed but NOT what's selected or sent |
| Per-company "(N already sent)" annotation | NetSuiteCampaignWizard.tsx (if company-grouped UI exists; skip if not) | 🟢 zero-risk |

## EXPLICITLY DO NOT TOUCH

- ❌ `toggleContact()` function (line ~311) — manual selection logic untouched
- ❌ `apolloApi.sendCampaign(contactIds, stream)` dispatch in `'apollo'` and `'arthabuild'` modes — Apollo path unchanged
- ❌ `apolloApi.sendPersonalizedCampaign` dispatch (when AI Preview was used)
- ❌ NetSuite mode `/api/campaigns/quick-send` dispatch
- ❌ AI Personalize Preview block on Step 2 Review
- ❌ Send Now / Send in 5 min / Send in 10 min schedule picker on Step 2 Review (apollo/arthabuild) and Step 1 Confirm (netsuite)
- ❌ ICP preset banner on Step 1 Audience (arthabuild mode)
- ❌ Stream dropdown vs locked stream behavior per mode (apollo: dropdown; arthabuild: locked to 'ArthaBuild'; netsuite: n/a)
- ❌ Backend: NO changes to `apollo.ts`, `campaigns.ts`, `personalize.ts`, `scheduledDispatcher.ts`, `apolloClient.ts`
- ❌ Sara protection: `APOLLO_FROM_EMAIL` constant untouched (backend, separate from this work)

## Mode-scope decision: GLOBAL sent-tracking (not per-mode)

For v1, sent-tracking is GLOBAL — if a contact received ANY prior campaign send (NetSuite OR Apollo OR arthaBuild), they get a "Sent" badge in all 3 mode wizards. The backend endpoint already returns global data.

Per-mode scoping (e.g., "for arthaBuild wizard, only mark contacts who got arthaBuild sends") is a Phase-10 refinement if needed. v1 matches what CampaignWizard.tsx already does for "Create Campaign".

## Verification before deploy

For each of the 3 modes (netsuite / apollo / arthabuild):
1. Open wizard via button click → check console for `/api/campaigns/sent-contact-ids` fetch (200 OK)
2. Step 1 contact list — verify "Sent" badges appear on previously-sent contacts
3. Toggle "Hide already-sent" chip OFF — verify sent contacts re-appear (don't break visibility, just default to hidden)
4. Toggle a sent contact manually — verify it stays selectable (only Select-All / Hide should respect sent-tracking)
5. **For apollo mode specifically:** verify ICP preset still loads, stream dropdown still works, AI Personalize Preview still renders, dispatch still goes via `apolloApi.sendCampaign(ids, stream)`
6. **For arthabuild mode specifically:** verify ICP preset banner still loads, stream locked to 'ArthaBuild', dispatch still goes via `apolloApi.sendCampaign(ids, 'ArthaBuild')`
7. **For netsuite mode specifically:** verify Step 1 Confirm + Schedule picker still works, dispatch goes to `/api/campaigns/quick-send`
8. **DO NOT do a live-verify send** — user explicitly opted out of prospect sends for this deploy

## Plan structure

| Plan | What |
|---|---|
| 09-01 | Single atomic commit: add sentContactIds state + fetch + badges + Hide-already-sent filter chip + per-company count (if applicable). NO dispatch path changes. NO backend changes. |
| 09-02 | Build + sign-off + deploy + 8 verification gates (per-mode regression checks) + NO live-verify send |
