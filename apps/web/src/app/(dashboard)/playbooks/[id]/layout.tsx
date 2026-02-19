import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChapterNav } from "@/components/playbooks/chapter-nav";
import { StatusBadge } from "@/components/playbooks/status-badge";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PlaybookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: playbook, error } = await supabase
    .from("playbooks")
    .select("id, title, status, department")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[playbook/layout] Query failed:", error.message);
    }
    notFound();
  }

  if (!playbook) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {playbook.title}
          </h1>
          {playbook.department && (
            <p className="text-muted-foreground mt-1">{playbook.department}</p>
          )}
        </div>
        <StatusBadge status={playbook.status} />
      </div>

      <ChapterNav playbookId={id} />

      {children}
    </div>
  );
}
