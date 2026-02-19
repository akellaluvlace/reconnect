import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { PlaybookList } from "@/components/playbooks/playbook-list";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function PlaybooksPage() {
  const supabase = await createClient();
  const { data: playbooks, error } = await supabase
    .from("playbooks")
    .select("id, title, department, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[playbooks] Failed to load:", error.message);
  }

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
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load playbooks. Please refresh the page.
          </AlertDescription>
        </Alert>
      ) : (
        <PlaybookList playbooks={playbooks ?? []} />
      )}
    </div>
  );
}
