"use client";

import type { Json } from "@reconnect/database";
import { Badge } from "@/components/ui/badge";
import { RecordingStatus } from "./recording-status";
import { Video, ShieldCheck } from "lucide-react";

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
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
  no_show: { label: "No Show", color: "bg-red-100 text-red-800" },
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
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge className={`${statusInfo.color} text-xs`}>
              {statusInfo.label}
            </Badge>
            {isOwnInterview && (
              <Badge variant="outline" className="text-xs">
                Your interview
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {interview.scheduled_at
              ? new Date(interview.scheduled_at).toLocaleString()
              : "Not scheduled"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Consent badge */}
        {interview.recording_consent_at && (
          <Badge
            className="bg-green-100 text-green-800 hover:bg-green-100 text-xs"
          >
            <ShieldCheck className="mr-1 h-3 w-3" />
            Consent
          </Badge>
        )}

        {/* Recording status */}
        <RecordingStatus status={interview.recording_status} />

        {/* Meet link */}
        {interview.meet_link && (
          <a
            href={interview.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Video className="h-3 w-3" />
            Meet
          </a>
        )}
      </div>
    </div>
  );
}
