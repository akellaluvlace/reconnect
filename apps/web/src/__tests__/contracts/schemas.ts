/**
 * Consumer-driven contract schemas.
 *
 * These Zod schemas describe what API CONSUMERS (UI components, hooks, other
 * routes) actually destructure from each response.  They are intentionally
 * looser than the producer schemas in @reconnect/ai — a contract test passes
 * when the response is a *superset* of what the consumer needs.
 *
 * Use `.passthrough()` on object schemas so extra fields do not cause failures.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** Every AI route wraps its payload in { data, metadata }. */
export const AIMetadataSchema = z
  .object({
    model_used: z.string().optional(),
    model: z.string().optional(),
    prompt_version: z.string(),
  })
  .passthrough();

/** Standard AI response envelope: { data: T, metadata } */
export function aiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z
    .object({
      data: dataSchema,
      metadata: AIMetadataSchema,
    })
    .passthrough();
}

/** Standard error response. */
export const ErrorResponseSchema = z
  .object({
    error: z.string(),
    issues: z
      .array(
        z
          .object({
            message: z.string(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

/** Simple success response (DELETE, consent, etc.) */
export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// AI data shape schemas (consumer-side expectations)
// ---------------------------------------------------------------------------

/**
 * Feedback synthesis — matches FeedbackSynthesisSchema from @reconnect/ai.
 * Consumer cares about: key_strengths, key_concerns, consensus shape,
 * rating_overview structure, and mandatory disclaimer.
 */
export const SynthesisDataSchema = z
  .object({
    summary: z.string(),
    consensus: z
      .object({
        areas_of_agreement: z.array(z.string()),
        areas_of_disagreement: z.array(z.string()),
      })
      .passthrough(),
    key_strengths: z.array(z.string()),
    key_concerns: z.array(z.string()),
    discussion_points: z.array(z.string()),
    rating_overview: z
      .object({
        average_score: z.number().min(1).max(4),
        total_feedback_count: z.number(),
        score_distribution: z.array(
          z
            .object({
              score: z.number().min(1).max(4),
              count: z.number(),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
    disclaimer: z.string(),
  })
  .passthrough();

/**
 * Candidate profile — matches CandidateProfileSchema from @reconnect/ai.
 */
export const CandidateProfileDataSchema = z
  .object({
    ideal_background: z.string().optional(),
    must_have_skills: z.array(z.string()).optional(),
    nice_to_have_skills: z.array(z.string()).optional(),
    experience_range: z.string().optional(),
    cultural_fit_indicators: z.array(z.string()).optional(),
    disclaimer: z.string(),
  })
  .passthrough();

/**
 * Hiring strategy — matches HiringStrategySchema from @reconnect/ai.
 */
export const HiringStrategyDataSchema = z
  .object({
    market_classification: z.enum([
      "employer_market",
      "balanced",
      "candidate_market",
    ]),
    skills_priority: z
      .object({
        must_have: z.array(z.string()),
        nice_to_have: z.array(z.string()),
        emerging_premium: z.array(z.string()),
      })
      .passthrough(),
    disclaimer: z.string(),
  })
  .passthrough();

/**
 * Coverage analysis — matches CoverageAnalysisSchema from @reconnect/ai.
 */
export const CoverageAnalysisDataSchema = z
  .object({
    requirements_covered: z.array(
      z
        .object({
          requirement: z.string(),
          covered_by_stage: z.string(),
          covered_by_focus_area: z.string(),
          coverage_strength: z.enum(["strong", "moderate", "weak"]),
        })
        .passthrough(),
    ),
    gaps: z.array(
      z
        .object({
          requirement: z.string(),
          severity: z.enum(["critical", "important", "minor"]),
          suggestion: z.string(),
        })
        .passthrough(),
    ),
    redundancies: z.array(
      z
        .object({
          focus_area: z.string(),
          appears_in_stages: z.array(z.string()),
          recommendation: z.string(),
        })
        .passthrough(),
    ),
    recommendations: z.array(z.string()),
    overall_coverage_score: z.number().min(0).max(100),
    disclaimer: z.string(),
  })
  .passthrough();

/**
 * Job description — matches JobDescriptionSchema from @reconnect/ai.
 */
export const JobDescriptionDataSchema = z
  .object({
    title: z.string(),
    summary: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z
      .object({
        required: z.array(z.string()),
        preferred: z.array(z.string()),
      })
      .passthrough(),
    benefits: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  })
  .passthrough();

/**
 * Interview stages — matches InterviewStagesSchema from @reconnect/ai.
 */
export const InterviewStagesDataSchema = z
  .object({
    stages: z.array(
      z
        .object({
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
          focus_areas: z.array(
            z
              .object({
                name: z.string(),
                description: z.string(),
                weight: z.number().int().min(1).max(4),
              })
              .passthrough(),
          ),
          suggested_questions: z.array(
            z
              .object({
                question: z.string(),
                purpose: z.string(),
                look_for: z.array(z.string()),
                focus_area: z.string(),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Composed AI response schemas
// ---------------------------------------------------------------------------

export const SynthesisResponseSchema = aiResponseSchema(SynthesisDataSchema);
export const CandidateProfileResponseSchema = aiResponseSchema(
  CandidateProfileDataSchema,
);
export const HiringStrategyResponseSchema = aiResponseSchema(
  HiringStrategyDataSchema,
);
export const CoverageAnalysisResponseSchema = aiResponseSchema(
  CoverageAnalysisDataSchema,
);
export const JobDescriptionResponseSchema = aiResponseSchema(
  JobDescriptionDataSchema,
);
export const InterviewStagesResponseSchema = aiResponseSchema(
  InterviewStagesDataSchema,
);

// ---------------------------------------------------------------------------
// CRUD route response schemas
// ---------------------------------------------------------------------------

/** GET /api/collaborators — returns { data: collaborator[] } */
export const CollaboratorsListResponseSchema = z
  .object({
    data: z.array(
      z
        .object({
          id: z.string(),
          email: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

/** POST /api/collaborators/invite — returns { collaborator: {...} } */
export const CollaboratorInviteResponseSchema = z
  .object({
    collaborator: z
      .object({
        id: z.string(),
        email: z.string(),
        invite_token: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

/** POST /api/share-links — returns { data: {...} } */
export const ShareLinkResponseSchema = z
  .object({
    data: z
      .object({
        id: z.string(),
        token: z.string(),
        is_active: z.boolean(),
        expires_at: z.string(),
        view_count: z.number(),
      })
      .passthrough(),
  })
  .passthrough();

/** GET /api/share-links — returns { data: link[] } */
export const ShareLinksListResponseSchema = z
  .object({
    data: z.array(
      z
        .object({
          id: z.string(),
          token: z.string(),
          is_active: z.boolean(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

/** GET /api/feedback — returns { data: feedback[] } */
export const FeedbackListResponseSchema = z
  .object({
    data: z.array(
      z
        .object({
          id: z.string(),
          interview_id: z.string(),
          interviewer_id: z.string(),
          ratings: z.array(
            z
              .object({
                category: z.string(),
                score: z.number().min(1).max(4),
              })
              .passthrough(),
          ),
          pros: z.array(z.string()),
          cons: z.array(z.string()),
          focus_areas_confirmed: z.boolean(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

/** POST /api/feedback — returns { data: feedback } */
export const FeedbackCreateResponseSchema = z
  .object({
    data: z
      .object({
        id: z.string().optional(),
        interviewer_id: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Consent & Transcription response schemas
// ---------------------------------------------------------------------------

/** POST /api/consent — returns { success: true } */
export const ConsentResponseSchema = SuccessResponseSchema;

/** POST /api/transcription — returns { success: true, duration_seconds } */
export const TranscriptionResponseSchema = z
  .object({
    success: z.literal(true),
    duration_seconds: z.number(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Market insights response schemas (non-standard AI envelope)
// ---------------------------------------------------------------------------

/** POST /api/ai/market-insights — quick phase response */
export const MarketInsightsQuickResponseSchema = z
  .object({
    data: z.unknown(),
    phase: z.literal("quick"),
    cached: z.boolean(),
    cache_key: z.string(),
  })
  .passthrough();

/** GET /api/ai/market-insights/[id]?action=poll — pending */
export const MarketInsightsPollPendingSchema = z
  .object({
    status: z.literal("pending"),
  })
  .passthrough();

/** GET /api/ai/market-insights/[id]?action=poll — complete */
export const MarketInsightsPollCompleteSchema = z
  .object({
    status: z.literal("complete"),
    data: z.unknown(),
    cached: z.boolean(),
  })
  .passthrough();

/** Union of poll responses */
export const MarketInsightsPollResponseSchema = z.union([
  MarketInsightsPollPendingSchema,
  MarketInsightsPollCompleteSchema,
]);
