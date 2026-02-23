import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { UserPlus } from "@phosphor-icons/react/dist/ssr";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage your team members"
        actions={<Button><UserPlus size={16} weight="duotone" className="mr-2" />Invite Member</Button>}
      />
      <EmptyState
        icon={<UserPlus size={24} weight="duotone" className="text-teal-500" />}
        title="No team members yet"
        description="Invite colleagues to collaborate on recruitment playbooks."
      />
    </div>
  );
}
