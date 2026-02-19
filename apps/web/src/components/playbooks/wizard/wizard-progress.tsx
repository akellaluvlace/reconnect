"use client";

import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { number: 1, label: "Basic Info" },
  { number: 2, label: "Role Details" },
  { number: 3, label: "Generate" },
];

export function WizardProgress({ currentStep }: { currentStep: number }) {
  const totalSteps = steps.length;
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="space-y-4">
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between">
        {steps.map((step) => (
          <div key={step.number} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                currentStep > step.number
                  ? "bg-primary text-primary-foreground"
                  : currentStep === step.number
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {currentStep > step.number ? (
                <Check className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                "text-sm",
                currentStep >= step.number
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
