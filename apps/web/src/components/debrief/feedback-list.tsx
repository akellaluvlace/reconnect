"use client";

import { useState, useEffect } from "react";
import type { Json } from "@reconnect/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock } from "lucide-react";
import { toast } from "sonner";

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

interface FeedbackEntry {
  id: string;
  interview_id: string | null;
  interviewer_id: string | null;
  ratings: Json;
  pros: Json | null;
  cons: Json | null;
  notes: string | null;
  focus_areas_confirmed: boolean;
  submitted_at: string | null;
}

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
        // Load feedback for ALL interviews (not just the first)
        const allFeedback: FeedbackEntry[] = [];

        for (const interview of interviews) {
          const res = await fetch(
            `/api/feedback?interview_id=${interview.id}`,
          );

          if (!res.ok) continue;

          const { data } = await res.json();
          if (Array.isArray(data)) {
            allFeedback.push(...data);
          }
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

  function parseRatings(
    ratingsJson: Json,
  ): Array<{ category: string; score: number }> {
    if (!Array.isArray(ratingsJson)) return [];
    return ratingsJson.filter(
      (r): r is { category: string; score: number } =>
        typeof r === "object" &&
        r !== null &&
        "category" in r &&
        "score" in r,
    );
  }

  function parseStringArray(json: Json | null): string[] {
    if (!Array.isArray(json)) return [];
    return json.filter((item): item is string => typeof item === "string");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Feedback
          </CardTitle>
          {waitingFor > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              Waiting for {waitingFor} more
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading feedback...</p>
        ) : feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No feedback submitted yet.
            {!isManagerOrAdmin &&
              " Submit your feedback after completing your interview."}
          </p>
        ) : (
          <div className="space-y-4">
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
                  className="rounded-md border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getStageName(fb.interview_id)}
                      </Badge>
                      {isOwn && (
                        <Badge
                          className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs"
                        >
                          Your feedback
                        </Badge>
                      )}
                    </div>
                    {fb.submitted_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(fb.submitted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Ratings */}
                  {ratings.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ratings.map((r, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {r.category}: {r.score}/4
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Pros */}
                  {prosArr.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-700">
                        Strengths
                      </p>
                      <ul className="mt-0.5 space-y-0.5">
                        {prosArr.map((p, i) => (
                          <li
                            key={i}
                            className="text-xs text-muted-foreground"
                          >
                            + {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cons */}
                  {consArr.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-700">
                        Concerns
                      </p>
                      <ul className="mt-0.5 space-y-0.5">
                        {consArr.map((c, i) => (
                          <li
                            key={i}
                            className="text-xs text-muted-foreground"
                          >
                            - {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Notes */}
                  {fb.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      {fb.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
