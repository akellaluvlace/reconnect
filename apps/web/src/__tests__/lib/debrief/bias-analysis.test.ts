import { describe, it, expect } from "vitest";
import {
  analyzeBias,
  detectHaloEffect,
  detectLeniencySeverity,
  detectGroupthink,
  type FeedbackForAnalysis,
} from "@/lib/debrief/bias-analysis";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFeedback(
  overrides: Partial<FeedbackForAnalysis> & { interviewer_id: string },
): FeedbackForAnalysis {
  return {
    ratings: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// analyzeBias — edge cases
// ---------------------------------------------------------------------------

describe("analyzeBias", () => {
  it("returns empty array for empty input", () => {
    const result = analyzeBias([]);
    expect(result).toEqual([]);
  });

  it("returns empty array for feedback with no ratings", () => {
    const result = analyzeBias([
      makeFeedback({ interviewer_id: "i1", ratings: [] }),
      makeFeedback({ interviewer_id: "i2", ratings: [] }),
    ]);
    expect(result).toEqual([]);
  });

  it("returns multiple flags when multiple patterns present", () => {
    // Interviewer gives all 4s (halo + leniency), two interviewers with same scores (groupthink)
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 4 },
          { category: "Technical", score: 4 },
          { category: "Leadership", score: 4 },
        ],
      }),
      makeFeedback({
        interviewer_id: "i2",
        ratings: [
          { category: "Communication", score: 4 },
          { category: "Technical", score: 4 },
          { category: "Leadership", score: 4 },
        ],
      }),
    ];

    const result = analyzeBias(feedback);

    // Should have halo, leniency, and groupthink flags
    const types = result.map((f) => f.type);
    expect(types).toContain("halo");
    expect(types).toContain("leniency");
    expect(types).toContain("groupthink");
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// detectHaloEffect
// ---------------------------------------------------------------------------

describe("detectHaloEffect", () => {
  it("flags when all ratings identical from one interviewer (3+ ratings)", () => {
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 3 },
          { category: "Technical", score: 3 },
          { category: "Leadership", score: 3 },
        ],
      }),
    ];

    const flags = detectHaloEffect(feedback);

    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("halo");
    expect(flags[0].severity).toBe("warning");
    expect(flags[0].label).toBe("Uniform ratings detected");
    expect(flags[0].description).toContain("identical scores");
    expect(flags[0].description).toContain("halo effect");
  });

  it("does NOT flag when ratings vary", () => {
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 3 },
          { category: "Technical", score: 2 },
          { category: "Leadership", score: 4 },
        ],
      }),
    ];

    const flags = detectHaloEffect(feedback);

    expect(flags).toHaveLength(0);
  });

  it("does NOT flag with fewer than 3 ratings", () => {
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 3 },
          { category: "Technical", score: 3 },
        ],
      }),
    ];

    const flags = detectHaloEffect(feedback);

    expect(flags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectLeniencySeverity
// ---------------------------------------------------------------------------

describe("detectLeniencySeverity", () => {
  it("flags leniency when avg >= 3.8", () => {
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 4 },
          { category: "Technical", score: 4 },
          { category: "Leadership", score: 3 },
        ],
      }),
    ];

    // Average = (4+4+3)/3 = 3.67 — NOT flagged
    // Let's use scores that do trigger: 4,4,4 → avg 4.0
    const feedbackHigh: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 4 },
          { category: "Technical", score: 4 },
          { category: "Leadership", score: 4 },
        ],
      }),
    ];

    const flags = detectLeniencySeverity(feedbackHigh);

    const leniencyFlags = flags.filter((f) => f.type === "leniency");
    expect(leniencyFlags).toHaveLength(1);
    expect(leniencyFlags[0].severity).toBe("info");
    expect(leniencyFlags[0].label).toBe("Consistently high ratings");
    expect(leniencyFlags[0].description).toContain("top of the scale");
  });

  it("flags severity when avg <= 1.2", () => {
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 1 },
          { category: "Technical", score: 1 },
          { category: "Leadership", score: 1 },
        ],
      }),
    ];

    const flags = detectLeniencySeverity(feedback);

    const severityFlags = flags.filter((f) => f.type === "severity");
    expect(severityFlags).toHaveLength(1);
    expect(severityFlags[0].severity).toBe("info");
    expect(severityFlags[0].label).toBe("Consistently low ratings");
    expect(severityFlags[0].description).toContain("bottom of the scale");
  });

  it("does NOT flag moderate scores", () => {
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 2 },
          { category: "Technical", score: 3 },
          { category: "Leadership", score: 2 },
        ],
      }),
    ];

    const flags = detectLeniencySeverity(feedback);

    expect(flags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectGroupthink
// ---------------------------------------------------------------------------

describe("detectGroupthink", () => {
  it("flags when all interviewers have identical vectors", () => {
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 3 },
          { category: "Technical", score: 2 },
          { category: "Leadership", score: 4 },
        ],
      }),
      makeFeedback({
        interviewer_id: "i2",
        ratings: [
          { category: "Communication", score: 3 },
          { category: "Technical", score: 2 },
          { category: "Leadership", score: 4 },
        ],
      }),
    ];

    const flags = detectGroupthink(feedback);

    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("groupthink");
    expect(flags[0].severity).toBe("info");
    expect(flags[0].label).toBe("High interviewer agreement");
    expect(flags[0].description).toContain("identical scores");
    expect(flags[0].description).toContain("independently");
  });

  it("does NOT flag when only one interviewer", () => {
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 3 },
          { category: "Technical", score: 2 },
        ],
      }),
    ];

    const flags = detectGroupthink(feedback);

    expect(flags).toHaveLength(0);
  });

  it("does NOT flag when scores differ", () => {
    const feedback: FeedbackForAnalysis[] = [
      makeFeedback({
        interviewer_id: "i1",
        ratings: [
          { category: "Communication", score: 3 },
          { category: "Technical", score: 2 },
          { category: "Leadership", score: 4 },
        ],
      }),
      makeFeedback({
        interviewer_id: "i2",
        ratings: [
          { category: "Communication", score: 3 },
          { category: "Technical", score: 3 },
          { category: "Leadership", score: 4 },
        ],
      }),
    ];

    const flags = detectGroupthink(feedback);

    expect(flags).toHaveLength(0);
  });
});
