import type { AIEndpoint } from "./config";

export interface PipelineLogEntry {
  timestamp: string;
  endpoint: AIEndpoint;
  model: string;
  /** Input token count (from API response) */
  inputTokens: number;
  /** Output token count (from API response) */
  outputTokens: number;
  /** Wall-clock latency in ms */
  latencyMs: number;
  /** Whether Zod validation passed on first attempt */
  validationPassed: boolean;
  /** Whether coercion was needed to fix the response */
  coercionApplied: boolean;
  /** Zod issues if validation failed (before coercion) */
  validationIssues?: Array<{ message: string; path?: string[] }>;
  /** Stop reason from API (end_turn, max_tokens, etc.) */
  stopReason: string;
  /** Error class name if the call failed */
  error?: string;
  /** Error message if the call failed */
  errorMessage?: string;
  /** Prompt character length (not tokens — cheap to compute) */
  promptLength: number;
}

type LogLevel = "info" | "warn" | "error";

/**
 * Structured logger for AI pipeline calls.
 * Outputs JSON to stdout/stderr for production debugging.
 * Keeps last N entries in memory for health-check inspection.
 */
class PipelineLogger {
  private readonly buffer: PipelineLogEntry[] = [];
  private readonly maxBufferSize = 100;

  log(entry: PipelineLogEntry): void {
    // Add to ring buffer
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    const level: LogLevel = entry.error
      ? "error"
      : !entry.validationPassed
        ? "warn"
        : "info";

    const prefix = `[AI:${entry.endpoint}]`;
    const summary = [
      `model=${entry.model}`,
      `tokens=${entry.inputTokens}+${entry.outputTokens}`,
      `latency=${entry.latencyMs}ms`,
      `stop=${entry.stopReason}`,
      entry.coercionApplied ? "COERCED" : null,
      entry.error ? `ERROR=${entry.error}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const logLine = `${prefix} ${summary}`;

    if (level === "error") {
      console.error(logLine);
      if (entry.validationIssues?.length) {
        console.error(
          `${prefix} Validation issues:`,
          JSON.stringify(entry.validationIssues, null, 2),
        );
      }
      if (entry.errorMessage) {
        console.error(`${prefix} ${entry.errorMessage}`);
      }
    } else if (level === "warn") {
      console.warn(logLine);
      if (entry.validationIssues?.length) {
        console.warn(
          `${prefix} Validation issues:`,
          JSON.stringify(entry.validationIssues, null, 2),
        );
      }
    } else {
      console.log(logLine);
    }
  }

  /** Get recent log entries (for health-check endpoint) */
  getRecentEntries(count = 20): PipelineLogEntry[] {
    return this.buffer.slice(-count);
  }

  /** Get summary stats for health-check */
  getStats(): {
    totalCalls: number;
    failures: number;
    coercions: number;
    avgLatencyMs: number;
    byEndpoint: Record<string, { calls: number; failures: number; avgLatency: number }>;
  } {
    const entries = this.buffer;
    const failures = entries.filter((e) => e.error).length;
    const coercions = entries.filter((e) => e.coercionApplied).length;
    const avgLatency =
      entries.length > 0
        ? Math.round(entries.reduce((sum, e) => sum + e.latencyMs, 0) / entries.length)
        : 0;

    const byEndpoint: Record<string, { calls: number; failures: number; avgLatency: number }> = {};
    for (const entry of entries) {
      const ep = entry.endpoint;
      if (!byEndpoint[ep]) {
        byEndpoint[ep] = { calls: 0, failures: 0, avgLatency: 0 };
      }
      byEndpoint[ep].calls++;
      if (entry.error) byEndpoint[ep].failures++;
      byEndpoint[ep].avgLatency += entry.latencyMs;
    }
    for (const ep of Object.keys(byEndpoint)) {
      byEndpoint[ep].avgLatency = Math.round(
        byEndpoint[ep].avgLatency / byEndpoint[ep].calls,
      );
    }

    return { totalCalls: entries.length, failures, coercions, avgLatencyMs: avgLatency, byEndpoint };
  }

  /** Clear buffer (for testing) */
  clear(): void {
    this.buffer.length = 0;
  }
}

/** Singleton pipeline logger */
export const pipelineLogger = new PipelineLogger();
