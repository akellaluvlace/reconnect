import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@reconnect/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UpdateFeedbackSchema = z.object({
  ratings: z
    .array(
      z.object({
        category: z.string().min(1).max(200),
        score: z.number().int().min(1).max(4),
        notes: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(20)
    .optional(),
  pros: z.array(z.string().max(500)).max(20).optional(),
  cons: z.array(z.string().max(500)).max(20).optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid feedback ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine user role for blind feedback
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[feedback/GET/:id] Profile fetch failed:",
        profileError?.message,
      );
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Feedback not found" },
          { status: 404 },
        );
      }
      console.error("[feedback/GET/:id] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 },
      );
    }

    // Blind rule: interviewers can only see their own
    if (
      profile.role === "interviewer" &&
      data.interviewer_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[feedback/GET/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid feedback ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership: only the interviewer who submitted can edit
    const { data: existing, error: fetchError } = await supabase
      .from("feedback")
      .select("interviewer_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Feedback not found" },
          { status: 404 },
        );
      }
      console.error("[feedback/PATCH] Fetch failed:", fetchError.message);
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 },
      );
    }

    if (existing.interviewer_id !== user.id) {
      return NextResponse.json(
        { error: "Can only edit your own feedback" },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = UpdateFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.ratings) updateData.ratings = parsed.data.ratings as unknown as Json;
    if (parsed.data.pros) updateData.pros = parsed.data.pros as unknown as Json;
    if (parsed.data.cons) updateData.cons = parsed.data.cons as unknown as Json;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("feedback")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[feedback/PATCH] Update failed:", error.message);
      return NextResponse.json(
        { error: "Failed to update feedback" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[feedback/PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
