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
import { PipelineTrace, checkParams } from "../tracer";

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
 */
export async function analyzeCoverage(
  input: CoveragePipelineInput,
): Promise<CoveragePipelineResult> {
  const trace = new PipelineTrace("analyzeCoverage");

  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    required_requirements: input.jd_requirements.required.length,
    preferred_requirements: input.jd_requirements.preferred.length,
    responsibilities: input.jd_requirements.responsibilities.length,
    stages_count: input.stages.length,
    total_focus_areas: input.stages.reduce((sum, s) => sum + s.focus_areas.length, 0),
    stages_detail: input.stages.map((s) => ({
      name: s.name,
      type: s.type,
      focus_areas: s.focus_areas.length,
    })),
  });

  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "jd_requirements", "stages"],
  );
  if (input.jd_requirements.required.length === 0) warnings.push("No required requirements — coverage analysis has nothing to check against");
  if (input.stages.length === 0) warnings.push("No stages — coverage analysis has nothing to analyze");
  if (input.stages.some((s) => s.focus_areas.length === 0)) {
    warnings.push("Some stages have 0 focus areas — they can't cover any requirements");
  }
  s1.ok({}, warnings);

  const s2 = trace.step("call-claude", { endpoint: "coverageAnalysis", schema: "CoverageAnalysisSchema" });

  try {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(input);
    const result = await withRetry(() =>
      callClaude({
        endpoint: "coverageAnalysis",
        schema: CoverageAnalysisSchema,
        prompt,
        systemPrompt: COVERAGE_ANALYSIS_PROMPT.system,
      }),
    );

    const s3 = trace.step("validate-output", {
      requirements_covered: result.data.requirements_covered.length,
      gaps: result.data.gaps.length,
      redundancies: result.data.redundancies.length,
      recommendations: result.data.recommendations.length,
      overall_score: result.data.overall_coverage_score,
      has_disclaimer: !!result.data.disclaimer,
    });
    const outWarnings: string[] = [];
    if (!result.data.disclaimer) outWarnings.push("CRITICAL: Missing disclaimer");
    if (result.data.overall_coverage_score < 50) outWarnings.push(`Low coverage score: ${result.data.overall_coverage_score}%`);
    s3.ok({}, outWarnings);

    s2.ok({ model: result.model });
    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.coverageAnalysis,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}
