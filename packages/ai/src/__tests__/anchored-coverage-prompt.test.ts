import { describe, it, expect } from "vitest";
import { ANCHORED_COVERAGE_PROMPT, type AnchoredCoveragePromptInput } from "../prompts/anchored-coverage";
import { PROMPT_VERSIONS } from "../config";

const validInput: AnchoredCoveragePromptInput = {
  role: "Senior Software Engineer",
  level: "Senior",
  requirements_to_evaluate: [
    {
      requirement: "React experience",
      previous_strength: "strong",
      previous_fa: "Frontend Skills",
      reason: "fa_changed",
    },
    {
      requirement: "AWS certification",
      previous_severity: "critical",
      reason: "new_fas_added",
    },
  ],
  anchored_count: 5,
  total_requirements: 7,
  stages: [
    {
      name: "Technical Round",
      type: "technical",
      focus_areas: [
        { name: "Full Stack Dev", description: "Full stack development skills" },
        { name: "Cloud Skills", description: "AWS and cloud architecture" },
      ],
    },
    {
      name: "Behavioral Round",
      type: "behavioral",
      focus_areas: [
        { name: "Leadership", description: "Team leadership assessment" },
      ],
    },
  ],
};

describe("Anchored Coverage prompt", () => {
  it("has correct version reference", () => {
    expect(ANCHORED_COVERAGE_PROMPT.version).toBe(PROMPT_VERSIONS.anchoredCoverage);
  });

  it("system prompt includes compliance", () => {
    expect(ANCHORED_COVERAGE_PROMPT.system).toContain("EU AI Act");
  });

  it("system prompt describes incremental re-evaluation", () => {
    expect(ANCHORED_COVERAGE_PROMPT.system).toContain("INCREMENTAL");
    expect(ANCHORED_COVERAGE_PROMPT.system).toContain("SUBSET");
  });

  it("system prompt includes strength calibration", () => {
    expect(ANCHORED_COVERAGE_PROMPT.system).toContain("strong");
    expect(ANCHORED_COVERAGE_PROMPT.system).toContain("moderate");
    expect(ANCHORED_COVERAGE_PROMPT.system).toContain("weak");
  });

  it("user prompt includes role and level", () => {
    const prompt = ANCHORED_COVERAGE_PROMPT.user(validInput);
    expect(prompt).toContain("Senior Software Engineer");
    expect(prompt).toContain("Senior");
  });

  it("user prompt lists requirements to re-evaluate", () => {
    const prompt = ANCHORED_COVERAGE_PROMPT.user(validInput);
    expect(prompt).toContain("React experience");
    expect(prompt).toContain("AWS certification");
  });

  it("user prompt includes re-evaluation reasons", () => {
    const prompt = ANCHORED_COVERAGE_PROMPT.user(validInput);
    // The prompt should indicate why each requirement needs re-eval
    expect(prompt).toContain("Frontend Skills");
    expect(prompt).toContain("REMOVED");
  });

  it("user prompt shows anchored count", () => {
    const prompt = ANCHORED_COVERAGE_PROMPT.user(validInput);
    expect(prompt).toContain("5");
  });

  it("user prompt includes all current stages", () => {
    const prompt = ANCHORED_COVERAGE_PROMPT.user(validInput);
    expect(prompt).toContain("Technical Round");
    expect(prompt).toContain("Behavioral Round");
    expect(prompt).toContain("Full Stack Dev");
    expect(prompt).toContain("Cloud Skills");
    expect(prompt).toContain("Leadership");
  });

  it("sanitizes user-supplied input", () => {
    const malicious: AnchoredCoveragePromptInput = {
      ...validInput,
      role: "Engineer\x00\x01",
      level: "Senior\x7F",
    };
    const prompt = ANCHORED_COVERAGE_PROMPT.user(malicious);
    expect(prompt).not.toContain("\x00");
    expect(prompt).not.toContain("\x7F");
    expect(prompt).toContain("Engineer");
  });

  it("user prompt includes anti-duplicate instruction (EXACTLY ONCE)", () => {
    const prompt = ANCHORED_COVERAGE_PROMPT.user(validInput);
    expect(prompt).toContain("EXACTLY ONCE");
    expect(prompt).toContain("Do NOT list the same requirement multiple times");
  });

  it("handles empty requirements list", () => {
    const input: AnchoredCoveragePromptInput = {
      ...validInput,
      requirements_to_evaluate: [],
      anchored_count: 7,
    };
    const prompt = ANCHORED_COVERAGE_PROMPT.user(input);
    expect(prompt).toContain("0 of 7");
  });

  it("user prompt includes targeted fix context with FA name and description", () => {
    const input: AnchoredCoveragePromptInput = {
      ...validInput,
      requirements_to_evaluate: [
        {
          requirement: "AWS certification",
          previous_severity: "critical",
          reason: "targeted_fix",
          target_fa_name: "Cloud Infrastructure",
          target_fa_description: "Design and manage AWS services including EC2, S3, Lambda",
        },
      ],
    };
    const prompt = ANCHORED_COVERAGE_PROMPT.user(input);
    expect(prompt).toContain("AWS certification");
    expect(prompt).toContain("Cloud Infrastructure");
    expect(prompt).toContain("SPECIFICALLY ADDED");
    expect(prompt).toContain("Design and manage AWS services");
  });

  it("user prompt handles mix of targeted_fix and new_fas_added reasons", () => {
    const input: AnchoredCoveragePromptInput = {
      ...validInput,
      requirements_to_evaluate: [
        {
          requirement: "AWS certification",
          previous_severity: "critical",
          reason: "targeted_fix",
          target_fa_name: "Cloud Infrastructure",
          target_fa_description: "AWS cloud architecture and services",
        },
        {
          requirement: "GraphQL experience",
          previous_severity: "minor",
          reason: "new_fas_added",
        },
      ],
    };
    const prompt = ANCHORED_COVERAGE_PROMPT.user(input);
    expect(prompt).toContain("SPECIFICALLY ADDED");
    expect(prompt).toContain("new FA was ADDED that may cover this");
  });
});
