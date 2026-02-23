"use client";

import type { Json } from "@reconnect/database";
import { RecordingStatus } from "./recording-status";
import { VideoCamera, ShieldCheck } from "@phosphor-icons/react";

interface InterviewData {
  id: string;
  candidate_id: string | null;
  stage_id: string | null;
  interviewer_id: string | null;
  status: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  meet_link: string | null;
  recording_status: string | null;
  recording_consent_at: string | null;
  recording_url: string | null;
  drive_file_id: string | null;
  meet_conference_id: string | null;
  transcript: string | null;
  transcript_metadata: Json | null;
  created_at: string | null;
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "border-blue-200 bg-blue-50 text-blue-800" },
  completed: { label: "Completed", color: "border-green-200 bg-green-50 text-green-800" },
  cancelled: { label: "Cancelled", color: "border-border/60 bg-muted/40 text-muted-foreground" },
  no_show: { label: "No Show", color: "border-red-200 bg-red-50 text-red-800" },
};

interface InterviewCardProps {
  interview: InterviewData;
  stageName: string;
  isOwnInterview: boolean;
}

export function InterviewCard({
  interview,
  isOwnInterview,
}: InterviewCardProps) {
  const statusInfo =
    STATUS_STYLES[interview.status ?? ""] ?? STATUS_STYLES.scheduled;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card px-5 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusInfo.color}`}>
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
              ? new Date(interview.scheduled_at).toLocaleString()
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
        <RecordingStatus status={interview.recording_status} />

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
  );
}
