export type AIErrorCode =
  | "CONFIG_ERROR"
  | "API_ERROR"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT"
  | "SEARCH_ERROR"
  | "TIMEOUT";

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AIError";
  }
}

export class AIValidationError extends AIError {
  constructor(
    public readonly issues: Array<{ message: string; path?: Array<string | number> }>,
  ) {
    super("AI response validation failed", "VALIDATION_ERROR");
    this.name = "AIValidationError";
  }

  /** Non-transient: retrying will produce the same result */
  readonly transient = false;
}

export class AIRateLimitError extends AIError {
  constructor(public readonly retryAfter?: number) {
    super("AI rate limit exceeded", "RATE_LIMIT");
    this.name = "AIRateLimitError";
  }

  readonly transient = true;
}

export class AISearchError extends AIError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, "SEARCH_ERROR", options);
    this.name = "AISearchError";
  }
}

export class AITimeoutError extends AIError {
  constructor() {
    super("AI request timed out", "TIMEOUT");
    this.name = "AITimeoutError";
  }

  readonly transient = true;
}
