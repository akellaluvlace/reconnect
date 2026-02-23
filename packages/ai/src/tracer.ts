/**
 * AI Pipeline Tracer
 *
 * Traces the full data flow through every pipeline step.
 * Logs: what went in, what came out, what got passed to the next step,
 * what got dropped/transformed at each handoff point.
 *
 * NOT raw prompts or responses — the actual params, context objects,
 * data shapes, and values at every point that could break.
 */

type TraceStep = {
  step: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  warnings?: string[];
  error?: string;
  durationMs?: number;
};

export class PipelineTrace {
  readonly id: string;
  readonly pipeline: string;
  readonly startedAt: string;
  private steps: TraceStep[] = [];
  private startTime: number;

  constructor(pipeline: string) {
    this.id = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.pipeline = pipeline;
    this.startedAt = new Date().toISOString();
    this.startTime = Date.now();
  }

  /**
   * Log a pipeline step with its input params.
   * Returns a finish function to call when the step completes.
   */
  step(name: string, input: Record<string, unknown>): StepHandle {
    const stepStart = Date.now();
    const step: TraceStep = { step: name, input };
    this.steps.push(step);

    const prefix = `[TRACE:${this.pipeline}:${name}]`;
    console.log(`${prefix} START`, summarize(input));

    return {
      ok: (output: Record<string, unknown>, warnings?: string[]) => {
        step.output = output;
        step.warnings = warnings;
        step.durationMs = Date.now() - stepStart;
        console.log(
          `${prefix} OK (${step.durationMs}ms)`,
          summarize(output),
        );
        if (warnings?.length) {
          console.warn(`${prefix} WARNINGS:`, warnings);
        }
      },
      fail: (error: string) => {
        step.error = error;
        step.durationMs = Date.now() - stepStart;
        console.error(`${prefix} FAIL (${step.durationMs}ms): ${error}`);
      },
    };
  }

  /** Dump the full trace as structured JSON */
  dump(): {
    id: string;
    pipeline: string;
    startedAt: string;
    totalMs: number;
    steps: TraceStep[];
    ok: boolean;
  } {
    return {
      id: this.id,
      pipeline: this.pipeline,
      startedAt: this.startedAt,
      totalMs: Date.now() - this.startTime,
      steps: this.steps,
      ok: this.steps.every((s) => !s.error),
    };
  }

  /** Log the final trace summary */
  finish(): void {
    const d = this.dump();
    const failed = d.steps.filter((s) => s.error);
    const warned = d.steps.filter((s) => s.warnings?.length);

    if (failed.length > 0) {
      console.error(
        `[TRACE:${this.pipeline}] FAILED after ${d.totalMs}ms — ${failed.length} step(s) failed:`,
        failed.map((s) => `${s.step}: ${s.error}`),
      );
    } else if (warned.length > 0) {
      console.warn(
        `[TRACE:${this.pipeline}] COMPLETED with warnings in ${d.totalMs}ms — ${d.steps.length} steps`,
      );
    } else {
      console.log(
        `[TRACE:${this.pipeline}] COMPLETED in ${d.totalMs}ms — ${d.steps.length} steps`,
      );
    }
  }
}

interface StepHandle {
  ok: (output: Record<string, unknown>, warnings?: string[]) => void;
  fail: (error: string) => void;
}

/**
 * Summarize a value for logging — shows shape and key values
 * without dumping megabytes of data.
 */
function summarize(obj: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      parts.push(`${key}=null`);
    } else if (typeof value === "string") {
      parts.push(`${key}="${value.length > 60 ? value.slice(0, 60) + "..." : value}"`);
    } else if (typeof value === "number" || typeof value === "boolean") {
      parts.push(`${key}=${value}`);
    } else if (Array.isArray(value)) {
      parts.push(`${key}=[${value.length} items]`);
    } else if (typeof value === "object") {
      const keys = Object.keys(value as object);
      parts.push(`${key}={${keys.join(",")}}`);
    }
  }
  return `{ ${parts.join(", ")} }`;
}

/** Detect missing/empty params that a pipeline step expects */
export function checkParams(
  params: Record<string, unknown>,
  required: string[],
  optional: string[] = [],
): string[] {
  const warnings: string[] = [];

  for (const key of required) {
    const val = params[key];
    if (val === undefined || val === null) {
      warnings.push(`MISSING required param: ${key}`);
    } else if (typeof val === "string" && val.trim() === "") {
      warnings.push(`EMPTY required param: ${key}`);
    } else if (Array.isArray(val) && val.length === 0) {
      warnings.push(`EMPTY array for required param: ${key}`);
    }
  }

  for (const key of optional) {
    const val = params[key];
    if (val !== undefined && val !== null) {
      if (typeof val === "object" && !Array.isArray(val) && Object.keys(val as object).length === 0) {
        warnings.push(`EMPTY object for optional param: ${key} (will have no effect)`);
      }
    }
  }

  return warnings;
}
