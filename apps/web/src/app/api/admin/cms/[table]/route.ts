import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  SLUG_TO_TABLE,
  createSchemas,
  orderColumn,
  selectColumns,
} from "@/lib/admin/cms-schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ table: string }> },
) {
  const { table: slug } = await params;

  const tableName = SLUG_TO_TABLE[slug];
  if (!tableName) {
    return NextResponse.json(
      { error: "Invalid table" },
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
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[cms/GET] Profile fetch failed:", profileError?.message);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: "User has no organization" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from(tableName)
      .select(selectColumns(tableName))
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order(orderColumn(tableName));

    if (error) {
      console.error("[cms/GET] Query failed:", error.message);
      return NextResponse.json(
        { error: "Failed to load items" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[cms/GET] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> },
) {
  const { table: slug } = await params;

  const tableName = SLUG_TO_TABLE[slug];
  if (!tableName) {
    return NextResponse.json(
      { error: "Invalid table" },
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const schema = createSchemas[tableName];
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[cms/POST] Profile fetch failed:", profileError?.message);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: "User has no organization" },
        { status: 403 },
      );
    }

    const insertPayload = {
      ...(parsed.data as Record<string, unknown>),
      organization_id: profile.organization_id,
    };

    // Dynamic table name — Zod validates the payload, so the `as any` is safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(tableName) as any)
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[cms/POST] Insert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to create item" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[cms/POST] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
