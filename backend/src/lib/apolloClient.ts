/**
 * apolloClient.ts — Typed, library-pure wrapper around Apollo.io's REST API.
 *
 * Purpose:
 *   TypeScript port of `scripts/video-pipeline/apollo-import-prospects.py` so the
 *   backend Apollo route (Phase 4 plan 04-03) can do typed searches + email
 *   enrichments without re-implementing the HTTP shape.
 *
 * Scope (library-pure):
 *   - No process.env reads — caller passes the API key in.
 *   - No DB writes, no Express coupling, no orchestration logic.
 *   - Auth errors surface as `ApolloAuthError` so the route can map → 503.
 *   - Enrich failures return null so the caller can skip a record without
 *     blowing up an entire import batch.
 *
 * Endpoints called (verified against the Python reference):
 *   POST https://api.apollo.io/api/v1/mixed_people/api_search   (search)
 *   POST https://api.apollo.io/api/v1/people/match              (enrich)
 *
 * See `.planning/phases/04-apollo-import-and-auto-campaign/04-RESEARCH.md`
 * for the full Apollo contract notes + ICP pitfall analysis.
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const APOLLO_BASE = 'https://api.apollo.io/api/v1';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ApolloSearchFilters {
  personTitles?: string[];
  personLocations?: string[];
  organizationDomains?: string[];
  organizationIndustries?: string[];
  organizationKeywordTags?: string[];
  minEmployees?: number;
  maxEmployees?: number;
  page?: number;
  perPage?: number;
}

export interface ApolloOrganization {
  id?: string;
  name?: string;
  website_url?: string;
  primary_domain?: string;
  industry?: string;
  estimated_num_employees?: number;
  keywords?: string[];
}

export interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  linkedin_url?: string;
  organization?: ApolloOrganization;
}

export interface ApolloSearchResponse {
  people: ApolloPerson[];
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

// ---------------------------------------------------------------------------
// Error classes — route in 04-03 catches ApolloAuthError → 503 (key invalid)
// ---------------------------------------------------------------------------

export class ApolloAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApolloAuthError';
  }
}

export class ApolloConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApolloConfigError';
  }
}

// ---------------------------------------------------------------------------
// searchPeople — POST /mixed_people/api_search
// ---------------------------------------------------------------------------

/**
 * Run a single page of Apollo people search.
 *
 * Throws `ApolloAuthError` on HTTP 401 so the caller can map it to a 503
 * "Apollo key invalid or expired" response. All other HTTP/network errors
 * propagate as-is (axios errors) — callers should catch + log them.
 *
 * NOTE: search returns most contacts with LOCKED emails. Use `enrichPerson()`
 * to reveal them (costs ~1 Apollo credit per reveal).
 */
// TODO(Phase 4.5): Add q_organization_industry_tag_ids whitelist or exclude-industries
// filter — currently keyword_tags can match consultancies/partners (e.g., 'NetSuite' returns
// NetSuite consultancies, not end users). See .planning/phases/04-apollo-import-and-auto-campaign/04-RESEARCH.md Pitfall 4.
export async function searchPeople(
  apiKey: string,
  filters: ApolloSearchFilters,
): Promise<ApolloSearchResponse> {
  if (!apiKey) {
    throw new ApolloConfigError('Apollo API key is required');
  }

  const payload: Record<string, unknown> = {
    page: filters.page ?? 1,
    per_page: filters.perPage ?? 25,
  };

  if (filters.personTitles && filters.personTitles.length > 0) {
    payload.person_titles = filters.personTitles;
  }
  if (filters.personLocations && filters.personLocations.length > 0) {
    payload.person_locations = filters.personLocations;
  }
  if (filters.organizationKeywordTags && filters.organizationKeywordTags.length > 0) {
    payload.q_organization_keyword_tags = filters.organizationKeywordTags;
  }
  if (filters.organizationDomains && filters.organizationDomains.length > 0) {
    payload.q_organization_domains_list = filters.organizationDomains;
  }
  if (
    typeof filters.minEmployees === 'number' &&
    typeof filters.maxEmployees === 'number'
  ) {
    payload.organization_num_employees_ranges = [
      `${filters.minEmployees},${filters.maxEmployees}`,
    ];
  }

  try {
    const response = await axios.post<ApolloSearchResponse>(
      `${APOLLO_BASE}/mixed_people/api_search`,
      payload,
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        timeout: 60000,
      },
    );
    return response.data;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      throw new ApolloAuthError('Apollo key invalid or expired');
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// enrichPerson — POST /people/match
// ---------------------------------------------------------------------------

/**
 * Reveal a single person's email via Apollo's people-match enrichment.
 *
 * Costs ~1 Apollo credit per call on most plans. Returns null on any failure
 * (locked record, out of credits, network error) so the caller can simply
 * `continue` the loop instead of try/catch around every iteration.
 *
 * Never throws — caller treats null as "skip this record".
 */
export async function enrichPerson(
  apiKey: string,
  personId: string,
): Promise<ApolloPerson | null> {
  if (!apiKey || !personId) {
    return null;
  }

  try {
    const response = await axios.post<{ person?: ApolloPerson } & ApolloPerson>(
      `${APOLLO_BASE}/people/match`,
      { id: personId, reveal_personal_emails: false },
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        timeout: 30000,
      },
    );
    return (response.data?.person ?? response.data ?? null) as ApolloPerson | null;
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.message ?? 'unknown error';
    logger.warn(`Apollo enrich failed for ${personId}: ${status ?? 'N/A'} ${message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// isEmailLocked — utility predicate
// ---------------------------------------------------------------------------

/**
 * True when the email field returned by Apollo is missing, malformed, or
 * still locked (`email_not_unlocked@domain.com`). Search results are usually
 * locked; enrichment unlocks them at the cost of Apollo credits.
 */
export function isEmailLocked(email?: string): boolean {
  if (!email) return true;
  if (!email.includes('@')) return true;
  if (email.startsWith('email_not_unlocked')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// sleep — pacing helper for enrichment loops (Apollo ~30 req/min on standard)
// ---------------------------------------------------------------------------

/** Sleep helper for paced enrichment calls (Apollo rate-limits ~30/min on standard). */
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
