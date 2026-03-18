import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { tracePipeline } from "@/lib/google/pipeline-tracer";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Org ownership check: RLS-scoped client ensures interview belongs to user's org
    const { data: rlsCheck } = await supabase
      .from("interviews")
      .select("id")
      .eq("id", id)
      .single();
    if (!rlsCheck) {
      return NextResponse.json(
        { error: "Interview not found or not in your organization" },
        { status: 404 },
      );
    }

    const serviceClient = createServiceRoleClient();

    // Optimistic lock: only transition from valid states
    const { data: updated, error } = await serviceClient
      .from("interviews")
      .update({ recording_status: "no_consent" })
      .eq("id", id)
      .in("recording_status", ["scheduled", "pending"])
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json(
        {
          error:
            "Interview not found or cannot be marked no-consent from current state",
        },
        { status: 404 },
      );
    }

    // The .in() filter constrains the prior state to "scheduled" or "pending"
    // After the update, recording_status is already "no_consent", so derive from the filter
    const priorState =
      updated.recording_status === "no_consent" ? "scheduled/pending" : updated.recording_status;
    await tracePipeline(id, {
      from: priorState,
      to: "no_consent",
      detail:
        "Manager marked no-consent. Synthesis will use feedback only.",
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[interviews/no-consent] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
