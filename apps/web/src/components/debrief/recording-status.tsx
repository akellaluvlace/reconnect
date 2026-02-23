"use client";

import {
  Circle,
  UploadSimple,
  CheckCircle,
  CircleNotch,
  XCircle,
  Prohibit,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; Icon: Icon }
> = {
  pending: {
    label: "Pending",
    color: "border-border/60 bg-muted/40 text-muted-foreground",
    Icon: Circle,
  },
  uploading: {
    label: "Uploading",
    color: "border-blue-200 bg-blue-50 text-blue-800",
    Icon: UploadSimple,
  },
  uploaded: {
    label: "Uploaded",
    color: "border-blue-200 bg-blue-50 text-blue-800",
    Icon: UploadSimple,
  },
  transcribing: {
    label: "Transcribing",
    color: "border-amber-200 bg-amber-50 text-amber-800",
    Icon: CircleNotch,
  },
  completed: {
    label: "Ready",
    color: "border-green-200 bg-green-50 text-green-800",
    Icon: CheckCircle,
  },
  failed: {
    label: "Failed",
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

  const { label, color, Icon } = config;

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${color}`}>
      <Icon
        size={12}
        weight={status === "transcribing" ? "bold" : "duotone"}
        className={status === "transcribing" ? "animate-spin" : undefined}
      />
      {label}
    </span>
  );
}
