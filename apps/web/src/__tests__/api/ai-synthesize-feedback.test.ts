import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetUser,
  mockFrom,
  mockSynthesizeFeedback,
  MockAIError,
  mockServiceFrom,
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
    mockSynthesizeFeedback: vi.fn(),
    MockAIError,
    mockServiceFrom: vi.fn(),
  };
});

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

import { POST } from "@/app/api/ai/synthesize-feedback/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "order",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const VALID_BODY = {
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
};

const MOCK_RESULT = {
  data: { summary: "Overall positive", disclaimer: "AI-generated" },
  metadata: {
    model_used: "claude-opus-4-6",
    prompt_version: "1.0.0",
    generated_at: "2026-02-20T00:00:00Z",
    transcript_included: false,
    transcript_truncated: false,
  },
};

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupDBs() {
  mockFrom.mockReturnValue(chainBuilder({ data: null, error: null }));
  mockServiceFrom.mockReturnValue(
    chainBuilder({ data: { transcript: "Hello world" }, error: null }),
  );
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/synthesize-feedback", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/ai/synthesize-feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
  });

  it("returns 400 with invalid input", async () => {
    setupAuth();

    const res = await POST(makePost({ candidate_name: "John" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("returns 400 on invalid JSON body", async () => {
    setupAuth();

    const res = await POST(
      new NextRequest("http://localhost/api/ai/synthesize-feedback", {
        method: "POST",
        body: "{bad json",
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 200 with synthesis result on success", async () => {
    setupAuth();
    setupDBs();
    mockSynthesizeFeedback.mockResolvedValue(MOCK_RESULT);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("metadata");
    expect(mockSynthesizeFeedback).toHaveBeenCalledOnce();
  });

  it("fetches transcript via service role when interview_id provided", async () => {
    setupAuth();
    setupDBs();
    mockSynthesizeFeedback.mockResolvedValue(MOCK_RESULT);

    const res = await POST(
      makePost({
        ...VALID_BODY,
        interview_id: "11111111-2222-4333-a444-555555555555",
      }),
    );

    expect(res.status).toBe(200);
    // Service role client should have been called
    expect(mockServiceFrom).toHaveBeenCalledWith("interview_transcripts");
    // Pipeline should have received transcript
    expect(mockSynthesizeFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript: "Hello world",
      }),
    );
  });

  it("persists synthesis when candidate_id provided", async () => {
    setupAuth();
    setupDBs();
    mockSynthesizeFeedback.mockResolvedValue(MOCK_RESULT);

    const res = await POST(
      makePost({
        ...VALID_BODY,
        candidate_id: "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee",
      }),
    );

    expect(res.status).toBe(200);
    // Should have called insert on ai_synthesis
    expect(mockFrom).toHaveBeenCalledWith("ai_synthesis");
  });

  it("returns 500 with AIError message when pipeline fails", async () => {
    setupAuth();
    setupDBs();
    mockSynthesizeFeedback.mockRejectedValue(
      new MockAIError("Context window exceeded"),
    );

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Context window exceeded");
  });

  it("returns 500 with generic message for unexpected errors", async () => {
    setupAuth();
    setupDBs();
    mockSynthesizeFeedback.mockRejectedValue(new Error("network error"));

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to synthesize feedback");
  });
});
