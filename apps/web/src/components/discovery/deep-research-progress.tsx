"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Circle, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Generating search queries", duration: 6000 },
  { label: "Searching the web", duration: 8000 },
  { label: "Scoring & ranking sources", duration: 6000 },
  { label: "Extracting structured data", duration: 6000 },
  { label: "Synthesizing insights", duration: Infinity },
] as const;

const TOTAL_FINITE_TIME = STEPS.slice(0, -1).reduce(
  (sum, s) => sum + s.duration,
  0,
);

interface DeepResearchProgressProps {
  isActive: boolean;
  /** Timestamp (Date.now()) when research started — lifted to parent so it survives tab switches */
  startedAt: number | null;
}

export function DeepResearchProgress({ isActive, startedAt }: DeepResearchProgressProps) {
  // Track elapsed time in state — only updated inside interval callback (not synchronously in effect)
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive || !startedAt) return;
    // First tick fires after 200ms — imperceptible delay for a progress indicator
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 200);
    return () => clearInterval(interval);
  }, [isActive, startedAt]);
  let activeStep = 0;
  let cumulative = 0;
  for (let i = 0; i < STEPS.length - 1; i++) {
    cumulative += STEPS[i].duration;
    if (elapsed >= cumulative) {
      activeStep = i + 1;
    } else {
      break;
    }
  }
  const progress = isActive ? Math.min((elapsed / TOTAL_FINITE_TIME) * 80, 80) : 0;

  if (!isActive) return null;

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Progress bar */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {STEPS.map((step, i) => {
          const isCompleted = i < activeStep;
          const isCurrent = i === activeStep;

          return (
            <div
              key={step.label}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors duration-300",
                isCompleted && "text-muted-foreground",
                isCurrent && "text-foreground font-medium",
                !isCompleted && !isCurrent && "text-muted-foreground/50",
              )}
            >
              {isCompleted ? (
                <CheckCircle size={16} weight="duotone" className="shrink-0 text-green-500" />
              ) : isCurrent ? (
                <CircleNotch size={16} weight="bold" className="shrink-0 animate-spin text-blue-500" />
              ) : (
                <Circle size={16} className="shrink-0" />
              )}
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
