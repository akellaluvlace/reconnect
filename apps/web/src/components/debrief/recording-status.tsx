"use client";

import {
  CalendarBlank,
  Clock,
  CloudArrowDown,
  Waveform,
  CheckCircle,
  CircleNotch,
  XCircle,
  Prohibit,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; Icon: Icon; spinning?: boolean }
> = {
  scheduled: {
    label: "Scheduled",
    color: "border-border/60 bg-muted/40 text-muted-foreground",
    Icon: CalendarBlank,
  },
  pending: {
    label: "Pending",
    color: "border-amber-200 bg-amber-50 text-amber-800",
    Icon: Clock,
  },
  uploaded: {
    label: "Uploaded",
    color: "border-blue-200 bg-blue-50 text-blue-800",
    Icon: CloudArrowDown,
  },
  transcribed: {
    label: "Transcribed",
    color: "border-teal-200 bg-teal-50 text-teal-800",
    Icon: Waveform,
  },
  synthesizing: {
    label: "Synthesizing",
    color: "border-purple-200 bg-purple-50 text-purple-800",
    Icon: CircleNotch,
    spinning: true,
  },
  completed: {
    label: "Ready",
    color: "border-green-200 bg-green-50 text-green-800",
    Icon: CheckCircle,
  },
  failed_recording: {
    label: "No Recording",
    color: "border-red-200 bg-red-50 text-red-800",
    Icon: XCircle,
  },
  failed_download: {
    label: "Download Failed",
    color: "border-red-200 bg-red-50 text-red-800",
    Icon: XCircle,
  },
  failed_transcription: {
    label: "Transcription Failed",
    color: "border-red-200 bg-red-50 text-red-800",
    Icon: XCircle,
  },
  failed_synthesis: {
    label: "Synthesis Failed",
    color: "border-red-200 bg-red-50 text-red-800",
    Icon: XCircle,
  },
  no_consent: {
    label: "No Consent",
    color: "border-border/60 bg-muted/40 text-muted-foreground",
    Icon: Prohibit,
  },
};

interface RecordingStatusProps {
  status: string | null;
}

export function RecordingStatus({ status }: RecordingStatusProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const { label, color, Icon, spinning } = config;

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${color}`}>
      <Icon
        size={12}
        weight={spinning ? "bold" : "duotone"}
        className={spinning ? "animate-spin" : undefined}
      />
      {label}
    </span>
  );
}
