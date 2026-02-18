import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@reconnect/database";
import { supabaseUrl, supabaseAnonKey } from "./env";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
