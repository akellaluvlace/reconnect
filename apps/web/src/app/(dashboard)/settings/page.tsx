import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Buildings,
  UserCircle,
  PlugsConnected,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { requireRole } from "@/lib/auth/require-auth";

export default async function SettingsPage() {
  const { role } = await requireRole(["admin", "manager", "interviewer"]);

  const sections = [
    { name: "Organization", description: "Company details and preferences", href: "/settings/organization", icon: Buildings },
    { name: "Profile", description: "Your personal settings", href: "/settings/profile", icon: UserCircle },
    { name: "Integrations", description: "Connected services", href: "/settings/integrations", icon: PlugsConnected },
    ...(role === "admin"
      ? [{ name: "Admin", description: "CMS controls (admin only)", href: "/settings/admin/skills", icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and organization" />
      <div className="grid gap-4 grid-cols-2">
        {sections.map((section) => (
          <Link key={section.name} href={section.href}>
            <Card className="transition-all duration-150 hover:bg-cream-100">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                  <section.icon size={20} weight="duotone" className="text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{section.name}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
