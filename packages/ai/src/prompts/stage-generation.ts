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

    return `Design an interview process for:
- Role: ${sanitizeInput(input.role)}
- Level: ${sanitizeInput(input.level)}
- Industry: ${sanitizeInput(input.industry)}
- Number of stages: ${input.stage_count ?? "3-5 (recommend based on seniority)"}
${jdSection}

For each stage, provide:
- name, type, duration_minutes, description
- 2-3 focus_areas with name, description, and weight (1-4)
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
