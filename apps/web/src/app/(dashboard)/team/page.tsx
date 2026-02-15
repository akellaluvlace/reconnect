import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage your team members"
        actions={<Button><UserPlus className="mr-2 h-4 w-4" />Invite Member</Button>}
      />
      <EmptyState
        icon={UserPlus}
        title="No team members yet"
        description="Invite colleagues to collaborate on recruitment playbooks."
      />
    </div>
  );
}
