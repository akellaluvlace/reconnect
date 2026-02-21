/**
 * Authorization Matrix Tests
 *
 * Systematic verification that every role-protected API route returns the
 * correct HTTP status for each user role (admin, manager, interviewer) and
 * for unauthenticated requests.
 *
 * This file covers:
 *   1. Role-protected routes reject interviewer role (403)
 *   2. Admin-only routes reject manager role (403)
 *   3. Auth-only routes accept any authenticated role
 *   4. All protected routes return 401 when unauthenticated
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be before any imports that reference mocked modules
// ---------------------------------------------------------------------------

const { mockGetUser, mockFrom, mockServiceFrom, mockTranscribeAudio } =
  vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
    mockServiceFrom: vi.fn(),
    mockTranscribeAudio: vi.fn(),
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

vi.mock("crypto", () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: () => "a".repeat(64),
  }),
}));

vi.mock("@/lib/email/resend-client", () => ({
  sendCollaboratorInvite: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/openai/client", () => ({
  transcribeAudio: mockTranscribeAudio,
}));

// ---------------------------------------------------------------------------
// Route imports (AFTER all vi.mock calls)
// ---------------------------------------------------------------------------

import {
  GET as playbooksListGET,
  POST as playbooksPOST,
} from "@/app/api/playbooks/route";
import {
  GET as playbookDetailGET,
  PATCH as playbookPATCH,
  DELETE as playbookDELETE,
} from "@/app/api/playbooks/[id]/route";
import {
  GET as stagesGET,
  POST as stagesPOST,
} from "@/app/api/playbooks/[id]/stages/route";
import {
  PATCH as stagePATCH,
  DELETE as stageDELETE,
} from "@/app/api/playbooks/[id]/stages/[stageId]/route";
import { POST as stagesReorderPOST } from "@/app/api/playbooks/[id]/stages/reorder/route";
import { GET as collaboratorsGET } from "@/app/api/collaborators/route";
import { POST as collaboratorsInvitePOST } from "@/app/api/collaborators/invite/route";
import { DELETE as collaboratorDELETE } from "@/app/api/collaborators/[id]/route";
import {
  GET as shareLinksGET,
  POST as shareLinksPOST,
} from "@/app/api/share-links/route";
import { DELETE as shareLinkDELETE } from "@/app/api/share-links/[id]/route";
import {
  GET as feedbackListGET,
  POST as feedbackPOST,
} from "@/app/api/feedback/route";
import {
  GET as feedbackDetailGET,
  PATCH as feedbackPATCH,
} from "@/app/api/feedback/[id]/route";
import { POST as transcriptionPOST } from "@/app/api/transcription/route";

// ---------------------------------------------------------------------------
// Helpers
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
  for (const m of chainMethods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

// Valid hex UUIDs (0-9, a-f only)
const USER_ID = "aabbccdd-1122-4344-a566-778899aabb00";
const ORG_ID = "aabb0011-2233-4455-a677-8899aabbccdd";
const PLAYBOOK_ID = "11223344-5566-7788-99aa-bbccddeeff00";
const STAGE_ID = "22334455-6677-8899-aabb-ccddeeff0011";
const COLLABORATOR_ID = "aabbccdd-eeff-4011-a233-445566778899";
const SHARE_LINK_ID = "11223344-aabb-4cdd-aeff-001122334455";
const FEEDBACK_ID = "55667788-99aa-4bcc-adee-ff0011223344";
const INTERVIEW_ID = "99aabbcc-ddee-4f00-a122-334455667788";

const MOCK_USER = { id: USER_ID, email: "test@example.com" };

function setupAuthWithRole(role: "admin" | "manager" | "interviewer") {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: { role, organization_id: ORG_ID },
        error: null,
      });
    }
    // Generic success for all other tables
    return chainBuilder({ data: null, error: null });
  });
}

function setupNoAuth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  mockFrom.mockImplementation(() =>
    chainBuilder({ data: null, error: null }),
  );
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

// -- Minimal valid request bodies for routes that require them --

const VALID_PLAYBOOK_BODY = { title: "Test Playbook" };

const VALID_PLAYBOOK_PATCH_BODY = { title: "Updated Playbook" };

const VALID_STAGE_BODY = {
  name: "Technical Screen",
  type: "technical" as const,
  duration_minutes: 60,
};

const VALID_STAGE_PATCH_BODY = { name: "Updated Stage" };

const VALID_REORDER_BODY = {
  stages: [{ id: STAGE_ID, order_index: 0 }],
};

const VALID_INVITE_BODY = {
  playbook_id: PLAYBOOK_ID,
  email: "collab@example.com",
  role: "interviewer" as const,
};

const VALID_SHARE_LINK_BODY = {
  playbook_id: PLAYBOOK_ID,
  expires_in_days: 30,
};

const VALID_FEEDBACK_BODY = {
  interview_id: INTERVIEW_ID,
  ratings: [{ category: "Technical", score: 3 }],
  pros: ["Good"],
  cons: ["Slow"],
  focus_areas_confirmed: true,
};

const VALID_FEEDBACK_PATCH_BODY = {
  ratings: [{ category: "Technical", score: 4 }],
};

const VALID_TRANSCRIPTION_BODY = {
  interview_id: INTERVIEW_ID,
  recording_url:
    "https://vfufxduwywrnwbjtwdjz.supabase.co/storage/v1/object/recordings/rec.m4a",
};

// =========================================================================
// 1. Role-protected routes reject interviewer role (403)
// =========================================================================

describe("Authorization Matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role-protected routes reject interviewer role", () => {
    beforeEach(() => {
      setupAuthWithRole("interviewer");
    });

    it("POST /api/playbooks returns 403 for interviewer", async () => {
      const res = await playbooksPOST(
        makeRequest("http://localhost:3000/api/playbooks", "POST", VALID_PLAYBOOK_BODY),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("PATCH /api/playbooks/[id] returns 403 for interviewer", async () => {
      const res = await playbookPATCH(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`,
          "PATCH",
          VALID_PLAYBOOK_PATCH_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("DELETE /api/playbooks/[id] returns 403 for interviewer", async () => {
      const res = await playbookDELETE(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("POST /api/playbooks/[id]/stages returns 403 for interviewer", async () => {
      const res = await stagesPOST(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages`,
          "POST",
          VALID_STAGE_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("PATCH /api/playbooks/[id]/stages/[stageId] returns 403 for interviewer", async () => {
      const res = await stagePATCH(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages/${STAGE_ID}`,
          "PATCH",
          VALID_STAGE_PATCH_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID, stageId: STAGE_ID }) },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("DELETE /api/playbooks/[id]/stages/[stageId] returns 403 for interviewer", async () => {
      const res = await stageDELETE(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages/${STAGE_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID, stageId: STAGE_ID }) },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("POST /api/playbooks/[id]/stages/reorder returns 403 for interviewer", async () => {
      const res = await stagesReorderPOST(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages/reorder`,
          "POST",
          VALID_REORDER_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("POST /api/collaborators/invite returns 403 for interviewer", async () => {
      const res = await collaboratorsInvitePOST(
        makeRequest(
          "http://localhost:3000/api/collaborators/invite",
          "POST",
          VALID_INVITE_BODY,
        ),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("DELETE /api/collaborators/[id] returns 403 for interviewer", async () => {
      const res = await collaboratorDELETE(
        makeRequest(
          `http://localhost:3000/api/collaborators/${COLLABORATOR_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: COLLABORATOR_ID }) },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("POST /api/share-links returns 403 for interviewer", async () => {
      const res = await shareLinksPOST(
        makeRequest(
          "http://localhost:3000/api/share-links",
          "POST",
          VALID_SHARE_LINK_BODY,
        ),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("DELETE /api/share-links/[id] returns 403 for interviewer", async () => {
      const res = await shareLinkDELETE(
        makeRequest(
          `http://localhost:3000/api/share-links/${SHARE_LINK_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: SHARE_LINK_ID }) },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });
  });

  // =========================================================================
  // 2. Admin-only routes reject manager role (403)
  // =========================================================================

  describe("Admin-only routes reject manager role", () => {
    beforeEach(() => {
      setupAuthWithRole("manager");
    });

    it("DELETE /api/playbooks/[id] returns 403 for manager (admin-only)", async () => {
      const res = await playbookDELETE(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });
  });

  // =========================================================================
  // 3. Role-protected routes ACCEPT admin and manager
  // =========================================================================

  describe("Role-protected routes accept admin", () => {
    beforeEach(() => {
      setupAuthWithRole("admin");
    });

    it("POST /api/playbooks returns 200 for admin", async () => {
      // Need to return a created playbook from "playbooks" table
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return chainBuilder({
            data: { role: "admin", organization_id: ORG_ID },
            error: null,
          });
        }
        return chainBuilder({
          data: {
            id: PLAYBOOK_ID,
            title: "Test Playbook",
            status: "draft",
            organization_id: ORG_ID,
          },
          error: null,
        });
      });

      const res = await playbooksPOST(
        makeRequest("http://localhost:3000/api/playbooks", "POST", VALID_PLAYBOOK_BODY),
      );
      expect(res.status).toBe(200);
    });

    it("PATCH /api/playbooks/[id] returns 200 for admin", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return chainBuilder({
            data: { role: "admin", organization_id: ORG_ID },
            error: null,
          });
        }
        return chainBuilder({
          data: { id: PLAYBOOK_ID, title: "Updated" },
          error: null,
        });
      });

      const res = await playbookPATCH(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`,
          "PATCH",
          VALID_PLAYBOOK_PATCH_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(200);
    });

    it("DELETE /api/playbooks/[id] returns 200 for admin", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return chainBuilder({
            data: { role: "admin", organization_id: ORG_ID },
            error: null,
          });
        }
        return chainBuilder({
          data: { id: PLAYBOOK_ID },
          error: null,
        });
      });

      const res = await playbookDELETE(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(200);
    });
  });

  describe("Role-protected routes accept manager", () => {
    beforeEach(() => {
      setupAuthWithRole("manager");
    });

    it("POST /api/playbooks returns 200 for manager", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return chainBuilder({
            data: { role: "manager", organization_id: ORG_ID },
            error: null,
          });
        }
        return chainBuilder({
          data: {
            id: PLAYBOOK_ID,
            title: "Test Playbook",
            status: "draft",
            organization_id: ORG_ID,
          },
          error: null,
        });
      });

      const res = await playbooksPOST(
        makeRequest("http://localhost:3000/api/playbooks", "POST", VALID_PLAYBOOK_BODY),
      );
      expect(res.status).toBe(200);
    });

    it("PATCH /api/playbooks/[id] returns 200 for manager", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return chainBuilder({
            data: { role: "manager", organization_id: ORG_ID },
            error: null,
          });
        }
        return chainBuilder({
          data: { id: PLAYBOOK_ID, title: "Updated" },
          error: null,
        });
      });

      const res = await playbookPATCH(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`,
          "PATCH",
          VALID_PLAYBOOK_PATCH_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(200);
    });

    it("POST /api/collaborators/invite returns 201 for manager", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return chainBuilder({
            data: { role: "manager", organization_id: ORG_ID },
            error: null,
          });
        }
        if (table === "playbooks") {
          return chainBuilder({
            data: { title: "Test Playbook" },
            error: null,
          });
        }
        // collaborators insert
        return chainBuilder({
          data: {
            id: COLLABORATOR_ID,
            email: "collab@example.com",
            role: "interviewer",
            playbook_id: PLAYBOOK_ID,
            invite_token: "a".repeat(64),
            invited_by: USER_ID,
            expires_at: "2026-03-01T00:00:00Z",
            accepted_at: null,
            assigned_stages: null,
            name: null,
            created_at: "2026-02-20T00:00:00Z",
          },
          error: null,
        });
      });

      const res = await collaboratorsInvitePOST(
        makeRequest(
          "http://localhost:3000/api/collaborators/invite",
          "POST",
          VALID_INVITE_BODY,
        ),
      );
      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // 4. Auth-only routes accept any authenticated role
  // =========================================================================

  describe("Auth-only routes accept interviewer role", () => {
    it("GET /api/playbooks returns 200 for interviewer", async () => {
      setupAuthWithRole("interviewer");
      // GET /api/playbooks is auth-only, no role check — needs array result
      mockFrom.mockReturnValue(
        chainBuilder({ data: [], error: null }),
      );
      // Re-setup getUser since mockFrom changed
      mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });

      const res = await playbooksListGET();
      expect(res.status).toBe(200);
    });

    it("GET /api/playbooks/[id] returns 200 for interviewer", async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
      mockFrom.mockReturnValue(
        chainBuilder({
          data: { id: PLAYBOOK_ID, title: "Test", interview_stages: [] },
          error: null,
        }),
      );

      const res = await playbookDetailGET(
        makeRequest(`http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/playbooks/[id]/stages returns 200 for interviewer", async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
      mockFrom.mockReturnValue(
        chainBuilder({ data: [], error: null }),
      );

      const res = await stagesGET(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages`,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/collaborators returns 200 for interviewer", async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
      mockFrom.mockReturnValue(
        chainBuilder({ data: [], error: null }),
      );

      const res = await collaboratorsGET(
        makeRequest(
          `http://localhost:3000/api/collaborators?playbook_id=${PLAYBOOK_ID}`,
        ),
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/share-links returns 200 for interviewer", async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
      mockFrom.mockReturnValue(
        chainBuilder({ data: [], error: null }),
      );

      const res = await shareLinksGET(
        makeRequest(
          `http://localhost:3000/api/share-links?playbook_id=${PLAYBOOK_ID}`,
        ),
      );
      expect(res.status).toBe(200);
    });

    it("GET /api/feedback returns 200 for interviewer", async () => {
      setupAuthWithRole("interviewer");

      const res = await feedbackListGET(
        makeRequest(
          `http://localhost:3000/api/feedback?interview_id=${INTERVIEW_ID}`,
        ),
      );
      expect(res.status).toBe(200);
    });

    it("POST /api/feedback returns 201 for interviewer", async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
      mockFrom.mockReturnValue(
        chainBuilder({
          data: {
            id: FEEDBACK_ID,
            interview_id: INTERVIEW_ID,
            interviewer_id: USER_ID,
            ratings: [{ category: "Technical", score: 3 }],
            pros: ["Good"],
            cons: ["Slow"],
            focus_areas_confirmed: true,
            notes: null,
            submitted_at: "2026-02-20T00:00:00Z",
          },
          error: null,
        }),
      );

      const res = await feedbackPOST(
        makeRequest(
          "http://localhost:3000/api/feedback",
          "POST",
          VALID_FEEDBACK_BODY,
        ),
      );
      expect(res.status).toBe(201);
    });

    it("GET /api/feedback/[id] returns 200 for interviewer (own feedback)", async () => {
      setupAuthWithRole("interviewer");
      // Override mockFrom to return feedback owned by this user
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return chainBuilder({
            data: { role: "interviewer", organization_id: ORG_ID },
            error: null,
          });
        }
        // feedback table — return feedback belonging to the current user
        return chainBuilder({
          data: {
            id: FEEDBACK_ID,
            interview_id: INTERVIEW_ID,
            interviewer_id: USER_ID,
            ratings: [{ category: "Technical", score: 3 }],
            pros: ["Good"],
            cons: ["Slow"],
            notes: null,
            focus_areas_confirmed: true,
            submitted_at: "2026-02-20T00:00:00Z",
          },
          error: null,
        });
      });

      const res = await feedbackDetailGET(
        makeRequest(`http://localhost:3000/api/feedback/${FEEDBACK_ID}`),
        { params: Promise.resolve({ id: FEEDBACK_ID }) },
      );
      expect(res.status).toBe(200);
    });

    it("PATCH /api/feedback/[id] returns 200 for interviewer (own feedback)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
      // First call reads feedback to check ownership, second call updates
      mockFrom.mockReturnValue(
        chainBuilder({
          data: {
            id: FEEDBACK_ID,
            interviewer_id: USER_ID,
            ratings: [{ category: "Technical", score: 4 }],
          },
          error: null,
        }),
      );

      const res = await feedbackPATCH(
        makeRequest(
          `http://localhost:3000/api/feedback/${FEEDBACK_ID}`,
          "PATCH",
          VALID_FEEDBACK_PATCH_BODY,
        ),
        { params: Promise.resolve({ id: FEEDBACK_ID }) },
      );
      expect(res.status).toBe(200);
    });

    it("POST /api/transcription returns 200 for interviewer", async () => {
      const originalFetch = globalThis.fetch;
      mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
      mockFrom.mockReturnValue(chainBuilder({ data: null, error: null }));
      mockServiceFrom.mockReturnValue(
        chainBuilder({ data: null, error: null }),
      );
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () =>
          Promise.resolve(new Blob(["audio-data"], { type: "audio/mp4" })),
      }) as typeof fetch;
      mockTranscribeAudio.mockResolvedValue({
        text: "Hello interview.",
        duration: 1800,
        language: "en",
        segments: [{ start: 0, end: 5, text: "Hello" }],
      });

      try {
        const res = await transcriptionPOST(
          makeRequest(
            "http://localhost:3000/api/transcription",
            "POST",
            VALID_TRANSCRIPTION_BODY,
          ),
        );
        expect(res.status).toBe(200);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // =========================================================================
  // 5. All protected routes return 401 when unauthenticated
  // =========================================================================

  describe("All protected routes return 401 when unauthenticated", () => {
    beforeEach(() => {
      setupNoAuth();
    });

    // -- Role-protected routes (admin/manager) --

    it("POST /api/playbooks returns 401 without auth", async () => {
      const res = await playbooksPOST(
        makeRequest("http://localhost:3000/api/playbooks", "POST", VALID_PLAYBOOK_BODY),
      );
      expect(res.status).toBe(401);
    });

    it("PATCH /api/playbooks/[id] returns 401 without auth", async () => {
      const res = await playbookPATCH(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`,
          "PATCH",
          VALID_PLAYBOOK_PATCH_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("DELETE /api/playbooks/[id] returns 401 without auth", async () => {
      const res = await playbookDELETE(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/playbooks/[id]/stages returns 401 without auth", async () => {
      const res = await stagesPOST(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages`,
          "POST",
          VALID_STAGE_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("PATCH /api/playbooks/[id]/stages/[stageId] returns 401 without auth", async () => {
      const res = await stagePATCH(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages/${STAGE_ID}`,
          "PATCH",
          VALID_STAGE_PATCH_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID, stageId: STAGE_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("DELETE /api/playbooks/[id]/stages/[stageId] returns 401 without auth", async () => {
      const res = await stageDELETE(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages/${STAGE_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID, stageId: STAGE_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/playbooks/[id]/stages/reorder returns 401 without auth", async () => {
      const res = await stagesReorderPOST(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages/reorder`,
          "POST",
          VALID_REORDER_BODY,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/collaborators/invite returns 401 without auth", async () => {
      const res = await collaboratorsInvitePOST(
        makeRequest(
          "http://localhost:3000/api/collaborators/invite",
          "POST",
          VALID_INVITE_BODY,
        ),
      );
      expect(res.status).toBe(401);
    });

    it("DELETE /api/collaborators/[id] returns 401 without auth", async () => {
      const res = await collaboratorDELETE(
        makeRequest(
          `http://localhost:3000/api/collaborators/${COLLABORATOR_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: COLLABORATOR_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/share-links returns 401 without auth", async () => {
      const res = await shareLinksPOST(
        makeRequest(
          "http://localhost:3000/api/share-links",
          "POST",
          VALID_SHARE_LINK_BODY,
        ),
      );
      expect(res.status).toBe(401);
    });

    it("DELETE /api/share-links/[id] returns 401 without auth", async () => {
      const res = await shareLinkDELETE(
        makeRequest(
          `http://localhost:3000/api/share-links/${SHARE_LINK_ID}`,
          "DELETE",
        ),
        { params: Promise.resolve({ id: SHARE_LINK_ID }) },
      );
      expect(res.status).toBe(401);
    });

    // -- Auth-only routes --

    it("GET /api/playbooks returns 401 without auth", async () => {
      const res = await playbooksListGET();
      expect(res.status).toBe(401);
    });

    it("GET /api/playbooks/[id] returns 401 without auth", async () => {
      const res = await playbookDetailGET(
        makeRequest(`http://localhost:3000/api/playbooks/${PLAYBOOK_ID}`),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/playbooks/[id]/stages returns 401 without auth", async () => {
      const res = await stagesGET(
        makeRequest(
          `http://localhost:3000/api/playbooks/${PLAYBOOK_ID}/stages`,
        ),
        { params: Promise.resolve({ id: PLAYBOOK_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/collaborators returns 401 without auth", async () => {
      const res = await collaboratorsGET(
        makeRequest(
          `http://localhost:3000/api/collaborators?playbook_id=${PLAYBOOK_ID}`,
        ),
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/share-links returns 401 without auth", async () => {
      const res = await shareLinksGET(
        makeRequest(
          `http://localhost:3000/api/share-links?playbook_id=${PLAYBOOK_ID}`,
        ),
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/feedback returns 401 without auth", async () => {
      const res = await feedbackListGET(
        makeRequest(
          `http://localhost:3000/api/feedback?interview_id=${INTERVIEW_ID}`,
        ),
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/feedback returns 401 without auth", async () => {
      const res = await feedbackPOST(
        makeRequest(
          "http://localhost:3000/api/feedback",
          "POST",
          VALID_FEEDBACK_BODY,
        ),
      );
      expect(res.status).toBe(401);
    });

    it("GET /api/feedback/[id] returns 401 without auth", async () => {
      const res = await feedbackDetailGET(
        makeRequest(`http://localhost:3000/api/feedback/${FEEDBACK_ID}`),
        { params: Promise.resolve({ id: FEEDBACK_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("PATCH /api/feedback/[id] returns 401 without auth", async () => {
      const res = await feedbackPATCH(
        makeRequest(
          `http://localhost:3000/api/feedback/${FEEDBACK_ID}`,
          "PATCH",
          VALID_FEEDBACK_PATCH_BODY,
        ),
        { params: Promise.resolve({ id: FEEDBACK_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("POST /api/transcription returns 401 without auth", async () => {
      const res = await transcriptionPOST(
        makeRequest(
          "http://localhost:3000/api/transcription",
          "POST",
          VALID_TRANSCRIPTION_BODY,
        ),
      );
      expect(res.status).toBe(401);
    });
  });
});
