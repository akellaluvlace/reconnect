import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

export interface StageGenerationInput {
  role: string;
  level: string;
  industry: string;
  stage_count?: number;
  jd_context?: {
    responsibilities?: string[];
    requirements?: string[];
    seniority_signals?: string[];
  };
  strategy_context?: {
    market_classification?: string;
    process_speed?: { recommendation: string; max_stages: number; target_days: number };
    skills_priority?: { must_have: string[]; nice_to_have: string[] };
    competitive_differentiators?: string[];
  };
}

export const STAGE_GENERATION_PROMPT = {
  version: PROMPT_VERSIONS.stageGeneration,

  system: `You are an expert interview process designer for the Irish recruitment market.
${COMPLIANCE_SYSTEM_PROMPT}

Design structured interview processes with:
- 2-3 focus areas per stage (MANDATORY — do not exceed 3)
- 3-5 suggested questions per focus area (MANDATORY — do not exceed 5)
- Rating scale 1-4 for weights (NOT 1-5)
- Clear purpose and look_for criteria for each question
- Each question must reference which focus_area it belongs to`,

  user: (input: StageGenerationInput) => {
    const jdSection = input.jd_context
      ? `
JD CONTEXT (use to tailor interview focus):
- Key responsibilities: ${input.jd_context.responsibilities?.slice(0, 5).join("; ") ?? "N/A"}
- Core requirements: ${input.jd_context.requirements?.slice(0, 5).join("; ") ?? "N/A"}
- Seniority signals: ${input.jd_context.seniority_signals?.join("; ") ?? "N/A"}`
      : "";

    const strategySection = input.strategy_context
      ? `
STRATEGY CONTEXT (align stages with hiring strategy):
- Market: ${input.strategy_context.market_classification ?? "N/A"}
- Process speed: ${input.strategy_context.process_speed ? `${input.strategy_context.process_speed.recommendation} (max ${input.strategy_context.process_speed.max_stages} stages, target ${input.strategy_context.process_speed.target_days} days)` : "N/A"}
- Must-have skills: ${input.strategy_context.skills_priority?.must_have?.slice(0, 5).join(", ") ?? "N/A"}
- Nice-to-have skills: ${input.strategy_context.skills_priority?.nice_to_have?.slice(0, 5).join(", ") ?? "N/A"}
- Differentiators: ${input.strategy_context.competitive_differentiators?.slice(0, 3).join("; ") ?? "N/A"}`
      : "";

    const stageCount = input.strategy_context?.process_speed?.max_stages
      ?? input.stage_count
      ?? "3-5 (recommend based on seniority)";

    return `Design an interview process for:
- Role: ${sanitizeInput(input.role)}
- Level: ${sanitizeInput(input.level)}
- Industry: ${sanitizeInput(input.industry)}
- Number of stages: ${stageCount}
${jdSection}
${strategySection}

For each stage, provide:
- name, type, duration_minutes, description
- rationale: WHY this stage matters for this specific role and market context
- 2-3 focus_areas with name, description, weight (1-4), and rationale (WHY this focus area is important)
- 3-5 suggested_questions per focus area with question, purpose, look_for array, and focus_area reference

Stage type options: screening, technical, behavioral, cultural, final, custom

Discipline awareness:
- Engineering roles: Include coding/system design stages
- Design roles: Include portfolio review stages
- Sales roles: Include role-play/presentation stages
- Management roles: Include leadership scenario stages`;
  },
} as const;

export interface QuestionGenerationInput {
  role: string;
  level: string;
  focus_area: string;
  focus_area_description: string;
  stage_type: string;
  existing_questions?: string[];
}

export const QUESTION_GENERATION_PROMPT = {
  version: PROMPT_VERSIONS.stageGeneration,

  system: `You are an expert interview question designer.
${COMPLIANCE_SYSTEM_PROMPT}

Generate 3-5 targeted interview questions for a specific focus area.
Each question must have a clear purpose and specific things to look for in the answer.
Questions should be open-ended and probe for depth of experience.`,

  user: (input: QuestionGenerationInput) =>
    `Generate 3-5 interview questions for:
- Role: ${sanitizeInput(input.role)} (${sanitizeInput(input.level)})
- Focus area: ${sanitizeInput(input.focus_area)}
- Description: ${sanitizeInput(input.focus_area_description)}
- Stage type: ${sanitizeInput(input.stage_type)}
${input.existing_questions?.length ? `- Avoid overlap with: ${input.existing_questions.map(q => sanitizeInput(q)).join("; ")}` : ""}

Each question needs: question text, purpose, and look_for (array of specific things to evaluate in the answer).`,
} as const;
