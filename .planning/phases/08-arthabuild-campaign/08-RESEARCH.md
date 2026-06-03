# Phase 08 — arthaBuild Marketing Campaign — RESEARCH

**Created:** 2026-06-03
**Working tree:** `/Users/jeet/Documents/production-crm-backup` on `seconf`
**Target:** New "Send arthaBuild Campaign" button on /campaigns header, manually triggered. Apollo ICP filters auto-applied. Sara-protected dispatch via existing Apollo path.

## Source material

| What | Where |
|---|---|
| arthaBuild landing page (live) | https://artha.build/ (Cloudflare-proxied) |
| Landing source code | `/Users/jeet/arthaBuild/src/frontend/src/pages/Landing.tsx` |
| All marketing copy (HERO, PROBLEM, BUILT_FOR_YOU, FINAL_CTA, FOOTER) | `/Users/jeet/arthaBuild/src/frontend/src/data/landingContent.ts` |
| Launch video narration script | `/Users/jeet/arthabuild-launch-video/NARRATION.txt` (v8.1) |
| Launch video assets (1x1, 9x16, 16x9 MP4) | `/Users/jeet/arthabuild-launch-video/out/arthabuild-launch*.mp4` |

## Positioning (LOCKED — from landingContent.ts HERO + FINAL_CTA + NARRATION v8.1)

- **Eyebrow:** "For the NetSuite superuser"
- **Headline:** "Superpowers for the NetSuite superuser."
- **Subcopy:** "You've done five NetSuite go-lives. You know the BRD revisions, the missed acceptance criteria. ArthaBuild gives you superpowers — not a tool that replaces you. BRD, technical spec, deployable SuiteScript — your team owns it."
- **PROBLEM hook:** "Six months. Fourteen BRD revisions. Three missed acceptance criteria."
- **5-stage pipeline:** intake → BRD → TBA connect → SuiteScript → SuiteCloud deploy
- **CTA:** "Free access. Magic link in sixty seconds. First fifty spots."
- **CTA URL:** https://artha.build/ (with utm_source=email&utm_campaign=launch)
- **From:** Sara <sara@techcloudpro.com>
- **Reply-to:** sara@techcloudpro.com

## Differentiators (BUILT_FOR_YOU section)

- BRD in under 10 minutes
- Local AI: Ollama on user's GPU, no calls to OpenAI/Anthropic
- RAM-only credentials: NetSuite TBA tokens never on disk
- BYOC: One Docker Compose to AWS/Azure/GCP — data never leaves user's environment

## ICP (from BUILT_FOR_YOU.cards)

3 personas served by arthaBuild:
1. **NetSuite Consultants** — compress discovery + tech-spec from weeks to one afternoon
2. **NetSuite Admins & Architects** (in-house) — treat each module like 5th time, reuse patterns at machine speed
3. **Implementation Specialists** — BRD + tech spec + SuiteScript + sandbox deploy in one pipeline

**Apollo filter preset (titles + tech):**
```js
{
  person_titles: ['NetSuite Administrator', 'NetSuite Developer', 'SuiteScript Developer',
                  'ERP Administrator', 'NetSuite Consultant', 'ERP Implementation Specialist',
                  'NetSuite Architect'],
  q_keywords: 'NetSuite SuiteScript',
  organization_locations: ['United States', 'Canada'],
  // Industries that commonly run NetSuite:
  organization_industry_tag_ids: ['manufacturing', 'distribution', 'software', 'wholesale']
}
```

## Design decisions

1. **Use existing Apollo dispatch path** (`/api/apollo/send-campaign` with `APOLLO_FROM_EMAIL = Sara`) — no new backend route needed. Pass `stream='ArthaBuild'` to use the new template via the 3-layer fallback (Stream:ArthaBuild → Stream:Other → HARDCODED).
2. **Add ArthaBuild as a 10th Stream:* template** in `backend/src/seeds/stream-templates.ts` — keeps the existing fallback ladder simple. The 9-stream classifier (`streamClassifier.ts`) does NOT need to add ArthaBuild — it's only for inbound prospect classification, and arthaBuild campaigns are manually triggered, not auto-classified.
3. **NetSuiteCampaignWizard accepts a 3rd mode `'arthabuild'`** alongside existing `'netsuite'` and `'apollo'`. Pre-loads the ArthaBuild template + the ICP preset for Apollo import. Final-step Send Now / 5 min / 10 min picker reused. AI Personalize Preview reused (optional toggle).
4. **CampaignsPage gets a 4th indigo button** "Send arthaBuild Campaign" — leftmost (before Apollo Campaign). All 4 buttons indigo `gradients.brand.primary.gradient`, NO orange.
5. **Campaign.source = 'arthabuild'** when wizard creates Campaign rows → appears in /campaigns + /campaigns/<id>/analytics alongside other campaigns.
6. **NO new SQL changes** — uses existing Campaign + EmailLog + Apollo column structure from Phase 04.
7. **Sara protection preserved** — same `APOLLO_FROM_EMAIL` constant, same reply-to, same fail-fast on RESEND_API_KEY.

## Plan structure

| Plan | Wave | Depends on | What |
|---|---|---|---|
| 08-01 | 1 | — | Backend — Stream:ArthaBuild template body + ARTHABUILD_ICP_PRESET constant in apollo.ts |
| 08-02 | 2 | 08-01 | Frontend — Wizard arthabuild mode (3rd) + Send arthaBuild Campaign button on /campaigns |
| 08-03 | 3 | 08-01, 08-02 | Deploy + visual sign-off + 10 verification gates + live-verify send to JM |

## Hard constraints (Sara/UX/git protection — same as Phase 04)

- **Sara hardcoded** — `APOLLO_FROM_EMAIL = 'Sara <sara@techcloudpro.com>'` in apollo.ts (existing, do not modify)
- **NO orange brand classes** — indigo only
- **NO Phase 6 UI mistakes** — no tab toggle, no auto-switching
- **DO NOT touch `/var/www/` on EC2** until Plan 08-03 sign-off + deploy approval
- **NO `prisma migrate deploy`** — schema unchanged
- **GitHub Push Protection** — no hardcoded secrets in any commit
- **100-contact cap** on sends (Resend quality protection)

## Anti-patterns

- ❌ Don't build a NEW backend route — reuse `/api/apollo/send-campaign`
- ❌ Don't auto-trigger sends — manual click only (per user spec)
- ❌ Don't bypass Sara FROM constant — campaign always sends FROM Sara
- ❌ Don't add arthabuild to streamClassifier.ts VALID_STREAMS — it's a campaign target, not an auto-classification stream
