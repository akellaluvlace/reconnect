import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createCandidateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  playbook_id: z.string().uuid(),
});

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

    // Only admin/manager can create candidates
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createCandidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, email, playbook_id } = parsed.data;

    // Verify user has access to this playbook (RLS handles it)
    const { data: playbook, error: pbError } = await supabase
      .from("playbooks")
      .select("id")
      .eq("id", playbook_id)
      .single();

    if (pbError || !playbook) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }

    const { data: candidate, error: insertError } = await supabase
      .from("candidates")
      .insert({ name, email: email || null, playbook_id, status: "active" })
      .select("id, name, email, status, playbook_id, created_at")
      .single();

    if (insertError) {
      console.error("[candidates] Insert failed:", insertError.message);
      return NextResponse.json({ error: "Failed to create candidate" }, { status: 500 });
    }

    return NextResponse.json({ data: candidate }, { status: 201 });
  } catch (err) {
    console.error("[candidates] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
