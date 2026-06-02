---
phase: 06-stream-coherent-templates-and-review-queue
plan: 01a
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md
autonomous: true
requirements: [REQ-060]
must_haves:
  truths:
    - "`.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md` exists as a HUMAN-READABLE markdown document"
    - "The file contains exactly 9 stream sections, one per real prod stream verified at apollo.ts:73-76 VALID_STREAMS: NetSuite, AI/ML, Cloud/DevOps, Cybersecurity, Data/Analytics, Mobile, Enterprise/ERP, Staffing/HR, Other"
    - "Each section has 9 fields with stream-coherent draft copy: preheaderTail, tagPillText, metricLabel, introSentence, noteCalloutTitle (NetSuite only — others 'OMIT'), noteCalloutBody, servicePropTitle1 + servicePropBody1, servicePropTitle2 + servicePropBody2, footerReprise, arthaBannerSubtitle, ariaBlurb"
    - "Each section names its dict-key header verbatim: `## Stream:NetSuite`, `## Stream:AI/ML`, etc. — NO space after the colon, matching the prod DB email_templates.category values written by `seed.category = \\`Stream:${seed.stream}\\`` at stream-templates.ts:102"
    - "Each section states its HTML-comment sentinel verbatim: `<!-- STREAM_V3:NetSuite -->`, `<!-- STREAM_V3:AI/ML -->`, etc. — the suffix is the bare stream name (the part after `Stream:`)"
    - "Stream:NetSuite section preserves the existing quick-8 v3 copy verbatim (it's the one stream the v6 shell was designed for); the other 8 streams DROP the 'A note on NetSuite Next 2026' inline callout entirely (noteCalloutTitle: OMIT)"
    - "File contains a 'How to use this file' header explaining the role: this is a human-reviewable copy draft. After user replies 'copy-approved' in Plan 06-01b's first task, the executor mechanically translates these 9 sections into TypeScript dict entries via `buildStreamV3Body({...})` in stream-templates.ts. Edits the user makes BEFORE approval are applied here first, then re-presented for approval."
    - "No production source files are modified by this plan (no backend code, no frontend code, no schema). Only the planning markdown doc is created."
  artifacts:
    - path: ".planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md"
      provides: "9-stream human-readable draft copy proposals — source of truth for Plan 06-01b's dict-literal instantiation"
      contains: "Stream:Cybersecurity"
  key_links:
    - from: "06-STREAM-COPY.md sections"
      to: "Plan 06-01b's STREAM_TEMPLATE_V3_BODIES dict entries"
      via: "executor mechanically translates each ## Stream:* section into one buildStreamV3Body({...}) call after user approves with 'copy-approved'"
      pattern: "Stream:.*Practice"
---

<objective>
Produce a HUMAN-READABLE markdown draft (`06-STREAM-COPY.md`) of the 9 per-stream copy proposals that Plan 06-01b will mechanically translate into HTML dict entries. This is the human-review surface for the 9 prospect-facing email bodies BEFORE any TypeScript synthesis happens.

Purpose: the 9 stream-coherent bodies will be sent to real prospects (JM + Rajesh first, then production list). Per the deploy-gate spirit captured in CONTEXT.md ("without my approval — don't send this to live"), the executor MUST NOT auto-synthesize 9 prospect-facing email bodies and bake them into TypeScript without the user reading the actual copy first. This plan produces the readable draft; Plan 06-01b's first task is a checkpoint where the user replies `copy-approved` (or sends edits) before the dict-literal instantiation runs.

Output:
- `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md` — single markdown file with 9 sections, each with the 12-field copy table, the dict-key header, the HTML-comment sentinel value, and the "OMIT" or full copy for the inline NetSuite Next callout
- Backend code, frontend code, schema = ZERO TOUCH

This is REQ-060 step 1 of 2. Step 2 (the actual STREAM_TEMPLATE_V3_BODIES dict + /upgrade-streams-v3 endpoint rewire) is Plan 06-01b after copy approval.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/production-crm/.planning/STATE.md
@/Users/jeet/production-crm/.planning/ROADMAP.md
@/Users/jeet/production-crm/.planning/phases/06-stream-coherent-templates-and-review-queue/06-CONTEXT.md
@/Users/jeet/production-crm/.planning/quick/8-port-tcp-v6-branded-email-design-into-ph/8-SUMMARY.md
@/Users/jeet/production-crm/backend/src/seeds/stream-templates.ts
@/Users/jeet/production-crm/backend/src/routes/apollo.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write 06-STREAM-COPY.md with 9-stream human-readable draft</name>
  <files>
    .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md
  </files>
  <action>
    Working directory: `/Users/jeet/production-crm/`.

    Create `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md` (NEW file). The file is a flat markdown document containing 9 stream sections. It is the source-of-truth the user reads before Plan 06-01b's checkpoint asks for approval.

    Per CONTEXT.md "Per-stream copy direction" table (lines ~63-73), the 9 streams are the EXACT production streams (verified at backend/src/routes/apollo.ts:73-76 VALID_STREAMS and backend/src/seeds/stream-templates.ts:30-81 STREAM_TEMPLATE_SEEDS). DO NOT invent streams like 'RPA' or 'Web3' that do not exist in prod.

    STEP A — Write the file header (preamble). It must include:

    ```markdown
    # Phase 6 — Stream-Coherent Email Body Copy Drafts

    > **What this is:** human-readable draft copy for the 9 per-stream `STREAM_TEMPLATE_V3_BODIES` entries that Plan 06-01b will mechanically translate into TypeScript.
    > **Why it exists:** per CONTEXT.md (lines 168-204) and the user's locked rule "without my approval — don't send this to live", the executor must NOT auto-synthesize 9 prospect-facing email bodies and bake them into code without the user reading them first.
    > **What the user does:** read each ## Stream:* section below. Either reply `copy-approved` at Plan 06-01b's first task (= a human-action checkpoint), or send line-edits which the executor re-applies here, then re-asks.

    ## Naming conventions (locked from CONTEXT.md)

    - **Dict-key format:** `'Stream:NetSuite'` (NO space after colon). This matches the prod DB `email_templates.category` values written by `seed.category = \`Stream:${seed.stream}\`` at `backend/src/seeds/stream-templates.ts:102`. Five names DIFFER from earlier (wrong) taxonomy: `Stream:AI/ML` (was `AI-ML`), `Stream:Cloud/DevOps` (was `Cloud`), `Stream:Data/Analytics` (was `Data`), `Stream:Enterprise/ERP` (was `RPA`), `Stream:Staffing/HR` (was `Web3`). The 9 real streams are at `backend/src/routes/apollo.ts:73-76` VALID_STREAMS.
    - **HTML-comment sentinel:** each body starts with `<!-- STREAM_V3:<bareStream> --> ` as the FIRST line after `<body>`. Suffix is the bare stream name (the part after `Stream:`). Examples: `<!-- STREAM_V3:NetSuite -->`, `<!-- STREAM_V3:AI/ML -->`, `<!-- STREAM_V3:Cloud/DevOps -->`. The sentinel is unique-per-stream by construction and survives any future copy changes.
    - **Inline NetSuite Next 2026 callout:** preserved ONLY in Stream:NetSuite. Other 8 streams drop it entirely (do NOT replace with stream-specific roadmap content).

    ## Visual chrome (shared across all 9 — DO NOT edit per stream)

    - Navy `#0F172A` header with gradient top accent bar
    - Orange `#F97316` accent on the inline AI callout containing `{{intentHook}}`, `{{companyContext}}`, `{{painPoint}}`, `{{cta}}`
    - 4-cell metrics row: `1000+` `Implementations` | `Since 2015` `<metricLabel>` | `94%` `Faster Close` | `$1/contract` `Staffing Fee`
    - 4 CTA buttons: Call ARIA, Call a Human, Visit TechCloudPro, Visit ArthaBuild AI
    - 30-day guarantee block (unchanged)
    - Sara signature footer with `mailto:sara@techcloudpro.com?subject=Unsubscribe`

    ## The 12 per-stream fields

    Each `## Stream:<name>` section below specifies these 12 values. Plan 06-01b will pass them into `buildStreamV3Body({...})` (defined in stream-templates.ts) and the function will return the rendered ~21KB HTML body.

    1. `preheaderTail` — sentence fragment after "Quick 45-second look at how we can help {{companyName}}."
    2. `tagPillText` — header tag pill text under the navy header
    3. `metricLabel` — label under the "Since 2015" metric cell
    4. `introSentence` — opening paragraph after the metrics row
    5. `noteCalloutTitle` — header of the post-intro inline callout (set to `OMIT` to drop the entire callout block; only Stream:NetSuite keeps it)
    6. `noteCalloutBody` — body inside the inline callout (ignored when noteCalloutTitle is OMIT)
    7. `servicePropTitle1` + `servicePropBody1` — service value prop 01 (e.g., "Cybersecurity Practice. Senior auditors, since 2015.")
    8. `servicePropTitle2` + `servicePropBody2` — service value prop 02 (e.g., "ArthaBuild AI. Your security copilot.")
    9. `footerReprise` — final-CTA banner text (e.g., "Cybersecurity · AI Consulting · $1 Staffing")
    10. `arthaBannerSubtitle` — ArthaBuild banner subtitle (e.g., "Your security copilot · threat modeling, IR docs · artha.build")
    11. `ariaBlurb` — final ARIA description (e.g., "ARIA is our AI receptionist. She knows our Cybersecurity practice and full services portfolio.")
    12. `sentinel` — HTML-comment sentinel literal that Plan 06-01b will bake into the FIRST line after `<body>`

    ## Service props 03 + 04 — SHARED ACROSS ALL 9 (DO NOT edit per stream)

    - Service prop 03: `Dedicated AI Consulting` (existing v6 chrome — preserved byte-for-byte)
    - Service prop 04: `Transparent staffing. $1 per contract.` (existing v6 chrome — preserved byte-for-byte)
    ```

    STEP B — Then write 9 sections, ONE per stream, in this order (matches VALID_STREAMS at apollo.ts:73-76):

    1. `## Stream:NetSuite`
    2. `## Stream:AI/ML`
    3. `## Stream:Cloud/DevOps`
    4. `## Stream:Cybersecurity`
    5. `## Stream:Data/Analytics`
    6. `## Stream:Mobile`
    7. `## Stream:Enterprise/ERP`
    8. `## Stream:Staffing/HR`
    9. `## Stream:Other`

    Each section MUST follow this exact structure:

    ```markdown
    ## Stream:<BareName>

    **Dict key (verbatim, NO space after colon):** `'Stream:<BareName>'`
    **HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:<BareName> -->`

    | Field | Value |
    |---|---|
    | `preheaderTail` | <stream-coherent text> |
    | `tagPillText` | <stream-coherent text> |
    | `metricLabel` | <stream-coherent text — must be unique per stream> |
    | `introSentence` | <stream-coherent text> |
    | `noteCalloutTitle` | `OMIT` (or the full title for Stream:NetSuite only) |
    | `noteCalloutBody` | (ignored when noteCalloutTitle is OMIT) |
    | `servicePropTitle1` | <stream-coherent text> |
    | `servicePropBody1` | <stream-coherent text> |
    | `servicePropTitle2` | <stream-coherent text> |
    | `servicePropBody2` | <stream-coherent text> |
    | `footerReprise` | <stream-coherent text — usually `<Stream label> · AI Consulting · $1 Staffing`> |
    | `arthaBannerSubtitle` | <stream-coherent text> |
    | `ariaBlurb` | <stream-coherent text> |

    **Notes (optional):** <if the executor wants to call out a tradeoff or alternative wording, do it here>
    ```

    STEP C — Per-stream draft copy (use the CONTEXT.md lines 63-73 table as the source of truth). Below is the authoritative per-stream content the executor MUST write into 06-STREAM-COPY.md. Each section's metricLabel + servicePropTitle1 MUST contain a UNIQUE per-stream literal that Plan 06-06's psql per-stream sentinel verify can grep for.

    ### Stream:NetSuite (preserves existing quick-8 v3 verbatim — it's the one stream the v6 shell was designed for)

    | Field | Value |
    |---|---|
    | `preheaderTail` | `NetSuite, ArthaBuild AI, custom AI work, and our $1 staffing model.` |
    | `tagPillText` | `NetSuite Next · ArthaBuild AI · $1 Staffing` |
    | `metricLabel` | `NetSuite Practice` |
    | `introSentence` | `We're a senior NetSuite and AI team. Certified. Around since 2015. Over 1,000 implementations.` |
    | `noteCalloutTitle` | `A note on NetSuite Next 2026` |
    | `noteCalloutBody` | `<strong style="color:#1E3A8A;">SuiteCloud AI, Predictive Planning, AI Workspaces.</strong> They take a lot more than SuiteScript. Our team plus our own NetSuite copilot, <strong style="color:#1E3A8A;">ArthaBuild AI</strong>, handle the modern stack end to end.` |
    | `servicePropTitle1` | `NetSuite Practice. Senior team, since 2015.` |
    | `servicePropBody1` | `Full-cycle implementation, optimization, managed services. Multi-entity, OneWorld, NetSuite Next 2026. Senior architects on the engagement, never juniors.` |
    | `servicePropTitle2` | `ArthaBuild AI. Your NetSuite copilot.` |
    | `servicePropBody2` | `Writes <strong style="color:#0F172A;">SuiteScript</strong>, drafts <strong style="color:#0F172A;">BRDs</strong>, builds <strong style="color:#0F172A;">technical documentation</strong>. Live at artha.build.` |
    | `footerReprise` | `NetSuite Next · AI Consulting · $1 Staffing` |
    | `arthaBannerSubtitle` | `Your NetSuite copilot · SuiteScript, BRDs, docs · artha.build` |
    | `ariaBlurb` | `ARIA is our AI receptionist. She knows NetSuite Next 2026, SuiteCloud AI, and our full services portfolio.` |

    ### Stream:AI/ML

    | Field | Value |
    |---|---|
    | `preheaderTail` | `Production LLM apps, RAG, classical ML, ArthaBuild AI, and our $1 staffing model.` |
    | `tagPillText` | `AI/ML · ArthaBuild AI · $1 Staffing` |
    | `metricLabel` | `AI/ML Practice` |
    | `introSentence` | `We're a senior AI/ML engineering team. Production LLM apps, RAG, classical ML. Around since 2015. Over 1,000 model engagements.` |
    | `noteCalloutTitle` | `OMIT` |
    | `noteCalloutBody` | (ignored) |
    | `servicePropTitle1` | `AI/ML Practice. Production LLM and classical, since 2015.` |
    | `servicePropBody1` | `Eval harnesses, prompt versioning, RAG pipelines, classical ML. Senior engineers on the engagement, never juniors.` |
    | `servicePropTitle2` | `ArthaBuild AI. Your AI copilot.` |
    | `servicePropBody2` | `Eval harness scaffolds, prompt versioning workflows, RAG quick-starts. Live at artha.build.` |
    | `footerReprise` | `AI/ML · AI Consulting · $1 Staffing` |
    | `arthaBannerSubtitle` | `Your AI copilot · eval harnesses, prompt versioning · artha.build` |
    | `ariaBlurb` | `ARIA is our AI receptionist. She knows our AI/ML practice and full services portfolio.` |

    ### Stream:Cloud/DevOps

    | Field | Value |
    |---|---|
    | `preheaderTail` | `Cloud architecture, IaC, cost optimization, ArthaBuild AI, and our $1 staffing model.` |
    | `tagPillText` | `Cloud/DevOps · ArthaBuild AI · $1 Staffing` |
    | `metricLabel` | `Cloud/DevOps Practice` |
    | `introSentence` | `We're a senior cloud architecture and AI team. AWS, GCP, Azure. Around since 2015. Over 1,000 cloud engagements.` |
    | `noteCalloutTitle` | `OMIT` |
    | `noteCalloutBody` | (ignored) |
    | `servicePropTitle1` | `Cloud/DevOps Practice. AWS / GCP / Azure architects, since 2015.` |
    | `servicePropBody1` | `Landing zones, IaC, cost surfaces, drift detection, observability. Senior architects on the engagement, never juniors.` |
    | `servicePropTitle2` | `ArthaBuild AI. Your infra copilot.` |
    | `servicePropBody2` | `IaC scaffolds, cost-surface reports, drift checks. Live at artha.build.` |
    | `footerReprise` | `Cloud/DevOps · AI Consulting · $1 Staffing` |
    | `arthaBannerSubtitle` | `Your infra copilot · IaC, cost surfaces, drift · artha.build` |
    | `ariaBlurb` | `ARIA is our AI receptionist. She knows our Cloud/DevOps practice and full services portfolio.` |

    ### Stream:Cybersecurity

    | Field | Value |
    |---|---|
    | `preheaderTail` | `Cybersecurity audits, AI-augmented compliance, ArthaBuild AI, and our $1 staffing model.` |
    | `tagPillText` | `Cybersecurity · ArthaBuild AI · $1 Staffing` |
    | `metricLabel` | `Cybersecurity Practice` |
    | `introSentence` | `We're a senior security architecture and AI team. Certified. Around since 2015. Over 1,000 engagements.` |
    | `noteCalloutTitle` | `OMIT` |
    | `noteCalloutBody` | (ignored) |
    | `servicePropTitle1` | `Cybersecurity Practice. Senior auditors, since 2015.` |
    | `servicePropBody1` | `Threat modeling, IR docs, compliance maps, AppSec engineering. Senior reviewers on the engagement, never juniors.` |
    | `servicePropTitle2` | `ArthaBuild AI. Your security copilot.` |
    | `servicePropBody2` | `Threat modeling drafts, IR runbook generation, compliance gap maps. Live at artha.build.` |
    | `footerReprise` | `Cybersecurity · AI Consulting · $1 Staffing` |
    | `arthaBannerSubtitle` | `Your security copilot · threat modeling, IR docs · artha.build` |
    | `ariaBlurb` | `ARIA is our AI receptionist. She knows our Cybersecurity practice and full services portfolio.` |

    ### Stream:Data/Analytics

    | Field | Value |
    |---|---|
    | `preheaderTail` | `Data engineering, warehouse modernization, ArthaBuild AI, and our $1 staffing model.` |
    | `tagPillText` | `Data/Analytics · ArthaBuild AI · $1 Staffing` |
    | `metricLabel` | `Data/Analytics Practice` |
    | `introSentence` | `We're a senior data engineering and AI team. Snowflake, Databricks, dbt. Around since 2015. Over 1,000 pipelines shipped.` |
    | `noteCalloutTitle` | `OMIT` |
    | `noteCalloutBody` | (ignored) |
    | `servicePropTitle1` | `Data/Analytics Practice. Senior DEs — Snowflake / Databricks, since 2015.` |
    | `servicePropBody1` | `dbt modeling, lineage, anomaly detection, warehouse modernization. Senior engineers on the engagement, never juniors.` |
    | `servicePropTitle2` | `ArthaBuild AI. Your data copilot.` |
    | `servicePropBody2` | `dbt model drafts, lineage maps, anomaly-detection rules. Live at artha.build.` |
    | `footerReprise` | `Data/Analytics · AI Consulting · $1 Staffing` |
    | `arthaBannerSubtitle` | `Your data copilot · dbt models, lineage, anomaly detection · artha.build` |
    | `ariaBlurb` | `ARIA is our AI receptionist. She knows our Data/Analytics practice and full services portfolio.` |

    ### Stream:Mobile

    | Field | Value |
    |---|---|
    | `preheaderTail` | `Mobile engineering, native and cross-platform, ArthaBuild AI, and our $1 staffing model.` |
    | `tagPillText` | `Mobile · ArthaBuild AI · $1 Staffing` |
    | `metricLabel` | `Mobile Practice` |
    | `introSentence` | `We're a senior mobile and AI team. Native iOS, Android, Flutter, React Native. Around since 2015. Over 1,000 apps shipped.` |
    | `noteCalloutTitle` | `OMIT` |
    | `noteCalloutBody` | (ignored) |
    | `servicePropTitle1` | `Mobile Practice. Native and cross-platform, since 2015.` |
    | `servicePropBody1` | `iOS, Android, Flutter, RN. UI test generation, performance baselines, release ops. Senior engineers on the engagement, never juniors.` |
    | `servicePropTitle2` | `ArthaBuild AI. Your mobile copilot.` |
    | `servicePropBody2` | `UI test scaffolds, performance baselines, release-pipeline drafts. Live at artha.build.` |
    | `footerReprise` | `Mobile · AI Consulting · $1 Staffing` |
    | `arthaBannerSubtitle` | `Your mobile copilot · UI test gen, perf baselines · artha.build` |
    | `ariaBlurb` | `ARIA is our AI receptionist. She knows our Mobile practice and full services portfolio.` |

    ### Stream:Enterprise/ERP

    | Field | Value |
    |---|---|
    | `preheaderTail` | `Multi-system ERP architecture — SAP, Oracle, custom builds — ArthaBuild AI, and our $1 staffing model.` |
    | `tagPillText` | `Enterprise/ERP · ArthaBuild AI · $1 Staffing` |
    | `metricLabel` | `Enterprise/ERP Practice` |
    | `introSentence` | `We're a senior multi-system ERP and AI team. SAP, Oracle, custom builds. Around since 2015. Over 1,000 implementations across systems.` |
    | `noteCalloutTitle` | `OMIT` |
    | `noteCalloutBody` | (ignored) |
    | `servicePropTitle1` | `Enterprise/ERP Practice. Multi-system architects — SAP, Oracle, custom builds, since 2015.` |
    | `servicePropBody1` | `Workflow design, integration maps, migration plans across multiple ERPs. Senior architects on the engagement, never juniors.` |
    | `servicePropTitle2` | `ArthaBuild AI. Your ERP copilot.` |
    | `servicePropBody2` | `Workflow drafts, integration scaffolds, migration playbooks. Live at artha.build.` |
    | `footerReprise` | `Enterprise/ERP · AI Consulting · $1 Staffing` |
    | `arthaBannerSubtitle` | `Your ERP copilot · workflow design, integration maps · artha.build` |
    | `ariaBlurb` | `ARIA is our AI receptionist. She knows our Enterprise/ERP practice and full services portfolio.` |

    ### Stream:Staffing/HR

    | Field | Value |
    |---|---|
    | `preheaderTail` | `$1/contract staffing, candidate placement, ArthaBuild AI, and our custom AI work.` |
    | `tagPillText` | `Staffing/HR · ArthaBuild AI · $1 Staffing` |
    | `metricLabel` | `Staffing/HR Practice` |
    | `introSentence` | `We're a senior staffing and HR systems team. $1/contract staffing, candidate placement, HR-stack integrations. Around since 2015. Over 1,000 placements.` |
    | `noteCalloutTitle` | `OMIT` |
    | `noteCalloutBody` | (ignored) |
    | `servicePropTitle1` | `Staffing/HR Practice. $1/contract staffing, since 2015.` |
    | `servicePropBody1` | `Req drafting, candidate matching, onboarding playbooks. Senior recruiters and HR architects on the engagement, never juniors.` |
    | `servicePropTitle2` | `ArthaBuild AI. Your HR copilot.` |
    | `servicePropBody2` | `Req-drafting templates, candidate-matching scaffolds, onboarding playbooks. Live at artha.build.` |
    | `footerReprise` | `Staffing/HR · AI Consulting · $1 Staffing` |
    | `arthaBannerSubtitle` | `Your HR copilot · req drafting, candidate matching · artha.build` |
    | `ariaBlurb` | `ARIA is our AI receptionist. She knows our Staffing/HR practice and full services portfolio.` |

    ### Stream:Other

    | Field | Value |
    |---|---|
    | `preheaderTail` | `Senior consulting, ArthaBuild AI, custom AI work, and our $1 staffing model.` |
    | `tagPillText` | `Consulting · ArthaBuild AI · $1 Staffing` |
    | `metricLabel` | `TCP Practice` |
    | `introSentence` | `We're a senior consulting team, since 2015, with a custom AI copilot in-house. Over 1,000 engagements.` |
    | `noteCalloutTitle` | `OMIT` |
    | `noteCalloutBody` | (ignored) |
    | `servicePropTitle1` | `TCP Practice. Senior consulting, since 2015.` |
    | `servicePropBody1` | `Cross-stack senior engineers, architects, auditors. Whatever you actually need — no juniors, no offshore handoff.` |
    | `servicePropTitle2` | `ArthaBuild AI. Your custom copilot.` |
    | `servicePropBody2` | `Whatever you ship, whatever you audit, whatever you operate — we wire it through our own copilot. Live at artha.build.` |
    | `footerReprise` | `Consulting · AI Consulting · $1 Staffing` |
    | `arthaBannerSubtitle` | `Your custom copilot · whatever you ship · artha.build` |
    | `ariaBlurb` | `ARIA is our AI receptionist. She knows our full services portfolio.` |

    STEP D — Trailing block at the bottom of the file:

    ```markdown
    ## How to approve / edit

    - **To approve as-is:** reply with the literal word `copy-approved` at Plan 06-01b's first task (a human-action checkpoint). The executor will mechanically translate these 9 sections into TypeScript dict entries.
    - **To edit:** reply with line-edits (Slack-style: "Change Stream:Cybersecurity metricLabel to X" / "Replace Stream:Mobile servicePropBody2 with Y"). The executor will re-apply edits to THIS file, re-show the section(s), and re-ask for approval. Approval is binary — there is no partial approval.
    - **To defer / change a stream entirely:** reply with the stream name and what you'd prefer. The executor will ask follow-up questions if needed, then re-draft just that section.

    No edit applies to source code until you say `copy-approved`. The executor does NOT pre-emptively draft TypeScript while you're reviewing.

    ## Verification before Plan 06-01b is unblocked

    - Per-stream `metricLabel` is unique → each of the 9 streams contains a different "X Practice" literal (this is what Plan 06-06's psql per-stream sentinel verify greps for).
    - Per-stream HTML-comment sentinel `<!-- STREAM_V3:<bare> -->` is unique → enforces "no cross-contamination" check in Plan 06-06 STEP K/L.
    - Stream:NetSuite is the ONLY stream with `noteCalloutTitle` not equal to `OMIT`.
    - All dict keys use `Stream:<bare>` format (NO space after colon), matching prod DB email_templates.category values.
    ```

    STEP E — Commit. Single atomic commit:
    ```bash
    git add .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md
    git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "docs(06-01a): 9-stream per-stream copy drafts for human review (REQ-060 step 1/2)"
    ```

    Constraints:
    - DO NOT touch any backend source file (stream-templates.ts, emailTemplates.ts, apollo.ts, schema.prisma)
    - DO NOT touch any frontend file
    - DO NOT touch any migration directory
    - DO NOT add a TypeScript export or dict literal in this plan — that is Plan 06-01b's job after approval
    - Stream order MUST match VALID_STREAMS at apollo.ts:73-76: NetSuite, AI/ML, Cloud/DevOps, Cybersecurity, Data/Analytics, Mobile, Enterprise/ERP, Staffing/HR, Other
    - Every `metricLabel` value MUST be unique across the 9 streams (it's the per-stream sentinel used by Plan 06-06 STEP K + STEP L psql verify) — this is enforced by construction since each stream's metricLabel ends in "Practice" prefixed by the stream name
    - Stream:NetSuite section MUST preserve the existing quick-8 v3 copy verbatim (per CONTEXT.md "What gets dropped from non-NetSuite v3 variants")
  </action>
  <verify>
    From `/Users/jeet/production-crm/`:

    ```bash
    # File exists
    test -f .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md && echo "OK"

    # All 9 real prod streams present as section headers
    grep -c "^## Stream:NetSuite$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1
    grep -c "^## Stream:AI/ML$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1
    grep -c "^## Stream:Cloud/DevOps$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1
    grep -c "^## Stream:Cybersecurity$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1
    grep -c "^## Stream:Data/Analytics$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1
    grep -c "^## Stream:Mobile$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1
    grep -c "^## Stream:Enterprise/ERP$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1
    grep -c "^## Stream:Staffing/HR$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1
    grep -c "^## Stream:Other$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1

    # NO invented streams (these are the 5 wrong-taxonomy names that BLOCKER 1 flagged)
    grep -c "Stream:RPA" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 0
    grep -c "Stream:Web3" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 0
    grep -cE "Stream:AI-ML\b" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 0
    grep -cE "Stream:Cloud\b" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 0 (Cloud/DevOps OK because it has the slash; the bare 'Stream:Cloud' word-boundary catches the wrong variant)
    grep -cE "Stream:Data\b" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 0 (Data/Analytics OK; bare 'Stream:Data' word-boundary catches the wrong variant)

    # NO-SPACE dict key format (each section asserts its dict key)
    grep -c "'Stream:NetSuite'" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "'Stream:Cybersecurity'" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "'Stream: " .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 0 (NO space after colon)

    # HTML-comment sentinels present per stream
    grep -c "<!-- STREAM_V3:NetSuite -->" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "<!-- STREAM_V3:AI/ML -->" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "<!-- STREAM_V3:Cloud/DevOps -->" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "<!-- STREAM_V3:Cybersecurity -->" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "<!-- STREAM_V3:Data/Analytics -->" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "<!-- STREAM_V3:Mobile -->" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "<!-- STREAM_V3:Enterprise/ERP -->" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "<!-- STREAM_V3:Staffing/HR -->" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "<!-- STREAM_V3:Other -->" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1

    # Per-stream metricLabel uniqueness (each "X Practice" literal)
    grep -c "NetSuite Practice" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "AI/ML Practice" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "Cloud/DevOps Practice" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "Cybersecurity Practice" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "Data/Analytics Practice" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "Mobile Practice" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "Enterprise/ERP Practice" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "Staffing/HR Practice" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1
    grep -c "TCP Practice" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 1

    # Only Stream:NetSuite has non-OMIT noteCalloutTitle
    grep -c "A note on NetSuite Next 2026" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → 1 (only in Stream:NetSuite section)
    grep -c "OMIT" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md  # → ≥ 8 (the 8 non-NetSuite sections set noteCalloutTitle to OMIT)

    # NO production source files touched
    git diff HEAD~1..HEAD --stat | grep -cE "(backend/|frontend/|prisma/)" || echo 0  # → 0

    # Single commit, correct author
    git log -1 --format="%s"  # → "docs(06-01a): 9-stream per-stream copy drafts for human review (REQ-060 step 1/2)"
    git log -1 --format="%an <%ae>"  # → "jeet-avatar <jm@techcloudpro.com>"
    ```
  </verify>
  <done>
    `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md` exists with 9 stream sections (NetSuite, AI/ML, Cloud/DevOps, Cybersecurity, Data/Analytics, Mobile, Enterprise/ERP, Staffing/HR, Other) — each section has the 12-field copy table, the NO-SPACE dict-key header, and the per-stream HTML-comment sentinel. Per-stream metricLabel values are unique. Stream:NetSuite preserves quick-8 v3 verbatim; other 8 streams set noteCalloutTitle to OMIT. NO production source files modified. NO invented streams (RPA, Web3, AI-ML, Cloud, Data not present). Single commit by jeet-avatar.
  </done>
</task>

</tasks>

<verification>
After Task 1:

```bash
# Single commit, only the planning markdown changed
git diff HEAD~1 --stat | grep -cE "06-STREAM-COPY\.md"  # → 1
git diff HEAD~1 --stat | grep -cE "(backend/|frontend/|prisma/)" || echo 0  # → 0

# All 9 prod streams present
for s in "NetSuite" "AI/ML" "Cloud/DevOps" "Cybersecurity" "Data/Analytics" "Mobile" "Enterprise/ERP" "Staffing/HR" "Other"; do
  grep -c "^## Stream:${s}\$" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md
done
# → 9 outputs of "1"

# No invented streams
for s in "RPA" "Web3"; do
  grep -c "Stream:${s}" .planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md
done
# → 2 outputs of "0"
```
</verification>

<success_criteria>
- `.planning/phases/06-stream-coherent-templates-and-review-queue/06-STREAM-COPY.md` exists
- 9 stream sections in VALID_STREAMS order
- NO-space dict-key format throughout (`'Stream:NetSuite'` etc.)
- HTML-comment sentinels present per stream (`<!-- STREAM_V3:NetSuite -->` etc.)
- Per-stream metricLabel values unique (NetSuite Practice, AI/ML Practice, Cloud/DevOps Practice, Cybersecurity Practice, Data/Analytics Practice, Mobile Practice, Enterprise/ERP Practice, Staffing/HR Practice, TCP Practice)
- Stream:NetSuite preserves quick-8 v3 copy verbatim (only stream with `A note on NetSuite Next 2026`)
- Other 8 streams set noteCalloutTitle to OMIT
- NO production source files modified (backend, frontend, schema, migrations all untouched)
- Single commit authored by `jeet-avatar <jm@techcloudpro.com>`
- NO invented streams (RPA, Web3, AI-ML, bare Cloud, bare Data absent)
</success_criteria>

<output>
After completion, create `.planning/phases/06-stream-coherent-templates-and-review-queue/06-01a-SUMMARY.md` capturing: the 9-stream draft copy committed, sentinel-uniqueness verification, dict-key NO-SPACE verification, Stream:NetSuite preservation evidence, commit hash. Next: Plan 06-01b's first task is a human-action checkpoint asking the user to reply `copy-approved`.
</output>
