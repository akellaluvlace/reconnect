import { z } from "zod";

export const CoverageAnalysisSchema = z.object({
  requirements_covered: z.array(
    z.object({
      requirement: z.string(),
      covered_by_stage: z.string(),
      covered_by_focus_area: z.string(),
      coverage_strength: z.enum(["strong", "moderate", "weak"]),
    }),
  ),
  gaps: z.array(
    z.object({
      requirement: z.string(),
      severity: z.enum(["critical", "important", "minor"]),
      suggestion: z.string(),
    }),
  ),
  redundancies: z.array(
    z.object({
      focus_area: z.string(),
      appears_in_stages: z.array(z.string()),
      recommendation: z.string(),
    }),
  ),
  recommendations: z.array(z.string()).min(1).max(8),
  overall_coverage_score: z.number().min(0).max(100),
  disclaimer: z.string(),
});

export type CoverageAnalysisOutput = z.infer<typeof CoverageAnalysisSchema>;
