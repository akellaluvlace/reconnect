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

Analyze the alignment between job requirements and interview stages/focus areas. Identify coverage gaps, redundancies, and provide an overall coverage score.

Scoring guidelines:
- 90-100: Excellent coverage, all critical requirements addressed
- 70-89: Good coverage, minor gaps only
- 50-69: Moderate coverage, some important gaps
- Below 50: Poor coverage, critical gaps exist`,

  user: (input: CoverageAnalysisInput) => {
    const stagesText = input.stages
      .map(
        (s) =>
          `Stage: ${sanitizeInput(s.name)} (${s.type})\n  Focus areas: ${s.focus_areas.map((fa) => `${sanitizeInput(fa.name)}: ${sanitizeInput(fa.description)}`).join("; ")}`,
      )
      .join("\n");

    return `Analyze the coverage of this interview process against the job requirements:

ROLE: ${sanitizeInput(input.role)} (${sanitizeInput(input.level)})

JD REQUIREMENTS:
Required: ${input.jd_requirements.required.map((r) => sanitizeInput(r)).join("; ")}
Preferred: ${input.jd_requirements.preferred.map((r) => sanitizeInput(r)).join("; ")}
Responsibilities: ${input.jd_requirements.responsibilities.map((r) => sanitizeInput(r)).join("; ")}

INTERVIEW STAGES:
${stagesText}

Produce:
1. requirements_covered — map each requirement to the stage/focus area that covers it, with strength (strong/moderate/weak)
2. gaps — requirements not adequately covered, with severity (critical/important/minor) and suggestions
3. redundancies — focus areas that overlap across stages
4. recommendations — how to improve coverage
5. overall_coverage_score (0-100)
6. disclaimer`;
  },
} as const;
