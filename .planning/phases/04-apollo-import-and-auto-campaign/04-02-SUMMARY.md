---
phase: 04-apollo-import-and-auto-campaign
plan: 02
subsystem: backend/lib
tags: [apollo, http-client, typescript, prospecting]
requires: []
provides:
  - backend/src/lib/apolloClient.ts (typed Apollo.io REST client)
  - APOLLO_API_KEY documented in backend/.env.example
affects:
  - Plan 04-03 (consumes searchPeople + enrichPerson)
  - Plan 04-05 (depends on EC2 .env having APOLLO_API_KEY set)
tech-stack:
  added:
    - "@axios/post — Apollo /mixed_people/api_search + /people/match"
  patterns:
    - "Library-pure HTTP wrapper: no Express coupling, no Prisma, no env reads"
    - "Auth errors as named class (ApolloAuthError) for 401→503 mapping in caller"
    - "Failure-tolerant enrich: returns null instead of throwing"
key-files:
  created:
    - backend/src/lib/apolloClient.ts
  modified:
    - backend/.env.example
key-decisions:
  - "Library file does NOT read process.env — caller (route in 04-03) passes the key in. Keeps the library testable + reusable from scripts."
  - "enrichPerson() returns null on ANY failure (404, 401, network) so a batch import loop can simply `continue` instead of try/catch every iteration."
  - "Inline TODO documents Phase 4.5 ICP gap (keyword_tags matches consultancies as well as end-users) so future planners can find it."
metrics:
  duration_seconds: 151
  completed: 2026-05-30T20:04:21Z
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 2
---

# Phase 04 Plan 02: Apollo TS Client Library Summary

**One-liner:** Typed TypeScript port of the Python Apollo client — `searchPeople()` + `enrichPerson()` + `isEmailLocked()` as a pure HTTP wrapper that plan 04-03's `/api/apollo/import` route will consume.

## What landed

### `backend/src/lib/apolloClient.ts` (new, 231 lines)
Pure HTTP wrapper around two Apollo REST endpoints. **Zero coupling** to Express, Prisma, or `process.env` — caller injects the API key.

#### Export surface

| Export                                | Type                                                                   | Purpose                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `searchPeople(apiKey, filters)`       | `(string, ApolloSearchFilters) => Promise<ApolloSearchResponse>`       | POST `/mixed_people/api_search`. Throws `ApolloAuthError` on 401/403.                  |
| `enrichPerson(apiKey, personId)`      | `(string, string) => Promise<ApolloPerson \| null>`                    | POST `/people/match`. Never throws — null on any failure so caller can skip.           |
| `isEmailLocked(email?)`               | `(string?) => boolean`                                                 | True when email is missing, malformed, or starts with `email_not_unlocked`.            |
| `sleep(ms)`                           | `(number) => Promise<void>`                                            | Pacing helper for enrichment loops (Apollo ~30 req/min on standard tier).              |
| `ApolloAuthError`                     | `class extends Error`                                                  | Distinct error so route in 04-03 can map → HTTP 503.                                   |
| `ApolloConfigError`                   | `class extends Error`                                                  | Thrown when caller passes empty/missing apiKey to searchPeople.                        |
| `ApolloSearchFilters`                 | interface                                                              | Typed input: personTitles, personLocations, organizationKeywordTags, min/maxEmployees… |
| `ApolloPerson`                        | interface                                                              | Apollo person record (id, first_name, last_name, email, title, linkedin_url, org).     |
| `ApolloOrganization`                  | interface                                                              | Nested org (name, website_url, primary_domain, industry, estimated_num_employees).     |
| `ApolloSearchResponse`                | interface                                                              | `{ people: ApolloPerson[]; pagination?: { page, per_page, total_entries, total_pages } }` |

#### Mapping: TS exports ↔ Python source lines they port

| TypeScript export    | Python source (`scripts/video-pipeline/apollo-import-prospects.py`) | Notes                                                                       |
| -------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `searchPeople()`     | `apollo_search()` lines 76–116                                       | Same endpoint + same payload shape. TS uses interface vs Python kwargs.     |
| `enrichPerson()`     | `enrich_person()` lines 119–145                                      | Same endpoint, same body `{id, reveal_personal_emails: false}`.             |
| `isEmailLocked()`    | inline check in `normalize_person()` line 155                        | Extracted as a reusable predicate in TS.                                    |
| `ApolloAuthError`    | `sys.exit(2)` on 401/403 in `apollo_search()` lines 105–108          | Promoted from exit-code to named exception so route in 04-03 can catch it.  |
| `sleep()`            | (not in Python — caller used `time.sleep()`)                         | Added so plan 04-03's enrichment loop can pace requests.                    |

### `backend/.env.example` (modified)
Added documented `APOLLO_API_KEY=` placeholder with comment block pointing to Apollo dashboard URL and a note that EC2 holds the live key (`TQHaQL...sGGA`).

## Inline ICP-pitfall warning

A `TODO(Phase 4.5)` comment was placed directly above `searchPeople()` so future planners can locate it via grep:

```
TODO(Phase 4.5): Add q_organization_industry_tag_ids whitelist or exclude-industries
filter — currently keyword_tags can match consultancies/partners (e.g., 'NetSuite' returns
NetSuite consultancies, not end users).
```

This protects against burning Apollo credits on competitors during bulk ICP runs.

## Reminders for downstream plans

| Plan      | What it needs from 04-02                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| **04-03** | Catch `ApolloAuthError` → respond `503 { error: "Apollo key invalid or expired" }`. Read `process.env.APOLLO_API_KEY` and inject into `searchPeople()` / `enrichPerson()` calls. |
| **04-05** | Smoke test depends on **EC2 having `APOLLO_API_KEY` set** in `/var/www/crm-backend/.env`. The local `.env.example` placeholder is empty by design (CLAUDE.md memory: real key lives on EC2 only). |

## Commits

| Hash      | Type   | Description                                                              |
| --------- | ------ | ------------------------------------------------------------------------ |
| `2113f9e` | feat   | add typed Apollo.io REST client (searchPeople + enrichPerson)            |
| `5c75d21` | chore  | document APOLLO_API_KEY in backend/.env.example                          |

## Verification (content-level — see Deferred for tsc)

| Check                                                                  | Result |
| ---------------------------------------------------------------------- | ------ |
| `backend/src/lib/apolloClient.ts` exists                               | PASS   |
| Required exports present (searchPeople, enrichPerson, isEmailLocked, ApolloAuthError) | PASS (13 grep matches) |
| Endpoints present (`mixed_people/api_search` + `people/match`)         | PASS   |
| `APOLLO_API_KEY` documented in `.env.example`                          | PASS   |
| Library purity: no `express` / `prisma` / `process.env.` references    | PASS (zero code-level matches) |

## Deviations from Plan

### [Rule 3 — Pre-existing environment] Backend `node_modules` not installed locally
- **Found during:** Task 1 verification (`npx tsc --noEmit`)
- **Issue:** Workspace has no `backend/node_modules/` → tsc reports `Cannot find module 'axios'` and `Cannot find name 'setTimeout'` against apolloClient.ts, plus 1313 identical errors against every other backend file. This is project-wide, not 04-02-specific.
- **Fix:** Logged to `deferred-items.md` rather than running `npm install` (that's architectural — Rule 4 territory, affects every plan in the phase).
- **Proof it's pre-existing:** Same errors hit `routes/automation.routes.ts`, `services/geolocation.service.ts`, etc., none touched by 04-02.
- **Net result on plan correctness:** Zero. The file's grep verification, library-purity check, and visual review against the plan spec all pass. Once `node_modules` is installed (or on EC2 where it always is), tsc on apolloClient.ts will be clean.

### Task 2 commit unintentionally included pre-staged Prisma schema changes
- **Found during:** Task 2 commit (`git show --stat 5c75d21`)
- **Issue:** `git status` at executor start showed `M backend/prisma/schema.prisma` (and the root `backend/schema.prisma`) already in the staging index — left over from a previous session/plan. Adding `backend/.env.example` then committing pulled them along.
- **Fix:** Not unwound — `git reset --hard` would be destructive and the included changes look like further refinements to the 04-01 stream/apollo fields (still topical to Phase 4). Documented here for the next planner to verify they came from intended work.
- **Files affected by the contamination:** `backend/prisma/schema.prisma`, `backend/schema.prisma`.

## Self-Check: PASSED

- File `backend/src/lib/apolloClient.ts` exists at the expected path
- File `backend/.env.example` contains `APOLLO_API_KEY` placeholder
- Commits `2113f9e` and `5c75d21` exist on branch `production`
- All 6 required exports (`searchPeople`, `enrichPerson`, `isEmailLocked`, `sleep`, `ApolloAuthError`, `ApolloConfigError`) verified via grep
- Library purity verified (no Express / Prisma / process.env reads in code)
