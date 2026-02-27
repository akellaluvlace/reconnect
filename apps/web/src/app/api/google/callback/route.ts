import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  GOOGLE_SCOPES,
} from "@/lib/google/env";

/**
 * Build the Google OAuth consent URL for initial platform setup.
 * Used by the settings/integrations page to start the OAuth flow.
 */
export function getGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: googleRedirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * GET /api/google/callback
 *
 * One-time OAuth callback for initial platform Google Workspace setup.
 * Exchanges the authorization code for tokens, fetches account info,
 * and stores everything in platform_google_config via service_role.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Admin role check
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "[google/callback] Profile fetch failed:",
        profileError?.message,
      );
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 },
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can configure Google integration" },
        { status: 403 },
      );
    }

    // 3. Get authorization code from query params
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 },
      );
    }

    // 4. Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error(
        "[google/callback] Token exchange failed:",
        tokenResponse.status,
        errorBody,
      );
      return NextResponse.json(
        {
          error: "Failed to exchange authorization code",
          detail: `Google returned ${tokenResponse.status}`,
        },
        { status: 502 },
      );
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    // 5. Get account email
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );

    if (!userInfoResponse.ok) {
      console.error(
        "[google/callback] Userinfo fetch failed:",
        userInfoResponse.status,
      );
      return NextResponse.json(
        { error: "Failed to retrieve Google account info" },
        { status: 502 },
      );
    }

    const userInfo = (await userInfoResponse.json()) as {
      email: string;
      hd?: string; // Workspace domain
    };

    // 6. Upsert into platform_google_config via service_role
    const tokenExpiry = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    const serviceClient = createServiceRoleClient();

    // Singleton table — delete existing row then insert fresh
    await serviceClient.from("platform_google_config").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: upsertError } = await serviceClient
      .from("platform_google_config")
      .insert({
        google_email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? "",
        token_expiry: tokenExpiry,
        scopes: [...GOOGLE_SCOPES],
        auto_record_enabled: true,
        workspace_domain: userInfo.hd ?? null,
      });

    if (upsertError) {
      console.error(
        "[google/callback] DB upsert failed:",
        upsertError.message,
      );
      return NextResponse.json(
        { error: "Failed to store Google configuration" },
        { status: 500 },
      );
    }

    // 7. Redirect to settings page
    return NextResponse.redirect(
      new URL("/settings/integrations?google=connected", req.url),
    );
  } catch (error) {
    console.error("[google/callback] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
