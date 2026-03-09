import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReminderEmail, sendCustomBodyEmail } from "@/lib/email/resend-client";
import { interpolateTemplate } from "@/lib/admin/email-interpolation";

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

    const message =
      body && typeof body === "object" && "message" in body
        ? (body as { message: unknown }).message
        : undefined;

    const validMessage =
      message && typeof message === "string" && message.trim().length > 0
        ? message.trim()
        : undefined;

    // Fetch user profile for org check
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[collaborators/send-reminder] Profile fetch failed:",
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
      .select("id, email, name, invite_token")
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

    // Check for CMS email template (reminder type) — silently fall back on error
    let cmsTemplate: { subject: string; body_html: string } | null = null;
    try {
      const { data } = await supabase
        .from("cms_email_templates")
        .select("subject, body_html")
        .eq("organization_id", profile.organization_id)
        .eq("template_type", "reminder")
        .eq("is_active", true)
        .limit(1)
        .single();
      cmsTemplate = data;
    } catch {
      // CMS table query failed — fall back to default
    }

    // Build template variables for CMS interpolation
    const templateVars: Record<string, string> = {
      candidate_name: playbook.title.split(" - ")[0] || playbook.title,
      role_title: playbook.title,
      interviewer_name: collaborator.name ?? collaborator.email,
      playbook_link: collaborator.invite_token
        ? `${process.env.NEXT_PUBLIC_APP_URL || "https://app.axil.ie"}/auth/collaborator?token=${collaborator.invite_token}`
        : `${process.env.NEXT_PUBLIC_APP_URL || "https://app.axil.ie"}/playbooks/${playbookId}`,
    };

    // Send reminder — priority: custom_body > CMS template > default auto-generate
    const customBody =
      body && typeof body === "object" && "custom_body" in body
        ? (body as { custom_body: unknown }).custom_body
        : undefined;

    let result;
    if (typeof customBody === "string" && customBody.trim()) {
      // User provided custom body — use it as-is
      result = await sendCustomBodyEmail({
        to: collaborator.email,
        subject: `Feedback Reminder: ${playbook.title}`,
        body: customBody,
      });
    } else if (cmsTemplate) {
      // CMS template found — interpolate and send
      result = await sendCustomBodyEmail({
        to: collaborator.email,
        subject: interpolateTemplate(cmsTemplate.subject, templateVars),
        body: interpolateTemplate(cmsTemplate.body_html, templateVars),
      });
    } else {
      // No CMS template — use built-in auto-generate
      result = await sendReminderEmail({
        to: collaborator.email,
        interviewerName: collaborator.name ?? collaborator.email,
        playbookTitle: playbook.title,
        message: validMessage,
      });
    }

    if (!result.success) {
      console.error("[collaborators/send-reminder] Email failed:", result.error);
      return NextResponse.json(
        { error: "Failed to send reminder" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[collaborators/send-reminder] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
