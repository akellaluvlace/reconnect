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
import { POST } from "@/app/api/playbooks/route";

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

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/playbooks", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const CREATED_PLAYBOOK = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  title: "Senior Engineer",
  department: "Engineering",
  status: "draft",
  organization_id: "org-1",
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Setup helpers for common scenarios
// ---------------------------------------------------------------------------

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupProfile(
  role: string,
  organization_id: string | null = "org-1",
  profileError: { message: string } | null = null,
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: profileError ? null : { role, organization_id },
        error: profileError,
      });
    }
    // playbooks table — return created playbook
    return chainBuilder({ data: CREATED_PLAYBOOK, error: null });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/playbooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated (user is null)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await POST(makePost({ title: "Test Playbook" }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user role is 'interviewer'", async () => {
    setupAuth();
    setupProfile("interviewer");

    const res = await POST(makePost({ title: "Test Playbook" }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 when title is missing", async () => {
    setupAuth();
    // Profile setup not needed — validation happens before profile fetch in
    // the POST route, so mockFrom just needs to not throw.
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await POST(makePost({ department: "Engineering" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 when title exceeds 200 characters", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const longTitle = "A".repeat(201);
    const res = await POST(makePost({ title: longTitle }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("returns 400 on invalid JSON body", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    // Send a request whose body is intentionally not valid JSON
    const req = new NextRequest("http://localhost/api/playbooks", {
      method: "POST",
      body: "{ this is not valid json !!!",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 200 with created playbook on success (admin)", async () => {
    setupAuth();
    setupProfile("admin");

    const res = await POST(makePost({ title: "Senior Engineer" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(body.title).toBe("Senior Engineer");
    expect(body.status).toBe("draft");
  });

  it("returns 200 with created playbook on success (manager)", async () => {
    setupAuth();
    setupProfile("manager");

    const res = await POST(makePost({ title: "Senior Engineer" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });

  it("returns 403 when user has no organization_id", async () => {
    setupAuth();
    setupProfile("admin", null);

    const res = await POST(makePost({ title: "Senior Engineer" }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("User has no organization");
  });
});
