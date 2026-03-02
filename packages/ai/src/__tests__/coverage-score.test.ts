import { describe, it, expect } from "vitest";
import {
  computeCoverageScore,
  STRENGTH_WEIGHTS,
  GAP_SEVERITY_WEIGHTS,
  deduplicateCovered,
  deduplicateGaps,
} from "../coverage-score";

describe("computeCoverageScore", () => {
  it("returns 100% when all requirements are strongly covered with no gaps", () => {
    const covered = [
      { requirement: "React", covered_by_stage: "Tech", covered_by_focus_area: "Frontend", coverage_strength: "strong" as const },
      { requirement: "Node.js", covered_by_stage: "Tech", covered_by_focus_area: "Backend", coverage_strength: "strong" as const },
    ];
    const { score, breakdown } = computeCoverageScore(covered, []);
    expect(score).toBe(100);
    expect(breakdown.strong).toBe(2);
    expect(breakdown.gaps_critical).toBe(0);
    expect(breakdown.gaps_important).toBe(0);
    expect(breakdown.gaps_minor).toBe(0);
  });

  it("computes weighted score for mixed coverage with no gaps", () => {
    const covered = [
      { requirement: "A", covered_by_stage: "S1", covered_by_focus_area: "FA1", coverage_strength: "strong" as const },
      { requirement: "B", covered_by_stage: "S1", covered_by_focus_area: "FA1", coverage_strength: "strong" as const },
      { requirement: "C", covered_by_stage: "S1", covered_by_focus_area: "FA1", coverage_strength: "moderate" as const },
      { requirement: "D", covered_by_stage: "S1", covered_by_focus_area: "FA1", coverage_strength: "weak" as const },
    ];
    // (2×1.0 + 1×0.6 + 1×0.25) / 4 = 2.85/4 = 71.25 → 71%
    const { score } = computeCoverageScore(covered, []);
    expect(score).toBe(71);
  });

  it("computes correct score for user's real data: 8s + 5m + 1crit + 2imp + 4min", () => {
    const covered = [
      ...Array.from({ length: 8 }, (_, i) => ({
        requirement: `Strong${i}`, covered_by_stage: "S", covered_by_focus_area: "FA", coverage_strength: "strong" as const,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        requirement: `Moderate${i}`, covered_by_stage: "S", covered_by_focus_area: "FA", coverage_strength: "moderate" as const,
      })),
    ];
    const gaps = [
      { requirement: "CritGap", severity: "critical" as const, suggestion: "" },
      { requirement: "ImpGap1", severity: "important" as const, suggestion: "" },
      { requirement: "ImpGap2", severity: "important" as const, suggestion: "" },
      { requirement: "MinGap1", severity: "minor" as const, suggestion: "" },
      { requirement: "MinGap2", severity: "minor" as const, suggestion: "" },
      { requirement: "MinGap3", severity: "minor" as const, suggestion: "" },
      { requirement: "MinGap4", severity: "minor" as const, suggestion: "" },
    ];
    // Numerator: 8×1.0 + 5×0.6 + 1×0 + 2×0.3 + 4×0.6 = 8 + 3 + 0 + 0.6 + 2.4 = 14.0
    // Denominator: 8 + 5 + 7 = 20
    // Score: 14.0/20 = 70%
    const { score, breakdown } = computeCoverageScore(covered, gaps);
    expect(score).toBe(70);
    expect(breakdown.gaps_critical).toBe(1);
    expect(breakdown.gaps_important).toBe(2);
    expect(breakdown.gaps_minor).toBe(4);
  });

  it("returns 0% when all gaps are critical", () => {
    const gaps = [
      { requirement: "A", severity: "critical" as const, suggestion: "" },
      { requirement: "B", severity: "critical" as const, suggestion: "" },
    ];
    const { score } = computeCoverageScore([], gaps);
    expect(score).toBe(0);
  });

  it("returns 60% when all gaps are minor", () => {
    const gaps = [
      { requirement: "A", severity: "minor" as const, suggestion: "" },
      { requirement: "B", severity: "minor" as const, suggestion: "" },
    ];
    // 2×0.6 / 2 = 60%
    const { score } = computeCoverageScore([], gaps);
    expect(score).toBe(60);
  });

  it("returns 0 for empty input", () => {
    const { score, breakdown } = computeCoverageScore([], []);
    expect(score).toBe(0);
    expect(breakdown.total).toBe(0);
  });

  it("scores single covered + single critical gap → 50%", () => {
    const covered = [
      { requirement: "A", covered_by_stage: "S", covered_by_focus_area: "FA", coverage_strength: "strong" as const },
    ];
    const gaps = [
      { requirement: "B", severity: "critical" as const, suggestion: "" },
    ];
    // (1.0 + 0) / 2 = 50%
    const { score } = computeCoverageScore(covered, gaps);
    expect(score).toBe(50);
  });

  it("scores single covered + single minor gap → 80%", () => {
    const covered = [
      { requirement: "A", covered_by_stage: "S", covered_by_focus_area: "FA", coverage_strength: "strong" as const },
    ];
    const gaps = [
      { requirement: "B", severity: "minor" as const, suggestion: "" },
    ];
    // (1.0 + 0.6) / 2 = 80%
    const { score } = computeCoverageScore(covered, gaps);
    expect(score).toBe(80);
  });

  it("includes gaps_critical, gaps_important, gaps_minor in breakdown", () => {
    const gaps = [
      { requirement: "A", severity: "critical" as const, suggestion: "" },
      { requirement: "B", severity: "important" as const, suggestion: "" },
      { requirement: "C", severity: "minor" as const, suggestion: "" },
    ];
    const { breakdown } = computeCoverageScore([], gaps);
    expect(breakdown.gaps_critical).toBe(1);
    expect(breakdown.gaps_important).toBe(1);
    expect(breakdown.gaps_minor).toBe(1);
    expect(breakdown.gaps).toBe(3);
  });
});

describe("deduplicateCovered", () => {
  it("keeps strongest when same requirement appears twice", () => {
    const covered = [
      { requirement: "React", covered_by_stage: "S1", covered_by_focus_area: "FA1", coverage_strength: "moderate" as const },
      { requirement: "React", covered_by_stage: "S2", covered_by_focus_area: "FA2", coverage_strength: "strong" as const },
    ];
    const result = deduplicateCovered(covered);
    expect(result).toHaveLength(1);
    expect(result[0].coverage_strength).toBe("strong");
  });

  it("deduplicates case-insensitively", () => {
    const covered = [
      { requirement: "react experience", covered_by_stage: "S1", covered_by_focus_area: "FA1", coverage_strength: "weak" as const },
      { requirement: "React Experience", covered_by_stage: "S2", covered_by_focus_area: "FA2", coverage_strength: "strong" as const },
    ];
    const result = deduplicateCovered(covered);
    expect(result).toHaveLength(1);
    expect(result[0].coverage_strength).toBe("strong");
  });
});

describe("deduplicateGaps", () => {
  it("keeps highest severity when same gap appears twice", () => {
    const gaps = [
      { requirement: "AWS", severity: "minor" as const, suggestion: "s1" },
      { requirement: "AWS", severity: "critical" as const, suggestion: "s2" },
    ];
    const result = deduplicateGaps(gaps);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("critical");
  });

  it("deduplicates case-insensitively", () => {
    const gaps = [
      { requirement: "aws certification", severity: "important" as const, suggestion: "" },
      { requirement: "AWS Certification", severity: "minor" as const, suggestion: "" },
    ];
    const result = deduplicateGaps(gaps);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("important");
  });
});

describe("weight constants", () => {
  it("STRENGTH_WEIGHTS has correct values", () => {
    expect(STRENGTH_WEIGHTS.strong).toBe(1.0);
    expect(STRENGTH_WEIGHTS.moderate).toBe(0.6);
    expect(STRENGTH_WEIGHTS.weak).toBe(0.25);
  });

  it("GAP_SEVERITY_WEIGHTS has correct values", () => {
    expect(GAP_SEVERITY_WEIGHTS.critical).toBe(0);
    expect(GAP_SEVERITY_WEIGHTS.important).toBe(0.3);
    expect(GAP_SEVERITY_WEIGHTS.minor).toBe(0.6);
  });
});
