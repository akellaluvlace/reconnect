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
    <div className="space-y-0">
      {/* Playbook header: title left, chapter toggle right */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {playbook.title}
          </h1>
          <StatusBadge status={playbook.status} />
        </div>
        <ChapterNav playbookId={id} />
      </div>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Chapter content */}
      <div className="pt-6">
        {children}
      </div>
    </div>
  );
}
