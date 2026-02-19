import { describe, it, expect } from "vitest";
import { COVERAGE_ANALYSIS_PROMPT, type CoverageAnalysisInput } from "../prompts/coverage-analysis";
import { PROMPT_VERSIONS } from "../config";

const validInput: CoverageAnalysisInput = {
  role: "Senior Software Engineer",
  level: "Senior",
  jd_requirements: {
    required: ["TypeScript", "React", "Node.js", "AWS"],
    preferred: ["GraphQL", "Kubernetes"],
    responsibilities: ["Lead development", "Code reviews", "Mentoring"],
  },
  stages: [
    {
      name: "Technical Interview",
      type: "technical",
      focus_areas: [
        { name: "Coding", description: "Live coding assessment" },
        { name: "System Design", description: "Architecture skills" },
      ],
    },
    {
      name: "Cultural Fit",
      type: "behavioral",
      focus_areas: [
        { name: "Team Collaboration", description: "Working with others" },
      ],
    },
  ],
};

describe("Coverage Analysis prompts", () => {
  it("has correct version reference", () => {
    expect(COVERAGE_ANALYSIS_PROMPT.version).toBe(PROMPT_VERSIONS.coverageAnalysis);
  });

  it("system prompt includes compliance", () => {
    expect(COVERAGE_ANALYSIS_PROMPT.system).toContain("EU AI Act");
  });

  it("system prompt includes scoring guidelines", () => {
    expect(COVERAGE_ANALYSIS_PROMPT.system).toContain("90-100");
    expect(COVERAGE_ANALYSIS_PROMPT.system).toContain("Below 50");
  });

  it("user prompt includes role and level", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(validInput);
    expect(prompt).toContain("Senior Software Engineer");
    expect(prompt).toContain("Senior");
  });

  it("user prompt includes all required requirements", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(validInput);
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("React");
    expect(prompt).toContain("Node.js");
    expect(prompt).toContain("AWS");
  });

  it("user prompt includes preferred requirements", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(validInput);
    expect(prompt).toContain("GraphQL");
    expect(prompt).toContain("Kubernetes");
  });

  it("user prompt includes responsibilities", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(validInput);
    expect(prompt).toContain("Lead development");
    expect(prompt).toContain("Code reviews");
  });

  it("user prompt includes stage names and types", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(validInput);
    expect(prompt).toContain("Technical Interview");
    expect(prompt).toContain("technical");
    expect(prompt).toContain("Cultural Fit");
    expect(prompt).toContain("behavioral");
  });

  it("user prompt includes focus area details", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(validInput);
    expect(prompt).toContain("Coding");
    expect(prompt).toContain("Live coding assessment");
    expect(prompt).toContain("System Design");
  });

  it("user prompt requests required output sections", () => {
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(validInput);
    expect(prompt).toContain("requirements_covered");
    expect(prompt).toContain("gaps");
    expect(prompt).toContain("redundancies");
    expect(prompt).toContain("overall_coverage_score");
    expect(prompt).toContain("disclaimer");
  });

  it("sanitizes user-supplied input", () => {
    const malicious: CoverageAnalysisInput = {
      ...validInput,
      role: "Engineer\x00\x01\x02",
      level: "Senior\x7F",
    };
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(malicious);
    expect(prompt).not.toContain("\x00");
    expect(prompt).not.toContain("\x01");
    expect(prompt).not.toContain("\x7F");
    expect(prompt).toContain("Engineer");
  });

  it("handles empty stages array", () => {
    const input: CoverageAnalysisInput = {
      ...validInput,
      stages: [],
    };
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(input);
    expect(prompt).toContain("Senior Software Engineer");
    // Should still generate a valid prompt even with no stages
    expect(prompt).toContain("INTERVIEW STAGES");
  });

  it("handles empty requirements arrays", () => {
    const input: CoverageAnalysisInput = {
      ...validInput,
      jd_requirements: { required: [], preferred: [], responsibilities: [] },
    };
    const prompt = COVERAGE_ANALYSIS_PROMPT.user(input);
    expect(prompt).toContain("Required:");
  });
});
