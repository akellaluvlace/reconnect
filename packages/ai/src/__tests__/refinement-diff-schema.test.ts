import { describe, it, expect } from "vitest";
import {
  StagePatchSchema,
  RefinementDiffSchema,
  VersionSnapshotSchema,
} from "../schemas/stage-refinements";

describe("StagePatchSchema", () => {
  it("accepts minimal patch (stage-level change only)", () => {
    const result = StagePatchSchema.safeParse({
      stage_index: 0,
      stage_name: "Technical Round",
      updated_duration_minutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it("accepts complex patch with add + remove + modify", () => {
    const result = StagePatchSchema.safeParse({
      stage_index: 1,
      stage_name: "Behavioral",
      remove_focus_areas: ["Teamwork"],
      add_focus_areas: [{
        focus_area: { name: "Leadership", description: "Lead skills", weight: 3 },
        questions: [
          { question: "Q1", purpose: "P1", look_for: ["S1"], focus_area: "Leadership" },
          { question: "Q2", purpose: "P2", look_for: ["S2"], focus_area: "Leadership" },
          { question: "Q3", purpose: "P3", look_for: ["S3"], focus_area: "Leadership" },
        ],
        replaces: "Communication",
      }],
      modify_focus_areas: [{
        name: "Problem Solving",
        updated_weight: 4,
      }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative stage_index", () => {
    const result = StagePatchSchema.safeParse({
      stage_index: -1,
      stage_name: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects add_focus_areas with too few questions (< 3)", () => {
    const result = StagePatchSchema.safeParse({
      stage_index: 0,
      stage_name: "Test",
      add_focus_areas: [{
        focus_area: { name: "FA", description: "Desc", weight: 2 },
        questions: [
          { question: "Q1", purpose: "P1", look_for: ["S1"], focus_area: "FA" },
          { question: "Q2", purpose: "P2", look_for: ["S2"], focus_area: "FA" },
        ],
      }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects add_focus_areas with too many questions (> 5)", () => {
    const questions = Array.from({ length: 6 }, (_, i) => ({
      question: `Q${i}`, purpose: `P${i}`, look_for: [`S${i}`], focus_area: "FA",
    }));
    const result = StagePatchSchema.safeParse({
      stage_index: 0,
      stage_name: "Test",
      add_focus_areas: [{
        focus_area: { name: "FA", description: "Desc", weight: 2 },
        questions,
      }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight outside 1-4 range", () => {
    const result = StagePatchSchema.safeParse({
      stage_index: 0,
      stage_name: "Test",
      modify_focus_areas: [{ name: "FA", updated_weight: 5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration under 5 minutes", () => {
    const result = StagePatchSchema.safeParse({
      stage_index: 0,
      stage_name: "Test",
      updated_duration_minutes: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe("RefinementDiffSchema", () => {
  it("accepts valid diff with 1 patch", () => {
    const result = RefinementDiffSchema.safeParse({
      patches: [{
        stage_index: 0,
        stage_name: "Round 1",
        updated_name: "Updated Round 1",
      }],
      summary: "Renamed stage 1",
      disclaimer: "AI-generated content",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty patches array", () => {
    const result = RefinementDiffSchema.safeParse({
      patches: [],
      summary: "Nothing",
      disclaimer: "AI-generated content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 patches", () => {
    const patches = Array.from({ length: 11 }, (_, i) => ({
      stage_index: i,
      stage_name: `Stage ${i}`,
    }));
    const result = RefinementDiffSchema.safeParse({
      patches,
      summary: "Too many",
      disclaimer: "AI-generated content",
    });
    expect(result.success).toBe(false);
  });
});

describe("VersionSnapshotSchema", () => {
  it("accepts valid snapshot with refinements", () => {
    const result = VersionSnapshotSchema.safeParse({
      stages: [{
        name: "Stage 1",
        type: "technical",
        duration_minutes: 45,
        description: "Desc",
        focus_areas: [{ name: "FA1", description: "D1", weight: 2 }],
        suggested_questions: [{ question: "Q1", purpose: "P1", look_for: ["S1"], focus_area: "FA1" }],
      }],
      coverage: {
        overall_coverage_score: 75,
        requirements_covered: [{ requirement: "R1", covered_by_stage: "Stage 1", covered_by_focus_area: "FA1", coverage_strength: "strong" }],
        gaps: [],
        redundancies: [],
        recommendations: ["Add testing coverage"],
        disclaimer: "AI-generated",
      },
      refinements: {
        items: [{
          id: "ref-0",
          title: "Add testing FA",
          rationale: "Gap in coverage",
          type: "gap_fix",
          priority: "critical",
          change_summary: "Add testing focus area",
          selected: true,
        }],
        user_prompt: "Focus on testing",
        source_coverage_score: 72,
        disclaimer: "AI-generated",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts snapshot without refinements", () => {
    const result = VersionSnapshotSchema.safeParse({
      stages: [{
        name: "Stage 1",
        type: "technical",
        duration_minutes: 45,
        description: "Desc",
        focus_areas: [{ name: "FA1", description: "D1", weight: 2 }],
        suggested_questions: [],
      }],
      coverage: {
        overall_coverage_score: 80,
        requirements_covered: [],
        gaps: [],
        redundancies: [],
        recommendations: ["Keep coverage up"],
        disclaimer: "AI-generated",
      },
    });
    expect(result.success).toBe(true);
  });
});
