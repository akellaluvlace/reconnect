import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_RESULTS = 8;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Limit query length to prevent abuse
    const query = q.slice(0, 100);

    // Get user's org_id
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error(
        "[role-suggestions] Profile fetch failed:",
        profileError?.message,
      );
      return NextResponse.json(
        { error: "User organization not found" },
        { status: 403 },
      );
    }

    const orgId = profile.organization_id;

    // Query cache for distinct roles matching the query
    // search_params is JSONB with { role, level, industry, location }
    const { data: cacheRoles, error: cacheError } = await supabase
      .from("ai_research_cache")
      .select("search_params")
      .eq("organization_id", orgId)
      .gt("expires_at", new Date().toISOString())
      .ilike("search_params->>role", `%${query}%`)
      .limit(MAX_RESULTS);

    if (cacheError) {
      console.error("[role-suggestions] Cache query error:", cacheError.message);
    }

    // Extract distinct role names from cache results
    const cachedRoleSet = new Set<string>();
    const cachedRolesLower = new Set<string>();
    if (cacheRoles) {
      for (const row of cacheRoles) {
        const params = row.search_params as Record<string, unknown> | null;
        const role =
          params && typeof params === "object" && typeof params.role === "string"
            ? params.role.trim()
            : null;
        if (role && !cachedRolesLower.has(role.toLowerCase())) {
          cachedRoleSet.add(role);
          cachedRolesLower.add(role.toLowerCase());
        }
      }
    }

    // Query playbooks for distinct titles matching the query
    const { data: playbookRoles, error: playbookError } = await supabase
      .from("playbooks")
      .select("title")
      .eq("organization_id", orgId)
      .ilike("title", `%${query}%`)
      .limit(MAX_RESULTS);

    if (playbookError) {
      console.error(
        "[role-suggestions] Playbook query error:",
        playbookError.message,
      );
    }

    // Merge and deduplicate (case-insensitive)
    const suggestions: Array<{ role: string; cached: boolean }> = [];
    const seenLower = new Set<string>();

    // Add cached roles first (they have the "cached" advantage)
    for (const role of cachedRoleSet) {
      if (suggestions.length >= MAX_RESULTS) break;
      const lower = role.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        suggestions.push({ role, cached: true });
      }
    }

    // Add playbook roles that aren't already in the list
    if (playbookRoles) {
      const seenTitles = new Set<string>();
      for (const row of playbookRoles) {
        if (suggestions.length >= MAX_RESULTS) break;
        const title = row.title?.trim();
        if (!title) continue;
        const lower = title.toLowerCase();
        if (!seenLower.has(lower) && !seenTitles.has(lower)) {
          seenLower.add(lower);
          seenTitles.add(lower);
          suggestions.push({ role: title, cached: false });
        }
      }
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[role-suggestions] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
