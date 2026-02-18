import { z } from "zod";

// NO hire/no-hire recommendation — highlights only (client decision)
export const FeedbackSynthesisSchema = z.object({
  summary: z.string(),
  consensus: z.object({
    areas_of_agreement: z.array(z.string()),
    areas_of_disagreement: z.array(z.string()),
  }),
  key_strengths: z.array(z.string()),
  key_concerns: z.array(z.string()),
  discussion_points: z.array(z.string()),
  rating_overview: z.object({
    average_score: z.number(),
    total_feedback_count: z.number(),
    score_distribution: z.array(
      z.object({
        score: z.number().min(1).max(4),
        count: z.number(),
      }),
    ),
  }),
  // MANDATORY — EU AI Act compliance
  disclaimer: z.string(),
});

export type FeedbackSynthesisOutput = z.infer<typeof FeedbackSynthesisSchema>;
