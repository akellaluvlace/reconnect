import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/email-templates?type=prep|reminder
 *
 * Returns the active CMS email template for the user's org.
 * Any authenticated user in an org can read templates (not admin-only).
 * Used by the email preview modals in the Alignment chapter.
 */
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");
    if (!type || !["prep", "reminder"].includes(type)) {
      return NextResponse.json(
        { error: "type query param must be 'prep' or 'reminder'" },
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

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("cms_email_templates")
      .select("id, name, template_type, subject, body_html")
      .eq("organization_id", profile.organization_id)
      .eq("template_type", type)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (error || !data) {
      // No template found — not an error, just return null
      return NextResponse.json({ template: null });
    }

    return NextResponse.json({ template: data });
  } catch (err) {
    console.error("[email-templates/GET] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
