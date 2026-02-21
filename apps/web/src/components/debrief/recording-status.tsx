"use client";

import { Badge } from "@/components/ui/badge";
import {
  Circle,
  Upload,
  CheckCircle,
  Loader2,
  XCircle,
  Ban,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "Pending",
    color: "bg-gray-100 text-gray-800",
    Icon: Circle,
  },
  uploading: {
    label: "Uploading",
    color: "bg-blue-100 text-blue-800",
    Icon: Upload,
  },
  uploaded: {
    label: "Uploaded",
    color: "bg-blue-100 text-blue-800",
    Icon: Upload,
  },
  transcribing: {
    label: "Transcribing",
    color: "bg-amber-100 text-amber-800",
    Icon: Loader2,
  },
  completed: {
    label: "Ready",
    color: "bg-green-100 text-green-800",
    Icon: CheckCircle,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-800",
    Icon: XCircle,
  },
  no_consent: {
    label: "No Consent",
    color: "bg-gray-100 text-gray-600",
    Icon: Ban,
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
    <Badge className={`${color} text-xs`} variant="secondary">
      <Icon
        className={`mr-1 h-3 w-3 ${status === "transcribing" ? "animate-spin" : ""}`}
      />
      {label}
    </Badge>
  );
}
