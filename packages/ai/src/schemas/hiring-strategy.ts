import { z } from "zod";

export const HiringStrategySchema = z.object({
  market_classification: z.enum([
    "employer_market",
    "balanced",
    "candidate_market",
  ]),
  market_classification_rationale: z.string(),
  salary_positioning: z.object({
    strategy: z.enum(["lead", "match", "lag"]),
    rationale: z.string(),
    recommended_range: z.object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    }),
  }),
  process_speed: z.object({
    recommendation: z.enum(["fast_track", "standard", "thorough"]),
    rationale: z.string(),
    max_stages: z.number().int().min(2).max(8),
    target_days: z.number().int().min(5).max(90),
  }),
  competitive_differentiators: z.array(z.string()).min(1).max(8),
  skills_priority: z.object({
    must_have: z.array(z.string()).min(1).max(10),
    nice_to_have: z.array(z.string()).max(10),
    emerging_premium: z.array(z.string()).max(5),
  }),
  key_risks: z
    .array(
      z.object({
        risk: z.string(),
        mitigation: z.string(),
      }),
    )
    .min(1)
    .max(6),
  recommendations: z.array(z.string()).min(1).max(8),
  disclaimer: z.string(),
});

export type HiringStrategyOutput = z.infer<typeof HiringStrategySchema>;
