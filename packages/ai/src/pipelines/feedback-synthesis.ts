import { callClaude } from "../client";
import {
  FeedbackSynthesisSchema,
  type FeedbackSynthesisOutput,
} from "../schemas";
import {
  FEEDBACK_SYNTHESIS_PROMPT,
  truncateTranscript,
  type FeedbackSynthesisInput,
} from "../prompts/feedback-synthesis";
import { PROMPT_VERSIONS } from "../config";
import { withRetry } from "../retry";

export interface FeedbackSynthesisPipelineInput {
  candidate_name: string;
  role: string;
  stage_name: string;
  feedback_forms: FeedbackSynthesisInput["feedback_forms"];
  transcript?: string;
}

export interface FeedbackSynthesisPipelineResult {
  data: FeedbackSynthesisOutput;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
    transcript_included: boolean;
    transcript_truncated: boolean;
  };
}

/**
 * Synthesize interview feedback + optional transcript using Opus.
 * Transcript is truncated to fit within token budget.
 * Always uses Opus for accuracy (no model escalation).
 */
export async function synthesizeFeedback(
  input: FeedbackSynthesisPipelineInput,
): Promise<FeedbackSynthesisPipelineResult> {
  let transcriptSummary: string | undefined;
  let transcriptTruncated = false;

  if (input.transcript) {
    const truncated = truncateTranscript(input.transcript);
    transcriptTruncated = truncated !== input.transcript;
    transcriptSummary = truncated;
  }

  const prompt = FEEDBACK_SYNTHESIS_PROMPT.user({
    candidate_name: input.candidate_name,
    role: input.role,
    stage_name: input.stage_name,
    feedback_forms: input.feedback_forms,
    transcript_summary: transcriptSummary,
  });

  const result = await withRetry(() =>
    callClaude({
      endpoint: "feedbackSynthesis",
      schema: FeedbackSynthesisSchema,
      prompt,
      systemPrompt: FEEDBACK_SYNTHESIS_PROMPT.system,
    }),
  );

  return {
    data: result.data,
    metadata: {
      model_used: result.model,
      prompt_version: PROMPT_VERSIONS.feedbackSynthesis,
      generated_at: new Date().toISOString(),
      transcript_included: !!input.transcript,
      transcript_truncated: transcriptTruncated,
    },
  };
}
