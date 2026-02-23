import { describe, it, expect, beforeEach, vi } from "vitest";
import { pipelineLogger, type PipelineLogEntry } from "../logger";

function makeEntry(overrides: Partial<PipelineLogEntry> = {}): PipelineLogEntry {
  return {
    timestamp: "2026-02-22T10:00:00Z",
    endpoint: "stageGeneration",
    model: "claude-sonnet-4-5-20250929",
    inputTokens: 1200,
    outputTokens: 800,
    latencyMs: 3200,
    validationPassed: true,
    coercionApplied: false,
    stopReason: "end_turn",
    promptLength: 5000,
    ...overrides,
  };
}

describe("PipelineLogger", () => {
  beforeEach(() => {
    pipelineLogger.clear();
  });

  it("logs successful call", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    pipelineLogger.log(makeEntry());
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("[AI:stageGeneration]");
    expect(spy.mock.calls[0][0]).toContain("tokens=1200+800");
    expect(spy.mock.calls[0][0]).toContain("latency=3200ms");
    spy.mockRestore();
  });

  it("logs error call to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    pipelineLogger.log(
      makeEntry({ error: "AIValidationError", errorMessage: "Bad output" }),
    );
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain("ERROR=AIValidationError");
    spy.mockRestore();
  });

  it("logs coercion as COERCED tag", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    pipelineLogger.log(makeEntry({ coercionApplied: true }));
    expect(spy.mock.calls[0][0]).toContain("COERCED");
    spy.mockRestore();
  });

  it("logs validation issues on warn level", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    pipelineLogger.log(
      makeEntry({
        validationPassed: false,
        validationIssues: [{ message: "Too many items", path: ["focus_areas"] }],
      }),
    );
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("stores entries in ring buffer", () => {
    for (let i = 0; i < 5; i++) {
      vi.spyOn(console, "log").mockImplementation(() => {});
      pipelineLogger.log(makeEntry({ latencyMs: i * 1000 }));
    }
    const entries = pipelineLogger.getRecentEntries(3);
    expect(entries).toHaveLength(3);
    // Should be the last 3
    expect(entries[0].latencyMs).toBe(2000);
    expect(entries[2].latencyMs).toBe(4000);
  });

  it("ring buffer caps at 100", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    for (let i = 0; i < 120; i++) {
      pipelineLogger.log(makeEntry({ latencyMs: i }));
    }
    const all = pipelineLogger.getRecentEntries(200);
    expect(all).toHaveLength(100);
    // First entry should be #20 (0-19 evicted)
    expect(all[0].latencyMs).toBe(20);
  });

  it("getStats computes correct aggregates", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    pipelineLogger.log(makeEntry({ latencyMs: 1000 }));
    pipelineLogger.log(makeEntry({ latencyMs: 3000 }));
    pipelineLogger.log(
      makeEntry({
        latencyMs: 2000,
        error: "AIValidationError",
        coercionApplied: true,
      }),
    );

    const stats = pipelineLogger.getStats();
    expect(stats.totalCalls).toBe(3);
    expect(stats.failures).toBe(1);
    expect(stats.coercions).toBe(1);
    expect(stats.avgLatencyMs).toBe(2000);
    expect(stats.byEndpoint.stageGeneration.calls).toBe(3);
    expect(stats.byEndpoint.stageGeneration.failures).toBe(1);
  });

  it("clear empties the buffer", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    pipelineLogger.log(makeEntry());
    pipelineLogger.clear();
    expect(pipelineLogger.getRecentEntries()).toHaveLength(0);
  });
});
