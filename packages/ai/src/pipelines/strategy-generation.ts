import { callClaude } from "../client";
import {
  HiringStrategySchema,
  ProcessSpeedAdjustmentSchema,
  type HiringStrategyOutput,
} from "../schemas/hiring-strategy";
import {
  STRATEGY_GENERATION_PROMPT,
  type StrategyGenerationInput,
} from "../prompts/strategy-generation";
import { PROMPT_VERSIONS } from "../config";
import { sanitizeInput } from "../sanitize";
import { withRetry } from "../retry";
import { PipelineTrace, checkParams } from "../tracer";

export interface StrategyPipelineInput {
  role: string;
  level: string;
  industry: string;
  market_insights: StrategyGenerationInput["market_insights"];
  max_stages_override?: number;
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
    const prompt = STRATEGY_GENERATION_PROMPT.user(input, input.max_stages_override);
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
 * Adjust process speed when user changes stage count.
 * Produces trade-off analysis comparing user's choice against AI's original recommendation.
 * Full market context in, only process_speed out (~5-10s).
 */
export async function adjustProcessSpeed(
  strategy: HiringStrategyOutput,
  newStages: number,
  aiRecommendedStages: number,
  context: {
    role: string;
    level: string;
    industry: string;
    market_insights: StrategyGenerationInput["market_insights"];
  },
): Promise<HiringStrategyOutput> {
  const trace = new PipelineTrace("adjustProcessSpeed");
  const mi = context.market_insights;
  const delta = newStages - aiRecommendedStages;
  const direction = delta > 0 ? "more" : "fewer";

  const s1 = trace.step("call-claude", {
    ai_recommended: aiRecommendedStages,
    new_stages: newStages,
    delta,
    role: context.role,
    availability: mi.candidate_availability.level,
    market: strategy.market_classification,
  });

  try {
    const result = await withRetry(() =>
      callClaude({
        endpoint: "strategyGeneration",
        schema: ProcessSpeedAdjustmentSchema,
        prompt: `You are advising on a hiring process adjustment. You originally recommended ${aiRecommendedStages} interview stages for this role. The user wants ${newStages} instead (${Math.abs(delta)} ${direction}).

ROLE: ${sanitizeInput(context.role)}
LEVEL: ${sanitizeInput(context.level)}
INDUSTRY: ${sanitizeInput(context.industry)}
MARKET: ${strategy.market_classification}

MARKET DATA:
- Salary: ${mi.salary.currency} ${mi.salary.min.toLocaleString()}–${mi.salary.max.toLocaleString()} (confidence: ${mi.salary.confidence})
- Competition: ${mi.competition.job_postings_count != null ? `~${mi.competition.job_postings_count} active postings, ` : ""}saturation: ${mi.competition.market_saturation}
- Companies hiring: ${mi.competition.companies_hiring.slice(0, 6).join(", ")}
- Time to hire: avg ${mi.time_to_hire.average_days} days (range: ${mi.time_to_hire.range.min}–${mi.time_to_hire.range.max})
- Candidate availability: ${mi.candidate_availability.level} — ${sanitizeInput(mi.candidate_availability.description.slice(0, 200))}
- Key skills to assess: ${mi.key_skills.required.slice(0, 6).join(", ")}

Your rationale should be 2-3 sentences summarizing the trade-off of ${newStages} vs the recommended ${aiRecommendedStages}.

Also return a "trade_off" object with:
- "gains": 1-3 SHORT bullet points (max 15 words each) — ${delta > 0 ? "what the extra stage(s) add (deeper evaluation, stakeholder input, etc.)" : "what fewer stages gain (speed, less drop-off, etc.)"}
- "risks": 1-3 SHORT bullet points (max 15 words each) — ${delta > 0 ? "what it costs (longer timeline, candidate drop-off risk, etc.)" : "what you lose (less depth on certain skills, combined stages, etc.)"}
- "suggestion": one specific, actionable sentence — ${delta > 0 ? `what to use stage ${newStages} for specifically` : `how to restructure the remaining ${newStages} stages to cover gaps`}

Be concrete — reference actual skills (${mi.key_skills.required.slice(0, 3).join(", ")}), market conditions, and realistic day estimates.

Set max_stages to ${newStages}. Adjust target_days realistically.`,
        systemPrompt: "You are a senior recruitment strategist. Be specific and practical — reference the actual market data, not generic advice. Short punchy bullets, not essays.",
      }),
    );

    s1.ok({ model: result.model, new_stages: newStages, delta });
    trace.finish();

    return {
      ...strategy,
      process_speed: result.data,
    };
  } catch (err) {
    s1.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
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
