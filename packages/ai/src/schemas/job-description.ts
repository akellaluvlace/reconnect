import { z } from "zod";

export const JobDescriptionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.object({
    required: z.array(z.string()),
    preferred: z.array(z.string()),
  }),
  benefits: z.array(z.string()),
  salary_range: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    })
    .optional(),
  location: z.string().optional(),
  remote_policy: z.string().optional(),
  seniority_signals: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
});

export type JobDescriptionOutput = z.infer<typeof JobDescriptionSchema>;
