import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CoverageAnalysisOutput } from "../schemas/coverage-analysis";

// Mock the AI client and retry before importing the pipeline
const { mockCallClaude } = vi.hoisted(() => ({
  mockCallClaude: vi.fn(),
}));

vi.mock("../client", () => ({
  callClaude: mockCallClaude,
}));

vi.mock("../retry", () => ({
  withRetry: <T>(fn: () => Promise<T>) => fn(),
}));

import {
  analyzeCoverageAnchored,
  type AnchoredCoverageInput,
} from "../pipelines/anchored-coverage";

// ── Helpers ──

function makeInput(overrides?: Partial<AnchoredCoverageInput>): AnchoredCoverageInput {
  return {
    role: "Senior Software Engineer",
    level: "Senior",
    jd_requirements: {
      required: ["React experience", "Node.js experience", "Team leadership", "AWS certification"],
      preferred: ["GraphQL experience"],
      responsibilities: ["Lead development"],
    },
    stages: [
      {
        name: "Technical Round",
        type: "technical",
        focus_areas: [
          { name: "Frontend Skills", description: "Frontend dev skills" },
          { name: "Backend Skills", description: "Backend dev skills" },
        ],
      },
      {
        name: "Behavioral Round",
        type: "behavioral",
        focus_areas: [
          { name: "Leadership Assessment", description: "Leadership eval" },
        ],
      },
    ],
    previous_coverage: {
      requirements_covered: [
        { requirement: "React experience", covered_by_stage: "Technical Round", covered_by_focus_area: "Frontend Skills", coverage_strength: "strong" },
        { requirement: "Node.js experience", covered_by_stage: "Technical Round", covered_by_focus_area: "Backend Skills", coverage_strength: "moderate" },
        { requirement: "Team leadership", covered_by_stage: "Behavioral Round", covered_by_focus_area: "Leadership Assessment", coverage_strength: "strong" },
      ],
      gaps: [
        { requirement: "AWS certification", severity: "critical", suggestion: "Add cloud FA" },
        { requirement: "GraphQL experience", severity: "minor", suggestion: "Add GraphQL FA" },
      ],
      redundancies: [],
      recommendations: ["Add cloud FA"],
      overall_coverage_score: 55,
      disclaimer: "AI-generated",
    },
    changed_fa_names: [],
    has_additions: false,
    ...overrides,
  };
}

// Standard mock AI response for re-evaluated requirements
function makeMockAIResponse(covered: CoverageAnalysisOutput["requirements_covered"], gaps: CoverageAnalysisOutput["gaps"]) {
  return {
    data: {
      requirements_covered: covered,
      gaps,
      redundancies: [{ focus_area: "Backend Skills", appears_in_stages: ["Technical Round"], recommendation: "Consider merging" }],
      recommendations: ["Add cloud infrastructure FA", "Add GraphQL testing"],
      overall_coverage_score: 70, // AI estimate — will be overridden
      disclaimer: "AI-generated coverage analysis. Human review required.",
    },
    model: "claude-sonnet-4-5-20250929",
  };
}

describe("analyzeCoverageAnchored", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips AI call when nothing needs re-eval (stage-level only changes)", async () => {
    const input = makeInput({
      changed_fa_names: [],
      has_additions: false,
    });

    const result = await analyzeCoverageAnchored(input);

    // AI should NOT be called — everything is anchored
    expect(mockCallClaude).not.toHaveBeenCalled();
    // All 3 covered entries preserved identically
    expect(result.data.requirements_covered).toHaveLength(3);
    expect(result.data.requirements_covered[0]).toEqual(input.previous_coverage.requirements_covered[0]);
    // All 2 gaps preserved
    expect(result.data.gaps).toHaveLength(2);
    // Score recomputed deterministically from anchored data
    expect(typeof result.data.overall_coverage_score).toBe("number");
  });

  it("calls AI only for changed FA entries and merges with anchored", async () => {
    // Scenario: "Frontend Skills" was removed and replaced with "Full Stack Dev"
    const input = makeInput({
      stages: [
        {
          name: "Technical Round",
          type: "technical",
          focus_areas: [
            { name: "Full Stack Dev", description: "Full stack skills" },
            { name: "Backend Skills", description: "Backend dev skills" },
          ],
        },
        {
          name: "Behavioral Round",
          type: "behavioral",
          focus_areas: [
            { name: "Leadership Assessment", description: "Leadership eval" },
          ],
        },
      ],
      changed_fa_names: ["Frontend Skills", "Full Stack Dev"],
      has_additions: true,
    });

    // AI evaluates: "React experience" (FA changed) + all gaps (hasAdditions)
    mockCallClaude.mockResolvedValueOnce(makeMockAIResponse(
      [
        { requirement: "React experience", covered_by_stage: "Technical Round", covered_by_focus_area: "Full Stack Dev", coverage_strength: "strong" },
        { requirement: "AWS certification", covered_by_stage: "Technical Round", covered_by_focus_area: "Full Stack Dev", coverage_strength: "weak" },
      ],
      [
        { requirement: "GraphQL experience", severity: "minor", suggestion: "Still not covered" },
      ],
    ));

    const result = await analyzeCoverageAnchored(input);

    expect(mockCallClaude).toHaveBeenCalledTimes(1);

    // 2 anchored + 2 from AI = 4 covered
    expect(result.data.requirements_covered).toHaveLength(4);
    // Anchored entries preserved byte-for-byte
    expect(result.data.requirements_covered).toContainEqual(
      input.previous_coverage.requirements_covered[1], // Node.js — anchored
    );
    expect(result.data.requirements_covered).toContainEqual(
      input.previous_coverage.requirements_covered[2], // Leadership — anchored
    );
    // AI entries present
    expect(result.data.requirements_covered.find((r) => r.requirement === "React experience")?.covered_by_focus_area).toBe("Full Stack Dev");
    expect(result.data.requirements_covered.find((r) => r.requirement === "AWS certification")).toBeTruthy();

    // 1 gap from AI (GraphQL still uncovered)
    expect(result.data.gaps).toHaveLength(1);
    expect(result.data.gaps[0].requirement).toBe("GraphQL experience");

    // Redundancies + recommendations always fresh from AI
    expect(result.data.redundancies).toHaveLength(1);
    expect(result.data.recommendations).toHaveLength(2);
  });

  it("computes score deterministically from merged data", async () => {
    const input = makeInput({
      changed_fa_names: ["Frontend Skills"],
      has_additions: false,
    });

    // AI re-evaluates React experience (its FA changed)
    mockCallClaude.mockResolvedValueOnce(makeMockAIResponse(
      [{ requirement: "React experience", covered_by_stage: "Technical Round", covered_by_focus_area: "Frontend Skills", coverage_strength: "moderate" }],
      [],
    ));

    const result = await analyzeCoverageAnchored(input);

    // 3 covered (2 anchored + 1 AI) + 2 anchored gaps = 5 total
    // strong(1.0) + moderate(0.6) + moderate(0.6) + critical(0) + minor(0.6) = 2.8 / 5 = 56%
    const expected = Math.round(((1.0 + 0.6 + 0.6 + 0 + 0.6) / 5) * 100);
    expect(result.data.overall_coverage_score).toBe(expected);
  });

  it("fixes stage names in anchored entries when stage was renamed", async () => {
    const input = makeInput({
      stages: [
        {
          name: "Tech Deep Dive", // renamed from "Technical Round"
          type: "technical",
          focus_areas: [
            { name: "Frontend Skills", description: "Frontend skills" },
            { name: "Backend Skills", description: "Backend skills" },
          ],
        },
        {
          name: "Behavioral Round",
          type: "behavioral",
          focus_areas: [
            { name: "Leadership Assessment", description: "Leadership eval" },
          ],
        },
      ],
      changed_fa_names: [],
      has_additions: false,
    });

    const result = await analyzeCoverageAnchored(input);

    // Anchored entries should have updated stage names
    const reactEntry = result.data.requirements_covered.find((r) => r.requirement === "React experience");
    expect(reactEntry?.covered_by_stage).toBe("Tech Deep Dive");
    const nodeEntry = result.data.requirements_covered.find((r) => r.requirement === "Node.js experience");
    expect(nodeEntry?.covered_by_stage).toBe("Tech Deep Dive");
  });

  it("output total equals input total (no requirements dropped)", async () => {
    const input = makeInput({
      changed_fa_names: ["Frontend Skills", "Backend Skills"],
      has_additions: true,
    });

    // AI evaluates: React + Node.js (FAs changed) + all gaps (hasAdditions)
    mockCallClaude.mockResolvedValueOnce(makeMockAIResponse(
      [
        { requirement: "React experience", covered_by_stage: "Technical Round", covered_by_focus_area: "Frontend Skills", coverage_strength: "strong" },
        { requirement: "Node.js experience", covered_by_stage: "Technical Round", covered_by_focus_area: "Backend Skills", coverage_strength: "moderate" },
        { requirement: "AWS certification", covered_by_stage: "Technical Round", covered_by_focus_area: "Backend Skills", coverage_strength: "weak" },
      ],
      [
        { requirement: "GraphQL experience", severity: "minor", suggestion: "Not covered" },
      ],
    ));

    const result = await analyzeCoverageAnchored(input);

    const totalOutput = result.data.requirements_covered.length + result.data.gaps.length;
    const totalInput = input.previous_coverage.requirements_covered.length + input.previous_coverage.gaps.length;
    expect(totalOutput).toBe(totalInput);
  });

  it("includes metadata with model and prompt version", async () => {
    const input = makeInput({
      changed_fa_names: [],
      has_additions: false,
    });

    const result = await analyzeCoverageAnchored(input);

    expect(result.metadata.prompt_version).toBe("1.0.0");
    expect(result.metadata.generated_at).toBeTruthy();
  });

  it("auto-adds missing re-eval requirements as gaps (completeness guard)", async () => {
    const input = makeInput({
      changed_fa_names: ["Frontend Skills", "Backend Skills"],
      has_additions: true,
    });

    // AI drops "Node.js experience" entirely — doesn't appear in covered OR gaps
    // Also drops "AWS certification" gap
    mockCallClaude.mockResolvedValueOnce(makeMockAIResponse(
      [{ requirement: "React experience", covered_by_stage: "Technical Round", covered_by_focus_area: "Frontend Skills", coverage_strength: "strong" }],
      [{ requirement: "GraphQL experience", severity: "minor", suggestion: "Still not covered" }],
    ));

    const result = await analyzeCoverageAnchored(input);

    // "Node.js experience" and "AWS certification" were sent for re-eval but AI dropped them
    // Pipeline should auto-add them as gaps
    const totalOutput = result.data.requirements_covered.length + result.data.gaps.length;
    const totalInput = input.previous_coverage.requirements_covered.length + input.previous_coverage.gaps.length;
    expect(totalOutput).toBe(totalInput);

    // The auto-added gaps should reference the dropped requirements
    const gapReqs = result.data.gaps.map((g) => g.requirement);
    expect(gapReqs).toContain("Node.js experience");
    expect(gapReqs).toContain("AWS certification");
  });

  it("filters out AI results that duplicate anchored entries (dedup guard)", async () => {
    const input = makeInput({
      changed_fa_names: ["Frontend Skills"],
      has_additions: false,
    });

    // AI was asked to re-eval "React experience" but also returns an entry for
    // "Node.js experience" which is anchored — this should be filtered out
    mockCallClaude.mockResolvedValueOnce(makeMockAIResponse(
      [
        { requirement: "React experience", covered_by_stage: "Technical Round", covered_by_focus_area: "Frontend Skills", coverage_strength: "moderate" },
        { requirement: "Node.js experience", covered_by_stage: "Technical Round", covered_by_focus_area: "Backend Skills", coverage_strength: "weak" },
      ],
      [],
    ));

    const result = await analyzeCoverageAnchored(input);

    // "Node.js experience" should appear exactly once (the anchored version with "moderate", not the AI's "weak")
    const nodeEntries = result.data.requirements_covered.filter((r) => r.requirement === "Node.js experience");
    expect(nodeEntries).toHaveLength(1);
    expect(nodeEntries[0].coverage_strength).toBe("moderate"); // anchored value, not AI's "weak"
  });
});
