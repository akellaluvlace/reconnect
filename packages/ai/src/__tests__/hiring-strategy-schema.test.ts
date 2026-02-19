import { describe, it, expect } from "vitest";
import { HiringStrategySchema } from "../schemas/hiring-strategy";

const validStrategy = {
  market_classification: "candidate_market",
  market_classification_rationale:
    "High demand for senior engineers with limited supply in Dublin market",
  salary_positioning: {
    strategy: "lead",
    rationale: "Need to offer above market to attract top talent",
    recommended_range: { min: 85000, max: 120000, currency: "EUR" },
  },
  process_speed: {
    recommendation: "fast_track",
    rationale: "Competitive market — slow processes lose candidates",
    max_stages: 4,
    target_days: 14,
  },
  competitive_differentiators: [
    "Flexible remote work policy",
    "Strong engineering culture",
    "Career development budget",
  ],
  skills_priority: {
    must_have: ["TypeScript", "React", "Node.js"],
    nice_to_have: ["AWS", "PostgreSQL"],
    emerging_premium: ["AI/ML"],
  },
  key_risks: [
    {
      risk: "Top candidates accept counter-offers",
      mitigation: "Move quickly, make competitive initial offers",
    },
    {
      risk: "Limited senior talent pool",
      mitigation: "Consider remote candidates across EU",
    },
  ],
  recommendations: [
    "Fast-track high-potential candidates",
    "Highlight remote policy in JD",
  ],
  disclaimer:
    "This AI-generated content is for informational purposes only. All hiring decisions must be made by humans.",
};

describe("HiringStrategySchema", () => {
  it("validates valid strategy", () => {
    const result = HiringStrategySchema.safeParse(validStrategy);
    expect(result.success).toBe(true);
  });

  it("rejects invalid market classification", () => {
    const result = HiringStrategySchema.safeParse({
      ...validStrategy,
      market_classification: "unknown",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid salary positioning strategy", () => {
    const result = HiringStrategySchema.safeParse({
      ...validStrategy,
      salary_positioning: {
        ...validStrategy.salary_positioning,
        strategy: "aggressive",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid process speed recommendation", () => {
    const result = HiringStrategySchema.safeParse({
      ...validStrategy,
      process_speed: {
        ...validStrategy.process_speed,
        recommendation: "lightning",
      },
    });
    expect(result.success).toBe(false);
  });

  it("enforces max_stages bounds (2-8)", () => {
    const tooFew = HiringStrategySchema.safeParse({
      ...validStrategy,
      process_speed: { ...validStrategy.process_speed, max_stages: 1 },
    });
    expect(tooFew.success).toBe(false);

    const tooMany = HiringStrategySchema.safeParse({
      ...validStrategy,
      process_speed: { ...validStrategy.process_speed, max_stages: 9 },
    });
    expect(tooMany.success).toBe(false);
  });

  it("enforces target_days bounds (5-90)", () => {
    const tooFew = HiringStrategySchema.safeParse({
      ...validStrategy,
      process_speed: { ...validStrategy.process_speed, target_days: 3 },
    });
    expect(tooFew.success).toBe(false);

    const tooMany = HiringStrategySchema.safeParse({
      ...validStrategy,
      process_speed: { ...validStrategy.process_speed, target_days: 100 },
    });
    expect(tooMany.success).toBe(false);
  });

  it("requires at least 1 competitive differentiator", () => {
    const result = HiringStrategySchema.safeParse({
      ...validStrategy,
      competitive_differentiators: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least 1 must_have skill", () => {
    const result = HiringStrategySchema.safeParse({
      ...validStrategy,
      skills_priority: {
        ...validStrategy.skills_priority,
        must_have: [],
      },
    });
    expect(result.success).toBe(false);
  });

  it("requires at least 1 key_risk", () => {
    const result = HiringStrategySchema.safeParse({
      ...validStrategy,
      key_risks: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least 1 recommendation", () => {
    const result = HiringStrategySchema.safeParse({
      ...validStrategy,
      recommendations: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires disclaimer field", () => {
    const { disclaimer: _, ...noDisclaimer } = validStrategy;
    const result = HiringStrategySchema.safeParse(noDisclaimer);
    expect(result.success).toBe(false);
  });
});
