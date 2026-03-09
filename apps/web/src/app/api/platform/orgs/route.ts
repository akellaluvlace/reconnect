import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isPlatformAdmin } from "@/lib/admin/platform-admin";
import { createOrgSchema } from "@/lib/admin/platform-schemas";

/**
 * Generate a URL-safe slug from an org name.
 * Appends a short random suffix to avoid collisions.
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isPlatformAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: orgs, error: orgsError } = await serviceClient
      .from("organizations")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false });

    if (orgsError) {
      console.error("[platform/orgs/GET] Orgs query failed:", orgsError.message);
      return NextResponse.json(
        { error: "Failed to load organizations" },
        { status: 500 },
      );
    }

    if (!orgs || orgs.length === 0) {
      return NextResponse.json([]);
    }

    const orgIds = orgs.map((o) => o.id);

    const { data: users, error: usersError } = await serviceClient
      .from("users")
      .select("organization_id")
      .in("organization_id", orgIds);

    if (usersError) {
      console.error(
        "[platform/orgs/GET] User counts query failed:",
        usersError.message,
      );
      // Return orgs without counts rather than failing entirely
      return NextResponse.json(
        orgs.map((o) => ({ ...o, user_count: 0 })),
      );
    }

    const countMap = new Map<string, number>();
    for (const u of users ?? []) {
      if (u.organization_id) {
        countMap.set(
          u.organization_id,
          (countMap.get(u.organization_id) ?? 0) + 1,
        );
      }
    }

    const result = orgs.map((o) => ({
      ...o,
      user_count: countMap.get(o.id) ?? 0,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[platform/orgs/GET] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isPlatformAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const serviceClient = createServiceRoleClient();

    const slug = generateSlug(parsed.data.name);

    const { data, error } = await serviceClient
      .from("organizations")
      .insert({ name: parsed.data.name, slug })
      .select()
      .single();

    if (error) {
      console.error("[platform/orgs/POST] Insert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[platform/orgs/POST] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
