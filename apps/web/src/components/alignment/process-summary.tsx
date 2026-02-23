"use client";

import { Clock } from "@phosphor-icons/react";

interface StageInfo {
  id: string;
  name: string;
  type: string;
  duration_minutes: number;
  order_index: number;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  screening: { label: "Screening", color: "border-blue-200 bg-blue-50 text-blue-800" },
  technical: { label: "Technical", color: "border-purple-200 bg-purple-50 text-purple-800" },
  behavioral: { label: "Behavioral", color: "border-green-200 bg-green-50 text-green-800" },
  case_study: { label: "Case Study", color: "border-orange-200 bg-orange-50 text-orange-800" },
  panel: { label: "Panel", color: "border-red-200 bg-red-50 text-red-800" },
  custom: { label: "Custom", color: "border-border/60 bg-muted/40 text-foreground" },
};

export function ProcessSummary({ stages }: { stages: StageInfo[] }) {
  const totalMinutes = stages.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <p className="text-[14px] text-muted-foreground">
          No stages defined yet. Configure your interview process in the
          Process tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm text-center">
          <p className="text-[28px] font-bold tabular-nums tracking-tight">
            {stages.length}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Stage{stages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm text-center">
          <p className="text-[28px] font-bold tabular-nums tracking-tight">
            {totalHours > 0 && `${totalHours}h `}{remainingMinutes}m
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Total duration</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        <div className="relative space-y-0">
          {stages.map((stage, i) => {
            const typeInfo = TYPE_LABELS[stage.type] ?? TYPE_LABELS.custom;
            return (
              <div key={stage.id} className="flex items-start gap-3">
                {/* Vertical timeline connector */}
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full border-2 border-teal-500 bg-background" />
                  {i < stages.length - 1 && (
                    <div className="w-px flex-1 bg-border/60 min-h-[2rem]" />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-foreground">{stage.name}</p>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${typeInfo.color}`}
                    >
                      {typeInfo.label}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Clock size={12} weight="duotone" />
                    {stage.duration_minutes} minutes
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
