"use client";

import {
  Flag,
  CalendarBlank,
  UserPlus,
  Clock,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  date: string; // ISO date
  label: string;
  detail?: string;
  type: "milestone" | "interview" | "candidate";
}

export interface ActivityTimelineProps {
  playbookCreatedAt: string | null;
  playbookStatus: string | null;
  playbookUpdatedAt: string | null;
  candidates: Array<{ id: string; name: string; created_at: string | null }>;
  interviews: Array<{
    id: string;
    status: string | null;
    scheduled_at: string | null;
    completed_at: string | null;
    stage_id: string | null;
  }>;
  stages: Array<{ id: string; name: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

const dotColorByType: Record<TimelineEvent["type"], string> = {
  milestone: "bg-teal-500",
  interview: "bg-blue-500",
  candidate: "bg-purple-500",
};

const IconByType: Record<TimelineEvent["type"], typeof Flag> = {
  milestone: Flag,
  interview: CalendarBlank,
  candidate: UserPlus,
};

export function ActivityTimeline({
  playbookCreatedAt,
  playbookStatus,
  playbookUpdatedAt,
  candidates,
  interviews,
  stages,
}: ActivityTimelineProps) {
  const stageMap = new Map(stages.map((s) => [s.id, s.name]));

  const events: TimelineEvent[] = [];

  // 1. Playbook created
  if (playbookCreatedAt) {
    events.push({
      date: playbookCreatedAt,
      label: "Hiring plan created",
      type: "milestone",
    });
  }

  // 2. Process finalized
  if (playbookStatus === "active" && playbookUpdatedAt) {
    events.push({
      date: playbookUpdatedAt,
      label: "Process finalized",
      type: "milestone",
    });
  }

  // 3. Candidates added
  for (const c of candidates) {
    if (c.created_at) {
      events.push({
        date: c.created_at,
        label: `${c.name} added`,
        type: "candidate",
      });
    }
  }

  // 4. Interview scheduled
  for (const i of interviews) {
    if (i.scheduled_at) {
      const stageName = i.stage_id ? stageMap.get(i.stage_id) ?? "Unknown stage" : "Unknown stage";
      events.push({
        date: i.scheduled_at,
        label: "Interview scheduled",
        detail: stageName,
        type: "interview",
      });
    }
  }

  // 5. Interview completed
  for (const i of interviews) {
    if (i.status === "completed" && i.completed_at) {
      const stageName = i.stage_id ? stageMap.get(i.stage_id) ?? "Unknown stage" : "Unknown stage";
      events.push({
        date: i.completed_at,
        label: "Interview completed",
        detail: stageName,
        type: "interview",
      });
    }
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <Clock size={24} weight="duotone" className="text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No activity recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const Icon = IconByType[event.type];
        const isLast = idx === events.length - 1;

        return (
          <div key={`${event.date}-${event.label}-${idx}`} className="flex gap-4">
            {/* Date column */}
            <div className="w-16 shrink-0 pt-1 text-right">
              <span className="text-[12px] font-medium text-muted-foreground">
                {formatDate(event.date)}
              </span>
            </div>

            {/* Timeline column — dot + line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                  dotColorByType[event.type],
                )}
              />
              {!isLast && (
                <div className="w-0.5 flex-1 bg-border/60" />
              )}
            </div>

            {/* Content column */}
            <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
              <div className="flex items-center gap-2">
                <Icon size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
                <span className="text-[13px] font-medium text-foreground">
                  {event.label}
                </span>
              </div>
              {event.detail && (
                <p className="mt-0.5 pl-[22px] text-[12px] text-muted-foreground">
                  {event.detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
