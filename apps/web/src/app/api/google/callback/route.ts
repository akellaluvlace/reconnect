import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  GOOGLE_SCOPES,
  requireGoogleEnv,
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
    requireGoogleEnv();

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

    // 3. CSRF state verification
    const cookieStore = await cookies();
    const savedState = cookieStore.get("google_oauth_state")?.value;
    const returnedState = req.nextUrl.searchParams.get("state");
    // Clear the state cookie regardless of outcome
    cookieStore.delete("google_oauth_state");

    if (!savedState || !returnedState || savedState !== returnedState) {
      console.error("[google/callback] State mismatch — possible CSRF");
      return NextResponse.json(
        { error: "Invalid OAuth state — please try again" },
        { status: 403 },
      );
    }

    // 4. Get authorization code from query params
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

    const rawTokens = await tokenResponse.json();
    if (!rawTokens.access_token || typeof rawTokens.expires_in !== "number") {
      console.error("[google/callback] Unexpected token response:", JSON.stringify(rawTokens).slice(0, 300));
      return NextResponse.json(
        { error: "Unexpected Google token response format" },
        { status: 502 },
      );
    }
    const tokens = rawTokens as {
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

    const rawUserInfo = await userInfoResponse.json();
    if (!rawUserInfo.email || typeof rawUserInfo.email !== "string") {
      console.error("[google/callback] Unexpected userinfo response:", JSON.stringify(rawUserInfo).slice(0, 300));
      return NextResponse.json(
        { error: "Google account did not return an email address" },
        { status: 502 },
      );
    }
    const userInfo = rawUserInfo as {
      email: string;
      hd?: string; // Workspace domain
    };

    // 6. Upsert into platform_google_config via service_role
    const tokenExpiry = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    const serviceClient = createServiceRoleClient();

    // Singleton table — update existing row or insert if none exists (no delete gap)
    const configPayload = {
      google_email: userInfo.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? "",
      token_expiry: tokenExpiry,
      scopes: [...GOOGLE_SCOPES],
      auto_record_enabled: true,
      workspace_domain: userInfo.hd ?? null,
    };

    const { data: existingRow } = await serviceClient
      .from("platform_google_config")
      .select("id")
      .limit(1)
      .maybeSingle();

    let configError: { message: string } | null = null;
    if (existingRow) {
      const { error } = await serviceClient
        .from("platform_google_config")
        .update(configPayload)
        .eq("id", existingRow.id);
      configError = error;
    } else {
      const { error } = await serviceClient
        .from("platform_google_config")
        .insert(configPayload);
      configError = error;
    }

    if (configError) {
      console.error(
        "[google/callback] DB write failed:",
        configError.message,
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
