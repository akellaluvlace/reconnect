import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@reconnect/database";
import { supabaseUrl, supabaseAnonKey } from "./env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component where cookies are read-only.
            // Safe to ignore — middleware handles session refresh.
          }
        },
      },
    }
  );
}
