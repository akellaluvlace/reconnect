import { callClaude } from "../client";
import {
  InterviewStagesSchema,
  QuestionsForFocusAreaSchema,
  type InterviewStagesOutput,
  type QuestionsForFocusAreaOutput,
} from "../schemas";
import {
  STAGE_GENERATION_PROMPT,
  QUESTION_GENERATION_PROMPT,
  type StageGenerationInput,
  type QuestionGenerationInput,
} from "../prompts/stage-generation";
import { PROMPT_VERSIONS } from "../config";
import { withRetry, withModelEscalation } from "../retry";

export interface StagePipelineInput {
  role: string;
  level: string;
  industry: string;
  stage_count?: number;
  jd_context?: StageGenerationInput["jd_context"];
  strategy_context?: StageGenerationInput["strategy_context"];
}

export interface StagePipelineResult {
  data: InterviewStagesOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}

/**
 * Generate interview stages with optional JD context injection.
 * Uses Sonnet for speed, escalates to Opus on failure.
 */
export async function generateStages(
  input: StagePipelineInput,
): Promise<StagePipelineResult> {
  const prompt = STAGE_GENERATION_PROMPT.user(input);

  const result = await withModelEscalation(
    (endpoint) =>
      withRetry(() =>
        callClaude({
          endpoint,
          schema: InterviewStagesSchema,
          prompt,
          systemPrompt: STAGE_GENERATION_PROMPT.system,
        }),
      ),
    "stageGeneration",
    "marketInsights", // Escalate to Opus on failure
  );

  return {
    data: result.data,
    metadata: {
      model_used: result.model,
      prompt_version: PROMPT_VERSIONS.stageGeneration,
      generated_at: new Date().toISOString(),
    },
  };
}

/**
 * Generate questions for a single focus area.
 */
export async function generateQuestions(
  input: QuestionGenerationInput,
): Promise<{
  data: QuestionsForFocusAreaOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}> {
  const prompt = QUESTION_GENERATION_PROMPT.user(input);

  const result = await withRetry(() =>
    callClaude({
      endpoint: "questionGeneration",
      schema: QuestionsForFocusAreaSchema,
      prompt,
      systemPrompt: QUESTION_GENERATION_PROMPT.system,
    }),
  );

  return {
    data: result.data,
    metadata: {
      model_used: result.model,
      prompt_version: PROMPT_VERSIONS.stageGeneration,
      generated_at: new Date().toISOString(),
    },
  };
}
