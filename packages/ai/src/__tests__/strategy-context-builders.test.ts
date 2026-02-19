import { describe, it, expect } from "vitest";
import {
  buildStrategyContextForJD,
  buildStrategyContextForStages,
} from "../pipelines/strategy-generation";
import { InterviewStageSchema, FocusAreaSchema } from "../schemas/interview-stage";
import type { HiringStrategyOutput } from "../schemas/hiring-strategy";

const mockStrategy: HiringStrategyOutput = {
  market_classification: "candidate_market",
  market_classification_rationale: "High demand, limited supply",
  salary_positioning: {
    strategy: "lead",
    rationale: "Need to lead market",
    recommended_range: { min: 85000, max: 120000, currency: "EUR" },
  },
  process_speed: {
    recommendation: "fast_track",
    rationale: "Competitive market",
    max_stages: 4,
    target_days: 14,
  },
  competitive_differentiators: [
    "Remote work",
    "Engineering culture",
    "Career development",
    "Stock options",
  ],
  skills_priority: {
    must_have: [
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "AWS",
      "Docker",
    ],
    nice_to_have: ["GraphQL", "Redis", "Terraform", "K8s", "CI/CD", "Go"],
    emerging_premium: ["AI/ML", "Rust"],
  },
  key_risks: [
    { risk: "Counter-offers", mitigation: "Fast decisions" },
  ],
  recommendations: ["Move fast"],
  disclaimer: "AI disclaimer",
};

describe("buildStrategyContextForJD", () => {
  it("extracts salary positioning", () => {
    const ctx = buildStrategyContextForJD(mockStrategy);
    expect(ctx.salary_positioning.strategy).toBe("lead");
    expect(ctx.salary_positioning.recommended_range.min).toBe(85000);
  });

  it("limits differentiators to 3", () => {
    const ctx = buildStrategyContextForJD(mockStrategy);
    expect(ctx.competitive_differentiators).toHaveLength(3);
  });

  it("limits must_have skills to 5", () => {
    const ctx = buildStrategyContextForJD(mockStrategy);
    expect(ctx.skills_priority.must_have).toHaveLength(5);
  });

  it("limits nice_to_have skills to 3", () => {
    const ctx = buildStrategyContextForJD(mockStrategy);
    expect(ctx.skills_priority.nice_to_have).toHaveLength(3);
  });
});

describe("buildStrategyContextForStages", () => {
  it("extracts market classification", () => {
    const ctx = buildStrategyContextForStages(mockStrategy);
    expect(ctx.market_classification).toBe("candidate_market");
  });

  it("extracts process speed fields", () => {
    const ctx = buildStrategyContextForStages(mockStrategy);
    expect(ctx.process_speed.recommendation).toBe("fast_track");
    expect(ctx.process_speed.max_stages).toBe(4);
    expect(ctx.process_speed.target_days).toBe(14);
  });

  it("limits must_have skills to 5", () => {
    const ctx = buildStrategyContextForStages(mockStrategy);
    expect(ctx.skills_priority.must_have).toHaveLength(5);
  });

  it("limits nice_to_have skills to 5", () => {
    const ctx = buildStrategyContextForStages(mockStrategy);
    expect(ctx.skills_priority.nice_to_have).toHaveLength(5);
  });

  it("limits differentiators to 3", () => {
    const ctx = buildStrategyContextForStages(mockStrategy);
    expect(ctx.competitive_differentiators).toHaveLength(3);
  });
});

describe("Updated Stage Schema — Rationale", () => {
  it("accepts stage with rationale", () => {
    const result = InterviewStageSchema.safeParse({
      name: "Technical Interview",
      type: "technical",
      duration_minutes: 60,
      description: "Technical assessment",
      rationale: "Critical for evaluating core engineering skills",
      focus_areas: [
        { name: "Coding", description: "Live coding", weight: 3, rationale: "Core skill" },
        { name: "Design", description: "System design", weight: 4 },
      ],
      suggested_questions: Array.from({ length: 6 }, (_, i) => ({
        question: `Question ${i + 1}`,
        purpose: "Test purpose",
        look_for: ["Skill"],
        focus_area: i < 3 ? "Coding" : "Design",
      })),
    });
    expect(result.success).toBe(true);
  });

  it("accepts stage without rationale (backward compat)", () => {
    const result = InterviewStageSchema.safeParse({
      name: "Screening",
      type: "screening",
      duration_minutes: 30,
      description: "Initial screen",
      focus_areas: [
        { name: "Fit", description: "Culture fit", weight: 2 },
        { name: "Motivation", description: "Role motivation", weight: 3 },
      ],
      suggested_questions: Array.from({ length: 6 }, (_, i) => ({
        question: `Q${i + 1}`,
        purpose: "Purpose",
        look_for: ["Thing"],
        focus_area: i < 3 ? "Fit" : "Motivation",
      })),
    });
    expect(result.success).toBe(true);
  });

  it("accepts focus area with rationale", () => {
    const result = FocusAreaSchema.safeParse({
      name: "Coding",
      description: "Live coding",
      weight: 3,
      rationale: "Core skill assessment",
    });
    expect(result.success).toBe(true);
  });

  it("accepts focus area without rationale", () => {
    const result = FocusAreaSchema.safeParse({
      name: "Coding",
      description: "Live coding",
      weight: 3,
    });
    expect(result.success).toBe(true);
  });
});
