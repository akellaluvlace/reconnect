/** Compute average score from a ratings array. Returns null if empty. */
export function averageScore(
  ratings: Array<{ category: string; score: number }>,
): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  return sum / ratings.length;
}

/** Return Tailwind color classes for a 1-4 rating score. */
export function ratingColorClasses(score: number): string {
  if (score <= 1.5) return "bg-red-50 text-red-700 border-red-200";
  if (score <= 2.5) return "bg-amber-50 text-amber-700 border-amber-200";
  if (score <= 3.5) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-green-50 text-green-700 border-green-200";
}
