import { getValidGoogleToken } from "./client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { traceGoogleApi } from "./pipeline-tracer";
import { sanitizeErrorBody } from "./utils";
import { randomUUID } from "crypto";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

const CONSENT_NOTICE = `This interview will be recorded and transcribed for assessment purposes.
By joining this meeting, you consent to recording.
If you wish to opt out, please contact the hiring manager before the interview.`;

export interface CreateMeetEventParams {
  title: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  interviewerEmail: string;
  candidateEmail?: string;
  description?: string;
  calendarId?: string;
}

export interface MeetEventResult {
  meetLink: string;
  meetingCode: string;
  calendarEventId: string;
  htmlLink: string;
}

/**
 * Get or create the dedicated "Axil Interviews" secondary calendar.
 * Calendar ID is persisted in platform_google_config.interview_calendar_id.
 */
export async function getOrCreateInterviewCalendar(): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data: config } = await supabase
    .from("platform_google_config")
    .select("*")
    .limit(1)
    .single();

  const calId = config?.interview_calendar_id;
  if (calId) {
    return calId;
  }

  // Create the calendar
  const token = await getValidGoogleToken();
  const start = Date.now();
  const res = await fetch(`${CALENDAR_API}/calendars`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: "Axil Interviews",
      description:
        "Interview events managed by Axil platform. Do not modify manually.",
      timeZone: "Europe/Dublin",
    }),
  });
  traceGoogleApi("calendar", "POST calendars", res.status, Date.now() - start);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Failed to create interview calendar: ${res.status} ${sanitizeErrorBody(body)}`,
    );
  }

  const cal = await res.json();
  const calendarId = cal.id as string;

  const { error: persistError } = await supabase
    .from("platform_google_config")
    .update({ interview_calendar_id: calendarId })
    .not("id", "is", null); // update the single row

  if (persistError) {
    console.error("[calendar] Failed to persist interview_calendar_id:", persistError);
    throw new Error("Failed to save calendar configuration. Please retry.");
  }

  console.log(`[TRACE:calendar:created] calendarId=${calendarId}`);
  return calendarId;
}

/**
 * Create a Google Calendar event with an auto-generated Meet video link.
 * Uses the platform Google account (Axil shared workspace).
 * The interviewer is added as an attendee (co-host in Meet).
 * Recording consent notice is prepended to the description.
 */
export async function createMeetEvent(
  params: CreateMeetEventParams,
): Promise<MeetEventResult> {
  const token = await getValidGoogleToken();
  const calId = params.calendarId ?? "primary";

  const fullDescription = params.description
    ? `${CONSENT_NOTICE}\n\n---\n${params.description}`
    : CONSENT_NOTICE;

  const attendees: Array<{ email: string }> = [
    { email: params.interviewerEmail },
  ];
  if (params.candidateEmail) {
    attendees.push({ email: params.candidateEmail });
  }

  const eventBody = {
    summary: params.title,
    description: fullDescription,
    start: { dateTime: params.startTime, timeZone: "Europe/Dublin" },
    end: { dateTime: params.endTime, timeZone: "Europe/Dublin" },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const start = Date.now();
  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    },
  );
  traceGoogleApi(
    "calendar",
    "POST events",
    response.status,
    Date.now() - start,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Calendar API error: ${response.status} ${sanitizeErrorBody(body)}`);
  }

  const event = (await response.json()) as {
    id: string;
    htmlLink: string;
    conferenceData?: {
      conferenceId?: string;
      entryPoints?: Array<{
        entryPointType: string;
        uri: string;
      }>;
    };
  };

  // Find the video entry point — that's the Meet link
  const videoEntry = event.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video",
  );

  if (!videoEntry) {
    throw new Error("Calendar event created but no Meet link returned");
  }

  // Meeting code can come from conferenceId or parsed from the URL
  // URL format: https://meet.google.com/abc-defg-hij
  const meetingCode =
    event.conferenceData?.conferenceId ??
    videoEntry.uri.split("/").pop() ??
    "";

  if (!meetingCode) {
    throw new Error("Calendar event created but no meeting code could be extracted");
  }

  console.log(
    `[TRACE:calendar:create] eventId=${event.id} meetLink=${videoEntry.uri} attendees=${attendees.length}`,
  );

  return {
    meetLink: videoEntry.uri,
    meetingCode,
    calendarEventId: event.id,
    htmlLink: event.htmlLink,
  };
}

/**
 * Update a Calendar event (e.g. reschedule).
 * Google auto-sends updated invites to attendees.
 */
export async function updateCalendarEvent(
  calendarId: string,
  eventId: string,
  params: { startTime?: string; endTime?: string; description?: string },
): Promise<void> {
  const token = await getValidGoogleToken();
  const body: Record<string, unknown> = {};
  if (params.startTime)
    body.start = { dateTime: params.startTime, timeZone: "Europe/Dublin" };
  if (params.endTime)
    body.end = { dateTime: params.endTime, timeZone: "Europe/Dublin" };
  if (params.description)
    body.description = `${CONSENT_NOTICE}\n\n---\n${params.description}`;

  const start = Date.now();
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  traceGoogleApi(
    "calendar",
    "PATCH events",
    res.status,
    Date.now() - start,
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Calendar event update failed: ${res.status} ${sanitizeErrorBody(errBody)}`);
  }
  console.log(
    `[TRACE:calendar:update] calendarId=${calendarId} eventId=${eventId}`,
  );
}

/**
 * Delete a Calendar event (cancel interview).
 * Google auto-sends cancellation to attendees.
 */
export async function deleteCalendarEvent(
  calendarId: string,
  eventId: string,
): Promise<void> {
  const token = await getValidGoogleToken();
  const start = Date.now();
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  traceGoogleApi(
    "calendar",
    "DELETE events",
    res.status,
    Date.now() - start,
  );

  // 410 Gone is ok (already deleted)
  if (!res.ok && res.status !== 410) {
    const errBody = await res.text();
    throw new Error(`Calendar event delete failed: ${res.status} ${sanitizeErrorBody(errBody)}`);
  }
  console.log(
    `[TRACE:calendar:delete] calendarId=${calendarId} eventId=${eventId}`,
  );
}
