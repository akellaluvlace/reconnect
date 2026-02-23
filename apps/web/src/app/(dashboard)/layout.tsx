import { requireAuth } from "@/lib/auth/require-auth";
import { TopNav } from "@/components/dashboard/top-nav";
import { AuthListener } from "@/components/dashboard/auth-listener";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="min-h-screen min-w-[1024px] bg-background">
      <AuthListener />
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </div>
  );
}
