"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function useSignOut() {
  const router = useRouter();

  return async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[signOut] Failed:", error.message);
        toast.error("Sign out failed. Please try again.");
        return;
      }
      router.push("/login");
    } catch (err) {
      console.error("[signOut] Unexpected error:", err);
      toast.error("Sign out failed. Please try again.");
    }
  };
}
