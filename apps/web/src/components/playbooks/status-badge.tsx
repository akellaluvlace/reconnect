import { Badge } from "@/components/ui/badge";
import type { PlaybookStatus } from "@reconnect/database";

const statusConfig: Record<
  PlaybookStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  active: {
    label: "Active",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  archived: {
    label: "Archived",
    className: "bg-slate-50 text-slate-400 border-slate-200",
  },
};

export function StatusBadge({ status }: { status: string | null }) {
  const normalizedStatus = (status ?? "draft") as PlaybookStatus;
  const config = statusConfig[normalizedStatus] ?? statusConfig.draft;

  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}
