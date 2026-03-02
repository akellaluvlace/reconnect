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

/** Job board domains used for verified posting count */
const JOB_BOARD_DOMAINS = [
  "indeed.ie",
  "indeed.com",
  "linkedin.com",
  "glassdoor.ie",
  "glassdoor.com",
  "irishjobs.ie",
  "jobs.ie",
  "irishtechnews.ie",
];

/** Industry keyword map for relevance scoring */
export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  technology: ["technology", "software", "tech", "it", "digital", "saas", "cloud", "data", "cyber", "ai"],
  finance: ["finance", "banking", "financial", "insurance", "fintech", "investment", "wealth", "capital", "fund"],
  healthcare: ["healthcare", "medical", "pharma", "pharmaceutical", "hospital", "clinical", "biotech", "health"],
  retail: ["retail", "ecommerce", "e-commerce", "store", "consumer", "fmcg", "merchandise", "wholesale"],
  manufacturing: ["manufacturing", "production", "factory", "industrial", "plant", "engineering", "assembly", "supply chain"],
  "professional services": ["consulting", "advisory", "professional services", "legal", "accounting", "audit", "law"],
};

/**
 * Score how relevant a search result is to a given industry.
 * Returns 0-1 based on keyword matches in title + snippet.
 */
export function scoreIndustryRelevance(
  title: string,
  snippet: string,
  industry: string,
): number {
  const combined = `${title} ${snippet}`.toLowerCase();

  // Look up keywords from map, or extract words from custom industry
  const keywords = INDUSTRY_KEYWORDS[industry.toLowerCase()]
    ?? industry.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 2);

  if (keywords.length === 0) return 0.5; // neutral if no keywords

  let matches = 0;
  for (const kw of keywords) {
    if (combined.includes(kw)) matches++;
  }

  return Math.min(matches / Math.max(keywords.length * 0.3, 1), 1);
}

/**
 * Count verified job postings by searching actual job boards.
 * Returns the deduplicated count + which domains had results.
 * One Tavily call with includeDomains — no AI involved.
 */
export async function countJobPostings(
  role: string,
  location: string,
): Promise<{ count: number; domains: string[]; failed: boolean }> {
  const client = getSearchClient();

  try {
    const response = await client.search(`${role} jobs ${location}`, {
      searchDepth: "basic",
      maxResults: 20,
      includeAnswer: false,
      includeRawContent: false,
      includeDomains: JOB_BOARD_DOMAINS,
    });

    const results = response.results ?? [];
    const domains = new Set<string>();
    for (const r of results) {
      try {
        domains.add(new URL(r.url).hostname.replace(/^www\./, ""));
      } catch {
        // skip malformed URLs
      }
    }

    return { count: results.length, domains: [...domains], failed: false };
  } catch (error) {
    console.warn(
      "[AI Search] Job posting count failed:",
      error instanceof Error ? error.message : error,
    );
    return { count: 0, domains: [], failed: true };
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
  let failCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allResults.push(item);
        }
      }
    } else {
      failCount++;
      console.warn("[AI Search] Query failed:", result.reason);
    }
  }

  if (failCount > 0) {
    console.warn(
      `[AI Search] ${failCount}/${queries.length} queries failed, ${allResults.length} unique results from successful queries`,
    );
  }

  if (failCount === queries.length) {
    throw new AISearchError(
      `All ${queries.length} search queries failed — check TAVILY_API_KEY and network connectivity`,
    );
  }

  return allResults;
}
