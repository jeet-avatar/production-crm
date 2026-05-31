---
phase: quick-8
plan: 8
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/seeds/stream-templates.ts
  - backend/src/routes/emailTemplates.ts
autonomous: true
requirements:
  - QUICK-08-A
  - QUICK-08-B
  - QUICK-08-C
  - QUICK-08-D
  - QUICK-08-E

must_haves:
  truths:
    - "All 9 Stream:* email_templates rows for the smoke user have htmlContent > 5000 chars (branded shell, was ~150 chars on v2)"
    - "All 9 v3 rows contain the v6 brand chrome markers (header navy, metrics row, 4 service value props, Sara signature, footer mailto)"
    - "All 9 v3 rows contain exactly 4 AI placeholders ({{intentHook}} + {{companyContext}} + {{painPoint}} + {{cta}}) inside the body region — verified by raw-template grep on the v3 body constant"
    - "Zero v3 rows contain {{videoUrl}} or {{inlineGifUrl}} or {{trackingId}} — those v6 placeholders were intentionally stripped during port"
    - "Re-running the Phase 5 Ricardo-Deben preview (templateId cmpsxxybw0007h652m8c1fjsj, contactId cmpsz0d3q000350mxrlau3sg5, previewOnly=true, testRecipient=jm@techcloudpro.com) returns audit[0].renderedBody > 5KB containing 'Hi Ricardo,' substituted + 4 AI paragraphs substituted (no raw {{intentHook}} literal) + Sara signature + mailto:sara@techcloudpro.com unsubscribe"
    - "/upgrade-streams-v3 is idempotent: first call returns upgraded:[9 names] alreadyV3:[]; second call returns upgraded:[] alreadyV3:[9 names]"
    - "Phase 4 firewall holds byte-for-byte: git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l == 0"
    - "Phase 5 send-path firewall holds: this quick task does NOT touch backend/src/routes/apollo.ts (single-commit diff over apollo.ts = 0 lines)"
  artifacts:
    - path: "backend/src/seeds/stream-templates.ts"
      provides: "STREAM_TEMPLATE_V3_BODY const (branded v6 shell with 4 AI placeholders), upgradeStreamTemplatesToV3() idempotent helper"
      contains: "STREAM_TEMPLATE_V3_BODY"
      contains_also: "upgradeStreamTemplatesToV3"
    - path: "backend/src/routes/emailTemplates.ts"
      provides: "POST /api/email-templates/upgrade-streams-v3 endpoint mirroring /upgrade-streams-v2 shape"
      contains: "upgrade-streams-v3"
    - path: ".planning/quick/8-port-tcp-v6-branded-email-design-into-ph/V3-PREVIEW.json"
      provides: "Saved full HTTP response from Case A Ricardo re-smoke (HTTP 200, personalized=1, audit[0].renderedBody with branded v6 chrome + 4 AI paragraphs)"
      min_size_bytes: 5000
  key_links:
    - from: "backend/src/seeds/stream-templates.ts STREAM_TEMPLATE_V3_BODY"
      to: "backend/src/routes/apollo.ts (read-only consumer)"
      via: "template.htmlContent fetched in /send-personalized-campaign handler at apollo.ts:921-926, then variable-substituted at apollo.ts:984-990"
      pattern: "template.htmlContent.*replace.*intentHook"
    - from: "POST /api/email-templates/upgrade-streams-v3"
      to: "9 stream Stream:* rows in email_templates table"
      via: "upgradeStreamTemplatesToV3() helper — findMany where category startsWith Stream: + update htmlContent in-place"
      pattern: "upgradeStreamTemplatesToV3.*prisma\\.emailTemplate"
    - from: "Phase 5 variable substitution loop (apollo.ts:984-990)"
      to: "8 placeholders in v3 body ({{firstName}}, {{lastName}}, {{email}}, {{companyName}}, {{intentHook}}, {{companyContext}}, {{painPoint}}, {{cta}})"
      via: "for (const [key, val] of Object.entries(vars)) { html = html.replace(new RegExp(`\\\\{\\\\{${key}\\\\}\\\\}`, 'g'), val); }"
      pattern: "\\{\\{intentHook\\}\\}.*\\{\\{companyContext\\}\\}.*\\{\\{painPoint\\}\\}.*\\{\\{cta\\}\\}"
---

<objective>
Port the existing TCP v6 branded email shell into Phase 5 stream templates as a new v3 body, then upgrade all 9 prod Stream:* rows to v3 via a new idempotent endpoint, then re-run the Phase 5 Case A preview against Ricardo Deben to prove the branded body renders end-to-end. No Resend send (preview only).

Purpose: Phase 5 currently ships AI-personalized content inside the plain v2 stream-template body (~150 chars). The user has confirmed Sara as the sender (May 26 rotation) and now wants the 4 AI tokens wrapped in the v6 branded shell that Sara's TCP retargeting pipeline already uses (header, navy chrome, metrics row, 4 service value props, ArthaBuild AI banner, 30-day guarantee, 4 CTA buttons, Sara signature, footer). Video CTA + tracking pixel get stripped — v3 is preview-friendly and Phase-5-compatible (4 AI placeholders only, no extra renderer state).

Output: `STREAM_TEMPLATE_V3_BODY` const + `upgradeStreamTemplatesToV3()` helper in stream-templates.ts, `POST /api/email-templates/upgrade-streams-v3` endpoint in emailTemplates.ts, 9 prod Stream:* rows in `email_templates` table on EC2 with htmlContent updated to v3, saved `V3-PREVIEW.json` evidence file showing Ricardo's branded preview body.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/7-apollo-form-claude-auto-correct-on-searc/7-SUMMARY.md

# Existing v1 seeder + v2 upgrade helper (extend with v3 — do NOT modify v1/v2)
@backend/src/seeds/stream-templates.ts

# Existing /upgrade-streams-v2 endpoint (mirror shape for v3)
@backend/src/routes/emailTemplates.ts

# Read-only Phase 5 send-path consumer — confirms variable substitution covers 4 AI tokens; DO NOT modify
@backend/src/routes/apollo.ts

# Source HTML to port (sandbox repo, READ ONLY — do not commit reference into production-crm)
# Path: /Users/jeet/Documents/CRM Module/crm-pipeline/tcp-retargeting/templates/tcp-v6-email-template.html
# 297 lines, 23KB. Sara-ready (0 Peter refs). Placeholders: {{firstName}}, {{companyName}}, {{whyThis}}, {{videoUrl}}, {{inlineGifUrl}}, {{trackingId}}, {{unsubscribeUrl}}
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add STREAM_TEMPLATE_V3_BODY + upgradeStreamTemplatesToV3 + /upgrade-streams-v3 endpoint (single atomic commit)</name>
  <files>backend/src/seeds/stream-templates.ts, backend/src/routes/emailTemplates.ts</files>
  <action>
    Working directory: `/Users/jeet/production-crm/` (NOT cwd doordash-p2p).

    **STEP A — Extend stream-templates.ts with v3 body + upgrade helper. PRESERVE v1/v2 byte-for-byte.**

    Append (do NOT modify existing v1 STREAM_TEMPLATE_SEEDS, v1 seedStreamTemplates, v2 STREAM_TEMPLATE_V2_BODY, v2 STREAM_FALLBACKS, v2 upgradeStreamTemplatesToV2, or getStreamFallbacks) to the END of the file:

    ```typescript
    // ---------------------------------------------------------------------------
    // Phase quick-8: v3 body shape — port of the TCP v6 branded email shell
    // (source: /Users/jeet/Documents/CRM Module/crm-pipeline/tcp-retargeting/templates/tcp-v6-email-template.html)
    //
    // Differences from the source v6 shell:
    //   1. STRIP the video poster row (the <a href="{{videoUrl}}"> + <img {{inlineGifUrl}}>
    //      + VML round-rect + "Watch with sound" button + their wrapping <table> at navy bgcolor #0F172A).
    //   2. STRIP the tracking pixel ({{trackingId}} <img src=brandmonkz.com/api/tracking/open/...>).
    //   3. REPLACE the {{whyThis}} block in the orange-tinted "About this note to {{companyName}}" callout
    //      with 4 separate <p> tags, one per Phase 5 AI token, each styled to match the surrounding body:
    //        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{intentHook}}</p>
    //        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{companyContext}}</p>
    //        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{painPoint}}</p>
    //        <p style="margin:0 0 0 0;font-size:14px;line-height:1.7;color:#7C2D12;">{{cta}}</p>
    //      (Color #7C2D12 = darker orange, matches the C2410C label tone in the callout. Last <p> has 0 bottom margin.)
    //   4. Replace {{unsubscribeUrl}} hardcoded mailto:sara@techcloudpro.com?subject=Unsubscribe (per scope: hardcoded mailto, NOT a tracking URL).
    //   5. Leave KEPT placeholders ({{firstName}}, {{companyName}}) untouched — Phase 5 substitution loop handles them.
    //
    // Total placeholder set in v3:
    //   - {{firstName}}, {{companyName}}  — substituted by Phase 5 vars loop (apollo.ts:973-982)
    //   - {{intentHook}}, {{companyContext}}, {{painPoint}}, {{cta}}  — substituted by Phase 5 vars loop (same)
    //
    // No {{whyThis}}, no {{videoUrl}}, no {{inlineGifUrl}}, no {{trackingId}}, no {{unsubscribeUrl}}.
    //
    // Phase 5 variable-substitution loop (apollo.ts:984-990) uses `\{\{key\}\}` regex per known var,
    // so any token NOT in `vars` survives as a literal in the rendered body. We MUST NOT introduce
    // new placeholders v3-only — only the 4 AI tokens + 2 contact tokens that vars already covers.
    // ---------------------------------------------------------------------------

    export const STREAM_TEMPLATE_V3_BODY = `<!DOCTYPE html>
    <html lang="en">
    <head>
    ... <PASTE FULL v6 SHELL HERE, with the 5 transformations above applied> ...
    </body>
    </html>`;

    /**
     * Idempotent in-place upgrade of the 9 Stream:* email_templates rows from v2 → v3.
     * Detection sentinel: htmlContent.includes('STREAM_TEMPLATE_V3') is NOT what we use because
     * we substitute the entire string, not embed a marker. Instead use a structural marker UNIQUE
     * to v3 vs. v2: the v6 shell always contains the literal string `1000+ Implementations` from
     * the metrics row. v2 body (~150 chars, 5 <p> tags) does NOT contain this string. Use it as
     * the v3 sentinel.
     *
     * Returns the same shape as upgradeStreamTemplatesToV2:
     *   { upgraded: string[], alreadyV3: string[], total: number }
     */
    export async function upgradeStreamTemplatesToV3(
      prisma: PrismaClient,
      userId: string,
    ): Promise<{ upgraded: string[]; alreadyV3: string[]; total: number }> {
      const rows = await prisma.emailTemplate.findMany({
        where: { userId, category: { startsWith: 'Stream:' } },
        select: { id: true, name: true, htmlContent: true },
      });

      const upgraded: string[] = [];
      const alreadyV3: string[] = [];

      for (const row of rows) {
        if ((row.htmlContent || '').includes('1000+ Implementations')) {
          alreadyV3.push(row.name);
          continue;
        }
        await prisma.emailTemplate.update({
          where: { id: row.id },
          data: { htmlContent: STREAM_TEMPLATE_V3_BODY },
        });
        upgraded.push(row.name);
      }

      return { upgraded, alreadyV3, total: rows.length };
    }
    ```

    **HOW TO BUILD STREAM_TEMPLATE_V3_BODY exactly:**

    1. Read `/Users/jeet/Documents/CRM Module/crm-pipeline/tcp-retargeting/templates/tcp-v6-email-template.html` line-by-line (already loaded in context). Use Read tool, NOT cat.
    2. Copy the ENTIRE file content into the backtick template literal.
    3. Apply these 5 transformations:
       - **DELETE the tracking pixel `<img>` tag** at line ~31 (`<img src="https://brandmonkz.com/api/tracking/open/{{trackingId}}" ... />`) and its preceding comment.
       - **DELETE the entire video-poster `<table>` block** at lines ~86-104 (the `<table role="presentation" ... bgcolor="#0F172A">` containing the `<a href="{{videoUrl}}">` + `<img class="video-poster" src="{{inlineGifUrl}}">` + VML round-rect + "Watch with sound" anchor + closing `</table>`). The block STARTS with `<!-- Inline GIF (autoplays). Click "Watch with sound" to open full MP4. -->` and ENDS with the table's `</table>` closing tag (line ~104).
       - **REPLACE `{{whyThis}}`** at line ~116 with the 4-paragraph block exactly as shown above (intentHook / companyContext / painPoint / cta as 4 separate `<p>` tags, color #7C2D12, last has 0 bottom margin).
       - **REPLACE `{{unsubscribeUrl}}`** at line ~290 with the literal string `mailto:sara@techcloudpro.com?subject=Unsubscribe` (so the rendered link is `<a href="mailto:sara@techcloudpro.com?subject=Unsubscribe">`).
       - **PRESERVE everything else byte-for-byte**: `<head>`, brand colors, header table with navy chrome + "Four ways we can help", metrics row (1000+ Implementations / Since 2015 / 94% Faster Close / $1/contract), intro paragraph, ArthaBuild AI banner, 4 service value props, 30-day guarantee, 4 CTA buttons, Sara signature, footer.
    4. Backtick template literal MUST escape backticks if any appear in the source (none expected — quick visual check during edit). NO `${}` template interpolation in the body — Phase 5 uses `{{token}}` substitution at runtime, NOT JS template literals.

    **STEP B — Add POST /api/email-templates/upgrade-streams-v3 endpoint to emailTemplates.ts:**

    Open `backend/src/routes/emailTemplates.ts`. At the top of the file, extend the existing import from `'../seeds/stream-templates'` (currently imports `seedStreamTemplates`, `STREAM_TEMPLATE_SEEDS`, `upgradeStreamTemplatesToV2`) by ADDING `upgradeStreamTemplatesToV3` to the same import list:

    ```typescript
    import {
      seedStreamTemplates,
      STREAM_TEMPLATE_SEEDS,
      upgradeStreamTemplatesToV2,
      upgradeStreamTemplatesToV3,
    } from '../seeds/stream-templates';
    ```

    Immediately AFTER the existing `router.post('/upgrade-streams-v2', ...)` handler (currently ending at the `});` on line ~120), ADD a mirror v3 handler. Place the new handler BEFORE the `router.get('/:id', ...)` handler so the literal route doesn't get shadowed by the id param:

    ```typescript
    /**
     * POST /api/email-templates/upgrade-streams-v3
     * Phase quick-8: in-place upgrade of the 9 Stream:* templates from v2 → v3 branded shell
     * (TCP v6 shell with header, metrics row, 4 service value props, Sara signature, mailto unsubscribe).
     * Idempotent — second call returns upgraded:[] alreadyV3:[...9 names].
     */
    router.post('/upgrade-streams-v3', async (req, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'unauthenticated' });
        }

        const result = await upgradeStreamTemplatesToV3(prisma, userId);
        return res.json(result);
      } catch (error: any) {
        console.error('[email-templates.upgrade-streams-v3] error:', error);
        return res.status(500).json({
          error: 'upgrade_failed',
          detail: error?.message,
        });
      }
    });
    ```

    **STEP C — Build backend dist locally to verify TypeScript compiles:**

    ```bash
    cd /Users/jeet/production-crm/backend && npm run build 2>&1 | tail -40
    ```

    Expected: `tsc` exits 0. If any TS error involves the new code, fix in-place. If pre-existing Phase 5 / Phase 4 errors appear, treat as pre-existing per Phase 5 SUMMARY (tsc is best-effort; deploy gate is in Task 2 dist verification).

    **STEP D — Single atomic commit with jm@techcloudpro.com author:**

    ```bash
    cd /Users/jeet/production-crm
    git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
      add backend/src/seeds/stream-templates.ts backend/src/routes/emailTemplates.ts
    git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
      commit -m "$(cat <<'EOF'
    feat(quick-8): port TCP v6 branded shell as v3 stream template body

    Adds STREAM_TEMPLATE_V3_BODY (v6 shell minus video CTA + tracking pixel,
    with 4 AI placeholders replacing {{whyThis}}) plus idempotent
    upgradeStreamTemplatesToV3 helper and POST /api/email-templates/upgrade-streams-v3
    endpoint. v1 seeder, v2 body, and v2 upgrade endpoint preserved byte-for-byte.
    Phase 5 send-path firewall preserved (apollo.ts untouched).

    Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
    EOF
    )"
    ```

    Push fast-forward:

    ```bash
    git push origin production
    ```

    Expected: fast-forward push, no rewrite, no force.
  </action>
  <verify>
    Working directory: `/Users/jeet/production-crm/`.

    **Code-shape verify (FAIL the task if any assertion below mismatches):**

    ```bash
    cd /Users/jeet/production-crm

    # 1. v3 body const exists
    [ $(grep -c "STREAM_TEMPLATE_V3_BODY" backend/src/seeds/stream-templates.ts) -ge 2 ] && echo "PASS-1" || echo "FAIL-1"
    # ≥2: 1 export const declaration + 1 reference inside upgradeStreamTemplatesToV3

    # 2. v3 upgrade helper exists
    [ $(grep -c "upgradeStreamTemplatesToV3" backend/src/seeds/stream-templates.ts) -ge 1 ] && echo "PASS-2" || echo "FAIL-2"

    # 3. v3 endpoint exists
    [ $(grep -c "upgrade-streams-v3" backend/src/routes/emailTemplates.ts) -ge 1 ] && echo "PASS-3" || echo "FAIL-3"

    # 4. v3 helper imported into router
    [ $(grep -c "upgradeStreamTemplatesToV3" backend/src/routes/emailTemplates.ts) -ge 2 ] && echo "PASS-4" || echo "FAIL-4"
    # ≥2: 1 import + 1 call site

    # 5. Video placeholders STRIPPED from v3 body — scope is between STREAM_TEMPLATE_V3_BODY declaration and the next blank-line block boundary
    # We extract the v3 body region via awk and count video placeholders inside it
    V3_BODY_REGION=$(awk '/export const STREAM_TEMPLATE_V3_BODY = `/,/^`;$/' backend/src/seeds/stream-templates.ts)
    [ $(echo "$V3_BODY_REGION" | grep -cE "\{\{videoUrl\}\}|\{\{inlineGifUrl\}\}|\{\{trackingId\}\}") -eq 0 ] && echo "PASS-5" || echo "FAIL-5"

    # 6. mailto:sara@techcloudpro.com present (replaces {{unsubscribeUrl}})
    [ $(grep -c "mailto:sara@techcloudpro.com" backend/src/seeds/stream-templates.ts) -ge 1 ] && echo "PASS-6" || echo "FAIL-6"

    # 7. EXACTLY 4 AI placeholders in v3 body region (one occurrence each)
    [ $(echo "$V3_BODY_REGION" | grep -oE "\{\{intentHook\}\}|\{\{companyContext\}\}|\{\{painPoint\}\}|\{\{cta\}\}" | sort -u | wc -l | tr -d ' ') -eq 4 ] && echo "PASS-7" || echo "FAIL-7"

    # 8. v6 branded marker present (sentinel for idempotent detection)
    [ $(echo "$V3_BODY_REGION" | grep -c "1000+ Implementations") -ge 1 ] && echo "PASS-8" || echo "FAIL-8"

    # 9. v2 body preserved byte-for-byte (no regression)
    [ $(grep -c "STREAM_TEMPLATE_V2_BODY" backend/src/seeds/stream-templates.ts) -ge 2 ] && echo "PASS-9" || echo "FAIL-9"

    # 10. v2 endpoint preserved
    [ $(grep -c "upgrade-streams-v2" backend/src/routes/emailTemplates.ts) -ge 1 ] && echo "PASS-10" || echo "FAIL-10"

    # 11. Phase 4 firewall (the high bar — phase-04-baseline tag)
    [ $(git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l | tr -d ' ') -eq 0 ] && echo "PASS-11" || echo "FAIL-11"

    # 12. Phase 5 send-path firewall — THIS COMMIT does NOT touch apollo.ts
    [ $(git diff HEAD~1..HEAD --stat | grep -c "apollo.ts") -eq 0 ] && echo "PASS-12" || echo "FAIL-12"
    ```

    All 12 must print PASS-N. Any FAIL aborts the task.

    **tsc gate:**
    ```bash
    cd /Users/jeet/production-crm/backend && npm run build 2>&1 | grep -E "(error TS|Build complete|Done)" | head -20
    ```
    Acceptable: 0 new errors. Pre-existing Phase 5 / 4 errors per SUMMARY allowed (route file uses idioms already proven in adjacent handlers).
  </verify>
  <done>
    - STREAM_TEMPLATE_V3_BODY const added to stream-templates.ts; body contains brand chrome ("1000+ Implementations") + 4 AI placeholders + mailto:sara@techcloudpro.com unsubscribe; zero video/tracking placeholders.
    - upgradeStreamTemplatesToV3() async helper added to stream-templates.ts; mirrors v2 helper shape (idempotent via "1000+ Implementations" sentinel).
    - POST /api/email-templates/upgrade-streams-v3 endpoint added to emailTemplates.ts; mirrors /upgrade-streams-v2 shape; placed BEFORE /:id route to avoid shadow.
    - All 12 code-shape verify assertions PASS.
    - Single atomic commit pushed fast-forward to origin/production with author jm@techcloudpro.com (no --force, no amend).
    - tsc --noEmit completes without new errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy backend dist to EC2, run /upgrade-streams-v3 twice (idempotent proof), re-smoke Case A preview against Ricardo, save V3-PREVIEW.json evidence</name>
  <files>/var/www/crm-backend/dist/seeds/stream-templates.js, /var/www/crm-backend/dist/routes/emailTemplates.js, .planning/quick/8-port-tcp-v6-branded-email-design-into-ph/V3-PREVIEW.json</files>
  <action>
    Working directory: `/Users/jeet/production-crm/`.

    **STEP A — Build + tarball backend dist (frontend unchanged this task — DO NOT rebuild or rsync frontend):**

    ```bash
    cd /Users/jeet/production-crm/backend
    npm run build  # idempotent if Task 1 already ran it; safe to repeat

    # Tarball only the dist tree
    tar -czf /tmp/quick8-backend.tar.gz -C /Users/jeet/production-crm/backend/dist .
    ls -la /tmp/quick8-backend.tar.gz  # expect ~500KB-1MB
    ```

    **STEP B — scp + extract to /var/www/crm-backend/dist/ on EC2 (the canonical PM2-watched path per Task 1 of Phase 5 SUMMARY):**

    Use the EC2 SSH/SCP recipe established in Phase 5 + quick-7 SUMMARYs. The pattern is:

    ```bash
    # scp tarball to EC2 /tmp/
    scp /tmp/quick8-backend.tar.gz <EC2_USER>@<EC2_HOST>:/tmp/quick8-backend.tar.gz

    # ssh in, sudo-extract into a staging dir, rsync into canonical dist
    ssh <EC2_USER>@<EC2_HOST> '
      sudo mkdir -p /tmp/quick8-extract &&
      sudo tar -xzf /tmp/quick8-backend.tar.gz -C /tmp/quick8-extract &&
      sudo rsync -av /tmp/quick8-extract/ /var/www/crm-backend/dist/ &&
      sudo rm -rf /tmp/quick8-extract /tmp/quick8-backend.tar.gz
    '

    # Clean local tarball
    rm /tmp/quick8-backend.tar.gz
    ```

    Use the EXACT EC2 host + user from the operator's session env (matches the recipe in quick-7 SUMMARY § Deploy). DO NOT invent host/user values — if the env var is not set, abort and ask the operator.

    **STEP C — Verify dist on EC2 contains the new code:**

    ```bash
    ssh <EC2_USER>@<EC2_HOST> '
      sudo grep -c "STREAM_TEMPLATE_V3_BODY" /var/www/crm-backend/dist/seeds/stream-templates.js
      sudo grep -c "upgradeStreamTemplatesToV3" /var/www/crm-backend/dist/seeds/stream-templates.js
      sudo grep -c "upgrade-streams-v3" /var/www/crm-backend/dist/routes/emailTemplates.js
      sudo grep -c "1000+ Implementations" /var/www/crm-backend/dist/seeds/stream-templates.js
      sudo grep -c "mailto:sara@techcloudpro.com" /var/www/crm-backend/dist/seeds/stream-templates.js
    '
    ```

    Expect: ≥2 / ≥1 / ≥1 / ≥1 / ≥1. ANY zero = abort, investigate dist build before restarting pm2.

    **STEP D — pm2 restart with locked env-reload recipe (per Phase 5 SUMMARY + quick-7 SUMMARY):**

    ```bash
    ssh <EC2_USER>@<EC2_HOST> '
      cd /var/www/crm-backend && set -a && source .env && set +a && pm2 restart crm-backend --update-env
      pm2 list | grep crm-backend
    '
    ```

    Expect: `crm-backend  online  fork  ... restarts <prev+1>`. Wait ~3 seconds for cold-start before next step.

    **STEP E — Mint a smoke JWT on EC2 with the locked Phase 5 issuer/audience claims (`issuer: crm-api`, `audience: crm-client`, the Ricardo smoke userId):**

    ```bash
    ssh <EC2_USER>@<EC2_HOST> '
      cd /var/www/crm-backend && set -a && source .env && set +a && node -e "
        const jwt = require(\"jsonwebtoken\");
        const tok = jwt.sign(
          { userId: \"cmmziuiuy0000vp5wstob71f7\" },
          process.env.JWT_SECRET,
          { issuer: \"crm-api\", audience: \"crm-client\", expiresIn: \"30m\" }
        );
        console.log(tok);
      "
    ' > /tmp/quick8-jwt.txt

    JWT=$(cat /tmp/quick8-jwt.txt | tr -d "\r\n")
    [ ${#JWT} -ge 200 ] && echo "JWT-OK (${#JWT} chars)" || (echo "JWT-FAIL"; exit 1)
    ```

    The userId `cmmziuiuy0000vp5wstob71f7` is the Phase 5 smoke account that owns the 9 Stream:* templates including `cmpsxxybw0007h652m8c1fjsj` (Cybersecurity stream — Phase 5 Case A target) and the Ricardo contact `cmpsz0d3q000350mxrlau3sg5`. Source: STATE.md Phase 5 Plan 05-04 Decision 4.

    **STEP F — Call /upgrade-streams-v3 TWICE (idempotency proof):**

    ```bash
    # Call 1: expect upgraded=9, alreadyV3=0
    curl -sS -X POST "https://brandmonkz.com/api/email-templates/upgrade-streams-v3" \
      -H "Authorization: Bearer $JWT" \
      -H "Content-Type: application/json" \
      -H "User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0" \
      -d '{}' \
      -o /tmp/quick8-upgrade1.json \
      -w "HTTP %{http_code}\n"

    cat /tmp/quick8-upgrade1.json | python3 -m json.tool
    # Expect: {"upgraded":["Stream: Cybersecurity", ...9 names], "alreadyV3":[], "total":9}

    # Call 2: expect upgraded=0, alreadyV3=9
    curl -sS -X POST "https://brandmonkz.com/api/email-templates/upgrade-streams-v3" \
      -H "Authorization: Bearer $JWT" \
      -H "Content-Type: application/json" \
      -H "User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0" \
      -d '{}' \
      -o /tmp/quick8-upgrade2.json \
      -w "HTTP %{http_code}\n"

    cat /tmp/quick8-upgrade2.json | python3 -m json.tool
    # Expect: {"upgraded":[], "alreadyV3":["Stream: Cybersecurity", ...9 names], "total":9}
    ```

    Acceptance:
    - Call 1: HTTP 200 + JSON.upgraded.length == 9 + JSON.alreadyV3.length == 0 + JSON.total == 9
    - Call 2: HTTP 200 + JSON.upgraded.length == 0 + JSON.alreadyV3.length == 9 + JSON.total == 9

    If either fails, scrape pm2 error logs (`ssh ... 'pm2 logs crm-backend --err --lines 100 --nostream | tail -50'`) and abort.

    **STEP G — Authoritative psql verification of the smoke template row:**

    ```bash
    ssh <EC2_USER>@<EC2_HOST> '
      cd /var/www/crm-backend && set -a && source .env && set +a && \
      psql "$DATABASE_URL" -A -t -c "
        SELECT
          LENGTH(\"htmlContent\") > 5000 AS body_grew_past_v2_size,
          \"htmlContent\" LIKE \"%Sara%\" AS has_sara,
          \"htmlContent\" LIKE \"%1000+ Implementations%\" AS has_brand_chrome,
          \"htmlContent\" LIKE \"%{{intentHook}}%\" AS has_intent_hook_placeholder,
          \"htmlContent\" LIKE \"%mailto:sara@techcloudpro.com%\" AS has_mailto_unsubscribe,
          \"htmlContent\" NOT LIKE \"%{{videoUrl}}%\" AS video_stripped,
          \"htmlContent\" NOT LIKE \"%{{trackingId}}%\" AS tracking_stripped
        FROM email_templates
        WHERE id = '\''cmpsxxybw0007h652m8c1fjsj'\'';
      "
    '
    ```

    Expected output (single row, all booleans `t`): `t|t|t|t|t|t|t`. ANY `f` aborts the task with a row-by-row diagnosis.

    **STEP H — Re-run Phase 5 Case A preview against Ricardo Deben (HARD acceptance — this is the "did the branded body actually render" gate):**

    ```bash
    curl -sS -X POST "https://brandmonkz.com/api/apollo/send-personalized-campaign" \
      -H "Authorization: Bearer $JWT" \
      -H "Content-Type: application/json" \
      -H "User-Agent: Mozilla/5.0 (X11; Linux) BrandMonkz-Smoke/1.0" \
      -d '{
        "contactIds":["cmpsz0d3q000350mxrlau3sg5"],
        "templateId":"cmpsxxybw0007h652m8c1fjsj",
        "suggestedStream":"Cybersecurity",
        "previewOnly":true,
        "testRecipient":"jm@techcloudpro.com"
      }' \
      -o /tmp/quick8-v3-preview.json \
      -w "HTTP %{http_code}\n"

    # Pretty-print for the operator
    python3 -m json.tool < /tmp/quick8-v3-preview.json | head -120
    ```

    **HARD acceptance (each MUST hold — any miss aborts):**

    ```bash
    # Read the JSON into shell vars for clean assertions
    PERSONALIZED=$(python3 -c "import json; print(json.load(open('/tmp/quick8-v3-preview.json'))['personalized'])")
    PFAIL=$(python3 -c "import json; print(json.load(open('/tmp/quick8-v3-preview.json'))['personalizeFailures'])")
    BODY=$(python3 -c "import json; print(json.load(open('/tmp/quick8-v3-preview.json'))['audit'][0]['renderedBody'])")
    BODY_LEN=${#BODY}

    # 1. Personalization succeeded
    [ "$PERSONALIZED" = "1" ] && echo "PASS-A1" || echo "FAIL-A1"
    [ "$PFAIL" = "0" ] && echo "PASS-A2" || echo "FAIL-A2"

    # 2. Branded body grew past v2 (~150 chars) to v3 (>5KB)
    [ $BODY_LEN -gt 5000 ] && echo "PASS-A3" || echo "FAIL-A3"

    # 3. Brand chrome present in rendered output
    echo "$BODY" | grep -q "1000+ Implementations" && echo "PASS-A4" || echo "FAIL-A4"
    echo "$BODY" | grep -q "Sara" && echo "PASS-A5" || echo "FAIL-A5"
    echo "$BODY" | grep -q "mailto:sara@techcloudpro.com" && echo "PASS-A6" || echo "FAIL-A6"

    # 4. Hi Ricardo,  was substituted (the {{firstName}} placeholder is gone, real name in)
    echo "$BODY" | grep -q "Hi Ricardo" && echo "PASS-A7" || echo "FAIL-A7"
    echo "$BODY" | grep -cq "{{firstName}}" && echo "FAIL-A8 (firstName leaked)" || echo "PASS-A8"

    # 5. 4 AI tokens were substituted (raw placeholders are gone)
    echo "$BODY" | grep -cq "{{intentHook}}" && echo "FAIL-A9 (intentHook leaked)" || echo "PASS-A9"
    echo "$BODY" | grep -cq "{{companyContext}}" && echo "FAIL-A10 (companyContext leaked)" || echo "PASS-A10"
    echo "$BODY" | grep -cq "{{painPoint}}" && echo "FAIL-A11 (painPoint leaked)" || echo "PASS-A11"
    echo "$BODY" | grep -cq "{{cta}}" && echo "FAIL-A12 (cta leaked)" || echo "PASS-A12"

    # 6. Video CTA was stripped from the rendered body (defense in depth — already checked in STEP G but reconfirm at render layer)
    echo "$BODY" | grep -cq "Watch with sound" && echo "FAIL-A13 (video CTA leaked)" || echo "PASS-A13"
    echo "$BODY" | grep -cq "{{videoUrl}}" && echo "FAIL-A14 (videoUrl leaked)" || echo "PASS-A14"
    ```

    All 14 must PASS. Any FAIL = abort.

    **STEP I — Save evidence file:**

    ```bash
    cp /tmp/quick8-v3-preview.json /Users/jeet/production-crm/.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/V3-PREVIEW.json

    ls -la /Users/jeet/production-crm/.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/V3-PREVIEW.json
    # Expect: size > 5KB (full body audit row included)
    ```

    Add the evidence file to git and commit (separate from Task 1's code commit to keep the evidence atomic + auditable):

    ```bash
    cd /Users/jeet/production-crm
    git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
      add .planning/quick/8-port-tcp-v6-branded-email-design-into-ph/V3-PREVIEW.json
    git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" \
      commit -m "$(cat <<'EOF'
    docs(quick-8): save V3-PREVIEW.json evidence from Ricardo Deben re-smoke

    Full HTTP response from POST /api/apollo/send-personalized-campaign with
    previewOnly=true, templateId=cmpsxxybw0007h652m8c1fjsj, contactId=cmpsz0d3q000350mxrlau3sg5.
    Branded v6 body rendered with 4 AI paragraphs + Sara signature + mailto unsubscribe;
    zero leaked placeholders.

    Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
    EOF
    )"

    git push origin production
    ```

    Clean local + EC2 scratch:

    ```bash
    rm -f /tmp/quick8-upgrade1.json /tmp/quick8-upgrade2.json /tmp/quick8-v3-preview.json /tmp/quick8-jwt.txt
    ssh <EC2_USER>@<EC2_HOST> 'sudo rm -f /tmp/quick8-*.json /tmp/quick8-*.tar.gz /tmp/quick8-jwt.txt'
    ```
  </action>
  <verify>
    All 14 hard-acceptance assertions from STEP H print PASS-A*. All 5 dist-grep counts from STEP C are ≥ expected. Both /upgrade-streams-v3 calls return HTTP 200 with the expected upgraded/alreadyV3 shape. psql row returns all `t`. V3-PREVIEW.json saved to .planning, size > 5KB, contains audit[0].renderedBody with brand chrome. Evidence commit pushed fast-forward to origin/production.

    **Firewall re-verify (post-Task-2 commit):**

    ```bash
    cd /Users/jeet/production-crm
    # Phase 4 firewall holds across BOTH commits
    [ $(git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l | tr -d ' ') -eq 0 ] && echo "PASS-FW1" || echo "FAIL-FW1"

    # Phase 5 send-path firewall holds across BOTH commits
    [ $(git diff HEAD~2..HEAD --stat | grep -c "apollo.ts") -eq 0 ] && echo "PASS-FW2" || echo "FAIL-FW2"

    # Phase 4 UI firewall holds (no touches to wizard/contact-list/apollo-page/apollo-form)
    [ $(git diff HEAD~2..HEAD --stat | grep -cE "NetSuiteCampaignWizard|ContactList|ApolloPage|ApolloSearchForm") -eq 0 ] && echo "PASS-FW3" || echo "FAIL-FW3"
    ```

    All 3 firewall checks must PASS-FW*.

    **pm2 stability check:**

    ```bash
    ssh <EC2_USER>@<EC2_HOST> '
      pm2 list | grep crm-backend  # online + restart count = prev+1 (not crash-looping)
      pm2 logs crm-backend --err --lines 50 --nostream | grep -E "FATAL|UnhandledPromise|EADDR|cannot find module" | head -5
    '
    ```

    pm2 status must be `online` (not `errored`, not `stopped`). No new FATAL / UnhandledPromise / EADDR / module-not-found errors in the last 50 stderr lines.
  </verify>
  <done>
    - Backend dist deployed to /var/www/crm-backend/dist/ (verified via 5/5 sudo grep counts on EC2).
    - pm2 crm-backend restarted online with restart_time = prev+1; no FATAL in stderr.
    - /upgrade-streams-v3 called twice: call 1 returned {upgraded:[9 names], alreadyV3:[], total:9}; call 2 returned {upgraded:[], alreadyV3:[9 names], total:9}.
    - psql verification of cmpsxxybw0007h652m8c1fjsj row returns all 7 booleans `t`.
    - Case A preview re-smoke returned HTTP 200 with all 14 hard-acceptance assertions PASS (personalized=1, personalizeFailures=0, body > 5KB, brand chrome present, "Hi Ricardo," substituted, 4 AI tokens substituted with zero raw placeholders leaking, video CTA stripped).
    - V3-PREVIEW.json saved to .planning, > 5KB, committed and pushed fast-forward to origin/production.
    - Both firewall checks PASS-FW1/FW2 (Phase 4 byte-for-byte clean from phase-04-baseline; Phase 5 apollo.ts untouched across both quick-8 commits).
    - All EC2 + local scratch files cleaned (/tmp/quick8-*.json, /tmp/quick8-*.tar.gz, /tmp/quick8-jwt.txt).
  </done>
</task>

</tasks>

<verification>
Phase-level (post both tasks):

1. **Code present in source + dist (5 grep counts each layer):**
   - source: STREAM_TEMPLATE_V3_BODY (≥2), upgradeStreamTemplatesToV3 (≥1 in seeds + ≥2 in route imports), upgrade-streams-v3 (≥1), 1000+ Implementations (≥1), mailto:sara@techcloudpro.com (≥1)
   - dist on EC2: same set, all ≥ same thresholds

2. **DB state (psql against cmpsxxybw0007h652m8c1fjsj):**
   - LENGTH(htmlContent) > 5000 = t
   - htmlContent LIKE '%Sara%' = t
   - htmlContent LIKE '%1000+ Implementations%' = t
   - htmlContent LIKE '%{{intentHook}}%' = t
   - htmlContent LIKE '%mailto:sara@techcloudpro.com%' = t
   - htmlContent NOT LIKE '%{{videoUrl}}%' = t
   - htmlContent NOT LIKE '%{{trackingId}}%' = t

3. **Endpoint idempotency (2 successive calls):**
   - Call 1: HTTP 200, upgraded.length == 9, alreadyV3.length == 0
   - Call 2: HTTP 200, upgraded.length == 0, alreadyV3.length == 9

4. **End-to-end render (Ricardo Case A preview):**
   - HTTP 200, personalized == 1, personalizeFailures == 0
   - audit[0].renderedBody length > 5000 bytes
   - renderedBody contains: "1000+ Implementations", "Sara", "mailto:sara@techcloudpro.com", "Hi Ricardo"
   - renderedBody does NOT contain: "{{intentHook}}", "{{companyContext}}", "{{painPoint}}", "{{cta}}", "{{firstName}}", "{{videoUrl}}", "Watch with sound"

5. **Firewall (2 git diffs):**
   - phase-04-baseline..HEAD over campaigns.ts + awsSES.ts = 0 lines
   - HEAD~2..HEAD over apollo.ts = 0 lines (single-file stat shows 0 hits)
   - HEAD~2..HEAD over NetSuiteCampaignWizard.tsx, ContactList.tsx, ApolloPage.tsx, ApolloSearchForm.tsx = 0 lines

6. **Evidence artifact:**
   - .planning/quick/8-port-tcp-v6-branded-email-design-into-ph/V3-PREVIEW.json exists, > 5KB, contains full HTTP response from Ricardo preview

7. **pm2 health:**
   - crm-backend = online (not errored / stopped)
   - restart count increased by exactly 1 from pre-Task-2 baseline
   - no FATAL / UnhandledPromise / EADDR / module-not-found errors in last 50 stderr lines

8. **Cost telemetry sanity:**
   - audit[0].claudeInputTokens > 0 (Claude was actually called — proves the personalization layer ran)
   - cost.totalCostUSD ≈ 0.07 ± 0.03 (single Ricardo Claude call + web_search; close to Phase 5 Case A reference cost)
</verification>

<success_criteria>
Branded v6 email body (header + metrics + 4 service props + Sara signature + mailto footer) is live in all 9 prod Stream:* email_templates rows for the smoke user, with the 4 AI placeholders ({{intentHook}}, {{companyContext}}, {{painPoint}}, {{cta}}) substituted at Phase 5 render time. Ricardo Deben preview proves end-to-end that the branded body renders with personalized AI paragraphs and zero leaked placeholders. /upgrade-streams-v3 is idempotent. Phase 4 firewall + Phase 5 send-path firewall hold byte-for-byte. Single evidence file saved + committed.

Definition of done:
- [ ] Task 1 commit pushed: STREAM_TEMPLATE_V3_BODY + upgradeStreamTemplatesToV3 + /upgrade-streams-v3 endpoint
- [ ] Task 2 commit pushed: V3-PREVIEW.json evidence
- [ ] All 12 code-shape verify assertions PASS (Task 1)
- [ ] All 5 dist-grep counts on EC2 ≥ expected (Task 2 STEP C)
- [ ] Both /upgrade-streams-v3 calls return expected idempotent shape (Task 2 STEP F)
- [ ] psql verification returns all 7 `t` (Task 2 STEP G)
- [ ] All 14 hard-acceptance Ricardo Case A preview assertions PASS (Task 2 STEP H)
- [ ] V3-PREVIEW.json > 5KB saved to .planning
- [ ] Both firewall checks PASS-FW (Phase 4 byte-clean, Phase 5 apollo.ts untouched)
- [ ] pm2 online, no FATAL errors
- [ ] Total spend ~$0.07 (1 Claude+web_search call), $0 Resend
</success_criteria>

<output>
After completion, the operator (or follow-on /gsd:quick close ceremony) creates `.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/8-SUMMARY.md` mirroring the quick-7 SUMMARY shape: frontmatter (phase, plan, subsystem, tags, requires, provides, affects, tech-stack, key-files, decisions, metrics), one-liner, "What Shipped" backend section, Commits table, Deploy section (backend dist verify + pm2 restart), Live Verification section (3 cases: idempotent upgrade x2 + Ricardo preview), Phase-4 + Phase-5 firewall verification, Deviations (if any), Self-Check.

Evidence artifact at: `.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/V3-PREVIEW.json` (produced by Task 2 STEP I, committed in Task 2's evidence commit).
</output>
