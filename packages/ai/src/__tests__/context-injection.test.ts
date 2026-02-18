import { describe, it, expect } from "vitest";
import { buildMarketContextForJD } from "../pipelines/market-insights";
import { buildJDContextForStages } from "../pipelines/jd-generation";
import type { MarketInsightsOutput } from "../schemas";
import type { JobDescriptionOutput } from "../schemas";

describe("Context Injection — Market → JD", () => {
  const mockInsights: MarketInsightsOutput = {
    phase: "deep",
    salary: {
      min: 55000,
      max: 85000,
      median: 70000,
      currency: "EUR",
      confidence: 0.8,
    },
    competition: {
      companies_hiring: [
        "Accenture",
        "Deloitte",
        "Google",
        "Meta",
        "Stripe",
        "Intercom",
      ],
      job_postings_count: 150,
      market_saturation: "medium",
    },
    time_to_hire: { average_days: 30, range: { min: 14, max: 60 } },
    candidate_availability: {
      level: "moderate",
      description: "Good pool",
    },
    key_skills: {
      required: [
        "TypeScript",
        "React",
        "Node.js",
        "PostgreSQL",
        "AWS",
        "Docker",
        "CI/CD",
        "REST",
        "GraphQL",
        "Git",
        "Agile",
        "Testing",
      ],
      emerging: ["Rust", "AI/ML"],
      declining: ["jQuery"],
    },
    trends: ["Remote-first"],
    metadata: {
      model_used: "claude-opus-4-6",
      prompt_version: "1.0.0",
      generated_at: "2026-02-19T10:00:00Z",
      source_count: 8,
      confidence: 0.82,
    },
  };

  it("extracts salary range", () => {
    const ctx = buildMarketContextForJD(mockInsights);
    expect(ctx.salary_range).toEqual({
      min: 55000,
      max: 85000,
      currency: "EUR",
    });
  });

  it("limits key_skills to 10", () => {
    const ctx = buildMarketContextForJD(mockInsights);
    expect(ctx.key_skills).toHaveLength(10);
  });

  it("limits competitors to 5", () => {
    const ctx = buildMarketContextForJD(mockInsights);
    expect(ctx.competitors).toHaveLength(5);
  });

  it("includes demand level", () => {
    const ctx = buildMarketContextForJD(mockInsights);
    expect(ctx.demand_level).toBe("moderate");
  });
});

describe("Context Injection — JD → Stages", () => {
  const mockJD: JobDescriptionOutput = {
    title: "Senior Software Engineer",
    summary: "Join our team",
    responsibilities: [
      "Lead development",
      "Code reviews",
      "Mentoring",
      "Architecture",
      "Sprint planning",
      "Deployment",
    ],
    requirements: {
      required: [
        "5+ years",
        "TypeScript",
        "React",
        "Node.js",
        "AWS",
        "Leadership",
      ],
      preferred: ["Go", "Kubernetes"],
    },
    benefits: ["Health"],
    seniority_signals: [
      "lead development",
      "mentor junior",
      "architecture decisions",
      "strategic planning",
      "budget management",
      "cross-team",
    ],
    confidence: 0.85,
  };

  it("extracts up to 5 responsibilities", () => {
    const ctx = buildJDContextForStages(mockJD);
    expect(ctx.responsibilities).toHaveLength(5);
  });

  it("extracts up to 5 requirements", () => {
    const ctx = buildJDContextForStages(mockJD);
    expect(ctx.requirements).toHaveLength(5);
  });

  it("extracts up to 5 seniority signals", () => {
    const ctx = buildJDContextForStages(mockJD);
    expect(ctx.seniority_signals).toHaveLength(5);
  });

  it("handles missing optional fields", () => {
    const minimal: JobDescriptionOutput = {
      title: "Dev",
      summary: "A role",
      responsibilities: ["Code"],
      requirements: { required: ["JS"], preferred: [] },
      benefits: [],
      confidence: 0.5,
    };

    const ctx = buildJDContextForStages(minimal);
    expect(ctx.responsibilities).toEqual(["Code"]);
    expect(ctx.requirements).toEqual(["JS"]);
    expect(ctx.seniority_signals).toBeUndefined();
  });
});
