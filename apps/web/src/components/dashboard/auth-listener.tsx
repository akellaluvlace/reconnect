"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function AuthListener() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const hadUserRef = useRef(false);

  useEffect(() => {

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        console.error("[AuthListener] Failed to get user:", error.message);
        // If we're on a protected page and can't get user, redirect to login
        if (error.message.includes("Refresh Token") || error.message.includes("not found")) {
          router.replace("/login");
          return;
        }
        // Preserve existing user on transient errors — don't null out
      } else {
        setUser(user);
        if (user) hadUserRef.current = true;
      }
      setLoading(false);
    }).catch((err) => {
      console.error("[AuthListener] Unexpected error:", err);
      // Don't null out user on network/transient errors
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // If user had a session and it's now gone (expired/revoked), redirect to login
      if (event === "SIGNED_OUT" || (hadUserRef.current && !session?.user)) {
        router.replace("/login");
      }
      if (session?.user) hadUserRef.current = true;
    });

    return () => subscription.unsubscribe();
  }, [supabase, setUser, setLoading, router]);

  return null;
}
