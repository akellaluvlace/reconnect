import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPrepEmail, sendCustomBodyEmail } from "@/lib/email/resend-client";
import type { PrepEmailStage } from "@/lib/email/templates";

export const maxDuration = 30;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid collaborator ID" },
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

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const playbookId =
      body && typeof body === "object" && "playbook_id" in body
        ? (body as { playbook_id: unknown }).playbook_id
        : undefined;

    if (!playbookId || typeof playbookId !== "string" || !UUID_REGEX.test(playbookId)) {
      return NextResponse.json(
        { error: "playbook_id is required and must be a valid UUID" },
        { status: 400 },
      );
    }

    // Fetch user profile for org check
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[collaborators/send-prep] Profile fetch failed:",
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

    // Fetch collaborator
    const { data: collaborator, error: collabError } = await supabase
      .from("collaborators")
      .select("id, email, name, assigned_stages")
      .eq("id", id)
      .single();

    if (collabError || !collaborator) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 },
      );
    }

    // Fetch playbook (title + org check)
    const { data: playbook, error: playbookError } = await supabase
      .from("playbooks")
      .select("title, organization_id")
      .eq("id", playbookId)
      .single();

    if (playbookError || !playbook) {
      return NextResponse.json(
        { error: "Playbook not found" },
        { status: 404 },
      );
    }

    if (playbook.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch stages
    const { data: rawStages, error: stagesError } = await supabase
      .from("interview_stages")
      .select("id, name, type, duration_minutes, order_index, focus_areas, suggested_questions")
      .eq("playbook_id", playbookId)
      .order("order_index", { ascending: true });

    if (stagesError) {
      console.error(
        "[collaborators/send-prep] Stages fetch failed:",
        stagesError.message,
      );
      return NextResponse.json(
        { error: "Failed to fetch stages" },
        { status: 500 },
      );
    }

    // Filter to collaborator's assigned stages (null = all)
    const assignedStages = collaborator.assigned_stages as string[] | null;
    const filteredStages = assignedStages && assignedStages.length > 0
      ? (rawStages ?? []).filter((s) => assignedStages.includes(s.id))
      : (rawStages ?? []);

    // Format stages for email template
    const emailStages: PrepEmailStage[] = filteredStages.map((s) => {
      const focusAreas = parseFocusAreas(s.focus_areas);
      const questions = parseQuestions(s.suggested_questions);
      return {
        name: s.name,
        type: s.type ?? "interview",
        duration_minutes: s.duration_minutes ?? 60,
        focus_areas: focusAreas,
        questions: questions,
      };
    });

    // Send email — use custom_body if provided, otherwise auto-generate
    const customBody =
      body && typeof body === "object" && "custom_body" in body
        ? (body as { custom_body: unknown }).custom_body
        : undefined;

    const result = typeof customBody === "string" && customBody.trim()
      ? await sendCustomBodyEmail({
          to: collaborator.email,
          subject: `Interview Prep: ${playbook.title}`,
          body: customBody,
        })
      : await sendPrepEmail({
          to: collaborator.email,
          interviewerName: collaborator.name ?? collaborator.email,
          playbookTitle: playbook.title,
          stages: emailStages,
        });

    if (!result.success) {
      console.error("[collaborators/send-prep] Email failed:", result.error);
      return NextResponse.json(
        { error: `Failed to send prep email: ${result.error ?? "unknown error"}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[collaborators/send-prep] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// JSONB helpers — focus_areas and suggested_questions come as JSONB from DB
// ---------------------------------------------------------------------------

function parseFocusAreas(
  raw: unknown,
): Array<{ name: string; description: string; weight: number }> {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.map((fa: Record<string, unknown>) => ({
      name: String(fa.name ?? ""),
      description: String(fa.description ?? ""),
      weight: Number(fa.weight ?? 1),
    }));
  } catch {
    return [];
  }
}

function parseQuestions(
  raw: unknown,
): Array<{
  question: string;
  purpose: string;
  focus_area?: string;
  look_for?: string[];
}> {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.map((q: Record<string, unknown>) => ({
      question: String(q.question ?? ""),
      purpose: String(q.purpose ?? ""),
      ...(q.focus_area ? { focus_area: String(q.focus_area) } : {}),
      ...(Array.isArray(q.look_for) ? { look_for: q.look_for.map(String) } : {}),
    }));
  } catch {
    return [];
  }
}
