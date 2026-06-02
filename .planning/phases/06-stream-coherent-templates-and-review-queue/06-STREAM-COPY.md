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

---

## Stream:NetSuite

**Dict key (verbatim, NO space after colon):** `'Stream:NetSuite'`
**HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:NetSuite -->`

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

**Notes:** This section preserves the existing quick-8 v3 copy verbatim — the v6 shell was designed for this stream, and per CONTEXT.md "What gets dropped from non-NetSuite v3 variants" rule, Stream:NetSuite is the ONLY stream that keeps the `A note on NetSuite Next 2026` inline callout. All other streams set `noteCalloutTitle: OMIT` and drop the entire callout block.

---

## Stream:AI/ML

**Dict key (verbatim, NO space after colon):** `'Stream:AI/ML'`
**HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:AI/ML -->`

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

---

## Stream:Cloud/DevOps

**Dict key (verbatim, NO space after colon):** `'Stream:Cloud/DevOps'`
**HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:Cloud/DevOps -->`

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

---

## Stream:Cybersecurity

**Dict key (verbatim, NO space after colon):** `'Stream:Cybersecurity'`
**HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:Cybersecurity -->`

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

---

## Stream:Data/Analytics

**Dict key (verbatim, NO space after colon):** `'Stream:Data/Analytics'`
**HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:Data/Analytics -->`

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

---

## Stream:Mobile

**Dict key (verbatim, NO space after colon):** `'Stream:Mobile'`
**HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:Mobile -->`

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

---

## Stream:Enterprise/ERP

**Dict key (verbatim, NO space after colon):** `'Stream:Enterprise/ERP'`
**HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:Enterprise/ERP -->`

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

---

## Stream:Staffing/HR

**Dict key (verbatim, NO space after colon):** `'Stream:Staffing/HR'`
**HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:Staffing/HR -->`

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

---

## Stream:Other

**Dict key (verbatim, NO space after colon):** `'Stream:Other'`
**HTML-comment sentinel (first line after `<body>`):** `<!-- STREAM_V3:Other -->`

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

---

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
