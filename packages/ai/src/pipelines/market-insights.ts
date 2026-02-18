import { createHash } from "crypto";
import { callClaude } from "../client";
import {
  QuickMarketInsightsSchema,
  MarketInsightsSchema,
  type MarketInsightsOutput,
  type QuickMarketInsightsOutput,
} from "../schemas";
import { MARKET_INSIGHTS_PROMPTS } from "../prompts/market-insights";
import { PROMPT_VERSIONS } from "../config";
import { withRetry, withModelEscalation } from "../retry";
import {
  runDeepResearch,
  type DeepResearchInput,
  type DeepResearchResult,
} from "./deep-research";

export interface MarketInsightsInput {
  role: string;
  level: string;
  industry: string;
  location: string;
  market_focus?: "irish" | "global";
}

/**
 * Phase 1: Quick insights from model knowledge (~3-5s).
 * Returns immediately for display while deep research runs.
 */
export async function generateQuickInsights(
  input: MarketInsightsInput,
): Promise<QuickMarketInsightsOutput> {
  const marketFocus = input.market_focus ?? "irish";

  const { data } = await withRetry(() =>
    callClaude({
      endpoint: "marketInsightsQuick",
      schema: QuickMarketInsightsSchema,
      prompt: MARKET_INSIGHTS_PROMPTS.quick({
        ...input,
        market_focus: marketFocus,
      }),
      systemPrompt: MARKET_INSIGHTS_PROMPTS.quickSystem,
    }),
  );

  return data;
}

/**
 * Phase 2: Deep research with web search + cross-reference synthesis (~15-25s).
 * Runs in background after Phase 1 returns.
 */
export async function generateDeepInsights(
  input: MarketInsightsInput,
): Promise<MarketInsightsOutput> {
  const marketFocus = input.market_focus ?? "irish";
  const researchInput: DeepResearchInput = {
    ...input,
    market_focus: marketFocus,
  };

  // Run 6-step deep research pipeline
  const research = await runDeepResearch(researchInput);

  // Step 5: Cross-reference synthesis (Opus)
  const synthesisResult = await withModelEscalation(
    (endpoint) =>
      callClaude({
        endpoint,
        schema: MarketInsightsSchema,
        prompt: MARKET_INSIGHTS_PROMPTS.synthesis(
          research.extractions.map((e) => ({
            url: e.url,
            data: e,
          })),
          {
            role: input.role,
            level: input.level,
            industry: input.industry,
            location: input.location,
          },
        ),
        systemPrompt: MARKET_INSIGHTS_PROMPTS.synthesisSystem,
      }),
    "marketInsights",
    "marketInsights", // Opus for synthesis — no escalation needed
  );

  // Step 6: Validation — schema already validated by callClaude
  // Add sources and metadata from research
  const result: MarketInsightsOutput = {
    ...synthesisResult.data,
    phase: "deep",
    sources: research.sources,
    metadata: {
      model_used: synthesisResult.model,
      prompt_version: PROMPT_VERSIONS.marketInsights,
      generated_at: new Date().toISOString(),
      source_count: research.source_count,
      confidence: synthesisResult.data.metadata?.confidence ?? 0.5,
    },
  };

  return result;
}

/**
 * Generate a cache key for market insights lookup.
 * SHA-256 of normalized search params.
 */
export function generateCacheKey(input: MarketInsightsInput): string {
  const normalized = JSON.stringify({
    role: input.role.toLowerCase().trim(),
    level: input.level.toLowerCase().trim(),
    industry: input.industry.toLowerCase().trim(),
    location: input.location.toLowerCase().trim(),
    market_focus: input.market_focus ?? "irish",
  });

  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Build context slice for downstream JD generation.
 * Small object (~500 tokens) with just the data JD pipeline needs.
 */
export function buildMarketContextForJD(insights: MarketInsightsOutput) {
  return {
    salary_range: insights.salary
      ? {
          min: insights.salary.min,
          max: insights.salary.max,
          currency: insights.salary.currency,
        }
      : undefined,
    key_skills: insights.key_skills?.required?.slice(0, 10),
    demand_level: insights.candidate_availability?.level,
    competitors: insights.competition?.companies_hiring?.slice(0, 5),
  };
}
