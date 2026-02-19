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
  const prompt = STRATEGY_GENERATION_PROMPT.user(input);

  const result = await withRetry(() =>
    callClaude({
      endpoint: "strategyGeneration",
      schema: HiringStrategySchema,
      prompt,
      systemPrompt: STRATEGY_GENERATION_PROMPT.system,
    }),
  );

  return {
    data: result.data,
    metadata: {
      model_used: result.model,
      prompt_version: PROMPT_VERSIONS.strategyGeneration,
      generated_at: new Date().toISOString(),
    },
  };
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
