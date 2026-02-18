import { describe, it, expect } from "vitest";
import {
  AIError,
  AIValidationError,
  AIRateLimitError,
  AISearchError,
  AITimeoutError,
} from "../errors";

describe("Error classes", () => {
  it("AIError has correct name and code", () => {
    const err = new AIError("test", "API_ERROR");
    expect(err.name).toBe("AIError");
    expect(err.code).toBe("API_ERROR");
    expect(err.message).toBe("test");
    expect(err).toBeInstanceOf(Error);
  });

  it("AIValidationError stores issues", () => {
    const issues = [{ message: "field required" }];
    const err = new AIValidationError(issues);
    expect(err.name).toBe("AIValidationError");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.issues).toBe(issues);
    expect(err).toBeInstanceOf(AIError);
  });

  it("AIRateLimitError stores retryAfter", () => {
    const err = new AIRateLimitError(5000);
    expect(err.name).toBe("AIRateLimitError");
    expect(err.retryAfter).toBe(5000);
    expect(err).toBeInstanceOf(AIError);
  });

  it("AIRateLimitError works without retryAfter", () => {
    const err = new AIRateLimitError();
    expect(err.retryAfter).toBeUndefined();
  });

  it("AISearchError has correct code", () => {
    const err = new AISearchError("search failed");
    expect(err.name).toBe("AISearchError");
    expect(err.code).toBe("SEARCH_ERROR");
    expect(err).toBeInstanceOf(AIError);
  });

  it("AITimeoutError has correct code", () => {
    const err = new AITimeoutError();
    expect(err.name).toBe("AITimeoutError");
    expect(err.code).toBe("TIMEOUT");
    expect(err).toBeInstanceOf(AIError);
  });
});
