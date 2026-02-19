import { describe, it, expect } from "vitest";
import { STAGE_GENERATION_PROMPT, QUESTION_GENERATION_PROMPT, type StageGenerationInput, type QuestionGenerationInput } from "../prompts/stage-generation";
import { JD_GENERATION_PROMPT, type JDGenerationInput } from "../prompts/jd-generation";

describe("Stage Generation — Strategy Context integration", () => {
  const baseInput: StageGenerationInput = {
    role: "Senior Software Engineer",
    level: "Senior",
    industry: "Technology",
  };

  it("includes strategy context when provided", () => {
    const input: StageGenerationInput = {
      ...baseInput,
      strategy_context: {
        market_classification: "candidate_market",
        process_speed: { recommendation: "fast_track", max_stages: 4, target_days: 14 },
        skills_priority: { must_have: ["TypeScript", "React"], nice_to_have: ["Go"] },
        competitive_differentiators: ["Remote work", "Stock options"],
      },
    };
    const prompt = STAGE_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("STRATEGY CONTEXT");
    expect(prompt).toContain("candidate_market");
    expect(prompt).toContain("fast_track");
    expect(prompt).toContain("max 4 stages");
    expect(prompt).toContain("target 14 days");
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("Remote work");
  });

  it("omits strategy section when no context", () => {
    const prompt = STAGE_GENERATION_PROMPT.user(baseInput);
    expect(prompt).not.toContain("STRATEGY CONTEXT");
  });

  it("strategy max_stages overrides stage_count", () => {
    const input: StageGenerationInput = {
      ...baseInput,
      stage_count: 6,
      strategy_context: {
        process_speed: { recommendation: "fast_track", max_stages: 3, target_days: 10 },
      },
    };
    const prompt = STAGE_GENERATION_PROMPT.user(input);
    // Strategy max_stages takes priority
    expect(prompt).toContain("Number of stages: 3");
  });

  it("falls back to stage_count when no strategy", () => {
    const input: StageGenerationInput = {
      ...baseInput,
      stage_count: 5,
    };
    const prompt = STAGE_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("Number of stages: 5");
  });

  it("defaults to 3-5 when neither provided", () => {
    const prompt = STAGE_GENERATION_PROMPT.user(baseInput);
    expect(prompt).toContain("3-5");
  });

  it("includes JD context and strategy context simultaneously", () => {
    const input: StageGenerationInput = {
      ...baseInput,
      jd_context: {
        responsibilities: ["Lead team", "Architect systems"],
        requirements: ["10 years TypeScript"],
        seniority_signals: ["senior", "lead"],
      },
      strategy_context: {
        market_classification: "balanced",
        process_speed: { recommendation: "standard", max_stages: 5, target_days: 21 },
      },
    };
    const prompt = STAGE_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("JD CONTEXT");
    expect(prompt).toContain("STRATEGY CONTEXT");
    expect(prompt).toContain("Lead team");
    expect(prompt).toContain("balanced");
  });

  it("requests rationale in output instructions", () => {
    const prompt = STAGE_GENERATION_PROMPT.user(baseInput);
    expect(prompt).toContain("rationale");
    expect(prompt).toContain("WHY");
  });

  it("limits must_have skills to 5 in strategy context", () => {
    const input: StageGenerationInput = {
      ...baseInput,
      strategy_context: {
        skills_priority: {
          must_have: Array.from({ length: 10 }, (_, i) => `Skill${i}`),
          nice_to_have: Array.from({ length: 10 }, (_, i) => `Nice${i}`),
        },
      },
    };
    const prompt = STAGE_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("Skill0");
    expect(prompt).toContain("Skill4");
    expect(prompt).not.toContain("Skill5");
    expect(prompt).toContain("Nice0");
    expect(prompt).toContain("Nice4");
    expect(prompt).not.toContain("Nice5");
  });

  it("limits competitive_differentiators to 3", () => {
    const input: StageGenerationInput = {
      ...baseInput,
      strategy_context: {
        competitive_differentiators: ["A", "B", "C", "D", "E"],
      },
    };
    const prompt = STAGE_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("A");
    expect(prompt).toContain("C");
    expect(prompt).not.toContain("; D");
  });
});

describe("Question Generation prompts", () => {
  const baseInput: QuestionGenerationInput = {
    role: "Backend Engineer",
    level: "Mid",
    focus_area: "System Design",
    focus_area_description: "Evaluating architecture and scalability skills",
    stage_type: "technical",
  };

  it("includes all input fields", () => {
    const prompt = QUESTION_GENERATION_PROMPT.user(baseInput);
    expect(prompt).toContain("Backend Engineer");
    expect(prompt).toContain("Mid");
    expect(prompt).toContain("System Design");
    expect(prompt).toContain("architecture and scalability");
    expect(prompt).toContain("technical");
  });

  it("includes existing questions when provided", () => {
    const input: QuestionGenerationInput = {
      ...baseInput,
      existing_questions: ["Design a URL shortener", "Explain CQRS"],
    };
    const prompt = QUESTION_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("Avoid overlap");
    expect(prompt).toContain("URL shortener");
    expect(prompt).toContain("CQRS");
  });

  it("omits existing questions section when empty", () => {
    const prompt = QUESTION_GENERATION_PROMPT.user(baseInput);
    expect(prompt).not.toContain("Avoid overlap");
  });

  it("system prompt enforces 3-5 questions", () => {
    expect(QUESTION_GENERATION_PROMPT.system).toContain("3-5");
  });

  it("sanitizes focus_area input", () => {
    const malicious: QuestionGenerationInput = {
      ...baseInput,
      focus_area: "Design\x00\x01Skills",
    };
    const prompt = QUESTION_GENERATION_PROMPT.user(malicious);
    expect(prompt).not.toContain("\x00");
    expect(prompt).toContain("DesignSkills");
  });
});

describe("JD Generation — Strategy Context integration", () => {
  const baseInput: JDGenerationInput = {
    role: "Product Manager",
    level: "Senior",
    industry: "Fintech",
    style: "formal",
  };

  it("includes strategy context when provided", () => {
    const input: JDGenerationInput = {
      ...baseInput,
      strategy_context: {
        salary_positioning: {
          strategy: "lead",
          recommended_range: { min: 90000, max: 130000, currency: "EUR" },
        },
        competitive_differentiators: ["Equity", "Remote", "Conference budget"],
        skills_priority: {
          must_have: ["Product strategy", "Agile", "SQL"],
          nice_to_have: ["Python", "Figma"],
        },
      },
    };
    const prompt = JD_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("STRATEGY CONTEXT");
    expect(prompt).toContain("lead");
    expect(prompt).toContain("90,000");
    expect(prompt).toContain("130,000");
    expect(prompt).toContain("Equity");
    expect(prompt).toContain("Product strategy");
  });

  it("omits strategy section when no context", () => {
    const prompt = JD_GENERATION_PROMPT.user(baseInput);
    expect(prompt).not.toContain("STRATEGY CONTEXT");
  });

  it("includes both market and strategy context", () => {
    const input: JDGenerationInput = {
      ...baseInput,
      market_context: {
        salary_range: { min: 80000, max: 120000, currency: "EUR" },
        key_skills: ["Product management"],
        demand_level: "high",
        competitors: ["Stripe", "Revolut"],
      },
      strategy_context: {
        salary_positioning: { strategy: "match" },
        competitive_differentiators: ["Culture"],
      },
    };
    const prompt = JD_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("MARKET CONTEXT");
    expect(prompt).toContain("STRATEGY CONTEXT");
  });

  it("limits strategy differentiators to 3", () => {
    const input: JDGenerationInput = {
      ...baseInput,
      strategy_context: {
        competitive_differentiators: ["A", "B", "C", "D", "E"],
      },
    };
    const prompt = JD_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("A");
    expect(prompt).toContain("C");
    // D should not appear in differentiators section (only first 3)
  });

  it("limits must_have skills to 5", () => {
    const input: JDGenerationInput = {
      ...baseInput,
      strategy_context: {
        skills_priority: {
          must_have: Array.from({ length: 10 }, (_, i) => `Skill${i}`),
          nice_to_have: Array.from({ length: 10 }, (_, i) => `Nice${i}`),
        },
      },
    };
    const prompt = JD_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("Skill0");
    expect(prompt).toContain("Skill4");
    expect(prompt).not.toContain("Skill5");
    expect(prompt).toContain("Nice0");
    expect(prompt).toContain("Nice2");
    expect(prompt).not.toContain("Nice3");
  });
});
