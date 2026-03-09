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
import { GET, POST } from "@/app/api/admin/cms/[table]/route";
import { PATCH, DELETE } from "@/app/api/admin/cms/[table]/[id]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chainBuilder(resolvedValue: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn> | ((resolve: (value: { data: unknown; error: unknown }) => void) => void)> = {};
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
  builder.then = (resolve: (value: { data: unknown; error: unknown }) => void) => resolve(resolvedValue);
  return builder;
}

const MOCK_USER = { id: "user-1", email: "admin@example.com" };
const MOCK_ORG_ID = "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee";
const VALID_ITEM_ID = "11111111-2222-4333-a444-555555555555";

const MOCK_SKILL = {
  id: VALID_ITEM_ID,
  name: "TypeScript",
  category: "Programming",
  is_active: true,
  organization_id: MOCK_ORG_ID,
  created_at: "2026-01-01T00:00:00Z",
};

function makeParams(table: string) {
  return { params: Promise.resolve({ table }) };
}

function makeIdParams(table: string, id: string) {
  return { params: Promise.resolve({ table, id }) };
}

function makeGet(table: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/cms/${table}`, {
    method: "GET",
  });
}

function makePost(table: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/admin/cms/${table}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makePatch(table: string, id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/admin/cms/${table}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDelete(table: string, id: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/cms/${table}/${id}`, {
    method: "DELETE",
  });
}

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

function setupFromWithProfile(
  role: string,
  orgId: string | null,
  cmsResult: { data: unknown; error: unknown },
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: { role, organization_id: orgId },
        error: null,
      });
    }
    return chainBuilder(cmsResult);
  });
}

// ---------------------------------------------------------------------------
// Tests — GET /api/admin/cms/[table]
// ---------------------------------------------------------------------------

describe("GET /api/admin/cms/[table]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid table slug", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await GET(makeGet("invalid-table"), makeParams("invalid-table"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid table");
  });

  it("returns 401 without auth", async () => {
    setupUnauth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await GET(makeGet("skills"), makeParams("skills"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin user (manager)", async () => {
    setupAuth();
    setupFromWithProfile("manager", MOCK_ORG_ID, { data: [], error: null });

    const res = await GET(makeGet("skills"), makeParams("skills"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 for non-admin user (interviewer)", async () => {
    setupAuth();
    setupFromWithProfile("interviewer", MOCK_ORG_ID, { data: [], error: null });

    const res = await GET(makeGet("skills"), makeParams("skills"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns items for admin user", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: [MOCK_SKILL],
      error: null,
    });

    const res = await GET(makeGet("skills"), makeParams("skills"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("TypeScript");
  });

  it("returns empty array when no items exist", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, { data: [], error: null });

    const res = await GET(makeGet("industries"), makeParams("industries"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("returns 500 when database query fails", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: null,
      error: { message: "connection refused" },
    });

    const res = await GET(makeGet("skills"), makeParams("skills"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to load items");
  });

  it("works with hyphenated table slugs", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, { data: [], error: null });

    const res = await GET(
      makeGet("stage-templates"),
      makeParams("stage-templates"),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /api/admin/cms/[table]
// ---------------------------------------------------------------------------

describe("POST /api/admin/cms/[table]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid table slug", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await POST(
      makePost("bogus", { name: "Test" }),
      makeParams("bogus"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid table");
  });

  it("returns 401 without auth", async () => {
    setupUnauth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await POST(
      makePost("skills", { name: "Test" }),
      makeParams("skills"),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid input (missing required field)", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: MOCK_SKILL,
      error: null,
    });

    // cms_skills requires name
    const res = await POST(
      makePost("skills", { category: "Programming" }),
      makeParams("skills"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 for invalid input (name too long)", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: MOCK_SKILL,
      error: null,
    });

    const longName = "A".repeat(201);
    const res = await POST(
      makePost("skills", { name: longName }),
      makeParams("skills"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("returns 403 for non-admin user", async () => {
    setupAuth();
    setupFromWithProfile("manager", MOCK_ORG_ID, {
      data: MOCK_SKILL,
      error: null,
    });

    const res = await POST(
      makePost("skills", { name: "TypeScript" }),
      makeParams("skills"),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("creates item for admin user", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: MOCK_SKILL,
      error: null,
    });

    const res = await POST(
      makePost("skills", { name: "TypeScript", category: "Programming" }),
      makeParams("skills"),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("TypeScript");
    expect(body.id).toBe(VALID_ITEM_ID);
  });

  it("returns 403 when admin has no organization", async () => {
    setupAuth();
    setupFromWithProfile("admin", null, { data: MOCK_SKILL, error: null });

    const res = await POST(
      makePost("skills", { name: "TypeScript" }),
      makeParams("skills"),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("User has no organization");
  });

  it("validates email template required fields", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: null,
      error: null,
    });

    // Missing template_type, subject, body_html
    const res = await POST(
      makePost("email-templates", { name: "Welcome" }),
      makeParams("email-templates"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("returns 500 when database insert fails", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: null,
      error: { message: "unique constraint violation" },
    });

    const res = await POST(
      makePost("skills", { name: "TypeScript" }),
      makeParams("skills"),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create item");
  });
});

// ---------------------------------------------------------------------------
// Tests — PATCH /api/admin/cms/[table]/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/cms/[table]/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid table slug", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await PATCH(
      makePatch("bogus", VALID_ITEM_ID, { name: "Updated" }),
      makeIdParams("bogus", VALID_ITEM_ID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid table");
  });

  it("returns 400 for invalid UUID", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await PATCH(
      makePatch("skills", "not-a-uuid", { name: "Updated" }),
      makeIdParams("skills", "not-a-uuid"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid ID");
  });

  it("returns 401 without auth", async () => {
    setupUnauth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await PATCH(
      makePatch("skills", VALID_ITEM_ID, { name: "Updated" }),
      makeIdParams("skills", VALID_ITEM_ID),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin user", async () => {
    setupAuth();
    setupFromWithProfile("manager", MOCK_ORG_ID, {
      data: null,
      error: null,
    });

    const res = await PATCH(
      makePatch("skills", VALID_ITEM_ID, { name: "Updated" }),
      makeIdParams("skills", VALID_ITEM_ID),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("updates item for admin user", async () => {
    setupAuth();
    const updatedSkill = { ...MOCK_SKILL, name: "Updated TypeScript" };
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: updatedSkill,
      error: null,
    });

    const res = await PATCH(
      makePatch("skills", VALID_ITEM_ID, { name: "Updated TypeScript" }),
      makeIdParams("skills", VALID_ITEM_ID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated TypeScript");
  });

  it("can soft-toggle is_active via PATCH", async () => {
    setupAuth();
    const deactivated = { ...MOCK_SKILL, is_active: false };
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: deactivated,
      error: null,
    });

    const res = await PATCH(
      makePatch("skills", VALID_ITEM_ID, { is_active: false }),
      makeIdParams("skills", VALID_ITEM_ID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_active).toBe(false);
  });

  it("returns 404 when item is not found (PGRST116)", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: null,
      error: { code: "PGRST116", message: "The result contains 0 rows" },
    });

    const res = await PATCH(
      makePatch("skills", VALID_ITEM_ID, { name: "Updated" }),
      makeIdParams("skills", VALID_ITEM_ID),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Item not found");
  });
});

// ---------------------------------------------------------------------------
// Tests — DELETE /api/admin/cms/[table]/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/admin/cms/[table]/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid table slug", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await DELETE(
      makeDelete("bogus", VALID_ITEM_ID),
      makeIdParams("bogus", VALID_ITEM_ID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid table");
  });

  it("returns 400 for invalid UUID", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await DELETE(
      makeDelete("skills", "not-a-uuid"),
      makeIdParams("skills", "not-a-uuid"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid ID");
  });

  it("returns 401 without auth", async () => {
    setupUnauth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await DELETE(
      makeDelete("skills", VALID_ITEM_ID),
      makeIdParams("skills", VALID_ITEM_ID),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin user", async () => {
    setupAuth();
    setupFromWithProfile("interviewer", MOCK_ORG_ID, {
      data: null,
      error: null,
    });

    const res = await DELETE(
      makeDelete("skills", VALID_ITEM_ID),
      makeIdParams("skills", VALID_ITEM_ID),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("soft-deletes item (sets is_active=false) and returns 204", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: null,
      error: null,
    });

    const res = await DELETE(
      makeDelete("skills", VALID_ITEM_ID),
      makeIdParams("skills", VALID_ITEM_ID),
    );

    expect(res.status).toBe(204);
  });

  it("returns 500 when database update fails", async () => {
    setupAuth();
    setupFromWithProfile("admin", MOCK_ORG_ID, {
      data: null,
      error: { message: "connection refused" },
    });

    const res = await DELETE(
      makeDelete("skills", VALID_ITEM_ID),
      makeIdParams("skills", VALID_ITEM_ID),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to delete item");
  });
});
