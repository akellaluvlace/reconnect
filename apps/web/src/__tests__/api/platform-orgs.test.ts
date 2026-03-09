import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockGetUser, mockServiceFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockServiceFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

vi.mock("@/lib/admin/platform-admin", () => ({
  isPlatformAdmin: vi.fn((email: string) => email === "admin@axil.ie"),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET as getOrgs, POST as postOrg } from "@/app/api/platform/orgs/route";
import {
  PATCH as patchOrg,
  DELETE as deleteOrg,
} from "@/app/api/platform/orgs/[id]/route";
import { GET as getUsers } from "@/app/api/platform/users/route";
import { GET as getStats } from "@/app/api/platform/stats/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chainBuilder(resolvedValue: { data: unknown; error: unknown }) {
  const builder: Record<
    string,
    | ReturnType<typeof vi.fn>
    | ((resolve: (value: { data: unknown; error: unknown }) => void) => void)
  > = {};
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
    "or",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  builder.then = (
    resolve: (value: { data: unknown; error: unknown }) => void,
  ) => resolve(resolvedValue);
  return builder;
}

/**
 * Chain builder that resolves with a `count` property (for head:true queries).
 */
function countBuilder(count: number | null, error: unknown = null) {
  const builder: Record<
    string,
    | ReturnType<typeof vi.fn>
    | ((
        resolve: (value: {
          data: unknown;
          error: unknown;
          count: number | null;
        }) => void,
      ) => void)
  > = {};
  ["select", "eq", "neq", "order", "limit", "is", "in", "match", "filter", "or"].forEach(
    (m) => {
      builder[m] = vi.fn().mockReturnValue(builder);
    },
  );
  builder.single = vi.fn().mockResolvedValue({ data: null, error, count });
  builder.then = (
    resolve: (value: {
      data: unknown;
      error: unknown;
      count: number | null;
    }) => void,
  ) => resolve({ data: null, error, count });
  return builder;
}

const VALID_UUID = "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee";
const INVALID_UUID = "not-a-uuid";

const ADMIN_USER = { id: "user-admin", email: "admin@axil.ie" };
const NORMAL_USER = { id: "user-normal", email: "user@example.com" };

const MOCK_ORGS = [
  { id: "org-1", name: "Acme Corp", created_at: "2026-01-01T00:00:00Z" },
  { id: "org-2", name: "Beta Ltd", created_at: "2026-01-02T00:00:00Z" },
];

const MOCK_USERS_BY_ORG = [
  { organization_id: "org-1" },
  { organization_id: "org-1" },
  { organization_id: "org-2" },
];

function makeReq(
  url: string,
  method = "GET",
  body?: Record<string, unknown>,
) {
  const init: { method: string; body?: string; headers?: Record<string, string> } = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(`http://localhost${url}`, init);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Tests — Platform Orgs
// ---------------------------------------------------------------------------

describe("GET /api/platform/orgs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await getOrgs(makeReq("/api/platform/orgs"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-platform-admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: NORMAL_USER },
      error: null,
    });

    const res = await getOrgs(makeReq("/api/platform/orgs"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns org list with user counts for platform admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    // First call: organizations query, second call: users count query
    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainBuilder({ data: MOCK_ORGS, error: null });
      }
      return chainBuilder({ data: MOCK_USERS_BY_ORG, error: null });
    });

    const res = await getOrgs(makeReq("/api/platform/orgs"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Acme Corp");
    expect(body[0].user_count).toBe(2);
    expect(body[1].name).toBe("Beta Ltd");
    expect(body[1].user_count).toBe(1);
  });

  it("returns empty array when no orgs exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: [], error: null }),
    );

    const res = await getOrgs(makeReq("/api/platform/orgs"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/platform/orgs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await postOrg(
      makeReq("/api/platform/orgs", "POST", { name: "New Org" }),
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-platform-admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: NORMAL_USER },
      error: null,
    });

    const res = await postOrg(
      makeReq("/api/platform/orgs", "POST", { name: "New Org" }),
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid input (empty name)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    const res = await postOrg(
      makeReq("/api/platform/orgs", "POST", { name: "" }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("returns 400 for missing name field", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    const res = await postOrg(
      makeReq("/api/platform/orgs", "POST", {}),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("creates org for platform admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    const createdOrg = {
      id: "org-new",
      name: "New Org",
      created_at: "2026-03-08T00:00:00Z",
    };
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: createdOrg, error: null }),
    );

    const res = await postOrg(
      makeReq("/api/platform/orgs", "POST", { name: "New Org" }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("New Org");
    expect(body.id).toBe("org-new");
  });
});

// ---------------------------------------------------------------------------
// Tests — Platform Orgs [id]
// ---------------------------------------------------------------------------

describe("PATCH /api/platform/orgs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid UUID", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    const res = await patchOrg(
      makeReq("/api/platform/orgs/bad-id", "PATCH", { name: "Updated" }),
      makeParams(INVALID_UUID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid organization ID");
  });

  it("returns 401 without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await patchOrg(
      makeReq("/api/platform/orgs/x", "PATCH", { name: "Updated" }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-platform-admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: NORMAL_USER },
      error: null,
    });

    const res = await patchOrg(
      makeReq("/api/platform/orgs/x", "PATCH", { name: "Updated" }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(403);
  });

  it("updates org for platform admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    const updatedOrg = {
      id: VALID_UUID,
      name: "Updated Name",
      created_at: "2026-01-01T00:00:00Z",
    };
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: updatedOrg, error: null }),
    );

    const res = await patchOrg(
      makeReq("/api/platform/orgs/x", "PATCH", { name: "Updated Name" }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Name");
  });

  it("returns 404 when org not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    mockServiceFrom.mockImplementation(() =>
      chainBuilder({
        data: null,
        error: { code: "PGRST116", message: "The result contains 0 rows" },
      }),
    );

    const res = await patchOrg(
      makeReq("/api/platform/orgs/x", "PATCH", { name: "Updated" }),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Organization not found");
  });
});

describe("DELETE /api/platform/orgs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 501 not implemented for platform admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    const res = await deleteOrg(
      makeReq("/api/platform/orgs/x", "DELETE"),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.error).toContain("Not implemented");
  });

  it("returns 401 without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await deleteOrg(
      makeReq("/api/platform/orgs/x", "DELETE"),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-platform-admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: NORMAL_USER },
      error: null,
    });

    const res = await deleteOrg(
      makeReq("/api/platform/orgs/x", "DELETE"),
      makeParams(VALID_UUID),
    );

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Tests — Platform Users
// ---------------------------------------------------------------------------

describe("GET /api/platform/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await getUsers(makeReq("/api/platform/users"));

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-platform-admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: NORMAL_USER },
      error: null,
    });

    const res = await getUsers(makeReq("/api/platform/users"));

    expect(res.status).toBe(403);
  });

  it("returns user list for platform admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    const mockUsers = [
      {
        id: "u-1",
        email: "alice@example.com",
        name: "Alice",
        role: "admin",
        organization_id: "org-1",
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "u-2",
        email: "bob@example.com",
        name: "Bob",
        role: "interviewer",
        organization_id: "org-1",
        created_at: "2026-01-02T00:00:00Z",
      },
    ];
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: mockUsers, error: null }),
    );

    const res = await getUsers(makeReq("/api/platform/users"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].email).toBe("alice@example.com");
  });

  it("returns 400 for invalid org_id filter", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    const res = await getUsers(
      makeReq("/api/platform/users?org_id=bad-uuid"),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid org_id format");
  });

  it("filters by org_id when provided", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    const mockUsers = [
      {
        id: "u-1",
        email: "alice@example.com",
        name: "Alice",
        role: "admin",
        organization_id: VALID_UUID,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: mockUsers, error: null }),
    );

    const res = await getUsers(
      makeReq(`/api/platform/users?org_id=${VALID_UUID}`),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Tests — Platform Stats
// ---------------------------------------------------------------------------

describe("GET /api/platform/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await getStats(makeReq("/api/platform/stats"));

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-platform-admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: NORMAL_USER },
      error: null,
    });

    const res = await getStats(makeReq("/api/platform/stats"));

    expect(res.status).toBe(403);
  });

  it("returns counts for platform admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: ADMIN_USER },
      error: null,
    });

    mockServiceFrom.mockImplementation(() =>
      countBuilder(5, null),
    );

    const res = await getStats(makeReq("/api/platform/stats"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("total_orgs");
    expect(body).toHaveProperty("total_users");
    expect(body).toHaveProperty("total_playbooks");
    // All three queries use the same mock, so all return 5
    expect(body.total_orgs).toBe(5);
    expect(body.total_users).toBe(5);
    expect(body.total_playbooks).toBe(5);
  });
});
