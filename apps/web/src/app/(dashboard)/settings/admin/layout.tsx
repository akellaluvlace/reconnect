import { requireRole } from "@/lib/auth/require-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin"]);
  return <>{children}</>;
}
