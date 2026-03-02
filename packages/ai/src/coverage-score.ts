import type { CoverageAnalysisOutput } from "./schemas/coverage-analysis";

export const STRENGTH_WEIGHTS: Record<string, number> = {
  strong: 1.0,
  moderate: 0.6,
  weak: 0.25,
};

export const GAP_SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 0,
  important: 0.3,
  minor: 0.6,
};

const STRENGTH_RANK: Record<string, number> = { strong: 3, moderate: 2, weak: 1 };
const SEVERITY_RANK: Record<string, number> = { critical: 3, important: 2, minor: 1 };

/**
 * Deduplicate covered requirements — keep the strongest coverage for each requirement.
 * Case-insensitive matching.
 */
export function deduplicateCovered(
  covered: CoverageAnalysisOutput["requirements_covered"],
): CoverageAnalysisOutput["requirements_covered"] {
  const map = new Map<string, (typeof covered)[number]>();
  for (const entry of covered) {
    const key = entry.requirement.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing || (STRENGTH_RANK[entry.coverage_strength] ?? 0) > (STRENGTH_RANK[existing.coverage_strength] ?? 0)) {
      map.set(key, entry);
    }
  }
  return [...map.values()];
}

/**
 * Deduplicate gaps — keep the highest severity for each requirement.
 * Case-insensitive matching.
 */
export function deduplicateGaps(
  gaps: CoverageAnalysisOutput["gaps"],
): CoverageAnalysisOutput["gaps"] {
  const map = new Map<string, (typeof gaps)[number]>();
  for (const entry of gaps) {
    const key = entry.requirement.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing || (SEVERITY_RANK[entry.severity] ?? 0) > (SEVERITY_RANK[existing.severity] ?? 0)) {
      map.set(key, entry);
    }
  }
  return [...map.values()];
}

/**
 * Compute coverage score deterministically from the AI's mapping data.
 * Never trust the AI to produce a numeric score — compute it from evidence.
 *
 * Formula: weighted sum of all requirements / total requirements evaluated
 * - strong coverage = 100% credit
 * - moderate coverage = 60% credit
 * - weak coverage = 25% credit
 * - critical gap = 0% credit
 * - important gap = 30% credit
 * - minor gap = 60% credit
 *
 * Deduplicates inputs as a safety net before scoring.
 */
export function computeCoverageScore(
  covered: CoverageAnalysisOutput["requirements_covered"],
  gaps: CoverageAnalysisOutput["gaps"],
): {
  score: number;
  breakdown: {
    strong: number;
    moderate: number;
    weak: number;
    gaps: number;
    gaps_critical: number;
    gaps_important: number;
    gaps_minor: number;
    total: number;
  };
} {
  // Safety-net dedup
  const dedupCovered = deduplicateCovered(covered);
  const dedupGaps = deduplicateGaps(gaps);

  const strong = dedupCovered.filter((r) => r.coverage_strength === "strong").length;
  const moderate = dedupCovered.filter((r) => r.coverage_strength === "moderate").length;
  const weak = dedupCovered.filter((r) => r.coverage_strength === "weak").length;

  const gapsCritical = dedupGaps.filter((g) => g.severity === "critical").length;
  const gapsImportant = dedupGaps.filter((g) => g.severity === "important").length;
  const gapsMinor = dedupGaps.filter((g) => g.severity === "minor").length;
  const gapCount = gapsCritical + gapsImportant + gapsMinor;

  const total = strong + moderate + weak + gapCount;
  if (total === 0) {
    return {
      score: 0,
      breakdown: { strong: 0, moderate: 0, weak: 0, gaps: 0, gaps_critical: 0, gaps_important: 0, gaps_minor: 0, total: 0 },
    };
  }

  const coveredPoints =
    strong * STRENGTH_WEIGHTS.strong +
    moderate * STRENGTH_WEIGHTS.moderate +
    weak * STRENGTH_WEIGHTS.weak;

  const gapPoints =
    gapsCritical * GAP_SEVERITY_WEIGHTS.critical +
    gapsImportant * GAP_SEVERITY_WEIGHTS.important +
    gapsMinor * GAP_SEVERITY_WEIGHTS.minor;

  const score = Math.round(((coveredPoints + gapPoints) / total) * 100);

  return {
    score,
    breakdown: {
      strong,
      moderate,
      weak,
      gaps: gapCount,
      gaps_critical: gapsCritical,
      gaps_important: gapsImportant,
      gaps_minor: gapsMinor,
      total,
    },
  };
}
