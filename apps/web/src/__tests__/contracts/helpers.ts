/**
 * Shared test utilities for contract tests.
 *
 * IMPORTANT: This file does NOT register `vi.mock()` calls.  Vitest hoists
 * mocks per-file, so each test file must declare its own `vi.mock()` blocks.
 * This module exports the hoisted mock functions and convenience helpers that
 * test files import and wire into their mocks.
 */

import { vi } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mock functions — export for use in test files' vi.mock() factories
// ---------------------------------------------------------------------------

/**
 * Create hoisted mock functions for Supabase auth and query builder.
 * Each test file should call this via `vi.hoisted()` and use the returned
 * fns in their `vi.mock("@/lib/supabase/server", ...)` block.
 *
 * Usage in test files:
 * ```ts
 * const { mockGetUser, mockFrom } = vi.hoisted(() => ({
 *   mockGetUser: vi.fn(),
 *   mockFrom: vi.fn(),
 * }));
 * ```
 *
 * Since vi.hoisted must be called at the top-level of each test file, we
 * cannot create the fns here. Instead we export ready-made fns (created
 * once) that test files can reference after they do their own hoisting.
 */

// These are plain vi.fn() instances — safe to export because they are only
// used as *implementations* inside per-file vi.mock() factories.
export const mockGetUser = vi.fn();
export const mockFrom = vi.fn();

// ---------------------------------------------------------------------------
// Chainable Supabase query builder mock
// ---------------------------------------------------------------------------

/**
 * Creates a mock object that mirrors Supabase's chainable query builder.
 * Every chain method returns `this`; `.single()` resolves the value;
 * the builder itself is thenable for non-`.single()` queries.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};

  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "order",
    "limit",
    "is",
    "in",
    "match",
    "filter",
    "gt",
    "lt",
    "gte",
    "lte",
    "ilike",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal method — returns the resolved value
  builder.single = vi.fn().mockResolvedValue(resolvedValue);

  // Also make the builder itself thenable for queries without .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);

  return builder;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A valid mock user with proper hex UUID. */
export const MOCK_USER = {
  id: "aabbccdd-1122-4344-a566-778899aabb00",
  email: "test@example.com",
} as const;

/** A valid mock admin profile. */
export const MOCK_PROFILE = {
  role: "admin" as const,
  organization_id: "00112233-4455-6677-8899-aabbccddeeff",
} as const;

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

/**
 * Configure mockGetUser to return the given user (or null for unauthed).
 */
export function setupAuth(user: { id: string; email: string } | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

/**
 * Configure mockFrom to return the given profile when querying "users",
 * and default data for all other tables.
 */
export function setupProfile(
  role: string = "admin",
  orgId: string = MOCK_PROFILE.organization_id,
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: { role, organization_id: orgId },
        error: null,
      });
    }
    return chainBuilder({ data: null, error: null });
  });
}

/**
 * Configure mockFrom so that *every* table (including "users") returns
 * the given data/error.  Useful for simple single-table test setups.
 */
export function setupTable(data: unknown = null, error: unknown = null) {
  mockFrom.mockReturnValue(chainBuilder({ data, error }));
}

/**
 * Combined: set up auth + profile + table data for the "happy path".
 * Queries to "users" return the profile; queries to any other table
 * return `tableData`.
 */
export function setupProfileAndTable(
  role: string,
  tableData: unknown = [],
  tableError: unknown = null,
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({
        data: { role, organization_id: MOCK_PROFILE.organization_id },
        error: null,
      });
    }
    return chainBuilder({ data: tableData, error: tableError });
  });
}

// ---------------------------------------------------------------------------
// Request builder
// ---------------------------------------------------------------------------

/**
 * Create a `NextRequest` for testing API routes.
 *
 * @param url   Absolute URL string (e.g. "http://localhost/api/feedback")
 * @param method HTTP method (default: "GET")
 * @param body  Request body — will be JSON-stringified if provided
 */
export function makeRequest(
  url: string,
  method: string = "GET",
  body?: unknown,
): NextRequest {
  const init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  } = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}
