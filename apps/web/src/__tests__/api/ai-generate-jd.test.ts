import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted ensures these are available when vi.mock factory runs (mock is
// hoisted to the top of the file before const declarations are initialised).
const { mockGetUser, mockGenerateJobDescription, MockAIError } = vi.hoisted(
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
      mockGenerateJobDescription: vi.fn(),
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
  generateJobDescription: mockGenerateJobDescription,
  AIError: MockAIError,
}));

// Import route handler AFTER mocks are set up
import { POST } from "@/app/api/ai/generate-jd/route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const VALID_BODY = {
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
  style: "formal",
};

const MOCK_PIPELINE_RESULT = {
  data: {
    summary: "We are looking for a Senior Software Engineer...",
    responsibilities: ["Build scalable systems"],
    requirements: ["5+ years TypeScript"],
  },
  metadata: { model: "claude", prompt_version: "1.0" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/generate-jd", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// Pattern B: route only checks !user, not authError.
// To trigger 401 we supply user: null with no error.
function setupUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/ai/generate-jd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated (user is null)", async () => {
    setupUnauth();

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockGenerateJobDescription).not.toHaveBeenCalled();
  });

  it("returns 400 when body is invalid (missing style)", async () => {
    setupAuth();

    // style is required enum; omitting it triggers Zod validation failure
    const res = await POST(
      makePost({ role: "Software Engineer", level: "Senior", industry: "Technology" }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(mockGenerateJobDescription).not.toHaveBeenCalled();
  });

  it("returns 200 with { data, metadata } on success", async () => {
    setupAuth();
    mockGenerateJobDescription.mockResolvedValue(MOCK_PIPELINE_RESULT);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("metadata");
    expect(body.data.summary).toContain("Senior Software Engineer");
    expect(body.metadata.model).toBe("claude");
    expect(mockGenerateJobDescription).toHaveBeenCalledOnce();
  });

  it("returns 200 when strategy_context is included (passthrough test)", async () => {
    setupAuth();
    mockGenerateJobDescription.mockResolvedValue(MOCK_PIPELINE_RESULT);

    const bodyWithContext = {
      ...VALID_BODY,
      strategy_context: {
        salary_positioning: {
          strategy: "above_market",
          recommended_range: { min: 90000, max: 130000, currency: "EUR" },
        },
        competitive_differentiators: ["Equity package", "Remote-first"],
        skills_priority: {
          must_have: ["TypeScript", "React"],
          nice_to_have: ["GraphQL"],
        },
      },
    };

    const res = await POST(makePost(bodyWithContext));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("metadata");
    // strategy_context is forwarded to the pipeline — verify the pipeline was
    // called with the full payload including strategy_context.
    expect(mockGenerateJobDescription).toHaveBeenCalledOnce();
    const calledWith = mockGenerateJobDescription.mock.calls[0][0];
    expect(calledWith).toHaveProperty("strategy_context");
    expect(calledWith.strategy_context.salary_positioning.strategy).toBe(
      "above_market",
    );
  });

  it("returns 500 with AIError message when pipeline throws AIError", async () => {
    setupAuth();
    const aiErr = new MockAIError("Model overloaded");
    mockGenerateJobDescription.mockRejectedValue(aiErr);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Model overloaded");
  });

  it("returns 500 with generic message when pipeline throws an unexpected error", async () => {
    setupAuth();
    mockGenerateJobDescription.mockRejectedValue(new Error("upstream timeout"));

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate job description");
  });
});
