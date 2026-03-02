import { callClaude } from "../client";
import {
  StageRefinementsOutputSchema,
  RefinementDiffSchema,
  type StageRefinementsOutput,
  type RefinementDiff,
} from "../schemas/stage-refinements";
import {
  InterviewStagesSchema,
  type InterviewStagesOutput,
} from "../schemas/interview-stage";
import {
  REFINEMENT_GENERATION_PROMPT,
  REFINEMENT_DIFF_PROMPT,
  REFINEMENT_APPLY_PROMPT,
  type RefinementGenerationInput,
  type RefinementApplyInput,
} from "../prompts/stage-refinements";
import { PROMPT_VERSIONS } from "../config";
import { withRetry } from "../retry";
import { PipelineTrace, checkParams } from "../tracer";

export interface RefinementPipelineInput {
  role: string;
  level: string;
  coverage_analysis: RefinementGenerationInput["coverage_analysis"];
  stages: RefinementGenerationInput["stages"];
  user_prompt?: string;
}

export interface RefinementPipelineResult {
  data: StageRefinementsOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}

/**
 * Generate actionable refinement items from coverage analysis.
 * ~5-10s with Sonnet.
 */
export async function generateRefinements(
  input: RefinementPipelineInput,
): Promise<RefinementPipelineResult> {
  const trace = new PipelineTrace("generateRefinements");

  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    gaps_count: input.coverage_analysis.gaps.length,
    redundancies_count: input.coverage_analysis.redundancies.length,
    recommendations_count: input.coverage_analysis.recommendations.length,
    weak_coverage_count: input.coverage_analysis.requirements_covered.filter(
      (rc) => rc.coverage_strength === "weak",
    ).length,
    stages_count: input.stages.length,
    overall_score: input.coverage_analysis.overall_coverage_score,
    has_user_prompt: !!input.user_prompt,
  });

  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "coverage_analysis", "stages"],
  );
  if (input.coverage_analysis.gaps.length === 0 && input.coverage_analysis.redundancies.length === 0) {
    warnings.push("No gaps or redundancies — refinements will be improvements only");
  }
  s1.ok({}, warnings);

  const s2 = trace.step("call-claude", {
    endpoint: "refinementGeneration",
    schema: "StageRefinementsOutputSchema",
  });

  try {
    const prompt = REFINEMENT_GENERATION_PROMPT.user(input);
    const result = await withRetry(() =>
      callClaude({
        endpoint: "refinementGeneration",
        schema: StageRefinementsOutputSchema,
        prompt,
        systemPrompt: REFINEMENT_GENERATION_PROMPT.system,
      }),
    );

    // Cap refinement items to match actual issue counts
    const maxGapFixes = input.coverage_analysis.gaps.length;
    const maxRedundancyFixes = input.coverage_analysis.redundancies.length;
    const maxImprovements = input.coverage_analysis.overall_coverage_score < 70 ? 3 : 0;

    const gapFixes = result.data.items.filter((i) => i.type === "gap_fix").slice(0, maxGapFixes);
    const redundancyFixes = result.data.items.filter((i) => i.type === "redundancy_fix").slice(0, maxRedundancyFixes);
    const improvements = result.data.items.filter((i) => i.type === "improvement").slice(0, maxImprovements);
    const originalCount = result.data.items.length;
    result.data.items = [...gapFixes, ...redundancyFixes, ...improvements];

    const s3 = trace.step("validate-output", {
      items_count_raw: originalCount,
      items_count_capped: result.data.items.length,
      gap_fixes: gapFixes.length,
      max_gap_fixes: maxGapFixes,
      redundancy_fixes: redundancyFixes.length,
      max_redundancy_fixes: maxRedundancyFixes,
      improvements: improvements.length,
      max_improvements: maxImprovements,
      critical: result.data.items.filter((i) => i.priority === "critical").length,
      has_disclaimer: !!result.data.disclaimer,
    });
    const outWarnings: string[] = [];
    if (!result.data.disclaimer) outWarnings.push("CRITICAL: Missing disclaimer");
    if (originalCount > result.data.items.length) {
      outWarnings.push(
        `Capped items from ${originalCount} to ${result.data.items.length} (max: ${maxGapFixes} gap_fixes + ${maxRedundancyFixes} redundancy_fixes + ${maxImprovements} improvements)`,
      );
    }
    s3.ok({}, outWarnings);

    s2.ok({ model: result.model });
    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.refinementGeneration,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}

export interface ApplyRefinementsPipelineInput {
  role: string;
  level: string;
  industry: string;
  selected_items: RefinementApplyInput["selected_items"];
  current_stages: RefinementApplyInput["current_stages"];
  user_prompt?: string;
  jd_context?: RefinementApplyInput["jd_context"];
  strategy_context?: RefinementApplyInput["strategy_context"];
}

export interface ApplyRefinementsPipelineResult {
  data: InterviewStagesOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}

/**
 * Apply selected refinement items to produce updated stages.
 * Reuses stageGeneration config. ~15-30s with Sonnet.
 */
export async function applyRefinements(
  input: ApplyRefinementsPipelineInput,
): Promise<ApplyRefinementsPipelineResult> {
  const trace = new PipelineTrace("applyRefinements");

  const inputTotalDuration = input.current_stages.reduce(
    (sum, s) => sum + s.duration_minutes,
    0,
  );
  const inputTotalQuestions = input.current_stages.reduce(
    (sum, s) => sum + s.suggested_questions.length,
    0,
  );
  const maxStages = input.strategy_context?.process_speed?.max_stages;

  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    industry: input.industry,
    selected_items_count: input.selected_items.length,
    current_stages_count: input.current_stages.length,
    total_questions: inputTotalQuestions,
    total_duration_minutes: inputTotalDuration,
    max_stages: maxStages ?? "none",
    has_user_prompt: !!input.user_prompt,
    has_jd_context: !!input.jd_context,
    has_strategy_context: !!input.strategy_context,
  });

  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "industry", "selected_items", "current_stages"],
  );
  if (input.selected_items.length === 0) {
    warnings.push("No selected items — output will match current stages");
  }
  s1.ok({}, warnings);

  const s2 = trace.step("call-claude", {
    endpoint: "stageGeneration",
    schema: "InterviewStagesSchema",
  });

  try {
    const prompt = REFINEMENT_APPLY_PROMPT.user(input);
    const result = await withRetry(() =>
      callClaude({
        endpoint: "stageGeneration",
        schema: InterviewStagesSchema,
        prompt,
        systemPrompt: REFINEMENT_APPLY_PROMPT.system,
      }),
    );

    const outputTotalDuration = result.data.stages.reduce(
      (sum, s) => sum + s.duration_minutes,
      0,
    );
    const outputTotalQuestions = result.data.stages.reduce(
      (sum, s) => sum + s.suggested_questions.length,
      0,
    );
    const outputTotalFocusAreas = result.data.stages.reduce(
      (sum, s) => sum + s.focus_areas.length,
      0,
    );
    const durationDelta = Math.round(
      ((outputTotalDuration - inputTotalDuration) / inputTotalDuration) * 100,
    );

    const s3 = trace.step("validate-output", {
      stages_count: result.data.stages.length,
      total_focus_areas: outputTotalFocusAreas,
      total_questions: outputTotalQuestions,
      total_duration_minutes: outputTotalDuration,
      duration_delta_pct: durationDelta,
      stages_before: input.current_stages.length,
      questions_before: inputTotalQuestions,
      duration_before: inputTotalDuration,
    });
    const outWarnings: string[] = [];
    if (result.data.stages.length !== input.current_stages.length) {
      outWarnings.push(
        `Stage count changed: ${input.current_stages.length} → ${result.data.stages.length}`,
      );
    }
    if (Math.abs(durationDelta) > 20) {
      outWarnings.push(
        `Duration drift ${durationDelta}%: ${inputTotalDuration}min → ${outputTotalDuration}min`,
      );
    }
    // Per-stage question density check
    for (const stage of result.data.stages) {
      const faCount = stage.focus_areas.length;
      const qCount = stage.suggested_questions.length;
      if (faCount > 0 && qCount / faCount < 2) {
        outWarnings.push(
          `"${stage.name}" has ${qCount} questions for ${faCount} focus areas (${(qCount / faCount).toFixed(1)}/FA — low density)`,
        );
      }
    }
    // Question delta
    const questionDelta = outputTotalQuestions - inputTotalQuestions;
    if (Math.abs(questionDelta) > inputTotalQuestions * 0.5) {
      outWarnings.push(
        `Question count changed significantly: ${inputTotalQuestions} → ${outputTotalQuestions} (${questionDelta > 0 ? "+" : ""}${questionDelta})`,
      );
    }
    s3.ok({}, outWarnings);

    s2.ok({ model: result.model });

    // Post-apply diff: compare focus areas per stage to trace what changed
    const s4 = trace.step("diff-analysis", {});
    const diffDetails: string[] = [];
    for (let i = 0; i < Math.min(input.current_stages.length, result.data.stages.length); i++) {
      const before = input.current_stages[i];
      const after = result.data.stages[i];
      const beforeFAs = new Set(before.focus_areas.map((fa) => fa.name.toLowerCase()));
      const afterFAs = new Set(after.focus_areas.map((fa) => fa.name.toLowerCase()));
      const added = [...afterFAs].filter((fa) => !beforeFAs.has(fa));
      const removed = [...beforeFAs].filter((fa) => !afterFAs.has(fa));
      const preserved = [...beforeFAs].filter((fa) => afterFAs.has(fa));
      if (added.length > 0 || removed.length > 0) {
        diffDetails.push(
          `Stage ${i + 1} "${after.name}": +${added.length} FA(${added.join(", ")}), -${removed.length} FA(${removed.join(", ")}), =${preserved.length} preserved`,
        );
      }
    }
    s4.ok({
      stages_with_changes: diffDetails.length,
      stages_unchanged: result.data.stages.length - diffDetails.length,
      changes: diffDetails,
    });

    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.refinementGeneration,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}

// ── Surgical diff apply ──

export interface ApplyRefinementsDiffResult {
  data: RefinementDiff;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}

/**
 * Generate a surgical diff (patches only) instead of full stages.
 * Same input contract as applyRefinements, but outputs RefinementDiff.
 * ~5-15s with Sonnet (much less output than full stages).
 */
export async function applyRefinementsDiff(
  input: ApplyRefinementsPipelineInput,
): Promise<ApplyRefinementsDiffResult> {
  const trace = new PipelineTrace("applyRefinementsDiff");

  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    industry: input.industry,
    selected_items_count: input.selected_items.length,
    current_stages_count: input.current_stages.length,
    has_user_prompt: !!input.user_prompt,
    has_jd_context: !!input.jd_context,
    has_strategy_context: !!input.strategy_context,
  });

  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "industry", "selected_items", "current_stages"],
  );
  if (input.selected_items.length === 0) {
    warnings.push("No selected items — diff will be empty");
  }
  s1.ok({}, warnings);

  const s2 = trace.step("call-claude", {
    endpoint: "refinementApply",
    schema: "RefinementDiffSchema",
  });

  try {
    const prompt = REFINEMENT_DIFF_PROMPT.user(input);
    const result = await withRetry(() =>
      callClaude({
        endpoint: "refinementApply",
        schema: RefinementDiffSchema,
        prompt,
        systemPrompt: REFINEMENT_DIFF_PROMPT.system,
      }),
    );

    const s3 = trace.step("validate-output", {
      patches_count: result.data.patches.length,
      has_summary: !!result.data.summary,
      has_disclaimer: !!result.data.disclaimer,
    });
    const outWarnings: string[] = [];

    for (const patch of result.data.patches) {
      if (patch.stage_index < 0 || patch.stage_index >= input.current_stages.length) {
        outWarnings.push(
          `Patch has out-of-bounds stage_index: ${patch.stage_index} (max: ${input.current_stages.length - 1})`,
        );
      } else {
        const expected = input.current_stages[patch.stage_index].name;
        if (expected.toLowerCase() !== patch.stage_name.toLowerCase()) {
          outWarnings.push(
            `Patch stage_index ${patch.stage_index} name mismatch: expected "${expected}", got "${patch.stage_name}"`,
          );
        }
      }
    }

    if (!result.data.disclaimer) {
      outWarnings.push("CRITICAL: Missing disclaimer");
    }
    s3.ok({}, outWarnings);

    s2.ok({ model: result.model });
    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.refinementApply,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}
