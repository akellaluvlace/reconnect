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
import { PipelineTrace, checkParams } from "../tracer";

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
 */
export async function synthesizeFeedback(
  input: FeedbackSynthesisPipelineInput,
): Promise<FeedbackSynthesisPipelineResult> {
  const trace = new PipelineTrace("synthesizeFeedback");

  const s1 = trace.step("validate-input", {
    candidate: input.candidate_name,
    role: input.role,
    stage: input.stage_name,
    feedback_forms_count: input.feedback_forms.length,
    has_transcript: !!input.transcript,
    transcript_length: input.transcript?.length ?? 0,
    feedback_scores: input.feedback_forms.map((f) => ({
      interviewer: f.interviewer_name ?? "anonymous",
      ratings_count: f.ratings?.length ?? 0,
      has_pros: !!(f.pros && f.pros.length > 0),
      has_cons: !!(f.cons && f.cons.length > 0),
    })),
  });

  const warnings = checkParams(
    input as unknown as Record<string, unknown>,
    ["candidate_name", "role", "stage_name", "feedback_forms"],
    ["transcript"],
  );
  if (input.feedback_forms.length === 0) warnings.push("No feedback forms — synthesis will have nothing to work with");
  if (input.feedback_forms.length === 1) warnings.push("Only 1 feedback form — consensus analysis will be limited");
  s1.ok({}, warnings);

  // --- Transcript handling ---
  let transcriptSummary: string | undefined;
  let transcriptTruncated = false;

  if (input.transcript) {
    const s2 = trace.step("truncate-transcript", {
      original_length: input.transcript.length,
    });
    const truncated = truncateTranscript(input.transcript);
    transcriptTruncated = truncated !== input.transcript;
    transcriptSummary = truncated;
    s2.ok({
      truncated_length: truncated.length,
      was_truncated: transcriptTruncated,
    });
  }

  // --- Call Claude ---
  const s3 = trace.step("call-claude", {
    endpoint: "feedbackSynthesis",
    schema: "FeedbackSynthesisSchema",
    rating_scale: "1-4",
  });

  try {
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

    const s4 = trace.step("validate-output", {
      summary_length: result.data.summary.length,
      agreements: result.data.consensus.areas_of_agreement.length,
      disagreements: result.data.consensus.areas_of_disagreement.length,
      strengths: result.data.key_strengths.length,
      concerns: result.data.key_concerns.length,
      discussion_points: result.data.discussion_points.length,
      average_score: result.data.rating_overview.average_score,
      feedback_count: result.data.rating_overview.total_feedback_count,
      has_disclaimer: !!result.data.disclaimer,
    });

    const outWarnings: string[] = [];
    if (!result.data.disclaimer) outWarnings.push("CRITICAL: Missing disclaimer");
    if (result.data.rating_overview.average_score > 4) outWarnings.push(`average_score=${result.data.rating_overview.average_score} — exceeds 1-4 scale`);
    if (result.data.rating_overview.total_feedback_count !== input.feedback_forms.length) {
      outWarnings.push(`total_feedback_count=${result.data.rating_overview.total_feedback_count} but input had ${input.feedback_forms.length} forms — mismatch`);
    }
    s4.ok({}, outWarnings);

    s3.ok({ model: result.model });
    trace.finish();

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
  } catch (err) {
    s3.fail(err instanceof Error ? err.message : String(err));
    trace.finish();
    throw err;
  }
}
