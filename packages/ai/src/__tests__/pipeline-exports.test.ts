import { describe, it, expect } from "vitest";

/**
 * These tests verify that all public exports from the AI package are
 * correctly wired up — a barrel export regression guard.
 */

describe("Schema exports", () => {
  it("exports all schemas from index", async () => {
    const schemas = await import("../schemas/index");
    expect(schemas.MarketInsightsSchema).toBeDefined();
    expect(schemas.QuickMarketInsightsSchema).toBeDefined();
    expect(schemas.JobDescriptionSchema).toBeDefined();
    expect(schemas.InterviewStageSchema).toBeDefined();
    expect(schemas.InterviewStagesSchema).toBeDefined();
    expect(schemas.FeedbackSynthesisSchema).toBeDefined();
    expect(schemas.QuestionsForFocusAreaSchema).toBeDefined();
    expect(schemas.SearchQueriesSchema).toBeDefined();
    expect(schemas.SourceScoringSchema).toBeDefined();
    expect(schemas.SourceExtractionSchema).toBeDefined();
    expect(schemas.HiringStrategySchema).toBeDefined();
    expect(schemas.CoverageAnalysisSchema).toBeDefined();
  });

  it("exports types from schemas", async () => {
    // Type-level check: these should not throw
    const schemas = await import("../schemas/index");
    const hiringStrategy = schemas.HiringStrategySchema;
    const coverage = schemas.CoverageAnalysisSchema;
    expect(hiringStrategy.shape).toBeDefined();
    expect(coverage.shape).toBeDefined();
  });
});

describe("Prompt exports", () => {
  it("exports all prompts from index", async () => {
    const prompts = await import("../prompts/index");
    expect(prompts.COMPLIANCE_SYSTEM_PROMPT).toBeDefined();
    expect(prompts.MARKET_INSIGHTS_PROMPTS).toBeDefined();
    expect(prompts.JD_GENERATION_PROMPT).toBeDefined();
    expect(prompts.STAGE_GENERATION_PROMPT).toBeDefined();
    expect(prompts.QUESTION_GENERATION_PROMPT).toBeDefined();
    expect(prompts.FEEDBACK_SYNTHESIS_PROMPT).toBeDefined();
    expect(prompts.STRATEGY_GENERATION_PROMPT).toBeDefined();
    expect(prompts.COVERAGE_ANALYSIS_PROMPT).toBeDefined();
  });
});

describe("Pipeline exports", () => {
  it("exports all pipelines from index", async () => {
    const pipelines = await import("../pipelines/index");
    expect(pipelines.buildMarketContextForJD).toBeDefined();
    expect(pipelines.buildJDContextForStages).toBeDefined();
    expect(pipelines.generateHiringStrategy).toBeDefined();
    expect(pipelines.buildStrategyContextForJD).toBeDefined();
    expect(pipelines.buildStrategyContextForStages).toBeDefined();
    expect(pipelines.analyzeCoverage).toBeDefined();
  });
});

describe("Top-level package exports", () => {
  it("exports config values", async () => {
    const pkg = await import("../index");
    expect(pkg.AI_CONFIG).toBeDefined();
    expect(pkg.PROMPT_VERSIONS).toBeDefined();
    expect(pkg.SEARCH_CONFIG).toBeDefined();
  });

  it("exports error classes", async () => {
    const pkg = await import("../index");
    expect(pkg.AIError).toBeDefined();
    expect(pkg.AIValidationError).toBeDefined();
    expect(pkg.AISearchError).toBeDefined();
  });

  it("exports retry utilities", async () => {
    const pkg = await import("../index");
    expect(pkg.withRetry).toBeDefined();
    expect(pkg.withModelEscalation).toBeDefined();
  });

  it("exports sanitize utilities", async () => {
    const pkg = await import("../index");
    expect(pkg.sanitizeInput).toBeDefined();
    expect(pkg.wrapUserContent).toBeDefined();
  });
});
