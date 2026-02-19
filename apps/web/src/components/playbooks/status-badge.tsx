import { Badge } from "@/components/ui/badge";
import type { PlaybookStatus } from "@reconnect/database";

const statusConfig: Record<
  PlaybookStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  active: {
    label: "Active",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  archived: {
    label: "Archived",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

export function StatusBadge({ status }: { status: string | null }) {
  const normalizedStatus = (status ?? "draft") as PlaybookStatus;
  const config = statusConfig[normalizedStatus] ?? statusConfig.draft;

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
