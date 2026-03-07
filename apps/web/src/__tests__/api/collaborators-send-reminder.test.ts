import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom, mockSendReminderEmail } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockSendReminderEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/email/resend-client", () => ({
  sendReminderEmail: mockSendReminderEmail,
}));

import { POST } from "@/app/api/collaborators/[id]/send-reminder/route";

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

const VALID_ID = "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee";
const PLAYBOOK_ID = "11111111-2222-4333-a444-555555555555";
const MOCK_USER = { id: "user-1", email: "admin@example.com" };

const MOCK_COLLABORATOR = {
  id: VALID_ID,
  email: "interviewer@example.com",
  name: "Jane Smith",
  role: "interviewer",
  playbook_id: PLAYBOOK_ID,
};

function makePost(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/collaborators/${id}/send-reminder`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/collaborators/[id]/send-reminder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);

    const res = await POST(makePost(VALID_ID, { playbook_id: PLAYBOOK_ID }), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when playbook_id is missing", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_ID, {}), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("playbook_id");
  });

  it("returns 404 when collaborator not found", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "collaborators") {
        return chainBuilder({ data: null, error: { code: "PGRST116", message: "not found" } });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_ID, { playbook_id: PLAYBOOK_ID }), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Collaborator not found");
  });

  it("returns 403 when playbook belongs to different org", async () => {
    setupAuth();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "collaborators") {
        return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { title: "Test Playbook", organization_id: "org-OTHER" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_ID, { playbook_id: PLAYBOOK_ID }), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 200 and sends reminder on success", async () => {
    setupAuth();
    mockSendReminderEmail.mockResolvedValue({ success: true });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "collaborators") {
        return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { title: "Senior Engineer", organization_id: "org-1" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_ID, { playbook_id: PLAYBOOK_ID }), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(mockSendReminderEmail).toHaveBeenCalledOnce();
    const emailArgs = mockSendReminderEmail.mock.calls[0][0];
    expect(emailArgs.to).toBe("interviewer@example.com");
    expect(emailArgs.playbookTitle).toBe("Senior Engineer");
    expect(emailArgs.interviewerName).toBe("Jane Smith");
    expect(emailArgs.message).toBeUndefined();
  });

  it("returns 200 and passes custom message to email", async () => {
    setupAuth();
    mockSendReminderEmail.mockResolvedValue({ success: true });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "collaborators") {
        return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { title: "Senior Engineer", organization_id: "org-1" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const customMsg = "Please submit by end of day Friday.";
    const res = await POST(
      makePost(VALID_ID, { playbook_id: PLAYBOOK_ID, message: customMsg }),
      { params: Promise.resolve({ id: VALID_ID }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(mockSendReminderEmail).toHaveBeenCalledOnce();
    const emailArgs = mockSendReminderEmail.mock.calls[0][0];
    expect(emailArgs.message).toBe(customMsg);
  });

  it("returns 500 when email fails", async () => {
    setupAuth();
    mockSendReminderEmail.mockResolvedValue({ success: false, error: "Resend API 500" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: "org-1" },
          error: null,
        });
      }
      if (table === "collaborators") {
        return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
      }
      if (table === "playbooks") {
        return chainBuilder({
          data: { title: "Senior Engineer", organization_id: "org-1" },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_ID, { playbook_id: PLAYBOOK_ID }), {
      params: Promise.resolve({ id: VALID_ID }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to send");
  });
});
