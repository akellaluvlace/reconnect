"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AIIndicatorBadge({ label = "AI Generated" }: { label?: string }) {
  return (
    <Badge variant="secondary" className="gap-1 text-xs font-normal">
      <Sparkles className="h-3 w-3" />
      {label}
    </Badge>
  );
}
