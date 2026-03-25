"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecordingStatus as RecordingStatusType } from "@reconnect/database";
import type { InterviewData } from "./types";
import { RecordingStatus } from "./recording-status";
import { PipelineLogViewer } from "./pipeline-log-viewer";
import { ManualUpload } from "./manual-upload";
import { Button } from "@/components/ui/button";
import {
  VideoCamera,
  ShieldCheck,
  ArrowClockwise,
  UploadSimple,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  scheduled: {
    label: "Scheduled",
    color: "border-blue-200 bg-blue-50 text-blue-800",
  },
  completed: {
    label: "Completed",
    color: "border-green-200 bg-green-50 text-green-800",
  },
  cancelled: {
    label: "Cancelled",
    color: "border-border/60 bg-muted/40 text-muted-foreground",
  },
  no_show: {
    label: "No Show",
    color: "border-red-200 bg-red-50 text-red-800",
  },
};

interface InterviewCardProps {
  interview: InterviewData;
  stageName: string;
  isOwnInterview: boolean;
  isManagerOrAdmin?: boolean;
}

export function InterviewCard({
  interview,
  isOwnInterview,
  isManagerOrAdmin,
}: InterviewCardProps) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const statusInfo =
    STATUS_STYLES[interview.status ?? ""] ?? STATUS_STYLES.scheduled;

  const canRetry =
    isManagerOrAdmin &&
    ["failed_transcription", "failed_download"].includes(
      interview.recording_status ?? "",
    ) &&
    (interview.retry_count ?? 0) < 3;

  const canUpload =
    isManagerOrAdmin &&
    ["scheduled", "pending", "no_consent", "failed_transcription"].includes(
      interview.recording_status ?? "",
    );

  const canDelete =
    isManagerOrAdmin &&
    ["scheduled", "cancelled"].includes(interview.status ?? "");

  async function handleDelete() {
    if (!window.confirm("Delete this interview? The calendar event will be removed and attendees will be notified.")) return;
    try {
      const res = await fetch(`/api/interviews/${interview.id}`, {
        method: "DELETE",
      });
      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success("Interview deleted");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed",
      );
    }
  }

  const pipelineLog = (interview.pipeline_log ?? []) as Array<{
    from: string | null;
    to: string;
    ts: string;
    detail: string;
  }>;

  return (
    <div className="rounded-xl border border-border/40 bg-card px-5 py-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
              {isOwnInterview && (
                <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                  Your interview
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {interview.scheduled_at
                ? new Date(interview.scheduled_at).toLocaleString("en-IE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Not scheduled"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Consent badge */}
          {interview.recording_consent_at && (
            <span className="flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-800">
              <ShieldCheck size={12} weight="duotone" />
              Consent
            </span>
          )}

          {/* Recording status */}
          <RecordingStatus
            status={
              interview.recording_status as RecordingStatusType | null
            }
          />

          {/* Meet link */}
          {interview.meet_link && (
            <a
              href={interview.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-teal-600 hover:text-teal-700 hover:underline"
            >
              <VideoCamera size={12} weight="duotone" />
              Meet
            </a>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {isManagerOrAdmin && (
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                toast.info(
                  "Retry will be attempted on next cron run",
                );
              }}
            >
              <ArrowClockwise size={12} className="mr-1" />
              Retry
            </Button>
          )}
          {canUpload && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setShowUpload(!showUpload)}
            >
              <UploadSimple size={12} className="mr-1" />
              Upload Recording
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] text-red-600 hover:text-red-700"
              onClick={handleDelete}
            >
              <Trash size={12} className="mr-1" />
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Manual upload section */}
      {showUpload && (
        <div className="mt-3">
          <ManualUpload
            interviewId={interview.id}
            onUploadComplete={() => {
              setShowUpload(false);
              router.refresh();
            }}
          />
        </div>
      )}

      {/* Pipeline log */}
      <PipelineLogViewer log={pipelineLog} />
    </div>
  );
}
