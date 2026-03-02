import { describe, it, expect } from "vitest";
import { mergeRefinementDiff } from "../merge-refinement-diff";
import type { RefinementDiff } from "../schemas/stage-refinements";

// Helper: minimal valid stage
function makeStage(name: string, focusAreas: string[], questionsPerFA = 3) {
  return {
    name,
    type: "technical",
    duration_minutes: 45,
    description: `${name} description`,
    focus_areas: focusAreas.map((fa) => ({
      name: fa,
      description: `${fa} description`,
      weight: 2 as const,
    })),
    suggested_questions: focusAreas.flatMap((fa) =>
      Array.from({ length: questionsPerFA }, (_, i) => ({
        question: `Q${i + 1} for ${fa}`,
        purpose: `Purpose ${i + 1}`,
        look_for: ["Signal A", "Signal B"],
        focus_area: fa,
      })),
    ),
  };
}

// Helper: minimal diff
function makeDiff(patches: RefinementDiff["patches"]): RefinementDiff {
  return { patches, summary: "Test diff", disclaimer: "Test disclaimer" };
}

describe("mergeRefinementDiff", () => {
  it("adds a focus area to a stage", () => {
    const stages = [makeStage("Technical Round", ["Algorithms", "System Design"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Technical Round",
      add_focus_areas: [{
        focus_area: { name: "Data Modeling", description: "DB design skills", weight: 3 },
        questions: [
          { question: "Design a schema", purpose: "Test DB skills", look_for: ["Normalization"], focus_area: "Data Modeling" },
          { question: "Indexing strategy", purpose: "Performance", look_for: ["B-tree"], focus_area: "Data Modeling" },
          { question: "Migration approach", purpose: "Ops skills", look_for: ["Zero downtime"], focus_area: "Data Modeling" },
        ],
      }],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(1);
    expect(result.stages[0].focus_areas).toHaveLength(3);
    expect(result.stages[0].focus_areas[2].name).toBe("Data Modeling");
    expect(result.stages[0].suggested_questions.filter((q) => q.focus_area === "Data Modeling")).toHaveLength(3);
    // Original questions preserved
    expect(result.stages[0].suggested_questions.filter((q) => q.focus_area === "Algorithms")).toHaveLength(3);
  });

  it("removes a focus area and its questions", () => {
    const stages = [makeStage("Behavioral", ["Communication", "Leadership", "Teamwork"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Behavioral",
      remove_focus_areas: ["Communication"],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(1);
    expect(result.stages[0].focus_areas).toHaveLength(2);
    expect(result.stages[0].focus_areas.map((fa) => fa.name)).not.toContain("Communication");
    expect(result.stages[0].suggested_questions.filter((q) => q.focus_area === "Communication")).toHaveLength(0);
    // Other questions preserved
    expect(result.stages[0].suggested_questions.filter((q) => q.focus_area === "Leadership")).toHaveLength(3);
  });

  it("replaces a focus area atomically", () => {
    const stages = [makeStage("Technical", ["Algorithms", "System Design"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Technical",
      add_focus_areas: [{
        focus_area: { name: "Cloud Architecture", description: "AWS/GCP design", weight: 3 },
        questions: [
          { question: "Design a cloud system", purpose: "Cloud skills", look_for: ["Scalability"], focus_area: "Cloud Architecture" },
          { question: "Cost optimization", purpose: "Budget awareness", look_for: ["Reserved instances"], focus_area: "Cloud Architecture" },
          { question: "Disaster recovery", purpose: "Reliability", look_for: ["RPO/RTO"], focus_area: "Cloud Architecture" },
        ],
        replaces: "Algorithms",
      }],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(1);
    expect(result.stages[0].focus_areas).toHaveLength(2);
    expect(result.stages[0].focus_areas.map((fa) => fa.name)).toEqual(["System Design", "Cloud Architecture"]);
    expect(result.stages[0].suggested_questions.filter((q) => q.focus_area === "Algorithms")).toHaveLength(0);
    expect(result.stages[0].suggested_questions.filter((q) => q.focus_area === "Cloud Architecture")).toHaveLength(3);
  });

  it("modifies focus area metadata without touching questions", () => {
    const stages = [makeStage("Screening", ["Communication", "Technical Basics"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Screening",
      modify_focus_areas: [{
        name: "Communication",
        updated_description: "Updated: verbal and written communication",
        updated_weight: 4,
      }],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(1);
    const fa = result.stages[0].focus_areas.find((f) => f.name === "Communication")!;
    expect(fa.description).toBe("Updated: verbal and written communication");
    expect(fa.weight).toBe(4);
    // Questions untouched
    expect(result.stages[0].suggested_questions.filter((q) => q.focus_area === "Communication")).toHaveLength(3);
  });

  it("applies stage-level changes", () => {
    const stages = [makeStage("Round 1", ["FA1"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Round 1",
      updated_name: "Technical Deep Dive",
      updated_type: "technical",
      updated_duration_minutes: 60,
      updated_description: "Extended technical round",
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.stages[0].name).toBe("Technical Deep Dive");
    expect(result.stages[0].type).toBe("technical");
    expect(result.stages[0].duration_minutes).toBe(60);
    expect(result.stages[0].description).toBe("Extended technical round");
  });

  it("skips patch with out-of-bounds index and warns", () => {
    const stages = [makeStage("Stage 1", ["FA1"])];
    const diff = makeDiff([{
      stage_index: 5,
      stage_name: "Nonexistent",
      remove_focus_areas: ["FA1"],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("out of bounds");
    // Original stage untouched
    expect(result.stages[0].focus_areas).toHaveLength(1);
  });

  it("skips patch with name mismatch and warns", () => {
    const stages = [makeStage("Technical Round", ["FA1"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Wrong Name",
      remove_focus_areas: ["FA1"],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("name mismatch");
  });

  it("handles case-insensitive FA name matching", () => {
    const stages = [makeStage("Stage", ["Problem Solving", "Communication"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Stage",
      remove_focus_areas: ["PROBLEM SOLVING"],
      modify_focus_areas: [{ name: "communication", updated_weight: 4 }],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(1);
    expect(result.stages[0].focus_areas).toHaveLength(1);
    expect(result.stages[0].focus_areas[0].name).toBe("Communication");
    expect(result.stages[0].focus_areas[0].weight).toBe(4);
  });

  it("handles case-insensitive stage name matching", () => {
    const stages = [makeStage("Technical Round", ["FA1"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "technical round",
      updated_duration_minutes: 60,
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(1);
    expect(result.stages[0].duration_minutes).toBe(60);
  });

  it("warns on non-existent FA removal", () => {
    const stages = [makeStage("Stage", ["FA1", "FA2"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Stage",
      remove_focus_areas: ["NonExistent"],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(1);
    expect(result.warnings.some((w) => w.includes("could not find"))).toBe(true);
    expect(result.stages[0].focus_areas).toHaveLength(2); // unchanged
  });

  it("cleans orphaned questions after merge", () => {
    const stages = [{
      ...makeStage("Stage", ["FA1"]),
      suggested_questions: [
        { question: "Q1", purpose: "P1", look_for: ["S1"], focus_area: "FA1" },
        { question: "Q2", purpose: "P2", look_for: ["S2"], focus_area: "Orphaned FA" },
      ],
    }];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Stage",
      updated_description: "No actual FA changes, just trigger processing",
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.stages[0].suggested_questions).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes("orphaned"))).toBe(true);
  });

  it("applies multiple patches to different stages", () => {
    const stages = [
      makeStage("Screening", ["Communication"]),
      makeStage("Technical", ["Algorithms", "System Design"]),
    ];
    const diff = makeDiff([
      { stage_index: 0, stage_name: "Screening", updated_duration_minutes: 30 },
      { stage_index: 1, stage_name: "Technical", remove_focus_areas: ["Algorithms"] },
    ]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.patchesApplied).toBe(2);
    expect(result.stages[0].duration_minutes).toBe(30);
    expect(result.stages[1].focus_areas).toHaveLength(1);
    expect(result.stages[1].focus_areas[0].name).toBe("System Design");
  });

  it("warns when stage has 0 focus areas after merge", () => {
    const stages = [makeStage("Stage", ["Only FA"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Stage",
      remove_focus_areas: ["Only FA"],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.stages[0].focus_areas).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("0 focus areas"))).toBe(true);
  });

  it("does not mutate original stages array", () => {
    const stages = [makeStage("Stage", ["FA1", "FA2"])];
    const originalJson = JSON.stringify(stages);
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Stage",
      remove_focus_areas: ["FA1"],
      updated_name: "Modified",
    }]);

    mergeRefinementDiff(stages, diff);
    expect(JSON.stringify(stages)).toBe(originalJson);
  });

  it("warns when replaces target not found but still adds FA", () => {
    const stages = [makeStage("Stage", ["FA1", "FA2"])];
    const diff = makeDiff([{
      stage_index: 0,
      stage_name: "Stage",
      add_focus_areas: [{
        focus_area: { name: "New FA", description: "New", weight: 2 },
        questions: [
          { question: "Q1", purpose: "P1", look_for: ["S1"], focus_area: "New FA" },
          { question: "Q2", purpose: "P2", look_for: ["S2"], focus_area: "New FA" },
          { question: "Q3", purpose: "P3", look_for: ["S3"], focus_area: "New FA" },
        ],
        replaces: "NonExistent",
      }],
    }]);

    const result = mergeRefinementDiff(stages, diff);
    expect(result.stages[0].focus_areas).toHaveLength(3); // FA1 + FA2 + New FA
    expect(result.warnings.some((w) => w.includes("replaces target"))).toBe(true);
  });

  // ── Changeset tracking tests ──

  describe("changeset tracking", () => {
    it("tracks added FA names and sets hasAdditions", () => {
      const stages = [makeStage("Stage", ["FA1"])];
      const diff = makeDiff([{
        stage_index: 0,
        stage_name: "Stage",
        add_focus_areas: [{
          focus_area: { name: "New FA", description: "New", weight: 2 },
          questions: [
            { question: "Q1", purpose: "P1", look_for: ["S1"], focus_area: "New FA" },
            { question: "Q2", purpose: "P2", look_for: ["S2"], focus_area: "New FA" },
            { question: "Q3", purpose: "P3", look_for: ["S3"], focus_area: "New FA" },
          ],
        }],
      }]);

      const result = mergeRefinementDiff(stages, diff);
      expect(result.changedFANames).toContain("New FA");
      expect(result.hasAdditions).toBe(true);
    });

    it("tracks removed FA names without setting hasAdditions", () => {
      const stages = [makeStage("Stage", ["FA1", "FA2"])];
      const diff = makeDiff([{
        stage_index: 0,
        stage_name: "Stage",
        remove_focus_areas: ["FA1"],
      }]);

      const result = mergeRefinementDiff(stages, diff);
      expect(result.changedFANames).toContain("FA1");
      expect(result.hasAdditions).toBe(false);
    });

    it("tracks both old and new names on replace", () => {
      const stages = [makeStage("Stage", ["Old FA", "Other FA"])];
      const diff = makeDiff([{
        stage_index: 0,
        stage_name: "Stage",
        add_focus_areas: [{
          focus_area: { name: "New FA", description: "Replacement", weight: 3 },
          questions: [
            { question: "Q1", purpose: "P1", look_for: ["S1"], focus_area: "New FA" },
            { question: "Q2", purpose: "P2", look_for: ["S2"], focus_area: "New FA" },
            { question: "Q3", purpose: "P3", look_for: ["S3"], focus_area: "New FA" },
          ],
          replaces: "Old FA",
        }],
      }]);

      const result = mergeRefinementDiff(stages, diff);
      expect(result.changedFANames).toContain("New FA");
      expect(result.changedFANames).toContain("Old FA");
      expect(result.hasAdditions).toBe(true);
    });

    it("tracks modified FA names", () => {
      const stages = [makeStage("Stage", ["FA1", "FA2"])];
      const diff = makeDiff([{
        stage_index: 0,
        stage_name: "Stage",
        modify_focus_areas: [{ name: "FA1", updated_description: "Changed" }],
      }]);

      const result = mergeRefinementDiff(stages, diff);
      expect(result.changedFANames).toContain("FA1");
      expect(result.hasAdditions).toBe(false);
    });

    it("returns empty changeset for skipped patches (out-of-bounds)", () => {
      const stages = [makeStage("Stage", ["FA1"])];
      const diff = makeDiff([{
        stage_index: 5,
        stage_name: "Nonexistent",
        remove_focus_areas: ["FA1"],
      }]);

      const result = mergeRefinementDiff(stages, diff);
      expect(result.changedFANames).toEqual([]);
      expect(result.hasAdditions).toBe(false);
    });

    it("returns union of all changes across multiple patches", () => {
      const stages = [
        makeStage("Stage A", ["FA1", "FA2"]),
        makeStage("Stage B", ["FA3"]),
      ];
      const diff = makeDiff([
        {
          stage_index: 0,
          stage_name: "Stage A",
          remove_focus_areas: ["FA1"],
          modify_focus_areas: [{ name: "FA2", updated_weight: 4 }],
        },
        {
          stage_index: 1,
          stage_name: "Stage B",
          add_focus_areas: [{
            focus_area: { name: "FA4", description: "New", weight: 2 },
            questions: [
              { question: "Q1", purpose: "P1", look_for: ["S1"], focus_area: "FA4" },
              { question: "Q2", purpose: "P2", look_for: ["S2"], focus_area: "FA4" },
              { question: "Q3", purpose: "P3", look_for: ["S3"], focus_area: "FA4" },
            ],
          }],
        },
      ]);

      const result = mergeRefinementDiff(stages, diff);
      expect(result.changedFANames).toContain("FA1");
      expect(result.changedFANames).toContain("FA2");
      expect(result.changedFANames).toContain("FA4");
      expect(result.changedFANames).toHaveLength(3);
      expect(result.hasAdditions).toBe(true);
    });

    it("returns empty changeset for stage-level-only changes", () => {
      const stages = [makeStage("Stage", ["FA1"])];
      const diff = makeDiff([{
        stage_index: 0,
        stage_name: "Stage",
        updated_duration_minutes: 60,
        updated_description: "Updated desc",
      }]);

      const result = mergeRefinementDiff(stages, diff);
      expect(result.changedFANames).toEqual([]);
      expect(result.hasAdditions).toBe(false);
    });
  });
});
