import { describe, it, expect } from "vitest";
import { CANDIDATE_PROFILE_PROMPT } from "../prompts/candidate-profile";

describe("CANDIDATE_PROFILE_PROMPT", () => {
  it("includes compliance text in system prompt", () => {
    expect(CANDIDATE_PROFILE_PROMPT.system).toContain("COMPLIANCE REQUIREMENTS");
    expect(CANDIDATE_PROFILE_PROMPT.system).toContain("EU AI Act");
    expect(CANDIDATE_PROFILE_PROMPT.system).toContain(
      "MUST NOT infer emotions",
    );
  });

  it("includes disclaimer instruction in system prompt", () => {
    expect(CANDIDATE_PROFILE_PROMPT.system).toContain("disclaimer");
  });

  it("includes no-recommendation rule in system prompt", () => {
    expect(CANDIDATE_PROFILE_PROMPT.system).toContain(
      "MUST NOT recommend hiring or rejecting",
    );
  });

  it("generates user prompt with role, level, industry", () => {
    const prompt = CANDIDATE_PROFILE_PROMPT.user({
      role: "Software Engineer",
      level: "Senior",
      industry: "Technology",
    });
    expect(prompt).toContain("Software Engineer");
    expect(prompt).toContain("Senior");
    expect(prompt).toContain("Technology");
  });

  it("includes JD requirements when provided", () => {
    const prompt = CANDIDATE_PROFILE_PROMPT.user({
      role: "Backend Developer",
      level: "Mid",
      industry: "FinTech",
      jd_requirements: {
        required: ["Node.js", "PostgreSQL"],
        preferred: ["Redis"],
      },
    });
    expect(prompt).toContain("JD REQUIREMENTS");
    expect(prompt).toContain("Node.js");
    expect(prompt).toContain("Redis");
  });

  it("includes strategy skills when provided", () => {
    const prompt = CANDIDATE_PROFILE_PROMPT.user({
      role: "Frontend Developer",
      level: "Senior",
      industry: "Technology",
      strategy_skills_priority: {
        must_have: ["React", "TypeScript"],
        nice_to_have: ["Vue"],
      },
    });
    expect(prompt).toContain("STRATEGY SKILLS PRIORITY");
    expect(prompt).toContain("React");
    expect(prompt).toContain("Vue");
  });

  it("includes market skills when provided", () => {
    const prompt = CANDIDATE_PROFILE_PROMPT.user({
      role: "Data Engineer",
      level: "Senior",
      industry: "Technology",
      market_key_skills: {
        required: ["Python", "Spark"],
        emerging: ["dbt"],
      },
    });
    expect(prompt).toContain("MARKET SKILLS DATA");
    expect(prompt).toContain("Python");
    expect(prompt).toContain("dbt");
  });

  it("omits optional sections when not provided", () => {
    const prompt = CANDIDATE_PROFILE_PROMPT.user({
      role: "Designer",
      level: "Junior",
      industry: "Creative",
    });
    expect(prompt).not.toContain("JD REQUIREMENTS");
    expect(prompt).not.toContain("STRATEGY SKILLS PRIORITY");
    expect(prompt).not.toContain("MARKET SKILLS DATA");
  });

  it("has a version property", () => {
    expect(CANDIDATE_PROFILE_PROMPT.version).toBeDefined();
    expect(typeof CANDIDATE_PROFILE_PROMPT.version).toBe("string");
  });

  it("sanitizes user input (strips control characters)", () => {
    const prompt = CANDIDATE_PROFILE_PROMPT.user({
      role: "Test\x00Role\x07",
      level: "Senior\x1F",
      industry: "Tech\x08nology",
    });
    expect(prompt).toContain("TestRole");
    expect(prompt).not.toContain("\x00");
    expect(prompt).not.toContain("\x07");
    expect(prompt).not.toContain("\x1F");
    expect(prompt).not.toContain("\x08");
  });
});
