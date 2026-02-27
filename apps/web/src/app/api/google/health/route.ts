import { NextResponse } from "next/server";
import { getGoogleTokens } from "@/lib/google/client";

/**
 * GET /api/google/health
 *
 * Returns token health status for the platform Google configuration.
 * No auth required — intended to be called by Vercel Cron for monitoring.
 */
export async function GET() {
  try {
    const tokens = await getGoogleTokens();
    const status = tokens.needsRefresh ? "degraded" : "healthy";

    return NextResponse.json({
      status,
      email: tokens.googleEmail,
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
