/**
 * Live Integration Tests — Real API Calls
 *
 * Run with: LIVE_TEST=1 pnpm --filter @reconnect/ai test:live
 *
 * These tests make REAL calls to the Anthropic API and validate that
 * Claude's actual output passes our Zod schemas. This catches:
 * - Schema bounds that are too tight for real AI output
 * - zodOutputFormat incompatibilities (e.g. z.union of literals)
 * - Prompt drift where Claude stops following instructions
 * - Model behavior changes after Anthropic updates
 *
 * Each test has a 120s timeout (AI calls can take 30-60s).
 * These tests cost real API credits — run sparingly.
 */

import { describe, it, expect } from "vitest";

// Skip entire suite unless LIVE_TEST=1
const LIVE = process.env.LIVE_TEST === "1";
const describeIf = LIVE ? describe : describe.skip;

describeIf("Live Pipeline Integration", () => {
  // Shared test inputs (minimal but valid)
  const baseInput = {
    role: "Software Engineer",
    level: "Senior",
    industry: "Technology",
  };

  describeIf("generateJobDescription", () => {
    it(
      "generates a valid JD that passes schema validation",
      async () => {
        const { generateJobDescription } = await import("../../pipelines/jd-generation");
        const result = await generateJobDescription({
          ...baseInput,
          style: "concise",
        });
        expect(result.data).toBeDefined();
        expect(result.data.title).toBeTruthy();
        expect(result.data.responsibilities.length).toBeGreaterThan(0);
        expect(result.data.confidence).toBeGreaterThanOrEqual(0);
        expect(result.data.confidence).toBeLessThanOrEqual(1);
        expect(result.metadata.model_used).toBeTruthy();
      },
      { timeout: 120_000 },
    );
  });

  describeIf("generateStages", () => {
    it(
      "generates valid interview stages that pass schema validation",
      async () => {
        const { generateStages } = await import("../../pipelines/stage-generation");
        const result = await generateStages(baseInput);
        expect(result.data.stages.length).toBeGreaterThan(0);

        for (const stage of result.data.stages) {
          expect(stage.name).toBeTruthy();
          expect(stage.focus_areas.length).toBeGreaterThanOrEqual(1);
          expect(stage.focus_areas.length).toBeLessThanOrEqual(5);
          expect(stage.suggested_questions.length).toBeGreaterThanOrEqual(3);
          expect(stage.suggested_questions.length).toBeLessThanOrEqual(20);

          for (const fa of stage.focus_areas) {
            expect(fa.weight).toBeGreaterThanOrEqual(1);
            expect(fa.weight).toBeLessThanOrEqual(4);
          }
        }
      },
      { timeout: 120_000 },
    );
  });

  describeIf("generateHiringStrategy", () => {
    it(
      "generates a valid strategy that passes schema validation",
      async () => {
        const { generateHiringStrategy } = await import(
          "../../pipelines/strategy-generation"
        );
        // Strategy needs market insights — use minimal mock
        const result = await generateHiringStrategy({
          ...baseInput,
          market_insights: {
            salary: { min: 60000, max: 100000, median: 80000, currency: "EUR", confidence: 0.7 },
            competition: {
              companies_hiring: ["Google", "Meta"],
              job_postings_count: 150,
              market_saturation: "medium" as const,
            },
            time_to_hire: {
              average_days: 35,
              range: { min: 14, max: 60 },
            },
            candidate_availability: {
              level: "moderate" as const,
              description: "Steady supply of senior engineers",
            },
            key_skills: {
              required: ["TypeScript", "React", "Node.js"],
              emerging: ["AI/ML", "Rust"],
              declining: ["jQuery"],
            },
            trends: ["Remote-first adoption", "AI integration roles growing"],
          },
        });
        expect(result.data).toBeDefined();
        expect(result.data.market_classification).toBeTruthy();
        expect(result.data.disclaimer).toBeTruthy();
        expect(result.data.key_risks.length).toBeGreaterThan(0);
      },
      { timeout: 120_000 },
    );
  });

  describeIf("analyzeCoverage", () => {
    it(
      "generates a valid coverage analysis that passes schema validation",
      async () => {
        const { analyzeCoverage } = await import("../../pipelines/coverage-analysis");
        const result = await analyzeCoverage({
          ...baseInput,
          jd_requirements: {
            required: ["TypeScript", "5+ years experience"],
            preferred: ["AWS", "CI/CD"],
            responsibilities: ["Lead development", "Code reviews"],
          },
          stages: [
            {
              name: "Technical Interview",
              type: "technical",
              focus_areas: [
                { name: "Coding", description: "Assess coding skills" },
                { name: "System Design", description: "Architecture skills" },
              ],
            },
            {
              name: "Culture Fit",
              type: "screening",
              focus_areas: [
                { name: "Values", description: "Team alignment" },
              ],
            },
          ],
        });
        expect(result.data).toBeDefined();
        expect(result.data.overall_coverage_score).toBeGreaterThanOrEqual(0);
        expect(result.data.overall_coverage_score).toBeLessThanOrEqual(100);
        expect(result.data.disclaimer).toBeTruthy();
      },
      { timeout: 120_000 },
    );
  });

  describeIf("generateCandidateProfile", () => {
    it(
      "generates a valid candidate profile that passes schema validation",
      async () => {
        const { generateCandidateProfile } = await import(
          "../../pipelines/candidate-profile"
        );
        const result = await generateCandidateProfile(baseInput);
        expect(result.data).toBeDefined();
        expect(result.data.disclaimer).toBeTruthy();
      },
      { timeout: 120_000 },
    );
  });
});
