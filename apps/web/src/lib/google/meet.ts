import { getValidGoogleToken } from "./client";

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
  const response = await fetch(
    `${MEET_API}/conferenceRecords?filter=${filter}&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meet API error: ${response.status} ${body}`);
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
 * Fetch all transcript entries for a conference record.
 * First finds the transcript, then paginates through all entries.
 * Returns structured entries + assembled plainText.
 */
export async function getTranscriptEntries(
  conferenceRecordName: string,
): Promise<TranscriptResult> {
  const token = await getValidGoogleToken();

  // Step 1: Get the first transcript for this conference record
  const transcriptsResponse = await fetch(
    `${MEET_API}/${conferenceRecordName}/transcripts?pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!transcriptsResponse.ok) {
    const body = await transcriptsResponse.text();
    throw new Error(`Meet Transcripts API error: ${transcriptsResponse.status} ${body}`);
  }

  const transcriptsData = (await transcriptsResponse.json()) as {
    transcripts?: Array<{ name: string }>;
  };

  if (!transcriptsData.transcripts || transcriptsData.transcripts.length === 0) {
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

    const entriesResponse = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!entriesResponse.ok) {
      const body = await entriesResponse.text();
      throw new Error(
        `Meet Transcript Entries API error: ${entriesResponse.status} ${body}`,
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

  return {
    entries: allEntries,
    plainText,
    transcriptName,
  };
}
