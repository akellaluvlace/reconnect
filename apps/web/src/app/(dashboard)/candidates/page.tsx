import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";

export default function CandidatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="View all candidates across playbooks"
      />
      <EmptyState
        icon={<UsersThree size={24} weight="duotone" className="text-teal-500" />}
        title="No candidates yet"
        description="Candidates will appear here once you add them to a playbook."
      />
    </div>
  );
}
