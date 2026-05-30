// backend/src/lib/streamClassifier.ts
// Single source of truth for stream classification.
// Used by job-leads.routes.ts (job-board imports) and apollo.ts (Apollo imports).
//
// Canonical Phase 4 streams (used for template routing in plan 04-03).
// Note: classifyStream() may also return Full-Stack | Web3 | Product/Design | QA/Testing
// from the legacy Job Leads classifier — those buckets fall through to template-fallback
// logic in the Apollo wizard.

export const STREAMS = [
  'NetSuite',
  'AI/ML',
  'Cloud/DevOps',
  'Cybersecurity',
  'Data/Analytics',
  'Mobile',
  'Enterprise/ERP',
  'Staffing/HR',
  'Other',
] as const;

export type Stream = (typeof STREAMS)[number];

/**
 * Classify a person/job into one of the canonical streams.
 * Accepts a title and a free-text "description" — callers can concat any
 * relevant signals (industry, keywords, posting body) into the second arg.
 * Returns 'Other' when no branch matches.
 *
 * Original location: backend/src/routes/job-leads.routes.ts:44-82
 * Extracted in Phase 4 plan 04-01. Body copied verbatim — regex order preserved.
 */
export function classifyStream(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  // Enterprise / ERP
  if (/netsuite|oracle netsuite|netsuite administrator|netsuite developer/.test(text)) return 'NetSuite';
  if (/\berp\b|sap\b|dynamics 365|workday|oracle erp/.test(text)) return 'Enterprise/ERP';

  // AI / ML / Data Science
  if (/\bai\b|artificial intelligence|machine learning|\bml\b|deep learning|nlp|computer vision|llm|genai|generative ai|data scien|tensorflow|pytorch|hugging face/.test(text)) return 'AI/ML';

  // Cloud & Infrastructure
  if (/\baws\b|amazon web services|\bazure\b|google cloud|\bgcp\b|cloud architect|cloud engineer|devops|sre\b|site reliability|kubernetes|\bk8s\b|terraform|docker|infrastructure/.test(text)) return 'Cloud/DevOps';

  // Cybersecurity
  if (/cybersecurity|cyber security|security analyst|soc analyst|siem|penetration test|infosec|security engineer|threat|vulnerability|devsecops|compliance/.test(text)) return 'Cybersecurity';

  // Full-Stack / Web Development
  if (/full.?stack|frontend|front.?end|backend|back.?end|\breact\b|\bangular\b|\bvue\b|next\.?js|node\.?js|\.net|django|rails|laravel|spring boot/.test(text)) return 'Full-Stack';

  // Data Engineering & Analytics
  if (/data engineer|data analyst|analytics|power bi|tableau|\bsql\b|snowflake|databricks|spark|airflow|\betl\b|data warehouse|business intelligence|\bbi\b/.test(text)) return 'Data/Analytics';

  // Mobile Development
  if (/\bios\b|android|swift|kotlin|react native|flutter|mobile developer|mobile engineer/.test(text)) return 'Mobile';

  // Blockchain / Web3
  if (/blockchain|web3|solidity|smart contract|crypto|defi|nft|ethereum|solana/.test(text)) return 'Web3';

  // Product / Design / UX
  if (/product manager|product owner|ux designer|ui designer|product design|user experience|figma/.test(text)) return 'Product/Design';

  // Staffing / HR
  if (/recruiter|talent acquisition|hr manager|human resources|staffing|people operations/.test(text)) return 'Staffing/HR';

  // QA / Testing
  if (/\bqa\b|quality assurance|test engineer|automation test|selenium|cypress|playwright/.test(text)) return 'QA/Testing';

  return 'Other';
}
