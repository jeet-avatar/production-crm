---
phase: 06-stream-coherent-templates-and-review-queue
plan: 01b
type: execute
wave: 2
depends_on: [06-01a]
files_modified:
  - backend/src/seeds/stream-templates.ts
  - backend/src/routes/emailTemplates.ts
autonomous: false
requirements: [REQ-060]
must_haves:
  truths:
    - "User explicitly replies with the literal word `copy-approved` (case-insensitive acceptable) at Task 1 BEFORE Task 2's TypeScript synthesis runs. The first task is a human-action checkpoint that displays the 9-stream copy and waits for approval."
    - "STREAM_TEMPLATE_V3_BODIES dict is exported and contains exactly 9 entries keyed by the EXACT 9 prod stream categories with NO space after colon: `'Stream:NetSuite'`, `'Stream:AI/ML'`, `'Stream:Cloud/DevOps'`, `'Stream:Cybersecurity'`, `'Stream:Data/Analytics'`, `'Stream:Mobile'`, `'Stream:Enterprise/ERP'`, `'Stream:Staffing/HR'`, `'Stream:Other'`"
    - "Each dict entry contains its UNIQUE per-stream HTML-comment sentinel `<!-- STREAM_V3:<bareStream> -->` as the FIRST line after `<body>` (NOT a visible-copy sentinel like 'Cybersecurity Practice' — that's STILL present as part of the visible metricLabel copy but the AUTHORITATIVE detection mechanism is the comment)"
    - "Each entry shares the v6 visual chrome (navy header `#0F172A`, orange `#F97316` accents, Sara signature, `mailto:sara@techcloudpro.com` footer, 4-cell metrics row, 6 placeholders `{{firstName}}` + `{{companyName}}` + `{{intentHook}}` + `{{companyContext}}` + `{{painPoint}}` + `{{cta}}`) but the visible copy is stream-coherent per the approved 06-STREAM-COPY.md sections"
    - "Stream:NetSuite preserves the existing quick-8 v3 copy verbatim AND keeps the inline 'A note on NetSuite Next 2026' callout. The other 8 streams DROP that inline callout entirely (per the OMIT marker in 06-STREAM-COPY.md)"
    - "`upgradeStreamTemplatesToV3(prisma, userId)` is stream-aware: looks up the right body per `row.category` via `STREAM_TEMPLATE_V3_BODIES[row.category]`, falls back to `STREAM_TEMPLATE_V3_BODIES['Stream:Other']` (NO SPACE) if the category is unknown. Idempotency sentinel uses the HTML-comment sentinel: `htmlContent.includes('<!-- STREAM_V3:' + row.category.slice('Stream:'.length) + ' -->')`"
    - "Existing `STREAM_TEMPLATE_V3_BODY` single-body const is DELETED. Existing `STREAM_TEMPLATE_V2_BODY` + `upgradeStreamTemplatesToV2` + `STREAM_FALLBACKS` + `getStreamFallbacks` + `STREAM_TEMPLATE_SEEDS` + `seedStreamTemplates` PRESERVED byte-for-byte"
    - "`POST /api/email-templates/upgrade-streams-v3` endpoint URL is REUSED (no v4 endpoint). It now picks the right body per stream via the dict"
    - "Runtime guard (CRITICAL per CONTEXT.md line 88): verify-block runtime assertion proves every prod `Stream:*` category has a matching dict entry; FAIL-FAST if any seed stream is missing from the dict"
    - "Phase 4 firewall holds: `git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l == 0`"
    - "Phase 5 send-path firewall holds: `git diff -- backend/src/routes/apollo.ts | wc -l == 0` (this plan never touches apollo.ts)"
  artifacts:
    - path: "backend/src/seeds/stream-templates.ts"
      provides: "STREAM_TEMPLATE_V3_BODIES dict (9 entries, NO-space keys, HTML-comment sentinels) + stream-aware upgradeStreamTemplatesToV3"
      exports: ["STREAM_TEMPLATE_V3_BODIES", "upgradeStreamTemplatesToV3", "STREAM_TEMPLATE_V2_BODY", "upgradeStreamTemplatesToV2", "STREAM_FALLBACKS", "getStreamFallbacks", "STREAM_TEMPLATE_SEEDS", "seedStreamTemplates"]
      contains: "STREAM_TEMPLATE_V3_BODIES"
    - path: "backend/src/routes/emailTemplates.ts"
      provides: "POST /api/email-templates/upgrade-streams-v3 endpoint (now stream-aware via dict lookup)"
      contains: "upgrade-streams-v3"
  key_links:
    - from: "User approval 'copy-approved' at Task 1"
      to: "Task 2 TypeScript synthesis of STREAM_TEMPLATE_V3_BODIES dict"
      via: "Plan execution unblocks Task 2 only after Task 1's checkpoint receives the literal word 'copy-approved'"
      pattern: "copy-approved"
    - from: "POST /api/email-templates/upgrade-streams-v3"
      to: "STREAM_TEMPLATE_V3_BODIES[row.category]"
      via: "per-row body lookup inside upgradeStreamTemplatesToV3"
      pattern: "STREAM_TEMPLATE_V3_BODIES\\[row\\.category\\]"
    - from: "Idempotent detection per row"
      to: "HTML-comment sentinel `<!-- STREAM_V3:<bareStream> -->`"
      via: "htmlContent.includes('<!-- STREAM_V3:' + row.category.slice('Stream:'.length) + ' -->')"
      pattern: "<!-- STREAM_V3:"
---

<objective>
After the user reviews `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md` (Plan 06-01a's output) and replies `copy-approved`, mechanically translate the 9 approved sections into TypeScript dict entries inside `backend/src/seeds/stream-templates.ts`. Then rewire `upgradeStreamTemplatesToV3` to be stream-aware (per-row dict lookup + HTML-comment sentinel detection) and update the existing `POST /api/email-templates/upgrade-streams-v3` endpoint doc comment.

**THIS PLAN IS NOT AUTONOMOUS.** Per CONTEXT.md's locked deploy-gate rule and the planner's surgical fix for BLOCKER HIGH-2 (511-line plan with embedded ~270 lines of inline HTML being auto-synthesized without human review), Task 1 is a human-action checkpoint where the user reads the 9 stream sections and approves with the literal word `copy-approved`. Task 2 runs only after that approval — it is purely mechanical (dict literal + buildStreamV3Body calls + endpoint doc comment).

Purpose: closes REQ-060 step 2 of 2 (step 1 was Plan 06-01a's markdown). The structural messaging incoherence quick-8 exposed on 2026-05-31 is now closed BECAUSE the user approved the 9 per-stream copy direction BEFORE the bodies were materialized in code.

Output:
- (after user approval) `STREAM_TEMPLATE_V3_BODIES: Record<string, string>` exported with exactly 9 entries
- (after user approval) `buildStreamV3Body(opts)` helper internal to stream-templates.ts
- (after user approval) `upgradeStreamTemplatesToV3` stream-aware via HTML-comment sentinel detection
- (after user approval) `STREAM_TEMPLATE_V3_BODY` single-body const DELETED
- `/upgrade-streams-v3` endpoint URL preserved; doc comment updated
- v2 helpers + seeds preserved byte-for-byte
- apollo.ts, campaigns.ts, awsSES.ts untouched
- Phase 4 firewall holds
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/production-crm/.planning/STATE.md
@/Users/jeet/production-crm/.planning/ROADMAP.md
@/Users/jeet/production-crm/.planning/phases/06-stream-coherent-templates-and-review-queue/06-CONTEXT.md
@/Users/jeet/production-crm/.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md
@/Users/jeet/production-crm/.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/8-SUMMARY.md
@/Users/jeet/production-crm/backend/src/seeds/stream-templates.ts
@/Users/jeet/production-crm/backend/src/routes/emailTemplates.ts
</context>

<tasks>

<task type="checkpoint:human-action">
  <name>Task 1: 🛑 CHECKPOINT — Copy Approval Required</name>
  <files>
    (no files — this task is a stop-gate)
  </files>
  <action>
    🛑 STOP. Do NOT modify `backend/src/seeds/stream-templates.ts` or any other source file until the user replies with the literal word `copy-approved`.

    Display the following preview to the user EXACTLY as written, then wait for response:

    ---

    **🛑 PHASE 6 STREAM COPY APPROVAL REQUESTED (Plan 06-01b Task 1 of 2)**

    Plan 06-01a wrote 9 per-stream copy drafts to `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md`. The next step (Task 2) would mechanically translate those 9 sections into TypeScript dict entries inside `backend/src/seeds/stream-templates.ts`, AND replace the existing single-body `STREAM_TEMPLATE_V3_BODY` const, AND rewire `upgradeStreamTemplatesToV3` to be stream-aware.

    **Why this checkpoint exists:** the 9 stream bodies will be sent to real prospects (JM + Rajesh first via REQ-066 live verify, then production list). Per CONTEXT.md (lines 168-204) and your locked rule "without my approval — don't send this to live", the executor MUST NOT auto-synthesize 9 prospect-facing email bodies and bake them into code without you reading the actual copy first.

    **What's in 06-STREAM-COPY.md:**

    - 9 sections, one per real prod stream (NetSuite, AI/ML, Cloud/DevOps, Cybersecurity, Data/Analytics, Mobile, Enterprise/ERP, Staffing/HR, Other) — verified against `backend/src/routes/apollo.ts:73-76 VALID_STREAMS`
    - Each section has 12 fields: preheaderTail, tagPillText, metricLabel, introSentence, noteCalloutTitle (only NetSuite has a non-OMIT value), noteCalloutBody, servicePropTitle1+Body1, servicePropTitle2+Body2, footerReprise, arthaBannerSubtitle, ariaBlurb, sentinel
    - Each section declares its NO-SPACE dict key (e.g., `'Stream:Cybersecurity'`) matching prod DB `email_templates.category` values
    - Each section declares its unique HTML-comment sentinel (e.g., `<!-- STREAM_V3:Cybersecurity -->`) — the authoritative detection mechanism

    **Where to read it:**

    ```bash
    less .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md
    # or
    cat .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md
    ```

    **Quick orientation:**

    | Stream | metricLabel | noteCalloutTitle |
    |---|---|---|
    | Stream:NetSuite | NetSuite Practice | A note on NetSuite Next 2026 (preserved) |
    | Stream:AI/ML | AI/ML Practice | OMIT |
    | Stream:Cloud/DevOps | Cloud/DevOps Practice | OMIT |
    | Stream:Cybersecurity | Cybersecurity Practice | OMIT |
    | Stream:Data/Analytics | Data/Analytics Practice | OMIT |
    | Stream:Mobile | Mobile Practice | OMIT |
    | Stream:Enterprise/ERP | Enterprise/ERP Practice | OMIT |
    | Stream:Staffing/HR | Staffing/HR Practice | OMIT |
    | Stream:Other | TCP Practice | OMIT |

    **What you approve:** the full text of all 12 fields × 9 streams (108 copy fields total). Plan 06-01a's draft is conservative — light tweaks ("Senior auditors, since 2015" → "Senior security architects, since 2015"), pivots to a different angle ("AI/ML Practice. Production LLM and classical, since 2015." → "AI/ML Practice. RAG production specialists, since 2015."), or full re-draft of any single stream are all welcome.

    **Approval modes:**

    1. **Approve as-is:** reply with the literal word `copy-approved` → Task 2 runs the dict instantiation
    2. **Edit:** reply with line-edits (Slack-style: "Change Stream:Cybersecurity metricLabel to X" / "Replace Stream:Mobile servicePropBody2 with Y"). The executor re-applies edits to 06-STREAM-COPY.md, re-shows the section(s), and re-asks for approval
    3. **Re-draft one stream:** reply with the stream name + your preferred angle, the executor re-drafts just that section
    4. **Defer / cancel Phase 6:** reply with `defer` — the plan stops cleanly with no code changes

    Per CONTEXT.md rule: "any SUMMARY claim of 'shipped' is only valid if it cites the user's approval message verbatim." If you approve, your message is captured for 06-01b-SUMMARY.md.

    ---

    **🔒 Required action:** Reply with the literal word `copy-approved` to proceed to Task 2 (TypeScript synthesis).

    Any other response (silence, questions, partial agreement, edits) means STOP and do NOT execute Task 2. Edits → re-apply to 06-STREAM-COPY.md → re-ask. Cancel → stop with zero code change.
  </action>
  <verify>
    User has replied with the literal word `copy-approved` (case-insensitive acceptable). Any other response = STOP, do not execute Task 2.

    If user replies with edits, the executor edits `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md`, makes a small `docs(06-01a): apply user edits to stream copy drafts` commit, and re-prompts this checkpoint without auto-advancing.

    If user replies with `defer` / `cancel`, the plan exits cleanly, no Task 2.
  </verify>
  <done>
    User has approved the 9-stream copy direction. The literal approval message is captured verbatim for citation in 06-01b-SUMMARY.md per CONTEXT.md rule.
  </done>
</task>

<task type="auto">
  <name>Task 2: Synthesize STREAM_TEMPLATE_V3_BODIES dict + stream-aware upgrade helper (post-approval)</name>
  <files>
    backend/src/seeds/stream-templates.ts
    backend/src/routes/emailTemplates.ts
  </files>
  <action>
    Working directory: `/Users/jeet/production-crm/`.

    ONLY runs after Task 1 received explicit `copy-approved` approval.

    GOAL: Replace the existing `STREAM_TEMPLATE_V3_BODY: string` export (defined around line 291-566 of `backend/src/seeds/stream-templates.ts`) with a typed dict `STREAM_TEMPLATE_V3_BODIES: Record<string, string>` containing 9 stream-coherent variants whose copy comes verbatim from the user-approved 06-STREAM-COPY.md. Then rewrite `upgradeStreamTemplatesToV3` to do a per-row body lookup with HTML-comment-sentinel idempotency detection.

    STEP A — Read the approved copy. Open `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md`. For each of the 9 `## Stream:<BareName>` sections, parse the 12-field table. These are the dict-input values.

    STEP B — Read the existing v3 body. Open `backend/src/seeds/stream-templates.ts` lines 262-566 and study the NetSuite v3 body carefully. Identify the EXACT spans of NetSuite-specific copy you'll need to make per-stream-coherent (CONTEXT.md lines 13-27 table lists them):
      - Preheader (line ~317)
      - Header chrome (line ~336) — KEEP `1000+ Implementations` (brand-wide per CONTEXT.md)
      - Tag pill (line ~343)
      - Metric label (line ~359)
      - Intro paragraph (line ~390)
      - Inline callout (lines ~405-409) — CONDITIONAL on noteCalloutTitle ≠ 'OMIT'
      - Service prop 01 title+body (lines ~416-417)
      - Service prop 02 title+body (line ~420)
      - Footer reprise (line ~501)
      - ArthaBuild banner subtitle (line ~521)
      - ARIA blurb (line ~531)

    STEP C — Build a `buildStreamV3Body(opts)` helper that takes the per-stream copy and returns the rendered HTML. Internal name only; NOT exported. Signature:

    ```ts
    interface StreamV3CopyOpts {
      sentinel: string;                  // e.g., '<!-- STREAM_V3:Cybersecurity -->'  — first line after <body>
      preheaderTail: string;
      tagPillText: string;
      metricLabel: string;               // also used as the visible per-stream literal (e.g., "Cybersecurity Practice")
      introSentence: string;
      noteCalloutTitle: string | null;   // null OR string 'OMIT' both mean skip the callout
      noteCalloutBody: string;           // ignored when title is null/OMIT
      servicePropTitle1: string;
      servicePropBody1: string;
      servicePropTitle2: string;
      servicePropBody2: string;
      footerReprise: string;
      arthaBannerSubtitle: string;
      ariaBlurb: string;
    }

    function buildStreamV3Body(opts: StreamV3CopyOpts): string { ... }
    ```

    Internal implementation: the function literally returns the same ~290-line HTML as the existing const, but with:
    - `${opts.sentinel}` interpolated as the FIRST line immediately AFTER `<body>` (the literal `<!-- STREAM_V3:<bareStream> -->` HTML comment). This is the authoritative detection sentinel for `upgradeStreamTemplatesToV3` idempotency.
    - `${opts.preheaderTail}` / `${opts.tagPillText}` / `${opts.metricLabel}` / `${opts.introSentence}` / etc. interpolated at the right spots via JS template-literal substitution
    - When `opts.noteCalloutTitle === null || opts.noteCalloutTitle === 'OMIT'`, the entire post-intro inline-callout `<div style="background:#FFF7ED;border:1px solid #FED7AA;...">` block (the secondary "A note on NetSuite Next 2026" callout) is OMITTED. The PRIMARY orange callout containing the 4 AI `<p>` tags `{{intentHook}}` / `{{companyContext}}` / `{{painPoint}}` / `{{cta}}` STAYS — only the secondary callout is conditional.

    PRESERVE byte-for-byte:
    - `<head>` block (mso fallbacks, mobile @media)
    - top accent bar gradient
    - dark navy `#0F172A` header table structure (only the chrome text changes)
    - metrics row 4-cell layout — keep `1000+` `Implementations`, `Since 2015`, `94%` `Faster Close`, `$1/contract` `Staffing Fee` — only the second label (NetSuite Practice → opts.metricLabel) changes
    - orange-tinted callout containing 4 AI `<p>` tags (`{{intentHook}}` / `{{companyContext}}` / `{{painPoint}}` / `{{cta}}`)
    - service value props 03 (`Dedicated AI Consulting`) and 04 (`Transparent staffing. $1 per contract.`) — byte-for-byte; only props 01 + 02 become per-stream
    - 30-day guarantee block
    - 4 CTA buttons (Call ARIA, Call a Human, Visit TechCloudPro, Visit ArthaBuild AI)
    - Sara signature block
    - footer with `mailto:sara@techcloudpro.com?subject=Unsubscribe`

    STEP D — Define `STREAM_TEMPLATE_V3_BODIES: Record<string, string>` (EXPORTED) as a 9-entry dict using **NO-SPACE keys matching prod DB `email_templates.category` values** (verified against `seed.category = \`Stream:${seed.stream}\`` at stream-templates.ts:102). For each stream, call `buildStreamV3Body({...})` with the values parsed from 06-STREAM-COPY.md. Use these exact dict keys (verified against backend/src/routes/apollo.ts:73-76 VALID_STREAMS):

    ```ts
    export const STREAM_TEMPLATE_V3_BODIES: Record<string, string> = {
      'Stream:NetSuite': buildStreamV3Body({
        sentinel: '<!-- STREAM_V3:NetSuite -->',
        preheaderTail: 'NetSuite, ArthaBuild AI, custom AI work, and our $1 staffing model.',
        tagPillText: 'NetSuite Next · ArthaBuild AI · $1 Staffing',
        metricLabel: 'NetSuite Practice',
        introSentence: "We're a senior NetSuite and AI team. Certified. Around since 2015. Over 1,000 implementations.",
        noteCalloutTitle: 'A note on NetSuite Next 2026',
        noteCalloutBody: '<strong style="color:#1E3A8A;">SuiteCloud AI, Predictive Planning, AI Workspaces.</strong> They take a lot more than SuiteScript. Our team plus our own NetSuite copilot, <strong style="color:#1E3A8A;">ArthaBuild AI</strong>, handle the modern stack end to end.',
        servicePropTitle1: 'NetSuite Practice. Senior team, since 2015.',
        servicePropBody1: 'Full-cycle implementation, optimization, managed services. Multi-entity, OneWorld, NetSuite Next 2026. Senior architects on the engagement, never juniors.',
        servicePropTitle2: 'ArthaBuild AI. Your NetSuite copilot.',
        servicePropBody2: 'Writes <strong style="color:#0F172A;">SuiteScript</strong>, drafts <strong style="color:#0F172A;">BRDs</strong>, builds <strong style="color:#0F172A;">technical documentation</strong>. Live at artha.build.',
        footerReprise: 'NetSuite Next · AI Consulting · $1 Staffing',
        arthaBannerSubtitle: 'Your NetSuite copilot · SuiteScript, BRDs, docs · artha.build',
        ariaBlurb: 'ARIA is our AI receptionist. She knows NetSuite Next 2026, SuiteCloud AI, and our full services portfolio.',
      }),
      'Stream:AI/ML': buildStreamV3Body({ sentinel: '<!-- STREAM_V3:AI/ML -->', /* ...from 06-STREAM-COPY.md AI/ML section... */ }),
      'Stream:Cloud/DevOps': buildStreamV3Body({ sentinel: '<!-- STREAM_V3:Cloud/DevOps -->', /* ...from 06-STREAM-COPY.md Cloud/DevOps section... */ }),
      'Stream:Cybersecurity': buildStreamV3Body({ sentinel: '<!-- STREAM_V3:Cybersecurity -->', /* ...from 06-STREAM-COPY.md Cybersecurity section... */ }),
      'Stream:Data/Analytics': buildStreamV3Body({ sentinel: '<!-- STREAM_V3:Data/Analytics -->', /* ...from 06-STREAM-COPY.md Data/Analytics section... */ }),
      'Stream:Mobile': buildStreamV3Body({ sentinel: '<!-- STREAM_V3:Mobile -->', /* ...from 06-STREAM-COPY.md Mobile section... */ }),
      'Stream:Enterprise/ERP': buildStreamV3Body({ sentinel: '<!-- STREAM_V3:Enterprise/ERP -->', /* ...from 06-STREAM-COPY.md Enterprise/ERP section... */ }),
      'Stream:Staffing/HR': buildStreamV3Body({ sentinel: '<!-- STREAM_V3:Staffing/HR -->', /* ...from 06-STREAM-COPY.md Staffing/HR section... */ }),
      'Stream:Other': buildStreamV3Body({ sentinel: '<!-- STREAM_V3:Other -->', /* ...from 06-STREAM-COPY.md Other section... */ }),
    };
    ```

    For each non-NetSuite entry, parse the corresponding `## Stream:<BareName>` section in 06-STREAM-COPY.md and copy the 12 field values into the buildStreamV3Body opts. The user has APPROVED this copy verbatim — DO NOT paraphrase or "improve" it during translation.

    STEP E — DELETE the existing `export const STREAM_TEMPLATE_V3_BODY = ...` const (lines ~291-566). Per CONTEXT.md preference: quick-8 v3 was never sent to a paying customer (only smoke recipients JM + Rajesh, who got the apology), so we treat it as a draft revision and delete the single-body shape.

    STEP F — Rewrite `upgradeStreamTemplatesToV3` to be stream-aware with HTML-comment sentinel detection. Replace the existing function body (around lines 577-602) with:

    ```ts
    /**
     * Idempotent in-place upgrade of the 9 Stream:* email_templates rows from v2 → v3.
     * Stream-aware: looks up STREAM_TEMPLATE_V3_BODIES[row.category] per row, falls back
     * to STREAM_TEMPLATE_V3_BODIES['Stream:Other'] if the category is not in the dict.
     *
     * Idempotency sentinel: HTML-comment `<!-- STREAM_V3:<bareStream> -->` baked as the
     * first line after `<body>`. Detection: htmlContent.includes(`<!-- STREAM_V3:${bare} -->`).
     * Unique per stream by construction (sentinel suffix == bare stream name).
     */
    export async function upgradeStreamTemplatesToV3(
      prisma: PrismaClient,
      userId: string,
    ): Promise<{ upgraded: string[]; alreadyV3: string[]; total: number }> {
      const rows = await prisma.emailTemplate.findMany({
        where: { userId, category: { startsWith: 'Stream:' } },
        select: { id: true, name: true, category: true, htmlContent: true },
      });

      const upgraded: string[] = [];
      const alreadyV3: string[] = [];

      for (const row of rows) {
        // Derive sentinel from category. category='Stream:Cybersecurity' → sentinel='<!-- STREAM_V3:Cybersecurity -->'.
        const bareStream = row.category.startsWith('Stream:')
          ? row.category.slice('Stream:'.length)
          : row.category;
        const sentinel = `<!-- STREAM_V3:${bareStream} -->`;

        if ((row.htmlContent || '').includes(sentinel)) {
          alreadyV3.push(row.name);
          continue;
        }

        const body = STREAM_TEMPLATE_V3_BODIES[row.category] ?? STREAM_TEMPLATE_V3_BODIES['Stream:Other'];
        await prisma.emailTemplate.update({
          where: { id: row.id },
          data: { htmlContent: body },
        });
        upgraded.push(row.name);
      }

      return { upgraded, alreadyV3, total: rows.length };
    }
    ```

    STEP G — Update the `POST /api/email-templates/upgrade-streams-v3` endpoint doc comment in `backend/src/routes/emailTemplates.ts`. Find the existing endpoint via `grep -n "upgrade-streams-v3" backend/src/routes/emailTemplates.ts`. Replace any existing pre-comment with:

    ```ts
    // Phase 06 plan 06-01b: in-place upgrade of the 9 Stream:* templates to v3 (per-stream branded bodies).
    // Stream-aware: each Stream:* row receives the body keyed by its category from STREAM_TEMPLATE_V3_BODIES.
    // Dict keys are NO-SPACE (e.g., 'Stream:Cybersecurity') matching prod DB email_templates.category values.
    // Idempotent — second call returns upgraded:[] alreadyV3:[...up-to-9 names] because the per-stream
    // HTML-comment sentinel `<!-- STREAM_V3:<bare> -->` (e.g., `<!-- STREAM_V3:Cybersecurity -->`) is
    // unique per stream and remains in place across re-runs.
    ```

    STEP H — Build + runtime guard. Compile the backend, then run the load-bearing runtime assertion from CONTEXT.md (line 88) that proves every prod `Stream:*` seed has a matching dict entry:

    ```bash
    cd backend && npm run build 2>&1 | tail -10
    DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx -y prisma@5.4.2 validate --schema=prisma/schema.prisma
    # → "The schema at prisma/schema.prisma is valid 🚀"

    # CRITICAL runtime guard — fail-fast if any seed stream has no matching dict entry
    node -e "
      const t = require('./dist/seeds/stream-templates.js');
      const seeds = t.STREAM_TEMPLATE_SEEDS;
      const dict = t.STREAM_TEMPLATE_V3_BODIES;
      const missing = seeds.filter(s => !dict['Stream:' + s.stream]);
      if (missing.length) {
        console.error('MISSING dict keys for prod streams:', missing.map(s => s.stream));
        process.exit(1);
      }
      console.log('OK 9/9 — every prod Stream:* seed has a matching STREAM_TEMPLATE_V3_BODIES entry');
    "
    # → prints 'OK 9/9 — every prod Stream:* seed has a matching STREAM_TEMPLATE_V3_BODIES entry'

    # Cross-contamination check: each entry contains its own sentinel AND NOT any other stream's sentinel
    node -e "
      const t = require('./dist/seeds/stream-templates.js');
      const dict = t.STREAM_TEMPLATE_V3_BODIES;
      const streams = ['NetSuite','AI/ML','Cloud/DevOps','Cybersecurity','Data/Analytics','Mobile','Enterprise/ERP','Staffing/HR','Other'];
      let pass = true;
      for (const s of streams) {
        const key = 'Stream:' + s;
        const body = dict[key];
        if (!body) { console.error('MISSING entry for', key); pass = false; continue; }
        if (!body.includes('<!-- STREAM_V3:' + s + ' -->')) { console.error(key + ' missing own sentinel'); pass = false; }
        for (const other of streams) {
          if (other === s) continue;
          if (body.includes('<!-- STREAM_V3:' + other + ' -->')) {
            console.error(key + ' CROSS-CONTAMINATED with ' + other + ' sentinel');
            pass = false;
          }
        }
      }
      if (!pass) process.exit(1);
      console.log('OK — sentinel uniqueness per stream verified');
    "
    # → prints 'OK — sentinel uniqueness per stream verified'
    cd ..
    ```

    If either runtime guard fails (exit 1), STOP — do not commit. The dict is broken; either a seed-side stream has no dict entry, or a dict entry is missing/wrong sentinel, or a sentinel is cross-contaminated. Fix and re-run.

    STEP I — Commit. Single atomic commit covering both files:

    ```bash
    git add backend/src/seeds/stream-templates.ts backend/src/routes/emailTemplates.ts
    git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "feat(06-01b): per-stream STREAM_TEMPLATE_V3_BODIES dict (9 entries, NO-space keys, HTML-comment sentinels) + stream-aware upgrade helper (REQ-060)"
    ```

    Constraints:
    - DO NOT modify `STREAM_TEMPLATE_V2_BODY`, `STREAM_FALLBACKS`, `getStreamFallbacks`, `STREAM_TEMPLATE_SEEDS`, `seedStreamTemplates`, or `upgradeStreamTemplatesToV2` — all four exports are preserved byte-for-byte
    - DO NOT modify `backend/src/routes/apollo.ts` (Phase 5 send-path firewall — apollo.ts reads `template.htmlContent` and that's the only contract we honor)
    - DO NOT modify `backend/src/routes/campaigns.ts` or `backend/src/services/awsSES.ts` (Phase 4 firewall)
    - The 6-placeholder set MUST be preserved across all 9 entries: `{{firstName}}`, `{{companyName}}`, `{{intentHook}}`, `{{companyContext}}`, `{{painPoint}}`, `{{cta}}` — no new placeholder, no missing placeholder
    - Stream:NetSuite body MUST contain `NetSuite Practice` AND `<!-- STREAM_V3:NetSuite -->` (preserves the one existing pre-paying-customer behavior for the NetSuite stream)
    - Body length per entry SHOULD be ≥ 15,000 chars (the existing v6 shell is ~21,646 chars; per-stream variants similar size since only ~10 short copy spans change)
    - Dict keys MUST be NO-SPACE format. Format: `'Stream:<bare>'` (e.g., `'Stream:Cybersecurity'`, `'Stream:Cloud/DevOps'`, `'Stream:Staffing/HR'`). The character `/` is fine inside JS object keys.
    - HTML-comment sentinel suffix MUST be the bare stream name (the part after `Stream:`) — so `<!-- STREAM_V3:AI/ML -->`, NOT `<!-- STREAM_V3:AIML -->`. The slash inside the comment value is fine — it's parsed as a comment, not as an HTML tag attribute.
    - Author identity: `jm@techcloudpro.com / jeet-avatar`
  </action>
  <verify>
    From `/Users/jeet/production-crm/`:

    ```bash
    # 1) New dict + helper present
    grep -c "export const STREAM_TEMPLATE_V3_BODIES" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "export async function upgradeStreamTemplatesToV3" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "function buildStreamV3Body" backend/src/seeds/stream-templates.ts  # → 1

    # 2) Single-body const REMOVED (count must be exactly 0)
    grep -c "export const STREAM_TEMPLATE_V3_BODY " backend/src/seeds/stream-templates.ts  # → 0
    grep -c "export const STREAM_TEMPLATE_V3_BODY:" backend/src/seeds/stream-templates.ts  # → 0
    grep -c "export const STREAM_TEMPLATE_V3_BODY=" backend/src/seeds/stream-templates.ts  # → 0

    # 3) v2 exports + seeds preserved byte-for-byte (each count must be unchanged)
    grep -c "export const STREAM_TEMPLATE_V2_BODY" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "export async function upgradeStreamTemplatesToV2" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "export function getStreamFallbacks" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "export const STREAM_TEMPLATE_SEEDS" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "export async function seedStreamTemplates" backend/src/seeds/stream-templates.ts  # → 1

    # 4) NO-SPACE dict keys for all 9 real prod streams (note slash inside Cloud/DevOps + Data/Analytics + Enterprise/ERP + Staffing/HR + AI/ML)
    grep -c "'Stream:NetSuite':" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "'Stream:AI/ML':" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "'Stream:Cloud/DevOps':" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "'Stream:Cybersecurity':" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "'Stream:Data/Analytics':" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "'Stream:Mobile':" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "'Stream:Enterprise/ERP':" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "'Stream:Staffing/HR':" backend/src/seeds/stream-templates.ts  # → 1
    grep -c "'Stream:Other':" backend/src/seeds/stream-templates.ts  # → 1

    # 5) NO invented streams (BLOCKER 1 caught these — they should NOT appear in code)
    grep -c "'Stream:RPA'" backend/src/seeds/stream-templates.ts  # → 0
    grep -c "'Stream:Web3'" backend/src/seeds/stream-templates.ts  # → 0
    grep -c "'Stream:AI-ML'" backend/src/seeds/stream-templates.ts  # → 0

    # 6) NO space after colon anywhere (the broken format BLOCKER 2 caught)
    grep -c "'Stream: " backend/src/seeds/stream-templates.ts  # → 0

    # 7) HTML-comment sentinels present per stream
    grep -c "<!-- STREAM_V3:NetSuite -->" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "<!-- STREAM_V3:AI/ML -->" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "<!-- STREAM_V3:Cloud/DevOps -->" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "<!-- STREAM_V3:Cybersecurity -->" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "<!-- STREAM_V3:Data/Analytics -->" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "<!-- STREAM_V3:Mobile -->" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "<!-- STREAM_V3:Enterprise/ERP -->" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "<!-- STREAM_V3:Staffing/HR -->" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "<!-- STREAM_V3:Other -->" backend/src/seeds/stream-templates.ts  # → ≥ 1

    # 8) Per-stream metricLabel visible literals (the "X Practice" copy) — also present (each appears in its respective dict entry)
    grep -c "NetSuite Practice" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "AI/ML Practice" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "Cloud/DevOps Practice" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "Cybersecurity Practice" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "Data/Analytics Practice" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "Mobile Practice" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "Enterprise/ERP Practice" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "Staffing/HR Practice" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "TCP Practice" backend/src/seeds/stream-templates.ts  # → ≥ 1

    # 9) 6-placeholder set preserved (each must appear in the buildStreamV3Body template literal)
    grep -c "{{firstName}}" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "{{companyName}}" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "{{intentHook}}" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "{{companyContext}}" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "{{painPoint}}" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "{{cta}}" backend/src/seeds/stream-templates.ts  # → ≥ 1

    # 10) Shared brand chrome literals preserved
    grep -c "1000+" backend/src/seeds/stream-templates.ts  # → ≥ 1
    grep -c "mailto:sara@techcloudpro.com" backend/src/seeds/stream-templates.ts  # → ≥ 1

    # 11) /upgrade-streams-v3 endpoint URL unchanged
    grep -c "router.post('/upgrade-streams-v3'" backend/src/routes/emailTemplates.ts  # → 1
    grep -c "Phase 06 plan 06-01b" backend/src/routes/emailTemplates.ts  # → 1

    # 12) apollo.ts + campaigns.ts + awsSES.ts UNTOUCHED
    git diff backend/src/routes/apollo.ts backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l  # → 0

    # 13) Runtime guard already proven during STEP H — re-run to confirm
    cd backend && node -e "
      const t = require('./dist/seeds/stream-templates.js');
      const seeds = t.STREAM_TEMPLATE_SEEDS;
      const dict = t.STREAM_TEMPLATE_V3_BODIES;
      const missing = seeds.filter(s => !dict['Stream:' + s.stream]);
      if (missing.length) { console.error('FAIL:', missing.map(s=>s.stream)); process.exit(1); }
      console.log('OK 9/9');
    " && cd ..
    # → prints 'OK 9/9'

    # 14) Phase 4 firewall holds
    git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l  # → 0

    # 15) Single commit, correct author
    git log -1 --format="%s"  # → "feat(06-01b): per-stream STREAM_TEMPLATE_V3_BODIES dict ... (REQ-060)"
    git log -1 --format="%an <%ae>"  # → "jeet-avatar <jm@techcloudpro.com>"
    ```
  </verify>
  <done>
    User approved the 9-stream copy at Task 1. Task 2 synthesized: `STREAM_TEMPLATE_V3_BODIES` 9-entry dict (NO-space keys, HTML-comment sentinels), `buildStreamV3Body` helper, stream-aware `upgradeStreamTemplatesToV3` with HTML-comment-sentinel detection. Single-body `STREAM_TEMPLATE_V3_BODY` const removed. `/upgrade-streams-v3` endpoint doc comment updated. v2 exports + seeds preserved byte-for-byte. Runtime guard prints `OK 9/9`. Sentinel uniqueness check passes. NO invented streams (RPA/Web3/AI-ML absent). NO space after colon in any dict key. Phase 4 firewall holds. apollo.ts untouched.
  </done>
</task>

</tasks>

<verification>
After Task 2:

```bash
# Single commit, exactly 2 files modified
git diff HEAD~1 --stat | grep -cE "(stream-templates\.ts|emailTemplates\.ts)"  # → 2
git diff HEAD~1 --stat | grep -cE "\b(campaigns\.ts|awsSES\.ts|NetSuiteCampaignWizard|CampaignsPage|api\.ts|schema\.prisma|apollo\.ts)\b"  # → 0

# All 9 real streams present as NO-space dict keys
for s in "NetSuite" "AI/ML" "Cloud/DevOps" "Cybersecurity" "Data/Analytics" "Mobile" "Enterprise/ERP" "Staffing/HR" "Other"; do
  grep -c "'Stream:${s}':" backend/src/seeds/stream-templates.ts
done
# → 9 outputs of "1"

# All 9 sentinels present
for s in "NetSuite" "AI/ML" "Cloud/DevOps" "Cybersecurity" "Data/Analytics" "Mobile" "Enterprise/ERP" "Staffing/HR" "Other"; do
  grep -c "<!-- STREAM_V3:${s} -->" backend/src/seeds/stream-templates.ts
done
# → 9 outputs of "1" (or more)

# Phase 4 firewall
git diff phase-04-baseline..HEAD -- backend/src/routes/campaigns.ts backend/src/services/awsSES.ts | wc -l  # → 0
```
</verification>

<success_criteria>
- Task 1 (CHECKPOINT) received explicit `copy-approved` approval from user; message captured verbatim
- Task 2 (post-approval):
  - `STREAM_TEMPLATE_V3_BODIES` 9-entry dict exported, NO-space keys, each with unique HTML-comment sentinel
  - `STREAM_TEMPLATE_V3_BODY` single-body const REMOVED (grep count = 0)
  - `buildStreamV3Body` helper internal (not exported)
  - `upgradeStreamTemplatesToV3` stream-aware via HTML-comment sentinel detection
  - `/upgrade-streams-v3` endpoint URL preserved; doc comment updated
  - v2 exports + seeds + STREAM_FALLBACKS untouched
  - apollo.ts, campaigns.ts, awsSES.ts untouched
  - Runtime guard prints `OK 9/9`
  - Sentinel cross-contamination check passes
  - Phase 4 firewall holds (0-line diff vs `phase-04-baseline`)
  - Single commit authored by `jeet-avatar <jm@techcloudpro.com>`
</success_criteria>

<output>
After completion, create `.planning/phases/06-stream-coherent-templates-and-review-queue/06-01b-SUMMARY.md` capturing: user `copy-approved` message verbatim, the 9 dict entries (one paragraph per stream with its sentinel), runtime guard `OK 9/9` output, sentinel-uniqueness verification output, file size delta in stream-templates.ts, commits, Phase 4 firewall verification.
</output>
