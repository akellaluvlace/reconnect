import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockServiceFrom,
  mockGetBot,
  mockFetchTranscript,
  mockTranscriptToPlainText,
  mockTracePipeline,
  mockSvixVerify,
} = vi.hoisted(() => ({
  mockServiceFrom: vi.fn(),
  mockGetBot: vi.fn(),
  mockFetchTranscript: vi.fn(),
  mockTranscriptToPlainText: vi.fn(),
  mockTracePipeline: vi.fn(),
  mockSvixVerify: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({ from: mockServiceFrom })),
}));

vi.mock("@/lib/recall/client", () => ({
  getBot: mockGetBot,
  fetchTranscript: mockFetchTranscript,
  transcriptToPlainText: mockTranscriptToPlainText,
}));

vi.mock("@/lib/google/pipeline-tracer", () => ({
  tracePipeline: mockTracePipeline,
}));

vi.mock("svix", () => ({
  Webhook: vi.fn().mockImplementation(() => ({
    verify: mockSvixVerify,
  })),
}));

// Set env before importing route
process.env.RECALL_WEBHOOK_SECRET = "whsec_test123";

import { POST } from "@/app/api/webhooks/recall/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWebhookRequest(payload: unknown): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/recall", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      "svix-id": "msg_test123",
      "svix-timestamp": "1679000000",
      "svix-signature": "v1,valid_signature",
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  ["select", "insert", "update", "upsert", "eq", "single", "limit"].forEach(
    (m) => {
      builder[m] = vi.fn().mockReturnValue(builder);
    },
  );
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

const BOT_DONE_PAYLOAD = {
  event: "bot.done",
  data: {
    data: { code: "done", sub_code: null, updated_at: "2026-04-01T11:00:00Z" },
    bot: { id: "bot-uuid-abc", metadata: { interview_id: "int-1" } },
  },
};

const BOT_FATAL_PAYLOAD = {
  event: "bot.fatal",
  data: {
    data: {
      code: "fatal",
      sub_code: "meeting_not_found",
      updated_at: "2026-04-01T10:05:00Z",
    },
    bot: { id: "bot-uuid-abc", metadata: { interview_id: "int-1" } },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/recall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTracePipeline.mockResolvedValue(undefined);
  });

  it("returns 400 on invalid signature", async () => {
    mockSvixVerify.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeWebhookRequest(BOT_DONE_PAYLOAD));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid signature");
  });

  it("returns 200 and processes bot.done → fetches transcript", async () => {
    mockSvixVerify.mockReturnValue(BOT_DONE_PAYLOAD);

    // Interview found
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        return chainBuilder({
          data: {
            id: "int-1",
            recording_status: "scheduled",
            recall_bot_id: "bot-uuid-abc",
          },
          error: null,
        });
      }
      if (table === "interview_transcripts") {
        return chainBuilder({ data: null, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    mockGetBot.mockResolvedValue({
      id: "bot-uuid-abc",
      metadata: { interview_id: "int-1" },
      transcriptDownloadUrl: "https://recall.ai/download?token=abc",
    });

    mockFetchTranscript.mockResolvedValue([
      {
        participant: { id: 1, name: "Robert", is_host: true, platform: "desktop", extra_data: null },
        words: [{ text: "Hello", start_timestamp: { relative: 0 }, end_timestamp: { relative: 1 } }],
      },
    ]);

    mockTranscriptToPlainText.mockReturnValue("Robert: Hello, tell me about your experience with distributed systems and cloud architecture at your previous company.");

    const res = await POST(makeWebhookRequest(BOT_DONE_PAYLOAD));
    expect(res.status).toBe(200);

    // Verify transcript was fetched
    expect(mockGetBot).toHaveBeenCalledWith("bot-uuid-abc");
    expect(mockFetchTranscript).toHaveBeenCalledWith("https://recall.ai/download?token=abc");
    expect(mockTranscriptToPlainText).toHaveBeenCalled();

    // Verify DB operations
    expect(mockServiceFrom).toHaveBeenCalledWith("interview_transcripts");
    expect(mockServiceFrom).toHaveBeenCalledWith("interviews");

    // Verify trace
    expect(mockTracePipeline).toHaveBeenCalledWith(
      "int-1",
      expect.objectContaining({
        to: "transcribed",
      }),
    );
  });

  it("skips processing when interview already transcribed", async () => {
    mockSvixVerify.mockReturnValue(BOT_DONE_PAYLOAD);

    mockServiceFrom.mockImplementation(() =>
      chainBuilder({
        data: {
          id: "int-1",
          recording_status: "transcribed",
          recall_bot_id: "bot-uuid-abc",
        },
        error: null,
      }),
    );

    const res = await POST(makeWebhookRequest(BOT_DONE_PAYLOAD));
    expect(res.status).toBe(200);

    // Should NOT attempt to fetch transcript
    expect(mockGetBot).not.toHaveBeenCalled();
    expect(mockFetchTranscript).not.toHaveBeenCalled();
  });

  it("handles bot.done with no transcript URL → marks failed", async () => {
    mockSvixVerify.mockReturnValue(BOT_DONE_PAYLOAD);

    mockServiceFrom.mockImplementation(() =>
      chainBuilder({
        data: {
          id: "int-1",
          recording_status: "pending",
          recall_bot_id: "bot-uuid-abc",
        },
        error: null,
      }),
    );

    mockGetBot.mockResolvedValue({
      id: "bot-uuid-abc",
      metadata: {},
      transcriptDownloadUrl: null,
    });

    const res = await POST(makeWebhookRequest(BOT_DONE_PAYLOAD));
    expect(res.status).toBe(200);

    // Should trace failed_transcription
    expect(mockTracePipeline).toHaveBeenCalledWith(
      "int-1",
      expect.objectContaining({
        to: "failed_transcription",
      }),
    );
  });

  it("handles bot.fatal → transitions to failed_recording", async () => {
    mockSvixVerify.mockReturnValue(BOT_FATAL_PAYLOAD);

    mockServiceFrom.mockImplementation(() =>
      chainBuilder({
        data: {
          id: "int-1",
          recording_status: "scheduled",
          recall_bot_id: "bot-uuid-abc",
        },
        error: null,
      }),
    );

    const res = await POST(makeWebhookRequest(BOT_FATAL_PAYLOAD));
    expect(res.status).toBe(200);

    // Should trace transition to failed_recording
    expect(mockTracePipeline).toHaveBeenCalledWith(
      "int-1",
      expect.objectContaining({
        from: "scheduled",
        to: "failed_recording",
        detail: expect.stringContaining("meeting_not_found"),
      }),
    );
  });

  it("handles recording_permission_denied → marks no_consent", async () => {
    const permDeniedPayload = {
      event: "bot.recording_permission_denied",
      data: {
        data: {
          code: "recording_permission_denied",
          sub_code: null,
          updated_at: "2026-04-01T10:02:00Z",
        },
        bot: { id: "bot-uuid-abc", metadata: {} },
      },
    };

    mockSvixVerify.mockReturnValue(permDeniedPayload);

    mockServiceFrom.mockImplementation(() =>
      chainBuilder({
        data: {
          id: "int-1",
          recording_status: "scheduled",
          recall_bot_id: "bot-uuid-abc",
        },
        error: null,
      }),
    );

    const res = await POST(makeWebhookRequest(permDeniedPayload));
    expect(res.status).toBe(200);

    expect(mockTracePipeline).toHaveBeenCalledWith(
      "int-1",
      expect.objectContaining({
        to: "no_consent",
      }),
    );
  });

  it("returns 200 with received:true when no interview found for bot", async () => {
    mockSvixVerify.mockReturnValue(BOT_DONE_PAYLOAD);

    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: null, error: null }),
    );

    const res = await POST(makeWebhookRequest(BOT_DONE_PAYLOAD));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);

    // Should not attempt any processing
    expect(mockGetBot).not.toHaveBeenCalled();
  });
});
