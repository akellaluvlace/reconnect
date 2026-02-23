import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

export const MARKET_INSIGHTS_PROMPTS = {
  version: PROMPT_VERSIONS.marketInsights,

  /** Phase 1: Quick insights from model knowledge */
  quickSystem: `You are an expert recruitment market analyst specializing in the Irish and European job market.
${COMPLIANCE_SYSTEM_PROMPT}

Provide preliminary market insights based on your training data. Be honest about confidence levels — if data is uncertain, say so.`,

  quick: (input: {
    role: string;
    level: string;
    industry: string;
    location: string;
    market_focus: "irish" | "global";
  }) =>
    `Analyze the current job market for:
- Role: ${sanitizeInput(input.role)}
- Level: ${sanitizeInput(input.level)}
- Industry: ${sanitizeInput(input.industry)}
- Location: ${sanitizeInput(input.location)}
- Market focus: ${input.market_focus}

Provide salary data in EUR (or appropriate local currency), competitive landscape, time-to-hire estimates, candidate availability, required/emerging/declining skills, and market trends.

Set phase to "quick" since this is a preliminary analysis.`,

  /** Deep research: Step 1 — Generate targeted search queries */
  queryGeneration: (input: {
    role: string;
    level: string;
    industry: string;
    location: string;
    market_focus: "irish" | "global";
  }) =>
    `Generate 8-12 targeted web search queries to research the job market for:
- Role: ${sanitizeInput(input.role)}
- Level: ${sanitizeInput(input.level)}
- Industry: ${sanitizeInput(input.industry)}
- Location: ${sanitizeInput(input.location)}
- Market focus: ${input.market_focus}

Generate diverse queries covering:
1. Salary data and compensation benchmarks
2. Job demand and posting volumes
3. Key skills and requirements
4. Industry trends and outlook
5. Competitor hiring activity
6. Time-to-hire benchmarks
7. Candidate availability and talent pool
8. Remote work and market conditions

Make queries specific and actionable. Include location-specific terms.
Return a JSON object with a "queries" array of strings.`,

  /** Deep research: Step 3 — Score sources by quality */
  sourceScoringSystem: `You are an expert at evaluating recruitment data sources.
Score each source on recency, authority, and relevance.

Scoring rubric:
- Salary surveys and official reports: highest authority
- Job boards with aggregate data: high authority
- Industry publications: medium-high authority
- Company career pages: medium authority
- Blog posts and articles: medium-low authority
- Forums and social media: low authority

Recency: Within 6 months = 1.0, 6-12 months = 0.7, 1-2 years = 0.4, older = 0.1
Relevance: Exact role/level match = 1.0, similar role = 0.6, tangential = 0.3`,

  sourceScoring: (
    sources: Array<{ url: string; title: string; content: string }>,
    context: { role: string; level: string; industry: string },
  ) =>
    `Score these web sources for researching "${sanitizeInput(context.role)}" (${sanitizeInput(context.level)}) in "${sanitizeInput(context.industry)}":

${sources.map((s, i) => `Source ${i + 1}:
URL: ${s.url}
Title: ${s.title}
Preview: ${s.content.slice(0, 300)}`).join("\n\n")}

For each source, provide recency_score, authority_score, relevance_score, and overall_score (weighted average).`,

  /** Deep research: Step 4 — Extract structured data from a source */
  extractionSystem: `You are a data extraction specialist. Extract structured recruitment market data from the provided text.
Only extract data that is explicitly stated — do not infer or hallucinate numbers.
If a field is not present in the source, omit it.`,

  extraction: (
    source: { url: string; content: string },
    context: { role: string; level: string },
  ) =>
    `Extract recruitment market data from this source relevant to "${sanitizeInput(context.role)}" (${sanitizeInput(context.level)}"):

URL: ${source.url}
Content: ${source.content.slice(0, 3000)}

Extract: salary figures (with currency), companies mentioned, demand signals, skills mentioned, trends, and the date of the data.`,

  /** Deep research: Step 5 — Cross-reference synthesis */
  synthesisSystem: `You are a senior recruitment market analyst performing cross-reference synthesis.
${COMPLIANCE_SYSTEM_PROMPT}

Synthesize data from multiple sources into a coherent market analysis.
- Where multiple sources agree, report high confidence.
- Where sources disagree, flag the contradiction with source attribution.
- Never fabricate data — only report what sources support.
- Set phase to "deep" for deep research results.`,

  synthesis: (
    extractions: Array<{ url: string; data: unknown }>,
    context: {
      role: string;
      level: string;
      industry: string;
      location: string;
    },
  ) =>
    `Synthesize these data extractions into a comprehensive market analysis for "${sanitizeInput(context.role)}" (${sanitizeInput(context.level)}) in "${sanitizeInput(context.industry)}", ${sanitizeInput(context.location)}:

${extractions.map((e, i) => `Source ${i + 1} (${e.url}):
${JSON.stringify(e.data, null, 2)}`).join("\n\n")}

Provide:
- Salary range with confidence (weighted by source quality and agreement)
- Competition data (companies hiring, posting counts, saturation)
- Time-to-hire estimate
- Candidate availability assessment
- Skills analysis (required, emerging, declining)
- Market trends

Set confidence scores per field based on source agreement. Include source attribution.`,
} as const;
