export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export class AIValidationError extends AIError {
  constructor(public readonly issues: unknown[]) {
    super("AI response validation failed", "VALIDATION_ERROR");
    this.name = "AIValidationError";
  }
}

export class AIRateLimitError extends AIError {
  constructor(public readonly retryAfter?: number) {
    super("AI rate limit exceeded", "RATE_LIMIT");
    this.name = "AIRateLimitError";
  }
}

export class AISearchError extends AIError {
  constructor(message: string) {
    super(message, "SEARCH_ERROR");
    this.name = "AISearchError";
  }
}

export class AITimeoutError extends AIError {
  constructor() {
    super("AI request timed out", "TIMEOUT");
    this.name = "AITimeoutError";
  }
}
