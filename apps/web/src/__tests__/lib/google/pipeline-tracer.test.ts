import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

import {
  tracePipeline,
  traceError,
  traceGoogleApi,
} from "@/lib/google/pipeline-tracer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTERVIEW_ID = "11111111-1111-1111-1111-111111111111";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  ["select", "insert", "update", "delete", "eq", "neq", "limit"].forEach(
    (m) => {
      builder[m] = vi.fn().mockReturnValue(builder);
    },
  );
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("tracePipeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs to console", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockRpc.mockResolvedValue({ error: null });

    await tracePipeline(INTERVIEW_ID, {
      from: "scheduled",
      to: "pending",
      detail: "Test transition",
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[TRACE:pipeline]"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("scheduled→pending"),
    );
    consoleSpy.mockRestore();
  });

  it("attempts atomic RPC append first", async () => {
    mockRpc.mockResolvedValue({ error: null });

    await tracePipeline(INTERVIEW_ID, {
      from: "pending",
      to: "transcribed",
      detail: "Transcript retrieved",
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "append_pipeline_log",
      expect.objectContaining({
        p_interview_id: INTERVIEW_ID,
        p_entry: expect.objectContaining({
          from: "pending",
          to: "transcribed",
          detail: "Transcript retrieved",
          ts: expect.any(String),
        }),
      }),
    );
  });

  it("falls back to read-modify-write when RPC fails", async () => {
    mockRpc.mockResolvedValue({
      error: { message: "function does not exist" },
    });

    const existingLog = [{ from: null, to: "scheduled", ts: "2026-01-01T00:00:00Z", detail: "Created" }];
    mockFrom.mockImplementation(() =>
      chainBuilder({ data: { pipeline_log: existingLog }, error: null }),
    );

    await tracePipeline(INTERVIEW_ID, {
      from: "scheduled",
      to: "pending",
      detail: "Fallback test",
    });

    // Should have read existing log then updated
    expect(mockFrom).toHaveBeenCalledWith("interviews");
  });

  it("handles null from state", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockRpc.mockResolvedValue({ error: null });

    await tracePipeline(INTERVIEW_ID, {
      from: null,
      to: "scheduled",
      detail: "Interview created",
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("null→scheduled"),
    );
    consoleSpy.mockRestore();
  });

  it("does not throw when persistence fails completely", async () => {
    mockRpc.mockResolvedValue({ error: { message: "rpc failed" } });
    mockFrom.mockImplementation(() => {
      throw new Error("DB connection error");
    });

    // Should not throw — tracePipeline catches all errors
    await expect(
      tracePipeline(INTERVIEW_ID, {
        from: "pending",
        to: "transcribed",
        detail: "Should not throw",
      }),
    ).resolves.not.toThrow();
  });

  it("adds timestamp to event", async () => {
    mockRpc.mockResolvedValue({ error: null });

    await tracePipeline(INTERVIEW_ID, {
      from: "scheduled",
      to: "pending",
      detail: "Timestamp test",
    });

    const rpcCall = mockRpc.mock.calls[0];
    const entry = rpcCall[1].p_entry;
    expect(entry.ts).toBeDefined();
    // Should be a valid ISO timestamp
    expect(new Date(entry.ts).toISOString()).toBe(entry.ts);
  });
});

describe("traceError", () => {
  it("logs Error instances", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    traceError(INTERVIEW_ID, new Error("test error"), "test-context");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("test error"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("test-context"),
    );
    consoleSpy.mockRestore();
  });

  it("logs string errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    traceError(INTERVIEW_ID, "string error", "ctx");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("string error"),
    );
    consoleSpy.mockRestore();
  });
});

describe("traceGoogleApi", () => {
  it("logs API call with latency", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    traceGoogleApi("calendar", "POST events", 200, 150);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[GOOGLE:calendar]"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("latency=150ms"),
    );
    consoleSpy.mockRestore();
  });

  it("includes metadata when provided", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    traceGoogleApi("meet", "GET transcripts", 200, 50, { count: 3 });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"count":3'),
    );
    consoleSpy.mockRestore();
  });
});
