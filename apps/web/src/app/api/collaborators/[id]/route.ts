import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { notifyCollaborator } from "@/lib/notifications";
import { audit } from "@/lib/audit";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PatchSchema = z.object({
  assigned_stages: z.array(z.string().uuid()).max(20).nullable(),
});

export async function DELETE(
  _req: NextRequest,
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

    // Check role (admin/manager only)
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[collaborators/DELETE] Profile fetch failed:",
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

    const { error } = await supabase
      .from("collaborators")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[collaborators/DELETE] Delete failed:", error.message);
      return NextResponse.json(
        { error: "Failed to revoke invitation" },
        { status: 500 },
      );
    }

    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "delete",
      table: "collaborators",
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[collaborators/DELETE] Error:", error);
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

    // Check role (admin/manager only)
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[collaborators/PATCH] Profile fetch failed:",
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("collaborators")
      .update({ assigned_stages: parsed.data.assigned_stages })
      .eq("id", id);

    if (error) {
      console.error("[collaborators/PATCH] Update failed:", error.message);
      return NextResponse.json(
        { error: "Failed to update collaborator" },
        { status: 500 },
      );
    }

    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "update",
      table: "collaborators",
      recordId: id,
      metadata: { assigned_stages: parsed.data.assigned_stages },
    });

    // Fire-and-forget: notify collaborator about stage assignment
    if (
      parsed.data.assigned_stages &&
      parsed.data.assigned_stages.length > 0
    ) {
      // Resolve stage names and collaborator details for the notification
      const { data: stages } = await supabase
        .from("interview_stages")
        .select("name")
        .in("id", parsed.data.assigned_stages);

      const { data: collaborator } = await supabase
        .from("collaborators")
        .select("name, invite_token")
        .eq("id", id)
        .single();

      const stageNames =
        stages?.map((s) => s.name).join(", ") ?? "Interview stages";
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "https://app.axil.ie";

      notifyCollaborator({
        collaboratorId: id,
        type: "stage_assigned",
        data: {
          collaboratorName: collaborator?.name ?? "",
          stageNames,
          prepLink: `${appUrl}/auth/collaborator/accept?token=${collaborator?.invite_token ?? ""}`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[collaborators/PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
