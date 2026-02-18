import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  generateQuickInsights,
  generateCacheKey,
  type MarketInsightsInput,
  PROMPT_VERSIONS,
  AI_CONFIG,
  AIError,
} from "@reconnect/ai";
import type { Json } from "@reconnect/database";

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  market_focus: z.enum(["irish", "global"]).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (parseError) {
    console.warn("Invalid JSON in market-insights request:", parseError);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input: MarketInsightsInput = parsed.data;
  const cacheKey = generateCacheKey(input);

  // Get user's org_id for cache scoping
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

  // Check cache for quick phase
  const { data: cached, error: cacheError } = await supabase
    .from("ai_research_cache")
    .select("results, sources, created_at")
    .eq("organization_id", orgId)
    .eq("cache_key", cacheKey)
    .eq("phase", "quick")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (cacheError && cacheError.code !== "PGRST116") {
    console.error("Cache read error:", cacheError);
  }

  if (cached) {
    // Check if deep research also cached
    const { data: deepCached } = await supabase
      .from("ai_research_cache")
      .select("id")
      .eq("organization_id", orgId)
      .eq("cache_key", cacheKey)
      .eq("phase", "deep")
      .gt("expires_at", new Date().toISOString())
      .single();

    return NextResponse.json({
      data: cached.results,
      phase: "quick",
      cached: true,
      deep_research_available: !!deepCached,
      deep_research_id: deepCached?.id ?? null,
      cache_key: cacheKey,
    });
  }

  // Phase 1: Generate quick insights
  const modelUsed = AI_CONFIG.marketInsightsQuick.model;

  try {
    const quickInsights = await generateQuickInsights(input);

    // Cache the quick result
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: upsertError } = await supabase
      .from("ai_research_cache")
      .upsert(
        {
          organization_id: orgId,
          cache_key: cacheKey,
          phase: "quick",
          search_params: input as unknown as Json,
          results: quickInsights as unknown as Json,
          sources: [] as Json,
          model_used: modelUsed,
          prompt_version: PROMPT_VERSIONS.marketInsights,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "organization_id,cache_key,phase" },
      );

    if (upsertError) {
      console.error("Failed to cache quick insights:", upsertError);
    }

    return NextResponse.json({
      data: quickInsights,
      phase: "quick",
      cached: false,
      cache_key: cacheKey,
      metadata: {
        model_used: modelUsed,
        prompt_version: PROMPT_VERSIONS.marketInsights,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Market insights quick phase error:", error);
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to generate market insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
