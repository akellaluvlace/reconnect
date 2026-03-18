import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const PreferencesSchema = z.object({
  feedback_submitted: z.boolean().optional(),
  all_feedback_collected: z.boolean().optional(),
  synthesis_ready: z.boolean().optional(),
  reminders: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Defaults — all notifications enabled unless explicitly disabled
// ---------------------------------------------------------------------------

const DEFAULT_PREFERENCES = {
  feedback_submitted: true,
  all_feedback_collected: true,
  synthesis_ready: true,
  reminders: true,
};

// ---------------------------------------------------------------------------
// GET — return current notification preferences
// ---------------------------------------------------------------------------

export async function GET() {
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
      .select("notification_preferences")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[preferences:GET] Profile fetch failed:", profileError.message);
      return NextResponse.json(
        { error: "Failed to fetch preferences" },
        { status: 500 },
      );
    }

    // Merge stored prefs with defaults so every key is present
    const stored =
      profile.notification_preferences &&
      typeof profile.notification_preferences === "object" &&
      !Array.isArray(profile.notification_preferences)
        ? (profile.notification_preferences as Record<string, boolean>)
        : {};

    const preferences = { ...DEFAULT_PREFERENCES, ...stored };

    return NextResponse.json(preferences);
  } catch (err) {
    console.error("[preferences:GET] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — merge incoming preferences with current, write back
// ---------------------------------------------------------------------------

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse & validate body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = PreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid preferences", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Read current preferences
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("notification_preferences")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[preferences:PATCH] Profile fetch failed:", profileError.message);
      return NextResponse.json(
        { error: "Failed to fetch current preferences" },
        { status: 500 },
      );
    }

    const stored =
      profile.notification_preferences &&
      typeof profile.notification_preferences === "object" &&
      !Array.isArray(profile.notification_preferences)
        ? (profile.notification_preferences as Record<string, boolean>)
        : {};

    // Merge: defaults → stored → incoming
    const merged = { ...DEFAULT_PREFERENCES, ...stored, ...parsed.data };

    // Write back
    const { error: updateError } = await supabase
      .from("users")
      .update({ notification_preferences: merged })
      .eq("id", user.id);

    if (updateError) {
      console.error("[preferences:PATCH] Update failed:", updateError.message);
      return NextResponse.json(
        { error: "Failed to save preferences" },
        { status: 500 },
      );
    }

    return NextResponse.json(merged);
  } catch (err) {
    console.error("[preferences:PATCH] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
