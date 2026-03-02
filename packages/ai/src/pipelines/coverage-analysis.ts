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
import { computeCoverageScore, deduplicateCovered, deduplicateGaps } from "../coverage-score";

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

    // Completeness check: AI must evaluate ALL required + preferred requirements
    const expectedTotal =
      input.jd_requirements.required.length +
      input.jd_requirements.preferred.length;
    const actualTotal =
      result.data.requirements_covered.length + result.data.gaps.length;

    if (actualTotal < expectedTotal) {
      // AI dropped some requirements — add them as gaps so the score reflects reality
      const coveredReqs = new Set(
        result.data.requirements_covered.map((r) =>
          r.requirement.toLowerCase().trim(),
        ),
      );
      const gapReqs = new Set(
        result.data.gaps.map((g) => g.requirement.toLowerCase().trim()),
      );

      const allRequirements = [
        ...input.jd_requirements.required.map((r) => ({
          text: r,
          type: "required" as const,
        })),
        ...input.jd_requirements.preferred.map((r) => ({
          text: r,
          type: "preferred" as const,
        })),
      ];

      for (const req of allRequirements) {
        const normalized = req.text.toLowerCase().trim();
        // Check if this requirement was evaluated (fuzzy — first 30 chars)
        const prefix = normalized.slice(0, 30);
        const isCovered = [...coveredReqs].some((r) => r.startsWith(prefix));
        const isInGaps = [...gapReqs].some((r) => r.startsWith(prefix));
        if (!isCovered && !isInGaps) {
          result.data.gaps.push({
            requirement: req.text,
            severity: req.type === "required" ? "important" : "minor",
            suggestion: `Not evaluated by AI — auto-added as gap. Review interview stages for coverage of: ${req.text}`,
          });
        }
      }
    }

    // Dedup AI results — same requirement may appear in multiple stages
    const preDedupCovered = result.data.requirements_covered.length;
    const preDedupGaps = result.data.gaps.length;
    result.data.requirements_covered = deduplicateCovered(result.data.requirements_covered);
    result.data.gaps = deduplicateGaps(result.data.gaps);
    const duplicatesRemoved =
      (preDedupCovered - result.data.requirements_covered.length) +
      (preDedupGaps - result.data.gaps.length);

    // Compute score deterministically — never trust AI's number
    const aiEstimatedScore = result.data.overall_coverage_score;
    const { score: computedScore, breakdown } = computeCoverageScore(
      result.data.requirements_covered,
      result.data.gaps,
    );

    // Override the AI's score with the computed one
    result.data.overall_coverage_score = computedScore;

    const finalTotal =
      result.data.requirements_covered.length + result.data.gaps.length;

    const s3 = trace.step("validate-output", {
      requirements_covered: result.data.requirements_covered.length,
      gaps: result.data.gaps.length,
      redundancies: result.data.redundancies.length,
      recommendations: result.data.recommendations.length,
      ai_estimated_score: aiEstimatedScore,
      computed_score: computedScore,
      score_delta: computedScore - aiEstimatedScore,
      breakdown_strong: breakdown.strong,
      breakdown_moderate: breakdown.moderate,
      breakdown_weak: breakdown.weak,
      breakdown_gaps: breakdown.gaps,
      gaps_critical: breakdown.gaps_critical,
      gaps_important: breakdown.gaps_important,
      gaps_minor: breakdown.gaps_minor,
      duplicates_removed: duplicatesRemoved,
      breakdown_total: breakdown.total,
      expected_requirements: expectedTotal,
      ai_evaluated: actualTotal,
      auto_added_gaps: finalTotal - actualTotal,
      has_disclaimer: !!result.data.disclaimer,
    });
    const outWarnings: string[] = [];
    if (!result.data.disclaimer) outWarnings.push("CRITICAL: Missing disclaimer");
    if (computedScore < 50) outWarnings.push(`Low coverage score: ${computedScore}%`);
    if (Math.abs(computedScore - aiEstimatedScore) > 15) {
      outWarnings.push(
        `AI estimated ${aiEstimatedScore}% but computed ${computedScore}% (delta: ${computedScore - aiEstimatedScore})`,
      );
    }
    if (actualTotal < expectedTotal) {
      outWarnings.push(
        `AI only evaluated ${actualTotal}/${expectedTotal} requirements — ${finalTotal - actualTotal} auto-added as gaps`,
      );
    }
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
