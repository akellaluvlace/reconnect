import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@reconnect/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_JSONB_SIZE = 100_000; // ~100KB

function jsonbSizeCheck(val: Record<string, unknown> | undefined) {
  if (!val) return true;
  return JSON.stringify(val).length <= MAX_JSONB_SIZE;
}

const updatePlaybookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  department: z.string().max(200).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  level: z.string().max(100).optional(),
  industry: z.string().max(200).optional(),
  skills: z.array(z.string().max(100)).max(50).optional(),
  location: z.string().max(200).optional(),
  job_description: z
    .record(z.string(), z.unknown())
    .optional()
    .refine(jsonbSizeCheck, "Job description payload too large"),
  market_insights: z
    .record(z.string(), z.unknown())
    .optional()
    .refine(jsonbSizeCheck, "Market insights payload too large"),
  candidate_profile: z
    .record(z.string(), z.unknown())
    .optional()
    .refine(jsonbSizeCheck, "Candidate profile payload too large"),
  settings: z
    .record(z.string(), z.unknown())
    .optional()
    .refine(jsonbSizeCheck, "Settings payload too large"),
  hiring_strategy: z
    .record(z.string(), z.unknown())
    .optional()
    .refine(jsonbSizeCheck, "Hiring strategy payload too large"),
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
      .from("playbooks")
      .select("*, interview_stages(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Playbook not found" },
          { status: 404 },
        );
      }
      console.error("[playbooks/GET/:id] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to load playbook" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[playbooks/GET/:id] Unexpected error:", err);
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
        "[playbooks/PATCH] Profile fetch failed:",
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
    } catch (parseError) {
      console.warn("[playbooks/PATCH] Invalid JSON:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = updatePlaybookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.department !== undefined)
      updateData.department = parsed.data.department;
    if (parsed.data.status !== undefined)
      updateData.status = parsed.data.status;
    if (parsed.data.level !== undefined)
      updateData.level = parsed.data.level;
    if (parsed.data.industry !== undefined)
      updateData.industry = parsed.data.industry;
    if (parsed.data.skills !== undefined)
      updateData.skills = parsed.data.skills as Json;
    if (parsed.data.location !== undefined)
      updateData.location = parsed.data.location;
    if (parsed.data.job_description !== undefined)
      updateData.job_description = parsed.data.job_description as Json;
    if (parsed.data.market_insights !== undefined)
      updateData.market_insights = parsed.data.market_insights as Json;
    if (parsed.data.candidate_profile !== undefined)
      updateData.candidate_profile = parsed.data.candidate_profile as Json;
    if (parsed.data.settings !== undefined)
      updateData.settings = parsed.data.settings as Json;
    if (parsed.data.hiring_strategy !== undefined)
      updateData.hiring_strategy = parsed.data.hiring_strategy as Json;

    const { data, error } = await supabase
      .from("playbooks")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Playbook not found" },
          { status: 404 },
        );
      }
      console.error("[playbooks/PATCH] Update failed:", error.message);
      return NextResponse.json(
        { error: "Failed to update playbook" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[playbooks/PATCH] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(
        "[playbooks/DELETE] Profile fetch failed:",
        profileError.message,
      );
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("playbooks")
      .update({ status: "archived" as const })
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Playbook not found" },
          { status: 404 },
        );
      }
      console.error("[playbooks/DELETE] Archive failed:", error.message);
      return NextResponse.json(
        { error: "Failed to archive playbook" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Playbook not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[playbooks/DELETE] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
