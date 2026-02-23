import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pipelineLogger } from "@reconnect/ai";

/**
 * AI Health Check Endpoint
 *
 * GET /api/health/ai — returns pipeline stats and recent log entries.
 * Used for deploy verification and monitoring.
 * Requires admin auth — exposes config info and pipeline stats.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Return minimal health status for unauthenticated requests
    return NextResponse.json({ status: "ok" });
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return NextResponse.json({ status: "ok" });
  }

  const stats = pipelineLogger.getStats();
  const recentEntries = pipelineLogger.getRecentEntries(10);

  const configCheck = {
    anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
    tavily_key_set: !!process.env.TAVILY_API_KEY,
  };

  const healthy =
    configCheck.anthropic_key_set &&
    (stats.totalCalls === 0 || stats.failures / stats.totalCalls < 0.5);

  return NextResponse.json({
    status: healthy ? "healthy" : "degraded",
    config: configCheck,
    stats,
    recent: recentEntries.map((e) => ({
      timestamp: e.timestamp,
      endpoint: e.endpoint,
      model: e.model,
      latencyMs: e.latencyMs,
      tokens: `${e.inputTokens}+${e.outputTokens}`,
      stopReason: e.stopReason,
      validationPassed: e.validationPassed,
      coercionApplied: e.coercionApplied,
      error: e.error ?? null,
    })),
  });
}
