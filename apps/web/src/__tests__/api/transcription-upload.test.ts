import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockFrom,
  mockServiceFrom,
  mockStorageUpload,
  mockTracePipeline,
  mockTraceError,
  mockFetch,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockServiceFrom: vi.fn(),
  mockStorageUpload: vi.fn(),
  mockTracePipeline: vi.fn(),
  mockTraceError: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockServiceFrom,
    storage: { from: vi.fn(() => ({ upload: mockStorageUpload })) },
  })),
}));

vi.mock("@/lib/google/pipeline-tracer", () => ({
  tracePipeline: mockTracePipeline,
  traceError: mockTraceError,
}));

// Mock global fetch for Whisper API
const originalFetch = globalThis.fetch;

import { POST } from "@/app/api/transcription/upload/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "admin@axil.ie" };
const INTERVIEW_ID = "a1111111-1111-4111-a111-111111111111";

function makeFile(
  name = "recording.mp4",
  type = "audio/mp4",
  size = 1024,
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function makeFormData(
  interviewId: string = INTERVIEW_ID,
  file: File = makeFile(),
): FormData {
  const fd = new FormData();
  fd.append("interview_id", interviewId);
  fd.append("file", file);
  return fd;
}

function makeRequest(formData?: FormData): NextRequest {
  const body = formData ?? makeFormData();
  return new NextRequest("http://localhost/api/transcription/upload", {
    method: "POST",
    body,
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
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

function setupAdminAuth() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({ data: { role: "admin" }, error: null });
    }
    if (table === "interviews") {
      return chainBuilder({ data: { id: INTERVIEW_ID }, error: null });
    }
    return chainBuilder({ data: null, error: null });
  });
}

function setupServiceMocks(overrides?: Record<string, { data: unknown; error: unknown }>) {
  mockServiceFrom.mockImplementation((table: string) => {
    if (overrides?.[table]) {
      return chainBuilder(overrides[table]);
    }
    if (table === "interviews") {
      return chainBuilder({ data: {}, error: null });
    }
    if (table === "interview_transcripts") {
      return chainBuilder({ data: {}, error: null });
    }
    return chainBuilder({ data: null, error: null });
  });
}

function setupWhisperSuccess() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        text: "Hello this is a test transcript",
        duration: 120.5,
        language: "en",
      }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/transcription/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-whisper-key";
    globalThis.fetch = originalFetch;
  });

  // --- Auth Tests ---

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No session" },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin/manager roles", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "interviewer" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  // --- Input Validation Tests ---

  it("returns 400 for invalid UUID interview_id", async () => {
    setupAdminAuth();
    const fd = new FormData();
    fd.append("interview_id", "not-a-uuid");
    fd.append("file", makeFile());
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid interview_id");
  });

  it("returns 400 for path traversal interview_id", async () => {
    setupAdminAuth();
    const fd = new FormData();
    fd.append("interview_id", "../../../etc/passwd");
    fd.append("file", makeFile());
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid interview_id");
  });

  it("returns 404 when interview not found (cross-org)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      if (table === "interviews") {
        // RLS blocks — interview belongs to different org
        return chainBuilder({ data: null, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Interview not found");
  });

  it("returns 400 for oversized file", async () => {
    setupAdminAuth();
    const bigFile = makeFile("big.mp4", "audio/mp4", 150 * 1024 * 1024);
    const fd = makeFormData(INTERVIEW_ID, bigFile);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("File too large");
  });

  it("returns 400 for unsupported file type", async () => {
    setupAdminAuth();
    const badFile = makeFile("doc.pdf", "application/pdf", 1024);
    const fd = makeFormData(INTERVIEW_ID, badFile);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Unsupported file type");
  });

  it("accepts audio/wav file type", async () => {
    setupAdminAuth();
    setupServiceMocks();
    mockStorageUpload.mockResolvedValue({ error: null });
    setupWhisperSuccess();

    const wavFile = makeFile("recording.wav", "audio/wav", 1024);
    const fd = makeFormData(INTERVIEW_ID, wavFile);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });

  // --- Storage Upload Tests ---

  it("returns 500 when storage upload fails", async () => {
    setupAdminAuth();
    setupServiceMocks();
    mockStorageUpload.mockResolvedValue({
      error: { message: "Storage full" },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("File upload failed");
  });

  // --- Whisper API Tests ---

  it("returns 503 when OPENAI_API_KEY not set", async () => {
    delete process.env.OPENAI_API_KEY;
    setupAdminAuth();
    setupServiceMocks();
    mockStorageUpload.mockResolvedValue({ error: null });
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Whisper API not configured");
  });

  it("returns 502 when Whisper API fails", async () => {
    setupAdminAuth();
    setupServiceMocks();
    mockStorageUpload.mockResolvedValue({ error: null });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Whisper error"),
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Transcription failed");
    expect(mockTraceError).toHaveBeenCalled();
  });

  // --- Transcript Storage Tests ---

  it("returns 500 when transcript insert fails (non-duplicate)", async () => {
    setupAdminAuth();
    mockStorageUpload.mockResolvedValue({ error: null });
    setupWhisperSuccess();
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interview_transcripts") {
        return chainBuilder({
          data: null,
          error: { code: "42P01", message: "relation does not exist" },
        });
      }
      return chainBuilder({ data: {}, error: null });
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to store transcript");
  });

  it("handles duplicate transcript gracefully (23505)", async () => {
    setupAdminAuth();
    mockStorageUpload.mockResolvedValue({ error: null });
    setupWhisperSuccess();
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "interview_transcripts") {
        return chainBuilder({
          data: null,
          error: { code: "23505", message: "duplicate key" },
        });
      }
      return chainBuilder({ data: {}, error: null });
    });
    const res = await POST(makeRequest());
    // Should succeed — duplicate is not fatal
    expect(res.status).toBe(200);
  });

  // --- Happy Path ---

  it("returns 200 with transcript data on success", async () => {
    setupAdminAuth();
    setupServiceMocks();
    mockStorageUpload.mockResolvedValue({ error: null });
    setupWhisperSuccess();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.transcript_length).toBe(
      "Hello this is a test transcript".length,
    );
    expect(body.data.duration).toBe(120.5);
    expect(mockTracePipeline).toHaveBeenCalledTimes(2); // uploaded + transcribed
  });

  // --- File Name Sanitization ---

  it("sanitizes file name with path traversal characters", async () => {
    setupAdminAuth();
    setupServiceMocks();
    mockStorageUpload.mockResolvedValue({ error: null });
    setupWhisperSuccess();

    const evilFile = makeFile("../../etc/passwd.mp4", "audio/mp4", 1024);
    const fd = makeFormData(INTERVIEW_ID, evilFile);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);

    // Verify the storage path was sanitized — no directory separators in filename
    const uploadCall = mockStorageUpload.mock.calls[0];
    const storagePath = uploadCall[0] as string;
    const fileName = storagePath.split("/").pop()!;
    expect(fileName).not.toContain("/");
    expect(fileName).not.toContain("\\");
    expect(storagePath).toMatch(/^recordings\/[a-f0-9-]+\//);
  });
});
