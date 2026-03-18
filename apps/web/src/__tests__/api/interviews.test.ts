import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockFrom,
  mockServiceFrom,
  mockGetOrCreateInterviewCalendar,
  mockCreateMeetEvent,
  mockDeleteCalendarEvent,
  mockTracePipeline,
  mockRequireGoogleEnv,
  mockScheduleBot,
  mockIsRecallConfigured,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockServiceFrom: vi.fn(),
  mockGetOrCreateInterviewCalendar: vi.fn(),
  mockCreateMeetEvent: vi.fn(),
  mockDeleteCalendarEvent: vi.fn(),
  mockTracePipeline: vi.fn(),
  mockRequireGoogleEnv: vi.fn(),
  mockScheduleBot: vi.fn(),
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
  getOrCreateInterviewCalendar: mockGetOrCreateInterviewCalendar,
  createMeetEvent: mockCreateMeetEvent,
  deleteCalendarEvent: mockDeleteCalendarEvent,
}));

vi.mock("@/lib/google/pipeline-tracer", () => ({
  tracePipeline: mockTracePipeline,
}));

vi.mock("@/lib/google/env", () => ({
  requireGoogleEnv: mockRequireGoogleEnv,
}));

vi.mock("@/lib/recall/client", () => ({
  scheduleBot: mockScheduleBot,
  isRecallConfigured: mockIsRecallConfigured,
}));

import { POST } from "@/app/api/interviews/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "admin@axil.ie" };
const PLAYBOOK_ID = "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5";

const VALID_BODY = {
  candidate_id: "a1111111-1111-4111-a111-111111111111",
  stage_id: "b2222222-2222-4222-a222-222222222222",
  interviewer_email: "interviewer@axil.ie",
  scheduled_at: "2026-04-01T10:00:00Z",
  duration_minutes: 60,
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/interviews", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
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

function setupDefaultMocks() {
  setupAuth();

  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: { role: "admin", organization_id: "org-1" },
        error: null,
      });
    }
    if (table === "candidates") {
      return chainBuilder({
        data: {
          id: VALID_BODY.candidate_id,
          name: "Jane Doe",
          email: "jane@example.com",
          playbook_id: PLAYBOOK_ID,
        },
        error: null,
      });
    }
    if (table === "interview_stages") {
      return chainBuilder({
        data: {
          id: VALID_BODY.stage_id,
          name: "Technical Round",
          playbook_id: PLAYBOOK_ID,
          duration_minutes: 60,
        },
        error: null,
      });
    }
    return chainBuilder({ data: null, error: null });
  });

  mockGetOrCreateInterviewCalendar.mockResolvedValue("cal-interview-123");
  mockCreateMeetEvent.mockResolvedValue({
    meetLink: "https://meet.google.com/abc-defg-hij",
    meetingCode: "abc-defg-hij",
    calendarEventId: "evt_abc123",
    htmlLink: "https://calendar.google.com/event?eid=abc123",
  });

  const insertedInterview = {
    id: "c3333333-3333-4333-a333-333333333333",
    candidate_id: VALID_BODY.candidate_id,
    stage_id: VALID_BODY.stage_id,
    status: "scheduled",
    recording_status: "scheduled",
    meet_link: "https://meet.google.com/abc-defg-hij",
  };

  mockServiceFrom.mockImplementation(() =>
    chainBuilder({ data: insertedInterview, error: null }),
  );

  mockTracePipeline.mockResolvedValue(undefined);
  mockIsRecallConfigured.mockReturnValue(false);
  mockScheduleBot.mockResolvedValue({ botId: "mock-bot-id" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/interviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks that may have been set to throw in previous tests
    mockRequireGoogleEnv.mockImplementation(() => {});
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No session" } });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 403 for interviewer role", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "interviewer", organization_id: "org-1" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid body", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost({ candidate_id: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 404 when candidate not found", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "candidates") {
        return chainBuilder({ data: null, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 400 when stage doesn't belong to candidate's playbook", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "candidates") {
        return chainBuilder({
          data: {
            id: VALID_BODY.candidate_id,
            name: "Jane",
            email: "jane@x.com",
            playbook_id: PLAYBOOK_ID,
          },
          error: null,
        });
      }
      if (table === "interview_stages") {
        return chainBuilder({
          data: {
            id: VALID_BODY.stage_id,
            name: "Technical",
            playbook_id: "different-playbook-id",
            duration_minutes: 60,
          },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(400);
  });

  it("returns 201 with interview data and meet link on success", async () => {
    setupDefaultMocks();

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.meetLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(body.data).toBeDefined();
    expect(body.data.status).toBe("scheduled");

    // Verify calendar was fetched
    expect(mockGetOrCreateInterviewCalendar).toHaveBeenCalledOnce();

    // Verify Meet event was created with correct params
    expect(mockCreateMeetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "cal-interview-123",
        interviewerEmail: "interviewer@axil.ie",
      }),
    );

    // Verify pipeline trace was called
    expect(mockTracePipeline).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        from: null,
        to: "scheduled",
      }),
    );
  });

  it("returns 500 and cleans up Calendar event when DB insert fails", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "candidates") {
        return chainBuilder({
          data: {
            id: VALID_BODY.candidate_id,
            name: "Jane Doe",
            email: "jane@example.com",
            playbook_id: PLAYBOOK_ID,
          },
          error: null,
        });
      }
      if (table === "interview_stages") {
        return chainBuilder({
          data: {
            id: VALID_BODY.stage_id,
            name: "Technical",
            playbook_id: PLAYBOOK_ID,
            duration_minutes: 60,
          },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    mockGetOrCreateInterviewCalendar.mockResolvedValue("cal-123");
    mockCreateMeetEvent.mockResolvedValue({
      meetLink: "https://meet.google.com/xyz",
      meetingCode: "xyz",
      calendarEventId: "evt_orphan",
      htmlLink: "https://cal.google.com/evt_orphan",
    });

    // DB insert fails
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({
        data: null,
        error: { message: "unique constraint violation", code: "23505" },
      }),
    );

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create interview");

    // Calendar event should have been cleaned up
    expect(mockDeleteCalendarEvent).toHaveBeenCalledWith(
      "cal-123",
      "evt_orphan",
    );
  });

  it("returns 500 when requireGoogleEnv throws", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "candidates") {
        return chainBuilder({
          data: {
            id: VALID_BODY.candidate_id,
            name: "Jane",
            email: "jane@x.com",
            playbook_id: PLAYBOOK_ID,
          },
          error: null,
        });
      }
      if (table === "interview_stages") {
        return chainBuilder({
          data: {
            id: VALID_BODY.stage_id,
            name: "Technical",
            playbook_id: PLAYBOOK_ID,
            duration_minutes: 60,
          },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    mockRequireGoogleEnv.mockImplementation(() => {
      throw new Error("Missing: GOOGLE_RECORDING_CLIENT_ID");
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);

    // Should NOT have attempted Calendar creation
    expect(mockGetOrCreateInterviewCalendar).not.toHaveBeenCalled();
    expect(mockCreateMeetEvent).not.toHaveBeenCalled();
  });

  it("schedules Recall.ai bot when configured", async () => {
    setupDefaultMocks();
    mockIsRecallConfigured.mockReturnValue(true);
    mockScheduleBot.mockResolvedValue({ botId: "recall-bot-123" });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);

    // Verify bot was scheduled
    expect(mockScheduleBot).toHaveBeenCalledWith(
      expect.objectContaining({
        meetUrl: "https://meet.google.com/abc-defg-hij",
        joinAt: VALID_BODY.scheduled_at,
      }),
    );

    // Verify bot ID was stored (update call on interviews)
    expect(mockServiceFrom).toHaveBeenCalledWith("interviews");
  });

  it("succeeds even when Recall.ai bot scheduling fails", async () => {
    setupDefaultMocks();
    mockIsRecallConfigured.mockReturnValue(true);
    mockScheduleBot.mockRejectedValue(new Error("Recall.ai API down"));

    const res = await POST(makePost(VALID_BODY));
    // Should still succeed — graceful degradation
    expect(res.status).toBe(201);
  });

  it("skips Recall.ai when not configured", async () => {
    setupDefaultMocks();
    mockIsRecallConfigured.mockReturnValue(false);

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);

    expect(mockScheduleBot).not.toHaveBeenCalled();
  });

  it("does not leak error details in response", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "candidates") {
        return chainBuilder({
          data: {
            id: VALID_BODY.candidate_id,
            name: "Jane",
            email: "jane@x.com",
            playbook_id: PLAYBOOK_ID,
          },
          error: null,
        });
      }
      if (table === "interview_stages") {
        return chainBuilder({
          data: {
            id: VALID_BODY.stage_id,
            name: "Technical",
            playbook_id: PLAYBOOK_ID,
            duration_minutes: 60,
          },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    mockGetOrCreateInterviewCalendar.mockRejectedValue(
      new Error("Calendar API error: 401 {\"error\":\"invalid_client\",\"error_description\":\"secret leaked\"}")
    );

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    // Should return generic error, NOT the raw Google API error
    expect(body.error).toBe("Internal server error");
    expect(body.error).not.toContain("secret");
    expect(body.error).not.toContain("invalid_client");
  });
});
