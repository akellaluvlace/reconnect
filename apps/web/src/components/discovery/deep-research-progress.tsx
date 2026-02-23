"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
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
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive || !startedAt) {
      setActiveStep(0);
      setProgress(0);
      return;
    }

    function computeState() {
      const elapsed = Date.now() - startedAt!;

      // Calculate which step we're on based on cumulative durations
      let cumulative = 0;
      let currentStep = 0;
      for (let i = 0; i < STEPS.length - 1; i++) {
        cumulative += STEPS[i].duration;
        if (elapsed >= cumulative) {
          currentStep = i + 1;
        } else {
          break;
        }
      }

      setActiveStep(currentStep);

      // Progress bar: scale to 80% over the first 4 steps, then hold
      const pct = Math.min((elapsed / TOTAL_FINITE_TIME) * 80, 80);
      setProgress(pct);
    }

    // Run immediately so remount after tab switch shows correct position
    computeState();

    const interval = setInterval(computeState, 200);
    return () => clearInterval(interval);
  }, [isActive, startedAt]);

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
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" />
              )}
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
