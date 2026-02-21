import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    if (!playbookId) {
      return NextResponse.json(
        { error: "playbook_id query parameter is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("collaborators")
      .select("*")
      .eq("playbook_id", playbookId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[collaborators/GET] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch collaborators" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[collaborators/GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
