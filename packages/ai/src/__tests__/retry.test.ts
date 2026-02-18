import { describe, it, expect, vi } from "vitest";
import { withRetry, withModelEscalation } from "../retry";
import { AIRateLimitError, AIError } from "../errors";

describe("withRetry", () => {
  it("returns immediately on success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { baseDelay: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after max retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelay: 10 }),
    ).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("respects retryAfter for rate limits", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AIRateLimitError(50))
      .mockResolvedValue("ok");

    const start = Date.now();
    const result = await withRetry(fn, { baseDelay: 10 });
    const elapsed = Date.now() - start;

    expect(result).toBe("ok");
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it("uses exponential backoff", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("ok");

    const start = Date.now();
    await withRetry(fn, { baseDelay: 50, maxRetries: 3 });
    const elapsed = Date.now() - start;

    // 50ms (first retry) + 100ms (second retry) = ~150ms minimum
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});

describe("withModelEscalation", () => {
  it("returns result from primary model on success", async () => {
    const fn = vi.fn().mockResolvedValue("primary result");
    const result = await withModelEscalation(fn, "jdGeneration", "marketInsights");
    expect(result).toBe("primary result");
    expect(fn).toHaveBeenCalledWith("jdGeneration");
  });

  it("falls back to secondary model on failure", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AIError("fail", "API_ERROR"))
      .mockResolvedValue("fallback result");

    const result = await withModelEscalation(fn, "jdGeneration", "marketInsights");
    expect(result).toBe("fallback result");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith("jdGeneration");
    expect(fn).toHaveBeenCalledWith("marketInsights");
  });

  it("throws if both models fail", async () => {
    const fn = vi.fn().mockRejectedValue(new AIError("fail", "API_ERROR"));

    await expect(
      withModelEscalation(fn, "jdGeneration", "marketInsights"),
    ).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
