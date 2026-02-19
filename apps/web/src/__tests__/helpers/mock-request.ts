import { NextRequest } from "next/server";

/**
 * Create a NextRequest for testing API routes.
 */
export function createRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, headers = {} } = options;

  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}
