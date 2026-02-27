import { z } from "zod";

/** Schema for AI-generated search queries */
export const SearchQueriesSchema = z.object({
  queries: z.array(z.string()).min(4).max(12),
});

export type SearchQueriesOutput = z.infer<typeof SearchQueriesSchema>;

/** Schema for scoring a single source */
export const SourceScoreSchema = z.object({
  url: z.string(),
  title: z.string(),
  recency_score: z.number().min(0).max(1),
  authority_score: z.number().min(0).max(1),
  relevance_score: z.number().min(0).max(1),
  overall_score: z.number().min(0).max(1),
});

export const SourceScoringSchema = z.object({
  scored_sources: z.array(SourceScoreSchema),
});

export type SourceScoringOutput = z.infer<typeof SourceScoringSchema>;

/** Schema for extracting data from a single source */
export const SourceExtractionSchema = z.object({
  url: z.string(),
  salary_data: z
    .array(
      z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        median: z.number().optional(),
        currency: z.string(),
        role_match: z.number().min(0).max(1),
      }),
    )
    .optional(),
  companies_mentioned: z.array(z.string()).optional(),
  demand_signals: z.array(z.string()).optional(),
  skills_mentioned: z.array(z.string()).optional(),
  trends: z.array(z.string()).optional(),
  data_date: z.string().optional(),
  /** Only set when the source explicitly states a job posting count */
  estimated_postings: z.number().optional(),
});

export type SourceExtractionOutput = z.infer<typeof SourceExtractionSchema>;

/** Schema for batch extraction results */
export const BatchExtractionSchema = z.object({
  extractions: z.array(SourceExtractionSchema),
});

export type BatchExtractionOutput = z.infer<typeof BatchExtractionSchema>;
