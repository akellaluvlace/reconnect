import { describe, it, expect } from "vitest";
import {
  partitionCoverage,
  fixStageNames,
  type PartitionInput,
} from "../pipelines/anchored-coverage";
import type { CoverageAnalysisOutput } from "../schemas/coverage-analysis";

// ── Helpers ──

function makeCoveredEntry(
  requirement: string,
  fa: string,
  stage: string,
  strength: "strong" | "moderate" | "weak" = "strong",
): CoverageAnalysisOutput["requirements_covered"][number] {
  return {
    requirement,
    covered_by_stage: stage,
    covered_by_focus_area: fa,
    coverage_strength: strength,
  };
}

function makeGap(
  requirement: string,
  severity: "critical" | "important" | "minor" = "important",
): CoverageAnalysisOutput["gaps"][number] {
  return {
    requirement,
    severity,
    suggestion: `Add coverage for ${requirement}`,
  };
}

function makeStages(
  ...specs: Array<{ name: string; fas: string[] }>
) {
  return specs.map((s) => ({
    name: s.name,
    type: "technical",
    focus_areas: s.fas.map((fa) => ({ name: fa, description: `${fa} desc` })),
  }));
}

const baseCoverage: CoverageAnalysisOutput = {
  requirements_covered: [
    makeCoveredEntry("React experience", "Frontend Skills", "Technical Round", "strong"),
    makeCoveredEntry("Node.js experience", "Backend Skills", "Technical Round", "moderate"),
    makeCoveredEntry("Team leadership", "Leadership Assessment", "Behavioral Round", "strong"),
  ],
  gaps: [
    makeGap("AWS certification", "critical"),
    makeGap("GraphQL experience", "minor"),
  ],
  redundancies: [],
  recommendations: ["Add cloud FA"],
  overall_coverage_score: 62,
  disclaimer: "AI-generated",
};

describe("partitionCoverage", () => {
  it("anchors everything when no FAs changed and no additions", () => {
    const stages = makeStages(
      { name: "Technical Round", fas: ["Frontend Skills", "Backend Skills"] },
      { name: "Behavioral Round", fas: ["Leadership Assessment"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      [],
      false,
      stages,
    );

    expect(result.anchored.covered).toHaveLength(3);
    expect(result.anchored.gaps).toHaveLength(2);
    expect(result.needsReeval.requirements).toHaveLength(0);
    expect(result.needsReeval.gaps).toHaveLength(0);
  });

  it("re-evaluates covered entries when their FA was removed", () => {
    const stages = makeStages(
      { name: "Technical Round", fas: ["Backend Skills"] }, // Frontend Skills removed
      { name: "Behavioral Round", fas: ["Leadership Assessment"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      ["Frontend Skills"],
      false,
      stages,
    );

    // "React experience" was covered by "Frontend Skills" → needs re-eval
    expect(result.needsReeval.requirements).toHaveLength(1);
    expect(result.needsReeval.requirements[0].requirement).toBe("React experience");
    expect(result.needsReeval.requirements[0].reason).toBe("fa_changed");
    // Other two stay anchored
    expect(result.anchored.covered).toHaveLength(2);
    // No additions → gaps stay anchored
    expect(result.anchored.gaps).toHaveLength(2);
    expect(result.needsReeval.gaps).toHaveLength(0);
  });

  it("re-evaluates all gaps when FAs are added", () => {
    const stages = makeStages(
      { name: "Technical Round", fas: ["Frontend Skills", "Backend Skills", "Cloud Skills"] },
      { name: "Behavioral Round", fas: ["Leadership Assessment"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      ["Cloud Skills"],
      true,
      stages,
    );

    // All gaps need re-eval because new FA might cover them
    expect(result.needsReeval.gaps).toHaveLength(2);
    expect(result.needsReeval.gaps[0].reason).toBe("new_fas_added");
    expect(result.anchored.gaps).toHaveLength(0);
    // Covered entries stay anchored (their FAs unchanged)
    expect(result.anchored.covered).toHaveLength(3);
  });

  it("re-evaluates entries for replaced FAs (remove + add)", () => {
    const stages = makeStages(
      { name: "Technical Round", fas: ["Full Stack Skills", "Backend Skills"] },
      { name: "Behavioral Round", fas: ["Leadership Assessment"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      ["Frontend Skills", "Full Stack Skills"],
      true,
      stages,
    );

    // "React experience" covered by "Frontend Skills" (changed) → re-eval
    expect(result.needsReeval.requirements).toHaveLength(1);
    expect(result.needsReeval.requirements[0].requirement).toBe("React experience");
    // Gaps re-evaluated because hasAdditions
    expect(result.needsReeval.gaps).toHaveLength(2);
    // Other covered entries anchored
    expect(result.anchored.covered).toHaveLength(2);
  });

  it("re-evaluates entries for modified FAs", () => {
    const stages = makeStages(
      { name: "Technical Round", fas: ["Frontend Skills", "Backend Skills"] },
      { name: "Behavioral Round", fas: ["Leadership Assessment"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      ["Backend Skills"],
      false,
      stages,
    );

    // "Node.js experience" covered by "Backend Skills" (changed) → re-eval
    expect(result.needsReeval.requirements).toHaveLength(1);
    expect(result.needsReeval.requirements[0].requirement).toBe("Node.js experience");
    expect(result.needsReeval.requirements[0].previous_strength).toBe("moderate");
    expect(result.needsReeval.requirements[0].previous_fa).toBe("Backend Skills");
    // Others anchored
    expect(result.anchored.covered).toHaveLength(2);
  });

  it("uses case-insensitive matching for FA names", () => {
    const stages = makeStages(
      { name: "Technical Round", fas: ["frontend skills", "Backend Skills"] },
      { name: "Behavioral Round", fas: ["Leadership Assessment"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      ["FRONTEND SKILLS"],
      false,
      stages,
    );

    // Should match despite case difference
    expect(result.needsReeval.requirements).toHaveLength(1);
    expect(result.needsReeval.requirements[0].requirement).toBe("React experience");
  });

  it("re-evaluates orphaned entries (FA no longer in stages)", () => {
    // Remove "Frontend Skills" from stages but DON'T list it in changedFANames
    const stages = makeStages(
      { name: "Technical Round", fas: ["Backend Skills"] }, // Frontend Skills gone
      { name: "Behavioral Round", fas: ["Leadership Assessment"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      [], // no explicit changes — but FA is missing from stages
      false,
      stages,
    );

    // "React experience" was covered by "Frontend Skills" which doesn't exist → re-eval
    expect(result.needsReeval.requirements).toHaveLength(1);
    expect(result.needsReeval.requirements[0].requirement).toBe("React experience");
    expect(result.needsReeval.requirements[0].reason).toBe("fa_missing");
  });

  it("handles mixed scenario: some anchored + some re-eval + gaps", () => {
    const stages = makeStages(
      { name: "Technical Round", fas: ["Full Stack Dev", "Backend Skills"] },
      { name: "Behavioral Round", fas: ["Leadership Assessment"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      ["Frontend Skills", "Full Stack Dev"],
      true, // has additions
      stages,
    );

    // "React experience" (Frontend Skills changed) → re-eval
    expect(result.needsReeval.requirements).toHaveLength(1);
    // "Node.js" (Backend Skills unchanged) + "Team leadership" (Leadership unchanged) → anchored
    expect(result.anchored.covered).toHaveLength(2);
    // All gaps re-evaluated because hasAdditions
    expect(result.needsReeval.gaps).toHaveLength(2);
    expect(result.anchored.gaps).toHaveLength(0);
  });

  it("sends everything to re-eval when ALL FAs changed", () => {
    const stages = makeStages(
      { name: "Technical Round", fas: ["New FA 1", "New FA 2"] },
      { name: "Behavioral Round", fas: ["New FA 3"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      ["Frontend Skills", "Backend Skills", "Leadership Assessment", "New FA 1", "New FA 2", "New FA 3"],
      true,
      stages,
    );

    // All covered entries have changed FAs → re-eval
    expect(result.needsReeval.requirements).toHaveLength(3);
    // All gaps re-evaluated because hasAdditions
    expect(result.needsReeval.gaps).toHaveLength(2);
    expect(result.anchored.covered).toHaveLength(0);
    expect(result.anchored.gaps).toHaveLength(0);
  });

  it("handles empty previous coverage (first time)", () => {
    const emptyCoverage: CoverageAnalysisOutput = {
      requirements_covered: [],
      gaps: [],
      redundancies: [],
      recommendations: [],
      overall_coverage_score: 0,
      disclaimer: "AI-generated",
    };

    const stages = makeStages(
      { name: "Technical Round", fas: ["FA1"] },
    );

    const result = partitionCoverage(
      emptyCoverage,
      ["FA1"],
      true,
      stages,
    );

    expect(result.anchored.covered).toHaveLength(0);
    expect(result.anchored.gaps).toHaveLength(0);
    expect(result.needsReeval.requirements).toHaveLength(0);
    expect(result.needsReeval.gaps).toHaveLength(0);
  });

  it("preserves previous_strength and previous_fa in re-eval entries", () => {
    const stages = makeStages(
      { name: "Technical Round", fas: ["Updated Frontend", "Backend Skills"] },
      { name: "Behavioral Round", fas: ["Leadership Assessment"] },
    );

    const result = partitionCoverage(
      baseCoverage,
      ["Frontend Skills", "Updated Frontend"],
      true,
      stages,
    );

    const reevalEntry = result.needsReeval.requirements[0];
    expect(reevalEntry.requirement).toBe("React experience");
    expect(reevalEntry.previous_strength).toBe("strong");
    expect(reevalEntry.previous_fa).toBe("Frontend Skills");
  });
});

describe("fixStageNames", () => {
  it("updates covered_by_stage when stage was renamed", () => {
    const covered = [
      makeCoveredEntry("React", "Frontend Skills", "Old Stage Name"),
      makeCoveredEntry("Node.js", "Backend Skills", "Technical Round"),
    ];

    const stages = makeStages(
      { name: "New Stage Name", fas: ["Frontend Skills"] },
      { name: "Technical Round", fas: ["Backend Skills"] },
    );

    fixStageNames(covered, stages);

    expect(covered[0].covered_by_stage).toBe("New Stage Name");
    expect(covered[1].covered_by_stage).toBe("Technical Round"); // unchanged
  });

  it("handles case-insensitive FA matching for stage lookup", () => {
    const covered = [
      makeCoveredEntry("React", "frontend skills", "Old Name"),
    ];

    const stages = makeStages(
      { name: "Renamed Stage", fas: ["Frontend Skills"] },
    );

    fixStageNames(covered, stages);

    expect(covered[0].covered_by_stage).toBe("Renamed Stage");
  });

  it("leaves entry unchanged if FA not found in any stage", () => {
    const covered = [
      makeCoveredEntry("React", "Nonexistent FA", "Some Stage"),
    ];

    const stages = makeStages(
      { name: "Technical", fas: ["Backend Skills"] },
    );

    fixStageNames(covered, stages);

    expect(covered[0].covered_by_stage).toBe("Some Stage"); // unchanged
  });
});
