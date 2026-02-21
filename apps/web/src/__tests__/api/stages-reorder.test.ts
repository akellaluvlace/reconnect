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

// Import route handler AFTER mocks are set up
import { POST } from "@/app/api/playbooks/[id]/stages/reorder/route";

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
  // The reorder route destructures `{ error }` directly from the awaited
  // builder (no .single() call), so .then must resolve with the value.
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

const VALID_UUID = "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee";
const STAGE_UUID_1 = "11111111-2222-4333-a444-555555555555";
const STAGE_UUID_2 = "22222222-3333-4444-a555-666666666666";
const INVALID_UUID = "not-a-uuid";
const MOCK_USER = { id: "user-1", email: "test@example.com" };

// A minimal valid reorder payload with two stages.
const VALID_REORDER_BODY = {
  stages: [
    { id: STAGE_UUID_1, order_index: 0 },
    { id: STAGE_UUID_2, order_index: 1 },
  ],
};

function makePost(id: string, body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost/api/playbooks/${id}/stages/reorder`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
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

describe("POST /api/playbooks/[id]/stages/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupUnauth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await POST(
      makePost(VALID_UUID, VALID_REORDER_BODY),
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
      makePost(VALID_UUID, VALID_REORDER_BODY),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 on invalid playbook UUID", async () => {
    // UUID check is the very first thing in the handler.
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await POST(
      makePost(INVALID_UUID, VALID_REORDER_BODY),
      makeParams(INVALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid playbook ID");
  });

  it("returns 400 on invalid input (missing stages array)", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    // Sending an object without the required `stages` key fails Zod
    const res = await POST(
      makePost(VALID_UUID, {}),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 when stages array exceeds 20 items", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    // Build 21 valid stage entries — all UUIDs must be valid hex
    const oversizedStages = Array.from({ length: 21 }, (_, i) => ({
      // Pad i to produce a valid UUID-shaped hex string
      id: `${String(i + 1).padStart(8, "0")}-2222-3333-4444-555555555555`,
      order_index: i,
    }));

    const res = await POST(
      makePost(VALID_UUID, { stages: oversizedStages }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 200 with { success: true } on successful reorder", async () => {
    setupAuth();
    // The route calls update once per stage in the array. Each call resolves
    // with no error. mockFrom is called for "users" first, then once per stage
    // for "interview_stages".
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(
      makePost(VALID_UUID, VALID_REORDER_BODY),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it("returns 207 when some stage updates fail", async () => {
    setupAuth();
    // Track how many times "interview_stages" update is called so we can
    // fail only the second stage update.
    let stageUpdateCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      // interview_stages table
      stageUpdateCount++;
      if (stageUpdateCount === 2) {
        // Second stage update fails
        return chainBuilder({
          data: null,
          error: { message: "update failed" },
        });
      }
      // First (and any further) stage updates succeed
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(
      makePost(VALID_UUID, VALID_REORDER_BODY),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.error).toBe("Some stages failed to reorder");
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details).toHaveLength(1);
    expect(body.details[0].id).toBe(STAGE_UUID_2);
    expect(body.details[0].error).toBe("Update failed");
  });
});
