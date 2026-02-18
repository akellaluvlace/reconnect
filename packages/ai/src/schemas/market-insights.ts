import { z } from "zod";

export const MarketInsightsSchema = z.object({
  phase: z.enum(["quick", "deep"]),
  salary: z.object({
    min: z.number(),
    max: z.number(),
    median: z.number(),
    currency: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  competition: z.object({
    companies_hiring: z.array(z.string()),
    job_postings_count: z.number(),
    market_saturation: z.enum(["low", "medium", "high"]),
  }),
  time_to_hire: z.object({
    average_days: z.number(),
    range: z.object({ min: z.number(), max: z.number() }),
  }),
  candidate_availability: z.object({
    level: z.enum(["scarce", "limited", "moderate", "abundant"]),
    description: z.string(),
  }),
  key_skills: z.object({
    required: z.array(z.string()),
    emerging: z.array(z.string()),
    declining: z.array(z.string()),
  }),
  trends: z.array(z.string()),
  sources: z
    .array(
      z.object({
        url: z.string(),
        title: z.string(),
        relevance_score: z.number().min(0).max(1),
        published_date: z.string().optional(),
      }),
    )
    .optional(),
  metadata: z.object({
    model_used: z.string(),
    prompt_version: z.string(),
    generated_at: z.string(),
    source_count: z.number(),
    confidence: z.number().min(0).max(1),
  }),
});

export type MarketInsightsOutput = z.infer<typeof MarketInsightsSchema>;

/** Schema for quick phase (no sources required) */
export const QuickMarketInsightsSchema = MarketInsightsSchema.omit({
  sources: true,
  metadata: true,
}).extend({
  phase: z.literal("quick"),
});

export type QuickMarketInsightsOutput = z.infer<
  typeof QuickMarketInsightsSchema
>;
