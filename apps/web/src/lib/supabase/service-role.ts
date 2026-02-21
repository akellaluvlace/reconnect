import { createClient } from "@supabase/supabase-js";
import type { Database } from "@reconnect/database";

/**
 * Create a Supabase client with service_role key.
 * Bypasses RLS — use ONLY on the server for operations that require
 * access to tables with no RLS policies (e.g., interview_transcripts).
 *
 * NEVER import this file in client components or pages.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      `Missing Supabase service-role config: URL=${url ? "set" : "MISSING"}, SERVICE_ROLE_KEY=${serviceKey ? "set" : "MISSING"}`,
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
