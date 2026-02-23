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
import { PipelineTrace } from "../tracer";

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

/** Max sources to send for AI scoring — caps output token usage */
const MAX_SOURCES_FOR_SCORING = 30;

/**
 * 6-step deep research pipeline:
 * 1. Generate queries → 2. Search web → 3. Score sources →
 * 4. Extract data → 5+6. Return for synthesis + validation
 */
export async function runDeepResearch(
  input: DeepResearchInput,
): Promise<DeepResearchResult> {
  const trace = new PipelineTrace("deepResearch");

  // --- Step 1: Generate search queries ---
  const s1 = trace.step("generate-queries", {
    role: input.role,
    level: input.level,
    industry: input.industry,
    location: input.location,
    market_focus: input.market_focus,
    max_queries: SEARCH_CONFIG.maxQueriesPerResearch,
  });

  let queries: string[];
  try {
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
    queries = data.queries.slice(0, SEARCH_CONFIG.maxQueriesPerResearch);
    s1.ok({ queries_generated: queries.length, queries });
  } catch (err) {
    s1.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }

  // --- Step 2: Execute parallel web searches ---
  const s2 = trace.step("web-search", {
    queries_count: queries.length,
    max_results_per_query: SEARCH_CONFIG.maxResultsPerQuery,
  });

  let searchResults: SearchResult[];
  try {
    searchResults = await searchWebParallel(queries, {
      maxResults: SEARCH_CONFIG.maxResultsPerQuery,
    });
    s2.ok({
      total_results: searchResults.length,
      unique_domains: new Set(searchResults.map((r) => new URL(r.url).hostname)).size,
    });
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }

  if (searchResults.length === 0) {
    const sEmpty = trace.step("empty-results", {});
    sEmpty.ok({}, ["No search results found — synthesis will use model knowledge only"]);
    trace.finish();
    return { extractions: [], sources: [], source_count: 0 };
  }

  // --- Step 3: Score sources ---
  const sorted = [...searchResults].sort((a, b) => b.score - a.score);
  const filtered = sorted.slice(0, MAX_SOURCES_FOR_SCORING);

  const s3 = trace.step("score-sources", {
    sources_to_score: filtered.length,
    pre_filter_total: searchResults.length,
    top_tavily_score: filtered[0]?.score ?? 0,
    bottom_tavily_score: filtered[filtered.length - 1]?.score ?? 0,
  });

  let scoring: SourceScoringOutput;
  try {
    const sourcesForScoring = filtered.map((r) => ({
      url: r.url,
      title: r.title,
      content: r.content,
    }));
    const prompt = MARKET_INSIGHTS_PROMPTS.sourceScoring(
      sourcesForScoring,
      { role: input.role, level: input.level, industry: input.industry },
    );
    const { data } = await withRetry(() =>
      callClaude({
        endpoint: "sourceScoring",
        schema: SourceScoringSchema,
        prompt,
        systemPrompt: MARKET_INSIGHTS_PROMPTS.sourceScoringSystem,
      }),
    );
    scoring = data;
    s3.ok({
      scored_count: scoring.scored_sources.length,
      avg_score: scoring.scored_sources.length > 0
        ? (scoring.scored_sources.reduce((s, x) => s + x.overall_score, 0) / scoring.scored_sources.length).toFixed(2)
        : 0,
    });
  } catch (err) {
    s3.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }

  // --- Select top sources for extraction ---
  const topScored = scoring.scored_sources
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, SEARCH_CONFIG.maxSourcesForExtraction);

  const contentMap = new Map(searchResults.map((r) => [r.url, r]));
  const topSources = topScored
    .map((s) => {
      const full = contentMap.get(s.url);
      return full ? { url: s.url, content: full.content } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // --- Step 4: Parallel extraction ---
  const s4 = trace.step("extract-data", {
    sources_to_extract: topSources.length,
    top_score: topScored[0]?.overall_score ?? 0,
    urls: topSources.map((s) => s.url),
  });

  try {
    const results = await Promise.allSettled(
      topSources.map((source) =>
        withRetry(() =>
          callClaude({
            endpoint: "sourceExtraction",
            schema: SourceExtractionSchema,
            prompt: MARKET_INSIGHTS_PROMPTS.extraction(source, {
              role: input.role,
              level: input.level,
            }),
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
      }
    }

    const extractWarnings: string[] = [];
    if (failCount > 0) {
      extractWarnings.push(`${failCount}/${topSources.length} extractions failed`);
    }
    if (extractions.length === 0) {
      extractWarnings.push("ALL extractions failed — synthesis will use model knowledge only");
    }

    s4.ok(
      {
        succeeded: extractions.length,
        failed: failCount,
        salary_data_found: extractions.filter((e) => e.salary_data?.length).length,
        companies_found: extractions.filter((e) => e.companies_mentioned?.length).length,
        skills_found: extractions.filter((e) => e.skills_mentioned?.length).length,
      },
      extractWarnings,
    );

    // Build sources array
    const sources = topScored.map((s) => {
      const full = contentMap.get(s.url);
      return {
        url: s.url,
        title: s.title,
        relevance_score: s.overall_score,
        published_date: full?.publishedDate,
      };
    });

    trace.finish();

    return {
      extractions,
      sources,
      source_count: sources.length,
    };
  } catch (err) {
    s4.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}
