import { tavily } from "@tavily/core";
import { SEARCH_CONFIG } from "./config";
import { AISearchError } from "./errors";

let _client: ReturnType<typeof tavily> | null = null;

function getSearchClient() {
  if (!_client) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new AISearchError("TAVILY_API_KEY is not set");
    }
    _client = tavily({ apiKey });
  }
  return _client;
}

export interface SearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  publishedDate?: string;
}

/**
 * Search the web via Tavily for clean, AI-ready text results.
 */
export async function searchWeb(
  query: string,
  options?: { maxResults?: number },
): Promise<SearchResult[]> {
  const client = getSearchClient();
  const maxResults =
    options?.maxResults ?? SEARCH_CONFIG.tavily.maxResults;

  try {
    const response = await client.search(query, {
      searchDepth: SEARCH_CONFIG.tavily.searchDepth,
      maxResults,
      includeAnswer: SEARCH_CONFIG.tavily.includeAnswer,
      includeRawContent: SEARCH_CONFIG.tavily.includeRawContent,
    });

    return (response.results ?? []).map((r) => ({
      url: r.url,
      title: r.title,
      content: r.content,
      score: r.score,
      publishedDate: r.publishedDate ?? undefined,
    }));
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Unknown search error";
    throw new AISearchError(`Tavily search failed: ${msg}`);
  }
}

/**
 * Run multiple search queries in parallel, dedup by URL.
 */
export async function searchWebParallel(
  queries: string[],
  options?: { maxResults?: number },
): Promise<SearchResult[]> {
  const results = await Promise.allSettled(
    queries.map((q) => searchWeb(q, options)),
  );

  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allResults.push(item);
        }
      }
    }
    // Silently skip failed queries — partial results are acceptable
  }

  return allResults;
}
