import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockGetValidGoogleToken, mockRandomUUID } = vi.hoisted(() => ({
  mockGetValidGoogleToken: vi.fn(),
  mockRandomUUID: vi.fn(),
}));

vi.mock("@/lib/google/client", () => ({
  getValidGoogleToken: mockGetValidGoogleToken,
}));

vi.mock("crypto", () => ({
  randomUUID: mockRandomUUID,
}));

import { createMeetEvent } from "@/lib/google/calendar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = "ya29.test-access-token";
const FIXED_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeCalendarResponse(overrides?: Record<string, unknown>) {
  return {
    id: "evt_abc123",
    htmlLink: "https://calendar.google.com/event?eid=abc123",
    conferenceData: {
      conferenceId: "abc-defg-hij",
      entryPoints: [
        {
          entryPointType: "video",
          uri: "https://meet.google.com/abc-defg-hij",
        },
      ],
    },
    ...overrides,
  };
}

const originalFetch = globalThis.fetch;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Google Calendar — createMeetEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
    mockGetValidGoogleToken.mockResolvedValue(VALID_TOKEN);
    mockRandomUUID.mockReturnValue(FIXED_UUID);
  });

  it("creates calendar event with Meet conferenceData and returns result", async () => {
    const calendarResponse = makeCalendarResponse();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(calendarResponse),
    }) as typeof fetch;

    const result = await createMeetEvent({
      title: "Engineering Interview",
      startTime: "2026-03-01T10:00:00Z",
      endTime: "2026-03-01T11:00:00Z",
      interviewerEmail: "interviewer@axil.ie",
      candidateEmail: "candidate@example.com",
      description: "Technical round",
    });

    // Verify returned fields
    expect(result.meetLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(result.meetingCode).toBe("abc-defg-hij");
    expect(result.calendarEventId).toBe("evt_abc123");
    expect(result.htmlLink).toBe(
      "https://calendar.google.com/event?eid=abc123",
    );

    // Verify fetch was called correctly
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: `Bearer ${VALID_TOKEN}`,
          "Content-Type": "application/json",
        },
      }),
    );

    // Verify body payload
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.summary).toBe("Engineering Interview");
    expect(body.description).toBe("Technical round");
    expect(body.start.dateTime).toBe("2026-03-01T10:00:00Z");
    expect(body.end.dateTime).toBe("2026-03-01T11:00:00Z");
    expect(body.attendees).toEqual([
      { email: "interviewer@axil.ie" },
      { email: "candidate@example.com" },
    ]);
    expect(body.conferenceData.createRequest.requestId).toBe(FIXED_UUID);
    expect(
      body.conferenceData.createRequest.conferenceSolutionKey.type,
    ).toBe("hangoutsMeet");
  });

  it("throws on Calendar API error (403)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    }) as typeof fetch;

    await expect(
      createMeetEvent({
        title: "Interview",
        startTime: "2026-03-01T10:00:00Z",
        endTime: "2026-03-01T11:00:00Z",
        interviewerEmail: "interviewer@axil.ie",
      }),
    ).rejects.toThrow("Calendar API error: 403 Forbidden");
  });

  it("throws when no Meet link in response (missing entryPoints)", async () => {
    const noMeetResponse = makeCalendarResponse({
      conferenceData: { entryPoints: [] },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(noMeetResponse),
    }) as typeof fetch;

    await expect(
      createMeetEvent({
        title: "Interview",
        startTime: "2026-03-01T10:00:00Z",
        endTime: "2026-03-01T11:00:00Z",
        interviewerEmail: "interviewer@axil.ie",
      }),
    ).rejects.toThrow("Calendar event created but no Meet link returned");
  });
});
