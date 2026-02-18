import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  generateDeepInsights,
  PROMPT_VERSIONS,
  AIError,
} from "@reconnect/ai";
import type { Json } from "@reconnect/database";

/** Cache key is a SHA-256 hex hash */
const CacheKeySchema = z.string().regex(/^[a-f0-9]{64}$/);

const ActionSchema = z.enum(["poll", "trigger"]);

/**
 * GET /api/ai/market-insights/[id]?action=poll
 * Poll deep research status by cache_key.
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
  const cacheKeyParsed = CacheKeySchema.safeParse(resolvedParams.id);
  if (!cacheKeyParsed.success) {
    return NextResponse.json({ error: "Invalid cache key" }, { status: 400 });
  }

  const cacheKey = cacheKeyParsed.data;
  const actionParsed = ActionSchema.safeParse(
    req.nextUrl.searchParams.get("action") ?? "poll",
  );

  if (!actionParsed.success) {
    return NextResponse.json(
      { error: "Invalid action — must be 'poll' or 'trigger'" },
      { status: 400 },
    );
  }

  const action = actionParsed.data;

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
    const { data: deepCached, error: pollError } = await supabase
      .from("ai_research_cache")
      .select("results, sources, created_at")
      .eq("organization_id", orgId)
      .eq("cache_key", cacheKey)
      .eq("phase", "deep")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (pollError && pollError.code !== "PGRST116") {
      console.error("Poll cache read error:", pollError);
    }

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

  // action === "trigger" — note: GET with side effects is not ideal,
  // but kept for backwards compatibility. Consider POST in future.
  return triggerDeepResearch(supabase, orgId, cacheKey);
}

/**
 * POST /api/ai/market-insights/[id]
 * Trigger deep research by cache_key (preferred over GET ?action=trigger).
 */
export async function POST(
  _req: NextRequest,
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
  const cacheKeyParsed = CacheKeySchema.safeParse(resolvedParams.id);
  if (!cacheKeyParsed.success) {
    return NextResponse.json({ error: "Invalid cache key" }, { status: 400 });
  }

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

  return triggerDeepResearch(supabase, userData.organization_id, cacheKeyParsed.data);
}

/** Shared trigger logic for both GET and POST */
async function triggerDeepResearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  cacheKey: string,
) {
  const { data: quickCached, error: quickError } = await supabase
    .from("ai_research_cache")
    .select("search_params")
    .eq("organization_id", orgId)
    .eq("cache_key", cacheKey)
    .eq("phase", "quick")
    .single();

  if (quickError && quickError.code !== "PGRST116") {
    console.error("Quick cache read error:", quickError);
  }

  if (!quickCached) {
    return NextResponse.json(
      { error: "Quick research not found — run market-insights first" },
      { status: 404 },
    );
  }

  // Validate the cached search_params before using
  const SearchParamsSchema = z.object({
    role: z.string(),
    level: z.string(),
    industry: z.string(),
    location: z.string(),
    market_focus: z.enum(["irish", "global"]).optional(),
  });

  const paramsParsed = SearchParamsSchema.safeParse(quickCached.search_params);
  if (!paramsParsed.success) {
    console.error("Corrupted search_params in cache:", quickCached.search_params);
    return NextResponse.json(
      { error: "Cached search params are corrupted — rerun market-insights" },
      { status: 500 },
    );
  }

  const input = paramsParsed.data;

  try {
    const deepInsights = await generateDeepInsights(input);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: upsertError } = await supabase
      .from("ai_research_cache")
      .upsert(
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

    if (upsertError) {
      console.error("Failed to cache deep insights:", upsertError);
    }

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
