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
import { GET } from "@/app/api/playbooks/route";

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

const MOCK_USER = { id: "user-1", email: "test@example.com" };

const MOCK_PLAYBOOKS = [
  {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    title: "Senior Engineer",
    department: "Engineering",
    status: "draft",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/playbooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated (user is null)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when auth returns an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "JWT expired" },
    });

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 200 with playbooks list on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });
    mockFrom.mockImplementation((_table: string) =>
      chainBuilder({ data: MOCK_PLAYBOOKS, error: null }),
    );

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Senior Engineer");
  });

  it("returns 200 with empty array when no playbooks exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });
    mockFrom.mockImplementation((_table: string) =>
      chainBuilder({ data: [], error: null }),
    );

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("returns 500 when the database query fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });
    mockFrom.mockImplementation((_table: string) =>
      chainBuilder({ data: null, error: { message: "connection refused" } }),
    );

    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to load playbooks");
  });
});
