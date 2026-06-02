// backend/src/lib/claudeClient.ts
//
// Phase 04 (quick-7) — Claude Haiku helper for Apollo ICP filter normalization.
//
// Purpose: users type free-text into the ApolloSearchForm ("NetSuite", "AI", "CFO at SaaS")
// and burn Apollo credits on misclassified ICPs. This helper proxies the raw input through
// Claude Haiku to return Apollo's canonical taxonomy + warnings about common pitfalls
// (e.g., "NetSuite" keyword returns consultancies, not customers).
//
// Locked decisions:
//   1. Model: claude-haiku-4-5-20251001 — cheapest + fastest, no need for Sonnet here.
//   2. ANTHROPIC_API_KEY is required at call time. We do NOT fail-fast at module load
//      because (a) the rest of the backend should boot even if Claude is unavailable,
//      and (b) ApolloSearchForm is the only consumer and degrades gracefully.
//   3. Response format: structured JSON only. We extract the first {...} block from the
//      Claude reply and JSON.parse it. If parse fails, throw — the route returns 5xx and
//      the frontend shows "AI refine unavailable, try again."
//
// References:
//   - .planning/phases/04-apollo-campaign-port/04-04-PLAN.md (quick-7 spec)
//   - production-crm/backend/src/lib/claudeClient.ts SHA d0a3708, 17c2ceb (origin)

import Anthropic from '@anthropic-ai/sdk';

// Lazy-init the client so missing ANTHROPIC_API_KEY at boot doesn't crash the backend.
// Only callers of normalizeFiltersWithClaude (i.e., POST /api/apollo/normalize-filters)
// will see the error.
let _anthropic: Anthropic | null = null;
function getClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY env var is not set — cannot call Claude. ' +
        'Set ANTHROPIC_API_KEY in backend/.env (live key in EC2 /var/www/crm-backend/.env or AWS Secrets Manager).',
    );
  }
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

export interface ClaudeFilterInput {
  titles?: string;
  industries?: string;
  keywords?: string;
}

export interface ClaudeFilterOutput {
  job_titles: string[];
  industries: string[];
  technologies: string[];
  warnings: string[];
}

/**
 * Normalize user free-text into Apollo.io's canonical filter taxonomy.
 *
 * @param rawInput Free-text titles/industries/keywords the user typed into ApolloSearchForm.
 * @returns Structured filters + warnings about common Apollo pitfalls.
 * @throws Error if ANTHROPIC_API_KEY missing, Claude returns non-JSON, or the API call fails.
 */
export async function normalizeFiltersWithClaude(
  rawInput: ClaudeFilterInput,
): Promise<ClaudeFilterOutput> {
  const client = getClient();

  const prompt = `You are an Apollo.io ICP refiner. The user typed these search terms into our Apollo search form:

Titles: ${rawInput.titles || '(none)'}
Industries: ${rawInput.industries || '(none)'}
Keywords: ${rawInput.keywords || '(none)'}

Normalize them into Apollo.io's filter taxonomy. Watch for these common pitfalls:
- "NetSuite" as a keyword returns consultancies / partners, NOT NetSuite end-user customers. Suggest the technology filter "uses_netsuite" instead and warn the user.
- "AI" as a keyword is too broad — returns AI startups. Prefer specific titles like "ML Engineer", "Data Scientist", or technology tags like "uses_pytorch", "uses_tensorflow".
- Generic titles like "Engineer" without seniority return junior + senior mixed; prefer "VP Engineering", "Director of Engineering", "Head of Engineering".

Return ONLY a JSON object with this exact shape — no prose, no markdown fences:
{
  "job_titles": ["..."],       // normalized titles for Apollo's person_titles[] filter
  "industries": ["..."],       // canonical Apollo industry names (e.g., "Computer Software", "Hospital & Health Care")
  "technologies": ["..."],     // Apollo tech filter slugs (e.g., "uses_netsuite", "uses_salesforce")
  "warnings": ["..."]          // human-readable cautions if user's input would burn credits on bad matches
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  // Claude returns content as an array of blocks; we want the first text block.
  const firstBlock = response.content[0] as { type: string; text?: string };
  const text = firstBlock?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `Claude returned non-JSON response (model=claude-haiku-4-5-20251001). First 200 chars: ${text.slice(0, 200)}`,
    );
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<ClaudeFilterOutput>;
  return {
    job_titles: Array.isArray(parsed.job_titles) ? parsed.job_titles : [],
    industries: Array.isArray(parsed.industries) ? parsed.industries : [],
    technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  };
}
