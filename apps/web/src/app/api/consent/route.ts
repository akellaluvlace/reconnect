import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ConsentSchema = z.object({
  token: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = ConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { token } = parsed.data;

    // Use service_role to look up the collaborator by invite_token
    const serviceClient = createServiceRoleClient();

    // Find the collaborator with this invite token (must not be expired)
    const { data: collaborator, error: lookupError } = await serviceClient
      .from("collaborators")
      .select("id, playbook_id, expires_at")
      .eq("invite_token", token)
      .single();

    if (lookupError || !collaborator || !collaborator.playbook_id) {
      return NextResponse.json(
        { error: "Invalid or expired consent token" },
        { status: 404 },
      );
    }

    // Verify token has not expired
    if (collaborator.expires_at && new Date(collaborator.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired consent token" },
        { status: 404 },
      );
    }

    // Find the interview linked to this collaborator's playbook
    // and update recording_consent_at
    const { error: updateError } = await serviceClient
      .from("interviews")
      .update({ recording_consent_at: new Date().toISOString() })
      .eq("playbook_id", collaborator.playbook_id)
      .is("recording_consent_at", null);

    if (updateError) {
      console.error("[consent] Update failed:", updateError.message);
      return NextResponse.json(
        { error: "Failed to record consent" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[consent] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
