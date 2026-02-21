import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const rawNext = searchParams.get("next") ?? "/";
    // Validate next param to prevent open redirect
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

    const supabase = await createClient();

    // Handle OAuth callback (code exchange)
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("[auth/callback] Code exchange failed:", error.message, error.status);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    // Handle email verification / password reset (token_hash + type)
    const VALID_OTP_TYPES = ["email", "recovery", "invite", "magiclink", "email_change"] as const;
    type OtpType = (typeof VALID_OTP_TYPES)[number];

    if (token_hash && type && VALID_OTP_TYPES.includes(type as OtpType)) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as OtpType,
      });
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("[auth/callback] OTP verify failed:", error.message, error.status);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    // Capture provider/Supabase error details if present
    const providerError = searchParams.get("error_description")
      || searchParams.get("error")
      || "auth";
    console.error("[auth/callback] No code or token_hash. Params:", Object.fromEntries(searchParams.entries()));
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(providerError)}`);
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }
}
