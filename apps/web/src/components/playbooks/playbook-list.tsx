import { PlaybookCard, type PlaybookListItem } from "./playbook-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export function PlaybookList({ playbooks }: { playbooks: PlaybookListItem[] }) {
  if (playbooks.length === 0) {
    return (
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
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {playbooks.map((playbook) => (
        <PlaybookCard key={playbook.id} playbook={playbook} />
      ))}
    </div>
  );
}
