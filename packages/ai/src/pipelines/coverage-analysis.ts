import { callClaude } from "../client";
import {
  CoverageAnalysisSchema,
  type CoverageAnalysisOutput,
} from "../schemas/coverage-analysis";
import {
  COVERAGE_ANALYSIS_PROMPT,
  type CoverageAnalysisInput,
} from "../prompts/coverage-analysis";
import { PROMPT_VERSIONS } from "../config";
import { withRetry } from "../retry";

export interface CoveragePipelineInput {
  role: string;
  level: string;
  jd_requirements: {
    required: string[];
    preferred: string[];
    responsibilities: string[];
  };
  stages: Array<{
    name: string;
    type: string;
    focus_areas: Array<{ name: string; description: string }>;
  }>;
}

export interface CoveragePipelineResult {
  data: CoverageAnalysisOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}

/**
 * Analyze coverage of interview stages against JD requirements.
 * Lightweight Sonnet analysis with retry.
 */
export async function analyzeCoverage(
  input: CoveragePipelineInput,
): Promise<CoveragePipelineResult> {
  const prompt = COVERAGE_ANALYSIS_PROMPT.user(input);

  const result = await withRetry(() =>
    callClaude({
      endpoint: "coverageAnalysis",
      schema: CoverageAnalysisSchema,
      prompt,
      systemPrompt: COVERAGE_ANALYSIS_PROMPT.system,
    }),
  );

  return {
    data: result.data,
    metadata: {
      model_used: result.model,
      prompt_version: PROMPT_VERSIONS.coverageAnalysis,
      generated_at: new Date().toISOString(),
    },
  };
}
