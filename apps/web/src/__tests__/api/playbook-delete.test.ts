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
import { DELETE } from "@/app/api/playbooks/[id]/route";

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

function makeDeleteReq(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/playbooks/${id}`, {
    method: "DELETE",
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupFromWithProfile(
  role: string,
  playbookResult: { data: unknown; error: unknown },
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({ data: { role }, error: null });
    }
    return chainBuilder(playbookResult);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DELETE /api/playbooks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await DELETE(makeDeleteReq(VALID_UUID), makeParams(VALID_UUID));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user role is 'manager' (only admin can delete)", async () => {
    setupAuth();
    setupFromWithProfile("manager", {
      data: { id: VALID_UUID },
      error: null,
    });

    const res = await DELETE(makeDeleteReq(VALID_UUID), makeParams(VALID_UUID));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 on invalid UUID", async () => {
    // UUID regex check is the very first operation in the DELETE handler.
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await DELETE(
      makeDeleteReq(INVALID_UUID),
      makeParams(INVALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid playbook ID");
  });

  it("returns 404 when playbook is not found (PGRST116)", async () => {
    setupAuth();
    setupFromWithProfile("admin", {
      data: null,
      error: { code: "PGRST116", message: "The result contains 0 rows" },
    });

    const res = await DELETE(makeDeleteReq(VALID_UUID), makeParams(VALID_UUID));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Playbook not found");
  });

  it("returns 200 with { success: true } on success (admin)", async () => {
    setupAuth();
    setupFromWithProfile("admin", {
      data: { id: VALID_UUID },
      error: null,
    });

    const res = await DELETE(makeDeleteReq(VALID_UUID), makeParams(VALID_UUID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });
});
