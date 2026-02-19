import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted ensures these are available when vi.mock factory runs (mock is
// hoisted to the top of the file before const declarations are initialised).
const { mockGetUser, mockAnalyzeCoverage, MockAIError } = vi.hoisted(() => {
  class MockAIError extends Error {
    name = "AIError";
    constructor(m: string) {
      super(m);
      this.name = "AIError";
    }
  }
  return {
    mockGetUser: vi.fn(),
    mockAnalyzeCoverage: vi.fn(),
    MockAIError,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("@reconnect/ai", () => ({
  analyzeCoverage: mockAnalyzeCoverage,
  AIError: MockAIError,
}));

// Import route handler AFTER mocks are set up
import { POST } from "@/app/api/ai/analyze-coverage/route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const VALID_BODY = {
  role: "Software Engineer",
  level: "Senior",
  jd_requirements: {
    required: ["TypeScript", "React"],
    preferred: ["GraphQL"],
    responsibilities: ["Build features"],
  },
  stages: [
    {
      name: "Technical Screen",
      type: "technical",
      focus_areas: [{ name: "Coding", description: "Coding skills" }],
    },
  ],
};

const MOCK_PIPELINE_RESULT = {
  data: {
    coverage_score: 0.85,
    covered_requirements: ["TypeScript", "React"],
    gaps: [],
    recommendations: ["Add a system design stage"],
    disclaimer: "AI-generated analysis",
  },
  metadata: { model: "claude", prompt_version: "1.0" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/analyze-coverage", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// Pattern A: route checks authError || !user
function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupAuthError() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "JWT expired" },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/ai/analyze-coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated (user is null)", async () => {
    setupAuth(null);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockAnalyzeCoverage).not.toHaveBeenCalled();
  });

  it("returns 401 when auth returns an error", async () => {
    setupAuthError();

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockAnalyzeCoverage).not.toHaveBeenCalled();
  });

  it("returns 400 when body is invalid (missing jd_requirements)", async () => {
    setupAuth();

    // jd_requirements is required; omitting it triggers Zod validation failure
    const res = await POST(
      makePost({
        role: "Software Engineer",
        level: "Senior",
        stages: VALID_BODY.stages,
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(mockAnalyzeCoverage).not.toHaveBeenCalled();
  });

  it("returns 200 with { data, metadata } on success", async () => {
    setupAuth();
    mockAnalyzeCoverage.mockResolvedValue(MOCK_PIPELINE_RESULT);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("metadata");
    expect(body.data.coverage_score).toBe(0.85);
    expect(Array.isArray(body.data.covered_requirements)).toBe(true);
    expect(body.data.covered_requirements).toContain("TypeScript");
    expect(body.metadata.model).toBe("claude");
    expect(mockAnalyzeCoverage).toHaveBeenCalledOnce();
  });

  it("returns 500 with AIError message when pipeline throws AIError", async () => {
    setupAuth();
    const aiErr = new MockAIError("Token limit reached");
    mockAnalyzeCoverage.mockRejectedValue(aiErr);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Token limit reached");
  });

  it("returns 500 with generic message when pipeline throws an unexpected error", async () => {
    setupAuth();
    mockAnalyzeCoverage.mockRejectedValue(new Error("internal crash"));

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to analyze coverage");
  });
});
