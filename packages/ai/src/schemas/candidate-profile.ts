import { z } from "zod";

export const CandidateProfileSchema = z.object({
  ideal_background: z.string().optional(),
  must_have_skills: z.array(z.string()).min(1).max(15).optional(),
  nice_to_have_skills: z.array(z.string()).max(15).optional(),
  experience_range: z.string().optional(),
  cultural_fit_indicators: z.array(z.string()).max(10).optional(),
  disclaimer: z.string(),
});

export type CandidateProfileOutput = z.infer<typeof CandidateProfileSchema>;
