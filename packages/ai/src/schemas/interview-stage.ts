import { z } from "zod";

export const FocusAreaSchema = z.object({
  name: z.string(),
  description: z.string(),
  weight: z.number().int().min(1).max(4),
  rationale: z.string().optional(),
});

export const SuggestedQuestionSchema = z.object({
  question: z.string(),
  purpose: z.string(),
  look_for: z.array(z.string()),
  focus_area: z.string(),
});

export const InterviewStageSchema = z.object({
  name: z.string(),
  type: z.enum([
    "screening",
    "technical",
    "behavioral",
    "cultural",
    "final",
    "custom",
  ]),
  duration_minutes: z.number(),
  description: z.string(),
  focus_areas: z.array(FocusAreaSchema).min(2).max(3),
  suggested_questions: z.array(SuggestedQuestionSchema).min(6).max(15),
  rationale: z.string().optional(),
});

export const InterviewStagesSchema = z.object({
  stages: z.array(InterviewStageSchema),
});

export type InterviewStageOutput = z.infer<typeof InterviewStageSchema>;
export type InterviewStagesOutput = z.infer<typeof InterviewStagesSchema>;

/** Schema for generating questions for a single focus area */
export const QuestionsForFocusAreaSchema = z.object({
  focus_area: z.string(),
  questions: z
    .array(
      z.object({
        question: z.string(),
        purpose: z.string(),
        look_for: z.array(z.string()),
      }),
    )
    .min(3)
    .max(5),
});

export type QuestionsForFocusAreaOutput = z.infer<
  typeof QuestionsForFocusAreaSchema
>;
