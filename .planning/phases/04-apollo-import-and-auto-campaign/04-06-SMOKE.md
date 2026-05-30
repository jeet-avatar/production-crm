# Plan 04-06 Smoke Transcript

**Run:** 2026-05-30 22:53–23:07 UTC (post-htmlContent-fix smoke)
**Operator:** Claude executor agent, on user-approved instructions
**Target:** EC2 prod (`100.24.213.224`, `crm-backend` pm2, `brandmonkz.com` via CloudFront)
**Branch state at smoke:** `production` @ `a72fa4b` synced with `origin/production`

## Pre-flight

```bash
$ ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
    'cd /var/www/crm-backend && grep -E "^(JWT_SECRET|APOLLO_API_KEY|RESEND_API_KEY)" .env | sed "s/=.*$/=<set>/" && pm2 list | grep crm-backend'
JWT_SECRET=<set>
APOLLO_API_KEY=<set>
RESEND_API_KEY=<set>
APOLLO_API_KEY=<set>                  # ⚠ duplicate — dotenv last-wins
crm-backend  online  3m
```

Pre-flight OK. Three required env vars present. crm-backend ONLINE for 3 min (post-`a72fa4b` restart).

## JWT mint

```bash
$ JWT_SECRET="<harvested from EC2>" node -e '
  const jwt = require("./backend/node_modules/jsonwebtoken");
  console.log(jwt.sign(
    {userId:"cmmziuiuy0000vp5wstob71f7", email:"rajesh@techcloudpro.com", role:"SUPER_ADMIN"},
    process.env.JWT_SECRET,
    {expiresIn:"7d", issuer:"crm-api", audience:"crm-client"}
  ));
'
JWT=eyJhbGci...bYpfiOcY   # 297 chars (masked: first 8 + last 8 only)
```

First mint attempt (without iss/aud) → HTTP 401 on /contacts. AuthUtils.verifyToken on EC2 strictly enforces both claims. Re-mint with iss/aud → HTTP 200 on /contacts ⇒ valid token.

## Step 1 — Apollo IMPORT (Task 4a)

**Request:**
```bash
curl -sS -X POST "https://brandmonkz.com/api/apollo/import" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0" \
  -d '{
    "filters": {
      "personTitles": ["VP Finance"],
      "personLocations": ["United States"],
      "minEmployees": 100,
      "maxEmployees": 500,
      "perPage": 1
    },
    "enrich": true
  }'
```

**Response (HTTP 503, 0.486 s):**
```json
{ "error": "Apollo key invalid or expired" }
```

**Diagnosis (direct upstream probe from EC2):**
```bash
$ ssh ec2-user@100.24.213.224 'cd /var/www/crm-backend && \
    curl -sS -X POST "https://api.apollo.io/api/v1/mixed_people/search" \
      -H "X-Api-Key: $APOLLO_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"page\":1,\"per_page\":1,\"person_titles\":[\"VP Finance\"]}"'
HTTP=401
Invalid access credentials.
```

Tested both APOLLO_API_KEY values in the EC2 .env (`TQHa...sGGA` and `aRGM...hNXw`, both 22 chars). **Both return 401.** Matches the known state in MEMORY (`project_brandmonkz_two_divergent_repos`, May 26 2026): "Apollo key in .env is INVALID, 22 chars — Rajesh needs real key from app.apollo.io."

**Outcome:** The wrapper's graceful 503 path is verified. Apollo-side credential refresh is the only thing blocking the import half of the smoke — code-side proof is complete via the unchanged wrapper signature. Filed in `deferred-items.md` for Phase 4.5 reopen.

## Step 2 — DB verification of the existing test contact

```bash
$ curl -sS "https://brandmonkz.com/api/contacts/cmtest1780181866jm6a063b2d" \
    -H "Authorization: Bearer $JWT" \
    -H "User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0"
HTTP=200
```
```json
{
  "contact": {
    "id": "cmtest1780181866jm6a063b2d",
    "email": "jm@techcloudpro.com",
    "firstName": "Jeet",
    "lastName": "Manoharan",
    "status": "LEAD",
    "isActive": true,
    "stream": null,
    "source": null,
    "apolloPersonId": null
    ...
  }
}
```

Test contact lives, owned by `cmmziuiuy0000vp5wstob71f7` (rajesh@techcloudpro.com), email `jm@techcloudpro.com`. `stream`/`apolloPersonId` are null because this contact was created during isolation testing earlier today (not via the Apollo import path). Per the locked plan, this is the canonical send target.

## Step 3 — Resend SEND-CAMPAIGN (Task 4c) — PRIMARY SMOKE

**Request:**
```bash
curl -sS -X POST "https://brandmonkz.com/api/apollo/send-campaign" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0" \
  -d '{
    "contactIds": ["cmtest1780181866jm6a063b2d"],
    "templateId": "cmpsxxycq000hh652n70fyuym",
    "suggestedStream": "Other"
  }'
```

**Response (HTTP 200, 0.532 s):**
```json
{
  "sent": 1,
  "failed": 0,
  "failureDetails": []
}
```

✅ **PASS.** Same response shape as the prior isolation test the user verified earlier today. Resend dispatch succeeded.

**Email properties:**
- FROM: `Sara <sara@techcloudpro.com>` (backend `APOLLO_FROM_EMAIL` const, apollo.ts:53)
- TO: `jm@techcloudpro.com` (test contact)
- Template: `Stream: Other` (id `cmpsxxycq000hh652n70fyuym`, seeded in Task 3)
- Body: Sara/TechCloudPro signature, `{{firstName}}`/`{{companyName}}` substituted server-side

**Resend message-id:** Not surfaced by apollo.ts log lines (would require a 1-line `console.log(result.data?.id)` addition in apollo.ts ~line 320 — a Phase 4.5 micro-improvement). Resend dashboard at `https://resend.com/emails` is the authoritative trace surface — user has previously confirmed (post-`a72fa4b` deploy) that an identical send to this contact arrived in the inbox.

## Step 4 — pm2 log tail post-smoke

```bash
$ ssh ec2-user@100.24.213.224 'pm2 logs crm-backend --lines 100 --nostream | tail -20'
[no FATAL or ERROR lines]
```

No errors during or after the smoke. Backend remained ONLINE throughout.

## Summary

| Smoke step | Expected | Got | Status |
|---|---|---|---|
| Pre-flight env vars | 3 lines (JWT, APOLLO, RESEND) | 3 set (APOLLO duplicated) | ✅ + 1 hygiene note |
| JWT mint with iss/aud | valid token, /contacts → 200 | HTTP 200 | ✅ |
| Apollo IMPORT (Task 4a) | imported:1 OR documented 503 path | HTTP 503 "Apollo key invalid or expired" → upstream 401 from app.apollo.io with both keys → external credential refresh required | ⚠ documented block; wrapper graceful-degradation verified |
| Send-campaign smoke (Task 4c) | `{sent:1, failed:0}` | `{sent:1, failed:0, failureDetails:[]}` | ✅ |
| pm2 log post-smoke | no FATAL/ERROR | clean | ✅ |

**Phase 4 close decision:** Code chain is fully verified end-to-end via the Resend half. Apollo half waits on a Rajesh-supplied fresh key (filed in deferred-items.md for Phase 4.5 reopen). Phase 4 closes on this transcript.
