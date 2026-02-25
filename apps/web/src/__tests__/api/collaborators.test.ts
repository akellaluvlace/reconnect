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

vi.mock("crypto", () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: () => "a".repeat(64),
  }),
}));

import { GET } from "@/app/api/collaborators/route";
import { POST } from "@/app/api/collaborators/invite/route";
import { DELETE } from "@/app/api/collaborators/[id]/route";

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
const MOCK_COLLABORATOR = {
  id: "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee",
  email: "collab@example.com",
  role: "interviewer",
  playbook_id: "11111111-2222-4333-a444-555555555555",
  invite_token: "a".repeat(64),
  expires_at: "2026-03-01T00:00:00Z",
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
      return chainBuilder({
        data: { role, organization_id: "org-1" },
        error: null,
      });
    }
    return chainBuilder({ data: tableData, error: tableError });
  });
}

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/collaborators/invite", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDelete(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/collaborators/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// GET /api/collaborators
// ---------------------------------------------------------------------------

describe("GET /api/collaborators", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await GET(
      makeGet("http://localhost/api/collaborators?playbook_id=11111111-2222-4333-a444-555555555555"),
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when playbook_id is missing", async () => {
    setupAuth();
    setupProfileAndTable("admin");

    const res = await GET(makeGet("http://localhost/api/collaborators"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("playbook_id");
  });

  it("returns 200 with collaborator list", async () => {
    setupAuth();
    setupProfileAndTable("admin", [MOCK_COLLABORATOR]);

    const res = await GET(
      makeGet("http://localhost/api/collaborators?playbook_id=11111111-2222-4333-a444-555555555555"),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([MOCK_COLLABORATOR]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/collaborators/invite
// ---------------------------------------------------------------------------

describe("POST /api/collaborators/invite", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_INVITE = {
    playbook_id: "11111111-2222-4333-a444-555555555555",
    email: "new@example.com",
    role: "interviewer",
  };

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await POST(makePost(VALID_INVITE));

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is interviewer (not admin/manager)", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await POST(makePost(VALID_INVITE));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 with invalid input", async () => {
    setupAuth();
    setupProfileAndTable("admin");

    const res = await POST(makePost({ email: "not-uuid" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("returns 201 with created collaborator on success", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { organization_id: "org-1", title: "Test Playbook" },
          error: null,
        });
      }
      return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
    });

    const res = await POST(makePost(VALID_INVITE));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.collaborator).toEqual(MOCK_COLLABORATOR);
  });

  it("returns 201 when manager invites", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "manager", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { organization_id: "org-1", title: "Test Playbook" },
          error: null,
        });
      }
      return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
    });

    const res = await POST(makePost(VALID_INVITE));

    expect(res.status).toBe(201);
  });

  it("returns 500 when DB insert fails", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { organization_id: "org-1", title: "Test Playbook" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: { message: "constraint violation" } });
    });

    const res = await POST(makePost(VALID_INVITE));

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/collaborators/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/collaborators/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_ID = "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee";

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 with invalid UUID", async () => {
    setupAuth();

    const res = await DELETE(makeDelete("not-a-uuid"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 403 when user is interviewer", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 200 on successful deletion", async () => {
    setupAuth();
    setupProfileAndTable("admin");

    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
