import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted pattern — standard project convention)
// ---------------------------------------------------------------------------

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Import parseJsonb utility directly
import { parseJsonb } from "@/lib/utils/parse-jsonb";

// Import the feedback GET route for integration-level JSONB resilience
import { GET as FeedbackGET } from "@/app/api/feedback/route";

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

function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupProfileAndFeedback(
  role: string,
  feedbackRows: unknown[],
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({ data: { role }, error: null });
    }
    // feedback table — return the provided rows
    return chainBuilder({ data: feedbackRows, error: null });
  });
}

function makeGet(interviewId: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/feedback?interview_id=${interviewId}`,
    { method: "GET" },
  );
}

// ---------------------------------------------------------------------------
// 1. parseJsonb utility — direct unit tests
// ---------------------------------------------------------------------------

describe("parseJsonb resilience", () => {
  const ratingsSchema = z.array(
    z.object({ category: z.string(), score: z.number() }),
  );

  const stringArraySchema = z.array(z.string());

  it("returns null for null input", () => {
    const result = parseJsonb(null, ratingsSchema, "test-null");
    expect(result).toBeNull();
  });

  it("returns null for undefined input", () => {
    const result = parseJsonb(undefined, ratingsSchema, "test-undefined");
    expect(result).toBeNull();
  });

  it("returns null for string input", () => {
    const result = parseJsonb(
      "this is a string, not JSONB",
      ratingsSchema,
      "test-string",
    );
    expect(result).toBeNull();
  });

  it("returns null for number input", () => {
    const result = parseJsonb(42, ratingsSchema, "test-number");
    expect(result).toBeNull();
  });

  it("returns null for boolean input", () => {
    const result = parseJsonb(true, ratingsSchema, "test-boolean");
    expect(result).toBeNull();
  });

  it("returns null for empty object input (expected array)", () => {
    const result = parseJsonb({}, ratingsSchema, "test-empty-obj");
    expect(result).toBeNull();
  });

  it("returns null for array of wrong type", () => {
    const result = parseJsonb(
      [1, 2, 3], // numbers, not objects
      ratingsSchema,
      "test-wrong-array",
    );
    expect(result).toBeNull();
  });

  it("returns null for array with partially valid objects", () => {
    const result = parseJsonb(
      [
        { category: "Skills", score: 3 },
        { category: "Missing score field" }, // missing score
      ],
      ratingsSchema,
      "test-partial",
    );
    expect(result).toBeNull();
  });

  it("returns null for deeply nested invalid data", () => {
    const result = parseJsonb(
      { deeply: { nested: { invalid: true } } },
      ratingsSchema,
      "test-deep-nested",
    );
    expect(result).toBeNull();
  });

  it("parses valid JSONB correctly", () => {
    const input = [
      { category: "Technical Skills", score: 3 },
      { category: "Communication", score: 4 },
    ];
    const result = parseJsonb(input, ratingsSchema, "test-valid");
    expect(result).toEqual(input);
  });

  it("parses valid string array correctly", () => {
    const input = ["pro1", "pro2", "pro3"];
    const result = parseJsonb(input, stringArraySchema, "test-string-array");
    expect(result).toEqual(input);
  });

  it("returns null for string array containing non-strings", () => {
    const result = parseJsonb(
      ["valid", 123, true, null],
      stringArraySchema,
      "test-mixed-array",
    );
    expect(result).toBeNull();
  });

  it("returns null when schema expects object but gets array", () => {
    const objSchema = z.object({ key: z.string() });
    const result = parseJsonb(
      [{ key: "value" }],
      objSchema,
      "test-array-for-obj",
    );
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = parseJsonb("", ratingsSchema, "test-empty-string");
    expect(result).toBeNull();
  });

  it("handles label parameter being omitted", () => {
    // No label — should not throw, just use "unknown" internally
    const result = parseJsonb("bad data", ratingsSchema);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Component-level JSONB parsing logic (extracted and tested directly)
// ---------------------------------------------------------------------------

describe("Component JSONB parsing logic (feedback-list)", () => {
  // Replicate the parseRatings logic from feedback-list.tsx
  function parseRatings(
    ratingsJson: unknown,
  ): Array<{ category: string; score: number }> {
    if (!Array.isArray(ratingsJson)) return [];
    return ratingsJson.filter(
      (r): r is { category: string; score: number } =>
        typeof r === "object" &&
        r !== null &&
        "category" in r &&
        "score" in r,
    );
  }

  // Replicate the parseStringArray logic from feedback-list.tsx
  function parseStringArray(json: unknown): string[] {
    if (!Array.isArray(json)) return [];
    return json.filter((item): item is string => typeof item === "string");
  }

  describe("parseRatings", () => {
    it("returns empty array for null", () => {
      expect(parseRatings(null)).toEqual([]);
    });

    it("returns empty array for undefined", () => {
      expect(parseRatings(undefined)).toEqual([]);
    });

    it("returns empty array for string", () => {
      expect(parseRatings("not an array")).toEqual([]);
    });

    it("returns empty array for number", () => {
      expect(parseRatings(42)).toEqual([]);
    });

    it("returns empty array for empty object {}", () => {
      expect(parseRatings({})).toEqual([]);
    });

    it("returns empty array for boolean", () => {
      expect(parseRatings(true)).toEqual([]);
    });

    it("filters out items missing category field", () => {
      const result = parseRatings([
        { category: "Skills", score: 3 },
        { score: 2 }, // missing category
        { category: "Communication", score: 4 },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe("Skills");
      expect(result[1].category).toBe("Communication");
    });

    it("filters out items missing score field", () => {
      const result = parseRatings([
        { category: "Skills", score: 3 },
        { category: "Missing score" }, // missing score
      ]);
      expect(result).toHaveLength(1);
    });

    it("keeps items with score as string (no strict type check)", () => {
      // BUG: parseRatings checks 'score' in r but not typeof score === 'number'
      // This means score: "three" passes the filter and reaches the UI
      const result = parseRatings([
        { category: "Skills", score: "three" },
      ]);
      // The current implementation accepts this because it only checks 'in', not type
      expect(result).toHaveLength(1);
    });

    it("handles deeply nested unexpected JSONB", () => {
      const result = parseRatings({
        ratings: [{ category: "Skills", score: 3 }],
      });
      expect(result).toEqual([]);
    });

    it("handles array of primitives", () => {
      const result = parseRatings([1, "string", true, null]);
      expect(result).toEqual([]);
    });

    it("handles array of null values", () => {
      const result = parseRatings([null, null, null]);
      expect(result).toEqual([]);
    });
  });

  describe("parseStringArray", () => {
    it("returns empty array for null", () => {
      expect(parseStringArray(null)).toEqual([]);
    });

    it("returns empty array for undefined", () => {
      expect(parseStringArray(undefined)).toEqual([]);
    });

    it("returns empty array for number", () => {
      expect(parseStringArray(42)).toEqual([]);
    });

    it("returns empty array for string", () => {
      expect(parseStringArray("not an array")).toEqual([]);
    });

    it("returns empty array for object", () => {
      expect(parseStringArray({ pros: ["a"] })).toEqual([]);
    });

    it("filters out non-string items from mixed array", () => {
      const result = parseStringArray(["valid", 123, true, null, "also valid"]);
      expect(result).toEqual(["valid", "also valid"]);
    });

    it("returns all items for valid string array", () => {
      expect(parseStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    });

    it("returns empty array for array of only non-strings", () => {
      expect(parseStringArray([1, 2, 3, null, true])).toEqual([]);
    });

    it("handles empty array", () => {
      expect(parseStringArray([])).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Feedback GET route JSONB resilience (integration-level)
// ---------------------------------------------------------------------------

describe("Feedback GET route JSONB resilience", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with feedback that has ratings as empty object {}", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", [
      {
        id: "fb-1",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-1",
        ratings: {}, // malformed: should be array
        pros: ["Good"],
        cons: [],
        notes: null,
        focus_areas_confirmed: true,
        submitted_at: "2026-02-20T00:00:00Z",
      },
    ]);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));

    // Route passes through raw DB data — does not crash
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].ratings).toEqual({});
  });

  it("returns 200 with feedback that has ratings as string", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", [
      {
        id: "fb-2",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-1",
        ratings: "not an array", // malformed
        pros: [],
        cons: [],
        notes: null,
        focus_areas_confirmed: true,
        submitted_at: "2026-02-20T00:00:00Z",
      },
    ]);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].ratings).toBe("not an array");
  });

  it("returns 200 with feedback that has ratings as null", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", [
      {
        id: "fb-3",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-1",
        ratings: null, // null instead of array
        pros: ["Good"],
        cons: ["Bad"],
        notes: null,
        focus_areas_confirmed: true,
        submitted_at: "2026-02-20T00:00:00Z",
      },
    ]);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].ratings).toBeNull();
  });

  it("returns 200 with feedback that has ratings items missing category", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", [
      {
        id: "fb-4",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-1",
        ratings: [{ score: 3 }, { score: 2 }], // missing category fields
        pros: [],
        cons: [],
        notes: null,
        focus_areas_confirmed: true,
        submitted_at: "2026-02-20T00:00:00Z",
      },
    ]);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Route passes malformed data through; component-level parsing handles gracefully
    expect(body.data[0].ratings).toEqual([{ score: 3 }, { score: 2 }]);
  });

  it("returns 200 with feedback that has rating scores as strings", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", [
      {
        id: "fb-5",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-1",
        ratings: [{ category: "Skills", score: "three" }], // score is string
        pros: [],
        cons: [],
        notes: null,
        focus_areas_confirmed: true,
        submitted_at: "2026-02-20T00:00:00Z",
      },
    ]);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));
    expect(res.status).toBe(200);
  });

  it("returns 200 with feedback that has pros as number instead of array", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", [
      {
        id: "fb-6",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-1",
        ratings: [{ category: "Skills", score: 3 }],
        pros: 42, // malformed: should be array
        cons: [],
        notes: null,
        focus_areas_confirmed: true,
        submitted_at: "2026-02-20T00:00:00Z",
      },
    ]);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].pros).toBe(42);
  });

  it("returns 200 with feedback that has cons as nested object", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", [
      {
        id: "fb-7",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-1",
        ratings: [{ category: "Skills", score: 3 }],
        pros: ["Good"],
        cons: { nested: { invalid: true } }, // malformed
        notes: null,
        focus_areas_confirmed: true,
        submitted_at: "2026-02-20T00:00:00Z",
      },
    ]);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));
    expect(res.status).toBe(200);
  });

  it("returns 200 with feedback that has deeply nested unexpected JSONB in all fields", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", [
      {
        id: "fb-8",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-1",
        ratings: { deeply: { nested: [1, 2, 3] } },
        pros: { also: "wrong" },
        cons: "just a string",
        notes: null,
        focus_areas_confirmed: true,
        submitted_at: "2026-02-20T00:00:00Z",
      },
    ]);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));
    // Route should NOT crash — it returns raw DB data as-is
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("returns 200 with empty array when no feedback exists", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", []);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("returns 200 with feedback containing mixed valid and malformed rows", async () => {
    setupAuth();
    setupProfileAndFeedback("admin", [
      {
        id: "fb-good",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-1",
        ratings: [{ category: "Skills", score: 3 }],
        pros: ["Strong communicator"],
        cons: ["Needs improvement"],
        notes: "Good candidate",
        focus_areas_confirmed: true,
        submitted_at: "2026-02-20T00:00:00Z",
      },
      {
        id: "fb-bad",
        interview_id: INTERVIEW_ID,
        interviewer_id: "user-2",
        ratings: "corrupted",
        pros: null,
        cons: 999,
        notes: null,
        focus_areas_confirmed: false,
        submitted_at: "2026-02-20T01:00:00Z",
      },
    ]);

    const res = await FeedbackGET(makeGet(INTERVIEW_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 4. parseJsonb with complex real-world schemas
// ---------------------------------------------------------------------------

describe("parseJsonb with complex schemas", () => {
  const feedbackRatingsSchema = z.array(
    z.object({
      category: z.string().min(1).max(200),
      score: z.number().int().min(1).max(4),
      notes: z.string().max(1000).optional(),
    }),
  );

  it("rejects rating with score 0 via parseJsonb", () => {
    const result = parseJsonb(
      [{ category: "Skills", score: 0 }],
      feedbackRatingsSchema,
      "ratings",
    );
    expect(result).toBeNull();
  });

  it("rejects rating with score 5 via parseJsonb", () => {
    const result = parseJsonb(
      [{ category: "Skills", score: 5 }],
      feedbackRatingsSchema,
      "ratings",
    );
    expect(result).toBeNull();
  });

  it("accepts valid ratings via parseJsonb", () => {
    const input = [
      { category: "Technical Skills", score: 3, notes: "Solid" },
      { category: "Communication", score: 4 },
    ];
    const result = parseJsonb(input, feedbackRatingsSchema, "ratings");
    expect(result).toEqual(input);
  });

  it("rejects rating with float score via parseJsonb", () => {
    const result = parseJsonb(
      [{ category: "Skills", score: 2.5 }],
      feedbackRatingsSchema,
      "ratings",
    );
    expect(result).toBeNull();
  });

  it("rejects rating with negative score via parseJsonb", () => {
    const result = parseJsonb(
      [{ category: "Skills", score: -1 }],
      feedbackRatingsSchema,
      "ratings",
    );
    expect(result).toBeNull();
  });

  it("rejects rating with empty category via parseJsonb", () => {
    const result = parseJsonb(
      [{ category: "", score: 3 }],
      feedbackRatingsSchema,
      "ratings",
    );
    expect(result).toBeNull();
  });

  it("rejects rating with category exceeding 200 chars via parseJsonb", () => {
    const result = parseJsonb(
      [{ category: "X".repeat(201), score: 3 }],
      feedbackRatingsSchema,
      "ratings",
    );
    expect(result).toBeNull();
  });

  it("rejects rating with notes exceeding 1000 chars via parseJsonb", () => {
    const result = parseJsonb(
      [{ category: "Skills", score: 3, notes: "N".repeat(1001) }],
      feedbackRatingsSchema,
      "ratings",
    );
    expect(result).toBeNull();
  });

  it("handles JSON that looks like JSONB but has extra fields (Zod strips them)", () => {
    const input = [
      {
        category: "Skills",
        score: 3,
        extra_field: "should be stripped",
      },
    ];
    const result = parseJsonb(input, feedbackRatingsSchema, "ratings");
    // Zod v3 silently strips unknown fields in safeParse
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].category).toBe("Skills");
    // The extra field is stripped by Zod
    expect((result![0] as Record<string, unknown>)["extra_field"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 5. AI synthesis JSONB parsing logic (from ai-synthesis-panel.tsx)
// ---------------------------------------------------------------------------

describe("AI synthesis panel JSONB parsing logic", () => {
  // Replicate the ratings parsing from ai-synthesis-panel.tsx
  function parseFeedbackRatings(
    ratings: unknown,
  ): Array<{ category: string; score: number }> {
    return Array.isArray(ratings)
      ? ratings.filter(
          (r: unknown): r is { category: string; score: number } =>
            typeof r === "object" &&
            r !== null &&
            "category" in r &&
            "score" in r,
        )
      : [];
  }

  function parseFeedbackStrings(arr: unknown): string[] {
    return Array.isArray(arr)
      ? arr.filter((p: unknown): p is string => typeof p === "string")
      : [];
  }

  it("handles ratings as null", () => {
    expect(parseFeedbackRatings(null)).toEqual([]);
  });

  it("handles ratings as undefined", () => {
    expect(parseFeedbackRatings(undefined)).toEqual([]);
  });

  it("handles ratings as string", () => {
    expect(parseFeedbackRatings("corrupted")).toEqual([]);
  });

  it("handles ratings as number", () => {
    expect(parseFeedbackRatings(42)).toEqual([]);
  });

  it("handles ratings as empty object", () => {
    expect(parseFeedbackRatings({})).toEqual([]);
  });

  it("handles valid ratings", () => {
    const result = parseFeedbackRatings([
      { category: "Skills", score: 3 },
    ]);
    expect(result).toHaveLength(1);
  });

  it("handles pros as null", () => {
    expect(parseFeedbackStrings(null)).toEqual([]);
  });

  it("handles pros as number", () => {
    expect(parseFeedbackStrings(42)).toEqual([]);
  });

  it("handles pros with mixed types", () => {
    const result = parseFeedbackStrings(["valid", 123, null, "also valid"]);
    expect(result).toEqual(["valid", "also valid"]);
  });

  it("handles cons as nested object", () => {
    expect(parseFeedbackStrings({ bad: "data" })).toEqual([]);
  });
});
