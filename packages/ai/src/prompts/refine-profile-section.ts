import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

export interface RefineProfileSectionInput {
  section: string;
  current_value: string | string[];
  guidance?: string;
  context: {
    role: string;
    level: string;
    industry: string;
    hiring_strategy_summary?: string;
  };
}

export const REFINE_PROFILE_SECTION_PROMPT = {
  version: PROMPT_VERSIONS.profileRefine,

  system: `You are a senior recruitment profile specialist focused on the Irish and European market.
${COMPLIANCE_SYSTEM_PROMPT}

Refine a specific section of a candidate profile. Produce 2-3 improved alternatives that are distinct from each other. Each alternative should be a genuine improvement, not just a rephrasing.

Guidelines:
- Must-have skills should be genuinely essential, not a wish list
- Nice-to-have skills should add value but not be dealbreakers
- Experience range should be realistic for the level
- Cultural fit indicators should be observable and text-based (no personality inference)
- If the section is a string, return each alternative value as a string
- If the section is an array (skills, indicators), return each alternative value as an array of strings`,

  user: (input: RefineProfileSectionInput) => {
    const currentDisplay = Array.isArray(input.current_value)
      ? input.current_value.join(", ")
      : input.current_value;

    const guidanceSection = input.guidance
      ? `\nUSER GUIDANCE: ${sanitizeInput(input.guidance)}`
      : "";

    const strategySection = input.context.hiring_strategy_summary
      ? `\nSTRATEGY CONTEXT: ${input.context.hiring_strategy_summary}`
      : "";

    return `Refine this candidate profile section.

ROLE: ${sanitizeInput(input.context.role)}
LEVEL: ${sanitizeInput(input.context.level)}
INDUSTRY: ${sanitizeInput(input.context.industry)}
${strategySection}

SECTION: ${sanitizeInput(input.section)}
CURRENT VALUE: ${sanitizeInput(currentDisplay)}
VALUE TYPE: ${Array.isArray(input.current_value) ? "array" : "string"}
${guidanceSection}

Produce 2-3 alternative values for this section. Each must be distinct and an improvement.
For array-type sections, return each alternative.value as an array of strings.
For string-type sections, return each alternative.value as a single string.
Include a brief rationale for each alternative.`;
  },
} as const;
