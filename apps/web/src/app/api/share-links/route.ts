import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

const CreateShareLinkSchema = z.object({
  playbook_id: z.string().uuid(),
  expires_in_days: z.number().int().min(1).max(90).optional().default(30),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playbookId = req.nextUrl.searchParams.get("playbook_id");
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!playbookId || !UUID_RE.test(playbookId)) {
      return NextResponse.json(
        { error: "Valid playbook_id query parameter is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("share_links")
      .select("*")
      .eq("playbook_id", playbookId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[share-links/GET] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch share links" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[share-links/GET] Error:", error);
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

    // Check role (admin/manager only)
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[share-links/POST] Profile fetch failed:",
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

    const parsed = CreateShareLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + parsed.data.expires_in_days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await supabase
      .from("share_links")
      .insert({
        playbook_id: parsed.data.playbook_id,
        token,
        is_active: true,
        expires_at: expiresAt,
        created_by: user.id,
        view_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("[share-links/POST] Insert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to create share link" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[share-links/POST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
