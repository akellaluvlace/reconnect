"use client";

import { Sparkle } from "@phosphor-icons/react";

export function AIIndicatorBadge({ label = "AI Generated" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Sparkle size={12} weight="duotone" />
      {label}
    </span>
  );
}
