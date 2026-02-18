import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@reconnect/database";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[requireAuth] Auth check failed:", error.message);
  }

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth();

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[requireRole] Profile fetch failed:", profileError.message, profileError.code);
    throw new Error("Unable to verify permissions. Please try again.");
  }

  if (!profile || !roles.includes(profile.role as UserRole)) {
    redirect("/");
  }

  return { user, role: profile.role as UserRole };
}
