import { describe, it, expect } from "vitest";
import {
  InterviewStageSchema,
  FeedbackSynthesisSchema,
  HiringStrategySchema,
  CoverageAnalysisSchema,
  QuestionsForFocusAreaSchema,
  CandidateProfileSchema,
  MarketInsightsSchema,
} from "../schemas";
import { coerceAIResponse } from "../coerce";

/**
 * Schema Tolerance Audit
 *
 * These tests verify that every AI output schema tolerates realistic
 * Claude output variance. Each test documents:
 * - The expected bounds
 * - What coercion can fix
 * - What will hard-fail and WHY
 *
 * If a test here fails after a schema change, it means you tightened
 * a bound that Claude might violate at runtime.
 */

describe("Schema Tolerance Audit", () => {
  describe("InterviewStageSchema bounds", () => {
    const makeStage = (focusCount: number, questionCount: number) => ({
      name: "Test Stage",
      type: "technical",
      duration_minutes: 60,
      description: "Test",
      focus_areas: Array.from({ length: focusCount }, (_, i) => ({
        name: `Area ${i}`,
        description: `Desc ${i}`,
        weight: Math.min(i + 1, 4),
      })),
      suggested_questions: Array.from({ length: questionCount }, (_, i) => ({
        question: `Q${i}`,
        purpose: `P${i}`,
        look_for: ["X"],
        focus_area: `Area ${i % focusCount || 0}`,
      })),
    });

    it("accepts 1 focus area (AI sometimes under-delivers)", () => {
      expect(InterviewStageSchema.safeParse(makeStage(1, 3)).success).toBe(true);
    });

    it("accepts 5 focus areas (max)", () => {
      expect(InterviewStageSchema.safeParse(makeStage(5, 3)).success).toBe(true);
    });

    it("rejects 0 focus areas (can't work with nothing)", () => {
      expect(InterviewStageSchema.safeParse(makeStage(0, 3)).success).toBe(false);
    });

    it("coercion trims 6 focus areas to 5", () => {
      const result = coerceAIResponse(makeStage(6, 3), InterviewStageSchema);
      expect(result.coerced).toBe(true);
      expect(result.data!.focus_areas).toHaveLength(5);
    });

    it("accepts 3 questions (min)", () => {
      expect(InterviewStageSchema.safeParse(makeStage(2, 3)).success).toBe(true);
    });

    it("accepts 20 questions (max)", () => {
      expect(InterviewStageSchema.safeParse(makeStage(2, 20)).success).toBe(true);
    });

    it("coercion trims 25 questions to 20", () => {
      const result = coerceAIResponse(makeStage(2, 25), InterviewStageSchema);
      expect(result.coerced).toBe(true);
      expect(result.data!.suggested_questions).toHaveLength(20);
    });

    it("type field is free-form string (not enum)", () => {
      const stage = makeStage(2, 3);
      stage.type = "behavioral_and_technical";
      expect(InterviewStageSchema.safeParse(stage).success).toBe(true);
    });
  });

  describe("HiringStrategySchema bounds", () => {
    const makeStrategy = (overrides: Record<string, unknown> = {}) => ({
      market_classification: "balanced",
      market_classification_rationale: "Test",
      salary_positioning: {
        strategy: "match",
        rationale: "Test",
        recommended_range: { min: 50000, max: 80000, currency: "EUR" },
      },
      process_speed: {
        recommendation: "standard",
        rationale: "Test",
        max_stages: 4,
        target_days: 21,
      },
      competitive_differentiators: ["A", "B"],
      skills_priority: {
        must_have: ["TypeScript"],
        nice_to_have: ["React"],
        emerging_premium: [],
      },
      key_risks: [{ risk: "R", mitigation: "M" }],
      recommendations: ["Do X"],
      disclaimer: "AI disclaimer",
      ...overrides,
    });

    it("coercion trims 10 competitive_differentiators to 8", () => {
      const result = coerceAIResponse(
        makeStrategy({
          competitive_differentiators: Array.from({ length: 10 }, (_, i) => `D${i}`),
        }),
        HiringStrategySchema,
      );
      expect(result.coerced).toBe(true);
      expect(result.data!.competitive_differentiators).toHaveLength(8);
    });

    it("coercion clamps max_stages > 8 down to 8", () => {
      const result = coerceAIResponse(
        makeStrategy({
          process_speed: {
            recommendation: "thorough",
            rationale: "Test",
            max_stages: 10,
            target_days: 30,
          },
        }),
        HiringStrategySchema,
      );
      expect(result.coerced).toBe(true);
      expect(result.data!.process_speed.max_stages).toBe(8);
    });

    it("coercion clamps target_days > 90 down to 90", () => {
      const result = coerceAIResponse(
        makeStrategy({
          process_speed: {
            recommendation: "thorough",
            rationale: "Test",
            max_stages: 5,
            target_days: 120,
          },
        }),
        HiringStrategySchema,
      );
      expect(result.coerced).toBe(true);
      expect(result.data!.process_speed.target_days).toBe(90);
    });
  });

  describe("MarketInsightsSchema bounds", () => {
    it("coercion clamps salary confidence > 1", () => {
      const data = {
        phase: "deep",
        salary: { min: 50000, max: 80000, median: 65000, currency: "EUR", confidence: 1.2 },
        competition: { companies_hiring: [], job_postings_count: 0, market_saturation: "low" },
        time_to_hire: { average_days: 28, range: { min: 14, max: 45 } },
        candidate_availability: { level: "moderate", description: "OK" },
        key_skills: { required: [], emerging: [], declining: [] },
        trends: [],
        metadata: {
          model_used: "test",
          prompt_version: "1.0",
          generated_at: "2026-01-01",
          source_count: 0,
          confidence: 0.5,
        },
      };
      const result = coerceAIResponse(data, MarketInsightsSchema);
      expect(result.coerced).toBe(true);
      expect(result.data!.salary.confidence).toBe(1);
    });
  });

  describe("FeedbackSynthesisSchema bounds", () => {
    it("coercion clamps average_score > 4 to 4", () => {
      const data = {
        summary: "Good",
        consensus: { areas_of_agreement: ["A"], areas_of_disagreement: [] },
        key_strengths: ["S"],
        key_concerns: [],
        discussion_points: [],
        rating_overview: {
          average_score: 4.5,
          total_feedback_count: 1,
          score_distribution: [{ score: 4, count: 1 }],
        },
        disclaimer: "AI disclaimer",
      };
      const result = coerceAIResponse(data, FeedbackSynthesisSchema);
      expect(result.coerced).toBe(true);
      expect(result.data!.rating_overview.average_score).toBe(4);
    });

    it("coercion clamps score 5 in distribution to 4", () => {
      const data = {
        summary: "Good",
        consensus: { areas_of_agreement: [], areas_of_disagreement: [] },
        key_strengths: [],
        key_concerns: [],
        discussion_points: [],
        rating_overview: {
          average_score: 3,
          total_feedback_count: 1,
          score_distribution: [{ score: 5, count: 1 }],
        },
        disclaimer: "AI disclaimer",
      };
      const result = coerceAIResponse(data, FeedbackSynthesisSchema);
      expect(result.data).not.toBeNull();
      expect(result.data!.rating_overview.score_distribution[0].score).toBe(4);
    });
  });

  describe("CoverageAnalysisSchema bounds", () => {
    it("coercion clamps overall_coverage_score > 100", () => {
      const data = {
        requirements_covered: [],
        gaps: [],
        redundancies: [],
        recommendations: ["X"],
        overall_coverage_score: 105,
        disclaimer: "AI disclaimer",
      };
      const result = coerceAIResponse(data, CoverageAnalysisSchema);
      expect(result.coerced).toBe(true);
      expect(result.data!.overall_coverage_score).toBe(100);
    });
  });

  describe("CandidateProfileSchema bounds", () => {
    it("accepts empty must_have_skills array", () => {
      const data = {
        must_have_skills: [],
        disclaimer: "AI disclaimer",
      };
      expect(CandidateProfileSchema.safeParse(data).success).toBe(true);
    });

    it("accepts omitted must_have_skills", () => {
      const data = { disclaimer: "AI disclaimer" };
      expect(CandidateProfileSchema.safeParse(data).success).toBe(true);
    });

    it("coercion trims 20 skills to 15", () => {
      const data = {
        must_have_skills: Array.from({ length: 20 }, (_, i) => `Skill ${i}`),
        disclaimer: "AI disclaimer",
      };
      const result = coerceAIResponse(data, CandidateProfileSchema);
      expect(result.coerced).toBe(true);
      expect(result.data!.must_have_skills).toHaveLength(15);
    });
  });

  describe("QuestionsForFocusAreaSchema bounds", () => {
    it("accepts 3 questions (min)", () => {
      const data = {
        focus_area: "Test",
        questions: Array.from({ length: 3 }, (_, i) => ({
          question: `Q${i}`,
          purpose: `P${i}`,
          look_for: ["X"],
        })),
      };
      expect(QuestionsForFocusAreaSchema.safeParse(data).success).toBe(true);
    });

    it("coercion trims 7 questions to 5", () => {
      const data = {
        focus_area: "Test",
        questions: Array.from({ length: 7 }, (_, i) => ({
          question: `Q${i}`,
          purpose: `P${i}`,
          look_for: ["X"],
        })),
      };
      const result = coerceAIResponse(data, QuestionsForFocusAreaSchema);
      expect(result.coerced).toBe(true);
      expect(result.data!.questions).toHaveLength(5);
    });
  });
});
