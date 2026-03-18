import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@reconnect/database";
import { supabaseUrl, supabaseAnonKey } from "./env";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/verify", "/auth/callback", "/auth/collaborator", "/api/health", "/api/cron", "/api/feedback/collaborator"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired — required for Server Components
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Public routes that don't require authentication
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Only log auth errors for protected routes — public pages (login, register) always lack sessions
  if (authError && !isPublicPath) {
    console.error("[middleware] Auth check failed:", authError.message);
  }

  // On auth SERVICE failure (5xx, network), handle gracefully:
  // - API routes: return 503 (don't let unauthenticated requests through)
  // - Page routes: let through (show degraded page rather than redirect loop)
  const isServiceError = authError && authError.status !== undefined && authError.status >= 500;
  if (!user && isServiceError && !isPublicPath) {
    console.error("[middleware] Auth service error:", authError.message);
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication service temporarily unavailable" },
        { status: 503 },
      );
    }
    // Page routes: allow through to avoid redirect loops when Supabase is down
    return response;
  }

  // Redirect unauthenticated users from protected routes
  if (!user && !isPublicPath) {
    // API routes should return 401 JSON, not redirect to HTML login page
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages (but not collaborator/API pages)
  if (
    user &&
    isPublicPath &&
    request.nextUrl.pathname !== "/auth/callback" &&
    !request.nextUrl.pathname.startsWith("/auth/collaborator") &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
