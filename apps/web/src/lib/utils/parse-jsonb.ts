import { type ZodType } from "zod";

/**
 * Safely parse JSONB data from Supabase against a Zod schema.
 * Returns null on failure (graceful degradation) with a console warning.
 */
export function parseJsonb<T>(
  data: unknown,
  schema: ZodType<T>,
  label?: string,
): T | null {
  if (data === null || data === undefined) return null;
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(
      `[parseJsonb] ${label ?? "unknown"} validation failed:`,
      result.error.issues,
    );
    return null;
  }
  return result.data;
}
