import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom, mockTranscribeAudio, mockServiceFrom } =
  vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
    mockTranscribeAudio: vi.fn(),
    mockServiceFrom: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: mockServiceFrom,
  }),
}));

vi.mock("@/lib/openai/client", () => ({
  transcribeAudio: mockTranscribeAudio,
}));

import { POST } from "@/app/api/transcription/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "order",
    "limit",
    "is",
    "in",
    "match",
    "filter",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

const MOCK_USER = { id: "user-1", email: "test@example.com" };
const INTERVIEW_ID = "11111111-2222-4333-a444-555555555555";

const VALID_BODY = {
  interview_id: INTERVIEW_ID,
  recording_url: "https://vfufxduwywrnwbjtwdjz.supabase.co/storage/v1/object/recordings/recording.m4a",
};

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupDBs() {
  mockFrom.mockReturnValue(chainBuilder({ data: null, error: null }));
  mockServiceFrom.mockReturnValue(chainBuilder({ data: null, error: null }));
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/transcription", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// Mock global fetch for audio download
const originalFetch = globalThis.fetch;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/transcription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(401);
  });

  it("returns 400 with invalid interview_id", async () => {
    setupAuth();

    const res = await POST(
      makePost({ interview_id: "not-uuid", recording_url: "https://x.com/f" }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("returns 400 with invalid recording_url", async () => {
    setupAuth();

    const res = await POST(
      makePost({ interview_id: INTERVIEW_ID, recording_url: "not-a-url" }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when recording_url is from disallowed host", async () => {
    setupAuth();

    const res = await POST(
      makePost({
        interview_id: INTERVIEW_ID,
        recording_url: "https://evil.example.com/recording.m4a",
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("allowed source");
  });

  it("returns 400 on invalid JSON body", async () => {
    setupAuth();

    const res = await POST(
      new NextRequest("http://localhost/api/transcription", {
        method: "POST",
        body: "{bad json",
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 200 with duration on successful transcription", async () => {
    setupAuth();
    setupDBs();

    // Mock audio download
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob(["audio"], { type: "audio/mp4" })),
    }) as typeof fetch;

    mockTranscribeAudio.mockResolvedValue({
      text: "Hello, this is a test interview.",
      duration: 1800,
      language: "en",
      segments: [{ start: 0, end: 5, text: "Hello" }],
    });

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.duration_seconds).toBe(1800);
    expect(mockTranscribeAudio).toHaveBeenCalledOnce();
  });

  it("returns 500 when Whisper API fails", async () => {
    setupAuth();
    setupDBs();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob(["audio"], { type: "audio/mp4" })),
    }) as typeof fetch;

    mockTranscribeAudio.mockRejectedValue(
      new Error("Whisper API error (500): Internal Server Error"),
    );

    const res = await POST(makePost(VALID_BODY));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Whisper");
  });
});
