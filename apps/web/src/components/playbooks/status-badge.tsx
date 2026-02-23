"use client";

import { Badge } from "@/components/ui/badge";
import { PencilSimple, Lightning, Archive } from "@phosphor-icons/react";
import type { PlaybookStatus } from "@reconnect/database";

const statusConfig: Record<
  PlaybookStatus,
  { label: string; className: string; icon: React.ComponentType<{ size?: number; weight?: "duotone"; className?: string }> }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: PencilSimple,
  },
  active: {
    label: "Active",
    className: "bg-teal-50 text-teal-700 border-teal-200",
    icon: Lightning,
  },
  archived: {
    label: "Archived",
    className: "bg-slate-50 text-slate-400 border-slate-200",
    icon: Archive,
  },
};

export function StatusBadge({ status }: { status: string | null }) {
  const normalizedStatus = (status ?? "draft") as PlaybookStatus;
  const config = statusConfig[normalizedStatus] ?? statusConfig.draft;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${config.className}`}>
      <Icon size={12} weight="duotone" className="mr-1" />
      {config.label}
    </Badge>
  );
}
