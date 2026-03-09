import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isPlatformAdmin } from "@/lib/admin/platform-admin";

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

    const [orgsResult, usersResult, playbooksResult] = await Promise.all([
      serviceClient
        .from("organizations")
        .select("id", { count: "exact", head: true }),
      serviceClient
        .from("users")
        .select("id", { count: "exact", head: true }),
      serviceClient
        .from("playbooks")
        .select("id", { count: "exact", head: true }),
    ]);

    if (orgsResult.error) {
      console.error(
        "[platform/stats/GET] Orgs count failed:",
        orgsResult.error.message,
      );
    }
    if (usersResult.error) {
      console.error(
        "[platform/stats/GET] Users count failed:",
        usersResult.error.message,
      );
    }
    if (playbooksResult.error) {
      console.error(
        "[platform/stats/GET] Playbooks count failed:",
        playbooksResult.error.message,
      );
    }

    return NextResponse.json({
      total_orgs: orgsResult.count ?? 0,
      total_users: usersResult.count ?? 0,
      total_playbooks: playbooksResult.count ?? 0,
    });
  } catch (err) {
    console.error("[platform/stats/GET] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
