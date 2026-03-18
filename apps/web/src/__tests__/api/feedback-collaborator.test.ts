import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockServiceFrom } = vi.hoisted(() => ({
  mockServiceFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({ from: mockServiceFrom })),
}));

import { POST } from "@/app/api/feedback/collaborator/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = "test-collab-token-123";
const INTERVIEW_ID = "a1111111-1111-4111-a111-111111111111";
const COLLABORATOR_ID = "c2222222-2222-4222-a222-222222222222";
const STAGE_ID = "s3333333-3333-4333-a333-333333333333";
const PLAYBOOK_ID = "p4444444-4444-4444-a444-444444444444";

const VALID_BODY = {
  token: VALID_TOKEN,
  interview_id: INTERVIEW_ID,
  ratings: [{ category: "Technical Skills", score: 3 }],
  pros: ["Strong coding"],
  cons: ["Limited system design"],
  focus_areas_confirmed: true as const,
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/feedback/collaborator", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

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
    "not",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/feedback/collaborator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 on invalid body", async () => {
    const res = await POST(makePost({ token: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 for invalid token", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "collaborators") {
        return chainBuilder({ data: null, error: { message: "not found" } });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Invalid token");
  });

  it("returns 404 for expired token", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "collaborators") {
        return chainBuilder({
          data: {
            id: COLLABORATOR_ID,
            expires_at: "2020-01-01T00:00:00Z", // expired
            assigned_stages: [STAGE_ID],
          },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Token expired");
  });

  it("returns 403 when stage not assigned", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "collaborators") {
        return chainBuilder({
          data: {
            id: COLLABORATOR_ID,
            playbook_id: PLAYBOOK_ID,
            expires_at: "2030-01-01T00:00:00Z",
            assigned_stages: ["other-stage-id"],
          },
          error: null,
        });
      }
      if (table === "interviews") {
        return chainBuilder({
          data: {
            id: INTERVIEW_ID,
            stage_id: STAGE_ID,
            candidate_id: "cand-1",
          },
          error: null,
        });
      }
      if (table === "interview_stages") {
        return chainBuilder({
          data: { playbook_id: PLAYBOOK_ID },
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 409 for duplicate submission", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "collaborators") {
        return chainBuilder({
          data: {
            id: COLLABORATOR_ID,
            playbook_id: PLAYBOOK_ID,
            expires_at: "2030-01-01T00:00:00Z",
            assigned_stages: [STAGE_ID],
          },
          error: null,
        });
      }
      if (table === "interviews") {
        return chainBuilder({
          data: { id: INTERVIEW_ID, stage_id: STAGE_ID, candidate_id: "c1" },
          error: null,
        });
      }
      if (table === "interview_stages") {
        return chainBuilder({
          data: { playbook_id: PLAYBOOK_ID },
          error: null,
        });
      }
      if (table === "feedback") {
        return chainBuilder({
          data: [{ id: "existing-feedback-id" }], // Already exists
          error: null,
        });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(409);
  });

  it("returns 201 on successful submission", async () => {
    const feedbackResult = {
      id: "fb-1",
      interview_id: INTERVIEW_ID,
      collaborator_id: COLLABORATOR_ID,
    };

    let feedbackCallCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "collaborators") {
        return chainBuilder({
          data: {
            id: COLLABORATOR_ID,
            playbook_id: PLAYBOOK_ID,
            expires_at: "2030-01-01T00:00:00Z",
            assigned_stages: [STAGE_ID],
          },
          error: null,
        });
      }
      if (table === "interviews") {
        return chainBuilder({
          data: { id: INTERVIEW_ID, stage_id: STAGE_ID, candidate_id: "c1" },
          error: null,
        });
      }
      if (table === "interview_stages") {
        return chainBuilder({
          data: { playbook_id: PLAYBOOK_ID },
          error: null,
        });
      }
      if (table === "feedback") {
        feedbackCallCount++;
        if (feedbackCallCount === 1) {
          // Duplicate check — empty array = no duplicates
          return chainBuilder({ data: [], error: null });
        }
        // Insert
        return chainBuilder({ data: feedbackResult, error: null });
      }
      return chainBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.collaborator_id).toBe(COLLABORATOR_ID);
  });
});
