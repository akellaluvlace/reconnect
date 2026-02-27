import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockGetValidGoogleToken } = vi.hoisted(() => ({
  mockGetValidGoogleToken: vi.fn(),
}));

vi.mock("@/lib/google/client", () => ({
  getValidGoogleToken: mockGetValidGoogleToken,
}));

import {
  getConferenceRecord,
  getTranscriptEntries,
} from "@/lib/google/meet";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = "ya29.test-access-token";
const originalFetch = globalThis.fetch;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Google Meet API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
    mockGetValidGoogleToken.mockResolvedValue(VALID_TOKEN);
  });

  // -----------------------------------------------------------------------
  // getConferenceRecord
  // -----------------------------------------------------------------------

  describe("getConferenceRecord", () => {
    it("finds record by meeting code and returns name string", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            conferenceRecords: [
              { name: "conferenceRecords/abc123" },
            ],
          }),
      }) as typeof fetch;

      const result = await getConferenceRecord("abc-defg-hij");

      expect(result).toBe("conferenceRecords/abc123");

      // Verify correct URL with filter
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain("meet.googleapis.com/v2/conferenceRecords");
      expect(url).toContain("pageSize=1");
      // Filter should contain the meeting code
      expect(decodeURIComponent(url)).toContain(
        'space.meeting_code="abc-defg-hij"',
      );

      // Verify auth header
      expect(fetchCall[1].headers.Authorization).toBe(
        `Bearer ${VALID_TOKEN}`,
      );
    });

    it("returns null when no records found", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }) as typeof fetch;

      const result = await getConferenceRecord("no-such-meeting");

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // getTranscriptEntries
  // -----------------------------------------------------------------------

  describe("getTranscriptEntries", () => {
    it("fetches transcript + entries and returns structured data + plainText", async () => {
      // Two fetch calls: first for transcripts list, then for entries
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          // First call: list transcripts
          ok: true,
          json: () =>
            Promise.resolve({
              transcripts: [
                { name: "conferenceRecords/abc123/transcripts/t1" },
              ],
            }),
        })
        .mockResolvedValueOnce({
          // Second call: list entries (single page, no nextPageToken)
          ok: true,
          json: () =>
            Promise.resolve({
              transcriptEntries: [
                {
                  participant: "participants/p1",
                  text: "Hello, welcome to the interview.",
                  startTime: "2026-03-01T10:00:05Z",
                  endTime: "2026-03-01T10:00:10Z",
                  languageCode: "en",
                },
                {
                  participant: "participants/p2",
                  text: "Thank you for having me.",
                  startTime: "2026-03-01T10:00:12Z",
                  endTime: "2026-03-01T10:00:16Z",
                  languageCode: "en",
                },
              ],
            }),
        }) as typeof fetch;

      const result = await getTranscriptEntries("conferenceRecords/abc123");

      expect(result.transcriptName).toBe(
        "conferenceRecords/abc123/transcripts/t1",
      );
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].participant).toBe("participants/p1");
      expect(result.entries[0].text).toBe(
        "Hello, welcome to the interview.",
      );
      expect(result.entries[1].text).toBe("Thank you for having me.");
      expect(result.plainText).toBe(
        "Hello, welcome to the interview.\nThank you for having me.",
      );

      // Verify first fetch (transcripts list)
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toContain(
        "conferenceRecords/abc123/transcripts?pageSize=1",
      );
      // Verify second fetch (entries)
      expect(calls[1][0]).toContain(
        "conferenceRecords/abc123/transcripts/t1/entries",
      );
    });

    it("returns empty when no transcripts exist", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }) as typeof fetch;

      const result = await getTranscriptEntries("conferenceRecords/abc123");

      expect(result.entries).toEqual([]);
      expect(result.plainText).toBe("");
      expect(result.transcriptName).toBeNull();
    });
  });
});
