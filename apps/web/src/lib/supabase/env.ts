const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    `Missing Supabase config: URL=${url ? "set" : "MISSING"}, ANON_KEY=${anonKey ? "set" : "MISSING"}`
  );
}

export const supabaseUrl: string = url;
export const supabaseAnonKey: string = anonKey;
