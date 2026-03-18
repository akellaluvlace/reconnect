import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Save original env
const originalEnv = { ...process.env };

describe("recall/client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.RECALL_API_KEY = "test-recall-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("isRecallConfigured", () => {
    it("returns true when RECALL_API_KEY is set", async () => {
      const { isRecallConfigured } = await import("@/lib/recall/client");
      expect(isRecallConfigured()).toBe(true);
    });

    it("returns false when RECALL_API_KEY is not set", async () => {
      delete process.env.RECALL_API_KEY;
      const { isRecallConfigured } = await import("@/lib/recall/client");
      expect(isRecallConfigured()).toBe(false);
    });
  });

  describe("scheduleBot", () => {
    it("sends correct request and returns bot ID", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "bot-uuid-123" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { scheduleBot } = await import("@/lib/recall/client");
      const result = await scheduleBot({
        meetUrl: "https://meet.google.com/abc-defg-hij",
        joinAt: "2026-04-01T10:00:00Z",
        interviewId: "interview-uuid-1",
      });

      expect(result.botId).toBe("bot-uuid-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://eu-central-1.recall.ai/api/v1/bot/",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Token test-recall-key",
          }),
        }),
      );

      // Verify body
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.meeting_url).toBe("https://meet.google.com/abc-defg-hij");
      expect(body.join_at).toBe("2026-04-01T10:00:00Z");
      expect(body.bot_name).toBe("Axil Recorder");
      expect(body.metadata.interview_id).toBe("interview-uuid-1");
      expect(body.recording_config.transcript.provider.meeting_captions).toEqual({});
    });

    it("throws when API returns error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Bad request"),
        }),
      );

      const { scheduleBot } = await import("@/lib/recall/client");
      await expect(
        scheduleBot({
          meetUrl: "https://meet.google.com/abc",
          joinAt: "2026-04-01T10:00:00Z",
          interviewId: "int-1",
        }),
      ).rejects.toThrow("scheduleBot failed: 400");
    });

    it("throws when RECALL_API_KEY is missing", async () => {
      delete process.env.RECALL_API_KEY;
      const { scheduleBot } = await import("@/lib/recall/client");
      await expect(
        scheduleBot({
          meetUrl: "https://meet.google.com/abc",
          joinAt: "2026-04-01T10:00:00Z",
          interviewId: "int-1",
        }),
      ).rejects.toThrow("RECALL_API_KEY not configured");
    });
  });

  describe("cancelBot", () => {
    it("sends DELETE request and succeeds on 204", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
      vi.stubGlobal("fetch", mockFetch);

      const { cancelBot } = await import("@/lib/recall/client");
      await cancelBot("bot-uuid-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://eu-central-1.recall.ai/api/v1/bot/bot-uuid-123/",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("succeeds silently on 404 (already deleted)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 404 }),
      );

      const { cancelBot } = await import("@/lib/recall/client");
      await expect(cancelBot("bot-gone")).resolves.toBeUndefined();
    });

    it("succeeds silently on 409 (already in call)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 409 }),
      );

      const { cancelBot } = await import("@/lib/recall/client");
      await expect(cancelBot("bot-in-call")).resolves.toBeUndefined();
    });
  });

  describe("getBot", () => {
    it("returns bot with transcript download URL", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "bot-1",
              metadata: { interview_id: "int-1" },
              recordings: [
                {
                  id: "rec-1",
                  media_shortcuts: {
                    transcript: {
                      data: {
                        download_url: "https://eu-central-1.recall.ai/download/tx?token=abc",
                      },
                    },
                  },
                },
              ],
            }),
        }),
      );

      const { getBot } = await import("@/lib/recall/client");
      const bot = await getBot("bot-1");

      expect(bot.id).toBe("bot-1");
      expect(bot.transcriptDownloadUrl).toBe(
        "https://eu-central-1.recall.ai/download/tx?token=abc",
      );
    });

    it("returns null download URL when no recordings", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "bot-2",
              metadata: {},
              recordings: [],
            }),
        }),
      );

      const { getBot } = await import("@/lib/recall/client");
      const bot = await getBot("bot-2");
      expect(bot.transcriptDownloadUrl).toBeNull();
    });
  });

  describe("transcriptToPlainText", () => {
    it("formats Recall.ai transcript entries into plain text", async () => {
      const { transcriptToPlainText } = await import("@/lib/recall/client");
      const entries = [
        {
          participant: {
            id: 1,
            name: "Robert Coffey",
            is_host: true,
            platform: "desktop",
            extra_data: null,
          },
          words: [
            {
              text: "Tell me about your experience.",
              start_timestamp: { relative: 0.5, absolute: "2026-04-01T10:00:00.500Z" },
              end_timestamp: { relative: 3.2, absolute: "2026-04-01T10:00:03.200Z" },
            },
          ],
        },
        {
          participant: {
            id: 2,
            name: "Jane Doe",
            is_host: false,
            platform: "desktop",
            extra_data: null,
          },
          words: [
            {
              text: "I have five years",
              start_timestamp: { relative: 3.5, absolute: "2026-04-01T10:00:03.500Z" },
              end_timestamp: { relative: 5.0, absolute: "2026-04-01T10:00:05.000Z" },
            },
            {
              text: "of engineering experience.",
              start_timestamp: { relative: 5.0, absolute: "2026-04-01T10:00:05.000Z" },
              end_timestamp: { relative: 7.2, absolute: "2026-04-01T10:00:07.200Z" },
            },
          ],
        },
      ];

      const result = transcriptToPlainText(entries);
      expect(result).toContain("Robert Coffey: Tell me about your experience.");
      expect(result).toContain(
        "Jane Doe: I have five years of engineering experience.",
      );
    });

    it("handles empty transcript", async () => {
      const { transcriptToPlainText } = await import("@/lib/recall/client");
      expect(transcriptToPlainText([])).toBe("");
    });
  });
});
