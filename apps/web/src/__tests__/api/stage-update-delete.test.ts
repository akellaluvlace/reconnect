import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted ensures these are available when vi.mock factory runs (mock is
// hoisted to the top of the file before const declarations are initialised).
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

// Import route handlers AFTER mocks are set up
import { PATCH, DELETE } from "@/app/api/playbooks/[id]/stages/[stageId]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chainBuilder(resolvedValue: { data: unknown; error: unknown }) {
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
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

const VALID_UUID = "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee";
const VALID_STAGE_UUID = "11111111-2222-4333-a444-555555555555";
const INVALID_UUID = "not-a-uuid";
const MOCK_USER = { id: "user-1", email: "test@example.com" };

const UPDATED_STAGE = {
  id: VALID_STAGE_UUID,
  playbook_id: VALID_UUID,
  name: "Updated Screen",
  type: "screening",
  duration_minutes: 45,
  order_index: 0,
  focus_areas: [],
  suggested_questions: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

function makePatch(id: string, stageId: string, body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost/api/playbooks/${id}/stages/${stageId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
}

function makeDelete(id: string, stageId: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/playbooks/${id}/stages/${stageId}`,
    { method: "DELETE" },
  );
}

function makeParams(id: string, stageId: string) {
  return { params: Promise.resolve({ id, stageId }) };
}

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

// Set up mockFrom for routes that first fetch the user profile from "users"
// and then operate on "interview_stages".
function setupFromWithProfile(
  role: string,
  stageResult: { data: unknown; error: unknown },
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({ data: { role }, error: null });
    }
    return chainBuilder(stageResult);
  });
}

// ---------------------------------------------------------------------------
// Tests — PATCH
// ---------------------------------------------------------------------------

describe("PATCH /api/playbooks/[id]/stages/[stageId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupUnauth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await PATCH(
      makePatch(VALID_UUID, VALID_STAGE_UUID, { name: "Updated" }),
      makeParams(VALID_UUID, VALID_STAGE_UUID),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when role is 'interviewer'", async () => {
    setupAuth();
    setupFromWithProfile("interviewer", { data: UPDATED_STAGE, error: null });

    const res = await PATCH(
      makePatch(VALID_UUID, VALID_STAGE_UUID, { name: "Updated" }),
      makeParams(VALID_UUID, VALID_STAGE_UUID),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 on invalid playbook UUID", async () => {
    // UUID check is the very first thing in the handler — no auth needed.
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await PATCH(
      makePatch(INVALID_UUID, VALID_STAGE_UUID, { name: "Updated" }),
      makeParams(INVALID_UUID, VALID_STAGE_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid ID");
  });

  it("returns 400 on invalid stage UUID", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await PATCH(
      makePatch(VALID_UUID, INVALID_UUID, { name: "Updated" }),
      makeParams(VALID_UUID, INVALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid ID");
  });

  it("returns 404 when stage is not found (PGRST116)", async () => {
    setupAuth();
    setupFromWithProfile("admin", {
      data: null,
      error: { code: "PGRST116", message: "The result contains 0 rows" },
    });

    const res = await PATCH(
      makePatch(VALID_UUID, VALID_STAGE_UUID, { name: "Updated" }),
      makeParams(VALID_UUID, VALID_STAGE_UUID),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Stage not found");
  });

  it("returns 200 with updated stage on success (name update)", async () => {
    setupAuth();
    setupFromWithProfile("admin", { data: UPDATED_STAGE, error: null });

    const res = await PATCH(
      makePatch(VALID_UUID, VALID_STAGE_UUID, { name: "Updated Screen" }),
      makeParams(VALID_UUID, VALID_STAGE_UUID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(VALID_STAGE_UUID);
    expect(body.name).toBe("Updated Screen");
  });
});

// ---------------------------------------------------------------------------
// Tests — DELETE
// ---------------------------------------------------------------------------

describe("DELETE /api/playbooks/[id]/stages/[stageId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupUnauth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await DELETE(
      makeDelete(VALID_UUID, VALID_STAGE_UUID),
      makeParams(VALID_UUID, VALID_STAGE_UUID),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when role is 'interviewer'", async () => {
    setupAuth();
    setupFromWithProfile("interviewer", { data: null, error: null });

    const res = await DELETE(
      makeDelete(VALID_UUID, VALID_STAGE_UUID),
      makeParams(VALID_UUID, VALID_STAGE_UUID),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 404 when stage is not found (PGRST116)", async () => {
    setupAuth();
    setupFromWithProfile("admin", {
      data: null,
      error: { code: "PGRST116", message: "The result contains 0 rows" },
    });

    const res = await DELETE(
      makeDelete(VALID_UUID, VALID_STAGE_UUID),
      makeParams(VALID_UUID, VALID_STAGE_UUID),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Stage not found");
  });

  it("returns 200 with { success: true } on successful delete", async () => {
    setupAuth();
    // The DELETE route returns 200 only when data is truthy (the deleted row's id
    // is returned via .select("id").single()), so data must be non-null.
    setupFromWithProfile("admin", {
      data: { id: VALID_STAGE_UUID },
      error: null,
    });

    const res = await DELETE(
      makeDelete(VALID_UUID, VALID_STAGE_UUID),
      makeParams(VALID_UUID, VALID_STAGE_UUID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });
});
