import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockApplyRefinementsDiff, MockAIError } = vi.hoisted(
  () => {
    class MockAIError extends Error {
      name = "AIError";
      constructor(m: string) {
        super(m);
        this.name = "AIError";
      }
    }
    return {
      mockGetUser: vi.fn(),
      mockApplyRefinementsDiff: vi.fn(),
      MockAIError,
    };
  },
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("@reconnect/ai", () => ({
  generateRefinements: vi.fn(),
  applyRefinements: vi.fn(),
  applyRefinementsDiff: mockApplyRefinementsDiff,
  safeErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import { POST } from "@/app/api/ai/generate-refinements/route";

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const VALID_APPLY_DIFF_BODY = {
  mode: "apply_diff",
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
  selected_items: [
    {
      title: "Add Testing Focus Area",
      type: "gap_fix",
      change_summary: "Add testing FA to Technical Round",
    },
  ],
  current_stages: [
    {
      name: "Technical Round",
      type: "technical",
      duration_minutes: 45,
      description: "Technical interview",
      focus_areas: [
        { name: "Algorithms", description: "Problem solving", weight: 3 },
        { name: "System Design", description: "Architecture", weight: 3 },
      ],
      suggested_questions: [
        { question: "Design a cache", purpose: "Architecture", look_for: ["LRU"], focus_area: "System Design" },
        { question: "Reverse linked list", purpose: "DS/Algo", look_for: ["Pointer"], focus_area: "Algorithms" },
        { question: "Big-O analysis", purpose: "Complexity", look_for: ["Optimal"], focus_area: "Algorithms" },
      ],
    },
  ],
};

const MOCK_DIFF_RESULT = {
  data: {
    patches: [
      {
        stage_index: 0,
        stage_name: "Technical Round",
        add_focus_areas: [{
          focus_area: { name: "Testing", description: "Testing skills", weight: 2 },
          questions: [
            { question: "Unit testing approach", purpose: "Test methodology", look_for: ["TDD"], focus_area: "Testing" },
            { question: "Integration testing", purpose: "E2E coverage", look_for: ["Mocks"], focus_area: "Testing" },
            { question: "Test coverage goals", purpose: "Quality bar", look_for: ["80%+"], focus_area: "Testing" },
          ],
        }],
      },
    ],
    summary: "Added Testing focus area to Technical Round",
    disclaimer: "AI-generated. Human review required.",
  },
  metadata: {
    model_used: "claude-sonnet-4-5-20250929",
    prompt_version: "2.0.0",
    generated_at: "2026-03-01T00:00:00.000Z",
  },
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/ai/generate-refinements", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
});

describe("POST /api/ai/generate-refinements (apply_diff mode)", () => {
  it("returns diff response with patches for valid apply_diff request", async () => {
    mockApplyRefinementsDiff.mockResolvedValue(MOCK_DIFF_RESULT);

    const res = await POST(makeReq(VALID_APPLY_DIFF_BODY));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.patches).toHaveLength(1);
    expect(json.data.patches[0].stage_name).toBe("Technical Round");
    expect(json.data.summary).toBe("Added Testing focus area to Technical Round");
    expect(json.metadata.prompt_version).toBe("2.0.0");
  });

  it("returns 401 for unauthenticated request", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Not authenticated" } });

    const res = await POST(makeReq(VALID_APPLY_DIFF_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    const body = { mode: "apply_diff", role: "Engineer" };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("Invalid input");
  });

  it("returns 400 for empty selected_items", async () => {
    const body = { ...VALID_APPLY_DIFF_BODY, selected_items: [] };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);
  });

  it("passes jd_context and strategy_context to pipeline", async () => {
    mockApplyRefinementsDiff.mockResolvedValue(MOCK_DIFF_RESULT);

    const body = {
      ...VALID_APPLY_DIFF_BODY,
      jd_context: { requirements: ["React", "TypeScript"], responsibilities: ["Build UI"] },
      strategy_context: {
        market_classification: "balanced",
        process_speed: { recommendation: "standard", max_stages: 4 },
        skills_priority: { must_have: ["React"], nice_to_have: ["GraphQL"] },
      },
    };

    await POST(makeReq(body));

    expect(mockApplyRefinementsDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        jd_context: body.jd_context,
        strategy_context: body.strategy_context,
      }),
    );
  });

  it("returns 500 with safe fallback on pipeline error", async () => {
    mockApplyRefinementsDiff.mockRejectedValue(new MockAIError("Model rate limited"));

    const res = await POST(makeReq(VALID_APPLY_DIFF_BODY));
    expect(res.status).toBe(500);

    const json = await res.json();
    // safeErrorMessage returns generic fallback — never leaks internal error details
    expect(json.error).toBe("Failed to generate refinements");
  });
});
