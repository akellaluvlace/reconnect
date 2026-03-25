"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, FolderPlus, Plus } from "@phosphor-icons/react";
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <FolderPlus size={24} weight="duotone" className="text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No hiring plans yet. Create your first one to get started.
        </p>
        <Link
          href="/playbooks/new"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-teal-700"
        >
          <Plus size={14} weight="bold" />
          Create Hiring Plan
        </Link>
      </div>
    );
  }

  return (
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
            prefetch={false}
            className={
              "group flex items-center gap-4 px-5 py-4 transition-all duration-150 hover:bg-cream-100" +
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
            <ArrowRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-500" />
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
