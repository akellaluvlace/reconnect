import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted ensures these are available when vi.mock factory runs
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
import { GET } from "@/app/api/playbooks/role-suggestions/route";

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
    "ilike",
    "gt",
    "gte",
    "lt",
    "lte",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // Thenable for queries that don't use .single()
  builder.then = (resolve: (value: { data: unknown; error: unknown }) => void) => resolve(resolvedValue);
  return builder;
}

function makeGet(query: string, industry?: string): NextRequest {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (industry) params.set("industry", industry);
  return new NextRequest(
    `http://localhost/api/playbooks/role-suggestions?${params.toString()}`,
    { method: "GET" },
  );
}

const MOCK_USER = { id: "user-1", email: "test@example.com" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/playbooks/role-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(makeGet("software"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when auth returns an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "JWT expired" },
    });

    const res = await GET(makeGet("software"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns empty suggestions for empty query", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const res = await GET(makeGet(""));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toEqual([]);
  });

  it("returns empty suggestions for single-character query", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const res = await GET(makeGet("s"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toEqual([]);
  });

  it("returns matching roles from cache", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        return chainBuilder({
          data: [
            { search_params: { role: "Senior Software Engineer", level: "senior", industry: "Technology" } },
            { search_params: { role: "Software Developer", level: "mid", industry: "Technology" } },
          ],
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: [],
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(makeGet("software"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(2);
    expect(body.suggestions[0]).toEqual({
      role: "Senior Software Engineer",
      cached: true,
    });
    expect(body.suggestions[1]).toEqual({
      role: "Software Developer",
      cached: true,
    });
  });

  it("returns matching roles from playbooks", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        return chainBuilder({
          data: [],
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: [
            { title: "Data Engineer" },
            { title: "Data Analyst" },
          ],
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(makeGet("data"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(2);
    expect(body.suggestions[0]).toEqual({ role: "Data Engineer", cached: false });
    expect(body.suggestions[1]).toEqual({ role: "Data Analyst", cached: false });
  });

  it("deduplicates roles across cache and playbooks (case-insensitive)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        return chainBuilder({
          data: [
            { search_params: { role: "Senior Software Engineer" } },
          ],
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: [
            { title: "senior software engineer" },
            { title: "Junior Software Engineer" },
          ],
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(makeGet("software"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(2);
    // Cache entry comes first with cached: true
    expect(body.suggestions[0]).toEqual({
      role: "Senior Software Engineer",
      cached: true,
    });
    // Playbook entry that wasn't a duplicate
    expect(body.suggestions[1]).toEqual({
      role: "Junior Software Engineer",
      cached: false,
    });
  });

  it("deduplicates within cache results", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        return chainBuilder({
          data: [
            { search_params: { role: "Software Engineer" } },
            { search_params: { role: "software engineer" } },
            { search_params: { role: "Software Engineer" } },
          ],
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: [],
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(makeGet("software"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(1);
    expect(body.suggestions[0]).toEqual({
      role: "Software Engineer",
      cached: true,
    });
  });

  it("returns 403 when user has no organization", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: null },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(makeGet("software"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("User organization not found");
  });

  it("handles cache query errors gracefully", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        return chainBuilder({
          data: null,
          error: { message: "connection refused" },
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: [{ title: "Product Manager" }],
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(makeGet("product"));

    // Should still return results from playbooks even if cache fails
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(1);
    expect(body.suggestions[0]).toEqual({
      role: "Product Manager",
      cached: false,
    });
  });

  it("limits results to 8", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const cacheRoles = Array.from({ length: 6 }, (_, i) => ({
      search_params: { role: `Engineer ${i + 1}` },
    }));

    const playbookRoles = Array.from({ length: 6 }, (_, i) => ({
      title: `Developer ${i + 1}`,
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        return chainBuilder({
          data: cacheRoles,
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: playbookRoles,
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(makeGet("en"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions.length).toBeLessThanOrEqual(8);
  });

  it("skips cache entries with invalid search_params", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "ai_research_cache") {
        return chainBuilder({
          data: [
            { search_params: null },
            { search_params: "not-an-object" },
            { search_params: { role: 123 } },
            { search_params: { role: "Valid Role" } },
          ],
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: [],
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(makeGet("valid"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(1);
    expect(body.suggestions[0]).toEqual({ role: "Valid Role", cached: true });
  });
});
