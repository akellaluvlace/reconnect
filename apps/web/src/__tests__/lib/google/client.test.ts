import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockServiceFrom } = vi.hoisted(() => ({
  mockServiceFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: mockServiceFrom,
  }),
}));

// Mock env — values come from vitest.config.ts env block
vi.mock("@/lib/google/env", () => ({
  googleClientId: "test-google-client-id",
  googleClientSecret: "test-google-secret",
  googleRedirectUri: "http://localhost:3000/api/google/callback",
  GOOGLE_SCOPES: [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/meetings.space.readonly",
    "https://www.googleapis.com/auth/drive.meet.readonly",
  ],
}));

import {
  getGoogleTokens,
  refreshGoogleTokens,
} from "@/lib/google/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "order",
    "limit",
    "is",
    "in",
    "match",
    "filter",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

const FRESH_CONFIG = {
  access_token: "ya29.fresh-token",
  refresh_token: "1//refresh-token",
  token_expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
  google_email: "rec@axil.ie",
};

const EXPIRING_CONFIG = {
  ...FRESH_CONFIG,
  token_expiry: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 min from now (< 5 min buffer)
};

const originalFetch = globalThis.fetch;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Google client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // getGoogleTokens
  // -----------------------------------------------------------------------

  describe("getGoogleTokens", () => {
    it("returns tokens when config exists and is fresh", async () => {
      mockServiceFrom.mockReturnValue(
        chainBuilder({ data: FRESH_CONFIG, error: null }),
      );

      const result = await getGoogleTokens();

      expect(result.accessToken).toBe("ya29.fresh-token");
      expect(result.refreshToken).toBe("1//refresh-token");
      expect(result.googleEmail).toBe("rec@axil.ie");
      expect(result.needsRefresh).toBe(false);
    });

    it("flags needsRefresh when token expires within 5 minutes", async () => {
      mockServiceFrom.mockReturnValue(
        chainBuilder({ data: EXPIRING_CONFIG, error: null }),
      );

      const result = await getGoogleTokens();

      expect(result.needsRefresh).toBe(true);
      expect(result.accessToken).toBe("ya29.fresh-token");
    });

    it("throws when no config row exists", async () => {
      mockServiceFrom.mockReturnValue(
        chainBuilder({
          data: null,
          error: { code: "PGRST116", message: "not found" },
        }),
      );

      await expect(getGoogleTokens()).rejects.toThrow(
        "Google platform not configured",
      );
    });
  });

  // -----------------------------------------------------------------------
  // refreshGoogleTokens
  // -----------------------------------------------------------------------

  describe("refreshGoogleTokens", () => {
    it("exchanges refresh_token and returns new access_token", async () => {
      // Mock Google OAuth2 token endpoint
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "ya29.refreshed-token",
            expires_in: 3600,
          }),
      }) as typeof fetch;

      // Mock DB update
      mockServiceFrom.mockReturnValue(
        chainBuilder({ data: null, error: null }),
      );

      const newToken = await refreshGoogleTokens(
        "1//refresh-token",
        "rec@axil.ie",
      );

      expect(newToken).toBe("ya29.refreshed-token");

      // Verify fetch was called with correct params
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      );

      // Verify the body includes required grant fields
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      const body = fetchCall[1].body as URLSearchParams;
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("1//refresh-token");
      expect(body.get("client_id")).toBe("test-google-client-id");
      expect(body.get("client_secret")).toBe("test-google-secret");
    });

    it("throws on Google OAuth2 error response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"error":"invalid_grant"}'),
      }) as typeof fetch;

      await expect(
        refreshGoogleTokens("1//bad-token", "rec@axil.ie"),
      ).rejects.toThrow("Google token refresh failed (400)");
    });

    it("throws when DB update fails", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "ya29.refreshed-token",
            expires_in: 3600,
          }),
      }) as typeof fetch;

      mockServiceFrom.mockReturnValue(
        chainBuilder({
          data: null,
          error: { code: "42501", message: "permission denied" },
        }),
      );

      await expect(
        refreshGoogleTokens("1//refresh-token", "rec@axil.ie"),
      ).rejects.toThrow("Failed to persist refreshed Google token");
    });
  });
});
