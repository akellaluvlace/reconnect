import { callClaude } from "../client";
import {
  SearchQueriesSchema,
  SourceScoringSchema,
  SourceExtractionSchema,
  type SourceExtractionOutput,
  type SourceScoringOutput,
} from "../schemas";
import { MARKET_INSIGHTS_PROMPTS } from "../prompts/market-insights";
import { SEARCH_CONFIG } from "../config";
import { searchWebParallel, type SearchResult } from "../search-client";
import { withRetry } from "../retry";

export interface DeepResearchInput {
  role: string;
  level: string;
  industry: string;
  location: string;
  market_focus: "irish" | "global";
}

export interface DeepResearchResult {
  extractions: SourceExtractionOutput[];
  sources: Array<{
    url: string;
    title: string;
    relevance_score: number;
    published_date?: string;
  }>;
  source_count: number;
}

/**
 * Step 1: Generate targeted search queries using AI
 */
async function generateQueries(input: DeepResearchInput): Promise<string[]> {
  const prompt = MARKET_INSIGHTS_PROMPTS.queryGeneration(input);

  const { data } = await withRetry(() =>
    callClaude({
      endpoint: "queryGeneration",
      schema: SearchQueriesSchema,
      prompt,
      systemPrompt:
        "Generate diverse, targeted web search queries. Return JSON with a queries array.",
    }),
  );

  return data.queries.slice(0, SEARCH_CONFIG.maxQueriesPerResearch);
}

/**
 * Step 2: Execute parallel web searches
 */
async function executeSearches(queries: string[]): Promise<SearchResult[]> {
  return searchWebParallel(queries, {
    maxResults: SEARCH_CONFIG.maxResultsPerQuery,
  });
}

/**
 * Step 3: Score sources by quality, authority, and relevance
 */
async function scoreSources(
  results: SearchResult[],
  context: { role: string; level: string; industry: string },
): Promise<SourceScoringOutput> {
  const sourcesForScoring = results.map((r) => ({
    url: r.url,
    title: r.title,
    content: r.content,
  }));

  const prompt = MARKET_INSIGHTS_PROMPTS.sourceScoring(
    sourcesForScoring,
    context,
  );

  const { data } = await withRetry(() =>
    callClaude({
      endpoint: "sourceScoring",
      schema: SourceScoringSchema,
      prompt,
      systemPrompt: MARKET_INSIGHTS_PROMPTS.sourceScoringSystem,
    }),
  );

  return data;
}

/**
 * Step 4: Extract structured data from top sources in parallel
 */
async function extractFromSources(
  topSources: Array<{ url: string; content: string }>,
  context: { role: string; level: string },
): Promise<SourceExtractionOutput[]> {
  const results = await Promise.allSettled(
    topSources.map((source) =>
      withRetry(() =>
        callClaude({
          endpoint: "sourceExtraction",
          schema: SourceExtractionSchema,
          prompt: MARKET_INSIGHTS_PROMPTS.extraction(source, context),
          systemPrompt: MARKET_INSIGHTS_PROMPTS.extractionSystem,
        }),
      ),
    ),
  );

  const extractions: SourceExtractionOutput[] = [];
  let failCount = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      extractions.push(result.value.data);
    } else {
      failCount++;
      console.warn("[AI Extract] Source extraction failed:", result.reason);
    }
  }

  if (failCount > 0) {
    console.warn(
      `[AI Extract] ${failCount}/${topSources.length} extractions failed, ${extractions.length} succeeded`,
    );
  }

  return extractions;
}

/**
 * 6-step deep research pipeline:
 * 1. Generate queries → 2. Search web → 3. Score sources →
 * 4. Extract data → 5+6. Return for synthesis + validation
 *
 * Steps 5 (synthesis) and 6 (validation) happen in the market-insights pipeline
 * which adds the final AI synthesis call and schema validation.
 */
export async function runDeepResearch(
  input: DeepResearchInput,
): Promise<DeepResearchResult> {
  // Step 1: Generate queries (~2s)
  const queries = await generateQueries(input);

  // Step 2: Parallel web search (~3-5s)
  const searchResults = await executeSearches(queries);

  if (searchResults.length === 0) {
    console.warn("[AI DeepResearch] No search results found — synthesis will use model knowledge only");
    return { extractions: [], sources: [], source_count: 0 };
  }

  // Step 3: Score sources (~2s)
  const scoring = await scoreSources(searchResults, {
    role: input.role,
    level: input.level,
    industry: input.industry,
  });

  // Select top sources for extraction
  const topScored = scoring.scored_sources
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, SEARCH_CONFIG.maxSourcesForExtraction);

  // Map scored sources back to full content
  const contentMap = new Map(searchResults.map((r) => [r.url, r]));
  const topSources = topScored
    .map((s) => {
      const full = contentMap.get(s.url);
      return full ? { url: s.url, content: full.content } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // Step 4: Parallel extraction (~5-8s)
  const extractions = await extractFromSources(topSources, {
    role: input.role,
    level: input.level,
  });

  // Build sources array for output
  const sources = topScored.map((s) => {
    const full = contentMap.get(s.url);
    return {
      url: s.url,
      title: s.title,
      relevance_score: s.overall_score,
      published_date: full?.publishedDate,
    };
  });

  return {
    extractions,
    sources,
    source_count: sources.length,
  };
}
