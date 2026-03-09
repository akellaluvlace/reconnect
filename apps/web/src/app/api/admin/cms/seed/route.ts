import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_LEVELS,
  DEFAULT_INDUSTRIES,
  DEFAULT_STAGE_TEMPLATES,
  DEFAULT_QUESTIONS,
} from "@/lib/admin/cms-defaults";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[cms/seed] Profile fetch failed:", profileError?.message);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: "User has no organization" },
        { status: 403 },
      );
    }

    const orgId = profile.organization_id;

    const seeded: Record<string, number> = {
      levels: 0,
      industries: 0,
      stage_templates: 0,
      questions: 0,
    };

    // --- Levels ---
    const { count: levelsCount, error: levelsError } = await supabase
      .from("cms_levels")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_active", true);

    if (levelsError) {
      console.error("[cms/seed] Levels count failed:", levelsError.message);
    }

    if (!levelsError && levelsCount === 0) {
      const rows = DEFAULT_LEVELS.map((l) => ({
        ...l,
        organization_id: orgId,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("cms_levels") as any).insert(
        rows,
      );
      if (error) {
        console.error("[cms/seed] Levels insert failed:", error.message);
      } else {
        seeded.levels = rows.length;
      }
    }

    // --- Industries ---
    const { count: industriesCount, error: industriesError } = await supabase
      .from("cms_industries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_active", true);

    if (industriesError) {
      console.error("[cms/seed] Industries count failed:", industriesError.message);
    }

    if (!industriesError && industriesCount === 0) {
      const rows = DEFAULT_INDUSTRIES.map((i) => ({
        ...i,
        organization_id: orgId,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("cms_industries") as any).insert(
        rows,
      );
      if (error) {
        console.error("[cms/seed] Industries insert failed:", error.message);
      } else {
        seeded.industries = rows.length;
      }
    }

    // --- Stage Templates ---
    const { count: templatesCount, error: templatesError } = await supabase
      .from("cms_stage_templates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_active", true);

    if (templatesError) {
      console.error("[cms/seed] Stage templates count failed:", templatesError.message);
    }

    if (!templatesError && templatesCount === 0) {
      const rows = DEFAULT_STAGE_TEMPLATES.map((t) => ({
        ...t,
        organization_id: orgId,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("cms_stage_templates") as any).insert(rows);
      if (error) {
        console.error(
          "[cms/seed] Stage templates insert failed:",
          error.message,
        );
      } else {
        seeded.stage_templates = rows.length;
      }
    }

    // --- Questions ---
    const { count: questionsCount, error: questionsError } = await supabase
      .from("cms_questions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_active", true);

    if (questionsError) {
      console.error("[cms/seed] Questions count failed:", questionsError.message);
    }

    if (!questionsError && questionsCount === 0) {
      const rows = DEFAULT_QUESTIONS.map((q) => ({
        ...q,
        organization_id: orgId,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("cms_questions") as any).insert(
        rows,
      );
      if (error) {
        console.error("[cms/seed] Questions insert failed:", error.message);
      } else {
        seeded.questions = rows.length;
      }
    }

    const totalSeeded = Object.values(seeded).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      seeded,
      message:
        totalSeeded > 0
          ? `Seeded ${totalSeeded} items across ${Object.values(seeded).filter((v) => v > 0).length} tables`
          : "All tables already have data — nothing seeded",
    });
  } catch (err) {
    console.error("[cms/seed] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
