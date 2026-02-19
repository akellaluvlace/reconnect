import { vi } from "vitest";

/**
 * Chainable mock for Supabase query builder.
 * Each chain method returns `this` so .from().select().eq().single() works.
 */
function createQueryBuilder(resolveValue: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "order",
    "limit",
    "range",
    "is",
    "in",
    "match",
    "filter",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal method — returns the resolved value
  builder.single = vi.fn().mockResolvedValue(resolveValue);

  // Also make the builder itself thenable for queries without .single()
  builder.then = vi
    .fn()
    .mockImplementation((resolve: (v: unknown) => void) =>
      resolve(resolveValue),
    );

  return builder;
}

export interface MockSupabaseOptions {
  user?: { id: string; email: string } | null;
  authError?: { message: string } | null;
  profile?: { role: string; organization_id?: string } | null;
  profileError?: { message: string; code?: string } | null;
  queryData?: unknown;
  queryError?: { message: string; code?: string } | null;
}

export function createMockSupabase(options: MockSupabaseOptions = {}) {
  const {
    user = null,
    authError = null,
    profile = null,
    profileError = null,
    queryData = null,
    queryError = null,
  } = options;

  // Track which table is being queried
  let currentTable = "";

  const mock = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      currentTable = table;

      if (table === "users") {
        return createQueryBuilder({
          data: profile,
          error: profileError,
        });
      }

      return createQueryBuilder({
        data: queryData,
        error: queryError,
      });
    }),
  };

  return mock;
}

/**
 * Sets up vi.mock for createClient that returns the given mock.
 * Call this INSIDE your test file at the top level.
 *
 * Usage:
 * ```ts
 * const mockSupabase = createMockSupabase({ ... });
 * vi.mock("@/lib/supabase/server", () => ({
 *   createClient: vi.fn().mockResolvedValue(mockSupabase),
 * }));
 * ```
 */
export function mockCreateClient(mock: ReturnType<typeof createMockSupabase>) {
  return {
    createClient: vi.fn().mockResolvedValue(mock),
  };
}
