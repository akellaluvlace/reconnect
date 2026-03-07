import { describe, it, expect } from "vitest";
import {
  getDurationWarnings,
  getProcessHealthWarnings,
  getCompetitiveInsights,
  type ProcessWarning,
  type StageInput,
  type CollaboratorInput,
} from "@/components/alignment/alignment-warnings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStage(overrides: Partial<StageInput> = {}): StageInput {
  return {
    id: "stage-1",
    name: "Screening",
    type: "screening",
    duration_minutes: 30,
    focus_areas: [
      { name: "Communication", description: "Verbal skills", weight: 50 },
      { name: "Technical", description: "Coding skills", weight: 50 },
    ],
    questions: [{ question: "Tell me about yourself", purpose: "Icebreaker" }],
    ...overrides,
  };
}

function makeCollaborator(
  overrides: Partial<CollaboratorInput> = {},
): CollaboratorInput {
  return {
    role: "interviewer",
    assigned_stages: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getDurationWarnings
// ---------------------------------------------------------------------------

describe("getDurationWarnings", () => {
  it("warns when focus areas exceed duration budget", () => {
    // 5 FAs * 10 min + 5 min intro = 55 min needed, but only 30 min available
    const stage = makeStage({
      name: "Screening",
      duration_minutes: 30,
      focus_areas: [
        { name: "FA1", description: "", weight: 20 },
        { name: "FA2", description: "", weight: 20 },
        { name: "FA3", description: "", weight: 20 },
        { name: "FA4", description: "", weight: 20 },
        { name: "FA5", description: "", weight: 20 },
      ],
    });

    const warnings = getDurationWarnings([stage]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("duration");
    expect(warnings[0].stageName).toBe("Screening");
    expect(warnings[0].message).toContain("5 focus areas");
    expect(warnings[0].message).toContain("30");
    expect(warnings[0].message).toContain("55");
    expect(warnings[0].message).toContain("2");
  });

  it("returns no warnings when duration is sufficient", () => {
    // 2 FAs * 10 min + 5 min = 25 min needed, 60 min available
    const stage = makeStage({
      duration_minutes: 60,
      focus_areas: [
        { name: "FA1", description: "", weight: 50 },
        { name: "FA2", description: "", weight: 50 },
      ],
    });

    const warnings = getDurationWarnings([stage]);

    expect(warnings).toHaveLength(0);
  });

  it("skips stages with null focus_areas", () => {
    const stage = makeStage({
      focus_areas: null,
    });

    const warnings = getDurationWarnings([stage]);

    expect(warnings).toHaveLength(0);
  });

  it("skips stages with empty focus_areas array", () => {
    const stage = makeStage({
      focus_areas: [],
    });

    const warnings = getDurationWarnings([stage]);

    expect(warnings).toHaveLength(0);
  });

  it("warns for multiple stages independently", () => {
    const stage1 = makeStage({
      id: "s1",
      name: "Screening",
      duration_minutes: 20,
      focus_areas: [
        { name: "FA1", description: "", weight: 25 },
        { name: "FA2", description: "", weight: 25 },
        { name: "FA3", description: "", weight: 25 },
        { name: "FA4", description: "", weight: 25 },
      ],
    });
    const stage2 = makeStage({
      id: "s2",
      name: "Technical",
      duration_minutes: 30,
      focus_areas: [
        { name: "FA1", description: "", weight: 20 },
        { name: "FA2", description: "", weight: 20 },
        { name: "FA3", description: "", weight: 20 },
        { name: "FA4", description: "", weight: 20 },
        { name: "FA5", description: "", weight: 20 },
      ],
    });

    const warnings = getDurationWarnings([stage1, stage2]);

    expect(warnings).toHaveLength(2);
    expect(warnings[0].stageName).toBe("Screening");
    expect(warnings[1].stageName).toBe("Technical");
  });

  it("does not warn when duration exactly matches budget", () => {
    // 3 FAs * 10 + 5 = 35 min needed, 35 min available — no warning
    const stage = makeStage({
      duration_minutes: 35,
      focus_areas: [
        { name: "FA1", description: "", weight: 33 },
        { name: "FA2", description: "", weight: 33 },
        { name: "FA3", description: "", weight: 34 },
      ],
    });

    const warnings = getDurationWarnings([stage]);

    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getProcessHealthWarnings
// ---------------------------------------------------------------------------

describe("getProcessHealthWarnings", () => {
  it("warns when stages have no assigned interviewer", () => {
    const stages = [
      makeStage({ id: "s1", name: "Screening" }),
      makeStage({ id: "s2", name: "Technical" }),
    ];
    // Interviewer only covers s1
    const collaborators = [
      makeCollaborator({ role: "interviewer", assigned_stages: ["s1"] }),
    ];

    const warnings = getProcessHealthWarnings(stages, collaborators);
    const noInterviewer = warnings.filter((w) => w.type === "no_interviewer");

    expect(noInterviewer).toHaveLength(1);
    expect(noInterviewer[0].message).toContain("Technical");
  });

  it("does not warn when interviewer covers all stages via null assigned_stages", () => {
    const stages = [
      makeStage({ id: "s1", name: "Screening" }),
      makeStage({ id: "s2", name: "Technical" }),
    ];
    // null assigned_stages = covers all stages
    const collaborators = [
      makeCollaborator({ role: "interviewer", assigned_stages: null }),
    ];

    const warnings = getProcessHealthWarnings(stages, collaborators);
    const noInterviewer = warnings.filter((w) => w.type === "no_interviewer");

    expect(noInterviewer).toHaveLength(0);
  });

  it("warns when no collaborators at all", () => {
    const stages = [makeStage({ id: "s1", name: "Screening" })];

    const warnings = getProcessHealthWarnings(stages, []);
    const noInterviewer = warnings.filter((w) => w.type === "no_interviewer");

    expect(noInterviewer).toHaveLength(1);
    expect(noInterviewer[0].stageNames).toContain("Screening");
  });

  it("warns when stage has no questions", () => {
    const stages = [
      makeStage({ id: "s1", name: "Screening", questions: null }),
      makeStage({ id: "s2", name: "Technical", questions: [] }),
    ];
    const collaborators = [makeCollaborator({ assigned_stages: null })];

    const warnings = getProcessHealthWarnings(stages, collaborators);
    const noQuestions = warnings.filter((w) => w.type === "no_questions");

    expect(noQuestions).toHaveLength(1);
    expect(noQuestions[0].stageNames).toContain("Screening");
    expect(noQuestions[0].stageNames).toContain("Technical");
  });

  it("warns when no behavioral assessment stage exists", () => {
    const stages = [
      makeStage({ type: "screening" }),
      makeStage({ type: "technical" }),
    ];
    const collaborators = [makeCollaborator({ assigned_stages: null })];

    const warnings = getProcessHealthWarnings(stages, collaborators);
    const missingBehavioral = warnings.filter(
      (w) => w.type === "missing_behavioral",
    );

    expect(missingBehavioral).toHaveLength(1);
    expect(missingBehavioral[0].message).toContain("behavioural");
  });

  it("does not warn about missing behavioral when behavioral stage exists", () => {
    const stages = [
      makeStage({ type: "screening" }),
      makeStage({ type: "behavioral" }),
    ];
    const collaborators = [makeCollaborator({ assigned_stages: null })];

    const warnings = getProcessHealthWarnings(stages, collaborators);
    const missingBehavioral = warnings.filter(
      (w) => w.type === "missing_behavioral",
    );

    expect(missingBehavioral).toHaveLength(0);
  });

  it("does not warn about missing behavioral when culture_fit stage exists", () => {
    const stages = [
      makeStage({ type: "screening" }),
      makeStage({ type: "culture_fit" }),
    ];
    const collaborators = [makeCollaborator({ assigned_stages: null })];

    const warnings = getProcessHealthWarnings(stages, collaborators);
    const missingBehavioral = warnings.filter(
      (w) => w.type === "missing_behavioral",
    );

    expect(missingBehavioral).toHaveLength(0);
  });

  it('uses correct plural: "1 stage has" vs "2 stages have"', () => {
    // Single stage with no questions
    const singleStage = [makeStage({ id: "s1", name: "Screening", questions: null })];
    const collaborators = [makeCollaborator({ assigned_stages: null })];

    const warningsSingle = getProcessHealthWarnings(singleStage, collaborators);
    const noQSingle = warningsSingle.find((w) => w.type === "no_questions");
    expect(noQSingle?.message).toContain("1 stage has");

    // Two stages with no questions
    const twoStages = [
      makeStage({ id: "s1", name: "Screening", questions: null }),
      makeStage({ id: "s2", name: "Technical", questions: [] }),
    ];

    const warningsPlural = getProcessHealthWarnings(twoStages, collaborators);
    const noQPlural = warningsPlural.find((w) => w.type === "no_questions");
    expect(noQPlural?.message).toContain("2 stages have");
  });

  it("warns for multiple uncovered stages with correct plural", () => {
    const stages = [
      makeStage({ id: "s1", name: "Screening" }),
      makeStage({ id: "s2", name: "Technical" }),
      makeStage({ id: "s3", name: "Final" }),
    ];
    // Interviewer only covers s1
    const collaborators = [
      makeCollaborator({ role: "interviewer", assigned_stages: ["s1"] }),
    ];

    const warnings = getProcessHealthWarnings(stages, collaborators);
    const noInterviewer = warnings.filter((w) => w.type === "no_interviewer");

    expect(noInterviewer).toHaveLength(1);
    expect(noInterviewer[0].stageNames).toEqual(["Technical", "Final"]);
    expect(noInterviewer[0].message).toContain("2 stages have");
  });
});

// ---------------------------------------------------------------------------
// getCompetitiveInsights
// ---------------------------------------------------------------------------

describe("getCompetitiveInsights", () => {
  it("warns when candidate availability is scarce", () => {
    const market = {
      candidate_availability: { level: "scarce", description: "Very few candidates" },
    };

    const insights = getCompetitiveInsights(market, null);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toContain("high demand");
    expect(insights[0]).toContain("faster process");
  });

  it("warns when many competitors are hiring", () => {
    const market = {
      competition: {
        companies_hiring: ["A", "B", "C", "D", "E"],
        market_saturation: "high",
      },
    };

    const insights = getCompetitiveInsights(market, null);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toContain("5 companies");
    expect(insights[0]).toContain("speed and differentiation");
  });

  it("warns when time to hire is long", () => {
    const market = {
      time_to_hire: { average_days: 45, range: { min: 30, max: 60 } },
    };

    const insights = getCompetitiveInsights(market, null);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toContain("45 days");
    expect(insights[0]).toContain("streamlining");
  });

  it("warns when salary positioning is below market", () => {
    const market = {};
    const strategy = { salary_positioning: "lag" };

    const insights = getCompetitiveInsights(market, strategy);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toContain("below market");
    expect(insights[0]).toContain("non-monetary");
  });

  it("returns empty array when no market data", () => {
    const insights = getCompetitiveInsights(null, null);

    expect(insights).toEqual([]);
  });

  it("returns empty array when market is healthy", () => {
    const market = {
      candidate_availability: { level: "abundant" },
      competition: { companies_hiring: ["A", "B"], market_saturation: "low" },
      time_to_hire: { average_days: 20 },
    };
    const strategy = { salary_positioning: "lead" };

    const insights = getCompetitiveInsights(market, strategy);

    expect(insights).toEqual([]);
  });
});
