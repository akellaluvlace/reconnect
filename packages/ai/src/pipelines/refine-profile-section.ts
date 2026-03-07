import { callClaude } from "../client";
import {
  RefineProfileSectionSchema,
  type RefineProfileSectionOutput,
} from "../schemas/refine-profile-section";
import {
  REFINE_PROFILE_SECTION_PROMPT,
  type RefineProfileSectionInput,
} from "../prompts/refine-profile-section";
import { PROMPT_VERSIONS } from "../config";
import { withRetry } from "../retry";
import { PipelineTrace, checkParams } from "../tracer";

export type { RefineProfileSectionInput };

export interface RefineProfileSectionResult {
  data: RefineProfileSectionOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
  };
}

/**
 * Refine a specific section of a candidate profile with AI alternatives.
 */
export async function refineProfileSection(
  input: RefineProfileSectionInput,
): Promise<RefineProfileSectionResult> {
  const trace = new PipelineTrace("refineProfileSection");

  const s1 = trace.step("validate-input", {
    section: input.section,
    current_value_type: Array.isArray(input.current_value) ? "array" : "string",
    current_value_length: Array.isArray(input.current_value)
      ? input.current_value.length
      : input.current_value.length,
    has_guidance: !!input.guidance,
    role: input.context.role,
    has_strategy: !!input.context.hiring_strategy_summary,
  });
  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["section", "current_value"],
  );
  s1.ok({}, warnings);

  const s2 = trace.step("call-claude", {
    endpoint: "profileRefine",
    schema: "RefineProfileSectionSchema",
  });

  try {
    const prompt = REFINE_PROFILE_SECTION_PROMPT.user(input);
    const result = await withRetry(() =>
      callClaude({
        endpoint: "profileRefine",
        schema: RefineProfileSectionSchema,
        prompt,
        systemPrompt: REFINE_PROFILE_SECTION_PROMPT.system,
      }),
    );

    s2.ok({
      model: result.model,
      alternatives_count: result.data.alternatives.length,
    });
    trace.finish();

    return {
      data: result.data,
      metadata: {
        model_used: result.model,
        prompt_version: PROMPT_VERSIONS.profileRefine,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    s2.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}
