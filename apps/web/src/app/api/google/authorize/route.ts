import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleClientId, googleRedirectUri, GOOGLE_SCOPES } from "@/lib/google/env";

/**
 * GET /api/google/authorize
 * Redirects to Google OAuth consent screen.
 * Requires admin auth. Sets a CSRF state cookie for callback verification.
 */
export async function GET() {
  if (!googleClientId || !googleRedirectUri) {
    return NextResponse.json(
      { error: "Google Recording integration is not configured" },
      { status: 503 },
    );
  }

  // Auth check — only admins can initiate Google OAuth
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

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can configure Google integration" },
      { status: 403 },
    );
  }

  // Generate CSRF state token
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: googleRedirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const response = NextResponse.redirect(url);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes — enough for OAuth flow
  });

  return response;
}
