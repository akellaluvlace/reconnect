"use client";

import { Clock } from "@phosphor-icons/react";
import type { StageData } from "./process-page-client";

interface TotalTimelineProps {
  stages: StageData[];
}

export function TotalTimeline({ stages }: TotalTimelineProps) {
  const totalMinutes = stages.reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0,
  );
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const timeStr = hours > 0
    ? `${hours}h ${mins > 0 ? `${mins}m` : ""}`
    : `${mins}m`;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock size={16} weight="duotone" />
      <span>
        {timeStr} across {stages.length} stage{stages.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
