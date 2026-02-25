"use client";

import { CircleNotch } from "@phosphor-icons/react";

interface PhaseBadgeProps {
  phase: "quick" | "deep";
  isResearching?: boolean;
}

export function PhaseBadge({ phase, isResearching }: PhaseBadgeProps) {
  if (phase === "deep") {
    return (
      <span className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-[12px] font-medium text-green-800">
        Research Complete
      </span>
    );
  }

  if (isResearching) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-800">
        <CircleNotch size={12} weight="bold" className="animate-spin" />
        Researching...
      </span>
    );
  }

  return (
    <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-800">
      Preliminary
    </span>
  );
}
