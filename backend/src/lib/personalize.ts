// backend/src/lib/personalize.ts
//
// Phase 04-05 — Per-contact AI personalization helper.
//
// Single public function:
//   personalizeContactWithClaude(contact, stream) → { tokens, usage, warning? }
//
// Implementation notes:
//   - Uses Claude Sonnet 4.6 with the web_search tool (max 3 uses) to ground tokens
//     in REAL public signals (recent news, funding, leadership changes, tech-stack hints).
//   - Module-level Anthropic singleton (mirrors lib/claudeClient.ts pattern). Missing
//     ANTHROPIC_API_KEY is NOT fatal — the function returns a graceful fallback.
//   - NEVER throws. EXACTLY 5 fallback paths:
//       1. missing key                    → 'Claude not configured'
//       2. 60s Promise.race timeout       → 'Claude timed out — used per-stream fallback'
//       3. empty text block               → 'Claude returned empty response'
//       4. JSON.parse throws OR non-obj   → 'Claude returned malformed JSON' (folded branch)
//       5. anything else (SDK throws,
//          network, anthropic 4xx/5xx,
//          web_search error)              → 'Claude unavailable'
//
//   - Cost is computed per call: input + output tokens at Sonnet pricing
//     ($3/MTok in + $15/MTok out) + web_search at $0.01 per use.
//   - The route layer (backend/src/routes/apollo.ts:/send-personalized-campaign) owns
//     audit-row persistence, Resend dispatch, and Campaign+EmailLog wiring for analytics.
//     This file is PURE — no DB writes, no Resend calls, no res/req coupling.

import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// Anthropic client (lazy singleton — pattern mirrors lib/claudeClient.ts)
// ---------------------------------------------------------------------------

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AITokens {
  intentHook: string | null;
  companyContext: string | null;
  painPoint: string | null;
  cta: string | null;
}

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  webSearchUses: number;
  costUSD: number;
}

export interface PersonalizeResult {
  tokens: AITokens | null;
  usage: ClaudeUsage;
  warning?: string;
}

export interface PersonalizeContactInput {
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  apolloRawData: any;
  company: { name: string | null; industry: string | null } | null;
}

// ---------------------------------------------------------------------------
// Cost / pacing constants
// ---------------------------------------------------------------------------

// Sonnet 4.6 pricing (USD per token). Update here when Anthropic price-changes.
const CLAUDE_INPUT_RATE_PER_TOKEN = 3 / 1_000_000; // $3 / MTok
const CLAUDE_OUTPUT_RATE_PER_TOKEN = 15 / 1_000_000; // $15 / MTok
const CLAUDE_WEB_SEARCH_RATE = 0.01; // $10 / 1000 = $0.01 per search

// 60s timeout — web_search needs headroom (often 5-30s per call, up to 3 calls).
const PERSONALIZE_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Prompt (locked — do NOT mutate without re-planning)
// ---------------------------------------------------------------------------

const PHASE5_RESEARCH_SYSTEM_PROMPT = `You are a B2B research analyst for TechCloudPro (TCP), a NetSuite + AI consultancy.

Task: research one target company using web_search, then emit JSON tokens that personalize a stream-specific outreach email.

Use web_search 1-3 times to ground these facts:
- Recent news, fundraising, acquisitions, leadership changes (last 6 months)
- Tech stack signals relevant to the given stream (e.g., for "NetSuite": ERP mentions; for "AI/ML": ML platform mentions)
- A concrete operational pain inferable from public signals

Output STRICT JSON, no markdown, no prose:
{
  "intentHook":     "<one sentence, 8-15 words, refers to recent SPECIFIC signal>",
  "companyContext": "<one sentence, 8-15 words, what they do + scale>",
  "painPoint":      "<one sentence, 8-15 words, REAL operational friction tied to stream>",
  "cta":            "<one short question, 10-15 words, ties pain to TCP offer>"
}

Rules:
- If no public signal supports a hook, return null for that field (NOT a fabrication).
- Tokens MUST be plain text (no HTML, no markdown). Max 160 chars each.
- No URLs. No company-internal jargon.

Return ONLY the JSON object.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML + URLs and cap length. Defense against AI hallucination of formatting. */
function sanitizeToken(s: string | null | undefined): string | null {
  if (typeof s !== 'string') return null;
  const stripped = s
    .replace(/<[^>]+>/g, '') // no HTML
    .replace(/https?:\/\/\S+/g, '') // no URLs
    .trim();
  if (!stripped) return null;
  return stripped.length > 160 ? stripped.slice(0, 159) + '…' : stripped;
}

function computeClaudeCost(
  inputTokens: number,
  outputTokens: number,
  webSearchUses: number,
): number {
  return (
    inputTokens * CLAUDE_INPUT_RATE_PER_TOKEN +
    outputTokens * CLAUDE_OUTPUT_RATE_PER_TOKEN +
    webSearchUses * CLAUDE_WEB_SEARCH_RATE
  );
}

function zeroUsage(): ClaudeUsage {
  return { inputTokens: 0, outputTokens: 0, webSearchUses: 0, costUSD: 0 };
}

/**
 * Pass a curated subset of apolloRawData to Claude (10-field whitelist).
 * Keeps token cost bounded and avoids leaking Apollo's internal IDs/raw payloads to the model.
 */
function curatedApolloFields(apolloRawData: any): Record<string, any> {
  if (!apolloRawData || typeof apolloRawData !== 'object') return {};
  const candidates = [
    'title',
    'headline',
    'seniority',
    'departments',
    'linkedin_url',
    'employment_history',
    'organization_industry',
    'organization_size',
    'organization_short_description',
    'organization_founded_year',
  ];
  const out: Record<string, any> = {};
  for (const k of candidates) {
    if (apolloRawData[k] !== undefined && apolloRawData[k] !== null) out[k] = apolloRawData[k];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * ONE Claude call per contact: research + token generation combined.
 *
 * NEVER throws. Returns { tokens, usage, warning? }.
 *   - tokens: null on any fallback path (callers MUST substitute per-stream defaults)
 *   - usage:  always present (zeroUsage() on fallback paths 1, 2, 5)
 *   - warning: human-readable diagnostic when tokens is null
 *
 * Fallback paths (exactly 5):
 *   1. Missing ANTHROPIC_API_KEY            → 'Claude not configured'
 *   2. 60s Promise.race timeout             → 'Claude timed out — used per-stream fallback'
 *   3. Empty text response                  → 'Claude returned empty response'
 *   4. JSON parse fails OR non-object JSON  → 'Claude returned malformed JSON'
 *   5. SDK / network / anthropic 4xx-5xx    → 'Claude unavailable'
 */
export async function personalizeContactWithClaude(
  contact: PersonalizeContactInput,
  stream: string,
): Promise<PersonalizeResult> {
  // Fallback 1: missing key
  if (!anthropicClient) {
    return { tokens: null, usage: zeroUsage(), warning: 'Claude not configured' };
  }

  const userMessage = `Research company "${contact.company?.name ?? 'unknown'}" for an outreach email to ${contact.firstName ?? ''} ${contact.lastName ?? ''}, ${contact.title ?? 'a senior buyer'}.

Stream classification: ${stream}
Industry (from Apollo): ${contact.company?.industry ?? 'unknown'}

Additional Apollo-enriched data (use sparingly):
${JSON.stringify(curatedApolloFields(contact.apolloRawData), null, 2)}

Use web_search to ground the tokens in REAL public signals. Return the strict JSON object.`;

  try {
    const timeoutPromise = new Promise<'TIMEOUT'>((resolve) =>
      setTimeout(() => resolve('TIMEOUT'), PERSONALIZE_TIMEOUT_MS),
    );

    const claudePromise = anthropicClient.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      temperature: 0,
      system: PHASE5_RESEARCH_SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        } as any,
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    const result = await Promise.race([claudePromise, timeoutPromise]);

    // Fallback 2: timeout
    if (result === 'TIMEOUT') {
      return {
        tokens: null,
        usage: zeroUsage(),
        warning: 'Claude timed out — used per-stream fallback',
      };
    }

    // Extract usage telemetry (cost, web_search count)
    const inputTokens = (result as any).usage?.input_tokens ?? 0;
    const outputTokens = (result as any).usage?.output_tokens ?? 0;
    const webSearchUses =
      (result as any).usage?.server_tool_use?.web_search_requests ?? 0;
    const costUSD = computeClaudeCost(inputTokens, outputTokens, webSearchUses);
    const usage: ClaudeUsage = { inputTokens, outputTokens, webSearchUses, costUSD };

    // Find the FIRST text block (web_search_tool_result blocks come BEFORE the final assistant text)
    const blocks = (result as any).content ?? [];
    const textBlock = blocks.find((b: any) => b.type === 'text');

    // Fallback 3: empty response
    if (!textBlock || !textBlock.text) {
      return { tokens: null, usage, warning: 'Claude returned empty response' };
    }

    // Strip code fences then parse
    const raw = String(textBlock.text)
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/g, '')
      .trim();

    // Fallback 4: malformed JSON (covers BOTH JSON.parse throw AND non-object/null parse result).
    // The manual `throw` inside the try block routes non-object results into the same catch path,
    // so we emit only ONE warning string ('Claude returned malformed JSON') for this branch.
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('non-object JSON');
      }
    } catch {
      return { tokens: null, usage, warning: 'Claude returned malformed JSON' };
    }

    const tokens: AITokens = {
      intentHook: sanitizeToken(parsed.intentHook),
      companyContext: sanitizeToken(parsed.companyContext),
      painPoint: sanitizeToken(parsed.painPoint),
      cta: sanitizeToken(parsed.cta),
    };

    return { tokens, usage };
  } catch (err: any) {
    // Fallback 5: SDK throws (anthropic 4xx/5xx, network, web_search failures, model-access errors).
    // eslint-disable-next-line no-console
    console.error('[apollo.personalize] Claude error:', err?.message || err);
    return { tokens: null, usage: zeroUsage(), warning: 'Claude unavailable' };
  }
}
