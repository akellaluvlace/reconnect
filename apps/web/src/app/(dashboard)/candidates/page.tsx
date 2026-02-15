import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

export default function CandidatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="View all candidates across playbooks"
      />
      <EmptyState
        icon={Users}
        title="No candidates yet"
        description="Candidates will appear here once you add them to a playbook."
      />
    </div>
  );
}
