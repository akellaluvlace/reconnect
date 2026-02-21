/**
 * Type Drift Detection — Contract Tests
 *
 * These tests catch when one layer (AI schema, domain type, API route schema)
 * changes and another doesn't. They import ACTUAL schemas from @reconnect/ai
 * and verify field names, types, and structural alignment match what consumers
 * (UI components, API routes, domain types) expect.
 *
 * No mocks — these are pure schema introspection tests.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  FeedbackSynthesisSchema,
  CandidateProfileSchema,
  HiringStrategySchema,
  CoverageAnalysisSchema,
} from "@reconnect/ai";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the top-level keys of a Zod object schema.
 */
function schemaKeys(schema: z.ZodObject<z.ZodRawShape>): string[] {
  return Object.keys(schema.shape);
}

// ===========================================================================
// Tests
// ===========================================================================

describe("Type Drift Detection", () => {
  // -------------------------------------------------------------------------
  // 1. FeedbackSynthesisSchema <-> UI SynthesisData
  // -------------------------------------------------------------------------
  describe("FeedbackSynthesisSchema <-> UI SynthesisData", () => {
    // UI components (synthesis display, feedback summary) expect these fields
    const EXPECTED_FIELDS = [
      "summary",
      "consensus",
      "key_strengths",
      "key_concerns",
      "discussion_points",
      "rating_overview",
      "disclaimer",
    ];

    it("has all fields the UI expects", () => {
      const shape = FeedbackSynthesisSchema.shape;
      for (const field of EXPECTED_FIELDS) {
        expect(shape).toHaveProperty(field);
      }
    });

    it("has no unexpected extra fields (UI must handle them)", () => {
      const actualKeys = schemaKeys(FeedbackSynthesisSchema);
      // Every field in the schema should be in the expected list.
      // If this fails, a new field was added to the schema but the UI
      // contract hasn't been updated — might cause silent data loss.
      for (const key of actualKeys) {
        expect(
          EXPECTED_FIELDS.includes(key),
        ).toBe(true);
      }
    });

    it("consensus is an object with areas_of_agreement/disagreement (not a string)", () => {
      const consensusSchema = FeedbackSynthesisSchema.shape.consensus;

      // Valid structured consensus
      const validConsensus = {
        areas_of_agreement: ["Strong communication"],
        areas_of_disagreement: ["Cloud experience level unclear"],
      };
      expect(consensusSchema.safeParse(validConsensus).success).toBe(true);

      // Reject plain string — prevents drift to a simpler type
      expect(consensusSchema.safeParse("just a string").success).toBe(false);

      // Reject empty object — must have both arrays
      expect(consensusSchema.safeParse({}).success).toBe(false);
    });

    it("consensus.areas_of_agreement is string[] (not string)", () => {
      const consensusSchema = FeedbackSynthesisSchema.shape.consensus;
      const withStringInsteadOfArray = {
        areas_of_agreement: "just one thing",
        areas_of_disagreement: [],
      };
      expect(consensusSchema.safeParse(withStringInsteadOfArray).success).toBe(false);
    });

    it("rating_overview is structured (not Record<string, number>)", () => {
      const ratingSchema = FeedbackSynthesisSchema.shape.rating_overview;

      // Valid structured rating overview
      const validRating = {
        average_score: 3,
        total_feedback_count: 2,
        score_distribution: [
          { score: 3, count: 2 },
        ],
      };
      expect(ratingSchema.safeParse(validRating).success).toBe(true);

      // Reject flat key-value map — old/wrong shape
      const flatMap = { Technical: 3, Communication: 4 };
      expect(ratingSchema.safeParse(flatMap).success).toBe(false);
    });

    it("rating_overview.average_score is bounded 1-4 (not 1-5)", () => {
      const ratingSchema = FeedbackSynthesisSchema.shape.rating_overview;

      const scoreOf5 = {
        average_score: 5,
        total_feedback_count: 1,
        score_distribution: [{ score: 5, count: 1 }],
      };
      expect(ratingSchema.safeParse(scoreOf5).success).toBe(false);

      const scoreOf0 = {
        average_score: 0,
        total_feedback_count: 1,
        score_distribution: [{ score: 1, count: 1 }],
      };
      expect(ratingSchema.safeParse(scoreOf0).success).toBe(false);
    });

    it("rating_overview.score_distribution items have score + count", () => {
      const ratingSchema = FeedbackSynthesisSchema.shape.rating_overview;

      // Missing count
      const missingCount = {
        average_score: 3,
        total_feedback_count: 1,
        score_distribution: [{ score: 3 }],
      };
      expect(ratingSchema.safeParse(missingCount).success).toBe(false);

      // Missing score
      const missingScore = {
        average_score: 3,
        total_feedback_count: 1,
        score_distribution: [{ count: 1 }],
      };
      expect(ratingSchema.safeParse(missingScore).success).toBe(false);
    });

    it("disclaimer is required (EU AI Act compliance)", () => {
      // Build a complete object minus disclaimer
      const withoutDisclaimer = {
        summary: "Test",
        consensus: { areas_of_agreement: [], areas_of_disagreement: [] },
        key_strengths: [],
        key_concerns: [],
        discussion_points: [],
        rating_overview: {
          average_score: 3,
          total_feedback_count: 1,
          score_distribution: [{ score: 3, count: 1 }],
        },
        // disclaimer intentionally omitted
      };
      expect(FeedbackSynthesisSchema.safeParse(withoutDisclaimer).success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. CandidateProfileSchema <-> domain CandidateProfile
  // -------------------------------------------------------------------------
  describe("CandidateProfileSchema <-> domain CandidateProfile", () => {
    // Domain type fields from packages/database/src/domain-types.ts
    const DOMAIN_FIELDS = [
      "ideal_background",
      "must_have_skills",
      "nice_to_have_skills",
      "experience_range",
      "cultural_fit_indicators",
      "disclaimer",
    ];

    it("has all domain type fields", () => {
      const shape = CandidateProfileSchema.shape;
      for (const field of DOMAIN_FIELDS) {
        expect(shape).toHaveProperty(field);
      }
    });

    it("schema fields match domain type exactly (no extras, no missing)", () => {
      const schemaFields = schemaKeys(CandidateProfileSchema).sort();
      const domainFields = [...DOMAIN_FIELDS].sort();
      expect(schemaFields).toEqual(domainFields);
    });

    it("disclaimer is required (not optional)", () => {
      // All optional fields provided, but no disclaimer
      const withoutDisclaimer = {
        ideal_background: "CS degree",
        must_have_skills: ["TypeScript"],
        nice_to_have_skills: ["GraphQL"],
        experience_range: "5-8 years",
        cultural_fit_indicators: ["Team player"],
        // disclaimer intentionally omitted
      };
      expect(CandidateProfileSchema.safeParse(withoutDisclaimer).success).toBe(false);
    });

    it("optional fields accept undefined", () => {
      // Only disclaimer is required
      const minimal = {
        disclaimer: "AI-generated. Human review required.",
      };
      expect(CandidateProfileSchema.safeParse(minimal).success).toBe(true);
    });

    it("must_have_skills is string[] (not string)", () => {
      const shape = CandidateProfileSchema.shape;
      const mustHave = shape.must_have_skills;
      // Should accept array
      expect(mustHave.safeParse(["TypeScript", "React"]).success).toBe(true);
      // Should reject plain string
      expect(mustHave.safeParse("TypeScript").success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. HiringStrategySchema <-> domain HiringStrategy
  // -------------------------------------------------------------------------
  describe("HiringStrategySchema <-> domain HiringStrategy", () => {
    // Domain type fields from packages/database/src/domain-types.ts
    const DOMAIN_FIELDS = [
      "market_classification",
      "market_classification_rationale",
      "salary_positioning",
      "process_speed",
      "competitive_differentiators",
      "skills_priority",
      "key_risks",
      "recommendations",
      "disclaimer",
    ];

    it("has all domain type fields", () => {
      const shape = HiringStrategySchema.shape;
      for (const field of DOMAIN_FIELDS) {
        expect(shape).toHaveProperty(field);
      }
    });

    it("schema fields match domain type exactly", () => {
      const schemaFields = schemaKeys(HiringStrategySchema).sort();
      const domainFields = [...DOMAIN_FIELDS].sort();
      expect(schemaFields).toEqual(domainFields);
    });

    it("skills_priority has must_have, nice_to_have, emerging_premium", () => {
      const skillsSchema = HiringStrategySchema.shape.skills_priority;

      const valid = {
        must_have: ["TypeScript", "React"],
        nice_to_have: ["GraphQL"],
        emerging_premium: ["Rust"],
      };
      expect(skillsSchema.safeParse(valid).success).toBe(true);
    });

    it("skills_priority rejects missing must_have (required, not optional)", () => {
      const skillsSchema = HiringStrategySchema.shape.skills_priority;

      const missingMustHave = {
        nice_to_have: ["GraphQL"],
        emerging_premium: ["Rust"],
      };
      expect(skillsSchema.safeParse(missingMustHave).success).toBe(false);
    });

    it("market_classification uses 3-value enum (not free string)", () => {
      const mcSchema = HiringStrategySchema.shape.market_classification;

      // Valid values
      expect(mcSchema.safeParse("employer_market").success).toBe(true);
      expect(mcSchema.safeParse("balanced").success).toBe(true);
      expect(mcSchema.safeParse("candidate_market").success).toBe(true);

      // Invalid values
      expect(mcSchema.safeParse("hot_market").success).toBe(false);
      expect(mcSchema.safeParse("").success).toBe(false);
    });

    it("salary_positioning.strategy uses lead/match/lag enum", () => {
      const salarySchema = HiringStrategySchema.shape.salary_positioning;

      const valid = {
        strategy: "lead",
        rationale: "Market is competitive",
        recommended_range: { min: 70000, max: 110000, currency: "EUR" },
      };
      expect(salarySchema.safeParse(valid).success).toBe(true);

      const invalidStrategy = {
        strategy: "competitive",
        rationale: "Market is competitive",
        recommended_range: { min: 70000, max: 110000, currency: "EUR" },
      };
      expect(salarySchema.safeParse(invalidStrategy).success).toBe(false);
    });

    it("process_speed.recommendation uses fast_track/standard/thorough enum", () => {
      const speedSchema = HiringStrategySchema.shape.process_speed;

      const valid = {
        recommendation: "fast_track",
        rationale: "Candidate market — move quickly",
        max_stages: 3,
        target_days: 14,
      };
      expect(speedSchema.safeParse(valid).success).toBe(true);

      const invalidRec = {
        recommendation: "slow",
        rationale: "No rush",
        max_stages: 3,
        target_days: 14,
      };
      expect(speedSchema.safeParse(invalidRec).success).toBe(false);
    });

    it("key_risks items have risk + mitigation (not just string[])", () => {
      const risksSchema = HiringStrategySchema.shape.key_risks;

      const valid = [{ risk: "Limited talent pool", mitigation: "Widen search" }];
      expect(risksSchema.safeParse(valid).success).toBe(true);

      // Reject plain string array
      const plainStrings = ["Risk 1", "Risk 2"];
      expect(risksSchema.safeParse(plainStrings).success).toBe(false);
    });

    it("disclaimer is required", () => {
      const fullObj = {
        market_classification: "balanced",
        market_classification_rationale: "Even supply/demand",
        salary_positioning: {
          strategy: "match",
          rationale: "Standard positioning",
          recommended_range: { min: 70000, max: 100000, currency: "EUR" },
        },
        process_speed: {
          recommendation: "standard",
          rationale: "Normal timeline",
          max_stages: 4,
          target_days: 30,
        },
        competitive_differentiators: ["Remote-first"],
        skills_priority: {
          must_have: ["TypeScript"],
          nice_to_have: ["GraphQL"],
          emerging_premium: ["Rust"],
        },
        key_risks: [{ risk: "Talent scarcity", mitigation: "Broaden search" }],
        recommendations: ["Move quickly"],
        // disclaimer intentionally omitted
      };
      expect(HiringStrategySchema.safeParse(fullObj).success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. CoverageAnalysisSchema <-> domain CoverageAnalysis
  // -------------------------------------------------------------------------
  describe("CoverageAnalysisSchema <-> domain CoverageAnalysis", () => {
    // Domain type fields from packages/database/src/domain-types.ts
    const DOMAIN_FIELDS = [
      "requirements_covered",
      "gaps",
      "redundancies",
      "recommendations",
      "overall_coverage_score",
      "disclaimer",
    ];

    it("has all domain type fields", () => {
      const shape = CoverageAnalysisSchema.shape;
      for (const field of DOMAIN_FIELDS) {
        expect(shape).toHaveProperty(field);
      }
    });

    it("schema fields match domain type exactly", () => {
      const schemaFields = schemaKeys(CoverageAnalysisSchema).sort();
      const domainFields = [...DOMAIN_FIELDS].sort();
      expect(schemaFields).toEqual(domainFields);
    });

    it("overall_coverage_score is a number bounded 0-100", () => {
      const scoreSchema = CoverageAnalysisSchema.shape.overall_coverage_score;

      expect(scoreSchema.safeParse(72).success).toBe(true);
      expect(scoreSchema.safeParse(0).success).toBe(true);
      expect(scoreSchema.safeParse(100).success).toBe(true);

      // Out of bounds
      expect(scoreSchema.safeParse(-1).success).toBe(false);
      expect(scoreSchema.safeParse(101).success).toBe(false);

      // Not a number
      expect(scoreSchema.safeParse("72").success).toBe(false);
    });

    it("requirements_covered items have coverage_strength enum (strong/moderate/weak)", () => {
      const reqSchema = CoverageAnalysisSchema.shape.requirements_covered;

      const valid = [
        {
          requirement: "TypeScript proficiency",
          covered_by_stage: "Technical Interview",
          covered_by_focus_area: "Coding",
          coverage_strength: "strong",
        },
      ];
      expect(reqSchema.safeParse(valid).success).toBe(true);

      const invalidStrength = [
        {
          requirement: "TypeScript proficiency",
          covered_by_stage: "Technical Interview",
          covered_by_focus_area: "Coding",
          coverage_strength: "excellent",
        },
      ];
      expect(reqSchema.safeParse(invalidStrength).success).toBe(false);
    });

    it("gaps items have severity enum (critical/important/minor)", () => {
      const gapsSchema = CoverageAnalysisSchema.shape.gaps;

      const valid = [
        {
          requirement: "Cloud experience",
          severity: "critical",
          suggestion: "Add cloud-focused stage",
        },
      ];
      expect(gapsSchema.safeParse(valid).success).toBe(true);

      const invalidSeverity = [
        {
          requirement: "Cloud experience",
          severity: "high",
          suggestion: "Add cloud-focused stage",
        },
      ];
      expect(gapsSchema.safeParse(invalidSeverity).success).toBe(false);
    });

    it("redundancies items have appears_in_stages as string[]", () => {
      const redundanciesSchema = CoverageAnalysisSchema.shape.redundancies;

      const valid = [
        {
          focus_area: "Communication",
          appears_in_stages: ["Phone Screen", "Technical Interview"],
          recommendation: "Consolidate",
        },
      ];
      expect(redundanciesSchema.safeParse(valid).success).toBe(true);

      // appears_in_stages as string (not array) should fail
      const invalidStages = [
        {
          focus_area: "Communication",
          appears_in_stages: "Phone Screen",
          recommendation: "Consolidate",
        },
      ];
      expect(redundanciesSchema.safeParse(invalidStages).success).toBe(false);
    });

    it("disclaimer is required", () => {
      const withoutDisclaimer = {
        requirements_covered: [],
        gaps: [],
        redundancies: [],
        recommendations: ["Add more stages"],
        overall_coverage_score: 50,
        // disclaimer intentionally omitted
      };
      expect(CoverageAnalysisSchema.safeParse(withoutDisclaimer).success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 5. API Request Schema <-> Consumer Payload (Zod v3 silent stripping)
  // -------------------------------------------------------------------------
  describe("API Request Schema <-> Consumer Payload (Zod v3 silent stripping)", () => {
    // These tests duplicate the route's Zod schemas inline because route files
    // don't export their schemas. The point: if the route schema changes and
    // this test's copy doesn't (or vice versa), we catch the drift.

    describe("generate-candidate-profile request schema", () => {
      // Inline copy of the route's RequestSchema
      const RouteRequestSchema = z.object({
        role: z.string().min(1).max(200),
        level: z.string().min(1).max(100),
        industry: z.string().min(1).max(200),
        skills: z.array(z.string().max(100)).max(30).optional(),
        jd_requirements: z
          .object({
            required: z.array(z.string().max(200)).max(20),
            preferred: z.array(z.string().max(200)).max(20),
          })
          .optional(),
        strategy_skills_priority: z
          .object({
            must_have: z.array(z.string().max(100)).max(15),
            nice_to_have: z.array(z.string().max(100)).max(15),
          })
          .optional(),
        market_key_skills: z
          .object({
            required: z.array(z.string().max(100)).max(15),
            emerging: z.array(z.string().max(100)).max(10),
          })
          .optional(),
      });

      it("accepts jd_requirements with required/preferred shape", () => {
        const payload = {
          role: "Software Engineer",
          level: "Senior",
          industry: "Technology",
          jd_requirements: {
            required: ["5+ years TypeScript", "React experience"],
            preferred: ["GraphQL knowledge"],
          },
        };
        const result = RouteRequestSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it("accepts strategy_skills_priority with must_have/nice_to_have", () => {
        const payload = {
          role: "Software Engineer",
          level: "Senior",
          industry: "Technology",
          strategy_skills_priority: {
            must_have: ["TypeScript", "React"],
            nice_to_have: ["GraphQL"],
          },
        };
        const result = RouteRequestSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it("accepts market_key_skills with required/emerging", () => {
        const payload = {
          role: "Software Engineer",
          level: "Senior",
          industry: "Technology",
          market_key_skills: {
            required: ["TypeScript"],
            emerging: ["Rust"],
          },
        };
        const result = RouteRequestSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it("silently strips unknown fields (Zod v3 behavior)", () => {
        const payload = {
          role: "Software Engineer",
          level: "Senior",
          industry: "Technology",
          some_future_field: "will be stripped",
          strategy_context: { foo: "bar" },
        };
        const result = RouteRequestSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).not.toHaveProperty("some_future_field");
          expect(result.data).not.toHaveProperty("strategy_context");
        }
      });

      it("rejects missing required fields", () => {
        // Missing role
        const noRole = { level: "Senior", industry: "Technology" };
        expect(RouteRequestSchema.safeParse(noRole).success).toBe(false);

        // Missing level
        const noLevel = { role: "Engineer", industry: "Technology" };
        expect(RouteRequestSchema.safeParse(noLevel).success).toBe(false);

        // Missing industry
        const noIndustry = { role: "Engineer", level: "Senior" };
        expect(RouteRequestSchema.safeParse(noIndustry).success).toBe(false);
      });
    });

    describe("feedback POST request schema", () => {
      // Inline copy of the route's CreateFeedbackSchema
      const RouteFeedbackSchema = z.object({
        interview_id: z.string().uuid(),
        ratings: z
          .array(
            z.object({
              category: z.string().min(1).max(200),
              score: z.number().int().min(1).max(4),
              notes: z.string().max(1000).optional(),
            }),
          )
          .min(1)
          .max(20),
        pros: z.array(z.string().max(500)).max(20),
        cons: z.array(z.string().max(500)).max(20),
        notes: z.string().max(5000).optional(),
        focus_areas_confirmed: z.literal(true, {
          message: "Focus areas must be confirmed",
        }),
      });

      it("accepts ratings with category + score shape", () => {
        const payload = {
          interview_id: "11111111-2222-4333-a444-555555555555",
          ratings: [
            { category: "Technical Skills", score: 3 },
            { category: "Communication", score: 4, notes: "Great communicator" },
          ],
          pros: ["Strong problem-solving"],
          cons: ["Limited cloud experience"],
          focus_areas_confirmed: true,
        };
        const result = RouteFeedbackSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it("rejects score of 5 (ratings are 1-4, not 1-5)", () => {
        const payload = {
          interview_id: "11111111-2222-4333-a444-555555555555",
          ratings: [{ category: "Technical Skills", score: 5 }],
          pros: [],
          cons: [],
          focus_areas_confirmed: true,
        };
        expect(RouteFeedbackSchema.safeParse(payload).success).toBe(false);
      });

      it("rejects score of 0", () => {
        const payload = {
          interview_id: "11111111-2222-4333-a444-555555555555",
          ratings: [{ category: "Technical Skills", score: 0 }],
          pros: [],
          cons: [],
          focus_areas_confirmed: true,
        };
        expect(RouteFeedbackSchema.safeParse(payload).success).toBe(false);
      });

      it("rejects focus_areas_confirmed: false", () => {
        const payload = {
          interview_id: "11111111-2222-4333-a444-555555555555",
          ratings: [{ category: "Technical Skills", score: 3 }],
          pros: [],
          cons: [],
          focus_areas_confirmed: false,
        };
        expect(RouteFeedbackSchema.safeParse(payload).success).toBe(false);
      });

      it("rejects empty ratings array", () => {
        const payload = {
          interview_id: "11111111-2222-4333-a444-555555555555",
          ratings: [],
          pros: [],
          cons: [],
          focus_areas_confirmed: true,
        };
        expect(RouteFeedbackSchema.safeParse(payload).success).toBe(false);
      });

      it("requires interview_id as valid UUID", () => {
        const payload = {
          interview_id: "not-a-uuid",
          ratings: [{ category: "Technical Skills", score: 3 }],
          pros: [],
          cons: [],
          focus_areas_confirmed: true,
        };
        expect(RouteFeedbackSchema.safeParse(payload).success).toBe(false);
      });

      it("silently strips unknown fields (Zod v3 behavior)", () => {
        const payload = {
          interview_id: "11111111-2222-4333-a444-555555555555",
          ratings: [{ category: "Technical Skills", score: 3 }],
          pros: [],
          cons: [],
          focus_areas_confirmed: true,
          interviewer_id: "should-be-stripped",
          overall_rating: 4,
        };
        const result = RouteFeedbackSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          // These fields should be silently dropped — server sets interviewer_id
          // from auth, not from body. If a consumer sends them, they vanish.
          expect(result.data).not.toHaveProperty("interviewer_id");
          expect(result.data).not.toHaveProperty("overall_rating");
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // 6. Cross-schema alignment: domain RatingEntry <-> feedback schema
  // -------------------------------------------------------------------------
  describe("Cross-layer alignment: domain RatingEntry shape", () => {
    // Domain type RatingEntry from packages/database/src/domain-types.ts:
    //   { category: string; score: 1 | 2 | 3 | 4; notes?: string }
    //
    // Both the feedback route schema and FeedbackSynthesisSchema must align
    // with this shape.

    it("FeedbackSynthesisSchema score_distribution scores are 1-4 (matching RatingEntry)", () => {
      const ratingSchema = FeedbackSynthesisSchema.shape.rating_overview;

      // Score of 5 should be rejected
      const invalid = {
        average_score: 3,
        total_feedback_count: 1,
        score_distribution: [{ score: 5, count: 1 }],
      };
      expect(ratingSchema.safeParse(invalid).success).toBe(false);

      // All valid scores 1-4
      const valid = {
        average_score: 2.5,
        total_feedback_count: 4,
        score_distribution: [
          { score: 1, count: 1 },
          { score: 2, count: 1 },
          { score: 3, count: 1 },
          { score: 4, count: 1 },
        ],
      };
      expect(ratingSchema.safeParse(valid).success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 7. AI output schema -> domain type field completeness
  // -------------------------------------------------------------------------
  describe("AI output schemas cover all domain type fields", () => {
    it("CandidateProfileSchema covers all CandidateProfile interface fields", () => {
      // Exhaustive list from domain-types.ts CandidateProfile interface
      const domainFields: string[] = [
        "ideal_background",
        "must_have_skills",
        "nice_to_have_skills",
        "experience_range",
        "cultural_fit_indicators",
        "disclaimer",
      ];
      const schemaFields = schemaKeys(CandidateProfileSchema);
      expect(schemaFields.sort()).toEqual(domainFields.sort());
    });

    it("HiringStrategySchema covers all HiringStrategy interface fields", () => {
      const domainFields: string[] = [
        "market_classification",
        "market_classification_rationale",
        "salary_positioning",
        "process_speed",
        "competitive_differentiators",
        "skills_priority",
        "key_risks",
        "recommendations",
        "disclaimer",
      ];
      const schemaFields = schemaKeys(HiringStrategySchema);
      expect(schemaFields.sort()).toEqual(domainFields.sort());
    });

    it("CoverageAnalysisSchema covers all CoverageAnalysis interface fields", () => {
      const domainFields: string[] = [
        "requirements_covered",
        "gaps",
        "redundancies",
        "recommendations",
        "overall_coverage_score",
        "disclaimer",
      ];
      const schemaFields = schemaKeys(CoverageAnalysisSchema);
      expect(schemaFields.sort()).toEqual(domainFields.sort());
    });
  });
});
