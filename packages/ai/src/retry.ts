import { AIRateLimitError } from "./errors";
import type { AIEndpoint } from "./config";

const MODEL_ESCALATION: Partial<Record<string, AIEndpoint>> = {
  "claude-sonnet-4-5-20250929": "marketInsights", // escalate to Opus config
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 16000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

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

      await new Promise((resolve) =>
        setTimeout(resolve, baseDelay * Math.pow(2, attempt)),
      );
    }
  }

  throw lastError;
}

/**
 * Wraps a pipeline function to try with the original model first,
 * then escalate to a more capable model on failure.
 */
export async function withModelEscalation<T>(
  fn: (endpoint: AIEndpoint) => Promise<T>,
  primaryEndpoint: AIEndpoint,
  fallbackEndpoint: AIEndpoint,
): Promise<T> {
  try {
    return await fn(primaryEndpoint);
  } catch {
    return await fn(fallbackEndpoint);
  }
}

export { MODEL_ESCALATION };
