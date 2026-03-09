/* ------------------------------------------------------------------ */
/*  Bias Analysis — client-side heuristic detection                    */
/*  Framing: "worth noting" — never accusatory. EU AI Act compliant.  */
/* ------------------------------------------------------------------ */

export interface FeedbackForAnalysis {
  interviewer_id: string;
  ratings: Array<{ category: string; score: number }>;
}

export interface BiasFlag {
  type: "halo" | "leniency" | "severity" | "groupthink";
  label: string;
  description: string;
  severity: "info" | "warning";
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Group feedback entries by interviewer_id. */
function groupByInterviewer(
  feedback: FeedbackForAnalysis[],
): Map<string, FeedbackForAnalysis[]> {
  const map = new Map<string, FeedbackForAnalysis[]>();
  for (const fb of feedback) {
    const existing = map.get(fb.interviewer_id);
    if (existing) {
      existing.push(fb);
    } else {
      map.set(fb.interviewer_id, [fb]);
    }
  }
  return map;
}

/** Flatten all ratings for a group of feedback entries. */
function flattenRatings(
  entries: FeedbackForAnalysis[],
): Array<{ category: string; score: number }> {
  const ratings: Array<{ category: string; score: number }> = [];
  for (const entry of entries) {
    ratings.push(...entry.ratings);
  }
  return ratings;
}

/* ------------------------------------------------------------------ */
/*  Detection: Halo Effect                                             */
/* ------------------------------------------------------------------ */

/**
 * Detects halo effect: an interviewer gave 3+ ratings and ALL are the
 * exact same score, suggesting overall impression influenced individual ratings.
 */
export function detectHaloEffect(
  feedback: FeedbackForAnalysis[],
): BiasFlag[] {
  const flags: BiasFlag[] = [];
  const grouped = groupByInterviewer(feedback);

  for (const entries of grouped.values()) {
    const ratings = flattenRatings(entries);
    if (ratings.length < 3) continue;

    const firstScore = ratings[0].score;
    const allSame = ratings.every((r) => r.score === firstScore);

    if (allSame) {
      flags.push({
        type: "halo",
        label: "Uniform ratings detected",
        description:
          "One or more interviewers gave identical scores across all assessment areas. This could indicate a halo effect where overall impression influences individual ratings.",
        severity: "warning",
      });
      // One flag is enough — don't duplicate per interviewer
      break;
    }
  }

  return flags;
}

/* ------------------------------------------------------------------ */
/*  Detection: Leniency / Severity bias                                */
/* ------------------------------------------------------------------ */

/**
 * Detects leniency (avg >= 3.8) or severity (avg <= 1.2) bias per
 * interviewer, requiring 3+ ratings.
 */
export function detectLeniencySeverity(
  feedback: FeedbackForAnalysis[],
): BiasFlag[] {
  const flags: BiasFlag[] = [];
  const grouped = groupByInterviewer(feedback);

  let hasLeniency = false;
  let hasSeverity = false;

  for (const entries of grouped.values()) {
    const ratings = flattenRatings(entries);
    if (ratings.length < 3) continue;

    const avg =
      ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;

    if (avg >= 3.8 && !hasLeniency) {
      flags.push({
        type: "leniency",
        label: "Consistently high ratings",
        description:
          "One or more interviewers rated consistently at the top of the scale. Worth considering whether individual assessment areas were evaluated independently.",
        severity: "info",
      });
      hasLeniency = true;
    }

    if (avg <= 1.2 && !hasSeverity) {
      flags.push({
        type: "severity",
        label: "Consistently low ratings",
        description:
          "One or more interviewers rated consistently at the bottom of the scale. Worth considering whether individual assessment areas were evaluated independently.",
        severity: "info",
      });
      hasSeverity = true;
    }
  }

  return flags;
}

/* ------------------------------------------------------------------ */
/*  Detection: Groupthink                                              */
/* ------------------------------------------------------------------ */

/**
 * Detects groupthink: 2+ interviewers with exactly the same rating
 * vector (same scores for same categories, sorted by category).
 */
export function detectGroupthink(
  feedback: FeedbackForAnalysis[],
): BiasFlag[] {
  const grouped = groupByInterviewer(feedback);

  // Need at least 2 unique interviewers
  if (grouped.size < 2) return [];

  // Build a rating vector string per interviewer: sort by category, join scores
  const vectors: string[] = [];

  for (const entries of grouped.values()) {
    const ratings = flattenRatings(entries);
    if (ratings.length === 0) continue;

    const sorted = [...ratings].sort((a, b) =>
      a.category.localeCompare(b.category),
    );
    const vector = sorted.map((r) => `${r.category}:${r.score}`).join("|");
    vectors.push(vector);
  }

  // All vectors must be non-empty and identical
  if (vectors.length < 2) return [];

  const allSame = vectors.every((v) => v === vectors[0]);

  if (allSame) {
    return [
      {
        type: "groupthink",
        label: "High interviewer agreement",
        description:
          "All interviewers provided identical scores. While this may reflect genuine consensus, it's worth verifying that feedback was provided independently.",
        severity: "info",
      },
    ];
  }

  return [];
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

/**
 * Run all bias detection heuristics. Returns deduplicated flags.
 * Returns empty array if feedback is empty or has no ratings.
 */
export function analyzeBias(feedback: FeedbackForAnalysis[]): BiasFlag[] {
  if (feedback.length === 0) return [];

  // Check if there are any ratings at all
  const hasAnyRatings = feedback.some((fb) => fb.ratings.length > 0);
  if (!hasAnyRatings) return [];

  const allFlags = [
    ...detectHaloEffect(feedback),
    ...detectLeniencySeverity(feedback),
    ...detectGroupthink(feedback),
  ];

  // Deduplicate by type (keep first occurrence of each type)
  const seen = new Set<string>();
  const deduplicated: BiasFlag[] = [];
  for (const flag of allFlags) {
    if (!seen.has(flag.type)) {
      seen.add(flag.type);
      deduplicated.push(flag);
    }
  }

  return deduplicated;
}
