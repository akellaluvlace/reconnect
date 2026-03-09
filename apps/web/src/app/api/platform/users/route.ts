import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isPlatformAdmin } from "@/lib/admin/platform-admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Escape special characters in a string before using it in ilike patterns.
 * Prevents user input from being interpreted as SQL wildcards.
 */
function sanitizeSearchInput(input: string): string {
  return input.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id");
    const search = searchParams.get("search");

    // Validate org_id if provided
    if (orgId && !UUID_RE.test(orgId)) {
      return NextResponse.json(
        { error: "Invalid org_id format" },
        { status: 400 },
      );
    }

    let query = serviceClient
      .from("users")
      .select("id, email, name, role, organization_id, created_at")
      .order("created_at", { ascending: false });

    if (orgId) {
      query = query.eq("organization_id", orgId);
    }

    if (search) {
      const sanitized = sanitizeSearchInput(search.trim());
      if (sanitized.length > 0) {
        query = query.or(
          `name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`,
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("[platform/users/GET] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to load users" },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[platform/users/GET] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
