"use client";

import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const steps = [
  { number: 1, label: "Basic Info" },
  { number: 2, label: "Role Details" },
  { number: 3, label: "Generate" },
];

export function WizardProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-3">
      {steps.map((step, i) => {
        const isComplete = currentStep > step.number;
        const isCurrent = currentStep === step.number;
        const isPending = currentStep < step.number;

        return (
          <div key={step.number} className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200",
                  isComplete && "bg-teal-500 text-white",
                  isCurrent && "bg-teal-600 text-white ring-2 ring-teal-200",
                  isPending && "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? <Check size={14} weight="bold" /> : step.number}
              </div>
              <span
                className={cn(
                  "text-[13px] font-medium transition-colors",
                  (isComplete || isCurrent) ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-10 transition-colors",
                  isComplete ? "bg-teal-400" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
