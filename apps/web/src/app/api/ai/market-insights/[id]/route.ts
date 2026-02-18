import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  generateDeepInsights,
  PROMPT_VERSIONS,
  AIError,
} from "@reconnect/ai";
import type { Json } from "@reconnect/database";

const ParamsSchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/ai/market-insights/[id]
 * Poll deep research status or trigger deep research by cache_key.
 *
 * Query params:
 * - ?action=poll — check if deep research is ready (id = cache_key)
 * - ?action=trigger — trigger deep research (id = cache_key)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const parsed = ParamsSchema.safeParse(resolvedParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const cacheKey = parsed.data.id;
  const action = req.nextUrl.searchParams.get("action") ?? "poll";

  // Get user's org_id
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.organization_id) {
    return NextResponse.json(
      { error: "User organization not found" },
      { status: 403 },
    );
  }

  const orgId = userData.organization_id;

  if (action === "poll") {
    const { data: deepCached } = await supabase
      .from("ai_research_cache")
      .select("results, sources, created_at")
      .eq("organization_id", orgId)
      .eq("cache_key", cacheKey)
      .eq("phase", "deep")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (deepCached) {
      return NextResponse.json({
        status: "complete",
        data: deepCached.results,
        sources: deepCached.sources,
        cached: true,
      });
    }

    return NextResponse.json({ status: "pending" });
  }

  if (action === "trigger") {
    const { data: quickCached } = await supabase
      .from("ai_research_cache")
      .select("search_params")
      .eq("organization_id", orgId)
      .eq("cache_key", cacheKey)
      .eq("phase", "quick")
      .single();

    if (!quickCached) {
      return NextResponse.json(
        { error: "Quick research not found — run market-insights first" },
        { status: 404 },
      );
    }

    const input = quickCached.search_params as {
      role: string;
      level: string;
      industry: string;
      location: string;
      market_focus?: "irish" | "global";
    };

    try {
      const deepInsights = await generateDeepInsights(input);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabase.from("ai_research_cache").upsert(
        {
          organization_id: orgId,
          cache_key: cacheKey,
          phase: "deep",
          search_params: input as unknown as Json,
          results: deepInsights as unknown as Json,
          sources: (deepInsights.sources ?? []) as unknown as Json,
          model_used: deepInsights.metadata.model_used,
          prompt_version: PROMPT_VERSIONS.marketInsights,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "organization_id,cache_key,phase" },
      );

      return NextResponse.json({
        status: "complete",
        data: deepInsights,
        cached: false,
      });
    } catch (error) {
      console.error("Deep research error:", error);
      const message =
        error instanceof AIError
          ? error.message
          : "Failed to generate deep research";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
