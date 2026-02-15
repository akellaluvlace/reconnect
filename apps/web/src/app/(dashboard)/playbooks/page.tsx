import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";

export default function PlaybooksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Playbooks"
        description="Manage your recruitment playbooks"
        actions={
          <Button asChild>
            <Link href="/playbooks/new">
              <Plus className="mr-2 h-4 w-4" />
              New Playbook
            </Link>
          </Button>
        }
      />
      <EmptyState
        icon={BookOpen}
        title="No playbooks yet"
        description="Create your first playbook to start structuring your recruitment process."
        action={
          <Button asChild>
            <Link href="/playbooks/new">Create Playbook</Link>
          </Button>
        }
      />
    </div>
  );
}
