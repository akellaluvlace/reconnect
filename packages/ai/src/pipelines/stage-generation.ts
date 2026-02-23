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
import { PipelineTrace, checkParams } from "../tracer";

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
  const trace = new PipelineTrace("generateStages");

  // --- Step 1: Validate input params ---
  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    industry: input.industry,
    stage_count: input.stage_count ?? "default",
    has_jd_context: !!input.jd_context,
    has_strategy_context: !!input.strategy_context,
    jd_context_keys: input.jd_context ? Object.keys(input.jd_context) : [],
    strategy_context_keys: input.strategy_context ? Object.keys(input.strategy_context) : [],
  });
  const inputWarnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "industry"],
    ["jd_context", "strategy_context"],
  );

  // Check context objects for empty sub-fields
  if (input.jd_context) {
    if (!input.jd_context.responsibilities?.length) inputWarnings.push("jd_context.responsibilities is empty — stage generation won't align with JD duties");
    if (!input.jd_context.requirements?.length) inputWarnings.push("jd_context.requirements is empty — stage generation won't align with JD requirements");
  }
  if (input.strategy_context) {
    if (!input.strategy_context.process_speed) inputWarnings.push("strategy_context.process_speed is missing — stage count won't adapt to market conditions");
    if (!input.strategy_context.skills_priority) inputWarnings.push("strategy_context.skills_priority is missing — focus areas won't prioritize key skills");
  }
  s1.ok({ warnings_count: inputWarnings.length }, inputWarnings);

  // --- Step 2: Build prompt ---
  const s2 = trace.step("build-prompt", {
    prompt_version: PROMPT_VERSIONS.stageGeneration,
    schema: "InterviewStagesSchema",
    schema_bounds: {
      focus_areas: "min(1) max(5)",
      suggested_questions: "min(3) max(20)",
      weight: "int min(1) max(4)",
    },
  });
  let prompt: string;
  try {
    prompt = STAGE_GENERATION_PROMPT.user(input);
    s2.ok({ prompt_length: prompt.length });
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }

  // --- Step 3: Call Claude with retry + escalation ---
  const s3 = trace.step("call-claude", {
    primary_endpoint: "stageGeneration",
    fallback_endpoint: "marketInsights",
    schema: "InterviewStagesSchema",
  });
  try {
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
      "marketInsights",
    );

    // --- Step 4: Validate output shape ---
    const s4 = trace.step("validate-output", {
      stages_count: result.data.stages.length,
      model_used: result.model,
    });

    const outputWarnings: string[] = [];
    for (let i = 0; i < result.data.stages.length; i++) {
      const stage = result.data.stages[i];
      if (stage.focus_areas.length < 2) {
        outputWarnings.push(`stage[${i}] "${stage.name}" has only ${stage.focus_areas.length} focus area(s) — prompt asks for 2-3`);
      }
      if (stage.suggested_questions.length < 6) {
        outputWarnings.push(`stage[${i}] "${stage.name}" has only ${stage.suggested_questions.length} questions — prompt asks for 6+`);
      }
      for (const fa of stage.focus_areas) {
        if (fa.weight < 1 || fa.weight > 4) {
          outputWarnings.push(`stage[${i}] focus_area "${fa.name}" has weight=${fa.weight} — should be 1-4`);
        }
      }
      // Check question-to-focus_area alignment
      const focusNames = new Set(stage.focus_areas.map((f) => f.name));
      for (const q of stage.suggested_questions) {
        if (!focusNames.has(q.focus_area)) {
          outputWarnings.push(`stage[${i}] question references focus_area "${q.focus_area}" which doesn't exist in this stage`);
        }
      }
    }

    s4.ok(
      {
        stages: result.data.stages.map((s) => ({
          name: s.name,
          type: s.type,
          focus_areas: s.focus_areas.length,
          questions: s.suggested_questions.length,
          duration: s.duration_minutes,
        })),
      },
      outputWarnings,
    );

    s3.ok({
      model: result.model,
      stages_count: result.data.stages.length,
    });

    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.stageGeneration,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s3.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
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
  const trace = new PipelineTrace("generateQuestions");

  const s1 = trace.step("validate-input", {
    role: input.role,
    level: input.level,
    stage_type: input.stage_type,
    focus_area: input.focus_area,
    focus_area_description: input.focus_area_description,
    existing_questions_count: input.existing_questions?.length ?? 0,
  });
  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["role", "level", "stage_type", "focus_area", "focus_area_description"],
  );
  s1.ok({}, warnings);

  const s2 = trace.step("call-claude", {
    endpoint: "questionGeneration",
    schema: "QuestionsForFocusAreaSchema",
    schema_bounds: { questions: "min(3) max(5)" },
  });

  try {
    const prompt = QUESTION_GENERATION_PROMPT.user(input);
    const result = await withRetry(() =>
      callClaude({
        endpoint: "questionGeneration",
        schema: QuestionsForFocusAreaSchema,
        prompt,
        systemPrompt: QUESTION_GENERATION_PROMPT.system,
      }),
    );

    s2.ok({
      model: result.model,
      questions_count: result.data.questions.length,
      focus_area: result.data.focus_area,
    });
    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.stageGeneration,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}
