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
import { GET, POST } from "@/app/api/playbooks/[id]/stages/route";

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

const VALID_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const INVALID_UUID = "not-a-uuid";
const MOCK_USER = { id: "user-1", email: "test@example.com" };

const MOCK_STAGE = {
  id: "11111111-2222-3333-4444-555555555555",
  playbook_id: VALID_UUID,
  name: "Phone Screen",
  type: "screening",
  duration_minutes: 30,
  order_index: 0,
  focus_areas: [],
  suggested_questions: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const VALID_STAGE_BODY = {
  name: "Phone Screen",
  type: "screening",
  duration_minutes: 30,
};

function makeGet(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/playbooks/${id}/stages`, {
    method: "GET",
  });
}

function makePost(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/playbooks/${id}/stages`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/playbooks/[id]/stages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupUnauth();
    // mockFrom is not expected to be called after auth failure, but set a
    // safe default to avoid unhandled mock errors.
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await GET(makeGet(VALID_UUID), makeParams(VALID_UUID));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 on invalid UUID", async () => {
    // UUID check fires before auth, so auth mock is not needed here.
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await GET(makeGet(INVALID_UUID), makeParams(INVALID_UUID));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid playbook ID");
  });

  it("returns 200 with stages list on success", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: [MOCK_STAGE], error: null }),
    );

    const res = await GET(makeGet(VALID_UUID), makeParams(VALID_UUID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Phone Screen");
  });

  it("returns 200 with empty array when no stages exist", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: [], error: null }),
    );

    const res = await GET(makeGet(VALID_UUID), makeParams(VALID_UUID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });
});

describe("POST /api/playbooks/[id]/stages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupUnauth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await POST(
      makePost(VALID_UUID, VALID_STAGE_BODY),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when role is 'interviewer'", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "interviewer" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(
      makePost(VALID_UUID, VALID_STAGE_BODY),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 on invalid input (missing name)", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    // name is required (min(1)); omitting it should trigger Zod validation
    const res = await POST(
      makePost(VALID_UUID, { type: "screening", duration_minutes: 30 }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 201 with created stage on success (single object input)", async () => {
    setupAuth();
    // POST hits "interview_stages" twice:
    //   1st call — query max order_index (returns array)
    //   2nd call — insert the new stage (returns single stage)
    let stageCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      // interview_stages table
      stageCallCount++;
      if (stageCallCount === 1) {
        // max order_index query — route treats data as array and reads [0].order_index
        return chainBuilder({ data: [{ order_index: 2 }], error: null });
      }
      // insert call
      return chainBuilder({ data: MOCK_STAGE, error: null });
    });

    const res = await POST(
      makePost(VALID_UUID, VALID_STAGE_BODY),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    // Single-stage input returns the stage object directly (not wrapped)
    expect(body.name).toBe("Phone Screen");
    expect(body.type).toBe("screening");
  });

  it("returns 201 with bulk result when input is an array", async () => {
    setupAuth();
    let stageCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      stageCallCount++;
      if (stageCallCount === 1) {
        // max order_index query
        return chainBuilder({ data: [], error: null });
      }
      // Each insert returns the created stage
      return chainBuilder({ data: MOCK_STAGE, error: null });
    });

    const bulkBody = [VALID_STAGE_BODY, { ...VALID_STAGE_BODY, name: "Technical Interview" }];

    const res = await POST(
      makePost(VALID_UUID, bulkBody),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    // Bulk input returns { data: [...], errors: [] }
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("errors");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("returns 400 when bulk array exceeds 20 items", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    // Build an array of 21 valid stage objects
    const oversizedArray = Array.from({ length: 21 }, (_, i) => ({
      ...VALID_STAGE_BODY,
      name: `Stage ${i + 1}`,
    }));

    const res = await POST(
      makePost(VALID_UUID, oversizedArray),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Too many stages (max 20)");
  });
});
