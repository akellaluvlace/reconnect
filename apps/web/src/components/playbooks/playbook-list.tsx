"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";

export interface PlaybookListItem {
  id: string;
  title: string;
  department: string | null;
  status: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export function PlaybookList({ playbooks }: { playbooks: PlaybookListItem[] }) {
  if (playbooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 py-16">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
          <Sparkles className="h-6 w-6 text-teal-500" />
        </div>
        <h3 className="text-[15px] font-semibold">No playbooks yet</h3>
        <p className="mt-1 max-w-sm text-center text-[13px] text-muted-foreground">
          Create your first recruitment playbook to start building your hiring strategy.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/playbooks/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Playbook
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
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
              "group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50" +
              (i < playbooks.length - 1 ? " border-b border-border/40" : "")
            }
          >
            {/* Status dot */}
            <StatusDot status={pb.status} />

            {/* Title + department */}
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

            {/* Status badge */}
            <StatusBadge status={pb.status} />

            {/* Time */}
            <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
              {timeAgo}
            </span>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-500" />
          </Link>
        );
      })}
    </div>
  );
}

function StatusDot({ status }: { status: string | null }) {
  const colorMap: Record<string, string> = {
    draft: "bg-slate-300",
    active: "bg-teal-500",
    archived: "bg-slate-300",
  };
  const color = colorMap[status ?? "draft"] ?? "bg-slate-300";

  return (
    <span className="flex shrink-0 items-center">
      <span className={`h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}
