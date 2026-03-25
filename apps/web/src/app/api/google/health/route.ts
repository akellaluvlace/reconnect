import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleTokens } from "@/lib/google/client";
import { timingSafeEqual } from "crypto";

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * GET /api/google/health
 *
 * Returns token health status for the platform Google configuration.
 * Requires either admin auth or CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  try {
    // Auth: CRON_SECRET (for Vercel cron) or admin session
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") ?? "";
    const hasCronAuth =
      cronSecret && authHeader.startsWith("Bearer ") &&
      timingSafeCompare(authHeader.slice(7), cronSecret);

    if (!hasCronAuth) {
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
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const tokens = await getGoogleTokens();
    const status = tokens.needsRefresh ? "degraded" : "healthy";

    return NextResponse.json({
      status,
      tokenExpiresAt: tokens.tokenExpiry.toISOString(),
      needsRefresh: tokens.needsRefresh,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Google Health] Check failed:", message);
    return NextResponse.json(
      { status: "error", detail: message },
      { status: 503 },
    );
  }
}
