import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@reconnect/database";

const CreateFeedbackSchema = z.object({
  interview_id: z.string().uuid(),
  ratings: z
    .array(
      z.object({
        category: z.string().min(1).max(200),
        score: z.number().int().min(1).max(4),
        notes: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(20),
  pros: z.array(z.string().max(500)).max(20),
  cons: z.array(z.string().max(500)).max(20),
  notes: z.string().max(5000).optional(),
  focus_areas_confirmed: z.literal(true, {
    message: "Focus areas must be confirmed",
  }),
});

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

    const interviewId = req.nextUrl.searchParams.get("interview_id");
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!interviewId || !UUID_RE.test(interviewId)) {
      return NextResponse.json(
        { error: "Valid interview_id query parameter is required" },
        { status: 400 },
      );
    }

    // Determine user role for blind feedback rules
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[feedback/GET] Profile fetch failed:",
        profileError?.message,
      );
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    let query = supabase
      .from("feedback")
      .select("*")
      .eq("interview_id", interviewId);

    // Blind feedback: interviewers see only their own
    if (profile.role === "interviewer") {
      query = query.eq("interviewer_id", user.id);
    }

    const { data, error } = await query.order("submitted_at", {
      ascending: false,
    });

    if (error) {
      console.error("[feedback/GET] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[feedback/GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = CreateFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    // interviewer_id is set from auth — never from body (prevent spoofing)
    const { data, error } = await supabase
      .from("feedback")
      .insert({
        interview_id: parsed.data.interview_id,
        interviewer_id: user.id,
        ratings: parsed.data.ratings as unknown as Json,
        pros: parsed.data.pros as unknown as Json,
        cons: parsed.data.cons as unknown as Json,
        notes: parsed.data.notes ?? null,
        focus_areas_confirmed: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[feedback/POST] Insert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to submit feedback" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[feedback/POST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
