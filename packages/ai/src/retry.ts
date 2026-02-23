import {
  AIRateLimitError,
  AIValidationError,
  AIOutputTruncatedError,
  AIError,
} from "./errors";
import type { AIEndpoint } from "./config";

/** Check if an error is transient (worth retrying) */
function isTransientError(error: unknown): boolean {
  // Validation errors are deterministic — retrying won't help
  if (error instanceof AIValidationError) return false;
  // Truncation is deterministic — same input = same truncation
  if (error instanceof AIOutputTruncatedError) return false;
  // Config errors (missing API key) are deterministic
  if (error instanceof AIError && error.code === "CONFIG_ERROR") return false;
  // Rate limits are transient
  if (error instanceof AIRateLimitError) return true;
  // All other errors (API errors, network errors) — retry
  return true;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 16000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry non-transient errors
      if (!isTransientError(error)) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw error;
      }

      if (error instanceof AIRateLimitError) {
        const delay = Math.min(
          error.retryAfter ?? baseDelay * Math.pow(2, attempt),
          maxDelay,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Unreachable — loop always returns or throws
  throw new AIError("Retry exhausted", "API_ERROR");
}

/**
 * Wraps a pipeline function to try with the original model first,
 * then escalate to a more capable model on failure.
 * Only escalates on transient/API errors, not validation or config errors.
 */
export async function withModelEscalation<T>(
  fn: (endpoint: AIEndpoint) => Promise<T>,
  primaryEndpoint: AIEndpoint,
  fallbackEndpoint: AIEndpoint,
): Promise<T> {
  try {
    return await fn(primaryEndpoint);
  } catch (error) {
    // Don't escalate non-transient errors — they'll fail on the fallback too
    if (!isTransientError(error)) {
      throw error;
    }
    console.warn(
      `[AI] Primary model (${primaryEndpoint}) failed, escalating to ${fallbackEndpoint}:`,
      error instanceof Error ? error.message : error,
    );
    return await fn(fallbackEndpoint);
  }
}
