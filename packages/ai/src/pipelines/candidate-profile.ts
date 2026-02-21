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
 * Uses Sonnet with retry (structured analysis, no escalation needed).
 */
export async function generateCandidateProfile(
  input: CandidateProfilePipelineInput,
): Promise<CandidateProfilePipelineResult> {
  const prompt = CANDIDATE_PROFILE_PROMPT.user(input);

  const result = await withRetry(() =>
    callClaude({
      endpoint: "candidateProfile",
      schema: CandidateProfileSchema,
      prompt,
      systemPrompt: CANDIDATE_PROFILE_PROMPT.system,
    }),
  );

  return {
    data: result.data,
    metadata: {
      model_used: result.model,
      prompt_version: PROMPT_VERSIONS.candidateProfile,
      generated_at: new Date().toISOString(),
    },
  };
}
