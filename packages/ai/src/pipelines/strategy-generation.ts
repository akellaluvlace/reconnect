import { callClaude } from "../client";
import {
  HiringStrategySchema,
  type HiringStrategyOutput,
} from "../schemas/hiring-strategy";
import {
  STRATEGY_GENERATION_PROMPT,
  type StrategyGenerationInput,
} from "../prompts/strategy-generation";
import { PROMPT_VERSIONS } from "../config";
import { withRetry } from "../retry";
import { PipelineTrace, checkParams } from "../tracer";

export interface StrategyPipelineInput {
  role: string;
  level: string;
  industry: string;
  market_insights: StrategyGenerationInput["market_insights"];
}

export interface StrategyPipelineResult {
  data: HiringStrategyOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}

/**
 * Generate a hiring strategy based on market insights.
 * Uses Sonnet with retry (structured analysis, no escalation needed).
 */
export async function generateHiringStrategy(
  input: StrategyPipelineInput,
): Promise<StrategyPipelineResult> {
  const trace = new PipelineTrace("generateHiringStrategy");

  const mi = input.market_insights;
  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    industry: input.industry,
    salary_range: `${mi.salary.min}-${mi.salary.max} ${mi.salary.currency}`,
    salary_confidence: mi.salary.confidence,
    market_saturation: mi.competition.market_saturation,
    companies_hiring_count: mi.competition.companies_hiring.length,
    postings_count: mi.competition.job_postings_count ?? "n/a",
    availability_level: mi.candidate_availability.level,
    required_skills_count: mi.key_skills.required.length,
    emerging_skills_count: mi.key_skills.emerging.length,
    trends_count: mi.trends.length,
  });

  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "industry", "market_insights"],
  );

  if (mi.salary.confidence < 0.5) warnings.push(`Low salary confidence (${mi.salary.confidence}) — strategy salary positioning may be unreliable`);
  if (mi.key_skills.required.length === 0) warnings.push("No required skills in market data — skills_priority will be based on model knowledge only");
  if (mi.competition.companies_hiring.length === 0) warnings.push("No companies_hiring data — competitive analysis will be limited");

  s1.ok({}, warnings);

  const s2 = trace.step("call-claude", {
    endpoint: "strategyGeneration",
    schema: "HiringStrategySchema",
    schema_enums: {
      market_classification: ["employer_market", "balanced", "candidate_market"],
      salary_strategy: ["lead", "match", "lag"],
      speed_recommendation: ["fast_track", "standard", "thorough"],
    },
  });

  try {
    const prompt = STRATEGY_GENERATION_PROMPT.user(input);
    const result = await withRetry(() =>
      callClaude({
        endpoint: "strategyGeneration",
        schema: HiringStrategySchema,
        prompt,
        systemPrompt: STRATEGY_GENERATION_PROMPT.system,
      }),
    );

    const s3 = trace.step("validate-output", {
      market_classification: result.data.market_classification,
      salary_strategy: result.data.salary_positioning.strategy,
      salary_range: `${result.data.salary_positioning.recommended_range.min}-${result.data.salary_positioning.recommended_range.max}`,
      speed: result.data.process_speed.recommendation,
      max_stages: result.data.process_speed.max_stages,
      target_days: result.data.process_speed.target_days,
      differentiators_count: result.data.competitive_differentiators.length,
      must_have_skills: result.data.skills_priority.must_have.length,
      risks_count: result.data.key_risks.length,
      recommendations_count: result.data.recommendations.length,
      has_disclaimer: !!result.data.disclaimer,
    });

    const outWarnings: string[] = [];
    if (!result.data.disclaimer) outWarnings.push("CRITICAL: Missing disclaimer — EU AI Act compliance");
    if (result.data.process_speed.max_stages > 6) outWarnings.push(`max_stages=${result.data.process_speed.max_stages} — unusually high, may overburden candidates`);
    if (result.data.salary_positioning.recommended_range.min > result.data.salary_positioning.recommended_range.max) {
      outWarnings.push("Salary min > max — data integrity issue");
    }
    s3.ok({}, outWarnings);

    s2.ok({ model: result.model });
    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.strategyGeneration,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}

/**
 * Build context slice for downstream JD generation.
 */
export function buildStrategyContextForJD(strategy: HiringStrategyOutput) {
  return {
    salary_positioning: {
      strategy: strategy.salary_positioning.strategy,
      recommended_range: strategy.salary_positioning.recommended_range,
    },
    competitive_differentiators: strategy.competitive_differentiators.slice(0, 3),
    skills_priority: {
      must_have: strategy.skills_priority.must_have.slice(0, 5),
      nice_to_have: strategy.skills_priority.nice_to_have.slice(0, 3),
    },
  };
}

/**
 * Build context slice for downstream stage generation.
 */
export function buildStrategyContextForStages(strategy: HiringStrategyOutput) {
  return {
    market_classification: strategy.market_classification,
    process_speed: {
      recommendation: strategy.process_speed.recommendation,
      max_stages: strategy.process_speed.max_stages,
      target_days: strategy.process_speed.target_days,
    },
    skills_priority: {
      must_have: strategy.skills_priority.must_have.slice(0, 5),
      nice_to_have: strategy.skills_priority.nice_to_have.slice(0, 5),
    },
    competitive_differentiators: strategy.competitive_differentiators.slice(0, 3),
  };
}
