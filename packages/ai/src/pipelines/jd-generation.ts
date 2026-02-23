import { callClaude } from "../client";
import { JobDescriptionSchema, type JobDescriptionOutput } from "../schemas";
import {
  JD_GENERATION_PROMPT,
  type JDGenerationInput,
} from "../prompts/jd-generation";
import { PROMPT_VERSIONS } from "../config";
import { withRetry, withModelEscalation } from "../retry";
import { PipelineTrace, checkParams } from "../tracer";

export interface JDPipelineInput {
  role: string;
  level: string;
  industry: string;
  company_context?: string;
  style: "formal" | "creative" | "concise";
  currency?: string;
  market_context?: JDGenerationInput["market_context"];
  strategy_context?: JDGenerationInput["strategy_context"];
}

export interface JDPipelineResult {
  data: JobDescriptionOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}

/**
 * Generate a job description with optional market context injection.
 * Uses Sonnet for speed, escalates to Opus on failure.
 */
export async function generateJobDescription(
  input: JDPipelineInput,
): Promise<JDPipelineResult> {
  const trace = new PipelineTrace("generateJobDescription");

  // --- Validate input + context chain ---
  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    industry: input.industry,
    style: input.style,
    currency: input.currency ?? "not set",
    has_market_context: !!input.market_context,
    has_strategy_context: !!input.strategy_context,
    market_context_keys: input.market_context ? Object.keys(input.market_context) : [],
    strategy_context_keys: input.strategy_context ? Object.keys(input.strategy_context) : [],
  });

  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "industry", "style"],
    ["market_context", "strategy_context", "currency"],
  );

  if (input.market_context) {
    if (!input.market_context.salary_range) warnings.push("market_context.salary_range is missing — JD won't include market-aligned salary");
    if (!input.market_context.key_skills?.length) warnings.push("market_context.key_skills is empty — JD requirements won't reflect market demand");
  }
  if (input.strategy_context) {
    if (!input.strategy_context.salary_positioning) warnings.push("strategy_context.salary_positioning is missing — JD salary won't align with strategy");
    if (!input.strategy_context.skills_priority) warnings.push("strategy_context.skills_priority is missing — JD requirements won't prioritize strategic skills");
  }

  s1.ok({ warnings_count: warnings.length }, warnings);

  // --- Call Claude ---
  const s2 = trace.step("call-claude", {
    endpoint: "jdGeneration",
    fallback: "marketInsights",
    schema: "JobDescriptionSchema",
  });

  try {
    const prompt = JD_GENERATION_PROMPT.user(input);
    const result = await withModelEscalation(
      (endpoint) =>
        withRetry(() =>
          callClaude({
            endpoint,
            schema: JobDescriptionSchema,
            prompt,
            systemPrompt: JD_GENERATION_PROMPT.system,
          }),
        ),
      "jdGeneration",
      "marketInsights",
    );

    // --- Validate output ---
    const s3 = trace.step("validate-output", {
      title: result.data.title,
      responsibilities_count: result.data.responsibilities.length,
      required_requirements: result.data.requirements.required.length,
      preferred_requirements: result.data.requirements.preferred.length,
      benefits_count: result.data.benefits.length,
      has_salary: !!result.data.salary_range,
      has_location: !!result.data.location,
      has_remote_policy: !!result.data.remote_policy,
      confidence: result.data.confidence,
    });

    const outWarnings: string[] = [];
    if (result.data.responsibilities.length === 0) outWarnings.push("No responsibilities generated");
    if (result.data.requirements.required.length === 0) outWarnings.push("No required requirements generated");
    if (result.data.confidence < 0.5) outWarnings.push(`Low confidence: ${result.data.confidence}`);
    if (input.market_context?.salary_range && !result.data.salary_range) {
      outWarnings.push("Market context had salary data but JD has no salary_range — context may have been ignored");
    }
    s3.ok({}, outWarnings);

    s2.ok({ model: result.model });
    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.jdGeneration,
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
 * Build context slice for downstream stage generation.
 */
export function buildJDContextForStages(jd: JobDescriptionOutput) {
  return {
    responsibilities: jd.responsibilities?.slice(0, 5),
    requirements: jd.requirements?.required?.slice(0, 5),
    seniority_signals: jd.seniority_signals?.slice(0, 5),
  };
}
