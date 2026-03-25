import type { Json } from "@reconnect/database";

export interface ParsedRating {
  category: string;
  score: 1 | 2 | 3 | 4;
}

/**
 * Safely parse a JSONB ratings array from the database.
 * Returns only entries with valid category (string) and score (1-4).
 */
export function parseRatings(ratingsJson: Json): ParsedRating[] {
  if (!Array.isArray(ratingsJson)) return [];
  const result: ParsedRating[] = [];
  for (const r of ratingsJson) {
    if (
      typeof r === "object" &&
      r !== null &&
      "category" in r &&
      "score" in r
    ) {
      const obj = r as Record<string, unknown>;
      if (
        typeof obj.category === "string" &&
        typeof obj.score === "number" &&
        obj.score >= 1 &&
        obj.score <= 4
      ) {
        result.push({ category: obj.category, score: obj.score as 1 | 2 | 3 | 4 });
      }
    }
  }
  return result;
}

/**
 * Safely parse a JSONB string array (pros/cons) from the database.
 */
export function parseStringArray(json: Json | null): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((item): item is string => typeof item === "string");
}

/** Shared FeedbackEntry shape matching the database row. */
export interface FeedbackEntry {
  id: string;
  interview_id: string | null;
  interviewer_id: string | null;
  ratings: Json;
  pros: Json | null;
  cons: Json | null;
  notes: string | null;
  focus_areas_confirmed: boolean;
  submitted_at: string | null;
}
