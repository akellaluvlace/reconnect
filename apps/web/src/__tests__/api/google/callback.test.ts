import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom, mockServiceFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockServiceFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: mockServiceFrom,
  }),
}));

vi.mock("@/lib/google/env", () => ({
  googleClientId: "test-client-id",
  googleClientSecret: "test-client-secret",
  googleRedirectUri: "http://localhost:3000/api/google/callback",
  GOOGLE_SCOPES: [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/meetings.space.readonly",
    "https://www.googleapis.com/auth/drive.meet.readonly",
  ],
}));

import { GET, getGoogleOAuthUrl } from "@/app/api/google/callback/route";

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

const MOCK_USER = { id: "user-1", email: "admin@example.com" };

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

// Save original fetch for restoration
const originalFetch = globalThis.fetch;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/google/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("returns 401 if not authenticated", async () => {
    setupAuth(null);

    const res = await GET(
      makeGet("http://localhost/api/google/callback?code=test-code"),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 if no auth code in query params", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(makeGet("http://localhost/api/google/callback"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("authorization code");
  });

  it("returns 403 if user is not admin role", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "manager" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await GET(
      makeGet("http://localhost/api/google/callback?code=test-code"),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("admin");
  });

  it("exchanges code for tokens and redirects on success", async () => {
    setupAuth();

    // User role query → admin
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({ data: { role: "admin" }, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    // Service role delete + insert → success
    const serviceBuilder = chainBuilder({ data: null, error: null });
    mockServiceFrom.mockReturnValue(serviceBuilder);

    // Mock fetch for token exchange + userinfo
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "goog-access-token",
            refresh_token: "goog-refresh-token",
            expires_in: 3600,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            email: "workspace@axil.ie",
            hd: "axil.ie",
          }),
      }) as typeof fetch;

    const res = await GET(
      makeGet("http://localhost/api/google/callback?code=auth-code-123"),
    );

    // Should redirect (302)
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/settings/integrations");
    expect(location).toContain("google=connected");

    // Verify fetch was called for token exchange
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    // Verify service role delete + insert was called
    expect(mockServiceFrom).toHaveBeenCalledWith("platform_google_config");
    expect(serviceBuilder.insert).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getGoogleOAuthUrl helper
// ---------------------------------------------------------------------------

describe("getGoogleOAuthUrl", () => {
  it("builds a valid Google OAuth consent URL", () => {
    const url = getGoogleOAuthUrl();
    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
    expect(url).toContain("response_type=code");
    expect(url).toContain("calendar.events");
  });
});
