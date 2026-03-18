import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockFrom,
  mockServiceFrom,
  mockTracePipeline,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockServiceFrom: vi.fn(),
  mockTracePipeline: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({ from: mockServiceFrom })),
}));

vi.mock("@/lib/google/pipeline-tracer", () => ({
  tracePipeline: mockTracePipeline,
}));

import { POST } from "@/app/api/interviews/[id]/no-consent/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "admin@axil.ie" };
const VALID_ID = "11111111-1111-1111-1111-111111111111";

function makeRequest(id: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/interviews/${id}/no-consent`,
    { method: "POST" },
  );
}

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
    "not",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

function setupAdminAuth() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({ data: { role: "admin" }, error: null });
    }
    // RLS ownership check — interview exists within user's org
    if (table === "interviews") {
      return chainBuilder({ data: { id: VALID_ID }, error: null });
    }
    return chainBuilder({ data: null, error: null });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/interviews/[id]/no-consent", () => {
  beforeEach(() => vi.clearAllMocks());

  // --- Auth Tests ---

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No session" },
    });
    const res = await POST(makeRequest(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for interviewer role", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "interviewer" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });
    const res = await POST(makeRequest(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(403);
  });

  // --- Input Validation ---

  it("returns 400 for invalid UUID", async () => {
    setupAdminAuth();
    const res = await POST(makeRequest("not-a-uuid"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid ID");
  });

  // --- IDOR Protection ---

  it("returns 404 when interview not in user's org (IDOR protection)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      // RLS check returns null — interview belongs to different org
      if (table === "interviews") {
        return chainBuilder({ data: null, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makeRequest(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(404);
    expect(mockServiceFrom).not.toHaveBeenCalled();
  });

  // --- State Machine Tests ---

  it("returns 404 when interview not found", async () => {
    setupAdminAuth();
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: { message: "not found" } }),
    );
    const res = await POST(makeRequest(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when interview is already transcribed (invalid state transition)", async () => {
    setupAdminAuth();
    // Optimistic lock fails — .in("recording_status", ["scheduled","pending"]) returns nothing
    // because the interview is already in "transcribed" state
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );
    const res = await POST(makeRequest(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("cannot be marked no-consent");
  });

  it("succeeds for scheduled interview", async () => {
    setupAdminAuth();
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({
        data: {
          id: VALID_ID,
          recording_status: "no_consent",
          status: "scheduled",
        },
        error: null,
      }),
    );
    const res = await POST(makeRequest(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.recording_status).toBe("no_consent");
  });

  it("traces the correct state transition", async () => {
    setupAdminAuth();
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({
        data: {
          id: VALID_ID,
          recording_status: "no_consent",
        },
        error: null,
      }),
    );
    await POST(makeRequest(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(mockTracePipeline).toHaveBeenCalledWith(VALID_ID, {
      from: "scheduled/pending",
      to: "no_consent",
      detail: expect.stringContaining("no-consent"),
    });
  });

  // --- Edge Cases ---

  it("returns 400 for empty string ID", async () => {
    setupAdminAuth();
    const res = await POST(makeRequest(""), {
      params: Promise.resolve({ id: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for UUID-like but invalid format", async () => {
    setupAdminAuth();
    const res = await POST(makeRequest("11111111-1111-1111-1111-11111111111g"), {
      params: Promise.resolve({ id: "11111111-1111-1111-1111-11111111111g" }),
    });
    expect(res.status).toBe(400);
  });
});
