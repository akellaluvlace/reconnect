import { requireAuth } from "@/lib/auth/require-auth";
import { isPlatformAdmin } from "@/lib/admin/platform-admin";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/dashboard/top-nav";
import { AuthListener } from "@/components/dashboard/auth-listener";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const showPlatformLink = isPlatformAdmin(user.email);

  // Check org status — block access if not active
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  let orgStatus: string | null = null;
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("status")
      .eq("id", profile.organization_id)
      .single();
    orgStatus = org?.status ?? null;
  }

  // Platform admins bypass org status check
  if (orgStatus && orgStatus !== "active" && !isPlatformAdmin(user.email)) {
    return (
      <div className="flex min-h-screen min-w-[1024px] items-center justify-center bg-background">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <span className="text-2xl">
              {orgStatus === "pending" ? "\u23F3" : "\u26D4"}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {orgStatus === "pending"
              ? "Account Pending Approval"
              : "Account Suspended"}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {orgStatus === "pending"
              ? "Your account is being reviewed. You\u2019ll receive an email once it\u2019s approved."
              : "Your account has been suspended. Please contact support for assistance."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-[1024px] bg-background">
      <AuthListener />
      <TopNav showPlatformLink={showPlatformLink} />
      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </div>
  );
}
