import type { z } from "zod";

/** Zod v4 issue shape (we only access what we need; bigint for Zod v4 compat) */
interface ZodIssue {
  message: string;
  path: PropertyKey[];
  code?: string;
  origin?: string;
  maximum?: number | bigint;
  minimum?: number | bigint;
  inclusive?: boolean;
  expected?: string;
}

/**
 * Attempt to coerce a near-valid AI response into passing Zod validation.
 *
 * Strategy: parse, inspect failures, apply targeted fixes, re-validate.
 * Only fixes common AI output drift — does NOT invent missing data.
 *
 * Returns { data, coerced: true } if coercion worked,
 * or { data: null, coerced: false, issues } if it couldn't be saved.
 */
export function coerceAIResponse<T extends z.ZodType>(
  raw: unknown,
  schema: T,
): {
  data: z.infer<T> | null;
  coerced: boolean;
  issues: Array<{ message: string; path: string[] }>;
} {
  // First, try parsing as-is
  const firstPass = schema.safeParse(raw);
  if (firstPass.success) {
    return { data: firstPass.data, coerced: false, issues: [] };
  }

  // Collect issues for targeted fixes
  const issues: ZodIssue[] = firstPass.error.issues.map((i: ZodIssue) => ({ ...i }));

  // Deep clone to avoid mutating original
  let patched: unknown;
  try {
    patched = JSON.parse(JSON.stringify(raw));
  } catch {
    return {
      data: null,
      coerced: false,
      issues: issues.map(({ message, path }) => ({ message, path: path.map(String) })),
    };
  }

  let appliedFixes = 0;

  // Multiple passes — fixing one issue may unblock another
  for (let pass = 0; pass < 3; pass++) {
    const currentResult = schema.safeParse(patched);
    if (currentResult.success) {
      return { data: currentResult.data, coerced: appliedFixes > 0, issues: [] };
    }

    const currentIssues: ZodIssue[] = currentResult.error.issues.map((i: ZodIssue) => ({ ...i }));
    let fixedThisPass = 0;

    for (const issue of currentIssues) {
      if (applyFix(patched, issue)) {
        fixedThisPass++;
        appliedFixes++;
      }
    }

    if (fixedThisPass === 0) break;
  }

  if (appliedFixes === 0) {
    return {
      data: null,
      coerced: false,
      issues: issues.map(({ message, path }) => ({ message, path: path.map(String) })),
    };
  }

  // Final validation after all coercion passes
  const finalPass = schema.safeParse(patched);
  if (finalPass.success) {
    return { data: finalPass.data, coerced: true, issues: [] };
  }

  // Coercion helped but didn't fully fix it
  return {
    data: null,
    coerced: false,
    issues: finalPass.error.issues.map((i: { message: string; path: PropertyKey[] }) => ({
      message: i.message,
      path: i.path.map(String),
    })),
  };
}

/**
 * Apply a single targeted fix based on the Zod issue.
 * Returns true if the fix was applied (mutates obj in place).
 */
function applyFix(obj: unknown, issue: ZodIssue): boolean {
  const { code, path, origin, maximum, minimum } = issue;
  const strPath = path.map(String);

  // --- too_big: array trim or number clamp ---
  if (code === "too_big" && maximum !== undefined) {
    const max = Number(maximum);
    const target = getNestedValue(obj, strPath);

    // Array too long → trim from end
    if (Array.isArray(target) && target.length > max) {
      setNestedValue(obj, strPath, target.slice(0, max));
      return true;
    }

    // Number too high → clamp down
    if (typeof target === "number" && target > max) {
      setNestedValue(obj, strPath, max);
      return true;
    }
  }

  // --- too_small: number clamp (can't fix arrays — would need to invent data) ---
  if (code === "too_small" && minimum !== undefined) {
    const min = Number(minimum);
    const target = getNestedValue(obj, strPath);

    if (typeof target === "number" && target < min) {
      setNestedValue(obj, strPath, min);
      return true;
    }
  }

  // --- invalid_type: string→number coercion ---
  if (code === "invalid_type") {
    const target = getNestedValue(obj, strPath);

    // AI sometimes wraps numbers in quotes: "42" instead of 42
    if (
      (issue.expected === "number" || origin === "number") &&
      typeof target === "string"
    ) {
      const num = Number(target);
      if (!isNaN(num)) {
        setNestedValue(obj, strPath, num);
        return true;
      }
    }
  }

  // --- Strip AI metadata from string fields (not triggered by Zod, but proactive) ---
  const target = getNestedValue(obj, strPath);
  if (typeof target === "string" && target.includes("Metadata:")) {
    const cleaned = target
      .replace(/\s*Metadata:\s*model_used=.*$/i, "")
      .replace(
        /\s*This AI-generated content is for informational purposes only\.?\s*All hiring decisions must be made by humans\.?\s*$/i,
        "",
      )
      .trim();
    if (cleaned !== target) {
      setNestedValue(obj, strPath, cleaned);
      return true;
    }
  }

  return false;
}

/** Get a nested value by path array */
function getNestedValue(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Set a nested value by path array */
function setNestedValue(obj: unknown, path: string[], value: unknown): void {
  if (path.length === 0) return;
  let current: unknown = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (current == null || typeof current !== "object") return;
    current = (current as Record<string, unknown>)[path[i]];
  }
  if (current != null && typeof current === "object") {
    (current as Record<string, unknown>)[path[path.length - 1]] = value;
  }
}
