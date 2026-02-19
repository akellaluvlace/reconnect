"use client";

import { AlertTriangle } from "lucide-react";

export function AIDisclaimer() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        This AI-generated content is for informational purposes only. All hiring
        decisions must be made by humans.
      </p>
    </div>
  );
}
