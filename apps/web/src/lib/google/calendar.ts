import { getValidGoogleToken } from "./client";
import { randomUUID } from "crypto";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface CreateMeetEventParams {
  title: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  interviewerEmail: string;
  candidateEmail?: string;
  description?: string;
}

export interface MeetEventResult {
  meetLink: string;
  meetingCode: string;
  calendarEventId: string;
  htmlLink: string;
}

/**
 * Create a Google Calendar event with an auto-generated Meet video link.
 * Uses the platform Google account (Rec+onnect shared workspace).
 * The interviewer is added as an attendee (co-host in Meet).
 */
export async function createMeetEvent(
  params: CreateMeetEventParams,
): Promise<MeetEventResult> {
  const token = await getValidGoogleToken();

  const attendees: Array<{ email: string }> = [
    { email: params.interviewerEmail },
  ];
  if (params.candidateEmail) {
    attendees.push({ email: params.candidateEmail });
  }

  const eventBody = {
    summary: params.title,
    description: params.description ?? "",
    start: { dateTime: params.startTime, timeZone: "UTC" },
    end: { dateTime: params.endTime, timeZone: "UTC" },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const response = await fetch(
    `${CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Calendar API error: ${response.status} ${body}`);
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

  return {
    meetLink: videoEntry.uri,
    meetingCode,
    calendarEventId: event.id,
    htmlLink: event.htmlLink,
  };
}
