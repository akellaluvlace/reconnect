import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

const InviteSchema = z.object({
  playbook_id: z.string().uuid(),
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  role: z.enum(["viewer", "interviewer"]),
  assigned_stages: z.array(z.string().uuid()).max(20).optional(),
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

    // Check role (admin/manager only)
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[collaborators/invite] Profile fetch failed:",
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

    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    // Verify playbook belongs to user's organization (defense-in-depth beyond RLS)
    const { data: playbook, error: playbookError } = await supabase
      .from("playbooks")
      .select("organization_id")
      .eq("id", parsed.data.playbook_id)
      .single();

    if (playbookError || !playbook || playbook.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: "Playbook not found" },
        { status: 404 },
      );
    }

    const inviteToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await supabase
      .from("collaborators")
      .insert({
        playbook_id: parsed.data.playbook_id,
        email: parsed.data.email,
        name: parsed.data.name ?? null,
        role: parsed.data.role,
        assigned_stages: parsed.data.assigned_stages ?? null,
        invite_token: inviteToken,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error("[collaborators/invite] Insert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 },
      );
    }

    // Send invite email (non-fatal — invite still succeeds if email fails)
    try {
      // Fetch playbook title for the email (not the UUID)
      const { data: playbook } = await supabase
        .from("playbooks")
        .select("title")
        .eq("id", parsed.data.playbook_id)
        .single();

      const { sendCollaboratorInvite } = await import("@/lib/email/resend-client");
      const magicLink = `${req.nextUrl.origin}/auth/collaborator?token=${inviteToken}`;
      await sendCollaboratorInvite({
        to: parsed.data.email,
        inviterName: user.email ?? "A team member",
        playbookTitle: playbook?.title ?? "Hiring Playbook",
        magicLink,
      });
    } catch (emailErr) {
      console.error("[collaborators/invite] Email send failed:", emailErr);
      // Non-fatal: invite was created, email just didn't send
    }

    return NextResponse.json({ collaborator: data }, { status: 201 });
  } catch (error) {
    console.error("[collaborators/invite] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
