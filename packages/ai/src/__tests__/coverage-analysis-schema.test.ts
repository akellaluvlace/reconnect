import { describe, it, expect } from "vitest";
import { CoverageAnalysisSchema } from "../schemas/coverage-analysis";

const validCoverage = {
  requirements_covered: [
    {
      requirement: "TypeScript proficiency",
      covered_by_stage: "Technical Interview",
      covered_by_focus_area: "Language Skills",
      coverage_strength: "strong",
    },
    {
      requirement: "Team leadership",
      covered_by_stage: "Behavioral Interview",
      covered_by_focus_area: "Leadership",
      coverage_strength: "moderate",
    },
  ],
  gaps: [
    {
      requirement: "System design experience",
      severity: "critical",
      suggestion: "Add a system design stage or extend technical interview",
    },
  ],
  redundancies: [
    {
      focus_area: "Communication",
      appears_in_stages: ["Screening", "Behavioral"],
      recommendation: "Consolidate communication assessment into behavioral stage",
    },
  ],
  recommendations: [
    "Add a system design component to the technical interview",
    "Remove duplicate communication assessment from screening",
  ],
  overall_coverage_score: 75,
  disclaimer:
    "This AI-generated content is for informational purposes only. All hiring decisions must be made by humans.",
};

describe("CoverageAnalysisSchema", () => {
  it("validates valid coverage analysis", () => {
    const result = CoverageAnalysisSchema.safeParse(validCoverage);
    expect(result.success).toBe(true);
  });

  it("rejects invalid coverage_strength", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      requirements_covered: [
        {
          ...validCoverage.requirements_covered[0],
          coverage_strength: "excellent",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid gap severity", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      gaps: [{ ...validCoverage.gaps[0], severity: "blocker" }],
    });
    expect(result.success).toBe(false);
  });

  it("enforces coverage score minimum (0)", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      overall_coverage_score: -5,
    });
    expect(result.success).toBe(false);
  });

  it("enforces coverage score maximum (100)", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      overall_coverage_score: 105,
    });
    expect(result.success).toBe(false);
  });

  it("accepts 0 coverage score", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      overall_coverage_score: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts 100 coverage score", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      overall_coverage_score: 100,
    });
    expect(result.success).toBe(true);
  });

  it("allows empty requirements_covered", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      requirements_covered: [],
    });
    expect(result.success).toBe(true);
  });

  it("allows empty gaps", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      gaps: [],
    });
    expect(result.success).toBe(true);
  });

  it("allows empty redundancies", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      redundancies: [],
    });
    expect(result.success).toBe(true);
  });

  it("requires at least 1 recommendation", () => {
    const result = CoverageAnalysisSchema.safeParse({
      ...validCoverage,
      recommendations: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires disclaimer field", () => {
    const { disclaimer: _, ...noDisclaimer } = validCoverage;
    const result = CoverageAnalysisSchema.safeParse(noDisclaimer);
    expect(result.success).toBe(false);
  });
});
