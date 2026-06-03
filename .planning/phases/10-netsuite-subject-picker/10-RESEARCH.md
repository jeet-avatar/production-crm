# Phase 10 — NetSuite Subject Picker — RESEARCH + SUMMARY

**Created:** 2026-06-03
**Shipped:** Commit `0631377`
**Deployed:** brandmonkz.com asset `index-CsL_dLYL.js`

## Problem

Drift between code and DB for NetSuite Staffing campaign subjects:
- `backend/src/routes/campaigns.ts` `NETSUITE_SUBJECTS` array had 5 hardcoded subjects (used by wizard's `subjectVariant: 0..4` param)
- Prod DB `email_templates` (category='NetSuite') had 4 different subjects with rich 25998-byte bodies (ARIA + Sara/Peter signers + unsubscribe)
- The 4 DB rows were orphaned — wizard never read them

User confirmed: wants all 9 distinct subject options as a picker so Rajesh can choose per-send.

## Solution

Merged endpoint returns all 9 options with bodySource tag (`hardcoded` for the 5 code subjects, `db-template` for the 4 DB rows). `quick-send` route accepts either `subjectVariant` (legacy) or `templateId` (new) → uses template body when templateId provided.

Wizard `'netsuite'` mode Step 1 gets a `<select>` dropdown with all 9 options labeled by source.

## Apollo preservation (paramount)

Agent verified all 5 baseline grep counts EXACTLY preserved:
| Guard | Baseline | After |
|---|---|---|
| `apolloApi.send(Personalized)?Campaign` | 6 | 6 |
| `AI Personalize \| sendPersonalizedCampaign` | 14 | 14 |
| `Send Now \| Send in 5/10 min` | 8 | 8 |
| `icp-presets \| ARTHABUILD` | 6 | 6 |
| `sentContactIds \| hideAlreadySent` (Phase 09) | 13 | 13 |

## Files modified

- `backend/src/routes/campaigns.ts` (+82/-14)
- `frontend/src/components/NetSuiteCampaignWizard.tsx` (+109/-3)
- `frontend/src/services/api.ts` (+24)

## Verification (deploy gates, all green)

1. Asset hash `index-CsL_dLYL.js` live
2. `GET /api/campaigns/netsuite-subjects` → 401 auth-gated (route mounted)
3. `POST /api/campaigns/quick-send` with `{templateId: ...}` → 401 (not 400/404, validator accepts param)
4. All 4 wizard buttons preserved (Apollo×3, Send NetSuite×3, Send arthaBuild×1, Create×4)
5. Phase 09 sent-tracking strings preserved (Hiding, Show all, sent-contact-ids×2)
6. Apollo + arthaBuild routes still 401-gated
7. pm2 crm-backend online, video-generator 8D continuous (untouched)

## Rollback

`sudo tar -xzf /tmp/pre-phase10-redeploy.tar.gz -C /` on EC2.
