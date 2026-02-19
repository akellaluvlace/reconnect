import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@reconnect/database";

const MAX_JSONB_SIZE = 100_000; // ~100KB

function jsonbSizeCheck(val: Record<string, unknown> | undefined) {
  if (!val) return true;
  return JSON.stringify(val).length <= MAX_JSONB_SIZE;
}

const createPlaybookSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  department: z.string().max(200).optional(),
  level: z.string().max(100).optional(),
  industry: z.string().max(200).optional(),
  skills: z.array(z.string().max(100)).max(50).optional(),
  location: z.string().max(200).optional(),
  job_description: z
    .record(z.unknown())
    .optional()
    .refine(jsonbSizeCheck, "Job description payload too large"),
  market_insights: z
    .record(z.unknown())
    .optional()
    .refine(jsonbSizeCheck, "Market insights payload too large"),
  candidate_profile: z
    .record(z.unknown())
    .optional()
    .refine(jsonbSizeCheck, "Candidate profile payload too large"),
  settings: z
    .record(z.unknown())
    .optional()
    .refine(jsonbSizeCheck, "Settings payload too large"),
});

export async function GET() {
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
      .from("playbooks")
      .select("id, title, department, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[playbooks/GET] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to load playbooks" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[playbooks/GET] Unexpected error:", err);
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
    } catch (parseError) {
      console.warn("[playbooks/POST] Invalid JSON:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = createPlaybookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[playbooks/POST] Profile fetch failed:",
        profileError?.message,
      );
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    if (!["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: "User has no organization" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("playbooks")
      .insert({
        title: parsed.data.title,
        department: parsed.data.department ?? null,
        level: parsed.data.level ?? null,
        industry: parsed.data.industry ?? null,
        skills: (parsed.data.skills as Json) ?? null,
        location: parsed.data.location ?? null,
        job_description: (parsed.data.job_description as Json) ?? null,
        market_insights: (parsed.data.market_insights as Json) ?? null,
        candidate_profile: (parsed.data.candidate_profile as Json) ?? null,
        settings: (parsed.data.settings as Json) ?? null,
        organization_id: profile.organization_id,
        created_by: user.id,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("[playbooks/POST] Insert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to create playbook" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[playbooks/POST] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
