/**
 * Contract tests for all 7 AI API routes.
 *
 * Each test calls the real route handler with mocked Supabase + mocked AI
 * pipeline, then validates the response JSON against consumer-expected Zod
 * schemas from `./schemas.ts`.
 *
 * Two tests per route:
 *   1. Happy path — pipeline returns realistic data, response matches schema
 *   2. 401 unauthorized — user is null, response matches ErrorResponseSchema
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be available before vi.mock factories execute
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockFrom,
  mockServiceFrom,
  mockGenerateHiringStrategy,
  mockGenerateJobDescription,
  mockGenerateStages,
  mockGenerateQuestions,
  mockGenerateCandidateProfile,
  mockSynthesizeFeedback,
  mockAnalyzeCoverage,
  MockAIError,
} = vi.hoisted(() => {
  class MockAIError extends Error {
    name = "AIError";
    constructor(m: string) {
      super(m);
      this.name = "AIError";
    }
  }
  return {
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
    mockServiceFrom: vi.fn(),
    mockGenerateHiringStrategy: vi.fn(),
    mockGenerateJobDescription: vi.fn(),
    mockGenerateStages: vi.fn(),
    mockGenerateQuestions: vi.fn(),
    mockGenerateCandidateProfile: vi.fn(),
    mockSynthesizeFeedback: vi.fn(),
    mockAnalyzeCoverage: vi.fn(),
    MockAIError,
  };
});

// ---------------------------------------------------------------------------
// vi.mock registrations
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: mockServiceFrom,
  }),
}));

vi.mock("@reconnect/ai", () => ({
  generateHiringStrategy: mockGenerateHiringStrategy,
  generateJobDescription: mockGenerateJobDescription,
  generateStages: mockGenerateStages,
  generateQuestions: mockGenerateQuestions,
  generateCandidateProfile: mockGenerateCandidateProfile,
  synthesizeFeedback: mockSynthesizeFeedback,
  analyzeCoverage: mockAnalyzeCoverage,
  AIError: MockAIError,
}));

// ---------------------------------------------------------------------------
// Route handler imports (AFTER mocks)
// ---------------------------------------------------------------------------

import { POST as strategyPOST } from "@/app/api/ai/generate-strategy/route";
import { POST as jdPOST } from "@/app/api/ai/generate-jd/route";
import { POST as stagesPOST } from "@/app/api/ai/generate-stages/route";
import { POST as questionsPOST } from "@/app/api/ai/generate-questions/route";
import { POST as candidateProfilePOST } from "@/app/api/ai/generate-candidate-profile/route";
import { POST as synthesisPOST } from "@/app/api/ai/synthesize-feedback/route";
import { POST as coveragePOST } from "@/app/api/ai/analyze-coverage/route";

// ---------------------------------------------------------------------------
// Contract schemas
// ---------------------------------------------------------------------------

import {
  ErrorResponseSchema,
  HiringStrategyResponseSchema,
  JobDescriptionResponseSchema,
  InterviewStagesResponseSchema,
  CandidateProfileResponseSchema,
  SynthesisResponseSchema,
  CoverageAnalysisResponseSchema,
  aiResponseSchema,
} from "./schemas";

/** Questions response — not in schemas.ts, so define inline for contract. */
const QuestionsDataSchema = z
  .object({
    focus_area: z.string(),
    questions: z.array(
      z
        .object({
          question: z.string(),
          purpose: z.string(),
          look_for: z.array(z.string()),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const QuestionsResponseSchema = aiResponseSchema(QuestionsDataSchema);

// ---------------------------------------------------------------------------
// Chainable Supabase query builder mock
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "order",
    "limit",
    "is",
    "in",
    "match",
    "filter",
    "gt",
    "lt",
    "gte",
    "lte",
    "ilike",
  ];
  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

// ---------------------------------------------------------------------------
// Shared fixtures and helpers
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "aabbccdd-1122-4344-a566-778899aabb00", email: "test@example.com" };

const METADATA = {
  model_used: "claude-sonnet-4-5-20250514",
  prompt_version: "v1.0",
  generated_at: "2026-01-01T00:00:00.000Z",
};

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupDefaultDB() {
  mockFrom.mockReturnValue(chainBuilder({ data: null, error: null }));
  mockServiceFrom.mockReturnValue(
    chainBuilder({ data: null, error: { code: "PGRST116" } }),
  );
}

function makePost(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Validate a response body against a Zod schema, logging detailed issues
 * on failure for easy debugging.
 */
function expectSchemaMatch<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
  label: string,
) {
  const result = schema.safeParse(body);
  if (!result.success) {
    console.error(
      `[${label}] Schema validation failed:`,
      JSON.stringify(result.error.issues, null, 2),
    );
    console.error(`[${label}] Body was:`, JSON.stringify(body, null, 2));
  }
  expect(result.success, `${label} should match schema`).toBe(true);
}

// ---------------------------------------------------------------------------
// Request body fixtures for each route
// ---------------------------------------------------------------------------

const STRATEGY_BODY = {
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
  market_insights: {
    salary: { min: 70000, max: 120000, median: 95000, currency: "EUR", confidence: 0.85 },
    competition: { companies_hiring: ["Acme Corp"], job_postings_count: 42, market_saturation: "medium" },
    time_to_hire: { average_days: 30, range: { min: 14, max: 60 } },
    candidate_availability: { level: "moderate", description: "Moderate pool" },
    key_skills: { required: ["TypeScript"], emerging: ["Rust"], declining: ["jQuery"] },
    trends: ["Remote work increasing"],
  },
};

const JD_BODY = {
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
  style: "formal" as const,
};

const STAGES_BODY = {
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
};

const QUESTIONS_BODY = {
  role: "Software Engineer",
  level: "Senior",
  focus_area: "System Design",
  focus_area_description: "Ability to design scalable distributed systems",
  stage_type: "technical",
};

const CANDIDATE_PROFILE_BODY = {
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
};

const SYNTHESIS_BODY = {
  candidate_name: "John Doe",
  role: "Software Engineer",
  stage_name: "Technical",
  feedback_forms: [
    {
      interviewer_name: "Alice",
      ratings: [{ category: "Technical Skills", score: 3 }],
      pros: ["Strong problem-solving"],
      cons: ["Limited cloud experience"],
    },
  ],
  interview_id: "11111111-2222-4333-a444-555555555555",
};

const COVERAGE_BODY = {
  role: "Software Engineer",
  level: "Senior",
  jd_requirements: {
    required: ["5+ years experience", "TypeScript proficiency"],
    preferred: ["Cloud experience"],
    responsibilities: ["Design scalable systems"],
  },
  stages: [
    {
      name: "Technical Interview",
      type: "technical",
      focus_areas: [
        { name: "System Design", description: "Distributed system design" },
        { name: "Coding", description: "Live coding problem" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Pipeline mock return data (realistic shapes that match AI output schemas)
// ---------------------------------------------------------------------------

const STRATEGY_DATA = {
  market_classification: "balanced" as const,
  skills_priority: {
    must_have: ["TypeScript", "React"],
    nice_to_have: ["GraphQL"],
    emerging_premium: ["Rust"],
  },
  salary_positioning: { strategy: "competitive", recommended_range: { min: 75000, max: 110000, currency: "EUR" } },
  process_speed: { recommendation: "standard", max_stages: 4, target_days: 30 },
  competitive_differentiators: ["Remote-first culture"],
  disclaimer: "AI-generated analysis. Human review required.",
};

const JD_DATA = {
  title: "Senior Software Engineer",
  summary: "Join our engineering team to build scalable solutions.",
  responsibilities: ["Design and implement features", "Code review"],
  requirements: {
    required: ["5+ years TypeScript", "React experience"],
    preferred: ["GraphQL knowledge"],
  },
  benefits: ["Remote work", "Health insurance"],
  confidence: 0.92,
};

const STAGES_DATA = {
  stages: [
    {
      name: "Phone Screen",
      type: "screening" as const,
      duration_minutes: 30,
      description: "Initial screening call",
      focus_areas: [
        { name: "Culture Fit", description: "Values alignment", weight: 2 },
      ],
      suggested_questions: [
        {
          question: "Tell me about yourself",
          purpose: "Assess communication",
          look_for: ["Clarity", "Relevance"],
          focus_area: "Culture Fit",
        },
      ],
    },
    {
      name: "Technical Interview",
      type: "technical" as const,
      duration_minutes: 60,
      description: "Technical deep dive",
      focus_areas: [
        { name: "System Design", description: "Distributed systems", weight: 3 },
      ],
      suggested_questions: [
        {
          question: "Design a URL shortener",
          purpose: "Assess system design skills",
          look_for: ["Scalability", "Trade-offs"],
          focus_area: "System Design",
        },
      ],
    },
  ],
};

const QUESTIONS_DATA = {
  focus_area: "System Design",
  questions: [
    {
      question: "How would you design a real-time chat system?",
      purpose: "Assess distributed system design capability",
      look_for: ["WebSocket usage", "Message ordering", "Scalability"],
    },
    {
      question: "Walk me through designing a rate limiter",
      purpose: "Evaluate algorithm and systems thinking",
      look_for: ["Token bucket", "Sliding window", "Distributed considerations"],
    },
    {
      question: "How would you handle database sharding for a social media app?",
      purpose: "Test data partitioning knowledge",
      look_for: ["Shard key selection", "Consistency trade-offs", "Migration strategy"],
    },
  ],
};

const CANDIDATE_PROFILE_DATA = {
  ideal_background: "Strong CS fundamentals with 5+ years in backend engineering",
  must_have_skills: ["TypeScript", "Node.js", "SQL"],
  nice_to_have_skills: ["GraphQL", "Kubernetes"],
  experience_range: "5-8 years",
  cultural_fit_indicators: ["Self-directed learner", "Collaborative"],
  disclaimer: "AI-generated profile. Use as a guideline only.",
};

const SYNTHESIS_DATA = {
  summary: "Overall positive candidate showing strong technical skills.",
  consensus: {
    areas_of_agreement: ["Strong problem-solving ability"],
    areas_of_disagreement: ["Cloud experience assessment varies"],
  },
  key_strengths: ["Problem-solving", "Communication"],
  key_concerns: ["Limited cloud experience"],
  discussion_points: ["Explore cloud experience depth in next round"],
  rating_overview: {
    average_score: 3,
    total_feedback_count: 1,
    score_distribution: [{ score: 3, count: 1 }],
  },
  disclaimer: "AI-generated synthesis. Human review required.",
};

const COVERAGE_DATA = {
  requirements_covered: [
    {
      requirement: "TypeScript proficiency",
      covered_by_stage: "Technical Interview",
      covered_by_focus_area: "Coding",
      coverage_strength: "strong" as const,
    },
  ],
  gaps: [
    {
      requirement: "Cloud experience",
      severity: "important" as const,
      suggestion: "Add a system design question about cloud architecture",
    },
  ],
  redundancies: [
    {
      focus_area: "Communication",
      appears_in_stages: ["Phone Screen", "Technical Interview"],
      recommendation: "Consider consolidating communication assessment",
    },
  ],
  recommendations: ["Add a cloud-focused stage or question"],
  overall_coverage_score: 72,
  disclaimer: "AI-generated coverage analysis. Review with hiring team.",
};

// ===========================================================================
// Tests
// ===========================================================================

describe("AI Route Contract Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultDB();
  });

  // -------------------------------------------------------------------------
  // 1. POST /api/ai/generate-strategy
  // -------------------------------------------------------------------------
  describe("POST /api/ai/generate-strategy", () => {
    it("happy path — response matches HiringStrategyResponseSchema", async () => {
      setupAuth();
      mockGenerateHiringStrategy.mockResolvedValue({
        data: STRATEGY_DATA,
        metadata: METADATA,
      });

      const res = await strategyPOST(
        makePost("/api/ai/generate-strategy", STRATEGY_BODY),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expectSchemaMatch(HiringStrategyResponseSchema, body, "generate-strategy");
    });

    it("401 — response matches ErrorResponseSchema", async () => {
      setupAuth(null);

      const res = await strategyPOST(
        makePost("/api/ai/generate-strategy", STRATEGY_BODY),
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expectSchemaMatch(ErrorResponseSchema, body, "generate-strategy 401");
    });
  });

  // -------------------------------------------------------------------------
  // 2. POST /api/ai/generate-jd
  // -------------------------------------------------------------------------
  describe("POST /api/ai/generate-jd", () => {
    it("happy path — response matches JobDescriptionResponseSchema", async () => {
      setupAuth();
      mockGenerateJobDescription.mockResolvedValue({
        data: JD_DATA,
        metadata: METADATA,
      });

      const res = await jdPOST(
        makePost("/api/ai/generate-jd", JD_BODY),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expectSchemaMatch(JobDescriptionResponseSchema, body, "generate-jd");
    });

    it("401 — response matches ErrorResponseSchema", async () => {
      setupAuth(null);

      const res = await jdPOST(
        makePost("/api/ai/generate-jd", JD_BODY),
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expectSchemaMatch(ErrorResponseSchema, body, "generate-jd 401");
    });
  });

  // -------------------------------------------------------------------------
  // 3. POST /api/ai/generate-stages
  // -------------------------------------------------------------------------
  describe("POST /api/ai/generate-stages", () => {
    it("happy path — response matches InterviewStagesResponseSchema", async () => {
      setupAuth();
      mockGenerateStages.mockResolvedValue({
        data: STAGES_DATA,
        metadata: METADATA,
      });

      const res = await stagesPOST(
        makePost("/api/ai/generate-stages", STAGES_BODY),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expectSchemaMatch(InterviewStagesResponseSchema, body, "generate-stages");
    });

    it("401 — response matches ErrorResponseSchema", async () => {
      setupAuth(null);

      const res = await stagesPOST(
        makePost("/api/ai/generate-stages", STAGES_BODY),
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expectSchemaMatch(ErrorResponseSchema, body, "generate-stages 401");
    });
  });

  // -------------------------------------------------------------------------
  // 4. POST /api/ai/generate-questions
  // -------------------------------------------------------------------------
  describe("POST /api/ai/generate-questions", () => {
    it("happy path — response matches QuestionsResponseSchema", async () => {
      setupAuth();
      mockGenerateQuestions.mockResolvedValue({
        data: QUESTIONS_DATA,
        metadata: METADATA,
      });

      const res = await questionsPOST(
        makePost("/api/ai/generate-questions", QUESTIONS_BODY),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expectSchemaMatch(QuestionsResponseSchema, body, "generate-questions");
    });

    it("401 — response matches ErrorResponseSchema", async () => {
      setupAuth(null);

      const res = await questionsPOST(
        makePost("/api/ai/generate-questions", QUESTIONS_BODY),
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expectSchemaMatch(ErrorResponseSchema, body, "generate-questions 401");
    });
  });

  // -------------------------------------------------------------------------
  // 5. POST /api/ai/generate-candidate-profile
  // -------------------------------------------------------------------------
  describe("POST /api/ai/generate-candidate-profile", () => {
    it("happy path — response matches CandidateProfileResponseSchema", async () => {
      setupAuth();
      mockGenerateCandidateProfile.mockResolvedValue({
        data: CANDIDATE_PROFILE_DATA,
        metadata: METADATA,
      });

      const res = await candidateProfilePOST(
        makePost("/api/ai/generate-candidate-profile", CANDIDATE_PROFILE_BODY),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expectSchemaMatch(
        CandidateProfileResponseSchema,
        body,
        "generate-candidate-profile",
      );
    });

    it("401 — response matches ErrorResponseSchema", async () => {
      setupAuth(null);

      const res = await candidateProfilePOST(
        makePost("/api/ai/generate-candidate-profile", CANDIDATE_PROFILE_BODY),
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expectSchemaMatch(ErrorResponseSchema, body, "generate-candidate-profile 401");
    });
  });

  // -------------------------------------------------------------------------
  // 6. POST /api/ai/synthesize-feedback
  // -------------------------------------------------------------------------
  describe("POST /api/ai/synthesize-feedback", () => {
    it("happy path — response matches SynthesisResponseSchema", async () => {
      setupAuth();
      mockSynthesizeFeedback.mockResolvedValue({
        data: SYNTHESIS_DATA,
        metadata: METADATA,
      });

      const res = await synthesisPOST(
        makePost("/api/ai/synthesize-feedback", SYNTHESIS_BODY),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expectSchemaMatch(SynthesisResponseSchema, body, "synthesize-feedback");
    });

    it("401 — response matches ErrorResponseSchema", async () => {
      setupAuth(null);

      const res = await synthesisPOST(
        makePost("/api/ai/synthesize-feedback", SYNTHESIS_BODY),
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expectSchemaMatch(ErrorResponseSchema, body, "synthesize-feedback 401");
    });
  });

  // -------------------------------------------------------------------------
  // 7. POST /api/ai/analyze-coverage
  // -------------------------------------------------------------------------
  describe("POST /api/ai/analyze-coverage", () => {
    it("happy path — response matches CoverageAnalysisResponseSchema", async () => {
      setupAuth();
      mockAnalyzeCoverage.mockResolvedValue({
        data: COVERAGE_DATA,
        metadata: METADATA,
      });

      const res = await coveragePOST(
        makePost("/api/ai/analyze-coverage", COVERAGE_BODY),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expectSchemaMatch(
        CoverageAnalysisResponseSchema,
        body,
        "analyze-coverage",
      );
    });

    it("401 — response matches ErrorResponseSchema", async () => {
      setupAuth(null);

      const res = await coveragePOST(
        makePost("/api/ai/analyze-coverage", COVERAGE_BODY),
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expectSchemaMatch(ErrorResponseSchema, body, "analyze-coverage 401");
    });
  });
});
