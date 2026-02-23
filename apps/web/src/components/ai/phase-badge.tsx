"use client";

import { Loader2 } from "lucide-react";

interface PhaseBadgeProps {
  phase: "quick" | "deep";
  isResearching?: boolean;
}

export function PhaseBadge({ phase, isResearching }: PhaseBadgeProps) {
  if (isResearching) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-800">
        <Loader2 className="h-3 w-3 animate-spin" />
        Researching...
      </span>
    );
  }

  if (phase === "deep") {
    return (
      <span className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-[12px] font-medium text-green-800">
        Research Complete
      </span>
    );
  }

  return (
    <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-800">
      Preliminary
    </span>
  );
}
