import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpenText,
  UsersThree,
  UserPlus,
  Sparkle,
  ArrowRight,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/playbooks/status-badge";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch real counts
  const [playbooksRes, candidatesRes, teamRes] = await Promise.all([
    supabase
      .from("playbooks")
      .select("id, title, status, department, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase.from("candidates").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }),
  ]);

  const playbooks = playbooksRes.data ?? [];
  const candidateCount = candidatesRes.count ?? 0;
  const teamCount = teamRes.count ?? 0;
  const activePlaybooks = playbooks.filter((p) => p.status === "active").length;

  const firstName = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {playbooks.length === 0
            ? "Create your first playbook to get started."
            : `You have ${activePlaybooks} active ${activePlaybooks === 1 ? "playbook" : "playbooks"} and ${candidateCount} ${candidateCount === 1 ? "candidate" : "candidates"} in your pipeline.`}
        </p>
      </div>

      {/* Stats row — inline, not cards */}
      <div className="card-surface flex items-center gap-8 px-6 py-4">
        <StatItem
          icon={<BookOpenText size={18} weight="duotone" />}
          label="Playbooks"
          value={playbooks.length}
          href="/playbooks"
        />
        <div className="h-8 w-px bg-border/60" />
        <StatItem
          icon={<UsersThree size={18} weight="duotone" />}
          label="Candidates"
          value={candidateCount}
          href="/candidates"
        />
        <div className="h-8 w-px bg-border/60" />
        <StatItem
          icon={<UserPlus size={18} weight="duotone" />}
          label="Team"
          value={teamCount}
          href="/team"
        />
        <div className="ml-auto">
          <Button asChild size="sm">
            <Link href="/playbooks/new">
              <Plus size={14} weight="bold" className="mr-1.5" />
              New Playbook
            </Link>
          </Button>
        </div>
      </div>

      {/* Active playbooks */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold text-foreground">
            Recent Playbooks
          </h2>
          {playbooks.length > 0 && (
            <Link
              href="/playbooks"
              className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {playbooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-cream-50 py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
              <Sparkle size={24} weight="duotone" className="text-teal-500" />
            </div>
            <h3 className="text-[15px] font-semibold">No playbooks yet</h3>
            <p className="mt-1 max-w-sm text-center text-[13px] text-muted-foreground">
              Create your first recruitment playbook. Our AI will help you build
              a complete hiring strategy.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/playbooks/new">
                <Plus size={14} weight="bold" className="mr-1.5" />
                Create Playbook
              </Link>
            </Button>
          </div>
        ) : (
          <div className="card-surface overflow-hidden">
            {playbooks.map((pb, i) => {
              let timeAgo = "";
              const ts = pb.updated_at ?? pb.created_at;
              if (ts) {
                try {
                  timeAgo = formatDistanceToNow(new Date(ts), { addSuffix: true });
                } catch {
                  timeAgo = "";
                }
              }

              return (
                <Link
                  key={pb.id}
                  href={`/playbooks/${pb.id}`}
                  className={
                    "group flex items-center gap-4 px-5 py-3.5 transition-all duration-150 hover:bg-cream-100" +
                    (i < playbooks.length - 1 ? " border-b border-border/40" : "")
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-foreground group-hover:text-teal-700">
                      {pb.title}
                    </p>
                    {pb.department && (
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {pb.department}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={pb.status} />
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    {timeAgo}
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-500" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 transition-colors">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
        {icon}
      </div>
      <div>
        <p className="text-xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}
