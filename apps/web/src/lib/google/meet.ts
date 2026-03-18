import { getValidGoogleToken } from "./client";
import { traceGoogleApi } from "./pipeline-tracer";
import { sanitizeErrorBody } from "./utils";

const MEET_API = "https://meet.googleapis.com/v2";

export interface TranscriptEntry {
  participant: string;
  text: string;
  startTime: string;
  endTime: string;
  languageCode?: string;
}

export interface TranscriptResult {
  entries: TranscriptEntry[];
  plainText: string;
  transcriptName: string | null;
}

/**
 * Look up the conference record for a meeting code.
 * Returns the conference record name (e.g. "conferenceRecords/abc123") or null.
 */
export async function getConferenceRecord(
  meetingCode: string,
): Promise<string | null> {
  const token = await getValidGoogleToken();

  const filter = encodeURIComponent(`space.meeting_code="${meetingCode}"`);
  const start = Date.now();
  const response = await fetch(
    `${MEET_API}/conferenceRecords?filter=${filter}&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  traceGoogleApi(
    "meet",
    "GET conferenceRecords",
    response.status,
    Date.now() - start,
    { meetingCode },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meet API error: ${response.status} ${sanitizeErrorBody(body)}`);
  }

  const data = (await response.json()) as {
    conferenceRecords?: Array<{ name: string }>;
  };

  if (!data.conferenceRecords || data.conferenceRecords.length === 0) {
    return null;
  }

  return data.conferenceRecords[0].name;
}

/**
 * Get the Google Docs document ID for a meeting's transcript.
 * Returns null if no transcript exists yet.
 */
export async function getTranscriptDocId(
  conferenceRecordName: string,
): Promise<string | null> {
  const token = await getValidGoogleToken();

  const start = Date.now();
  const res = await fetch(
    `${MEET_API}/${conferenceRecordName}/transcripts?pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  traceGoogleApi(
    "meet",
    "GET transcripts",
    res.status,
    Date.now() - start,
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    const body = await res.text();
    throw new Error(`Meet transcripts list failed: ${res.status} ${sanitizeErrorBody(body)}`);
  }

  const data = (await res.json()) as {
    transcripts?: Array<{
      name: string;
      docsDestination?: { document?: string };
    }>;
  };

  const transcript = data.transcripts?.[0];
  if (!transcript) return null;

  const docId = transcript.docsDestination?.document ?? null;
  console.log(
    `[TRACE:meet:transcript-doc] conference=${conferenceRecordName} docId=${docId ?? "none"}`,
  );
  return docId;
}

/**
 * Resolve a participant resource name to a display name.
 * participant format: "conferenceRecords/abc/participants/xyz"
 */
export async function getParticipantName(
  participantResourceName: string,
): Promise<string> {
  const token = await getValidGoogleToken();

  const start = Date.now();
  const res = await fetch(`${MEET_API}/${participantResourceName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  traceGoogleApi(
    "meet",
    "GET participant",
    res.status,
    Date.now() - start,
  );

  if (!res.ok) {
    console.warn(
      `[GOOGLE:meet] participant lookup failed: ${res.status} for ${participantResourceName}`,
    );
    return "Unknown Speaker";
  }

  const data = (await res.json()) as {
    signedinUser?: { displayName?: string };
    anonymousUser?: { displayName?: string };
  };

  return (
    data.signedinUser?.displayName ??
    data.anonymousUser?.displayName ??
    "Unknown Speaker"
  );
}

/**
 * Fetch all transcript entries for a conference record.
 * First finds the transcript, then paginates through all entries.
 * Returns structured entries + assembled plainText.
 */
export async function getTranscriptEntries(
  conferenceRecordName: string,
): Promise<TranscriptResult> {
  const token = await getValidGoogleToken();

  // Step 1: Get the first transcript for this conference record
  const tStart = Date.now();
  const transcriptsResponse = await fetch(
    `${MEET_API}/${conferenceRecordName}/transcripts?pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  traceGoogleApi(
    "meet",
    "GET transcripts",
    transcriptsResponse.status,
    Date.now() - tStart,
  );

  if (!transcriptsResponse.ok) {
    const body = await transcriptsResponse.text();
    throw new Error(
      `Meet Transcripts API error: ${transcriptsResponse.status} ${sanitizeErrorBody(body)}`,
    );
  }

  const transcriptsData = (await transcriptsResponse.json()) as {
    transcripts?: Array<{ name: string }>;
  };

  if (
    !transcriptsData.transcripts ||
    transcriptsData.transcripts.length === 0
  ) {
    return { entries: [], plainText: "", transcriptName: null };
  }

  const transcriptName = transcriptsData.transcripts[0].name;

  // Step 2: Paginate through all transcript entries
  const allEntries: TranscriptEntry[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${MEET_API}/${transcriptName}/entries`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const eStart = Date.now();
    const entriesResponse = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    traceGoogleApi(
      "meet",
      "GET transcriptEntries",
      entriesResponse.status,
      Date.now() - eStart,
      { page: allEntries.length },
    );

    if (!entriesResponse.ok) {
      const body = await entriesResponse.text();
      throw new Error(
        `Meet Transcript Entries API error: ${entriesResponse.status} ${sanitizeErrorBody(body)}`,
      );
    }

    const entriesData = (await entriesResponse.json()) as {
      transcriptEntries?: Array<{
        participant: string;
        text: string;
        startTime: string;
        endTime: string;
        languageCode?: string;
      }>;
      nextPageToken?: string;
    };

    if (entriesData.transcriptEntries) {
      for (const entry of entriesData.transcriptEntries) {
        allEntries.push({
          participant: entry.participant,
          text: entry.text,
          startTime: entry.startTime,
          endTime: entry.endTime,
          languageCode: entry.languageCode,
        });
      }
    }

    pageToken = entriesData.nextPageToken;
  } while (pageToken);

  const plainText = allEntries.map((e) => e.text).join("\n");

  console.log(
    `[TRACE:meet:entries] conference=${conferenceRecordName} entries=${allEntries.length} chars=${plainText.length}`,
  );

  return {
    entries: allEntries,
    plainText,
    transcriptName,
  };
}
