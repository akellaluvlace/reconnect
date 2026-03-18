import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/admin/platform-admin";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isPlatformAdmin(user.email)) {
    redirect("/playbooks");
  }

  return (
    <div className="flex min-h-screen">
      {/* Simple sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/40 bg-card p-4">
        <div className="mb-6">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Platform Admin
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Manage all organisations
          </p>
        </div>
        <nav className="space-y-1">
          <Link
            href="/platform/orgs"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            Organisations
          </Link>
          <Link
            href="/platform/users"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            Users
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-border/40">
          <Link
            href="/playbooks"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-teal-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
