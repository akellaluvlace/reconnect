import { callClaude } from "../client";
import { JobDescriptionSchema, type JobDescriptionOutput } from "../schemas";
import {
  JD_GENERATION_PROMPT,
  type JDGenerationInput,
} from "../prompts/jd-generation";
import { PROMPT_VERSIONS } from "../config";
import { withRetry, withModelEscalation } from "../retry";

export interface JDPipelineInput {
  role: string;
  level: string;
  industry: string;
  company_context?: string;
  style: "formal" | "creative" | "concise";
  currency?: string;
  market_context?: JDGenerationInput["market_context"];
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
    "marketInsights", // Escalate to Opus on failure
  );

  return {
    data: result.data,
    metadata: {
      model_used: result.model,
      prompt_version: PROMPT_VERSIONS.jdGeneration,
      generated_at: new Date().toISOString(),
    },
  };
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
