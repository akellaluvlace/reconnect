import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetGoogleTokens } = vi.hoisted(() => ({
  mockGetGoogleTokens: vi.fn(),
}));

vi.mock("@/lib/google/client", () => ({
  getGoogleTokens: mockGetGoogleTokens,
}));

// Mock Supabase — not needed when using CRON_SECRET auth
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { GET } from "@/app/api/google/health/route";

// Helper: create a request with CRON_SECRET auth
const TEST_CRON_SECRET = "test-cron-secret-123";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/google/health", {
    headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/google/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = TEST_CRON_SECRET;
  });

  it("returns 200 + healthy when tokens are valid", async () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    mockGetGoogleTokens.mockResolvedValue({
      accessToken: "goog-access-token",
      refreshToken: "goog-refresh-token",
      tokenExpiry: futureExpiry,
      googleEmail: "workspace@axil.ie",
      needsRefresh: false,
    });

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.needsRefresh).toBe(false);
    expect(body.tokenExpiresAt).toBe(futureExpiry.toISOString());
  });

  it("returns 200 + degraded when token needs refresh", async () => {
    const nearExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 min from now
    mockGetGoogleTokens.mockResolvedValue({
      accessToken: "goog-access-token",
      refreshToken: "goog-refresh-token",
      tokenExpiry: nearExpiry,
      googleEmail: "workspace@axil.ie",
      needsRefresh: true,
    });

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.needsRefresh).toBe(true);
  });

  it("returns 503 + error when platform not configured", async () => {
    mockGetGoogleTokens.mockRejectedValue(
      new Error(
        "Google platform not configured — no platform_google_config row found",
      ),
    );

    const res = await GET(makeRequest());

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("error");
    expect(body.detail).toContain("not configured");
  });

  it("returns 401 when no auth provided and no CRON_SECRET", async () => {
    delete process.env.CRON_SECRET;

    // Mock Supabase to return no user
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "No session" } }),
      },
    } as never);

    const req = new NextRequest("http://localhost:3000/api/google/health");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
