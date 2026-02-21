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
import { GET } from "@/app/api/playbooks/[id]/route";

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
const INVALID_UUID = "not-a-uuid";

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const MOCK_PLAYBOOK = {
  id: VALID_UUID,
  title: "Senior Engineer",
  department: "Engineering",
  status: "draft",
  organization_id: "org-1",
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  interview_stages: [],
};

function makeReq(id = VALID_UUID) {
  return new NextRequest(`http://localhost/api/playbooks/${id}`, {
    method: "GET",
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/playbooks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: MOCK_PLAYBOOK, error: null }),
    );

    const res = await GET(makeReq(), makeParams(VALID_UUID));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 on invalid UUID", async () => {
    // UUID regex check happens before the auth lookup in this route handler.
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await GET(makeReq(INVALID_UUID), makeParams(INVALID_UUID));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid playbook ID");
  });

  it("returns 404 when playbook not found (PGRST116)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockFrom.mockImplementation(() =>
      chainBuilder({
        data: null,
        error: { code: "PGRST116", message: "The result contains 0 rows" },
      }),
    );

    const res = await GET(makeReq(), makeParams(VALID_UUID));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Playbook not found");
  });

  it("returns 200 with playbook data on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: MOCK_PLAYBOOK, error: null }),
    );

    const res = await GET(makeReq(), makeParams(VALID_UUID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(VALID_UUID);
    expect(body.title).toBe("Senior Engineer");
    expect(body.interview_stages).toEqual([]);
  });

  it("returns 500 on unexpected query error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockFrom.mockImplementation(() =>
      chainBuilder({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      }),
    );

    const res = await GET(makeReq(), makeParams(VALID_UUID));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to load playbook");
  });
});
