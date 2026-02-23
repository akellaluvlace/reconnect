"use client";

import { Sparkles } from "lucide-react";

export function AIDisclaimer() {
  return (
    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
      <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
      <p>
        AI-generated content. All hiring decisions must be made by humans.
      </p>
    </div>
  );
}
