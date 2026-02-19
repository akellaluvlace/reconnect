"use client";

import { Badge } from "@/components/ui/badge";

interface PhaseBadgeProps {
  phase: "quick" | "deep";
}

export function PhaseBadge({ phase }: PhaseBadgeProps) {
  if (phase === "deep") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Research Complete
      </Badge>
    );
  }

  return (
    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
      Preliminary
    </Badge>
  );
}
