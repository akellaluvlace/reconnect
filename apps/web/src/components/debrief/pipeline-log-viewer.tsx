"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CaretDown, CaretRight, ClockCounterClockwise } from "@phosphor-icons/react";

interface PipelineEntry {
  from: string | null;
  to: string;
  ts: string;
  detail: string;
}

interface PipelineLogViewerProps {
  log: PipelineEntry[];
}

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PipelineLogViewer({ log }: PipelineLogViewerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!log || log.length === 0) return null;

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-[11px] text-muted-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <CaretDown size={10} className="mr-1" />
        ) : (
          <CaretRight size={10} className="mr-1" />
        )}
        <ClockCounterClockwise size={10} className="mr-1" />
        Pipeline log ({log.length})
      </Button>
      {expanded && (
        <div className="mt-1 space-y-1 pl-2 border-l-2 border-border/40">
          {log.map((entry, i) => (
            <div key={i} className="text-[11px]">
              <span className="text-muted-foreground/60">
                {formatRelativeTime(entry.ts)}
              </span>
              {" "}
              <span className="font-medium text-teal-600">
                {entry.from ?? "init"} &rarr; {entry.to}
              </span>
              {" "}
              <span className="text-muted-foreground">{entry.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
