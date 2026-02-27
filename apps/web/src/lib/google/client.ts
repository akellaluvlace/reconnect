import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { googleClientId, googleClientSecret } from "@/lib/google/env";

/**
 * Buffer before token expiry to trigger refresh (5 minutes).
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Shape returned by getGoogleTokens().
 */
export interface GoogleTokenResult {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  googleEmail: string;
  needsRefresh: boolean;
}

/**
 * Read the platform Google config from the singleton row.
 * Returns token data + a flag indicating whether the token needs refresh.
 * Throws if no config row exists (platform not configured).
 */
export async function getGoogleTokens(): Promise<GoogleTokenResult> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("platform_google_config")
    .select(
      "access_token, refresh_token, token_expiry, google_email",
    )
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      "Google platform not configured — no platform_google_config row found",
    );
  }

  const tokenExpiry = new Date(data.token_expiry);
  const needsRefresh = tokenExpiry.getTime() - Date.now() < TOKEN_REFRESH_BUFFER_MS;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry,
    googleEmail: data.google_email,
    needsRefresh,
  };
}

/**
 * Exchange a refresh_token for a new access_token via Google OAuth2.
 * Updates the DB row with the fresh token + expiry.
 * Returns the new access_token.
 */
export async function refreshGoogleTokens(
  refreshToken: string,
  googleEmail: string,
): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Google token refresh failed (${response.status}): ${body}`,
    );
  }

  const tokens = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

  // Persist the refreshed token
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("platform_google_config")
    .update({
      access_token: tokens.access_token,
      token_expiry: newExpiry.toISOString(),
    })
    .eq("google_email", googleEmail);

  if (error) {
    throw new Error(
      `Failed to persist refreshed Google token: ${error.message}`,
    );
  }

  return tokens.access_token;
}

/**
 * Main entry point — returns a valid Google access token.
 * Reads the stored token, refreshes if it expires within 5 minutes.
 */
export async function getValidGoogleToken(): Promise<string> {
  const tokenResult = await getGoogleTokens();

  if (!tokenResult.needsRefresh) {
    return tokenResult.accessToken;
  }

  return refreshGoogleTokens(
    tokenResult.refreshToken,
    tokenResult.googleEmail,
  );
}
