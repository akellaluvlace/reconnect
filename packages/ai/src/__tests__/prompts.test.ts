import { describe, it, expect } from "vitest";
import { COMPLIANCE_SYSTEM_PROMPT } from "../prompts/compliance";
import { MARKET_INSIGHTS_PROMPTS } from "../prompts/market-insights";
import { JD_GENERATION_PROMPT } from "../prompts/jd-generation";
import { STAGE_GENERATION_PROMPT } from "../prompts/stage-generation";
import { FEEDBACK_SYNTHESIS_PROMPT } from "../prompts/feedback-synthesis";
import { estimateTokens, truncateTranscript } from "../prompts/feedback-synthesis";
import { PROMPT_VERSIONS } from "../config";

describe("Compliance", () => {
  it("includes EU AI Act requirements", () => {
    expect(COMPLIANCE_SYSTEM_PROMPT).toContain("EU AI Act");
    expect(COMPLIANCE_SYSTEM_PROMPT).toContain("TEXT ONLY");
    expect(COMPLIANCE_SYSTEM_PROMPT).toContain("MUST NOT infer emotions");
    expect(COMPLIANCE_SYSTEM_PROMPT).toContain("MUST NOT detect deception");
  });

  it("includes mandatory disclaimer text", () => {
    expect(COMPLIANCE_SYSTEM_PROMPT).toContain(
      "for informational purposes only",
    );
    expect(COMPLIANCE_SYSTEM_PROMPT).toContain(
      "hiring decisions must be made by humans",
    );
  });

  it("prohibits hire/no-hire recommendation", () => {
    expect(COMPLIANCE_SYSTEM_PROMPT).toContain(
      "MUST NOT recommend hiring or rejecting",
    );
  });
});

describe("Prompt versions", () => {
  it("all versions are semver format", () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    for (const [key, version] of Object.entries(PROMPT_VERSIONS)) {
      expect(version, `${key} version`).toMatch(semverRegex);
    }
  });
});

describe("Market Insights prompts", () => {
  it("generates a quick prompt with all input fields", () => {
    const prompt = MARKET_INSIGHTS_PROMPTS.quick({
      role: "Software Engineer",
      level: "Senior",
      industry: "Tech",
      location: "Dublin",
      market_focus: "irish",
    });
    expect(prompt).toContain("Software Engineer");
    expect(prompt).toContain("Senior");
    expect(prompt).toContain("Tech");
    expect(prompt).toContain("Dublin");
    expect(prompt).toContain("irish");
  });

  it("generates query generation prompt", () => {
    const prompt = MARKET_INSIGHTS_PROMPTS.queryGeneration({
      role: "Data Scientist",
      level: "Mid",
      industry: "Finance",
      location: "London",
      market_focus: "global",
    });
    expect(prompt).toContain("Data Scientist");
    expect(prompt).toContain("8-12");
  });
});

describe("JD Generation prompt", () => {
  it("includes market context when provided", () => {
    const prompt = JD_GENERATION_PROMPT.user({
      role: "Engineer",
      level: "Senior",
      industry: "Tech",
      style: "formal",
      market_context: {
        salary_range: { min: 70000, max: 100000, currency: "EUR" },
        key_skills: ["React", "Node.js"],
        demand_level: "high",
        competitors: ["Google", "Meta"],
      },
    });
    expect(prompt).toContain("MARKET CONTEXT");
    expect(prompt).toContain("EUR 70,000");
    expect(prompt).toContain("React, Node.js");
    expect(prompt).toContain("Google, Meta");
  });

  it("omits market section when no context", () => {
    const prompt = JD_GENERATION_PROMPT.user({
      role: "Engineer",
      level: "Senior",
      industry: "Tech",
      style: "creative",
    });
    expect(prompt).not.toContain("MARKET CONTEXT");
  });
});

describe("Stage Generation prompt", () => {
  it("includes JD context when provided", () => {
    const prompt = STAGE_GENERATION_PROMPT.user({
      role: "Engineer",
      level: "Senior",
      industry: "Tech",
      jd_context: {
        responsibilities: ["Lead team", "Architect systems"],
        requirements: ["10 years experience"],
        seniority_signals: ["lead", "architect"],
      },
    });
    expect(prompt).toContain("JD CONTEXT");
    expect(prompt).toContain("Lead team");
  });

  it("enforces 2-3 focus areas in system prompt", () => {
    expect(STAGE_GENERATION_PROMPT.system).toContain("2-3 focus areas");
  });

  it("enforces 3-5 questions in system prompt", () => {
    expect(STAGE_GENERATION_PROMPT.system).toContain("3-5");
  });

  it("enforces 1-4 rating scale and explicitly rejects 1-5", () => {
    expect(STAGE_GENERATION_PROMPT.system).toContain("1-4");
    // The prompt says "NOT 1-5" — it mentions 1-5 only to explicitly reject it
    expect(STAGE_GENERATION_PROMPT.system).toContain("NOT 1-5");
  });
});

describe("Feedback Synthesis prompt", () => {
  it("explicitly forbids hire/no-hire", () => {
    expect(FEEDBACK_SYNTHESIS_PROMPT.system).toContain(
      "MUST NOT recommend hiring or rejecting",
    );
  });

  it("requires mandatory disclaimer", () => {
    expect(FEEDBACK_SYNTHESIS_PROMPT.system).toContain("mandatory disclaimer");
  });

  it("includes transcript when provided", () => {
    const prompt = FEEDBACK_SYNTHESIS_PROMPT.user({
      candidate_name: "Alice",
      role: "Engineer",
      stage_name: "Technical",
      feedback_forms: [
        {
          interviewer_name: "Bob",
          ratings: [{ category: "Coding", score: 3 }],
          pros: ["Good"],
          cons: ["Slow"],
        },
      ],
      transcript_summary: "Candidate discussed system design...",
    });
    expect(prompt).toContain("TRANSCRIPT SUMMARY");
    expect(prompt).toContain("system design");
  });

  it("omits transcript section when not provided", () => {
    const prompt = FEEDBACK_SYNTHESIS_PROMPT.user({
      candidate_name: "Alice",
      role: "Engineer",
      stage_name: "Technical",
      feedback_forms: [
        {
          interviewer_name: "Bob",
          ratings: [{ category: "Coding", score: 3 }],
          pros: ["Good"],
          cons: ["Slow"],
        },
      ],
    });
    expect(prompt).not.toContain("TRANSCRIPT SUMMARY");
  });
});

describe("estimateTokens", () => {
  it("estimates ~250 tokens for 1000 chars", () => {
    const text = "a".repeat(1000);
    expect(estimateTokens(text)).toBe(250);
  });
});

describe("truncateTranscript", () => {
  it("returns unchanged if under limit", () => {
    const short = "Hello world";
    expect(truncateTranscript(short, 100)).toBe(short);
  });

  it("truncates long text with marker", () => {
    const long = "x".repeat(10000);
    const result = truncateTranscript(long, 100);
    expect(result).toContain("truncated");
    expect(result.length).toBeLessThan(long.length);
  });
});
