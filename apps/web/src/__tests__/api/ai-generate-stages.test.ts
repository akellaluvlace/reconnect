import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted ensures these are available when vi.mock factory runs (mock is
// hoisted to the top of the file before const declarations are initialised).
const { mockGetUser, mockGenerateStages, MockAIError } = vi.hoisted(() => {
  class MockAIError extends Error {
    name = "AIError";
    constructor(m: string) {
      super(m);
      this.name = "AIError";
    }
  }
  return {
    mockGetUser: vi.fn(),
    mockGenerateStages: vi.fn(),
    MockAIError,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("@reconnect/ai", () => ({
  generateStages: mockGenerateStages,
  AIError: MockAIError,
}));

// Import route handler AFTER mocks are set up
import { POST } from "@/app/api/ai/generate-stages/route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const VALID_BODY = {
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
};

const MOCK_PIPELINE_RESULT = {
  data: {
    stages: [
      {
        name: "Phone Screen",
        type: "screening",
        duration_minutes: 30,
        focus_areas: [{ name: "Culture Fit", description: "Values alignment" }],
      },
      {
        name: "Technical Interview",
        type: "technical",
        duration_minutes: 60,
        focus_areas: [{ name: "System Design", description: "Architecture skills" }],
      },
    ],
  },
  metadata: { model: "claude", prompt_version: "1.0" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/generate-stages", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// Pattern B: route only checks !user; supply user: null with no error.
function setupUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/ai/generate-stages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated (user is null)", async () => {
    setupUnauth();

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockGenerateStages).not.toHaveBeenCalled();
  });

  it("returns 400 when body is invalid (missing role)", async () => {
    setupAuth();

    // role is required (min(1)); omitting it triggers Zod validation failure
    const res = await POST(
      makePost({ level: "Senior", industry: "Technology" }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(mockGenerateStages).not.toHaveBeenCalled();
  });

  it("returns 200 with { data, metadata } on success", async () => {
    setupAuth();
    mockGenerateStages.mockResolvedValue(MOCK_PIPELINE_RESULT);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("metadata");
    expect(Array.isArray(body.data.stages)).toBe(true);
    expect(body.data.stages).toHaveLength(2);
    expect(body.data.stages[0].name).toBe("Phone Screen");
    expect(body.metadata.model).toBe("claude");
    expect(mockGenerateStages).toHaveBeenCalledOnce();
  });

  it("returns 200 when strategy_context is included (passthrough test)", async () => {
    setupAuth();
    mockGenerateStages.mockResolvedValue(MOCK_PIPELINE_RESULT);

    const bodyWithContext = {
      ...VALID_BODY,
      strategy_context: {
        market_classification: "candidate_market",
        process_speed: {
          recommendation: "fast",
          max_stages: 3,
          target_days: 14,
        },
        skills_priority: {
          must_have: ["TypeScript", "React"],
          nice_to_have: ["GraphQL"],
        },
        competitive_differentiators: ["Equity package"],
      },
    };

    const res = await POST(makePost(bodyWithContext));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("metadata");
    // Verify strategy_context is forwarded to the pipeline intact
    expect(mockGenerateStages).toHaveBeenCalledOnce();
    const calledWith = mockGenerateStages.mock.calls[0][0];
    expect(calledWith).toHaveProperty("strategy_context");
    expect(calledWith.strategy_context.market_classification).toBe(
      "candidate_market",
    );
    expect(calledWith.strategy_context.process_speed.max_stages).toBe(3);
  });

  it("returns 500 when pipeline throws AIError", async () => {
    setupAuth();
    const aiErr = new MockAIError("Context window exceeded");
    mockGenerateStages.mockRejectedValue(aiErr);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Context window exceeded");
  });

  it("returns 500 with generic message when pipeline throws an unexpected error", async () => {
    setupAuth();
    mockGenerateStages.mockRejectedValue(new Error("connection reset"));

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate interview stages");
  });
});
