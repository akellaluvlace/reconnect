import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

export interface CandidateProfileInput {
  role: string;
  level: string;
  industry: string;
  jd_requirements?: {
    required: string[];
    preferred: string[];
  };
  strategy_skills_priority?: {
    must_have: string[];
    nice_to_have: string[];
  };
  market_key_skills?: {
    required: string[];
    emerging: string[];
  };
}

export const CANDIDATE_PROFILE_PROMPT = {
  version: PROMPT_VERSIONS.candidateProfile,

  system: `You are a senior recruitment profile specialist focused on the Irish and European market.
${COMPLIANCE_SYSTEM_PROMPT}

Build an ideal candidate profile based on role requirements, hiring strategy, and market data. Focus on practical, actionable criteria that help hiring teams evaluate candidates consistently.

Guidelines:
- Must-have skills should be genuinely essential, not a wish list
- Nice-to-have skills should add value but not be dealbreakers
- Experience range should be realistic for the level
- Cultural fit indicators should be observable and text-based (no personality inference)
- Always include the mandatory disclaimer`,

  user: (input: CandidateProfileInput) => {
    const jdSection = input.jd_requirements
      ? `\nJD REQUIREMENTS:
- Required: ${input.jd_requirements.required.slice(0, 10).join(", ")}
- Preferred: ${input.jd_requirements.preferred.slice(0, 10).join(", ")}`
      : "";

    const strategySection = input.strategy_skills_priority
      ? `\nSTRATEGY SKILLS PRIORITY:
- Must have: ${input.strategy_skills_priority.must_have.slice(0, 10).join(", ")}
- Nice to have: ${input.strategy_skills_priority.nice_to_have.slice(0, 10).join(", ")}`
      : "";

    const marketSection = input.market_key_skills
      ? `\nMARKET SKILLS DATA:
- In-demand: ${input.market_key_skills.required.slice(0, 8).join(", ")}
- Emerging: ${input.market_key_skills.emerging.slice(0, 5).join(", ")}`
      : "";

    return `Build an ideal candidate profile for:

ROLE: ${sanitizeInput(input.role)}
LEVEL: ${sanitizeInput(input.level)}
INDUSTRY: ${sanitizeInput(input.industry)}
${jdSection}${strategySection}${marketSection}

Produce:
1. ideal_background (brief description of ideal experience/background)
2. must_have_skills (essential skills, max 15)
3. nice_to_have_skills (desirable but not essential, max 15)
4. experience_range (e.g. "5-8 years" — realistic for the level)
5. cultural_fit_indicators (observable work-style indicators, max 10)
6. disclaimer`;
  },
} as const;
