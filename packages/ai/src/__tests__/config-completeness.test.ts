import { describe, it, expect } from "vitest";
import { AI_CONFIG, PROMPT_VERSIONS, SEARCH_CONFIG } from "../config";

describe("AI_CONFIG completeness", () => {
  const expectedEndpoints = [
    "marketInsights",
    "marketInsightsQuick",
    "jdGeneration",
    "stageGeneration",
    "questionGeneration",
    "feedbackSynthesis",
    "queryGeneration",
    "sourceScoring",
    "sourceExtraction",
    "strategyGeneration",
    "coverageAnalysis",
    "candidateProfile",
  ];

  it("has all expected endpoints", () => {
    for (const endpoint of expectedEndpoints) {
      expect(AI_CONFIG).toHaveProperty(endpoint);
    }
  });

  it("every endpoint has model, temperature, maxTokens", () => {
    for (const [key, config] of Object.entries(AI_CONFIG)) {
      expect(config, `${key} should have model`).toHaveProperty("model");
      expect(config, `${key} should have temperature`).toHaveProperty("temperature");
      expect(config, `${key} should have maxTokens`).toHaveProperty("maxTokens");
    }
  });

  it("no endpoint has temperature > 1", () => {
    for (const [key, config] of Object.entries(AI_CONFIG)) {
      expect(config.temperature, `${key} temperature should be <= 1`).toBeLessThanOrEqual(1);
    }
  });

  it("no endpoint has temperature < 0", () => {
    for (const [key, config] of Object.entries(AI_CONFIG)) {
      expect(config.temperature, `${key} temperature should be >= 0`).toBeGreaterThanOrEqual(0);
    }
  });

  it("all models are valid Claude model IDs", () => {
    const validModels = ["claude-opus-4-6", "claude-sonnet-4-5-20250929"];
    for (const [key, config] of Object.entries(AI_CONFIG)) {
      expect(validModels, `${key} model "${config.model}" should be valid`).toContain(config.model);
    }
  });

  it("maxTokens are reasonable (256-16384)", () => {
    for (const [key, config] of Object.entries(AI_CONFIG)) {
      expect(config.maxTokens, `${key} maxTokens`).toBeGreaterThanOrEqual(256);
      expect(config.maxTokens, `${key} maxTokens`).toBeLessThanOrEqual(16384);
    }
  });

  it("high-stakes endpoints use lower temperature", () => {
    // Feedback synthesis and source scoring should be deterministic
    expect(AI_CONFIG.feedbackSynthesis.temperature).toBeLessThanOrEqual(0.2);
    expect(AI_CONFIG.sourceScoring.temperature).toBeLessThanOrEqual(0.2);
    expect(AI_CONFIG.coverageAnalysis.temperature).toBeLessThanOrEqual(0.2);
  });

  it("creative endpoints use higher temperature", () => {
    // Query generation benefits from diversity
    expect(AI_CONFIG.queryGeneration.temperature).toBeGreaterThanOrEqual(0.4);
  });
});

describe("PROMPT_VERSIONS completeness", () => {
  const expectedVersions = [
    "compliance",
    "marketInsights",
    "queryGeneration",
    "sourceScoring",
    "sourceExtraction",
    "jdGeneration",
    "stageGeneration",
    "questionGeneration",
    "feedbackSynthesis",
    "strategyGeneration",
    "coverageAnalysis",
    "candidateProfile",
  ];

  it("has all expected prompt versions", () => {
    for (const key of expectedVersions) {
      expect(PROMPT_VERSIONS, `Missing prompt version: ${key}`).toHaveProperty(key);
    }
  });

  it("all versions are semver format", () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    for (const [key, version] of Object.entries(PROMPT_VERSIONS)) {
      expect(version, `${key} should be semver`).toMatch(semverRegex);
    }
  });

  it("PROMPT_VERSIONS keys are a superset of pipeline-relevant AI_CONFIG keys", () => {
    // Every pipeline needs a prompt version
    const pipelineEndpoints = [
      "marketInsights",
      "jdGeneration",
      "stageGeneration",
      "feedbackSynthesis",
      "strategyGeneration",
      "coverageAnalysis",
    ];
    for (const key of pipelineEndpoints) {
      expect(PROMPT_VERSIONS).toHaveProperty(key);
    }
  });
});

describe("SEARCH_CONFIG", () => {
  it("has reasonable query limits", () => {
    expect(SEARCH_CONFIG.maxQueriesPerResearch).toBeGreaterThanOrEqual(4);
    expect(SEARCH_CONFIG.maxQueriesPerResearch).toBeLessThanOrEqual(20);
  });

  it("has reasonable results per query", () => {
    expect(SEARCH_CONFIG.maxResultsPerQuery).toBeGreaterThanOrEqual(3);
    expect(SEARCH_CONFIG.maxResultsPerQuery).toBeLessThanOrEqual(15);
  });

  it("has reasonable sources for extraction", () => {
    expect(SEARCH_CONFIG.maxSourcesForExtraction).toBeGreaterThanOrEqual(5);
    expect(SEARCH_CONFIG.maxSourcesForExtraction).toBeLessThanOrEqual(25);
  });

  it("cache TTL is 30 days", () => {
    expect(SEARCH_CONFIG.cacheTTLDays).toBe(30);
  });

  it("tavily uses advanced search depth", () => {
    expect(SEARCH_CONFIG.tavily.searchDepth).toBe("advanced");
  });

  it("tavily does not include raw content (saves bandwidth)", () => {
    expect(SEARCH_CONFIG.tavily.includeRawContent).toBe(false);
  });

  it("tavily does not include answer (we synthesize ourselves)", () => {
    expect(SEARCH_CONFIG.tavily.includeAnswer).toBe(false);
  });
});
