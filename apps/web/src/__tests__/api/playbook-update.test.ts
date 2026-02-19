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
import { PATCH } from "@/app/api/playbooks/[id]/route";

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

const UPDATED_PLAYBOOK = {
  id: VALID_UUID,
  title: "Updated Title",
  department: "Engineering",
  status: "draft",
  organization_id: "org-1",
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

function makePatch(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/playbooks/${id}`, {
    method: "PATCH",
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

describe("PATCH /api/playbooks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await PATCH(
      makePatch(VALID_UUID, { title: "Updated" }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user role is 'interviewer'", async () => {
    setupAuth();
    setupFromWithProfile("interviewer", { data: UPDATED_PLAYBOOK, error: null });

    const res = await PATCH(
      makePatch(VALID_UUID, { title: "Updated" }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 on invalid UUID", async () => {
    // UUID check is the very first thing in the PATCH handler.
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await PATCH(
      makePatch(INVALID_UUID, { title: "Updated" }),
      makeParams(INVALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid playbook ID");
  });

  it("returns 400 on invalid input (empty title string)", async () => {
    setupAuth();
    setupFromWithProfile("admin", { data: UPDATED_PLAYBOOK, error: null });

    // title: "" violates the min(1) rule in updatePlaybookSchema
    const res = await PATCH(
      makePatch(VALID_UUID, { title: "" }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 404 when playbook is not found (PGRST116)", async () => {
    setupAuth();
    setupFromWithProfile("admin", {
      data: null,
      error: { code: "PGRST116", message: "The result contains 0 rows" },
    });

    const res = await PATCH(
      makePatch(VALID_UUID, { title: "Updated Title" }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Playbook not found");
  });

  it("returns 200 with updated playbook on success (partial update - title only)", async () => {
    setupAuth();
    setupFromWithProfile("admin", { data: UPDATED_PLAYBOOK, error: null });

    const res = await PATCH(
      makePatch(VALID_UUID, { title: "Updated Title" }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(VALID_UUID);
    expect(body.title).toBe("Updated Title");
  });

  it("returns 200 when updating hiring_strategy JSONB field", async () => {
    const playbookWithStrategy = {
      ...UPDATED_PLAYBOOK,
      hiring_strategy: {
        approach: "Technical",
        key_criteria: ["Go experience", "distributed systems"],
      },
    };

    setupAuth();
    setupFromWithProfile("manager", {
      data: playbookWithStrategy,
      error: null,
    });

    const res = await PATCH(
      makePatch(VALID_UUID, {
        hiring_strategy: {
          approach: "Technical",
          key_criteria: ["Go experience", "distributed systems"],
        },
      }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(VALID_UUID);
    expect(body.hiring_strategy).toMatchObject({ approach: "Technical" });
  });
});
