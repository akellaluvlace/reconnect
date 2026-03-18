import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/require-auth";
import { NotificationsPageClient } from "./notifications-page-client";

export default async function NotificationsSettingsPage() {
  await requireRole(["admin", "manager", "interviewer"]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Control which email notifications you receive"
      />
      <NotificationsPageClient />
    </div>
  );
}
