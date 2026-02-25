import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@reconnect/database";
import { supabaseUrl, supabaseAnonKey } from "./env";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/verify", "/auth/callback", "/api/health"];

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

  if (authError) {
    console.error("[middleware] Auth check failed:", authError.message);
  }

  // Public routes that don't require authentication
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // On auth SERVICE failure (5xx, network), don't redirect — let through
  // But "no session" / "invalid token" errors (4xx) should still redirect to login
  const isServiceError = authError && authError.status !== undefined && authError.status >= 500;
  if (!user && isServiceError && !isPublicPath) {
    console.error("[middleware] Auth service error, allowing request through:", authError.message);
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

  // Redirect authenticated users away from auth pages
  if (user && isPublicPath && request.nextUrl.pathname !== "/auth/callback") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
