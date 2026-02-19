import { describe, it, expect } from "vitest";
import { STRATEGY_GENERATION_PROMPT, type StrategyGenerationInput } from "../prompts/strategy-generation";
import { PROMPT_VERSIONS } from "../config";

const validInput: StrategyGenerationInput = {
  role: "Senior React Developer",
  level: "Senior",
  industry: "Technology",
  market_insights: {
    salary: { min: 75000, max: 110000, median: 92000, currency: "EUR", confidence: 0.85 },
    competition: {
      companies_hiring: ["Google", "Meta", "Stripe", "Intercom", "Workday"],
      job_postings_count: 245,
      market_saturation: "medium",
    },
    time_to_hire: { average_days: 28, range: { min: 14, max: 45 } },
    candidate_availability: { level: "limited", description: "Experienced React devs are in high demand" },
    key_skills: {
      required: ["TypeScript", "React", "Node.js"],
      emerging: ["AI/ML", "Rust"],
      declining: ["jQuery", "Angular.js"],
    },
    trends: ["Remote-first adoption", "AI integration growing", "Startup ecosystem expanding"],
  },
};

describe("Strategy Generation prompts — extended", () => {
  it("has correct version", () => {
    expect(STRATEGY_GENERATION_PROMPT.version).toBe(PROMPT_VERSIONS.strategyGeneration);
  });

  it("system prompt includes compliance", () => {
    expect(STRATEGY_GENERATION_PROMPT.system).toContain("EU AI Act");
  });

  it("system prompt guides market classification", () => {
    expect(STRATEGY_GENERATION_PROMPT.system).toContain("Market classification");
  });

  it("system prompt requires key risks with mitigations", () => {
    expect(STRATEGY_GENERATION_PROMPT.system).toContain("key risks");
    expect(STRATEGY_GENERATION_PROMPT.system).toContain("mitigations");
  });

  it("user prompt includes salary data with formatting", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(validInput);
    expect(prompt).toContain("EUR");
    expect(prompt).toContain("75,000");
    expect(prompt).toContain("110,000");
    expect(prompt).toContain("92,000");
  });

  it("user prompt includes competition data", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(validInput);
    expect(prompt).toContain("245 postings");
    expect(prompt).toContain("medium");
  });

  it("user prompt limits companies to 8", () => {
    const manyCompanies: StrategyGenerationInput = {
      ...validInput,
      market_insights: {
        ...validInput.market_insights,
        competition: {
          ...validInput.market_insights.competition,
          companies_hiring: Array.from({ length: 15 }, (_, i) => `Company${i}`),
        },
      },
    };
    const prompt = STRATEGY_GENERATION_PROMPT.user(manyCompanies);
    expect(prompt).toContain("Company0");
    expect(prompt).toContain("Company7");
    expect(prompt).not.toContain("Company8");
  });

  it("user prompt includes time to hire", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(validInput);
    expect(prompt).toContain("avg 28 days");
    expect(prompt).toContain("14–45");
  });

  it("user prompt includes candidate availability", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(validInput);
    expect(prompt).toContain("limited");
    expect(prompt).toContain("high demand");
  });

  it("user prompt includes skills (limited)", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(validInput);
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("AI/ML");
    expect(prompt).toContain("jQuery");
  });

  it("user prompt limits required skills to 8", () => {
    const manySkills: StrategyGenerationInput = {
      ...validInput,
      market_insights: {
        ...validInput.market_insights,
        key_skills: {
          ...validInput.market_insights.key_skills,
          required: Array.from({ length: 20 }, (_, i) => `Skill${i}`),
        },
      },
    };
    const prompt = STRATEGY_GENERATION_PROMPT.user(manySkills);
    expect(prompt).toContain("Skill0");
    expect(prompt).toContain("Skill7");
    expect(prompt).not.toContain("Skill8");
  });

  it("user prompt limits trends to 5", () => {
    const manyTrends: StrategyGenerationInput = {
      ...validInput,
      market_insights: {
        ...validInput.market_insights,
        trends: Array.from({ length: 10 }, (_, i) => `Trend${i}`),
      },
    };
    const prompt = STRATEGY_GENERATION_PROMPT.user(manyTrends);
    expect(prompt).toContain("Trend0");
    expect(prompt).toContain("Trend4");
    expect(prompt).not.toContain("Trend5");
  });

  it("sanitizes role input", () => {
    const malicious: StrategyGenerationInput = {
      ...validInput,
      role: "Engineer\x00\x01DROP TABLE",
    };
    const prompt = STRATEGY_GENERATION_PROMPT.user(malicious);
    expect(prompt).not.toContain("\x00");
    expect(prompt).toContain("EngineerDROP TABLE"); // Control chars stripped, text preserved
  });

  it("sanitizes candidate_availability description", () => {
    const malicious: StrategyGenerationInput = {
      ...validInput,
      market_insights: {
        ...validInput.market_insights,
        candidate_availability: {
          level: "moderate",
          description: "Normal\x00pool\x7Fhere",
        },
      },
    };
    const prompt = STRATEGY_GENERATION_PROMPT.user(malicious);
    expect(prompt).not.toContain("\x00");
    expect(prompt).not.toContain("\x7F");
  });

  it("user prompt requests all required output sections", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(validInput);
    expect(prompt).toContain("market_classification");
    expect(prompt).toContain("salary_positioning");
    expect(prompt).toContain("process_speed");
    expect(prompt).toContain("competitive_differentiators");
    expect(prompt).toContain("skills_priority");
    expect(prompt).toContain("key_risks");
    expect(prompt).toContain("recommendations");
    expect(prompt).toContain("disclaimer");
  });
});
