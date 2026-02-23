import { describe, it, expect } from "vitest";
import {
  HiringStrategySchema,
  CoverageAnalysisSchema,
  MarketInsightsSchema,
  JobDescriptionSchema,
  FeedbackSynthesisSchema,
  InterviewStageSchema,
  FocusAreaSchema,
} from "../schemas";
import type {
  HiringStrategy,
  CoverageAnalysis,
  MarketInsights,
  JobDescription,
  FocusArea,
  SuggestedQuestion,
} from "@reconnect/database";

/**
 * These tests verify that Zod schemas and domain types are structurally aligned.
 * When a schema validates, the output should be assignable to the domain type.
 * This catches drift between DB types, domain types, and validation schemas.
 */

describe("HiringStrategy — schema vs domain type", () => {
  it("schema output shape matches domain type fields", () => {
    const shape = HiringStrategySchema.shape;
    const domainKeys: (keyof HiringStrategy)[] = [
      "market_classification",
      "market_classification_rationale",
      "salary_positioning",
      "process_speed",
      "competitive_differentiators",
      "skills_priority",
      "key_risks",
      "recommendations",
      "disclaimer",
    ];
    for (const key of domainKeys) {
      expect(shape, `Missing key: ${String(key)}`).toHaveProperty(String(key));
    }
  });

  it("validated data is assignable to domain type", () => {
    const data = HiringStrategySchema.parse({
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
      competitive_differentiators: ["A"],
      skills_priority: {
        must_have: ["TypeScript"],
        nice_to_have: [],
        emerging_premium: [],
      },
      key_risks: [{ risk: "R", mitigation: "M" }],
      recommendations: ["Do X"],
      disclaimer: "AI disclaimer",
    });

    // If this compiles, the types are aligned
    const _typed: HiringStrategy = data;
    expect(_typed.market_classification).toBe("balanced");
  });
});

describe("CoverageAnalysis — schema vs domain type", () => {
  it("schema output shape matches domain type fields", () => {
    const shape = CoverageAnalysisSchema.shape;
    const domainKeys: (keyof CoverageAnalysis)[] = [
      "requirements_covered",
      "gaps",
      "redundancies",
      "recommendations",
      "overall_coverage_score",
      "disclaimer",
    ];
    for (const key of domainKeys) {
      expect(shape, `Missing key: ${String(key)}`).toHaveProperty(String(key));
    }
  });

  it("validated data is assignable to domain type", () => {
    const data = CoverageAnalysisSchema.parse({
      requirements_covered: [
        {
          requirement: "TypeScript",
          covered_by_stage: "Technical",
          covered_by_focus_area: "Coding",
          coverage_strength: "strong",
        },
      ],
      gaps: [],
      redundancies: [],
      recommendations: ["Looks good"],
      overall_coverage_score: 85,
      disclaimer: "AI disclaimer",
    });

    const _typed: CoverageAnalysis = data;
    expect(_typed.overall_coverage_score).toBe(85);
  });
});

describe("FocusArea — schema vs domain type", () => {
  it("schema includes rationale field", () => {
    const shape = FocusAreaSchema.shape;
    expect(shape).toHaveProperty("rationale");
  });

  it("validated focus area with rationale is assignable", () => {
    const data = FocusAreaSchema.parse({
      name: "Coding",
      description: "Assess coding skills",
      weight: 3,
      rationale: "Critical for the role",
    });

    // weight: z.number().int().min(1).max(4) widens to `number` but domain type is 1|2|3|4.
    // Runtime validation guarantees the range; cast is safe here.
    const _typed: FocusArea = data as FocusArea;
    expect(_typed.rationale).toBe("Critical for the role");
  });

  it("validated focus area without rationale is assignable", () => {
    const data = FocusAreaSchema.parse({
      name: "Coding",
      description: "Assess coding skills",
      weight: 3,
    });

    const _typed: FocusArea = data as FocusArea;
    expect(_typed.rationale).toBeUndefined();
  });
});

describe("AI output types — disclaimer requirement", () => {
  it("HiringStrategySchema requires disclaimer", () => {
    const result = HiringStrategySchema.safeParse({
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
      competitive_differentiators: ["A"],
      skills_priority: { must_have: ["TS"], nice_to_have: [], emerging_premium: [] },
      key_risks: [{ risk: "R", mitigation: "M" }],
      recommendations: ["X"],
      // No disclaimer
    });
    expect(result.success).toBe(false);
  });

  it("CoverageAnalysisSchema requires disclaimer", () => {
    const result = CoverageAnalysisSchema.safeParse({
      requirements_covered: [],
      gaps: [],
      redundancies: [],
      recommendations: ["X"],
      overall_coverage_score: 50,
      // No disclaimer
    });
    expect(result.success).toBe(false);
  });

  it("FeedbackSynthesisSchema requires disclaimer", () => {
    const result = FeedbackSynthesisSchema.safeParse({
      summary: "Good candidate",
      consensus: { areas_of_agreement: ["A"], areas_of_disagreement: [] },
      key_strengths: ["S"],
      key_concerns: [],
      discussion_points: [],
      rating_overview: {
        average_score: 3,
        total_feedback_count: 1,
        score_distribution: [{ score: 3, count: 1 }],
      },
      // No disclaimer
    });
    expect(result.success).toBe(false);
  });
});
