"use client";

import type { Json } from "@reconnect/database";
import { InterviewCard } from "./interview-card";
import { CalendarBlank } from "@phosphor-icons/react";

interface StageInfo {
  id: string;
  name: string;
  type: string | null;
  order_index: number;
}

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

interface InterviewListProps {
  playbookId: string;
  candidateId: string;
  interviews: InterviewData[];
  stages: StageInfo[];
  currentUserId: string;
}

export function InterviewList({
  interviews,
  stages,
  currentUserId,
}: InterviewListProps) {
  // Group interviews by stage
  const grouped = stages.map((stage) => ({
    stage,
    interviews: interviews.filter((i) => i.stage_id === stage.id),
  }));

  // Include interviews not matched to a stage
  const unmatchedInterviews = interviews.filter(
    (i) => !stages.some((s) => s.id === i.stage_id),
  );

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <CalendarBlank size={24} weight="duotone" className="text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No interviews scheduled for this candidate yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grouped
        .filter((g) => g.interviews.length > 0)
        .map((g) => (
          <div key={g.stage.id}>
            <p className="mb-3 text-[13px] font-semibold text-muted-foreground">
              {g.stage.name}
            </p>
            <div className="space-y-2">
              {g.interviews.map((interview) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  stageName={g.stage.name}
                  isOwnInterview={
                    interview.interviewer_id === currentUserId
                  }
                />
              ))}
            </div>
          </div>
        ))}
      {unmatchedInterviews.length > 0 && (
        <div>
          <p className="mb-3 text-[13px] font-semibold text-muted-foreground">
            Other
          </p>
          <div className="space-y-2">
            {unmatchedInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                stageName="Unassigned"
                isOwnInterview={
                  interview.interviewer_id === currentUserId
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
