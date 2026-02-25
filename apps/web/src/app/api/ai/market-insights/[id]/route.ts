import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  generateDeepInsights,
  PROMPT_VERSIONS,
  AIError,
} from "@reconnect/ai";
import type { Json } from "@reconnect/database";

// Vercel Pro: allow up to 300s for deep research (60-80s typical, 120s+ possible)
export const maxDuration = 300;

/** Cache key is a SHA-256 hex hash */
const CacheKeySchema = z.string().regex(/^[a-f0-9]{64}$/);

const ActionSchema = z.enum(["poll"]);

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

  // Only "poll" is valid for GET — use POST to trigger deep research
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/**
 * POST /api/ai/market-insights/[id]
 * Trigger deep research by cache_key (preferred over GET ?action=trigger).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[deep-research:POST] Unauthorized — no user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[deep-research:POST] User:", user.id);

  const resolvedParams = await params;
  const cacheKeyParsed = CacheKeySchema.safeParse(resolvedParams.id);
  if (!cacheKeyParsed.success) {
    console.log("[deep-research:POST] Invalid cache key:", resolvedParams.id?.slice(0, 20));
    return NextResponse.json({ error: "Invalid cache key" }, { status: 400 });
  }

  console.log("[deep-research:POST] cache_key:", cacheKeyParsed.data.slice(0, 16) + "...");

  // Optional: playbook_id to write deep results back to the playbook
  let playbookId: string | undefined;
  try {
    const body = await req.json();
    const parsed = z.object({ playbook_id: z.string().uuid() }).safeParse(body);
    if (parsed.success) {
      playbookId = parsed.data.playbook_id;
    }
    console.log("[deep-research:POST] playbook_id:", playbookId ?? "not provided");
  } catch {
    console.log("[deep-research:POST] No body / invalid JSON (playbook_id is optional)");
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.organization_id) {
    console.log("[deep-research:POST] Org not found for user:", user.id, userError?.message);
    return NextResponse.json(
      { error: "User organization not found" },
      { status: 403 },
    );
  }

  const orgId = userData.organization_id;

  console.log("[deep-research:POST] Accepted — starting background deep research for org:", orgId);

  // Use after() to keep the serverless function alive after sending the 202 response.
  // Without this, Vercel kills the function as soon as the response is sent.
  after(async () => {
    try {
      await triggerDeepResearch(supabase, orgId, cacheKeyParsed.data, playbookId);
      console.log("[deep-research:BG] Finished successfully");
    } catch (err) {
      console.error("[deep-research:BG] Unhandled error:", err);
    }
  });

  return NextResponse.json({ status: "accepted" }, { status: 202 });
}

/** Shared trigger logic for both GET and POST */
async function triggerDeepResearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  cacheKey: string,
  playbookId?: string,
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
    console.log("[deep-research] Quick cache not found for key:", cacheKey.slice(0, 16) + "...", "org:", orgId);
    return NextResponse.json(
      { error: "Quick research not found — run market-insights first" },
      { status: 404 },
    );
  }

  console.log("[deep-research] Found quick cache, search_params:", JSON.stringify(quickCached.search_params).slice(0, 100));

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
    console.error("[deep-research] Corrupted search_params in cache:", quickCached.search_params);
    return NextResponse.json(
      { error: "Cached search params are corrupted — rerun market-insights" },
      { status: 500 },
    );
  }

  const input = paramsParsed.data;

  try {
    console.log("[deep-research] Starting generateDeepInsights for:", input.role, input.level, input.industry);
    const startTime = Date.now();
    const deepInsights = await generateDeepInsights(input);
    console.log("[deep-research] Deep insights generated in", ((Date.now() - startTime) / 1000).toFixed(1) + "s, sources:", deepInsights.sources?.length ?? 0);

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

    // Write deep results back to the playbook so the UI polling picks it up
    if (playbookId) {
      console.log("[deep-research] Writing deep results back to playbook:", playbookId);
      const { error: playbookError } = await supabase
        .from("playbooks")
        .update({ market_insights: deepInsights as unknown as Json })
        .eq("id", playbookId);

      if (playbookError) {
        console.error("[deep-research] Failed to update playbook:", playbookError);
      } else {
        console.log("[deep-research] Playbook updated successfully");
      }
    }

    console.log("[deep-research] DONE — returning success");
    return NextResponse.json({
      status: "complete",
      data: deepInsights,
      cached: false,
    });
  } catch (error) {
    console.error("[deep-research] FAILED:", error instanceof Error ? error.message : error);
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to generate deep research";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
