import { describe, it, expect } from "vitest";
import { STRATEGY_GENERATION_PROMPT } from "../prompts/strategy-generation";
import { COVERAGE_ANALYSIS_PROMPT } from "../prompts/coverage-analysis";
import { STAGE_GENERATION_PROMPT } from "../prompts/stage-generation";
import { JD_GENERATION_PROMPT } from "../prompts/jd-generation";
import { PROMPT_VERSIONS } from "../config";

describe("Strategy Generation Prompt", () => {
  const input = {
    role: "Senior Software Engineer",
    level: "Senior",
    industry: "Technology",
    market_insights: {
      salary: {
        min: 70000,
        max: 110000,
        median: 90000,
        currency: "EUR",
        confidence: 0.85,
      },
      competition: {
        companies_hiring: ["Google", "Meta", "Stripe"],
        job_postings_count: 150,
        market_saturation: "medium",
      },
      time_to_hire: {
        average_days: 30,
        range: { min: 14, max: 60 },
      },
      candidate_availability: {
        level: "limited",
        description: "Limited senior talent in Dublin",
      },
      key_skills: {
        required: ["TypeScript", "React"],
        emerging: ["AI/ML"],
        declining: ["jQuery"],
      },
      trends: ["Remote-first", "AI adoption"],
    },
  };

  it("includes role, level, industry in user prompt", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("Senior Software Engineer");
    expect(prompt).toContain("Senior");
    expect(prompt).toContain("Technology");
  });

  it("includes salary data", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("70,000");
    expect(prompt).toContain("110,000");
    expect(prompt).toContain("EUR");
  });

  it("includes competition data", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("150 postings");
    expect(prompt).toContain("medium");
    expect(prompt).toContain("Google");
  });

  it("includes candidate availability", () => {
    const prompt = STRATEGY_GENERATION_PROMPT.user(input);
    expect(prompt).toContain("limited");
    expect(prompt).toContain("Dublin");
  });

  it("includes compliance prompt in system", () => {
    expect(STRATEGY_GENERATION_PROMPT.system).toContain("EU AI Act");
  });

  it("has correct version", () => {
    expect(STRATEGY_GENERATION_PROMPT.version).toBe(
      PROMPT_VERSIONS.strategyGeneration,
    );
  });
});

describe("Coverage Analysis Prompt", () => {
  const input = {
    role: "Senior Software Engineer",
    level: "Senior",
    jd_requirements: {
      required: ["TypeScript", "React"],
      preferred: ["AWS", "Docker"],
      responsibilities: ["Lead development", "Mentor juniors"],
    },
    stages: [
      {
        name: "Technical Interview",
        type: "technical",
        focus_areas: [
          { name: "Coding", description: "Live coding assessment" },
        ],
      },
    ],
  };

  it("includes role in user prompt", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(input);
    expect(prompt).toContain("Senior Software Engineer");
  });

  it("includes JD requirements", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(input);
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("Lead development");
  });

  it("includes stage details", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(input);
    expect(prompt).toContain("Technical Interview");
    expect(prompt).toContain("Coding");
  });

  it("includes compliance prompt in system", () => {
    expect(COVERAGE_ANALYSIS_PROMPT.system).toContain("EU AI Act");
  });

  it("has correct version", () => {
    expect(COVERAGE_ANALYSIS_PROMPT.version).toBe(
      PROMPT_VERSIONS.coverageAnalysis,
    );
  });
});

describe("Stage Generation Prompt — Strategy Context", () => {
  it("includes strategy context when provided", () => {
    const prompt = STAGE_GENERATION_PROMPT.user({
      role: "Engineer",
      level: "Senior",
      industry: "Tech",
      strategy_context: {
        market_classification: "candidate_market",
        process_speed: {
          recommendation: "fast_track",
          max_stages: 4,
          target_days: 14,
        },
        skills_priority: {
          must_have: ["TypeScript"],
          nice_to_have: ["AWS"],
        },
        competitive_differentiators: ["Remote work", "Engineering culture"],
      },
    });

    expect(prompt).toContain("candidate_market");
    expect(prompt).toContain("fast_track");
    expect(prompt).toContain("max 4 stages");
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("Remote work");
  });

  it("omits strategy section when not provided", () => {
    const prompt = STAGE_GENERATION_PROMPT.user({
      role: "Engineer",
      level: "Senior",
      industry: "Tech",
    });

    expect(prompt).not.toContain("STRATEGY CONTEXT");
  });

  it("uses strategy max_stages for stage count", () => {
    const prompt = STAGE_GENERATION_PROMPT.user({
      role: "Engineer",
      level: "Senior",
      industry: "Tech",
      strategy_context: {
        process_speed: {
          recommendation: "thorough",
          max_stages: 6,
          target_days: 45,
        },
      },
    });

    expect(prompt).toContain("Number of stages: 6");
  });
});

describe("JD Generation Prompt — Strategy Context", () => {
  it("includes strategy context when provided", () => {
    const prompt = JD_GENERATION_PROMPT.user({
      role: "Engineer",
      level: "Senior",
      industry: "Tech",
      style: "formal",
      strategy_context: {
        salary_positioning: {
          strategy: "lead",
          recommended_range: { min: 90000, max: 120000, currency: "EUR" },
        },
        competitive_differentiators: ["Remote work"],
        skills_priority: {
          must_have: ["TypeScript"],
          nice_to_have: ["AWS"],
        },
      },
    });

    expect(prompt).toContain("STRATEGY CONTEXT");
    expect(prompt).toContain("lead");
    expect(prompt).toContain("Remote work");
    expect(prompt).toContain("TypeScript");
  });

  it("omits strategy section when not provided", () => {
    const prompt = JD_GENERATION_PROMPT.user({
      role: "Engineer",
      level: "Senior",
      industry: "Tech",
      style: "formal",
    });

    expect(prompt).not.toContain("STRATEGY CONTEXT");
  });
});
