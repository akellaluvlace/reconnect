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
    toString: () => "b".repeat(64),
  }),
}));

import { GET, POST } from "@/app/api/share-links/route";
import { DELETE } from "@/app/api/share-links/[id]/route";

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
const PLAYBOOK_ID = "11111111-2222-4333-a444-555555555555";
const MOCK_LINK = {
  id: "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee",
  token: "b".repeat(64),
  playbook_id: PLAYBOOK_ID,
  is_active: true,
  view_count: 0,
  expires_at: "2026-03-20T00:00:00Z",
  created_by: "user-1",
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
  return new NextRequest("http://localhost/api/share-links", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDelete(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/share-links/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// GET /api/share-links
// ---------------------------------------------------------------------------

describe("GET /api/share-links", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await GET(
      makeGet(`http://localhost/api/share-links?playbook_id=${PLAYBOOK_ID}`),
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when playbook_id is missing", async () => {
    setupAuth();
    setupProfileAndTable("admin");

    const res = await GET(makeGet("http://localhost/api/share-links"));

    expect(res.status).toBe(400);
  });

  it("returns 200 with share links list", async () => {
    setupAuth();
    setupProfileAndTable("admin", [MOCK_LINK]);

    const res = await GET(
      makeGet(`http://localhost/api/share-links?playbook_id=${PLAYBOOK_ID}`),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([MOCK_LINK]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/share-links
// ---------------------------------------------------------------------------

describe("POST /api/share-links", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_BODY = { playbook_id: PLAYBOOK_ID };

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is interviewer", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(403);
  });

  it("returns 400 with invalid input", async () => {
    setupAuth();
    setupProfileAndTable("admin");

    const res = await POST(makePost({ playbook_id: "not-a-uuid" }));

    expect(res.status).toBe(400);
  });

  it("returns 201 with created share link", async () => {
    setupAuth();
    setupProfileAndTable("admin", MOCK_LINK);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toEqual(MOCK_LINK);
  });

  it("returns 201 with custom expiration", async () => {
    setupAuth();
    setupProfileAndTable("manager", MOCK_LINK);

    const res = await POST(
      makePost({ playbook_id: PLAYBOOK_ID, expires_in_days: 7 }),
    );

    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/share-links/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/share-links/[id]", () => {
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

  it("returns 200 on successful revocation (soft delete)", async () => {
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
