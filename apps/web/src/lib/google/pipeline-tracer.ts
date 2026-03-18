import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json } from "@reconnect/database";

export interface PipelineEvent {
  from: string | null;
  to: string;
  ts: string;
  detail: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a pipeline state transition to console AND persist to interview.pipeline_log.
 */
export async function tracePipeline(
  interviewId: string,
  event: Omit<PipelineEvent, "ts">,
): Promise<void> {
  const entry: PipelineEvent = { ...event, ts: new Date().toISOString() };

  // Layer 1: Console trace
  console.log(
    `[TRACE:pipeline] interview=${interviewId} ${entry.from ?? "null"}→${entry.to} | ${entry.detail}`,
  );

  // Layer 2: Persist to pipeline_log JSONB[] (atomic append via RPC-style raw update)
  try {
    const supabase = createServiceRoleClient();
    // Use coalesce + || for atomic append — avoids read-modify-write race condition
    const { error: appendError } = await supabase.rpc("append_pipeline_log" as never, {
      p_interview_id: interviewId,
      p_entry: entry as unknown as Json,
    } as never);

    // Fallback to read-modify-write if RPC doesn't exist yet
    if (appendError) {
      const { data: interview } = await supabase
        .from("interviews")
        .select("pipeline_log")
        .eq("id", interviewId)
        .single();

      const currentLog = (interview?.pipeline_log ?? []) as Json[];
      const updatedLog = [...currentLog, entry as unknown as Json];

      await supabase
        .from("interviews")
        .update({ pipeline_log: updatedLog })
        .eq("id", interviewId);
    }
  } catch (err) {
    console.error(
      `[TRACE:pipeline:persist-error] interview=${interviewId}`,
      err,
    );
  }
}

/**
 * Log a pipeline error.
 */
export function traceError(
  interviewId: string,
  error: unknown,
  context: string,
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[TRACE:pipeline:error] interview=${interviewId} context=${context} | ${message}`,
  );
}

/**
 * Log a Google API call with latency.
 */
export function traceGoogleApi(
  service: "calendar" | "meet" | "drive",
  method: string,
  status: number,
  latencyMs: number,
  metadata?: Record<string, unknown>,
): void {
  const meta = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.log(
    `[GOOGLE:${service}] ${method} status=${status} latency=${latencyMs}ms${meta}`,
  );
}
