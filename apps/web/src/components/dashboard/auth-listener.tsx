"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function AuthListener() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        console.error("[AuthListener] Failed to get user:", error.message);
        // Preserve existing user on transient errors — don't null out
      } else {
        setUser(user);
      }
      setLoading(false);
    }).catch((err) => {
      console.error("[AuthListener] Unexpected error:", err);
      // Don't null out user on network/transient errors
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase, setUser, setLoading]);

  return null;
}
