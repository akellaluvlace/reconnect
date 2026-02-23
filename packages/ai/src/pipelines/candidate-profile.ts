import { callClaude } from "../client";
import {
  CandidateProfileSchema,
  type CandidateProfileOutput,
} from "../schemas/candidate-profile";
import {
  CANDIDATE_PROFILE_PROMPT,
  type CandidateProfileInput,
} from "../prompts/candidate-profile";
import { PROMPT_VERSIONS } from "../config";
import { withRetry } from "../retry";
import { PipelineTrace, checkParams } from "../tracer";

export interface CandidateProfilePipelineInput {
  role: string;
  level: string;
  industry: string;
  jd_requirements?: CandidateProfileInput["jd_requirements"];
  strategy_skills_priority?: CandidateProfileInput["strategy_skills_priority"];
  market_key_skills?: CandidateProfileInput["market_key_skills"];
}

export interface CandidateProfilePipelineResult {
  data: CandidateProfileOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}

/**
 * Generate a candidate profile based on role, JD, strategy, and market data.
 */
export async function generateCandidateProfile(
  input: CandidateProfilePipelineInput,
): Promise<CandidateProfilePipelineResult> {
  const trace = new PipelineTrace("generateCandidateProfile");

  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    industry: input.industry,
    has_jd_requirements: !!input.jd_requirements,
    jd_required_count: input.jd_requirements?.required?.length ?? 0,
    jd_preferred_count: input.jd_requirements?.preferred?.length ?? 0,
    has_strategy_skills: !!input.strategy_skills_priority,
    strategy_must_have: input.strategy_skills_priority?.must_have?.length ?? 0,
    has_market_skills: !!input.market_key_skills,
    market_required: input.market_key_skills?.required?.length ?? 0,
    market_emerging: input.market_key_skills?.emerging?.length ?? 0,
  });

  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "industry"],
    ["jd_requirements", "strategy_skills_priority", "market_key_skills"],
  );
  if (!input.jd_requirements && !input.strategy_skills_priority && !input.market_key_skills) {
    warnings.push("No context data provided (jd, strategy, market) — profile will be based on model knowledge only");
  }
  s1.ok({}, warnings);

  const s2 = trace.step("call-claude", { endpoint: "candidateProfile", schema: "CandidateProfileSchema" });

  try {
    const prompt = CANDIDATE_PROFILE_PROMPT.user(input);
    const result = await withRetry(() =>
      callClaude({
        endpoint: "candidateProfile",
        schema: CandidateProfileSchema,
        prompt,
        systemPrompt: CANDIDATE_PROFILE_PROMPT.system,
      }),
    );

    const s3 = trace.step("validate-output", {
      has_ideal_background: !!result.data.ideal_background,
      must_have_skills: result.data.must_have_skills?.length ?? 0,
      nice_to_have_skills: result.data.nice_to_have_skills?.length ?? 0,
      has_experience_range: !!result.data.experience_range,
      cultural_fit_indicators: result.data.cultural_fit_indicators?.length ?? 0,
      has_disclaimer: !!result.data.disclaimer,
    });
    const outWarnings: string[] = [];
    if (!result.data.disclaimer) outWarnings.push("CRITICAL: Missing disclaimer");
    s3.ok({}, outWarnings);

    s2.ok({ model: result.model });
    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.candidateProfile,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}
