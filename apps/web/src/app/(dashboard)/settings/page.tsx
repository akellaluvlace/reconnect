import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Plug, ShieldCheck } from "lucide-react";
import Link from "next/link";

const sections = [
  { name: "Organization", description: "Company details and preferences", href: "/settings/organization", icon: Building2 },
  { name: "Profile", description: "Your personal settings", href: "/settings/profile", icon: User },
  { name: "Integrations", description: "Connected services", href: "/settings/integrations", icon: Plug },
  { name: "Admin", description: "CMS controls (admin only)", href: "/settings/admin/skills", icon: ShieldCheck },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and organization" />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.name} href={section.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-4">
                <section.icon className="h-5 w-5 text-muted-foreground" />
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
