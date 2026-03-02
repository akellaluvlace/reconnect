import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

export interface CoverageAnalysisInput {
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

export const COVERAGE_ANALYSIS_PROMPT = {
  version: PROMPT_VERSIONS.coverageAnalysis,

  system: `You are an interview process design auditor.
${COMPLIANCE_SYSTEM_PROMPT}

Analyze the alignment between job requirements and interview stages/focus areas. Map each requirement to the specific focus area that assesses it, identify gaps, and flag redundancies.

CRITICAL — Accuracy over optimism:
- The overall_coverage_score will be COMPUTED PROGRAMMATICALLY from your requirements_covered and gaps data. Your estimate is logged but overridden. Do not inflate coverage_strength to improve the score.
- A requirement is "strong" ONLY if a focus area directly and specifically assesses that exact skill/competency
- A requirement is "moderate" if a focus area partially overlaps or assesses a related but not identical skill
- A requirement is "weak" if coverage is tangential — the focus area might touch on it but doesn't specifically target it
- If a requirement is NOT covered by any focus area, it MUST appear in gaps — do not claim weak coverage for things that aren't assessed
- Be strict: vague focus areas like "Leadership Assessment" do NOT strongly cover specific requirements like "P&L management experience"

CALIBRATION EXAMPLES (follow these patterns):
- Requirement: "10+ years P&L management" + Focus area: "Financial Acumen: Assess understanding of financial metrics and budget management" → MODERATE (related but P&L management is more specific than general financial metrics)
- Requirement: "10+ years P&L management" + Focus area: "P&L Ownership: Evaluate experience managing P&L responsibility at scale" → STRONG (directly targets the requirement)
- Requirement: "Experience with agile methodologies" + Focus area: "Leadership Style: How they lead and motivate teams" → WEAK (leadership might touch on agile but doesn't specifically assess methodology knowledge)
- Requirement: "Healthcare industry experience" + Focus area: "Industry Knowledge: Understanding of healthcare regulations and market dynamics" → STRONG
- Requirement: "Healthcare industry experience" + Focus area: "Strategic Vision: Long-term planning and market positioning" → WEAK (strategic vision in any industry, not healthcare-specific)
- If you would rate something "weak" and the connection requires 2+ logical leaps, it should be a GAP instead`,

  user: (input: CoverageAnalysisInput) => {
    const stagesText = input.stages
      .map(
        (s) =>
          `Stage: ${sanitizeInput(s.name)} (${s.type})\n  Focus areas: ${s.focus_areas.map((fa) => `${sanitizeInput(fa.name)}: ${sanitizeInput(fa.description)}`).join("; ")}`,
      )
      .join("\n");

    const totalRequirements = input.jd_requirements.required.length + input.jd_requirements.preferred.length;

    // Number each requirement so the AI can't skip any
    const numberedRequired = input.jd_requirements.required
      .map((r, i) => `  R${i + 1}. ${sanitizeInput(r)}`)
      .join("\n");
    const numberedPreferred = input.jd_requirements.preferred
      .map((r, i) => `  P${i + 1}. ${sanitizeInput(r)}`)
      .join("\n");

    return `Analyze the coverage of this interview process against the job requirements:

ROLE: ${sanitizeInput(input.role)} (${sanitizeInput(input.level)})

JD REQUIREMENTS — ${totalRequirements} total (${input.jd_requirements.required.length} required + ${input.jd_requirements.preferred.length} preferred):
Required:
${numberedRequired}
Preferred:
${numberedPreferred}
Responsibilities: ${input.jd_requirements.responsibilities.map((r) => sanitizeInput(r)).join("; ")}

INTERVIEW STAGES (${input.stages.length} stages, ${input.stages.reduce((sum, s) => sum + s.focus_areas.length, 0)} focus areas):
${stagesText}

COMPLETENESS RULE — MANDATORY:
You MUST evaluate ALL ${totalRequirements} requirements listed above (R1-R${input.jd_requirements.required.length} and P1-P${input.jd_requirements.preferred.length}).
Every requirement must appear EXACTLY ONCE — in EITHER requirements_covered OR gaps.
Do NOT list the same requirement multiple times. Map each requirement to the SINGLE best-matching focus area.
Your output must have exactly ${totalRequirements} entries total across requirements_covered + gaps.
If you produce fewer than ${totalRequirements}, your analysis is incomplete and will be rejected.

For each numbered requirement above:
- If a focus area assesses it → requirements_covered (with honest strength rating)
- If no focus area assesses it → gaps (with severity)

Be strict about strength ratings:
- "strong": the focus area's name and description specifically target this requirement
- "moderate": the focus area overlaps but doesn't directly target it
- "weak": only tangential connection
- If no focus area targets it at all → it's a gap, NOT weak coverage

Also identify:
- redundancies: focus areas that overlap significantly across stages
- recommendations: concrete improvements (max 8)
- overall_coverage_score: your estimate (will be recomputed programmatically)
- disclaimer`;
  },
} as const;
