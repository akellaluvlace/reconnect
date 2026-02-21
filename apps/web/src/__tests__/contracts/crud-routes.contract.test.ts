/**
 * Contract tests for all non-AI CRUD routes.
 *
 * Each test calls the real route handler with a mocked Supabase client,
 * then validates the response JSON against the consumer-expected Zod schema
 * from `./schemas.ts`.  This guarantees the API never ships a shape that
 * breaks the UI layer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// -------------------------------------------------------------------------
// Hoisted mocks (must be before any imports that use the mocked modules)
// -------------------------------------------------------------------------

const {
  mockGetUser,
  mockFrom,
  mockServiceFrom,
  mockTranscribeAudio,
} = vi.hoisted(() => ({
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

vi.mock("@/lib/openai/client", () => ({
  transcribeAudio: mockTranscribeAudio,
}));

vi.mock("@/lib/email/resend-client", () => ({
  sendCollaboratorInvite: vi.fn().mockResolvedValue(undefined),
}));

// -------------------------------------------------------------------------
// Route imports (after all vi.mock calls)
// -------------------------------------------------------------------------

import { GET as collaboratorsGET } from "@/app/api/collaborators/route";
import { POST as collaboratorsInvitePOST } from "@/app/api/collaborators/invite/route";
import { DELETE as collaboratorsDELETE } from "@/app/api/collaborators/[id]/route";
import {
  GET as shareLinksGET,
  POST as shareLinksPOST,
} from "@/app/api/share-links/route";
import { DELETE as shareLinksDELETE } from "@/app/api/share-links/[id]/route";
import {
  GET as feedbackGET,
  POST as feedbackPOST,
} from "@/app/api/feedback/route";
import { POST as consentPOST } from "@/app/api/consent/route";
import { POST as transcriptionPOST } from "@/app/api/transcription/route";

// -------------------------------------------------------------------------
// Contract schemas
// -------------------------------------------------------------------------

import {
  CollaboratorsListResponseSchema,
  CollaboratorInviteResponseSchema,
  SuccessResponseSchema,
  ShareLinksListResponseSchema,
  ShareLinkResponseSchema,
  FeedbackListResponseSchema,
  FeedbackCreateResponseSchema,
  ConsentResponseSchema,
  TranscriptionResponseSchema,
  ErrorResponseSchema,
} from "./schemas";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

import { NextRequest } from "next/server";

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

// -- Valid UUIDs (hex only: 0-9, a-f) --
const USER_ID = "aabbccdd-1122-4344-a566-778899aabb00";
const ORG_ID = "00112233-4455-6677-8899-aabbccddeeff";
const PLAYBOOK_ID = "11223344-5566-7788-99aa-bbccddeeff00";
const COLLABORATOR_ID = "aabbccdd-eeff-4011-a233-445566778899";
const SHARE_LINK_ID = "11223344-aabb-4cdd-aeff-001122334455";
const FEEDBACK_ID = "55667788-99aa-4bcc-adee-ff0011223344";
const INTERVIEW_ID = "99aabbcc-ddee-4f00-a122-334455667788";

const MOCK_USER = { id: USER_ID, email: "test@example.com" };

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

/**
 * Set up mockFrom so "users" returns profile, all other tables return tableData.
 */
function setupProfileAndTable(
  role: string,
  tableData: unknown = [],
  tableError: unknown = null,
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: { role, organization_id: ORG_ID },
        error: null,
      });
    }
    return chainBuilder({ data: tableData, error: tableError });
  });
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

/**
 * Parse response and validate against schema. Logs issues on failure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expectSchema(body: unknown, schema: { safeParse: (v: unknown) => any }, label: string) {
  const result = schema.safeParse(body);
  if (!result.success) {
    console.error(
      `[CONTRACT FAIL] ${label}:`,
      JSON.stringify(result.error.issues, null, 2),
    );
    console.error("Actual body:", JSON.stringify(body, null, 2));
  }
  expect(result.success, `Schema validation failed for ${label}`).toBe(true);
}

// -------------------------------------------------------------------------
// Mock data — realistic shapes
// -------------------------------------------------------------------------

const MOCK_COLLABORATOR = {
  id: COLLABORATOR_ID,
  email: "collab@test.com",
  name: "Test Collaborator",
  role: "interviewer",
  playbook_id: PLAYBOOK_ID,
  invite_token: "a".repeat(64),
  invited_by: USER_ID,
  expires_at: "2026-03-01T00:00:00Z",
  accepted_at: null,
  assigned_stages: null,
  created_at: "2026-02-20T00:00:00Z",
};

const MOCK_SHARE_LINK = {
  id: SHARE_LINK_ID,
  token: "a".repeat(64),
  playbook_id: PLAYBOOK_ID,
  is_active: true,
  expires_at: "2026-03-22T00:00:00Z",
  view_count: 0,
  created_at: "2026-02-20T00:00:00Z",
  created_by: USER_ID,
};

const MOCK_FEEDBACK = {
  id: FEEDBACK_ID,
  interview_id: INTERVIEW_ID,
  interviewer_id: USER_ID,
  ratings: [{ category: "Technical", score: 3 }],
  pros: ["Good problem-solving skills"],
  cons: ["Slow response time"],
  notes: null,
  focus_areas_confirmed: true,
  submitted_at: "2026-02-20T00:00:00Z",
};

// =========================================================================
// 1. GET /api/collaborators
// =========================================================================

describe("CONTRACT: GET /api/collaborators", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: response matches CollaboratorsListResponseSchema", async () => {
    setupAuth();
    setupProfileAndTable("admin", [MOCK_COLLABORATOR]);

    const res = await collaboratorsGET(
      makeRequest(`http://localhost:3000/api/collaborators?playbook_id=${PLAYBOOK_ID}`),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSchema(body, CollaboratorsListResponseSchema, "GET /api/collaborators");
  });

  it("401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await collaboratorsGET(
      makeRequest(`http://localhost:3000/api/collaborators?playbook_id=${PLAYBOOK_ID}`),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "GET /api/collaborators 401");
  });
});

// =========================================================================
// 2. POST /api/collaborators/invite
// =========================================================================

describe("CONTRACT: POST /api/collaborators/invite", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_INVITE = {
    playbook_id: PLAYBOOK_ID,
    email: "newcollab@example.com",
    name: "New Person",
    role: "interviewer" as const,
  };

  it("happy path: response matches CollaboratorInviteResponseSchema", async () => {
    setupAuth();
    // After profile check (users table), the invite INSERT returns single collaborator
    // The route also queries "playbooks" for the email — we need that to succeed too
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return chainBuilder({
          data: { role: "admin", organization_id: ORG_ID },
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
      return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
    });

    const res = await collaboratorsInvitePOST(
      makeRequest("http://localhost:3000/api/collaborators/invite", "POST", VALID_INVITE),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expectSchema(body, CollaboratorInviteResponseSchema, "POST /api/collaborators/invite");
  });

  it("401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await collaboratorsInvitePOST(
      makeRequest("http://localhost:3000/api/collaborators/invite", "POST", VALID_INVITE),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "POST /api/collaborators/invite 401");
  });

  it("403 when role is interviewer (not admin/manager)", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await collaboratorsInvitePOST(
      makeRequest("http://localhost:3000/api/collaborators/invite", "POST", VALID_INVITE),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "POST /api/collaborators/invite 403");
  });
});

// =========================================================================
// 3. DELETE /api/collaborators/[id]
// =========================================================================

describe("CONTRACT: DELETE /api/collaborators/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: response matches SuccessResponseSchema", async () => {
    setupAuth();
    setupProfileAndTable("admin");

    const res = await collaboratorsDELETE(
      makeRequest(`http://localhost:3000/api/collaborators/${COLLABORATOR_ID}`, "DELETE"),
      { params: Promise.resolve({ id: COLLABORATOR_ID }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSchema(body, SuccessResponseSchema, "DELETE /api/collaborators/[id]");
  });

  it("401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await collaboratorsDELETE(
      makeRequest(`http://localhost:3000/api/collaborators/${COLLABORATOR_ID}`, "DELETE"),
      { params: Promise.resolve({ id: COLLABORATOR_ID }) },
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "DELETE /api/collaborators/[id] 401");
  });

  it("403 when role is interviewer", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await collaboratorsDELETE(
      makeRequest(`http://localhost:3000/api/collaborators/${COLLABORATOR_ID}`, "DELETE"),
      { params: Promise.resolve({ id: COLLABORATOR_ID }) },
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "DELETE /api/collaborators/[id] 403");
  });
});

// =========================================================================
// 4. GET /api/share-links
// =========================================================================

describe("CONTRACT: GET /api/share-links", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: response matches ShareLinksListResponseSchema", async () => {
    setupAuth();
    setupProfileAndTable("admin", [MOCK_SHARE_LINK]);

    const res = await shareLinksGET(
      makeRequest(`http://localhost:3000/api/share-links?playbook_id=${PLAYBOOK_ID}`),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSchema(body, ShareLinksListResponseSchema, "GET /api/share-links");
  });

  it("401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await shareLinksGET(
      makeRequest(`http://localhost:3000/api/share-links?playbook_id=${PLAYBOOK_ID}`),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "GET /api/share-links 401");
  });
});

// =========================================================================
// 5. POST /api/share-links
// =========================================================================

describe("CONTRACT: POST /api/share-links", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_SHARE_LINK_BODY = {
    playbook_id: PLAYBOOK_ID,
    expires_in_days: 30,
  };

  it("happy path: response matches ShareLinkResponseSchema with status 201", async () => {
    setupAuth();
    setupProfileAndTable("admin", MOCK_SHARE_LINK);

    const res = await shareLinksPOST(
      makeRequest("http://localhost:3000/api/share-links", "POST", VALID_SHARE_LINK_BODY),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expectSchema(body, ShareLinkResponseSchema, "POST /api/share-links");
  });

  it("401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await shareLinksPOST(
      makeRequest("http://localhost:3000/api/share-links", "POST", VALID_SHARE_LINK_BODY),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "POST /api/share-links 401");
  });

  it("403 when role is interviewer (not admin/manager)", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await shareLinksPOST(
      makeRequest("http://localhost:3000/api/share-links", "POST", VALID_SHARE_LINK_BODY),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "POST /api/share-links 403");
  });
});

// =========================================================================
// 6. DELETE /api/share-links/[id]
// =========================================================================

describe("CONTRACT: DELETE /api/share-links/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: response matches SuccessResponseSchema", async () => {
    setupAuth();
    setupProfileAndTable("admin");

    const res = await shareLinksDELETE(
      makeRequest(`http://localhost:3000/api/share-links/${SHARE_LINK_ID}`, "DELETE"),
      { params: Promise.resolve({ id: SHARE_LINK_ID }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSchema(body, SuccessResponseSchema, "DELETE /api/share-links/[id]");
  });

  it("401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await shareLinksDELETE(
      makeRequest(`http://localhost:3000/api/share-links/${SHARE_LINK_ID}`, "DELETE"),
      { params: Promise.resolve({ id: SHARE_LINK_ID }) },
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "DELETE /api/share-links/[id] 401");
  });

  it("403 when role is interviewer", async () => {
    setupAuth();
    setupProfileAndTable("interviewer");

    const res = await shareLinksDELETE(
      makeRequest(`http://localhost:3000/api/share-links/${SHARE_LINK_ID}`, "DELETE"),
      { params: Promise.resolve({ id: SHARE_LINK_ID }) },
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "DELETE /api/share-links/[id] 403");
  });
});

// =========================================================================
// 7. GET /api/feedback
// =========================================================================

describe("CONTRACT: GET /api/feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: response matches FeedbackListResponseSchema", async () => {
    setupAuth();
    setupProfileAndTable("admin", [MOCK_FEEDBACK]);

    const res = await feedbackGET(
      makeRequest(`http://localhost:3000/api/feedback?interview_id=${INTERVIEW_ID}`),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSchema(body, FeedbackListResponseSchema, "GET /api/feedback");
  });

  it("401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await feedbackGET(
      makeRequest(`http://localhost:3000/api/feedback?interview_id=${INTERVIEW_ID}`),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "GET /api/feedback 401");
  });
});

// =========================================================================
// 8. POST /api/feedback
// =========================================================================

describe("CONTRACT: POST /api/feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_FEEDBACK_BODY = {
    interview_id: INTERVIEW_ID,
    ratings: [{ category: "Technical", score: 3 }],
    pros: ["Good problem-solving skills"],
    cons: ["Slow response time"],
    focus_areas_confirmed: true,
  };

  it("happy path: response matches FeedbackCreateResponseSchema with status 201", async () => {
    setupAuth();
    setupProfileAndTable("interviewer", MOCK_FEEDBACK);

    const res = await feedbackPOST(
      makeRequest("http://localhost:3000/api/feedback", "POST", VALID_FEEDBACK_BODY),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expectSchema(body, FeedbackCreateResponseSchema, "POST /api/feedback");
  });

  it("401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await feedbackPOST(
      makeRequest("http://localhost:3000/api/feedback", "POST", VALID_FEEDBACK_BODY),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "POST /api/feedback 401");
  });
});

// =========================================================================
// 9. POST /api/consent
// =========================================================================

describe("CONTRACT: POST /api/consent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: response matches ConsentResponseSchema", async () => {
    // Consent uses service-role client, not user auth
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "collaborators") {
        return chainBuilder({
          data: { id: COLLABORATOR_ID, playbook_id: PLAYBOOK_ID },
          error: null,
        });
      }
      if (table === "interviews") {
        return chainBuilder({ data: null, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await consentPOST(
      makeRequest("http://localhost:3000/api/consent", "POST", {
        token: "a".repeat(64),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSchema(body, ConsentResponseSchema, "POST /api/consent");
  });

  it("404 when token is invalid (collaborator not found)", async () => {
    mockServiceFrom.mockReturnValue(
      chainBuilder({ data: null, error: { code: "PGRST116", message: "not found" } }),
    );

    const res = await consentPOST(
      makeRequest("http://localhost:3000/api/consent", "POST", {
        token: "invalid-token-value",
      }),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "POST /api/consent 404");
  });
});

// =========================================================================
// 10. POST /api/transcription
// =========================================================================

describe("CONTRACT: POST /api/transcription", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const VALID_TRANSCRIPTION_BODY = {
    interview_id: INTERVIEW_ID,
    recording_url:
      "https://vfufxduwywrnwbjtwdjz.supabase.co/storage/v1/object/recordings/recording.m4a",
  };

  it("happy path: response matches TranscriptionResponseSchema", async () => {
    setupAuth();
    mockFrom.mockReturnValue(chainBuilder({ data: null, error: null }));
    mockServiceFrom.mockReturnValue(chainBuilder({ data: null, error: null }));

    // Mock audio download via globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob(["audio-data"], { type: "audio/mp4" })),
    }) as typeof fetch;

    mockTranscribeAudio.mockResolvedValue({
      text: "Hello, this is a test interview transcription.",
      duration: 1800,
      language: "en",
      segments: [{ start: 0, end: 5, text: "Hello" }],
    });

    const res = await transcriptionPOST(
      makeRequest("http://localhost:3000/api/transcription", "POST", VALID_TRANSCRIPTION_BODY),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectSchema(body, TranscriptionResponseSchema, "POST /api/transcription");
  });

  it("401 when unauthenticated", async () => {
    setupAuth(null);

    const res = await transcriptionPOST(
      makeRequest("http://localhost:3000/api/transcription", "POST", VALID_TRANSCRIPTION_BODY),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expectSchema(body, ErrorResponseSchema, "POST /api/transcription 401");
  });
});
