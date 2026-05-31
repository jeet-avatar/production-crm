# NEXT SESSION — pick up here

**Last activity:** 2026-05-31 — Phase 5 COMPLETE (AI-personalized Apollo campaigns live; 2 real emails delivered to jm@techcloudpro.com from Sara). Quick-8 (v3 branded port) planned but executor not yet spawned.

---

## 🚦 STOP — read these in order

1. **Full session handoff:** `/Users/jeet/.claude/handoffs/2026-05-31-brandmonkz-phase5-complete-quick8-v3-port-pending.md`
   - Has all paths, IDs, gotchas, env vars, firewall rules, resume commands
2. **The plan to execute:** `/Users/jeet/production-crm/.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/8-PLAN.md`
3. **Current state:** `/Users/jeet/production-crm/.planning/STATE.md`

Once read, spawn the `gsd-executor` agent with the 8-PLAN.md as input. All ops happen in `/Users/jeet/production-crm/`, NOT the harness cwd.

---

## What's done (so you don't redo it)

- **Phase 03.1** (Repo + Schema Reconciliation): ✅ COMPLETE 2026-05-30
- **Phase 4** (Apollo Import + Auto-Campaign): ✅ COMPLETE 2026-05-30 — Resend send-half verified live; Apollo IMPORT verified live after key rotation
- **Phase 5** (AI-Personalized Apollo Campaigns): ✅ COMPLETE 2026-05-31 — 2 real emails landed in jm@techcloudpro.com inbox from Sara with Centella-specific AI content
- **Quick tasks 5–7**: shipped (ContactList badges, apolloApi 120s timeout + Company upsert, Claude normalize-filters + form UX)

## What's next (the one open thread)

- **Quick-8** (TCP v6 branded design → Phase 5 v3 templates): **planned, executor NOT yet spawned**. PLAN.md exists. ~$0.07 Claude cost, no Resend send (preview-only re-smoke).

## Key not-to-touch list (Phase 4 firewall)

Anchor: `phase-04-baseline` git tag (`0175cc3`). `git diff phase-04-baseline..HEAD -- <file> | wc -l` MUST = 0 for:

- `backend/src/routes/campaigns.ts`
- `backend/src/services/awsSES.ts`
- Existing `/api/apollo/send-campaign` route in `backend/src/routes/apollo.ts`

## Most-likely-to-bite gotchas

| Gotcha | Recipe |
|---|---|
| pm2 doesn't reload .env on `--update-env` alone | `cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env`. See memory `pm2-env-reload-gotcha`. |
| JWT auth reads `userId` not `sub` | Mint with `userId` claim. |
| nginx blocks default curl UA | Add `-H "User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0"` |
| Frontend Vite stale lazy chunks | `rsync --delete` on dist sync. See memory `reference_vite_stale_lazy_chunk_trap`. |
| Working dir confusion | All ops in `/Users/jeet/production-crm/`. The harness cwd is `/Users/jeet/doordash-p2p` (Dollor.ai, unrelated). |

---

*Auto-generated 2026-05-31 to preserve context across sessions.*
