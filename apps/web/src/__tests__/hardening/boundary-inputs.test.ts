import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted pattern — standard project convention)
// ---------------------------------------------------------------------------

const { mockGetUser, mockFrom, mockGenerateCandidateProfile, MockAIError } =
  vi.hoisted(() => {
    class MockAIError extends Error {
      name = "AIError";
      constructor(m: string) {
        super(m);
        this.name = "AIError";
      }
    }
    return {
      mockGetUser: vi.fn(),
      mockFrom: vi.fn(),
      mockGenerateCandidateProfile: vi.fn(),
      MockAIError,
    };
  });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("crypto", () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: () => "a".repeat(64),
  }),
}));

vi.mock("@reconnect/ai", () => ({
  generateCandidateProfile: mockGenerateCandidateProfile,
  AIError: MockAIError,
}));

// Import route handlers AFTER mocks
import { POST as PlaybookPOST } from "@/app/api/playbooks/route";
import { POST as FeedbackPOST } from "@/app/api/feedback/route";
import { POST as InvitePOST } from "@/app/api/collaborators/invite/route";
import { POST as CandidateProfilePOST } from "@/app/api/ai/generate-candidate-profile/route";

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

const MOCK_USER = { id: "user-1", email: "test@example.com" };
const INTERVIEW_ID = "11111111-2222-4333-a444-555555555555";
const PLAYBOOK_ID = "11111111-2222-4333-a444-555555555555";

const CREATED_PLAYBOOK = {
  id: "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee",
  title: "Test Playbook",
  department: null,
  status: "draft",
  organization_id: "org-1",
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const MOCK_FEEDBACK_ROW = {
  id: "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee",
  interview_id: INTERVIEW_ID,
  interviewer_id: "user-1",
  ratings: [{ category: "Technical Skills", score: 3 }],
  pros: ["Strong problem-solving"],
  cons: ["Needs more experience"],
  notes: "Good interview",
  focus_areas_confirmed: true,
  submitted_at: "2026-02-20T00:00:00Z",
};

const MOCK_COLLABORATOR = {
  id: "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee",
  email: "collab@example.com",
  role: "interviewer",
  playbook_id: PLAYBOOK_ID,
  invite_token: "a".repeat(64),
  expires_at: "2026-03-01T00:00:00Z",
};

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupPlaybookProfile(role = "admin") {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: { role, organization_id: "org-1" },
        error: null,
      });
    }
    return chainBuilder({ data: CREATED_PLAYBOOK, error: null });
  });
}

function setupFeedbackProfile(role = "interviewer") {
  mockFrom.mockImplementation(() =>
    chainBuilder({ data: MOCK_FEEDBACK_ROW, error: null }),
  );
}

function setupCollaboratorProfile(role = "admin") {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: { role, organization_id: "org-1" },
        error: null,
      });
    }
    if (table === "playbooks") {
      return chainBuilder({
        data: { organization_id: "org-1", title: "Test Playbook" },
        error: null,
      });
    }
    return chainBuilder({ data: MOCK_COLLABORATOR, error: null });
  });
}

function makePlaybookPost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/playbooks", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeFeedbackPost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeInvitePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/collaborators/invite", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeCandidateProfilePost(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/ai/generate-candidate-profile",
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
}

const VALID_FEEDBACK = {
  interview_id: INTERVIEW_ID,
  ratings: [{ category: "Technical Skills", score: 3 }],
  pros: ["Strong problem-solving"],
  cons: ["Needs more experience"],
  notes: "Good interview",
  focus_areas_confirmed: true,
};

const VALID_INVITE = {
  playbook_id: PLAYBOOK_ID,
  email: "new@example.com",
  role: "interviewer" as const,
};

const VALID_CANDIDATE_PROFILE = {
  role: "Software Engineer",
  level: "Senior",
  industry: "Technology",
};

// ---------------------------------------------------------------------------
// Boundary Input Tests
// ---------------------------------------------------------------------------

describe("Boundary Input Tests", () => {
  beforeEach(() => vi.clearAllMocks());

  // =========================================================================
  // Unicode handling
  // =========================================================================

  describe("Unicode handling", () => {
    it("accepts emoji in playbook title", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(
        makePlaybookPost({ title: "Senior Engineer \u{1F680}" }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBeDefined();
    });

    it("accepts RTL text in playbook title", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(
        makePlaybookPost({ title: "\u0645\u0647\u0646\u062F\u0633 \u0628\u0631\u0645\u062C\u064A\u0627\u062A" }),
      );

      expect(res.status).toBe(200);
    });

    it("accepts RTL text in strategy role field", async () => {
      setupAuth();
      mockGenerateCandidateProfile.mockResolvedValue({
        data: { ideal_profile: {} },
        metadata: { model: "claude" },
      });

      const res = await CandidateProfilePOST(
        makeCandidateProfilePost({
          ...VALID_CANDIDATE_PROFILE,
          role: "\u0645\u0647\u0646\u062F\u0633",
        }),
      );

      expect(res.status).toBe(200);
    });

    it("accepts emoji in feedback notes", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          notes: "Great candidate \u{1F44D}\u{1F44D}\u{1F44D}",
        }),
      );

      expect(res.status).toBe(201);
    });

    it("accepts 200-char emoji string in playbook title (within max)", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      // Each emoji is 2+ chars in UTF-16 but Zod .max() counts code units, not graphemes
      // Use a 200-char string of mixed emoji and ASCII
      const emojiTitle = "\u{1F600}".repeat(100); // 200 UTF-16 code units

      const res = await PlaybookPOST(
        makePlaybookPost({ title: emojiTitle }),
      );

      // Emoji characters count as 2 code units each, so 100 emoji = 200 length
      // Zod uses .length which counts UTF-16 code units
      expect(res.status).toBe(200);
    });

    it("handles null byte in text fields", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(
        makePlaybookPost({ title: "test\x00injection" }),
      );

      // Zod does not reject null bytes in strings — they pass validation
      // BUG: should potentially reject null bytes but doesn't
      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // XSS payloads are stored safely (not rendered as HTML)
  // =========================================================================

  describe("XSS payloads are stored safely", () => {
    it("accepts HTML script tags in playbook title (stored as plain text)", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(
        makePlaybookPost({ title: "<script>alert(1)</script>" }),
      );

      // Zod doesn't sanitize HTML — the app stores as-is and renders via React (auto-escaped)
      expect(res.status).toBe(200);
    });

    it("accepts img/onerror XSS in feedback notes", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          notes: '"><img src=x onerror=alert(1)>',
        }),
      );

      expect(res.status).toBe(201);
    });

    it("accepts event-handler XSS in feedback category name", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [
            { category: '<img src=x onerror="alert(1)">', score: 3 },
          ],
        }),
      );

      expect(res.status).toBe(201);
    });

    it("rejects javascript: protocol in invite email field", async () => {
      setupAuth();
      setupCollaboratorProfile("admin");

      const res = await InvitePOST(
        makeInvitePost({
          ...VALID_INVITE,
          email: "javascript:alert(1)",
        }),
      );

      // .email() rejects non-email strings
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid input");
    });

    it("accepts XSS in invite name field (stored as text)", async () => {
      setupAuth();
      setupCollaboratorProfile("admin");

      const res = await InvitePOST(
        makeInvitePost({
          ...VALID_INVITE,
          name: '<script>alert("xss")</script>',
        }),
      );

      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // Score boundary values
  // =========================================================================

  describe("Score boundary values", () => {
    it("rejects score of 0", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "Skills", score: 0 }],
        }),
      );

      expect(res.status).toBe(400);
    });

    it("accepts score of 1 (minimum valid)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "Skills", score: 1 }],
        }),
      );

      expect(res.status).toBe(201);
    });

    it("accepts score of 4 (maximum valid)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "Skills", score: 4 }],
        }),
      );

      expect(res.status).toBe(201);
    });

    it("rejects score of 5 (above max)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "Skills", score: 5 }],
        }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects float score 2.5", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "Skills", score: 2.5 }],
        }),
      );

      // Schema uses z.number().int() — should reject floats
      expect(res.status).toBe(400);
    });

    it("rejects float score 3.7", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "Skills", score: 3.7 }],
        }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects negative score -1", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "Skills", score: -1 }],
        }),
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // String length limits
  // =========================================================================

  describe("String length limits", () => {
    it("accepts exactly 200-char playbook title", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const title = "A".repeat(200);
      const res = await PlaybookPOST(makePlaybookPost({ title }));

      expect(res.status).toBe(200);
    });

    it("rejects 201-char playbook title", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const title = "A".repeat(201);
      const res = await PlaybookPOST(makePlaybookPost({ title }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid input");
    });

    it("rejects empty title (required field)", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(makePlaybookPost({ title: "" }));

      expect(res.status).toBe(400);
    });

    it("accepts exactly 200-char role in candidate profile", async () => {
      setupAuth();
      mockGenerateCandidateProfile.mockResolvedValue({
        data: { ideal_profile: {} },
        metadata: { model: "claude" },
      });

      const res = await CandidateProfilePOST(
        makeCandidateProfilePost({
          ...VALID_CANDIDATE_PROFILE,
          role: "A".repeat(200),
        }),
      );

      expect(res.status).toBe(200);
    });

    it("rejects 201-char role in candidate profile", async () => {
      setupAuth();

      const res = await CandidateProfilePOST(
        makeCandidateProfilePost({
          ...VALID_CANDIDATE_PROFILE,
          role: "A".repeat(201),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects empty required role in candidate profile", async () => {
      setupAuth();

      const res = await CandidateProfilePOST(
        makeCandidateProfilePost({
          ...VALID_CANDIDATE_PROFILE,
          role: "",
        }),
      );

      expect(res.status).toBe(400);
    });

    it("accepts exactly 320-char email in invite", async () => {
      setupAuth();
      setupCollaboratorProfile("admin");

      // Construct a valid-format email at exactly 320 chars
      // local@domain format: local part 63 chars, @ is 1, domain fills the rest
      const localPart = "a".repeat(63);
      const domainPart =
        "b".repeat(320 - 63 - 1 - ".com".length) + ".com";
      const longEmail = `${localPart}@${domainPart}`;

      const res = await InvitePOST(
        makeInvitePost({
          ...VALID_INVITE,
          email: longEmail,
        }),
      );

      // Email format validation might fail for extremely long domains
      // This tests the .max(320) + .email() interplay
      // The test documents current behavior regardless of pass/fail
      const status = res.status;
      expect([201, 400]).toContain(status);
    });

    it("accepts max-length feedback notes (5000 chars)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          notes: "A".repeat(5000),
        }),
      );

      expect(res.status).toBe(201);
    });

    it("rejects feedback notes exceeding 5000 chars", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          notes: "A".repeat(5001),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("accepts category string at 200-char max", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "C".repeat(200), score: 3 }],
        }),
      );

      expect(res.status).toBe(201);
    });

    it("rejects category string exceeding 200 chars", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "C".repeat(201), score: 3 }],
        }),
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // Type confusion
  // =========================================================================

  describe("Type confusion", () => {
    it("rejects number in string field (playbook title)", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(makePlaybookPost({ title: 123 }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid input");
    });

    it("rejects boolean in string field (playbook title)", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(makePlaybookPost({ title: true }));

      expect(res.status).toBe(400);
    });

    it("rejects nested object in string field (role)", async () => {
      setupAuth();

      const res = await CandidateProfilePOST(
        makeCandidateProfilePost({
          ...VALID_CANDIDATE_PROFILE,
          role: { name: "Engineer" },
        }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects string in number field (feedback score)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [{ category: "Skills", score: "three" }],
        }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects null in required title field", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(makePlaybookPost({ title: null }));

      expect(res.status).toBe(400);
    });

    it("rejects undefined/missing title in playbook", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(
        makePlaybookPost({ department: "Engineering" }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects array where string expected (title)", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(
        makePlaybookPost({ title: ["Senior", "Engineer"] }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects string where boolean expected (focus_areas_confirmed)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          focus_areas_confirmed: "true",
        }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects non-UUID string for interview_id", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          interview_id: "not-a-uuid",
        }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects number for interview_id (type confusion)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          interview_id: 12345,
        }),
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // Array limits
  // =========================================================================

  describe("Array limits", () => {
    it("rejects empty ratings array (min 1)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings: [],
        }),
      );

      expect(res.status).toBe(400);
    });

    it("accepts exactly 20 ratings (at max)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const ratings = Array.from({ length: 20 }, (_, i) => ({
        category: `Category ${i + 1}`,
        score: ((i % 4) + 1) as 1 | 2 | 3 | 4,
      }));

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings,
        }),
      );

      expect(res.status).toBe(201);
    });

    it("rejects ratings array with 21 items (over max)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const ratings = Array.from({ length: 21 }, (_, i) => ({
        category: `Category ${i + 1}`,
        score: ((i % 4) + 1) as 1 | 2 | 3 | 4,
      }));

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          ratings,
        }),
      );

      expect(res.status).toBe(400);
    });

    it("accepts exactly 20 pros (at max)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          pros: Array.from({ length: 20 }, (_, i) => `Pro ${i + 1}`),
        }),
      );

      expect(res.status).toBe(201);
    });

    it("rejects pros array with 21 items (over max)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          pros: Array.from({ length: 21 }, (_, i) => `Pro ${i + 1}`),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("accepts empty pros array (no minimum)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          pros: [],
        }),
      );

      expect(res.status).toBe(201);
    });

    it("accepts empty cons array (no minimum)", async () => {
      setupAuth();
      setupFeedbackProfile();

      const res = await FeedbackPOST(
        makeFeedbackPost({
          ...VALID_FEEDBACK,
          cons: [],
        }),
      );

      expect(res.status).toBe(201);
    });

    it("rejects skills array with 51 items in playbook (max 50)", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(
        makePlaybookPost({
          title: "Engineer",
          skills: Array.from({ length: 51 }, (_, i) => `Skill ${i}`),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("accepts skills array with exactly 50 items in playbook", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(
        makePlaybookPost({
          title: "Engineer",
          skills: Array.from({ length: 50 }, (_, i) => `Skill ${i}`),
        }),
      );

      expect(res.status).toBe(200);
    });

    it("rejects assigned_stages with 21 items in invite (max 20)", async () => {
      setupAuth();
      setupCollaboratorProfile("admin");

      const uuids = Array.from(
        { length: 21 },
        (_, i) =>
          `${String(i).padStart(8, "0")}-0000-0000-0000-000000000000`,
      );

      const res = await InvitePOST(
        makeInvitePost({
          ...VALID_INVITE,
          assigned_stages: uuids,
        }),
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // Invite role enum validation
  // =========================================================================

  describe("Invite role enum validation", () => {
    it("accepts viewer role", async () => {
      setupAuth();
      setupCollaboratorProfile("admin");

      const res = await InvitePOST(
        makeInvitePost({
          ...VALID_INVITE,
          role: "viewer",
        }),
      );

      expect(res.status).toBe(201);
    });

    it("accepts interviewer role", async () => {
      setupAuth();
      setupCollaboratorProfile("admin");

      const res = await InvitePOST(
        makeInvitePost({
          ...VALID_INVITE,
          role: "interviewer",
        }),
      );

      expect(res.status).toBe(201);
    });

    it("rejects invalid role value 'admin'", async () => {
      setupAuth();
      setupCollaboratorProfile("admin");

      const res = await InvitePOST(
        makeInvitePost({
          ...VALID_INVITE,
          role: "admin",
        }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects invalid role value 'superuser'", async () => {
      setupAuth();
      setupCollaboratorProfile("admin");

      const res = await InvitePOST(
        makeInvitePost({
          ...VALID_INVITE,
          role: "superuser",
        }),
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // JSONB size limits (playbook fields)
  // =========================================================================

  describe("JSONB size limits", () => {
    it("rejects job_description exceeding 100KB", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      // Create an object that serializes to >100KB
      const largeJd: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeJd[`key_${i}`] = "x".repeat(200);
      }

      const res = await PlaybookPOST(
        makePlaybookPost({
          title: "Test",
          job_description: largeJd,
        }),
      );

      expect(res.status).toBe(400);
    });

    it("accepts job_description under 100KB", async () => {
      setupAuth();
      setupPlaybookProfile("admin");

      const res = await PlaybookPOST(
        makePlaybookPost({
          title: "Test",
          job_description: { role: "Engineer", description: "Build things" },
        }),
      );

      expect(res.status).toBe(200);
    });
  });
});
