import type { StagePatch, RefinementDiff } from "./schemas/stage-refinements";

interface FocusAreaData {
  name: string;
  description: string;
  weight: number;
  rationale?: string;
}

interface QuestionData {
  question: string;
  purpose: string;
  look_for: string[];
  focus_area: string;
}

interface StageData {
  name: string;
  type: string;
  duration_minutes: number;
  description: string;
  focus_areas: FocusAreaData[];
  suggested_questions: QuestionData[];
  rationale?: string;
}

export interface MergeResult {
  stages: StageData[];
  warnings: string[];
  patchesApplied: number;
  /** Names of FAs that were added, removed, replaced, or modified */
  changedFANames: string[];
  /** Whether any FAs were added (determines if gaps need re-eval) */
  hasAdditions: boolean;
}

/**
 * Pure, deterministic merge of AI-generated patches onto existing stages.
 * Untouched content is never modified — only patched focus areas change.
 *
 * Order: removals → additions (with replaces) → modifications → stage-level changes
 */
export function mergeRefinementDiff(
  currentStages: StageData[],
  diff: RefinementDiff,
): MergeResult {
  // Deep clone to avoid mutating input
  const stages: StageData[] = JSON.parse(JSON.stringify(currentStages));
  const warnings: string[] = [];
  let patchesApplied = 0;
  const changedFANames: string[] = [];
  let hasAdditions = false;

  for (const patch of diff.patches) {
    // Validate index in bounds
    if (patch.stage_index < 0 || patch.stage_index >= stages.length) {
      warnings.push(
        `Patch skipped: stage_index ${patch.stage_index} out of bounds (0-${stages.length - 1})`,
      );
      continue;
    }

    const stage = stages[patch.stage_index];

    // Verify name matches (case-insensitive)
    if (stage.name.toLowerCase() !== patch.stage_name.toLowerCase()) {
      warnings.push(
        `Patch skipped: stage_index ${patch.stage_index} name mismatch — expected "${patch.stage_name}", found "${stage.name}"`,
      );
      continue;
    }

    // 1. Process removals first
    if (patch.remove_focus_areas && patch.remove_focus_areas.length > 0) {
      for (const name of patch.remove_focus_areas) changedFANames.push(name);
      const toRemove = new Set(
        patch.remove_focus_areas.map((n) => n.toLowerCase()),
      );
      const beforeCount = stage.focus_areas.length;
      stage.focus_areas = stage.focus_areas.filter(
        (fa) => !toRemove.has(fa.name.toLowerCase()),
      );
      // Clean orphaned questions
      const remainingFANames = new Set(
        stage.focus_areas.map((fa) => fa.name.toLowerCase()),
      );
      stage.suggested_questions = stage.suggested_questions.filter((q) =>
        remainingFANames.has(q.focus_area.toLowerCase()),
      );
      const removed = beforeCount - stage.focus_areas.length;
      if (removed < patch.remove_focus_areas.length) {
        const missing = patch.remove_focus_areas.filter(
          (n) =>
            !currentStages[patch.stage_index].focus_areas.some(
              (fa) => fa.name.toLowerCase() === n.toLowerCase(),
            ),
        );
        if (missing.length > 0) {
          warnings.push(
            `Stage ${patch.stage_index} "${stage.name}": could not find FA(s) to remove: ${missing.join(", ")}`,
          );
        }
      }
    }

    // 2. Process additions (with optional replaces)
    if (patch.add_focus_areas && patch.add_focus_areas.length > 0) {
      for (const addition of patch.add_focus_areas) {
        changedFANames.push(addition.focus_area.name);
        hasAdditions = true;
        // If replaces specified, remove target FA first
        if (addition.replaces) {
          changedFANames.push(addition.replaces);
          const replaceTarget = addition.replaces.toLowerCase();
          const beforeCount = stage.focus_areas.length;
          stage.focus_areas = stage.focus_areas.filter(
            (fa) => fa.name.toLowerCase() !== replaceTarget,
          );
          stage.suggested_questions = stage.suggested_questions.filter(
            (q) => q.focus_area.toLowerCase() !== replaceTarget,
          );
          if (stage.focus_areas.length === beforeCount) {
            const existingFAs = stage.focus_areas.map((fa) => fa.name).join(", ");
            warnings.push(
              `Stage ${patch.stage_index} "${stage.name}": replaces target "${addition.replaces}" not found (has: ${existingFAs}), adding FA anyway`,
            );
          }
        }

        // Add the new focus area
        stage.focus_areas.push({
          name: addition.focus_area.name,
          description: addition.focus_area.description,
          weight: addition.focus_area.weight,
          rationale: addition.focus_area.rationale,
        });

        // Add its questions (with focus_area name set correctly)
        for (const q of addition.questions) {
          stage.suggested_questions.push({
            question: q.question,
            purpose: q.purpose,
            look_for: q.look_for,
            focus_area: addition.focus_area.name,
          });
        }
      }
    }

    // 3. Process modifications (metadata only — questions preserved)
    if (patch.modify_focus_areas && patch.modify_focus_areas.length > 0) {
      for (const mod of patch.modify_focus_areas) {
        changedFANames.push(mod.name);
        const fa = stage.focus_areas.find(
          (f) => f.name.toLowerCase() === mod.name.toLowerCase(),
        );
        if (!fa) {
          warnings.push(
            `Stage ${patch.stage_index} "${stage.name}": modify target "${mod.name}" not found`,
          );
          continue;
        }
        if (mod.updated_description !== undefined) {
          fa.description = mod.updated_description;
        }
        if (mod.updated_weight !== undefined) {
          fa.weight = mod.updated_weight;
        }
      }
    }

    // 4. Apply stage-level changes
    if (patch.updated_name !== undefined) {
      stage.name = patch.updated_name;
    }
    if (patch.updated_type !== undefined) {
      stage.type = patch.updated_type;
    }
    if (patch.updated_duration_minutes !== undefined) {
      stage.duration_minutes = patch.updated_duration_minutes;
    }
    if (patch.updated_description !== undefined) {
      stage.description = patch.updated_description;
    }

    patchesApplied++;
  }

  // Post-merge validation
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    // Warn if FA count outside 1-5 range
    if (stage.focus_areas.length === 0) {
      warnings.push(
        `Stage ${i} "${stage.name}": has 0 focus areas after merge — stage may be invalid`,
      );
    } else if (stage.focus_areas.length > 5) {
      warnings.push(
        `Stage ${i} "${stage.name}": has ${stage.focus_areas.length} focus areas (max 5) — excess FAs kept but may fail validation`,
      );
    }

    // Clean any remaining orphaned questions
    const faNames = new Set(
      stage.focus_areas.map((fa) => fa.name.toLowerCase()),
    );
    const beforeQ = stage.suggested_questions.length;
    stage.suggested_questions = stage.suggested_questions.filter((q) =>
      faNames.has(q.focus_area.toLowerCase()),
    );
    if (stage.suggested_questions.length < beforeQ) {
      warnings.push(
        `Stage ${i} "${stage.name}": cleaned ${beforeQ - stage.suggested_questions.length} orphaned question(s)`,
      );
    }
  }

  return { stages, warnings, patchesApplied, changedFANames, hasAdditions };
}
