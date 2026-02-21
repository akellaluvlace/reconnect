/**
 * Contract tests for 5 API routes that previously had ZERO test coverage:
 *
 *   1. POST /api/consent                    (4 tests)
 *   2. POST /api/ai/generate-questions      (4 tests)
 *   3. POST /api/ai/market-insights         (4 tests)
 *   4. GET  /api/ai/market-insights/[id]    (4 tests)
 *   5. PATCH /api/feedback/[id]             (4 tests)
 *
 * Total: 20 tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be available before vi.mock factories execute
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockFrom,
  mockServiceFrom,
  mockGenerateQuestions,
  mockGenerateQuickInsights,
  mockGenerateCacheKey,
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
    mockGenerateQuestions: vi.fn(),
    mockGenerateQuickInsights: vi.fn(),
    mockGenerateCacheKey: vi.fn(),
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
  generateQuestions: mockGenerateQuestions,
  generateQuickInsights: mockGenerateQuickInsights,
  generateCacheKey: mockGenerateCacheKey,
  AIError: MockAIError,
  PROMPT_VERSIONS: {
    marketInsights: "1.0.0",
    questionGeneration: "1.0.0",
  },
  AI_CONFIG: {
    marketInsightsQuick: {
      model: "claude-sonnet-4-5-20250929",
    },
  },
}));

// ---------------------------------------------------------------------------
// Route handler imports (AFTER mocks)
// ---------------------------------------------------------------------------

import { POST as consentPOST } from "@/app/api/consent/route";
import { POST as generateQuestionsPOST } from "@/app/api/ai/generate-questions/route";
import { POST as marketInsightsPOST } from "@/app/api/ai/market-insights/route";
import { GET as marketInsightsIdGET } from "@/app/api/ai/market-insights/[id]/route";
import { PATCH as feedbackPATCH } from "@/app/api/feedback/[id]/route";

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
// Shared fixtures
// ---------------------------------------------------------------------------

const USER_ID = "aabbccdd-1122-4344-a566-778899aabb00";
const ORG_ID = "00112233-4455-6677-8899-aabbccddeeff";
const PLAYBOOK_ID = "11223344-5566-7788-99aa-bbccddeeff00";
const COLLABORATOR_ID = "aabbccdd-eeff-4011-a233-445566778899";
const FEEDBACK_ID = "55667788-99aa-4bcc-adee-ff0011223344";
// A valid 64-char hex cache key (SHA-256 format)
const CACHE_KEY = "a".repeat(64);

const MOCK_USER = { id: USER_ID, email: "test@example.com" };

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function makeRequest(
  url: string,
  method: string = "GET",
  body?: unknown,
): NextRequest {
  const init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  } = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

// ===========================================================================
// 1. POST /api/consent (4 tests)
// ===========================================================================

describe("POST /api/consent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 on missing/invalid token", async () => {
    const res = await consentPOST(
      makeRequest("http://localhost:3000/api/consent", "POST", { token: "" }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 404 on nonexistent token (collaborator lookup returns null)", async () => {
    mockServiceFrom.mockReturnValue(
      chainBuilder({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      }),
    );

    const res = await consentPOST(
      makeRequest("http://localhost:3000/api/consent", "POST", {
        token: "nonexistent-token",
      }),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Invalid or expired consent token");
  });

  it("returns 200 on valid token (consent recorded)", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "collaborators") {
        return chainBuilder({
          data: { id: COLLABORATOR_ID, playbook_id: PLAYBOOK_ID },
          error: null,
        });
      }
      // interviews update
      return chainBuilder({ data: null, error: null });
    });

    const res = await consentPOST(
      makeRequest("http://localhost:3000/api/consent", "POST", {
        token: "valid-token-abc",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 on DB update failure", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "collaborators") {
        return chainBuilder({
          data: { id: COLLABORATOR_ID, playbook_id: PLAYBOOK_ID },
          error: null,
        });
      }
      // interviews update fails
      return chainBuilder({
        data: null,
        error: { code: "42501", message: "permission denied" },
      });
    });

    const res = await consentPOST(
      makeRequest("http://localhost:3000/api/consent", "POST", {
        token: "valid-token-abc",
      }),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to record consent");
  });
});

// ===========================================================================
// 2. POST /api/ai/generate-questions (4 tests)
// ===========================================================================

describe("POST /api/ai/generate-questions", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_BODY = {
    role: "Software Engineer",
    level: "Senior",
    focus_area: "System Design",
    focus_area_description: "Ability to design scalable distributed systems",
    stage_type: "technical",
  };

  it("returns 401 unauthorized", async () => {
    setupAuth(null);

    const res = await generateQuestionsPOST(
      makeRequest(
        "http://localhost:3000/api/ai/generate-questions",
        "POST",
        VALID_BODY,
      ),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 invalid input", async () => {
    setupAuth();

    const res = await generateQuestionsPOST(
      makeRequest(
        "http://localhost:3000/api/ai/generate-questions",
        "POST",
        { role: "" }, // missing required fields, empty role
      ),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 200 happy path with questions data", async () => {
    setupAuth();
    mockGenerateQuestions.mockResolvedValue({
      data: {
        focus_area: "System Design",
        questions: [
          {
            question: "How would you design a real-time chat system?",
            purpose: "Assess distributed system design capability",
            look_for: ["WebSocket usage", "Message ordering", "Scalability"],
          },
        ],
      },
      metadata: {
        model_used: "claude-sonnet-4-5-20250929",
        prompt_version: "1.0.0",
        generated_at: "2026-02-20T00:00:00.000Z",
      },
    });

    const res = await generateQuestionsPOST(
      makeRequest(
        "http://localhost:3000/api/ai/generate-questions",
        "POST",
        VALID_BODY,
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.focus_area).toBe("System Design");
    expect(body.data.questions).toHaveLength(1);
    expect(body.metadata).toBeDefined();
  });

  it("returns 500 on AIError", async () => {
    setupAuth();
    mockGenerateQuestions.mockRejectedValue(
      new MockAIError("Model rate limited"),
    );

    const res = await generateQuestionsPOST(
      makeRequest(
        "http://localhost:3000/api/ai/generate-questions",
        "POST",
        VALID_BODY,
      ),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Model rate limited");
  });
});

// ===========================================================================
// 3. POST /api/ai/market-insights (4 tests)
// ===========================================================================

describe("POST /api/ai/market-insights", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_BODY = {
    role: "Software Engineer",
    level: "Senior",
    industry: "Technology",
    location: "Dublin",
  };

  it("returns 401 unauthorized", async () => {
    setupAuth(null);

    const res = await marketInsightsPOST(
      makeRequest(
        "http://localhost:3000/api/ai/market-insights",
        "POST",
        VALID_BODY,
      ),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 invalid input", async () => {
    setupAuth();

    const res = await marketInsightsPOST(
      makeRequest(
        "http://localhost:3000/api/ai/market-insights",
        "POST",
        { role: "" }, // missing required fields
      ),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 200 happy path (fresh response)", async () => {
    setupAuth();
    mockGenerateCacheKey.mockReturnValue(CACHE_KEY);

    // mockFrom dispatches: users -> org, ai_research_cache -> cache miss (PGRST116)
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: ORG_ID },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        // Cache miss for quick phase lookup, upsert succeeds
        return chainBuilder({
          data: null,
          error: { code: "PGRST116", message: "not found" },
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    mockGenerateQuickInsights.mockResolvedValue({
      salary: { min: 70000, max: 120000 },
      competition: { companies_hiring: ["Acme"] },
    });

    const res = await marketInsightsPOST(
      makeRequest(
        "http://localhost:3000/api/ai/market-insights",
        "POST",
        VALID_BODY,
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.phase).toBe("quick");
    expect(body.cached).toBe(false);
    expect(body.cache_key).toBe(CACHE_KEY);
    expect(body.metadata).toBeDefined();
  });

  it("returns 200 cached response", async () => {
    setupAuth();
    mockGenerateCacheKey.mockReturnValue(CACHE_KEY);

    const cachedResults = {
      salary: { min: 70000, max: 120000 },
    };

    // First call: users -> org. Second+: ai_research_cache -> cache hit
    let cacheCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: ORG_ID },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        cacheCallCount++;
        if (cacheCallCount === 1) {
          // quick cache hit
          return chainBuilder({
            data: {
              results: cachedResults,
              sources: [],
              created_at: "2026-02-20T00:00:00Z",
            },
            error: null,
          });
        }
        // deep cache check
        return chainBuilder({
          data: null,
          error: { code: "PGRST116", message: "not found" },
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await marketInsightsPOST(
      makeRequest(
        "http://localhost:3000/api/ai/market-insights",
        "POST",
        VALID_BODY,
      ),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(cachedResults);
    expect(body.phase).toBe("quick");
    expect(body.cached).toBe(true);
    expect(body.deep_research_available).toBe(false);
  });
});

// ===========================================================================
// 4. GET /api/ai/market-insights/[id] (4 tests)
// ===========================================================================

describe("GET /api/ai/market-insights/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 unauthorized", async () => {
    setupAuth(null);

    const res = await marketInsightsIdGET(
      makeRequest(
        `http://localhost:3000/api/ai/market-insights/${CACHE_KEY}`,
      ),
      { params: Promise.resolve({ id: CACHE_KEY }) },
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 invalid key (not a valid SHA-256 hex format)", async () => {
    setupAuth();

    const res = await marketInsightsIdGET(
      makeRequest(
        "http://localhost:3000/api/ai/market-insights/not-valid-hex",
      ),
      { params: Promise.resolve({ id: "not-valid-hex" }) },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid cache key");
  });

  it("returns 200 pending status", async () => {
    setupAuth();

    // users -> org, ai_research_cache -> no deep result (PGRST116)
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: ORG_ID },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        return chainBuilder({
          data: null,
          error: { code: "PGRST116", message: "not found" },
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await marketInsightsIdGET(
      makeRequest(
        `http://localhost:3000/api/ai/market-insights/${CACHE_KEY}?action=poll`,
      ),
      { params: Promise.resolve({ id: CACHE_KEY }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending");
  });

  it("returns 200 complete status with data", async () => {
    setupAuth();

    const deepResults = { detailed_analysis: "some data" };
    const deepSources = [{ url: "https://example.com", title: "Source" }];

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: ORG_ID },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        return chainBuilder({
          data: {
            results: deepResults,
            sources: deepSources,
            created_at: "2026-02-20T00:00:00Z",
          },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await marketInsightsIdGET(
      makeRequest(
        `http://localhost:3000/api/ai/market-insights/${CACHE_KEY}?action=poll`,
      ),
      { params: Promise.resolve({ id: CACHE_KEY }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("complete");
    expect(body.data).toEqual(deepResults);
    expect(body.sources).toEqual(deepSources);
    expect(body.cached).toBe(true);
  });
});

// ===========================================================================
// 5. PATCH /api/feedback/[id] (4 tests)
// ===========================================================================

describe("PATCH /api/feedback/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_UPDATE = {
    ratings: [{ category: "Technical Skills", score: 3 }],
    pros: ["Excellent problem-solving"],
    cons: ["Needs more experience"],
  };

  it("returns 401 unauthorized", async () => {
    setupAuth(null);

    const res = await feedbackPATCH(
      makeRequest(
        `http://localhost:3000/api/feedback/${FEEDBACK_ID}`,
        "PATCH",
        VALID_UPDATE,
      ),
      { params: Promise.resolve({ id: FEEDBACK_ID }) },
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 not own feedback (interviewer_id does not match)", async () => {
    setupAuth();

    // Feedback exists but belongs to a different user
    const otherUserId = "11223344-5566-7788-99aa-bbccddeeff11";
    mockFrom.mockReturnValue(
      chainBuilder({
        data: { interviewer_id: otherUserId },
        error: null,
      }),
    );

    const res = await feedbackPATCH(
      makeRequest(
        `http://localhost:3000/api/feedback/${FEEDBACK_ID}`,
        "PATCH",
        VALID_UPDATE,
      ),
      { params: Promise.resolve({ id: FEEDBACK_ID }) },
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Can only edit your own feedback");
  });

  it("returns 400 invalid input", async () => {
    setupAuth();

    // Ownership check passes
    mockFrom.mockReturnValue(
      chainBuilder({
        data: { interviewer_id: USER_ID },
        error: null,
      }),
    );

    const res = await feedbackPATCH(
      makeRequest(
        `http://localhost:3000/api/feedback/${FEEDBACK_ID}`,
        "PATCH",
        { ratings: [{ category: "Tech", score: 10 }] }, // score > 4 is invalid
      ),
      { params: Promise.resolve({ id: FEEDBACK_ID }) },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 200 happy path", async () => {
    setupAuth();

    const updatedFeedback = {
      id: FEEDBACK_ID,
      interviewer_id: USER_ID,
      ratings: [{ category: "Technical Skills", score: 3 }],
      pros: ["Excellent problem-solving"],
      cons: ["Needs more experience"],
      notes: null,
    };

    // First call: ownership check returns interviewer_id matching user
    // Second call: update returns the updated feedback
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // ownership lookup
        return chainBuilder({
          data: { interviewer_id: USER_ID },
          error: null,
        });
      }
      // update result
      return chainBuilder({
        data: updatedFeedback,
        error: null,
      });
    });

    const res = await feedbackPATCH(
      makeRequest(
        `http://localhost:3000/api/feedback/${FEEDBACK_ID}`,
        "PATCH",
        VALID_UPDATE,
      ),
      { params: Promise.resolve({ id: FEEDBACK_ID }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(FEEDBACK_ID);
  });
});
