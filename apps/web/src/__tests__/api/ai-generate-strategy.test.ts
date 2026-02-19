import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted ensures these are available when vi.mock factory runs (mock is
// hoisted to the top of the file before const declarations are initialised).
const { mockGetUser, mockGenerateHiringStrategy, MockAIError } = vi.hoisted(
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
      mockGenerateHiringStrategy: vi.fn(),
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
  generateHiringStrategy: mockGenerateHiringStrategy,
  AIError: MockAIError,
}));

// Import route handler AFTER mocks are set up
import { POST } from "@/app/api/ai/generate-strategy/route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const VALID_BODY = {
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
  market_insights: {
    salary: {
      min: 70000,
      max: 120000,
      median: 95000,
      currency: "EUR",
      confidence: 0.85,
    },
    competition: {
      companies_hiring: ["Acme Corp"],
      job_postings_count: 42,
      market_saturation: "medium",
    },
    time_to_hire: {
      average_days: 30,
      range: { min: 14, max: 60 },
    },
    candidate_availability: {
      level: "moderate",
      description: "Moderate pool",
    },
    key_skills: {
      required: ["TypeScript"],
      emerging: ["Rust"],
      declining: ["jQuery"],
    },
    trends: ["Remote work increasing"],
  },
};

const MOCK_PIPELINE_RESULT = {
  data: { market_classification: "balanced", disclaimer: "AI-generated" },
  metadata: { model: "claude", prompt_version: "1.0" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/generate-strategy", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makePostRaw(rawBody: string): NextRequest {
  return new NextRequest("http://localhost/api/ai/generate-strategy", {
    method: "POST",
    body: rawBody,
    headers: { "Content-Type": "application/json" },
  });
}

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

describe("POST /api/ai/generate-strategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated (user is null)", async () => {
    setupAuth(null);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockGenerateHiringStrategy).not.toHaveBeenCalled();
  });

  it("returns 401 when auth returns an error", async () => {
    setupAuthError();

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockGenerateHiringStrategy).not.toHaveBeenCalled();
  });

  it("returns 400 when body is invalid (missing required fields)", async () => {
    setupAuth();

    // market_insights is required but omitted
    const res = await POST(
      makePost({ role: "Software Engineer", level: "Senior", industry: "Technology" }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(mockGenerateHiringStrategy).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON body", async () => {
    setupAuth();

    const res = await POST(makePostRaw("{not valid json"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
    expect(mockGenerateHiringStrategy).not.toHaveBeenCalled();
  });

  it("returns 200 with { data, metadata } on success", async () => {
    setupAuth();
    mockGenerateHiringStrategy.mockResolvedValue(MOCK_PIPELINE_RESULT);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("metadata");
    expect(body.data.market_classification).toBe("balanced");
    expect(body.data.disclaimer).toBe("AI-generated");
    expect(body.metadata.model).toBe("claude");
    expect(mockGenerateHiringStrategy).toHaveBeenCalledOnce();
  });

  it("returns 500 with AIError message when pipeline throws AIError", async () => {
    setupAuth();
    const aiErr = new MockAIError("Rate limit exceeded");
    mockGenerateHiringStrategy.mockRejectedValue(aiErr);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Rate limit exceeded");
  });

  it("returns 500 with generic message when pipeline throws an unexpected error", async () => {
    setupAuth();
    mockGenerateHiringStrategy.mockRejectedValue(new Error("network timeout"));

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate hiring strategy");
  });
});
