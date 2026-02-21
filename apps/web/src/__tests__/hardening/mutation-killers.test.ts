/**
 * Mutation Killer Tests
 *
 * These tests were written to cover gaps discovered during mutation testing.
 * Each describe block addresses a specific SURVIVED mutation.
 *
 * M2:  Blind feedback rule — interviewer restricted to own feedback
 * M7:  UUID validation on feedback GET ?interview_id= param
 * M10: Synthesis route score range must be 1-4 (not 1-5)
 * M12: interviewer_id comes from auth, not request body
 * M13: Share links GET filters by is_active=true
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
  mockRandomBytes,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockServiceFrom: vi.fn(),
  mockRandomBytes: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

vi.mock("crypto", () => ({
  randomBytes: mockRandomBytes,
}));

vi.mock("@/lib/email/resend-client", () => ({
  sendCollaboratorInvite: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MOCK_USER_ID = "aabbccdd-1122-4344-a566-778899aabb00";
const MOCK_USER = { id: MOCK_USER_ID, email: "user@test.com" };
const MOCK_INTERVIEW_ID = "11223344-aabb-4cdd-aeff-001122334455";

function makeReq(url: string, method = "GET", body?: unknown): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "order", "limit", "is", "in", "match",
    "filter", "gt", "lt", "gte", "lte", "ilike",
  ];
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

function setupAuth(user: { id: string; email: string } | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRandomBytes.mockReturnValue(Buffer.from("ab".repeat(32), "hex"));
});

// ---------------------------------------------------------------------------
// M2: Blind feedback rule — interviewer sees only own feedback
// ---------------------------------------------------------------------------
describe("M2: Blind feedback rule enforcement", () => {
  it("adds .eq('interviewer_id', user.id) when role is interviewer", async () => {
    setupAuth(MOCK_USER);

    // Track the eq calls on the feedback builder
    const feedbackBuilder = chainBuilder({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "interviewer" },
          error: null,
        });
      }
      if (table === "feedback") {
        return feedbackBuilder;
      }
      return chainBuilder({ data: null, error: null });
    });

    const { GET } = await import("@/app/api/feedback/route");
    const req = makeReq(
      `http://localhost:3000/api/feedback?interview_id=${MOCK_INTERVIEW_ID}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    // The key assertion: .eq must have been called with 'interviewer_id'
    const eqCalls = feedbackBuilder.eq.mock.calls;
    const hasInterviewerFilter = eqCalls.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (call: any[]) => call[0] === "interviewer_id" && call[1] === MOCK_USER_ID,
    );
    expect(hasInterviewerFilter).toBe(true);
  });

  it("does NOT add interviewer_id filter for admin role", async () => {
    setupAuth(MOCK_USER);

    const feedbackBuilder = chainBuilder({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin" },
          error: null,
        });
      }
      if (table === "feedback") {
        return feedbackBuilder;
      }
      return chainBuilder({ data: null, error: null });
    });

    const { GET } = await import("@/app/api/feedback/route");
    const req = makeReq(
      `http://localhost:3000/api/feedback?interview_id=${MOCK_INTERVIEW_ID}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    // Admin should NOT have interviewer_id filter
    const eqCalls = feedbackBuilder.eq.mock.calls;
    const hasInterviewerFilter = eqCalls.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (call: any[]) => call[0] === "interviewer_id",
    );
    expect(hasInterviewerFilter).toBe(false);
  });

  it("does NOT add interviewer_id filter for manager role", async () => {
    setupAuth(MOCK_USER);

    const feedbackBuilder = chainBuilder({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "manager" },
          error: null,
        });
      }
      if (table === "feedback") {
        return feedbackBuilder;
      }
      return chainBuilder({ data: null, error: null });
    });

    const { GET } = await import("@/app/api/feedback/route");
    const req = makeReq(
      `http://localhost:3000/api/feedback?interview_id=${MOCK_INTERVIEW_ID}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const eqCalls = feedbackBuilder.eq.mock.calls;
    const hasInterviewerFilter = eqCalls.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (call: any[]) => call[0] === "interviewer_id",
    );
    expect(hasInterviewerFilter).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// M7: UUID validation on feedback GET ?interview_id= param
// ---------------------------------------------------------------------------
describe("M7: UUID validation on feedback GET query param", () => {
  it("rejects non-UUID interview_id with 400", async () => {
    setupAuth(MOCK_USER);
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: [], error: null });
    });

    const { GET } = await import("@/app/api/feedback/route");

    // SQL injection attempt
    const req = makeReq(
      "http://localhost:3000/api/feedback?interview_id='; DROP TABLE feedback;--",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("rejects interview_id with invalid hex chars", async () => {
    setupAuth(MOCK_USER);
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: [], error: null });
    });

    const { GET } = await import("@/app/api/feedback/route");
    const req = makeReq(
      "http://localhost:3000/api/feedback?interview_id=gggggggg-hhhh-iiii-jjjj-kkkkkkkkkkkk",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("accepts valid UUID interview_id", async () => {
    setupAuth(MOCK_USER);
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: [], error: null });
    });

    const { GET } = await import("@/app/api/feedback/route");
    const req = makeReq(
      `http://localhost:3000/api/feedback?interview_id=${MOCK_INTERVIEW_ID}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// M10: Synthesis route score range must match 1-4
// ---------------------------------------------------------------------------
describe("M10: Synthesis score range validation (1-4)", () => {
  it("rejects score=5 in synthesis feedback_forms", async () => {
    setupAuth(MOCK_USER);
    mockFrom.mockReturnValue(chainBuilder({ data: null, error: null }));
    mockServiceFrom.mockReturnValue(chainBuilder({ data: null, error: null }));

    const { POST } = await import("@/app/api/ai/synthesize-feedback/route");
    const req = makeReq("http://localhost:3000/api/ai/synthesize-feedback", "POST", {
      candidate_name: "Test Candidate",
      role: "Developer",
      stage_name: "Technical",
      feedback_forms: [
        {
          interviewer_name: "Jane",
          ratings: [{ category: "Skills", score: 5 }],
          pros: ["Good"],
          cons: ["None"],
        },
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("rejects score=0 in synthesis feedback_forms", async () => {
    setupAuth(MOCK_USER);
    mockFrom.mockReturnValue(chainBuilder({ data: null, error: null }));

    const { POST } = await import("@/app/api/ai/synthesize-feedback/route");
    const req = makeReq("http://localhost:3000/api/ai/synthesize-feedback", "POST", {
      candidate_name: "Test Candidate",
      role: "Developer",
      stage_name: "Technical",
      feedback_forms: [
        {
          interviewer_name: "Jane",
          ratings: [{ category: "Skills", score: 0 }],
          pros: [],
          cons: [],
        },
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("accepts score=4 in synthesis feedback_forms", async () => {
    setupAuth(MOCK_USER);
    mockFrom.mockReturnValue(chainBuilder({ data: null, error: null }));
    mockServiceFrom.mockReturnValue(
      chainBuilder({ data: null, error: { code: "PGRST116", message: "not found" } }),
    );

    // Mock the AI pipeline
    const mockSynthesize = vi.fn().mockResolvedValue({
      data: { summary: "test" },
      metadata: { model_used: "test", prompt_version: "v1" },
    });
    vi.doMock("@reconnect/ai", () => ({
      synthesizeFeedback: mockSynthesize,
      AIError: class AIError extends Error {},
    }));

    const { POST } = await import("@/app/api/ai/synthesize-feedback/route");
    const req = makeReq("http://localhost:3000/api/ai/synthesize-feedback", "POST", {
      candidate_name: "Test Candidate",
      role: "Developer",
      stage_name: "Technical",
      feedback_forms: [
        {
          interviewer_name: "Jane",
          ratings: [{ category: "Skills", score: 4 }],
          pros: ["Great"],
          cons: [],
        },
      ],
    });
    const res = await POST(req);
    // Should not be 400 — score 4 is valid
    expect(res.status).not.toBe(400);
  });
});

// ---------------------------------------------------------------------------
// M12: interviewer_id must come from auth (user.id), not request body
// ---------------------------------------------------------------------------
describe("M12: interviewer_id from auth, not body", () => {
  it("uses user.id as interviewer_id regardless of body.interviewer_id", async () => {
    setupAuth(MOCK_USER);

    const insertBuilder = chainBuilder({
      data: { id: "00000001-0000-4000-a000-000000000001" },
      error: null,
    });

    mockFrom.mockReturnValue(insertBuilder);

    const { POST } = await import("@/app/api/feedback/route");
    const FAKE_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const req = makeReq("http://localhost:3000/api/feedback", "POST", {
      interview_id: MOCK_INTERVIEW_ID,
      ratings: [{ category: "Communication", score: 3, notes: "" }],
      pros: ["Clear"],
      cons: ["Nervous"],
      focus_areas_confirmed: true,
      interviewer_id: FAKE_ID, // Spoofed! Should be ignored
    });
    const res = await POST(req);

    // The insert call should have user.id, NOT the spoofed FAKE_ID
    const insertCalls = insertBuilder.insert.mock.calls;
    expect(insertCalls.length).toBeGreaterThan(0);
    const insertedRow = insertCalls[0][0];
    expect(insertedRow.interviewer_id).toBe(MOCK_USER_ID);
    expect(insertedRow.interviewer_id).not.toBe(FAKE_ID);
  });
});

// ---------------------------------------------------------------------------
// M13: Share links GET must filter by is_active=true
// ---------------------------------------------------------------------------
describe("M13: Share links GET filters by is_active=true", () => {
  it("adds .eq('is_active', true) to the query", async () => {
    setupAuth(MOCK_USER);

    const shareBuilder = chainBuilder({ data: [], error: null });

    mockFrom.mockReturnValue(shareBuilder);

    const PLAYBOOK_ID = "aabb0011-2233-4455-a677-889900aabbcc";
    const { GET } = await import("@/app/api/share-links/route");
    const req = makeReq(
      `http://localhost:3000/api/share-links?playbook_id=${PLAYBOOK_ID}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    // Verify .eq was called with 'is_active', true
    const eqCalls = shareBuilder.eq.mock.calls;
    const hasActiveFilter = eqCalls.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (call: any[]) => call[0] === "is_active" && call[1] === true,
    );
    expect(hasActiveFilter).toBe(true);
  });
});
