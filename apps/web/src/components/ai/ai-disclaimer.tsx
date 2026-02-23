"use client";

import { Sparkle } from "@phosphor-icons/react";

export function AIDisclaimer() {
  return (
    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
      <Sparkle size={12} weight="duotone" className="mt-0.5 shrink-0" />
      <p>
        AI-generated content. All hiring decisions must be made by humans.
      </p>
    </div>
  );
}
