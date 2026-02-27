import { NextResponse } from "next/server";
import { googleClientId, googleRedirectUri, GOOGLE_SCOPES } from "@/lib/google/env";

/**
 * GET /api/google/authorize
 * Redirects to Google OAuth consent screen.
 * Visit this URL to start the platform Google authorization flow.
 */
export async function GET() {
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: googleRedirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  console.log("[Google Authorize] Redirecting to:", url);
  console.log("[Google Authorize] Client ID:", googleClientId);
  console.log("[Google Authorize] Redirect URI:", googleRedirectUri);
  console.log("[Google Authorize] Scopes:", GOOGLE_SCOPES.join(" "));

  return NextResponse.redirect(url);
}
