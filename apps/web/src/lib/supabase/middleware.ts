import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@reconnect/database";
import { supabaseUrl, supabaseAnonKey } from "./env";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/verify", "/auth/callback"];

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

  // On auth service failure (not just "no user"), don't redirect — let through
  if (!user && authError && !isPublicPath) {
    console.error("[middleware] Auth service error, allowing request through");
    return response;
  }

  // Redirect unauthenticated users from protected routes
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if (user && isPublicPath && request.nextUrl.pathname !== "/auth/callback") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
