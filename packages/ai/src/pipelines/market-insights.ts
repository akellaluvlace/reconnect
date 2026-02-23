import { createHash } from "crypto";
import { callClaude } from "../client";
import {
  QuickMarketInsightsSchema,
  MarketInsightsSynthesisSchema,
  type MarketInsightsOutput,
  type QuickMarketInsightsOutput,
} from "../schemas";
import { MARKET_INSIGHTS_PROMPTS } from "../prompts/market-insights";
import { PROMPT_VERSIONS } from "../config";
import { withRetry } from "../retry";
import {
  runDeepResearch,
  type DeepResearchInput,
  type DeepResearchResult,
} from "./deep-research";
import { PipelineTrace, checkParams } from "../tracer";

export interface MarketInsightsInput {
  role: string;
  level: string;
  industry: string;
  location: string;
  market_focus?: "irish" | "global";
}

/**
 * Phase 1: Quick insights from model knowledge (~3-5s).
 */
export async function generateQuickInsights(
  input: MarketInsightsInput,
): Promise<QuickMarketInsightsOutput> {
  const trace = new PipelineTrace("quickInsights");
  const marketFocus = input.market_focus ?? "irish";

  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    industry: input.industry,
    location: input.location,
    market_focus: marketFocus,
  });
  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "industry", "location"],
  );
  s1.ok({}, warnings);

  const s2 = trace.step("call-claude", {
    endpoint: "marketInsightsQuick",
    schema: "QuickMarketInsightsSchema",
    phase: "quick",
  });

  try {
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

    const s3 = trace.step("validate-output", {
      salary_range: `${data.salary.min}-${data.salary.max} ${data.salary.currency}`,
      salary_confidence: data.salary.confidence,
      availability: data.candidate_availability.level,
      saturation: data.competition.market_saturation,
      required_skills: data.key_skills.required.length,
      trends: data.trends.length,
      time_to_hire_days: data.time_to_hire.average_days,
    });
    const outWarnings: string[] = [];
    if (data.salary.confidence < 0.4) outWarnings.push(`Very low salary confidence: ${data.salary.confidence}`);
    if (data.salary.min >= data.salary.max) outWarnings.push(`Salary min (${data.salary.min}) >= max (${data.salary.max})`);
    s3.ok({}, outWarnings);

    s2.ok({});
    trace.finish();
    return data;
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}

/**
 * Phase 2: Deep research with web search + cross-reference synthesis (~15-25s).
 */
export async function generateDeepInsights(
  input: MarketInsightsInput,
): Promise<MarketInsightsOutput> {
  const trace = new PipelineTrace("deepInsights");
  const marketFocus = input.market_focus ?? "irish";

  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    industry: input.industry,
    location: input.location,
    market_focus: marketFocus,
  });
  s1.ok({});

  // --- Deep research (steps 1-4) ---
  const s2 = trace.step("deep-research", { sub_pipeline: "deepResearch" });
  let research: DeepResearchResult;
  try {
    const researchInput: DeepResearchInput = {
      ...input,
      market_focus: marketFocus,
    };
    research = await runDeepResearch(researchInput);
    s2.ok({
      extractions: research.extractions.length,
      sources: research.sources.length,
      source_count: research.source_count,
    });
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }

  // --- Step 5: Cross-reference synthesis ---
  const s3 = trace.step("synthesis", {
    endpoint: "marketInsights",
    schema: "MarketInsightsSynthesisSchema",
    extractions_count: research.extractions.length,
  });

  try {
    const synthesisResult = await withRetry(() =>
      callClaude({
        endpoint: "marketInsights",
        schema: MarketInsightsSynthesisSchema,
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
    );

    // --- Step 6: Assemble final output ---
    const result: MarketInsightsOutput = {
      ...synthesisResult.data,
      phase: "deep",
      sources: research.sources,
      metadata: {
        model_used: synthesisResult.model,
        prompt_version: PROMPT_VERSIONS.marketInsights,
        generated_at: new Date().toISOString(),
        source_count: research.source_count,
        confidence: synthesisResult.data.salary.confidence,
      },
    };

    const s4 = trace.step("assemble-output", {
      phase: result.phase,
      salary_range: `${result.salary.min}-${result.salary.max} ${result.salary.currency}`,
      salary_confidence: result.salary.confidence,
      source_count: result.metadata.source_count,
      model_used: result.metadata.model_used,
      availability: result.candidate_availability.level,
      trends: result.trends.length,
    });
    const outWarnings: string[] = [];
    if (research.extractions.length === 0) outWarnings.push("No extractions — synthesis based on model knowledge only despite deep research");
    if (result.salary.confidence < 0.5) outWarnings.push(`Low salary confidence even after deep research: ${result.salary.confidence}`);
    s4.ok({}, outWarnings);

    s3.ok({ model: synthesisResult.model });
    trace.finish();
    return result;
  } catch (err) {
    s3.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}

/**
 * Generate a cache key for market insights lookup.
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
