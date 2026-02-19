import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@reconnect/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateStageSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z
    .enum([
      "screening",
      "technical",
      "behavioral",
      "cultural",
      "final",
      "custom",
    ])
    .optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  description: z.string().max(2000).optional(),
  focus_areas: z
    .array(
      z.object({
        name: z.string().max(200),
        description: z.string().max(500),
        weight: z.number().int().min(1).max(4),
        rationale: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(5)
    .optional(),
  suggested_questions: z
    .array(
      z.object({
        question: z.string().max(1000),
        purpose: z.string().max(500),
        look_for: z.array(z.string().max(200)),
        focus_area: z.string().max(200),
      }),
    )
    .optional(),
  rationale: z.string().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> },
) {
  const { id, stageId } = await params;

  if (!UUID_REGEX.test(id) || !UUID_REGEX.test(stageId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
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
        "[stages/PATCH] Profile fetch failed:",
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

    const parsed = updateStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.duration_minutes !== undefined)
      updateData.duration_minutes = parsed.data.duration_minutes;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.focus_areas !== undefined)
      updateData.focus_areas = parsed.data.focus_areas as unknown as Json;
    if (parsed.data.suggested_questions !== undefined)
      updateData.suggested_questions =
        parsed.data.suggested_questions as unknown as Json;

    const { data, error } = await supabase
      .from("interview_stages")
      .update(updateData)
      .eq("id", stageId)
      .eq("playbook_id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Stage not found" },
          { status: 404 },
        );
      }
      console.error("[stages/PATCH] Update failed:", error.message);
      return NextResponse.json(
        { error: "Failed to update stage" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[stages/PATCH] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> },
) {
  const { id, stageId } = await params;

  if (!UUID_REGEX.test(id) || !UUID_REGEX.test(stageId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
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
        "[stages/DELETE] Profile fetch failed:",
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

    const { data, error } = await supabase
      .from("interview_stages")
      .delete()
      .eq("id", stageId)
      .eq("playbook_id", id)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Stage not found" },
          { status: 404 },
        );
      }
      console.error("[stages/DELETE] Delete failed:", error.message);
      return NextResponse.json(
        { error: "Failed to delete stage" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Stage not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[stages/DELETE] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
