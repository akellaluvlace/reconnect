import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetGoogleTokens } = vi.hoisted(() => ({
  mockGetGoogleTokens: vi.fn(),
}));

vi.mock("@/lib/google/client", () => ({
  getGoogleTokens: mockGetGoogleTokens,
}));

import { GET } from "@/app/api/google/health/route";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/google/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.email).toBe("workspace@axil.ie");
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

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.email).toBe("workspace@axil.ie");
    expect(body.needsRefresh).toBe(true);
  });

  it("returns 503 + error when platform not configured", async () => {
    mockGetGoogleTokens.mockRejectedValue(
      new Error(
        "Google platform not configured — no platform_google_config row found",
      ),
    );

    const res = await GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("error");
    expect(body.detail).toContain("not configured");
  });
});
