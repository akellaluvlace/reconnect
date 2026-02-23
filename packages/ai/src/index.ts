// Config
export { AI_CONFIG, SEARCH_CONFIG, PROMPT_VERSIONS, type AIEndpoint } from "./config";

// Clients
export { callClaude, callClaudeText } from "./client";
export { searchWeb, searchWebParallel, type SearchResult } from "./search-client";

// Errors
export {
  AIError,
  AIValidationError,
  AIOutputTruncatedError,
  AIRateLimitError,
  AISearchError,
  AITimeoutError,
  type AIErrorCode,
} from "./errors";

// Sanitization
export { sanitizeInput, wrapUserContent } from "./sanitize";

// Retry
export { withRetry, withModelEscalation } from "./retry";

// Logger
export { pipelineLogger, type PipelineLogEntry } from "./logger";

// Coercion
export { coerceAIResponse } from "./coerce";

// Tracer
export { PipelineTrace, checkParams } from "./tracer";


// Schemas (also available via @reconnect/ai/schemas)
export * from "./schemas";

// Prompts (also available via @reconnect/ai/prompts)
export * from "./prompts";

// Pipelines (also available via @reconnect/ai/pipelines)
export * from "./pipelines";
