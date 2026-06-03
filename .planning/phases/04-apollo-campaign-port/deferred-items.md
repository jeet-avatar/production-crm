# Phase 04 — Deferred Items

## TypeScript errors in `backend/src/seeds/stream-templates.ts` after 04-06 lands

Errors: `category` field missing from Prisma EmailTemplate model. 8 errors in stream-templates.ts at lines 104, 240, 758, 759, 767, 768, 769, 777.

**Cause:** Phase 04-01 plan (Wave 1, parallel) is responsible for the Prisma schema additions (`Company.{apolloOrgId, apolloRawData, domain, stream}` + `Contact.{apolloPersonId, apolloRawData, stream}` + `EmailTemplate.category`).

**Resolution:** Will auto-resolve when 04-01 lands the schema migration + `prisma generate`.

**Out-of-scope for 04-06:** This plan is CONTENT ONLY (per-stream BODIES dict). Schema is 04-01's job per the phase RESEARCH split.
