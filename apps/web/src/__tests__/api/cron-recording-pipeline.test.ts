import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockServiceFrom,
  mockGetConferenceRecord,
  mockGetTranscriptDocId,
  mockGetTranscriptEntries,
  mockExportGoogleDoc,
  mockTracePipeline,
  mockTraceError,
} = vi.hoisted(() => ({
  mockServiceFrom: vi.fn(),
  mockGetConferenceRecord: vi.fn(),
  mockGetTranscriptDocId: vi.fn(),
  mockGetTranscriptEntries: vi.fn(),
  mockExportGoogleDoc: vi.fn(),
  mockTracePipeline: vi.fn(),
  mockTraceError: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({ from: mockServiceFrom })),
}));

vi.mock("@/lib/google", () => ({
  getConferenceRecord: mockGetConferenceRecord,
  getTranscriptDocId: mockGetTranscriptDocId,
  getTranscriptEntries: mockGetTranscriptEntries,
  exportGoogleDoc: mockExportGoogleDoc,
}));

vi.mock("@/lib/google/pipeline-tracer", () => ({
  tracePipeline: mockTracePipeline,
  traceError: mockTraceError,
}));

vi.mock("@/lib/google/env", () => ({
  requireGoogleEnv: vi.fn(),
}));

import { GET } from "@/app/api/cron/recording-pipeline/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CRON_SECRET = "test-cron-secret";

function makeRequest(secret?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (secret) headers.authorization = `Bearer ${secret}`;
  return new NextRequest("http://localhost/api/cron/recording-pipeline", {
    method: "GET",
    headers,
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
    "lt",
    "gte",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/cron/recording-pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
  });

  it("returns 401 when no CRON_SECRET header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong CRON_SECRET", async () => {
    const res = await GET(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with empty stats when no interviews found", async () => {
    mockServiceFrom.mockImplementation(() =>
      chainBuilder({ data: [], error: null }),
    );

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stats.phase1).toBe(0);
    expect(body.stats.phase2).toBe(0);
  });

  it("transitions scheduled interviews to pending (Phase 1)", async () => {
    const scheduledInterview = {
      id: "int-1",
      meet_link: "https://meet.google.com/abc-def-ghi",
      meet_conference_id: "abc-def-ghi",
      scheduled_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    };

    let queryCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        queryCount++;
        if (queryCount === 1) {
          // Phase 1: select scheduled
          return chainBuilder({ data: [scheduledInterview], error: null });
        }
        if (queryCount === 2) {
          // Optimistic lock update
          return chainBuilder({ data: { id: scheduledInterview.id }, error: null });
        }
        // Phase 2 and 3: no pending or exhausted
        return chainBuilder({ data: [], error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    mockTracePipeline.mockResolvedValue(undefined);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.stats.phase1).toBe(1);
    expect(mockTracePipeline).toHaveBeenCalledWith(
      "int-1",
      expect.objectContaining({ from: "scheduled", to: "pending" }),
    );
  });

  it("retrieves transcript and transitions pending to transcribed (Phase 2)", async () => {
    const pendingInterview = {
      id: "int-2",
      meet_link: "https://meet.google.com/abc-def-ghi",
      meet_conference_id: "abc-def-ghi",
      pipeline_log: [],
      retry_count: 0,
    };

    let queryCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        queryCount++;
        if (queryCount === 1) {
          // Phase 1: no scheduled
          return chainBuilder({ data: [], error: null });
        }
        if (queryCount === 2) {
          // Phase 2: pending interviews
          return chainBuilder({ data: [pendingInterview], error: null });
        }
        // Remaining update calls
        return chainBuilder({ data: null, error: null });
      }
      if (table === "interview_transcripts") {
        return chainBuilder({ data: null, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    mockGetConferenceRecord.mockResolvedValue("conferenceRecords/abc123");
    mockGetTranscriptDocId.mockResolvedValue("doc-123");
    mockExportGoogleDoc.mockResolvedValue("Full transcript text from Google Docs");
    mockGetTranscriptEntries.mockResolvedValue({
      entries: [{ text: "Hello" }],
      plainText: "Hello",
      transcriptName: "t1",
    });
    mockTracePipeline.mockResolvedValue(undefined);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.stats.phase2).toBe(1);
    expect(mockGetConferenceRecord).toHaveBeenCalledWith("abc-def-ghi");
    expect(mockExportGoogleDoc).toHaveBeenCalledWith("doc-123");
  });

  it("marks exhausted retries as failed_transcription (Phase 3)", async () => {
    const exhaustedInterview = { id: "int-3" };

    let queryCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interviews") {
        queryCount++;
        if (queryCount === 1) return chainBuilder({ data: [], error: null }); // Phase 1
        if (queryCount === 2) return chainBuilder({ data: [], error: null }); // Phase 2
        if (queryCount === 3) return chainBuilder({ data: [exhaustedInterview], error: null }); // Phase 3
        return chainBuilder({ data: null, error: null }); // Updates
      }
      return chainBuilder({ data: null, error: null });
    });

    mockTracePipeline.mockResolvedValue(undefined);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.stats.failed).toBe(1);
    expect(mockTracePipeline).toHaveBeenCalledWith(
      "int-3",
      expect.objectContaining({ to: "failed_transcription" }),
    );
  });
});
