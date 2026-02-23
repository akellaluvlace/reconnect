import { createClient } from "@/lib/supabase/server";
import { PlaybookList } from "@/components/playbooks/playbook-list";
import { Button } from "@/components/ui/button";
import { Plus, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function PlaybooksPage() {
  const supabase = await createClient();
  const { data: playbooks, error } = await supabase
    .from("playbooks")
    .select("id, title, department, status, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[playbooks] Failed to load:", error.message);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Playbooks</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Manage your recruitment playbooks
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/playbooks/new">
            <Plus size={14} weight="bold" className="mr-1.5" />
            New Playbook
          </Link>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <WarningCircle size={16} weight="duotone" />
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
