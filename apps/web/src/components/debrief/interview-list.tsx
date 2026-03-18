"use client";

import type { InterviewData, StageInfo, CollaboratorInfo } from "./types";
import { InterviewCard } from "./interview-card";
import { ScheduleInterviewDialog } from "./schedule-interview-dialog";
import { CalendarBlank } from "@phosphor-icons/react";

interface InterviewListProps {
  playbookId: string;
  candidateId: string;
  candidateName?: string;
  candidateEmail?: string | null;
  interviews: InterviewData[];
  stages: StageInfo[];
  currentUserId: string;
  currentUserRole?: string;
  collaborators?: CollaboratorInfo[];
}

export function InterviewList({
  candidateId,
  candidateName,
  candidateEmail,
  interviews,
  stages,
  currentUserId,
  currentUserRole,
  collaborators,
}: InterviewListProps) {
  const isManagerOrAdmin = ["admin", "manager"].includes(
    currentUserRole ?? "",
  );

  // Group interviews by stage
  const grouped = stages.map((stage) => ({
    stage,
    interviews: interviews.filter((i) => i.stage_id === stage.id),
  }));

  // Include interviews not matched to a stage
  const unmatchedInterviews = interviews.filter(
    (i) => !stages.some((s) => s.id === i.stage_id),
  );

  return (
    <div className="space-y-5">
      {/* Schedule button for managers */}
      {isManagerOrAdmin && (
        <div className="flex justify-end">
          <ScheduleInterviewDialog
            candidateId={candidateId}
            candidateName={candidateName ?? "Candidate"}
            candidateEmail={candidateEmail}
            stages={stages.map((s) => ({
              id: s.id,
              name: s.name,
              duration_minutes: s.duration_minutes ?? null,
            }))}
            collaborators={collaborators ?? []}
          />
        </div>
      )}

      {interviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
          <CalendarBlank
            size={24}
            weight="duotone"
            className="text-muted-foreground/40"
          />
          <p className="mt-3 text-[14px] text-muted-foreground">
            No interviews scheduled for this candidate yet.
          </p>
        </div>
      ) : (
        <>
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
                      isManagerOrAdmin={isManagerOrAdmin}
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
                    isManagerOrAdmin={isManagerOrAdmin}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
