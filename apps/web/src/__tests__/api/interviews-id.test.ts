import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockFrom,
  mockServiceFrom,
  mockUpdateCalendarEvent,
  mockDeleteCalendarEvent,
  mockTracePipeline,
  mockScheduleBot,
  mockCancelBot,
  mockIsRecallConfigured,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockServiceFrom: vi.fn(),
  mockUpdateCalendarEvent: vi.fn(),
  mockDeleteCalendarEvent: vi.fn(),
  mockTracePipeline: vi.fn(),
  mockScheduleBot: vi.fn(),
  mockCancelBot: vi.fn(),
  mockIsRecallConfigured: vi.fn(),
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

vi.mock("@/lib/google", () => ({
  updateCalendarEvent: mockUpdateCalendarEvent,
  deleteCalendarEvent: mockDeleteCalendarEvent,
}));

vi.mock("@/lib/google/pipeline-tracer", () => ({
  tracePipeline: mockTracePipeline,
}));

vi.mock("@/lib/recall/client", () => ({
  scheduleBot: mockScheduleBot,
  cancelBot: mockCancelBot,
  isRecallConfigured: mockIsRecallConfigured,
}));

import { PATCH, DELETE } from "@/app/api/interviews/[id]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "admin@axil.ie" };
const VALID_ID = "11111111-1111-1111-1111-111111111111";

function makePatch(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/interviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDelete(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/interviews/${id}`, {
    method: "DELETE",
  });
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

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupAdminAuth() {
  setupAuth();
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: { role: "admin" },
        error: null,
      });
    }
    // RLS ownership check — interview exists within user's org
    if (table === "interviews") {
      return chainBuilder({
        data: { id: VALID_ID },
        error: null,
      });
    }
    return chainBuilder({ data: null, error: null });
  });
}

// ---------------------------------------------------------------------------
// PATCH Tests
// ---------------------------------------------------------------------------

describe("PATCH /api/interviews/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No session" },
    });
    const res = await PATCH(makePatch(VALID_ID, { scheduled_at: "2026-04-01T10:00:00Z" }), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    setupAdminAuth();
    const res = await PATCH(makePatch("not-a-uuid", {}), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when interview not in user's org (IDOR protection)", async () => {
    setupAuth();
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

    const res = await PATCH(
      makePatch(VALID_ID, { scheduled_at: "2026-04-01T10:00:00Z" }),
      { params: Promise.resolve({ id: VALID_ID }) },
    );
    expect(res.status).toBe(404);
    // Should NOT have called service-role at all
    expect(mockServiceFrom).not.toHaveBeenCalled();
  });

  it("returns 400 when no fields to update", async () => {
    setupAdminAuth();
    const res = await PATCH(makePatch(VALID_ID, {}), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No fields to update");
  });

  it("returns 404 when interview not found", async () => {
    setupAdminAuth();
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await PATCH(
      makePatch(VALID_ID, { scheduled_at: "2026-04-01T10:00:00Z" }),
      { params: Promise.resolve({ id: VALID_ID }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 and reschedules with Calendar update", async () => {
    setupAdminAuth();
    mockUpdateCalendarEvent.mockResolvedValue(undefined);
    mockTracePipeline.mockResolvedValue(undefined);

    const interviewData = {
      id: VALID_ID,
      calendar_event_id: "evt_abc",
      scheduled_at: "2026-03-15T10:00:00Z",
    };
    const updatedData = {
      ...interviewData,
      scheduled_at: "2026-04-01T10:00:00Z",
    };

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        callCount++;
        if (callCount === 1) {
          // First call: select existing
          return chainBuilder({ data: interviewData, error: null });
        }
        if (callCount === 2) {
          // Second call: get config for calendar
          return chainBuilder({ data: null, error: null });
        }
        // Third call: update
        return chainBuilder({ data: updatedData, error: null });
      }
      if (table === "platform_google_config") {
        return chainBuilder({
          data: { interview_calendar_id: "cal-123" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await PATCH(
      makePatch(VALID_ID, { scheduled_at: "2026-04-01T10:00:00Z" }),
      { params: Promise.resolve({ id: VALID_ID }) },
    );
    expect(res.status).toBe(200);
    expect(mockUpdateCalendarEvent).toHaveBeenCalled();
    expect(mockTracePipeline).toHaveBeenCalled();
  });

  it("returns 503 when interview_calendar_id is not configured", async () => {
    setupAdminAuth();

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        callCount++;
        if (callCount === 1) {
          return chainBuilder({
            data: {
              id: VALID_ID,
              calendar_event_id: "evt_abc",
              scheduled_at: "2026-03-15T10:00:00Z",
            },
            error: null,
          });
        }
        return chainBuilder({ data: {}, error: null });
      }
      if (table === "platform_google_config") {
        // No interview_calendar_id configured
        return chainBuilder({
          data: { interview_calendar_id: null },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await PATCH(
      makePatch(VALID_ID, { scheduled_at: "2026-04-01T10:00:00Z" }),
      { params: Promise.resolve({ id: VALID_ID }) },
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Calendar integration not configured");
  });
});

// ---------------------------------------------------------------------------
// DELETE Tests
// ---------------------------------------------------------------------------

describe("DELETE /api/interviews/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No session" },
    });
    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when interview not found", async () => {
    setupAdminAuth();
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when interview not in user's org (IDOR protection)", async () => {
    setupAuth();
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

    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(404);
    expect(mockServiceFrom).not.toHaveBeenCalled();
  });

  it("deletes scheduled interview and removes Calendar event", async () => {
    setupAdminAuth();
    mockDeleteCalendarEvent.mockResolvedValue(undefined);

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        callCount++;
        if (callCount === 1) {
          return chainBuilder({
            data: { id: VALID_ID, status: "scheduled", calendar_event_id: "evt_abc", recall_bot_id: null },
            error: null,
          });
        }
        // delete call
        return chainBuilder({ data: null, error: null });
      }
      if (table === "platform_google_config") {
        return chainBuilder({
          data: { interview_calendar_id: "cal-123" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockDeleteCalendarEvent).toHaveBeenCalled();
  });

  it("deletes cancelled interview without touching Calendar", async () => {
    setupAdminAuth();

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        callCount++;
        if (callCount === 1) {
          return chainBuilder({
            data: { id: VALID_ID, status: "cancelled", calendar_event_id: "evt_abc", recall_bot_id: null },
            error: null,
          });
        }
        // delete call
        return chainBuilder({ data: null, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(200);
    expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
  });

  it("deletes completed interview", async () => {
    setupAdminAuth();

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        callCount++;
        if (callCount === 1) {
          return chainBuilder({
            data: { id: VALID_ID, status: "completed", calendar_event_id: null, recall_bot_id: null },
            error: null,
          });
        }
        return chainBuilder({ data: null, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 500 when hard delete fails", async () => {
    setupAdminAuth();

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        callCount++;
        if (callCount === 1) {
          return chainBuilder({
            data: { id: VALID_ID, status: "scheduled", calendar_event_id: null, recall_bot_id: null },
            error: null,
          });
        }
        // delete call — fails
        return chainBuilder({
          data: null,
          error: { message: "connection timeout" },
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await DELETE(makeDelete(VALID_ID), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(500);
  });
});
