import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

export interface RefinementGenerationInput {
  role: string;
  level: string;
  coverage_analysis: {
    gaps: Array<{ requirement: string; severity: string; suggestion: string }>;
    redundancies: Array<{ focus_area: string; appears_in_stages: string[]; recommendation: string }>;
    recommendations: string[];
    requirements_covered: Array<{ requirement: string; coverage_strength: string }>;
    overall_coverage_score: number;
  };
  stages: Array<{
    name: string;
    type: string;
    focus_areas: Array<{ name: string; description: string }>;
  }>;
  user_prompt?: string;
}

export interface RefinementApplyInput {
  role: string;
  level: string;
  industry: string;
  selected_items: Array<{
    title: string;
    type: string;
    change_summary: string;
    source_detail?: string;
  }>;
  current_stages: Array<{
    name: string;
    type: string;
    duration_minutes: number;
    description: string;
    focus_areas: Array<{ name: string; description: string; weight: number }>;
    suggested_questions: Array<{
      question: string;
      purpose: string;
      look_for: string[];
      focus_area: string;
    }>;
  }>;
  user_prompt?: string;
  jd_context?: {
    responsibilities?: string[];
    requirements?: string[];
  };
  strategy_context?: {
    market_classification?: string;
    process_speed?: { recommendation: string; max_stages: number };
    skills_priority?: { must_have: string[]; nice_to_have: string[] };
  };
}

export const REFINEMENT_GENERATION_PROMPT = {
  version: PROMPT_VERSIONS.refinementGeneration,

  system: `You are an interview process improvement specialist.
${COMPLIANCE_SYSTEM_PROMPT}

You analyze coverage analysis results and generate specific, actionable refinement items that improve interview stage design. Each item must be concrete enough to implement — not vague advice.

Rules:
- gap_fix items MUST reference an actual gap from the coverage analysis — generate EXACTLY one gap_fix per gap, no more
- redundancy_fix items MUST reference an actual redundancy — generate at most one per redundancy
- improvement items are general process improvements — only if score is below 70%, otherwise skip
- Do NOT generate more refinement items than there are actual issues (gaps + redundancies + weak items)
- Maximum 2 new stages can be suggested — prefer modifying existing stages
- Never suggest removing stages that have strong coverage on critical requirements
- PRESERVE existing focus areas that have strong coverage — do not suggest replacing or modifying them
- Keep titles short and specific (e.g., "Add Financial Modeling to Technical Round")
- Keep change_summary concrete (e.g., "Add 'Financial Modeling' focus area to Stage 2 with 2 scenario-based questions")
- Prefer SMALL, targeted changes — each item should modify at most 1 focus area in 1 stage`,

  user: (input: RefinementGenerationInput) => {
    const gapsText = input.coverage_analysis.gaps.length > 0
      ? input.coverage_analysis.gaps
          .map((g) => `- [${g.severity}] ${sanitizeInput(g.requirement)}: ${sanitizeInput(g.suggestion)}`)
          .join("\n")
      : "None";

    const redundanciesText = input.coverage_analysis.redundancies.length > 0
      ? input.coverage_analysis.redundancies
          .map((r) => `- "${sanitizeInput(r.focus_area)}" in ${r.appears_in_stages.map(s => sanitizeInput(s)).join(", ")}: ${sanitizeInput(r.recommendation)}`)
          .join("\n")
      : "None";

    const weakCoverage = input.coverage_analysis.requirements_covered
      .filter((rc) => rc.coverage_strength === "weak")
      .map((rc) => `- ${sanitizeInput(rc.requirement)} (weak coverage)`)
      .join("\n") || "None";

    const stagesText = input.stages
      .map((s) => `- ${sanitizeInput(s.name)} (${s.type}): ${s.focus_areas.map((fa) => sanitizeInput(fa.name)).join(", ")}`)
      .join("\n");

    const userPromptSection = input.user_prompt
      ? `\nUSER GUIDANCE:\n${sanitizeInput(input.user_prompt.slice(0, 500))}`
      : "";

    return `Analyze this interview process and generate actionable refinement items:

ROLE: ${sanitizeInput(input.role)} (${sanitizeInput(input.level)})
OVERALL COVERAGE: ${input.coverage_analysis.overall_coverage_score}%

GAPS:
${gapsText}

REDUNDANCIES:
${redundanciesText}

WEAK COVERAGE:
${weakCoverage}

FREE-TEXT RECOMMENDATIONS:
${input.coverage_analysis.recommendations.map((r) => `- ${sanitizeInput(r)}`).join("\n") || "None"}

CURRENT STAGES:
${stagesText}
${userPromptSection}

ISSUE COUNTS: ${input.coverage_analysis.gaps.length} gaps, ${input.coverage_analysis.redundancies.length} redundancies, ${input.coverage_analysis.requirements_covered.filter((rc) => rc.coverage_strength === "weak").length} weak items.

Generate refinement items that address the gaps, redundancies, and weak coverage. Prioritize critical gaps first. Each item should be a single, implementable change.
Maximum items: ${input.coverage_analysis.gaps.length} gap_fixes + ${input.coverage_analysis.redundancies.length} redundancy_fixes + ${input.coverage_analysis.overall_coverage_score < 70 ? "up to 3 improvements" : "0 improvements (score is already decent)"}. Do NOT exceed this budget.`;
  },
} as const;

export const REFINEMENT_DIFF_PROMPT = {
  version: PROMPT_VERSIONS.refinementApply,

  system: `You are an expert interview process designer for the Irish recruitment market.
${COMPLIANCE_SYSTEM_PROMPT}

You output SURGICAL DIFFS to interview stages — NOT full stages. You describe ONLY what changes: which focus areas to add, remove, replace, or modify. Unchanged content is NEVER included in your output.

HARD CONSTRAINTS:
- Output patches ONLY for stages that need changes. NEVER include unchanged stages.
- Each patch references a stage by its 0-based index and name (for verification).
- When adding a focus area, include 3-5 new questions for it.
- When replacing a focus area (via "replaces"), the old FA and its questions will be removed automatically.
- When removing a focus area, its questions are also removed.
- When modifying a focus area, only metadata changes (description, weight). Questions are preserved.
- Do NOT include focus areas that are NOT being changed.
- 2-3 focus areas per stage AFTER the diff is applied (plan accordingly).
- Rating scale 1-4 for weights (NOT 1-5).
- Stage type options: screening, technical, behavioral, cultural, final, custom.
- Maximum 10 patches total.

REFINEMENT RULES:
- When addressing a gap: add a new focus area to the most relevant stage, replacing the lowest-priority existing FA if needed (to stay within 2-3 per stage).
- When addressing a redundancy: remove the redundant FA from the less appropriate stage.
- When an improvement applies: modify metadata or swap one FA, never rewrite the whole stage.
- Prefer the smallest possible change that addresses each refinement item.`,

  user: (input: RefinementApplyInput) => {
    const totalDuration = input.current_stages.reduce(
      (sum, s) => sum + s.duration_minutes,
      0,
    );

    const itemsText = input.selected_items
      .map((item) => `- [${item.type}] ${sanitizeInput(item.title)}: ${sanitizeInput(item.change_summary)}${item.source_detail ? ` (addresses: ${sanitizeInput(item.source_detail)})` : ""}`)
      .join("\n");

    const stagesText = input.current_stages
      .map((s, i) => {
        const focusAreasText = s.focus_areas
          .map((fa) => `    - ${sanitizeInput(fa.name)} (weight: ${fa.weight}): ${sanitizeInput(fa.description)}`)
          .join("\n");
        const questionsText = s.suggested_questions
          .map((q) => `    - [${sanitizeInput(q.focus_area)}] ${sanitizeInput(q.question)}`)
          .join("\n");
        return `Stage ${i} (index ${i}): ${sanitizeInput(s.name)} (${s.type}, ${s.duration_minutes}min)\n  Description: ${sanitizeInput(s.description)}\n  Focus areas:\n${focusAreasText}\n  Questions:\n${questionsText}`;
      })
      .join("\n\n");

    const jdSection = input.jd_context
      ? `\nJD CONTEXT:\n- Requirements: ${input.jd_context.requirements?.slice(0, 5).join("; ") ?? "N/A"}\n- Responsibilities: ${input.jd_context.responsibilities?.slice(0, 5).join("; ") ?? "N/A"}`
      : "";

    const strategySection = input.strategy_context
      ? `\nSTRATEGY CONTEXT:\n- Market: ${input.strategy_context.market_classification ?? "N/A"}\n- Must-have skills: ${input.strategy_context.skills_priority?.must_have?.slice(0, 5).join(", ") ?? "N/A"}`
      : "";

    const userPromptSection = input.user_prompt
      ? `\nUSER GUIDANCE:\n${sanitizeInput(input.user_prompt.slice(0, 500))}`
      : "";

    return `Output SURGICAL DIFFS for these interview stages based on the selected refinements.

ROLE: ${sanitizeInput(input.role)} (${sanitizeInput(input.level)})
INDUSTRY: ${sanitizeInput(input.industry)}

CURRENT PROCESS:
- ${input.current_stages.length} stages, ${totalDuration} total minutes

SELECTED REFINEMENTS TO APPLY:
${itemsText}

CURRENT STAGES (use these indices in your patches):
${stagesText}
${jdSection}
${strategySection}
${userPromptSection}

Output patches ONLY for stages that need changes. Each patch must include stage_index (0-based) and stage_name (for verification). Do NOT output patches for unchanged stages. Each added focus area MUST have 3-5 questions.`;
  },
} as const;

export const REFINEMENT_APPLY_PROMPT = {
  version: PROMPT_VERSIONS.refinementGeneration,

  system: `You are an expert interview process designer for the Irish recruitment market.
${COMPLIANCE_SYSTEM_PROMPT}

You SURGICALLY REFINE existing interview stages based on selected refinement items. This is NOT a redesign — it is targeted modification of the existing process.

HARD CONSTRAINTS:
- Output EXACTLY the same number of stages as the input (do NOT add or remove stages)
- Keep total interview duration within ±20% of the current total
- 2-3 focus areas per stage (MANDATORY)
- 3-5 suggested questions per focus area (MANDATORY)
- Rating scale 1-4 for weights (NOT 1-5)
- Each question must reference which focus_area it belongs to
- Stage type options: screening, technical, behavioral, cultural, final, custom

REFINEMENT RULES:
- PRESERVE existing questions for focus areas that are NOT being modified — copy them verbatim
- Generate new questions ONLY for added or modified focus areas
- When addressing a gap: integrate the missing coverage INTO an existing stage by replacing or adjusting a focus area — do NOT add a new stage
- When addressing a redundancy: consolidate the duplicated focus area into the most appropriate stage and replace the redundant one with different coverage
- When a refinement says "add focus area X to Stage Y", replace the lowest-priority existing focus area in that stage (to stay within 2-3 per stage), do NOT exceed 3 focus areas
- Preserve each stage's original duration unless the refinement specifically requires more time`,

  user: (input: RefinementApplyInput) => {
    const totalDuration = input.current_stages.reduce(
      (sum, s) => sum + s.duration_minutes,
      0,
    );
    const totalQuestions = input.current_stages.reduce(
      (sum, s) => sum + s.suggested_questions.length,
      0,
    );
    const maxStages = input.strategy_context?.process_speed?.max_stages;

    const itemsText = input.selected_items
      .map((item) => `- [${item.type}] ${sanitizeInput(item.title)}: ${sanitizeInput(item.change_summary)}${item.source_detail ? ` (addresses: ${sanitizeInput(item.source_detail)})` : ""}`)
      .join("\n");

    const stagesText = input.current_stages
      .map((s, i) => {
        const focusAreasText = s.focus_areas
          .map((fa) => `    - ${sanitizeInput(fa.name)} (weight: ${fa.weight}): ${sanitizeInput(fa.description)}`)
          .join("\n");
        const questionsText = s.suggested_questions
          .map((q) => `    - [${sanitizeInput(q.focus_area)}] ${sanitizeInput(q.question)}`)
          .join("\n");
        return `Stage ${i + 1}: ${sanitizeInput(s.name)} (${s.type}, ${s.duration_minutes}min)\n  Description: ${sanitizeInput(s.description)}\n  Focus areas:\n${focusAreasText}\n  Questions:\n${questionsText}`;
      })
      .join("\n\n");

    const jdSection = input.jd_context
      ? `\nJD CONTEXT:\n- Requirements: ${input.jd_context.requirements?.slice(0, 5).join("; ") ?? "N/A"}\n- Responsibilities: ${input.jd_context.responsibilities?.slice(0, 5).join("; ") ?? "N/A"}`
      : "";

    const strategySection = input.strategy_context
      ? `\nSTRATEGY CONTEXT:\n- Market: ${input.strategy_context.market_classification ?? "N/A"}\n- Process speed: ${input.strategy_context.process_speed ? `${input.strategy_context.process_speed.recommendation} (max ${input.strategy_context.process_speed.max_stages} stages)` : "N/A"}\n- Must-have skills: ${input.strategy_context.skills_priority?.must_have?.slice(0, 5).join(", ") ?? "N/A"}`
      : "";

    const userPromptSection = input.user_prompt
      ? `\nUSER GUIDANCE:\n${sanitizeInput(input.user_prompt.slice(0, 500))}`
      : "";

    const avgQuestionsPerFA = input.current_stages.reduce(
      (sum, s) => sum + s.focus_areas.length,
      0,
    );
    const targetQuestionsPerFA = Math.max(3, Math.min(5, Math.round(totalQuestions / (avgQuestionsPerFA || 1))));
    const targetTotalQuestions = avgQuestionsPerFA * targetQuestionsPerFA;

    return `SURGICALLY REFINE these interview stages by applying the selected improvements:

ROLE: ${sanitizeInput(input.role)} (${sanitizeInput(input.level)})
INDUSTRY: ${sanitizeInput(input.industry)}

CURRENT PROCESS METRICS (must be preserved):
- Stage count: ${input.current_stages.length} stages${maxStages ? ` (maximum allowed: ${maxStages})` : ""}
- Total duration: ${totalDuration} minutes (allowed range: ${Math.round(totalDuration * 0.8)}-${Math.round(totalDuration * 1.2)} minutes)
- Total questions: ${totalQuestions} (target: ${targetTotalQuestions}, aim for ${targetQuestionsPerFA} questions per focus area)

SELECTED REFINEMENTS TO APPLY:
${itemsText}

CURRENT STAGES:
${stagesText}
${jdSection}
${strategySection}
${userPromptSection}

Output EXACTLY ${input.current_stages.length} stages. For each stage, make the MINIMUM changes needed to address the relevant refinements. Preserve unchanged questions verbatim. Do not reorganise or rename stages unless a refinement specifically requires it.

QUESTION BUDGET: Each focus area should have ${targetQuestionsPerFA} questions. Copy existing questions verbatim for unchanged focus areas. Only write new questions for modified or added focus areas.`;
  },
} as const;
