import { callClaude } from "../client";
import {
  CoverageAnalysisSchema,
  type CoverageAnalysisOutput,
} from "../schemas/coverage-analysis";
import {
  ANCHORED_COVERAGE_PROMPT,
  type AnchoredCoveragePromptInput,
} from "../prompts/anchored-coverage";
import { PROMPT_VERSIONS } from "../config";
import { withRetry } from "../retry";
import { PipelineTrace, checkParams } from "../tracer";
import { computeCoverageScore, deduplicateCovered, deduplicateGaps } from "../coverage-score";
import type { CoveragePipelineResult } from "./coverage-analysis";

// ── Types ──

export interface PartitionInput {
  name: string;
  type: string;
  focus_areas: Array<{ name: string; description: string }>;
}

export interface ReevalRequirement {
  requirement: string;
  previous_strength: "strong" | "moderate" | "weak";
  previous_fa: string;
  reason: "fa_changed" | "fa_missing";
}

export interface ReevalGap {
  requirement: string;
  previous_severity: "critical" | "important" | "minor";
  reason: "new_fas_added";
}

export interface PartitionResult {
  anchored: {
    covered: CoverageAnalysisOutput["requirements_covered"];
    gaps: CoverageAnalysisOutput["gaps"];
  };
  needsReeval: {
    requirements: ReevalRequirement[];
    gaps: ReevalGap[];
  };
}

/** Maps a gap requirement to the FA that was added to fix it */
export interface GapTarget {
  /** The gap requirement text (from coverage analysis) */
  gap_requirement: string;
  /** The name of the FA that was added to address this gap */
  fa_name: string;
  /** The description of the added FA */
  fa_description: string;
}

// ── Pure logic ──

/**
 * Partition previous coverage into anchored (carry forward) vs needs-re-eval.
 *
 * Anchored entries: their FA is unchanged and still exists in stages.
 * Re-eval entries: their FA was changed, removed, or is missing from stages.
 * Gaps: re-evaluated only if new FAs were added (they might cover the gap).
 */
export function partitionCoverage(
  prev: CoverageAnalysisOutput,
  changedFAs: string[],
  hasAdditions: boolean,
  currentStages: PartitionInput[],
): PartitionResult {
  const changedSet = new Set(changedFAs.map((n) => n.toLowerCase()));

  // Build set of all FA names currently in stages
  const currentFANames = new Set<string>();
  for (const stage of currentStages) {
    for (const fa of stage.focus_areas) {
      currentFANames.add(fa.name.toLowerCase());
    }
  }

  const anchored: PartitionResult["anchored"] = { covered: [], gaps: [] };
  const needsReeval: PartitionResult["needsReeval"] = { requirements: [], gaps: [] };

  for (const entry of prev.requirements_covered) {
    const faName = entry.covered_by_focus_area.toLowerCase();
    if (changedSet.has(faName) || !currentFANames.has(faName)) {
      // FA was changed or no longer exists → re-evaluate
      needsReeval.requirements.push({
        requirement: entry.requirement,
        previous_strength: entry.coverage_strength,
        previous_fa: entry.covered_by_focus_area,
        reason: changedSet.has(faName) ? "fa_changed" : "fa_missing",
      });
    } else {
      // FA unchanged and still exists → anchor
      anchored.covered.push(entry);
    }
  }

  for (const gap of prev.gaps) {
    if (hasAdditions) {
      // New FAs were added — gap might now be covered
      needsReeval.gaps.push({
        requirement: gap.requirement,
        previous_severity: gap.severity,
        reason: "new_fas_added",
      });
    } else {
      // No new FAs → gap stays a gap
      anchored.gaps.push(gap);
    }
  }

  return { anchored, needsReeval };
}

/**
 * Fix covered_by_stage in anchored entries when stages were renamed.
 * Mutates the covered array in place.
 */
export function fixStageNames(
  covered: CoverageAnalysisOutput["requirements_covered"],
  stages: PartitionInput[],
): void {
  // Build FA→stage name lookup from current stages
  const faToStage = new Map<string, string>();
  for (const stage of stages) {
    for (const fa of stage.focus_areas) {
      faToStage.set(fa.name.toLowerCase(), stage.name);
    }
  }

  for (const entry of covered) {
    const correctStage = faToStage.get(entry.covered_by_focus_area.toLowerCase());
    if (correctStage && correctStage !== entry.covered_by_stage) {
      entry.covered_by_stage = correctStage;
    }
  }
}

// ── Pipeline ──

export interface AnchoredCoverageInput {
  role: string;
  level: string;
  jd_requirements: {
    required: string[];
    preferred: string[];
    responsibilities: string[];
  };
  stages: PartitionInput[];
  previous_coverage: CoverageAnalysisOutput;
  changed_fa_names: string[];
  has_additions: boolean;
  /** Maps gap requirements to the FAs specifically added to fix them */
  gap_targets?: GapTarget[];
}

/**
 * Anchored incremental coverage analysis.
 * Unchanged FAs carry forward their assessments. Only changed FAs trigger AI evaluation.
 */
export async function analyzeCoverageAnchored(
  input: AnchoredCoverageInput,
): Promise<CoveragePipelineResult> {
  const trace = new PipelineTrace("analyzeCoverageAnchored");

  // Step 1: Partition previous coverage
  const { anchored, needsReeval } = partitionCoverage(
    input.previous_coverage,
    input.changed_fa_names,
    input.has_additions,
    input.stages,
  );

  const s1 = trace.step("partition", {
    anchored_covered: anchored.covered.length,
    anchored_gaps: anchored.gaps.length,
    reeval_requirements: needsReeval.requirements.length,
    reeval_gaps: needsReeval.gaps.length,
    changed_fa_count: input.changed_fa_names.length,
    has_additions: input.has_additions,
  });
  s1.ok({});

  // Fix stage names in anchored entries (handles renames)
  fixStageNames(anchored.covered, input.stages);

  // Step 2: If nothing needs re-eval, skip AI call entirely
  if (needsReeval.requirements.length === 0 && needsReeval.gaps.length === 0) {
    const { score } = computeCoverageScore(anchored.covered, anchored.gaps);

    const s2 = trace.step("skip-ai", { reason: "nothing_to_reeval", score });
    s2.ok({});
    trace.finish();

    return {
      data: {
        requirements_covered: anchored.covered,
        gaps: anchored.gaps,
        redundancies: input.previous_coverage.redundancies,
        recommendations: input.previous_coverage.recommendations,
        overall_coverage_score: score,
        disclaimer: input.previous_coverage.disclaimer || "AI-generated coverage analysis. Human review required.",
      },
      metadata: {
        model_used: "anchored-skip",
        prompt_version: PROMPT_VERSIONS.anchoredCoverage,
        generated_at: new Date().toISOString(),
      },
    };
  }

  // Step 3: Call AI with only the subset
  const s3 = trace.step("call-claude", { endpoint: "anchoredCoverage" });

  try {
    const totalRequirements =
      input.jd_requirements.required.length +
      input.jd_requirements.preferred.length;

    // Build gap target lookup for targeted_fix prompt context
    const gapTargetMap = new Map<string, GapTarget>();
    if (input.gap_targets) {
      for (const gt of input.gap_targets) {
        gapTargetMap.set(gt.gap_requirement.toLowerCase().trim(), gt);
      }
    }

    const promptInput: AnchoredCoveragePromptInput = {
      role: input.role,
      level: input.level,
      requirements_to_evaluate: [
        ...needsReeval.requirements.map((r) => ({
          requirement: r.requirement,
          previous_strength: r.previous_strength,
          previous_fa: r.previous_fa,
          reason: r.reason satisfies "fa_changed" | "fa_missing",
        })),
        ...needsReeval.gaps.map((g) => {
          const target = gapTargetMap.get(g.requirement.toLowerCase().trim());
          if (target) {
            return {
              requirement: g.requirement,
              previous_severity: g.previous_severity,
              reason: "targeted_fix" as const,
              target_fa_name: target.fa_name,
              target_fa_description: target.fa_description,
            };
          }
          return {
            requirement: g.requirement,
            previous_severity: g.previous_severity,
            reason: "new_fas_added" as const,
          };
        }),
      ],
      anchored_count: anchored.covered.length + anchored.gaps.length,
      total_requirements: totalRequirements,
      stages: input.stages,
    };

    const prompt = ANCHORED_COVERAGE_PROMPT.user(promptInput);
    const result = await withRetry(() =>
      callClaude({
        endpoint: "anchoredCoverage",
        schema: CoverageAnalysisSchema,
        prompt,
        systemPrompt: ANCHORED_COVERAGE_PROMPT.system,
      }),
    );

    // Step 4a: Dedup within AI results (same requirement mapped to multiple FAs)
    const preDedupAICovered = result.data.requirements_covered.length;
    const preDedupAIGaps = result.data.gaps.length;
    result.data.requirements_covered = deduplicateCovered(result.data.requirements_covered);
    result.data.gaps = deduplicateGaps(result.data.gaps);
    const aiInternalDupsRemoved =
      (preDedupAICovered - result.data.requirements_covered.length) +
      (preDedupAIGaps - result.data.gaps.length);

    // Step 4b: Dedup — filter AI results that duplicate anchored entries
    const anchoredReqSet = new Set(
      anchored.covered.map((r) => r.requirement.toLowerCase().trim()),
    );
    const anchoredGapSet = new Set(
      anchored.gaps.map((g) => g.requirement.toLowerCase().trim()),
    );
    const dedupedAICovered = result.data.requirements_covered.filter(
      (r) => !anchoredReqSet.has(r.requirement.toLowerCase().trim()),
    );
    const dedupedAIGaps = result.data.gaps.filter(
      (g) => !anchoredGapSet.has(g.requirement.toLowerCase().trim()),
    );

    // Step 5: Merge anchored + deduped AI result
    const mergedCovered = [...anchored.covered, ...dedupedAICovered];
    const mergedGaps = [...anchored.gaps, ...dedupedAIGaps];

    // Step 6: Completeness guard — auto-add missing re-eval reqs as gaps
    const allOutputReqs = new Set([
      ...mergedCovered.map((r) => r.requirement.toLowerCase().trim()),
      ...mergedGaps.map((g) => g.requirement.toLowerCase().trim()),
    ]);
    const allSentForReeval = [
      ...needsReeval.requirements.map((r) => r.requirement),
      ...needsReeval.gaps.map((g) => g.requirement),
    ];
    let autoAddedGaps = 0;
    for (const reqText of allSentForReeval) {
      if (!allOutputReqs.has(reqText.toLowerCase().trim())) {
        mergedGaps.push({
          requirement: reqText,
          severity: "important",
          suggestion: `Not re-evaluated by AI — auto-added as gap. Review interview stages for coverage of: ${reqText}`,
        });
        autoAddedGaps++;
      }
    }

    // Step 6b: Deterministic fallback — if a gap has a targeted FA that exists in stages,
    // force it to covered (weak). This guarantees score progression for targeted fixes.
    let fallbackCount = 0;
    if (gapTargetMap.size > 0) {
      const currentFALookup = new Map<string, { stage: string; fa: string }>();
      for (const stage of input.stages) {
        for (const fa of stage.focus_areas) {
          currentFALookup.set(fa.name.toLowerCase().trim(), {
            stage: stage.name,
            fa: fa.name,
          });
        }
      }

      const remainingGaps: typeof mergedGaps[number][] = [];
      for (const gap of mergedGaps) {
        const target = gapTargetMap.get(gap.requirement.toLowerCase().trim());
        if (target) {
          const faInStages = currentFALookup.get(target.fa_name.toLowerCase().trim());
          if (faInStages) {
            // Force to covered (weak) — the FA exists and was designed for this gap
            mergedCovered.push({
              requirement: gap.requirement,
              covered_by_stage: faInStages.stage,
              covered_by_focus_area: faInStages.fa,
              coverage_strength: "weak",
            });
            fallbackCount++;
            continue;
          }
        }
        remainingGaps.push(gap);
      }
      // Replace mergedGaps contents with filtered version
      mergedGaps.length = 0;
      mergedGaps.push(...remainingGaps);
    }

    // Step 7: Compute score deterministically
    const { score, breakdown } = computeCoverageScore(mergedCovered, mergedGaps);

    const s4 = trace.step("merge-result", {
      anchored_covered: anchored.covered.length,
      ai_covered: dedupedAICovered.length,
      ai_covered_pre_dedup: result.data.requirements_covered.length,
      anchored_gaps: anchored.gaps.length,
      ai_gaps: dedupedAIGaps.length,
      ai_gaps_pre_dedup: result.data.gaps.length,
      ai_internal_dups_removed: aiInternalDupsRemoved,
      auto_added_gaps: autoAddedGaps,
      fallback_count: fallbackCount,
      total_covered: mergedCovered.length,
      total_gaps: mergedGaps.length,
      gaps_critical: breakdown.gaps_critical,
      gaps_important: breakdown.gaps_important,
      gaps_minor: breakdown.gaps_minor,
      computed_score: score,
      ai_estimated_score: result.data.overall_coverage_score,
    });
    s4.ok({});

    s3.ok({ model: result.model });
    trace.finish();

    return {
      data: {
        requirements_covered: mergedCovered,
        gaps: mergedGaps,
        redundancies: result.data.redundancies,
        recommendations: result.data.recommendations,
        overall_coverage_score: score,
        disclaimer: result.data.disclaimer || "AI-generated coverage analysis. Human review required.",
      },
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.anchoredCoverage,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s3.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}
