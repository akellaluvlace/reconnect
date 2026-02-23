import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { AI_CONFIG, type AIEndpoint } from "./config";
import {
  AIError,
  AIOutputTruncatedError,
  AIRateLimitError,
  AIValidationError,
} from "./errors";
import { pipelineLogger, type PipelineLogEntry } from "./logger";
import { coerceAIResponse } from "./coerce";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AIError("ANTHROPIC_API_KEY is not set", "CONFIG_ERROR");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/** Convert SDK errors to our error hierarchy */
function handleApiError(error: unknown): never {
  if (error instanceof AIError) throw error;

  if (error instanceof Anthropic.APIError) {
    if (error.status === 429) {
      const retryAfter = error.headers?.["retry-after"];
      throw new AIRateLimitError(
        retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined,
      );
    }
    throw new AIError(error.message, "API_ERROR", { cause: error });
  }

  throw new AIError(
    error instanceof Error ? error.message : "Unknown Anthropic API error",
    "API_ERROR",
    { cause: error },
  );
}

/**
 * Call Claude with structured output using Zod schema validation.
 * Uses messages.create() + zodOutputFormat() with manual JSON parsing.
 * Includes structured logging and graceful coercion for near-valid responses.
 */
export async function callClaude<T extends z.ZodType>(options: {
  endpoint: AIEndpoint;
  schema: T;
  prompt: string;
  systemPrompt?: string;
}): Promise<{ data: z.infer<T>; model: string }> {
  const { endpoint, schema, prompt, systemPrompt } = options;
  const config = AI_CONFIG[endpoint];
  const client = getClient();
  const startTime = Date.now();

  // Base log entry — filled incrementally
  const logEntry: Partial<PipelineLogEntry> = {
    endpoint,
    model: config.model,
    promptLength: prompt.length + (systemPrompt?.length ?? 0),
    inputTokens: 0,
    outputTokens: 0,
    stopReason: "unknown",
    validationPassed: false,
    coercionApplied: false,
  };

  try {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        format: zodOutputFormat(schema),
      },
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    logEntry.inputTokens = inputTokens;
    logEntry.outputTokens = outputTokens;
    logEntry.stopReason = response.stop_reason ?? "unknown";

    // Detect truncation BEFORE trying to parse — deterministic, never retry
    if (response.stop_reason === "max_tokens") {
      logEntry.error = "AIOutputTruncatedError";
      logEntry.errorMessage = `Truncated: ${outputTokens}/${config.maxTokens} tokens`;
      throw new AIOutputTruncatedError(endpoint, config.maxTokens, outputTokens);
    }

    // Extract JSON from response content
    const block = response.content[0];
    if (!block || block.type !== "text") {
      logEntry.error = "AIValidationError";
      logEntry.errorMessage = "No text content in response";
      throw new AIValidationError([
        { message: "No text content in response" },
      ]);
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(block.text);
    } catch (parseErr) {
      logEntry.error = "JSONParseError";
      logEntry.errorMessage = `Failed to parse AI response as JSON: ${block.text.slice(0, 200)}`;
      throw new AIValidationError([
        { message: `AI returned invalid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` },
      ]);
    }

    // --- Graceful validation with coercion fallback ---
    const coercionResult = coerceAIResponse(rawJson, schema);

    if (coercionResult.data !== null) {
      // Validation passed (possibly after coercion)
      logEntry.validationPassed = true;
      logEntry.coercionApplied = coercionResult.coerced;
      if (coercionResult.coerced) {
        logEntry.validationIssues = coercionResult.issues.length > 0
          ? coercionResult.issues
          : [{ message: "Coercion applied (original failed validation)", path: [] }];
      }

      return {
        data: coercionResult.data,
        model: config.model,
      };
    }

    // Coercion couldn't save it — throw validation error
    logEntry.error = "AIValidationError";
    logEntry.errorMessage = "Validation failed even after coercion attempt";
    logEntry.validationIssues = coercionResult.issues;

    throw new AIValidationError(
      coercionResult.issues.map((i) => ({
        message: i.message,
        path: i.path,
      })),
    );
  } catch (error) {
    if (error instanceof AIError) {
      // Fill error info if not already set (e.g. rate limit, network)
      if (!logEntry.error) {
        logEntry.error = error.name;
        logEntry.errorMessage = error.message;
      }
      throw error;
    }
    logEntry.error = error instanceof Error ? error.constructor.name : "Unknown";
    logEntry.errorMessage = error instanceof Error ? error.message : String(error);
    handleApiError(error);
  } finally {
    logEntry.latencyMs = Date.now() - startTime;
    logEntry.timestamp = new Date().toISOString();
    pipelineLogger.log(logEntry as PipelineLogEntry);
  }
}

/**
 * Call Claude for unstructured text output (used for query generation, etc.)
 */
export async function callClaudeText(options: {
  endpoint: AIEndpoint;
  prompt: string;
  systemPrompt?: string;
}): Promise<{ content: string; model: string }> {
  const { endpoint, prompt, systemPrompt } = options;
  const config = AI_CONFIG[endpoint];
  const client = getClient();
  const startTime = Date.now();

  const logEntry: Partial<PipelineLogEntry> = {
    endpoint,
    model: config.model,
    promptLength: prompt.length + (systemPrompt?.length ?? 0),
    inputTokens: 0,
    outputTokens: 0,
    stopReason: "unknown",
    validationPassed: true, // text calls have no schema validation
    coercionApplied: false,
  };

  try {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    logEntry.inputTokens = response.usage?.input_tokens ?? 0;
    logEntry.outputTokens = response.usage?.output_tokens ?? 0;
    logEntry.stopReason = response.stop_reason ?? "unknown";

    const block = response.content[0];
    if (!block || block.type !== "text") {
      logEntry.error = "AIError";
      logEntry.errorMessage = "No text content in response";
      throw new AIError("Expected text response from Claude", "API_ERROR");
    }

    return { content: block.text, model: config.model };
  } catch (error) {
    if (error instanceof AIError) {
      if (!logEntry.error) {
        logEntry.error = error.name;
        logEntry.errorMessage = error.message;
      }
      throw error;
    }
    logEntry.error = error instanceof Error ? error.constructor.name : "Unknown";
    logEntry.errorMessage = error instanceof Error ? error.message : String(error);
    handleApiError(error);
  } finally {
    logEntry.latencyMs = Date.now() - startTime;
    logEntry.timestamp = new Date().toISOString();
    pipelineLogger.log(logEntry as PipelineLogEntry);
  }
}

/** @internal Exported for testing only — do not use directly in app code */
export { getClient };
