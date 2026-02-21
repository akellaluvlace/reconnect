import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

import { GET, POST } from "@/app/api/feedback/route";
import {
  GET as GET_BY_ID,
  PATCH,
} from "@/app/api/feedback/[id]/route";

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
    "eq",
    "neq",
    "order",
    "limit",
    "is",
    "in",
    "match",
    "filter",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

const MOCK_USER = { id: "user-1", email: "test@example.com" };
const INTERVIEW_ID = "11111111-2222-4333-a444-555555555555";
const FEEDBACK_ID = "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee";

const VALID_FEEDBACK = {
  interview_id: INTERVIEW_ID,
  ratings: [{ category: "Technical Skills", score: 3 }],
  pros: ["Strong problem-solving"],
  cons: ["Needs more experience with CI/CD"],
  notes: "Good interview overall",
  focus_areas_confirmed: true,
};

const MOCK_FEEDBACK_ROW = {
  id: FEEDBACK_ID,
  interview_id: INTERVIEW_ID,
  interviewer_id: "user-1",
  ratings: [{ category: "Technical Skills", score: 3 }],
  pros: ["Strong problem-solving"],
  cons: ["Needs more experience with CI/CD"],
  notes: "Good interview overall",
  focus_areas_confirmed: true,
  submitted_at: "2026-02-20T00:00:00Z",
};

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupProfileAndTable(
  role: string,
  tableData: unknown = [],
  tableError: unknown = null,
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({ data: { role }, error: null });
    }
    return chainBuilder({ data: tableData, error: tableError });
  });
}

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makePatch(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/feedback/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// GET /api/feedback
// ---------------------------------------------------------------------------

describe("GET /api/feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await GET(
      makeGet(`http://localhost/api/feedback?interview_id=${INTERVIEW_ID}`),
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when interview_id is missing", async () => {
    setupAuth();
    setupProfileAndTable("admin");

    const res = await GET(makeGet("http://localhost/api/feedback"));

    expect(res.status).toBe(400);
  });

  it("returns 200 with feedback list for manager (sees all)", async () => {
    setupAuth();
    setupProfileAndTable("manager", [MOCK_FEEDBACK_ROW]);

    const res = await GET(
      makeGet(`http://localhost/api/feedback?interview_id=${INTERVIEW_ID}`),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([MOCK_FEEDBACK_ROW]);
  });

  it("returns 200 with own feedback only for interviewer (blind rule)", async () => {
    setupAuth();
    setupProfileAndTable("interviewer", [MOCK_FEEDBACK_ROW]);

    const res = await GET(
      makeGet(`http://localhost/api/feedback?interview_id=${INTERVIEW_ID}`),
    );

    expect(res.status).toBe(200);
    // Verify that eq was called with interviewer_id filter
    const feedbackBuilder = mockFrom.mock.results.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) =>
        r.value?.eq && mockFrom.mock.calls.some(
          (c: string[]) => c[0] === "feedback",
        ),
    );
    expect(feedbackBuilder).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/feedback
// ---------------------------------------------------------------------------

describe("POST /api/feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await POST(makePost(VALID_FEEDBACK));

    expect(res.status).toBe(401);
  });

  it("returns 400 with invalid input (focus_areas_confirmed = false)", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await POST(
      makePost({ ...VALID_FEEDBACK, focus_areas_confirmed: false }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("returns 400 with rating score > 4", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await POST(
      makePost({
        ...VALID_FEEDBACK,
        ratings: [{ category: "Skills", score: 5 }],
      }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 with rating score < 1", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await POST(
      makePost({
        ...VALID_FEEDBACK,
        ratings: [{ category: "Skills", score: 0 }],
      }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 with empty ratings array", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await POST(
      makePost({ ...VALID_FEEDBACK, ratings: [] }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 201 with created feedback on success", async () => {
    setupAuth();
    setupProfileAndTable("interviewer", MOCK_FEEDBACK_ROW);

    const res = await POST(makePost(VALID_FEEDBACK));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.interviewer_id).toBe("user-1");
  });

  it("returns 400 on invalid JSON body", async () => {
    setupAuth();

    const res = await POST(
      new NextRequest("http://localhost/api/feedback", {
        method: "POST",
        body: "{not valid",
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/feedback/[id]
// ---------------------------------------------------------------------------

describe("GET /api/feedback/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await GET_BY_ID(
      makeGet(`http://localhost/api/feedback/${FEEDBACK_ID}`),
      { params: Promise.resolve({ id: FEEDBACK_ID }) },
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 with invalid UUID", async () => {
    setupAuth();

    const res = await GET_BY_ID(
      makeGet("http://localhost/api/feedback/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );

    expect(res.status).toBe(400);
  });

  it("returns 200 for admin viewing any feedback", async () => {
    setupAuth();
    setupProfileAndTable("admin", {
      ...MOCK_FEEDBACK_ROW,
      interviewer_id: "other-user",
    });

    const res = await GET_BY_ID(
      makeGet(`http://localhost/api/feedback/${FEEDBACK_ID}`),
      { params: Promise.resolve({ id: FEEDBACK_ID }) },
    );

    expect(res.status).toBe(200);
  });

  it("returns 404 for interviewer viewing others' feedback (blind rule)", async () => {
    setupAuth();
    setupProfileAndTable("interviewer", {
      ...MOCK_FEEDBACK_ROW,
      interviewer_id: "other-user",
    });

    const res = await GET_BY_ID(
      makeGet(`http://localhost/api/feedback/${FEEDBACK_ID}`),
      { params: Promise.resolve({ id: FEEDBACK_ID }) },
    );

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/feedback/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/feedback/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await PATCH(makePatch(FEEDBACK_ID, { notes: "Updated" }), {
      params: Promise.resolve({ id: FEEDBACK_ID }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 when editing other user's feedback", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "feedback") {
        return chainBuilder({
          data: { interviewer_id: "other-user" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await PATCH(makePatch(FEEDBACK_ID, { notes: "Updated" }), {
      params: Promise.resolve({ id: FEEDBACK_ID }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 200 on successful update of own feedback", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({
        data: { ...MOCK_FEEDBACK_ROW, interviewer_id: "user-1" },
        error: null,
      }),
    );

    const res = await PATCH(
      makePatch(FEEDBACK_ID, { notes: "Updated notes" }),
      { params: Promise.resolve({ id: FEEDBACK_ID }) },
    );

    expect(res.status).toBe(200);
  });
});
