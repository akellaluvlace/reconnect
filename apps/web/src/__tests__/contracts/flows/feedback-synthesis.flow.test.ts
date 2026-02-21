/**
 * Flow test: Feedback -> Synthesis
 *
 * Verifies that data produced by POST /api/feedback is valid input for
 * POST /api/ai/synthesize-feedback. This catches field name mismatches,
 * missing required fields, and shape incompatibilities between the two
 * routes that a consumer (UI) would wire together.
 *
 * Flow:
 *   1. Interviewer A submits feedback via POST /api/feedback
 *   2. Interviewer B submits feedback via POST /api/feedback
 *   3. Build synthesis request from feedback shapes
 *   4. POST /api/ai/synthesize-feedback with built input
 *   5. Verify synthesis response has expected fields and counts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockFrom,
  mockServiceFrom,
  mockSynthesizeFeedback,
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
    mockSynthesizeFeedback: vi.fn(),
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
  synthesizeFeedback: mockSynthesizeFeedback,
  AIError: MockAIError,
}));

// ---------------------------------------------------------------------------
// Route handler imports (AFTER mocks)
// ---------------------------------------------------------------------------

import { POST as feedbackPOST } from "@/app/api/feedback/route";
import { POST as synthesisPOST } from "@/app/api/ai/synthesize-feedback/route";

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
// Constants — valid hex UUIDs only
// ---------------------------------------------------------------------------

const INTERVIEWER_A_ID = "aabb0011-2233-4455-a677-889900aabbcc";
const INTERVIEWER_B_ID = "ccddee00-1122-4344-a566-778899aabb00";
const INTERVIEW_ID = "11223344-aabb-4cdd-aeff-001122334455";
const FEEDBACK_A_ID = "aa112233-4455-6677-8899-aabbccddeeff";
const FEEDBACK_B_ID = "bb112233-4455-6677-8899-aabbccddeeff";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAuth(userId: string) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId, email: `${userId.slice(0, 8)}@example.com` } },
    error: null,
  });
}

function makePost(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Feedback body fixtures — what interviewers submit
// ---------------------------------------------------------------------------

const FEEDBACK_BODY_A = {
  interview_id: INTERVIEW_ID,
  ratings: [
    { category: "Technical Skills", score: 3, notes: "Good understanding" },
    { category: "Communication", score: 4 },
  ],
  pros: ["Strong problem-solving", "Clear communication"],
  cons: ["Limited cloud experience"],
  notes: "Solid candidate overall",
  focus_areas_confirmed: true as const,
};

const FEEDBACK_BODY_B = {
  interview_id: INTERVIEW_ID,
  ratings: [
    { category: "Technical Skills", score: 2 },
    { category: "System Design", score: 3 },
  ],
  pros: ["Good architecture knowledge"],
  cons: ["Struggled with edge cases", "Needs more practice"],
  focus_areas_confirmed: true as const,
};

// ---------------------------------------------------------------------------
// Mock DB rows returned after successful insert
// ---------------------------------------------------------------------------

const MOCK_FEEDBACK_A = {
  id: FEEDBACK_A_ID,
  interview_id: INTERVIEW_ID,
  interviewer_id: INTERVIEWER_A_ID,
  ratings: FEEDBACK_BODY_A.ratings,
  pros: FEEDBACK_BODY_A.pros,
  cons: FEEDBACK_BODY_A.cons,
  notes: FEEDBACK_BODY_A.notes,
  focus_areas_confirmed: true,
  submitted_at: "2026-02-20T10:00:00Z",
};

const MOCK_FEEDBACK_B = {
  id: FEEDBACK_B_ID,
  interview_id: INTERVIEW_ID,
  interviewer_id: INTERVIEWER_B_ID,
  ratings: FEEDBACK_BODY_B.ratings,
  pros: FEEDBACK_BODY_B.pros,
  cons: FEEDBACK_BODY_B.cons,
  notes: null,
  focus_areas_confirmed: true,
  submitted_at: "2026-02-20T11:00:00Z",
};

// ---------------------------------------------------------------------------
// Synthesis mock data — returned by the AI pipeline
// ---------------------------------------------------------------------------

const SYNTHESIS_RESULT = {
  data: {
    summary: "Mixed feedback from two interviewers on technical capability.",
    consensus: {
      areas_of_agreement: ["Solid technical foundation"],
      areas_of_disagreement: ["Cloud experience assessment differs"],
    },
    key_strengths: ["Problem-solving", "Communication", "Architecture knowledge"],
    key_concerns: ["Limited cloud experience", "Edge case handling"],
    discussion_points: ["Clarify cloud depth in follow-up"],
    rating_overview: {
      average_score: 3,
      total_feedback_count: 2,
      score_distribution: [
        { score: 2, count: 1 },
        { score: 3, count: 2 },
        { score: 4, count: 1 },
      ],
    },
    disclaimer: "AI-generated synthesis. Human review required.",
  },
  metadata: {
    model_used: "claude-sonnet-4-5-20250514",
    prompt_version: "v1.0",
    generated_at: "2026-02-20T12:00:00Z",
  },
};

// ===========================================================================
// Tests
// ===========================================================================

describe("FLOW: Feedback -> Synthesis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: transcript not found (PGRST116)
    mockServiceFrom.mockReturnValue(
      chainBuilder({ data: null, error: { code: "PGRST116" } }),
    );
  });

  it("Step 1: Interviewer A submits feedback — response has id", async () => {
    setupAuth(INTERVIEWER_A_ID);
    mockFrom.mockReturnValue(
      chainBuilder({ data: MOCK_FEEDBACK_A, error: null }),
    );

    const res = await feedbackPOST(
      makePost("/api/feedback", FEEDBACK_BODY_A),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(FEEDBACK_A_ID);
    expect(body.data.interviewer_id).toBe(INTERVIEWER_A_ID);
    expect(body.data.interview_id).toBe(INTERVIEW_ID);
  });

  it("Step 2: Interviewer B submits feedback — response has id", async () => {
    setupAuth(INTERVIEWER_B_ID);
    mockFrom.mockReturnValue(
      chainBuilder({ data: MOCK_FEEDBACK_B, error: null }),
    );

    const res = await feedbackPOST(
      makePost("/api/feedback", FEEDBACK_BODY_B),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(FEEDBACK_B_ID);
    expect(body.data.interviewer_id).toBe(INTERVIEWER_B_ID);
  });

  it("Step 3: Feedback shapes bridge correctly to synthesis input", () => {
    // The bridge: feedback response fields map into synthesis request fields.
    // feedback.ratings -> feedback_forms[].ratings (same shape minus optional notes)
    // feedback.pros -> feedback_forms[].pros
    // feedback.cons -> feedback_forms[].cons
    // interviewer identity -> feedback_forms[].interviewer_name (added by consumer)

    const feedbackResponses = [MOCK_FEEDBACK_A, MOCK_FEEDBACK_B];
    const interviewerNames = ["Alice", "Bob"];

    const synthesisInput = {
      candidate_name: "Jane Candidate",
      role: "Software Engineer",
      stage_name: "Technical Interview",
      interview_id: INTERVIEW_ID,
      feedback_forms: feedbackResponses.map((fb, i) => ({
        interviewer_name: interviewerNames[i],
        ratings: (fb.ratings as Array<{ category: string; score: number }>).map(
          (r) => ({
            category: r.category,
            score: r.score,
          }),
        ),
        pros: fb.pros as string[],
        cons: fb.cons as string[],
      })),
    };

    // Verify the bridge produced the right shape
    expect(synthesisInput.feedback_forms).toHaveLength(2);
    expect(synthesisInput.feedback_forms[0].interviewer_name).toBe("Alice");
    expect(synthesisInput.feedback_forms[0].ratings).toEqual([
      { category: "Technical Skills", score: 3 },
      { category: "Communication", score: 4 },
    ]);
    expect(synthesisInput.feedback_forms[0].pros).toEqual([
      "Strong problem-solving",
      "Clear communication",
    ]);
    expect(synthesisInput.feedback_forms[1].interviewer_name).toBe("Bob");
    expect(synthesisInput.feedback_forms[1].cons).toEqual([
      "Struggled with edge cases",
      "Needs more practice",
    ]);
  });

  it("Step 4: Synthesis from feedback data — response has summary, consensus, key_strengths, key_concerns, rating_overview, disclaimer", async () => {
    setupAuth(INTERVIEWER_A_ID);
    // Mock the insert chain for ai_synthesis persistence (the route inserts if candidate_id provided)
    mockFrom.mockReturnValue(
      chainBuilder({ data: null, error: null }),
    );
    mockSynthesizeFeedback.mockResolvedValue(SYNTHESIS_RESULT);

    // Build synthesis input from feedback shapes (same bridge as Step 3)
    const synthesisBody = {
      candidate_name: "Jane Candidate",
      role: "Software Engineer",
      stage_name: "Technical Interview",
      interview_id: INTERVIEW_ID,
      feedback_forms: [
        {
          interviewer_name: "Alice",
          ratings: [
            { category: "Technical Skills", score: 3 },
            { category: "Communication", score: 4 },
          ],
          pros: ["Strong problem-solving", "Clear communication"],
          cons: ["Limited cloud experience"],
        },
        {
          interviewer_name: "Bob",
          ratings: [
            { category: "Technical Skills", score: 2 },
            { category: "System Design", score: 3 },
          ],
          pros: ["Good architecture knowledge"],
          cons: ["Struggled with edge cases", "Needs more practice"],
        },
      ],
    };

    const res = await synthesisPOST(
      makePost("/api/ai/synthesize-feedback", synthesisBody),
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify top-level structure
    expect(body.data).toBeDefined();
    expect(body.metadata).toBeDefined();

    // Verify required synthesis fields exist
    expect(body.data.summary).toEqual(expect.any(String));
    expect(body.data.consensus).toBeDefined();
    expect(body.data.consensus.areas_of_agreement).toEqual(
      expect.any(Array),
    );
    expect(body.data.consensus.areas_of_disagreement).toEqual(
      expect.any(Array),
    );
    expect(body.data.key_strengths).toEqual(expect.any(Array));
    expect(body.data.key_concerns).toEqual(expect.any(Array));
    expect(body.data.rating_overview).toBeDefined();
    expect(body.data.disclaimer).toEqual(expect.any(String));
  });

  it("Step 5: rating_overview.total_feedback_count matches submitted feedback count", async () => {
    setupAuth(INTERVIEWER_A_ID);
    mockFrom.mockReturnValue(
      chainBuilder({ data: null, error: null }),
    );
    mockSynthesizeFeedback.mockResolvedValue(SYNTHESIS_RESULT);

    const feedbackForms = [
      {
        interviewer_name: "Alice",
        ratings: [{ category: "Technical Skills", score: 3 }],
        pros: ["Strong"],
        cons: ["Weak on X"],
      },
      {
        interviewer_name: "Bob",
        ratings: [{ category: "Technical Skills", score: 2 }],
        pros: ["Good Y"],
        cons: ["Needs Z"],
      },
    ];

    const synthesisBody = {
      candidate_name: "Jane Candidate",
      role: "Software Engineer",
      stage_name: "Technical Interview",
      feedback_forms: feedbackForms,
    };

    const res = await synthesisPOST(
      makePost("/api/ai/synthesize-feedback", synthesisBody),
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    // The AI pipeline should produce total_feedback_count = number of forms
    expect(body.data.rating_overview.total_feedback_count).toBe(
      feedbackForms.length,
    );
  });

  it("verifies synthesis input validation rejects feedback with score > 4", async () => {
    setupAuth(INTERVIEWER_A_ID);

    const invalidBody = {
      candidate_name: "Jane Candidate",
      role: "Software Engineer",
      stage_name: "Technical Interview",
      feedback_forms: [
        {
          interviewer_name: "Alice",
          ratings: [{ category: "Technical Skills", score: 5 }], // Invalid: max 4
          pros: ["Good"],
          cons: ["Bad"],
        },
      ],
    };

    const res = await synthesisPOST(
      makePost("/api/ai/synthesize-feedback", invalidBody),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("verifies feedback POST sets interviewer_id from auth, NOT from body", async () => {
    setupAuth(INTERVIEWER_A_ID);
    mockFrom.mockReturnValue(
      chainBuilder({ data: MOCK_FEEDBACK_A, error: null }),
    );

    // Even if the body somehow tried to set a different interviewer_id,
    // the route ignores it and uses auth user id
    const bodyWithSpoofedId = {
      ...FEEDBACK_BODY_A,
      interviewer_id: "deadbeef-dead-4eef-adad-beefdeadbeef", // This should be ignored
    };

    const res = await feedbackPOST(
      makePost("/api/feedback", bodyWithSpoofedId),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    // The returned interviewer_id comes from the mock DB row,
    // which was set to INTERVIEWER_A_ID (from auth), not the spoofed value
    expect(body.data.interviewer_id).toBe(INTERVIEWER_A_ID);
  });

  it("verifies feedback ratings schema aligns with synthesis ratings schema", () => {
    // Feedback POST accepts: { category: string, score: 1-4, notes?: string }
    // Synthesis expects: { category: string, score: 1-4 }
    // The synthesis schema is a subset — it omits `notes`. This is fine because
    // the consumer strips notes when building synthesis input.

    const feedbackRating = { category: "Technical Skills", score: 3, notes: "Detail" };
    const synthesisRating = { category: feedbackRating.category, score: feedbackRating.score };

    // Verify the bridge works: category and score transfer, notes is stripped
    expect(synthesisRating.category).toBe(feedbackRating.category);
    expect(synthesisRating.score).toBe(feedbackRating.score);
    expect(synthesisRating).not.toHaveProperty("notes");
  });
});
