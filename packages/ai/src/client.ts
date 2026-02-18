import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { AI_CONFIG, type AIEndpoint } from "./config";
import { AIError, AIRateLimitError, AIValidationError } from "./errors";

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
 * Uses messages.parse() + zodOutputFormat() for guaranteed schema-valid responses.
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

  try {
    const response = await client.messages.parse({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        format: zodOutputFormat(schema),
      },
    });

    if (!response.parsed_output) {
      throw new AIValidationError([
        { message: "No parsed output in response" },
      ]);
    }

    return {
      data: response.parsed_output,
      model: config.model,
    };
  } catch (error) {
    handleApiError(error);
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

  try {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    if (!block || block.type !== "text") {
      throw new AIError("Expected text response from Claude", "API_ERROR");
    }

    return { content: block.text, model: config.model };
  } catch (error) {
    handleApiError(error);
  }
}

/** @internal Exported for testing only — do not use directly in app code */
export { getClient };
