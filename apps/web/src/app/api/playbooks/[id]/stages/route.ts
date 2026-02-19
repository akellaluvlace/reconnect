import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@reconnect/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createStageSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum([
    "screening",
    "technical",
    "behavioral",
    "cultural",
    "final",
    "custom",
  ]),
  duration_minutes: z.number().int().min(5).max(480),
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

export async function GET(
  _req: NextRequest,
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

    const { data, error } = await supabase
      .from("interview_stages")
      .select("*")
      .eq("playbook_id", id)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("[stages/GET] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to load stages" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[stages/GET] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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
      console.error("[stages/POST] Profile fetch failed:", profileError.message);
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

    // Support bulk creation (array) or single stage
    const isBulk = Array.isArray(body);
    const items: unknown[] = isBulk ? (body as unknown[]) : [body];

    if (items.length > 20) {
      return NextResponse.json(
        { error: "Too many stages (max 20)" },
        { status: 400 },
      );
    }

    const parsedItems = [];
    for (const item of items) {
      const parsed = createStageSchema.safeParse(item);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", issues: parsed.error.issues },
          { status: 400 },
        );
      }
      parsedItems.push(parsed.data);
    }

    // Get current max order_index
    const { data: existing, error: indexError } = await supabase
      .from("interview_stages")
      .select("order_index")
      .eq("playbook_id", id)
      .order("order_index", { ascending: false })
      .limit(1);

    if (indexError) {
      console.error("[stages/POST] Failed to fetch max order_index:", indexError.message);
      return NextResponse.json(
        { error: "Failed to determine stage ordering" },
        { status: 500 },
      );
    }

    let nextIndex = (existing?.[0]?.order_index ?? -1) + 1;

    const results = [];
    const errors = [];

    for (const item of parsedItems) {
      const { data, error } = await supabase
        .from("interview_stages")
        .insert({
          playbook_id: id,
          name: item.name,
          type: item.type,
          duration_minutes: item.duration_minutes,
          description: item.description ?? null,
          focus_areas: (item.focus_areas ?? []) as unknown as Json,
          suggested_questions: (item.suggested_questions ?? []) as unknown as Json,
          order_index: nextIndex++,
        })
        .select()
        .single();

      if (error) {
        console.error("[stages/POST] Insert failed:", error.message);
        errors.push({ name: item.name, error: "Insert failed" });
      } else {
        results.push(data);
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: "Failed to create stages" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      isBulk ? { data: results, errors } : results[0],
      { status: 201 },
    );
  } catch (err) {
    console.error("[stages/POST] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
