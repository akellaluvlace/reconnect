import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

export interface FeedbackSynthesisInput {
  candidate_name: string;
  role: string;
  stage_name: string;
  feedback_forms: Array<{
    interviewer_name: string;
    ratings: Array<{ category: string; score: number }>;
    pros: string[];
    cons: string[];
    notes?: string;
  }>;
  transcript_summary?: string;
}

export const FEEDBACK_SYNTHESIS_PROMPT = {
  version: PROMPT_VERSIONS.feedbackSynthesis,

  system: `You are an expert recruitment analyst synthesizing interview feedback.
${COMPLIANCE_SYSTEM_PROMPT}

CRITICAL RULES:
1. You MUST NOT recommend hiring or rejecting the candidate.
2. You MUST highlight strengths, concerns, and discussion points ONLY.
3. You MUST include the mandatory disclaimer.
4. You MUST use the 1-4 rating scale (NOT 1-5).
5. You analyze TEXT ONLY — no voice, video, or biometric analysis.
6. The disclaimer MUST be exactly: "This AI-generated content is for informational purposes only. All hiring decisions must be made by humans."`,

  user: (input: FeedbackSynthesisInput) => {
    const feedbackSection = input.feedback_forms
      .map(
        (f, i) => `
Interviewer ${i + 1} (${f.interviewer_name}):
Ratings: ${f.ratings.map((r) => `${r.category}: ${r.score}/4`).join(", ")}
Strengths: ${f.pros.join("; ")}
Concerns: ${f.cons.join("; ")}
${f.notes ? `Notes: ${f.notes}` : ""}`,
      )
      .join("\n");

    const transcriptSection = input.transcript_summary
      ? `\nTRANSCRIPT SUMMARY (text-only analysis):\n${input.transcript_summary}`
      : "";

    return `Synthesize interview feedback for ${sanitizeInput(input.candidate_name)} — ${sanitizeInput(input.role)}, ${sanitizeInput(input.stage_name)}:

FEEDBACK:
${feedbackSection}
${transcriptSection}

Provide:
- Summary of overall performance (factual, no recommendation)
- Areas where interviewers agree and disagree
- Key strengths highlighted across feedback
- Key concerns highlighted across feedback
- Discussion points for the hiring team to consider
- Rating overview with average score (1-4 scale), total feedback count, and score distribution

Do NOT include any hire/no-hire recommendation.
Include the mandatory disclaimer.`;
  },
} as const;

/** Max transcript tokens before truncation (soft limit) */
export const TRANSCRIPT_TOKEN_LIMIT = 150_000;

/**
 * Estimate token count from text (rough: 1 token ~ 4 chars).
 * For actual token counting, use the Anthropic tokenizer.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate transcript to fit within token budget.
 * Preserves the beginning (context) and end (conclusion).
 */
export function truncateTranscript(
  transcript: string,
  maxTokens: number = TRANSCRIPT_TOKEN_LIMIT,
): string {
  const estimated = estimateTokens(transcript);
  if (estimated <= maxTokens) return transcript;

  const maxChars = maxTokens * 4;
  const headSize = Math.floor(maxChars * 0.6);
  const tailSize = Math.floor(maxChars * 0.3);

  const head = transcript.slice(0, headSize);
  const tail = transcript.slice(-tailSize);

  return `${head}\n\n[... transcript truncated for length — ${estimated - maxTokens} tokens omitted ...]\n\n${tail}`;
}
