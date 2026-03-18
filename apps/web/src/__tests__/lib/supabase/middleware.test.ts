import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/env", () => ({
  supabaseUrl: "https://test.supabase.co",
  supabaseAnonKey: "test-anon-key",
}));

import { updateSession } from "@/lib/supabase/middleware";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "user-1", email: "admin@axil.ie" };

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`);
}

function setupUser(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: user ? null : { message: "No session" },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateSession middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  // --- Unauthenticated access ---

  it("allows unauthenticated access to /login", async () => {
    setupUser(null);
    const res = await updateSession(makeRequest("/login"));
    expect(res.status).toBe(200);
  });

  it("allows unauthenticated access to /api/cron/recording-pipeline", async () => {
    setupUser(null);
    const res = await updateSession(makeRequest("/api/cron/recording-pipeline"));
    expect(res.status).toBe(200);
  });

  it("allows unauthenticated access to /auth/collaborator/feedback", async () => {
    setupUser(null);
    const res = await updateSession(makeRequest("/auth/collaborator/feedback?token=abc"));
    expect(res.status).toBe(200);
  });

  it("allows unauthenticated access to /api/feedback/collaborator", async () => {
    setupUser(null);
    const res = await updateSession(makeRequest("/api/feedback/collaborator"));
    expect(res.status).toBe(200);
  });

  it("redirects unauthenticated user from /playbooks to /login", async () => {
    setupUser(null);
    const res = await updateSession(makeRequest("/playbooks"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("returns 401 JSON for unauthenticated API route", async () => {
    setupUser(null);
    const res = await updateSession(makeRequest("/api/interviews"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  // --- Authenticated user redirect logic ---

  it("redirects authenticated user from /login to /", async () => {
    setupUser();
    const res = await updateSession(makeRequest("/login"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/");
  });

  it("redirects authenticated user from /register to /", async () => {
    setupUser();
    const res = await updateSession(makeRequest("/register"));
    expect(res.status).toBe(307);
  });

  it("does NOT redirect authenticated user from /auth/callback", async () => {
    setupUser();
    const res = await updateSession(makeRequest("/auth/callback"));
    expect(res.status).toBe(200);
  });

  it("does NOT redirect authenticated user from /auth/collaborator/feedback", async () => {
    setupUser();
    const res = await updateSession(
      makeRequest("/auth/collaborator/feedback?token=abc&interview_id=123"),
    );
    expect(res.status).toBe(200);
  });

  it("does NOT redirect authenticated user from /api/cron paths", async () => {
    setupUser();
    const res = await updateSession(makeRequest("/api/cron/recording-pipeline"));
    expect(res.status).toBe(200);
  });

  it("does NOT redirect authenticated user from /api/feedback/collaborator", async () => {
    setupUser();
    const res = await updateSession(makeRequest("/api/feedback/collaborator"));
    expect(res.status).toBe(200);
  });

  // --- Protected routes ---

  it("allows authenticated access to /playbooks", async () => {
    setupUser();
    const res = await updateSession(makeRequest("/playbooks"));
    expect(res.status).toBe(200);
  });

  it("allows authenticated access to /api/interviews", async () => {
    setupUser();
    const res = await updateSession(makeRequest("/api/interviews"));
    expect(res.status).toBe(200);
  });

  // --- Public path prefix matching ---

  it("treats /api/cron-anything as public (prefix match)", async () => {
    setupUser(null);
    const res = await updateSession(makeRequest("/api/cron-debug"));
    // This IS public due to prefix matching — known behavior, documented
    expect(res.status).toBe(200);
  });

  it("does NOT treat /api/cronXYZ as protected", async () => {
    // Verifies prefix match behavior — /api/cron prefix catches /api/cronXYZ
    setupUser(null);
    const res = await updateSession(makeRequest("/api/cronXYZ"));
    expect(res.status).toBe(200);
  });

  // --- Auth service errors ---

  it("returns 503 for API routes when auth service is down", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Service unavailable", status: 500 },
    });
    const res = await updateSession(makeRequest("/api/interviews"));
    expect(res.status).toBe(503);
  });

  it("lets page routes through when auth service is down", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Service unavailable", status: 500 },
    });
    const res = await updateSession(makeRequest("/playbooks"));
    expect(res.status).toBe(200);
  });
});
