import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

type ReevalRequirementPrompt =
  | {
      requirement: string;
      previous_strength: "strong" | "moderate" | "weak";
      previous_fa: string;
      reason: "fa_changed" | "fa_missing";
    }
  | {
      requirement: string;
      previous_severity: "critical" | "important" | "minor";
      reason: "new_fas_added";
    }
  | {
      requirement: string;
      previous_severity: "critical" | "important" | "minor";
      reason: "targeted_fix";
      target_fa_name: string;
      target_fa_description: string;
    };

export interface AnchoredCoveragePromptInput {
  role: string;
  level: string;
  requirements_to_evaluate: ReevalRequirementPrompt[];
  anchored_count: number;
  total_requirements: number;
  stages: Array<{
    name: string;
    type: string;
    focus_areas: Array<{ name: string; description: string }>;
  }>;
}

export const ANCHORED_COVERAGE_PROMPT = {
  version: PROMPT_VERSIONS.anchoredCoverage,

  system: `You are an interview coverage auditor performing an INCREMENTAL re-evaluation.
${COMPLIANCE_SYSTEM_PROMPT}

You are given a SUBSET of requirements that need fresh evaluation because their coverage context has changed (focus areas were added, removed, or modified). Other requirements have already been evaluated and their assessments are locked.

CRITICAL RULES:
- Evaluate ONLY the requirements listed below. Do not add or infer additional requirements.
- Follow the exact same strength calibration as a full analysis:
  - "strong": FA name and description specifically target this requirement
  - "moderate": FA overlaps but doesn't directly target
  - "weak": only tangential connection
  - If no FA targets it → gap
- If a requirement's original FA was removed, check if ANY remaining FA covers it before marking as gap
- Be strict: adding a "Testing" FA does NOT provide "moderate" coverage for "Cloud architecture"
- When a requirement says "SPECIFICALLY ADDED to address this gap", the named FA was designed for it — it should provide at least weak coverage unless the FA description is completely unrelated
- Also provide redundancies and recommendations based on the FULL set of stages`,

  user: (input: AnchoredCoveragePromptInput) => {
    const count = input.requirements_to_evaluate.length;

    const requirementsList = input.requirements_to_evaluate
      .map((r, i) => {
        let reasonText: string;
        if (r.reason === "targeted_fix") {
          reasonText = `Previously a gap (${r.previous_severity}). FA "${r.target_fa_name}: ${r.target_fa_description}" was SPECIFICALLY ADDED to address this gap — evaluate coverage strength`;
        } else if (r.reason === "new_fas_added") {
          reasonText = `Previously a gap (${r.previous_severity}), new FA was ADDED that may cover this`;
        } else if (r.reason === "fa_changed") {
          reasonText = `Previously covered by "${r.previous_fa}" (${r.previous_strength}), but that FA was REMOVED/CHANGED`;
        } else {
          reasonText = `Previously covered by "${r.previous_fa}" (${r.previous_strength}), but that FA no longer exists in stages`;
        }
        return `  ${i + 1}. ${sanitizeInput(r.requirement)} — ${reasonText}`;
      })
      .join("\n");

    const stagesText = input.stages
      .map(
        (s) =>
          `Stage: ${sanitizeInput(s.name)} (${s.type})\n  Focus areas: ${s.focus_areas.map((fa) => `${sanitizeInput(fa.name)}: ${sanitizeInput(fa.description)}`).join("; ")}`,
      )
      .join("\n");

    return `INCREMENTAL COVERAGE RE-EVALUATION

ROLE: ${sanitizeInput(input.role)} (${sanitizeInput(input.level)})

REQUIREMENTS TO RE-EVALUATE (${count} of ${input.total_requirements} total):
${requirementsList || "  (none)"}

NOTE: ${input.anchored_count} other requirements are anchored (unchanged) and not included here.

CURRENT INTERVIEW STAGES (after changes):
${stagesText}

For each requirement above: evaluate against the current stages.
- If a focus area assesses it → requirements_covered (with honest strength rating)
- If no focus area assesses it → gaps (with severity)
- Each requirement must appear EXACTLY ONCE. Do NOT list the same requirement multiple times.

Also identify:
- redundancies: focus areas that overlap significantly across stages
- recommendations: concrete improvements (max 8)
- overall_coverage_score: your estimate (will be recomputed programmatically)
- disclaimer`;
  },
} as const;
