import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reorderSchema = z.object({
  stages: z
    .array(
      z.object({
        id: z.string().regex(UUID_REGEX, "Invalid stage ID"),
        order_index: z.number().int().min(0),
      }),
    )
    .max(20),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid playbook ID" },
      { status: 400 },
    );
  }

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
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(
        "[stages/reorder] Profile fetch failed:",
        profileError.message,
      );
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const errors = [];
    for (const stage of parsed.data.stages) {
      const { error } = await supabase
        .from("interview_stages")
        .update({ order_index: stage.order_index })
        .eq("id", stage.id)
        .eq("playbook_id", id);

      if (error) {
        console.error(
          `[stages/reorder] Update failed for ${stage.id}:`,
          error.message,
        );
        errors.push({ id: stage.id, error: "Update failed" });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Some stages failed to reorder", details: errors },
        { status: 207 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[stages/reorder] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
