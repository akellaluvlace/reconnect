/**
 * Flow test: Collaborator Invite -> Share Link -> Revoke
 *
 * Verifies that the collaborator invitation flow and share link lifecycle
 * work end-to-end: tokens are generated as hex strings, share links can
 * be created and soft-deleted (revoked).
 *
 * Flow:
 *   1. POST /api/collaborators/invite -> verify collaborator.invite_token exists
 *   2. POST /api/share-links -> verify data.token exists
 *   3. Verify tokens are hex strings (crypto.randomBytes output)
 *   4. DELETE /api/share-links/[id] -> verify { success: true } response
 *   5. Verify soft delete semantics (is_active = false, not row deletion)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockFrom,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

// ---------------------------------------------------------------------------
// vi.mock registrations
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("crypto", () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: () => "ab".repeat(32), // 64-char hex string
  }),
}));

vi.mock("@/lib/email/resend-client", () => ({
  sendCollaboratorInvite: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Route handler imports (AFTER mocks)
// ---------------------------------------------------------------------------

import { POST as collaboratorsInvitePOST } from "@/app/api/collaborators/invite/route";
import { POST as shareLinksPOST } from "@/app/api/share-links/route";
import { DELETE as shareLinksDELETE } from "@/app/api/share-links/[id]/route";

// ---------------------------------------------------------------------------
// Chainable Supabase query builder mock
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  const chainMethods = [
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
    "gt",
    "lt",
    "gte",
    "lte",
    "ilike",
  ];
  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

// ---------------------------------------------------------------------------
// Constants — valid hex UUIDs only
// ---------------------------------------------------------------------------

const USER_ID = "aabbccdd-1122-4344-a566-778899aabb00";
const ORG_ID = "00112233-4455-6677-8899-aabbccddeeff";
const PLAYBOOK_ID = "11223344-5566-7788-99aa-bbccddeeff00";
const COLLABORATOR_ID = "aabbccdd-eeff-4011-a233-445566778899";
const SHARE_LINK_ID = "11223344-aabb-4cdd-aeff-001122334455";

const MOCK_USER = { id: USER_ID, email: "admin@example.com" };
const HEX_TOKEN = "ab".repeat(32); // 64-char hex string

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function makeRequest(
  url: string,
  method: string = "GET",
  body?: unknown,
): NextRequest {
  const init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  } = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

// ---------------------------------------------------------------------------
// Mock DB rows
// ---------------------------------------------------------------------------

const MOCK_COLLABORATOR = {
  id: COLLABORATOR_ID,
  email: "collab@test.com",
  name: "Test Collaborator",
  role: "interviewer",
  playbook_id: PLAYBOOK_ID,
  invite_token: HEX_TOKEN,
  invited_by: USER_ID,
  expires_at: "2026-03-01T00:00:00Z",
  accepted_at: null,
  assigned_stages: null,
  created_at: "2026-02-20T00:00:00Z",
};

const MOCK_SHARE_LINK = {
  id: SHARE_LINK_ID,
  token: HEX_TOKEN,
  playbook_id: PLAYBOOK_ID,
  is_active: true,
  expires_at: "2026-03-22T00:00:00Z",
  view_count: 0,
  created_at: "2026-02-20T00:00:00Z",
  created_by: USER_ID,
};

// ===========================================================================
// Tests
// ===========================================================================

describe("FLOW: Collaborator Invite -> Share Link -> Revoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Captured response data for cross-step assertions
  // -----------------------------------------------------------------------

  it("Step 1: POST /api/collaborators/invite — response has collaborator.invite_token", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: ORG_ID },
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { organization_id: ORG_ID, title: "Engineering Playbook" },
          error: null,
        });
      }
      // collaborators insert
      return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
    });

    const res = await collaboratorsInvitePOST(
      makeRequest("http://localhost:3000/api/collaborators/invite", "POST", {
        playbook_id: PLAYBOOK_ID,
        email: "collab@test.com",
        name: "Test Collaborator",
        role: "interviewer",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();

    // Verify top-level shape
    expect(body.collaborator).toBeDefined();
    expect(body.collaborator.id).toBe(COLLABORATOR_ID);
    expect(body.collaborator.email).toBe("collab@test.com");

    // Critical: invite_token must exist
    expect(body.collaborator.invite_token).toBeDefined();
    expect(typeof body.collaborator.invite_token).toBe("string");
    expect(body.collaborator.invite_token.length).toBeGreaterThan(0);
  });

  it("Step 2: POST /api/share-links — response has data.token", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin" },
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { organization_id: ORG_ID },
          error: null,
        });
      }
      // share_links insert
      return chainBuilder({ data: MOCK_SHARE_LINK, error: null });
    });

    const res = await shareLinksPOST(
      makeRequest("http://localhost:3000/api/share-links", "POST", {
        playbook_id: PLAYBOOK_ID,
        expires_in_days: 30,
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();

    // Verify top-level shape
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(SHARE_LINK_ID);

    // Critical: token must exist
    expect(body.data.token).toBeDefined();
    expect(typeof body.data.token).toBe("string");
    expect(body.data.token.length).toBeGreaterThan(0);
  });

  it("Step 3: Tokens are hex strings (crypto.randomBytes output)", async () => {
    // Both routes use randomBytes(32).toString("hex") which produces
    // a 64-character hex string. Verify the format.

    setupAuth();
    // Test collaborator invite token
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: ORG_ID },
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { organization_id: ORG_ID, title: "Test Playbook" },
          error: null,
        });
      }
      return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
    });

    const inviteRes = await collaboratorsInvitePOST(
      makeRequest("http://localhost:3000/api/collaborators/invite", "POST", {
        playbook_id: PLAYBOOK_ID,
        email: "hex-test@example.com",
        role: "viewer",
      }),
    );
    const inviteBody = await inviteRes.json();

    // Hex regex: only 0-9 and a-f characters
    const HEX_REGEX = /^[0-9a-f]+$/i;

    expect(inviteBody.collaborator.invite_token).toMatch(HEX_REGEX);
    expect(inviteBody.collaborator.invite_token).toHaveLength(64);

    // Test share link token
    vi.clearAllMocks();
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin" },
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { organization_id: ORG_ID },
          error: null,
        });
      }
      return chainBuilder({ data: MOCK_SHARE_LINK, error: null });
    });

    const linkRes = await shareLinksPOST(
      makeRequest("http://localhost:3000/api/share-links", "POST", {
        playbook_id: PLAYBOOK_ID,
      }),
    );
    const linkBody = await linkRes.json();

    expect(linkBody.data.token).toMatch(HEX_REGEX);
    expect(linkBody.data.token).toHaveLength(64);
  });

  it("Step 4: DELETE /api/share-links/[id] — returns { success: true }", async () => {
    setupAuth();

    // The DELETE route first checks existence via .select("id").single(),
    // then soft-deletes via .update({ is_active: false })
    // We need a builder where .single() returns the link (existence check passes)
    // and the thenable resolves to null (for the update).
    let callCount = 0;
    const shareLinkBuilder = chainBuilder({ data: null, error: null });
    shareLinkBuilder.single = vi.fn().mockImplementation(() => {
      callCount++;
      // First .single() call = existence check → return link data
      if (callCount === 1) {
        return Promise.resolve({ data: { id: SHARE_LINK_ID }, error: null });
      }
      // Subsequent calls → update result
      return Promise.resolve({ data: null, error: null });
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin" },
          error: null,
        });
      }
      // share_links existence check + soft delete
      return shareLinkBuilder;
    });

    const res = await shareLinksDELETE(
      makeRequest(
        `http://localhost:3000/api/share-links/${SHARE_LINK_ID}`,
        "DELETE",
      ),
      { params: Promise.resolve({ id: SHARE_LINK_ID }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("Step 5: Soft delete semantics — uses UPDATE (is_active=false), NOT row deletion", async () => {
    setupAuth();

    const updateMock = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shareLinkBuilder: Record<string, any> = {};
    const chainMethods = [
      "select",
      "insert",
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
      "gt",
      "lt",
      "gte",
      "lte",
      "ilike",
    ];
    for (const method of chainMethods) {
      shareLinkBuilder[method] = vi.fn().mockReturnValue(shareLinkBuilder);
    }
    shareLinkBuilder.update = updateMock.mockReturnValue(shareLinkBuilder);
    // First .single() = existence check (return link), subsequent = update result
    let singleCallCount = 0;
    shareLinkBuilder.single = vi.fn().mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1) {
        return Promise.resolve({ data: { id: SHARE_LINK_ID }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shareLinkBuilder.then = (resolve: any) => resolve({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin" },
          error: null,
        });
      }
      return shareLinkBuilder;
    });

    await shareLinksDELETE(
      makeRequest(
        `http://localhost:3000/api/share-links/${SHARE_LINK_ID}`,
        "DELETE",
      ),
      { params: Promise.resolve({ id: SHARE_LINK_ID }) },
    );

    // The route calls .update({ is_active: false }), NOT .delete()
    expect(updateMock).toHaveBeenCalledWith({ is_active: false });
  });

  it("verifies both routes require admin/manager role", async () => {
    setupAuth();
    // Set user as interviewer (not admin/manager)
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "interviewer", organization_id: ORG_ID },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    // Collaborator invite should be 403
    const inviteRes = await collaboratorsInvitePOST(
      makeRequest("http://localhost:3000/api/collaborators/invite", "POST", {
        playbook_id: PLAYBOOK_ID,
        email: "denied@example.com",
        role: "viewer",
      }),
    );
    expect(inviteRes.status).toBe(403);

    // Share link creation should be 403
    vi.clearAllMocks();
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "interviewer" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const linkRes = await shareLinksPOST(
      makeRequest("http://localhost:3000/api/share-links", "POST", {
        playbook_id: PLAYBOOK_ID,
      }),
    );
    expect(linkRes.status).toBe(403);

    // Share link delete should be 403 (role check before existence check)
    vi.clearAllMocks();
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "interviewer" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const deleteRes = await shareLinksDELETE(
      makeRequest(
        `http://localhost:3000/api/share-links/${SHARE_LINK_ID}`,
        "DELETE",
      ),
      { params: Promise.resolve({ id: SHARE_LINK_ID }) },
    );
    expect(deleteRes.status).toBe(403);
  });

  it("verifies share link is created with is_active=true and view_count=0", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin" },
          error: null,
        });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { organization_id: ORG_ID },
          error: null,
        });
      }
      return chainBuilder({ data: MOCK_SHARE_LINK, error: null });
    });

    const res = await shareLinksPOST(
      makeRequest("http://localhost:3000/api/share-links", "POST", {
        playbook_id: PLAYBOOK_ID,
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.is_active).toBe(true);
    expect(body.data.view_count).toBe(0);
  });
});
