"use client";

import { useState, useEffect } from "react";
import type { InterviewData, StageInfo } from "./types";
import { FeedbackForm } from "./feedback-form";
import { ClipboardText, Clock } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  parseRatings,
  parseStringArray,
  type FeedbackEntry,
} from "@/lib/debrief/feedback-parsers";
import { loadFeedbackForInterviews } from "@/lib/debrief/feedback-loader";

interface FeedbackListProps {
  candidateId: string;
  interviews: InterviewData[];
  stages: StageInfo[];
  currentUserId: string;
  isManagerOrAdmin: boolean;
}

export function FeedbackList({
  candidateId,
  interviews,
  stages,
  currentUserId,
  isManagerOrAdmin,
}: FeedbackListProps) {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Clear stale feedback when candidate changes
    setFeedback([]);

    if (interviews.length === 0) return;

    async function loadFeedback() {
      setIsLoading(true);
      try {
        const { results } = await loadFeedbackForInterviews(interviews, {
          filterValid: false,
        });
        const allFeedback: FeedbackEntry[] = [];
        for (const { data } of results) {
          allFeedback.push(...data);
        }
        setFeedback(allFeedback);
      } catch (err) {
        console.error("[feedback-list] Load failed:", err);
        toast.error("Failed to load feedback");
      } finally {
        setIsLoading(false);
      }
    }

    loadFeedback();
  }, [interviews, candidateId]);

  const completedInterviews = interviews.filter(
    (i) => i.status === "completed",
  );
  const totalExpected = completedInterviews.length;
  const totalReceived = feedback.length;
  const waitingFor = totalExpected - totalReceived;

  function getStageName(interviewId: string | null): string {
    if (!interviewId) return "Unknown";
    const interview = interviews.find((i) => i.id === interviewId);
    if (!interview?.stage_id) return "Unknown";
    return stages.find((s) => s.id === interview.stage_id)?.name ?? "Unknown";
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <p className="text-[14px] text-muted-foreground">Loading feedback...</p>
      </div>
    );
  }

  // Find interviews where current user hasn't submitted feedback yet
  // Only show form if user is the assigned interviewer OR is a manager/admin
  const interviewsWithoutMyFeedback = interviews.filter(
    (i) =>
      (isManagerOrAdmin || i.interviewer_id === currentUserId) &&
      !feedback.some((f) => f.interview_id === i.id && f.interviewer_id === currentUserId),
  );

  function handleFeedbackSubmitted() {
    if (interviews.length === 0) return;
    (async () => {
      try {
        const { results } = await loadFeedbackForInterviews(interviews, {
          filterValid: false,
        });
        const allFeedback: FeedbackEntry[] = [];
        for (const { data } of results) {
          allFeedback.push(...data);
        }
        setFeedback(allFeedback);
      } catch (err) {
        console.error("[feedback-list] Reload after submit failed:", err);
        toast.error("Failed to reload feedback after submission");
      }
    })();
  }

  if (feedback.length === 0 && interviewsWithoutMyFeedback.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <ClipboardText size={24} weight="duotone" className="text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No feedback submitted yet.
          {!isManagerOrAdmin &&
            " Submit your feedback after completing your interview."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Submit feedback form for interviews without feedback from current user */}
      {interviewsWithoutMyFeedback.map((interview) => {
        const stage = stages.find((s) => s.id === interview.stage_id);
        return (
          <div key={`form-${interview.id}`}>
            {stage && (
              <p className="mb-2 text-[12px] font-medium text-muted-foreground">
                {stage.name}
              </p>
            )}
            <FeedbackForm
              interviewId={interview.id}
              focusAreas={["Overall Assessment", "Technical Skills", "Communication", "Culture Fit"]}
              onSubmit={handleFeedbackSubmitted}
            />
          </div>
        );
      })}

      {/* Waiting badge */}
      {waitingFor > 0 && (
        <div className="flex items-center justify-end">
          <span className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[12px] font-medium text-muted-foreground">
            <Clock size={12} weight="duotone" />
            Waiting for {waitingFor} more
          </span>
        </div>
      )}

      {feedback.map((fb) => {
        const isOwn = fb.interviewer_id === currentUserId;
        const canView = isManagerOrAdmin || isOwn;

        if (!canView) return null;

        const ratings = parseRatings(fb.ratings);
        const prosArr = parseStringArray(fb.pros);
        const consArr = parseStringArray(fb.cons);

        return (
          <div
            key={fb.id}
            className="rounded-xl border border-border/40 bg-card p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {getStageName(fb.interview_id)}
                </span>
                {isOwn && (
                  <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                    Your feedback
                  </span>
                )}
              </div>
              {fb.submitted_at && (
                <span className="text-[11px] text-muted-foreground">
                  {new Date(fb.submitted_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Ratings */}
            {ratings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ratings.map((r, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[12px] font-medium text-foreground"
                  >
                    {r.category}: {r.score}/4
                  </span>
                ))}
              </div>
            )}

            {/* Pros */}
            {prosArr.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-green-700 mb-1.5">Strengths</p>
                <ul className="space-y-1">
                  {prosArr.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cons */}
            {consArr.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-red-700 mb-1.5">Concerns</p>
                <ul className="space-y-1">
                  {consArr.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {fb.notes && (
              <p className="text-[13px] italic text-muted-foreground border-l-2 border-border/60 pl-3">
                {fb.notes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
