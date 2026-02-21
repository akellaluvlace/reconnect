import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockGenerateCandidateProfile, MockAIError } = vi.hoisted(
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
      mockGenerateCandidateProfile: vi.fn(),
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
  generateCandidateProfile: mockGenerateCandidateProfile,
  AIError: MockAIError,
}));

import { POST } from "@/app/api/ai/generate-candidate-profile/route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const VALID_BODY = {
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
  jd_requirements: {
    required: ["TypeScript", "React"],
    preferred: ["AWS"],
  },
  strategy_skills_priority: {
    must_have: ["TypeScript"],
    nice_to_have: ["Docker"],
  },
};

const MOCK_PIPELINE_RESULT = {
  data: {
    ideal_background: "5+ years full-stack",
    must_have_skills: ["TypeScript"],
    disclaimer: "AI-generated content.",
  },
  metadata: {
    model_used: "claude-sonnet-4-5-20250929",
    prompt_version: "1.0.0",
    generated_at: "2026-02-20T00:00:00.000Z",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/ai/generate-candidate-profile",
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
}

function makePostRaw(rawBody: string): NextRequest {
  return new NextRequest(
    "http://localhost/api/ai/generate-candidate-profile",
    {
      method: "POST",
      body: rawBody,
      headers: { "Content-Type": "application/json" },
    },
  );
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

describe("POST /api/ai/generate-candidate-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockGenerateCandidateProfile).not.toHaveBeenCalled();
  });

  it("returns 401 when auth returns an error", async () => {
    setupAuthError();

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
    expect(mockGenerateCandidateProfile).not.toHaveBeenCalled();
  });

  it("returns 400 when body is missing required fields", async () => {
    setupAuth();

    const res = await POST(makePost({ role: "Engineer" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
    expect(mockGenerateCandidateProfile).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON body", async () => {
    setupAuth();

    const res = await POST(makePostRaw("{not valid json"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
    expect(mockGenerateCandidateProfile).not.toHaveBeenCalled();
  });

  it("returns 200 with { data, metadata } on success", async () => {
    setupAuth();
    mockGenerateCandidateProfile.mockResolvedValue(MOCK_PIPELINE_RESULT);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("metadata");
    expect(body.data.disclaimer).toBe("AI-generated content.");
    expect(body.metadata.model_used).toBe("claude-sonnet-4-5-20250929");
    expect(mockGenerateCandidateProfile).toHaveBeenCalledOnce();
  });

  it("returns 200 with minimal body (no optional fields)", async () => {
    setupAuth();
    mockGenerateCandidateProfile.mockResolvedValue(MOCK_PIPELINE_RESULT);

    const res = await POST(
      makePost({ role: "Designer", level: "Mid", industry: "Creative" }),
    );

    expect(res.status).toBe(200);
    expect(mockGenerateCandidateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Designer",
        level: "Mid",
        industry: "Creative",
      }),
    );
  });

  it("returns 500 with AIError message when pipeline throws AIError", async () => {
    setupAuth();
    mockGenerateCandidateProfile.mockRejectedValue(
      new MockAIError("Rate limit exceeded"),
    );

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Rate limit exceeded");
  });

  it("returns 500 with generic message for unexpected errors", async () => {
    setupAuth();
    mockGenerateCandidateProfile.mockRejectedValue(
      new Error("network timeout"),
    );

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate candidate profile");
  });
});
