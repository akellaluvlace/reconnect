"use client";

import { useState, useEffect } from "react";
import type { Json } from "@reconnect/database";
import { UsersThree } from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CandidateComparisonProps {
  candidates: Array<{ id: string; name: string }>;
  interviews: Array<{
    id: string;
    candidate_id: string | null;
    stage_id: string | null;
    status: string | null;
  }>;
  stages: Array<{ id: string; name: string; order_index: number }>;
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

/** candidateId -> stageId -> FeedbackEntry[] */
type FeedbackMap = Record<string, Record<string, FeedbackEntry[]>>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseRatings(
  ratingsJson: Json,
): Array<{ category: string; score: number }> {
  if (!Array.isArray(ratingsJson)) return [];
  return ratingsJson.filter(
    (r): r is { category: string; score: number } =>
      typeof r === "object" &&
      r !== null &&
      "category" in r &&
      "score" in r &&
      typeof (r as Record<string, unknown>).score === "number",
  );
}

function parseStringArray(json: Json | null): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((item): item is string => typeof item === "string");
}

function averageScore(
  ratings: Array<{ category: string; score: number }>,
): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  return sum / ratings.length;
}

/** Return color classes for a 1-4 rating */
function ratingColorClasses(score: number): string {
  if (score <= 1.5) return "bg-red-50 text-red-700 border-red-200";
  if (score <= 2.5) return "bg-amber-50 text-amber-700 border-amber-200";
  if (score <= 3.5) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-green-50 text-green-700 border-green-200";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CandidateComparison({
  candidates,
  interviews,
  stages,
}: CandidateComparisonProps) {
  const [feedbackMap, setFeedbackMap] = useState<FeedbackMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const sortedStages = [...stages].sort(
    (a, b) => a.order_index - b.order_index,
  );

  /* ---- Fetch feedback for every interview in parallel ---- */
  useEffect(() => {
    let cancelled = false;

    async function loadAllFeedback() {
      setIsLoading(true);
      const map: FeedbackMap = {};

      try {
        const validInterviews = interviews.filter(
          (i) => i.candidate_id && i.stage_id,
        );

        const results = await Promise.allSettled(
          validInterviews.map(async (interview) => {
            const res = await fetch(
              `/api/feedback?interview_id=${interview.id}`,
            );
            if (handleSessionExpired(res)) {
              cancelled = true;
              throw new Error("session_expired");
            }
            if (!res.ok) {
              throw new Error(`${res.status} ${res.statusText}`);
            }
            return { interview, json: await res.json() };
          }),
        );

        let failedCount = 0;
        for (const result of results) {
          if (result.status === "rejected") {
            if (result.reason?.message !== "session_expired") {
              failedCount++;
            }
            continue;
          }

          const { interview, json } = result.value;
          const { data } = json;
          if (!Array.isArray(data)) continue;

          const cid = interview.candidate_id!;
          const sid = interview.stage_id!;

          if (!map[cid]) map[cid] = {};
          if (!map[cid][sid]) map[cid][sid] = [];
          map[cid][sid].push(...(data as FeedbackEntry[]));
        }

        if (!cancelled) {
          if (failedCount > 0) {
            toast.warning(
              `Some feedback could not be loaded (${failedCount} interview${failedCount > 1 ? "s" : ""} failed). Data may be incomplete.`,
            );
          }
          setFeedbackMap(map);
        }
      } catch (err) {
        console.error("[candidate-comparison] Load failed:", err);
        if (!cancelled) toast.error("Failed to load comparison data");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAllFeedback();
    return () => {
      cancelled = true;
    };
  }, [interviews]);

  /* ---- Derived: total feedback count ---- */
  const totalFeedback = Object.values(feedbackMap).reduce(
    (sum, byStage) =>
      sum +
      Object.values(byStage).reduce((s2, arr) => s2 + arr.length, 0),
    0,
  );

  /* ---- Compute per-candidate overall average ---- */
  function candidateOverallAvg(candidateId: string): number | null {
    const byStage = feedbackMap[candidateId];
    if (!byStage) return null;

    const allRatings: Array<{ category: string; score: number }> = [];
    for (const entries of Object.values(byStage)) {
      for (const fb of entries) {
        allRatings.push(...parseRatings(fb.ratings));
      }
    }
    return averageScore(allRatings);
  }

  /* ---- Compute per-candidate stage average ---- */
  function cellAverage(
    candidateId: string,
    stageId: string,
  ): number | null {
    const entries = feedbackMap[candidateId]?.[stageId];
    if (!entries || entries.length === 0) return null;

    const allRatings: Array<{ category: string; score: number }> = [];
    for (const fb of entries) {
      allRatings.push(...parseRatings(fb.ratings));
    }
    return averageScore(allRatings);
  }

  /* ---- Per-candidate summary: top 3 pros/cons across all feedback ---- */
  function candidateSummary(candidateId: string): {
    pros: string[];
    cons: string[];
  } {
    const byStage = feedbackMap[candidateId];
    if (!byStage) return { pros: [], cons: [] };

    const allPros: string[] = [];
    const allCons: string[] = [];
    for (const entries of Object.values(byStage)) {
      for (const fb of entries) {
        allPros.push(...parseStringArray(fb.pros));
        allCons.push(...parseStringArray(fb.cons));
      }
    }
    return { pros: allPros.slice(0, 3), cons: allCons.slice(0, 3) };
  }

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <p className="text-[14px] text-muted-foreground">
          Loading comparison data...
        </p>
      </div>
    );
  }

  /* ---- No feedback state ---- */
  if (totalFeedback === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <UsersThree
          size={24}
          weight="duotone"
          className="text-muted-foreground/40"
        />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No feedback has been submitted yet. Comparison will be available once
          interviewers submit their feedback.
        </p>
      </div>
    );
  }

  /* ---- Comparison grid ---- */
  return (
    <div className="space-y-6">
      {/* Grid */}
      <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border/40">
              {/* Sticky stage-name column header */}
              <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Stage
              </th>
              {candidates.map((c) => (
                <th
                  key={c.id}
                  className="px-4 py-3 text-center text-[13px] font-semibold text-foreground whitespace-nowrap"
                >
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedStages.map((stage, idx) => (
              <tr
                key={stage.id}
                className={cn(
                  "border-b border-border/30",
                  idx % 2 === 0 ? "bg-card" : "bg-muted/20",
                )}
              >
                {/* Stage name -- sticky left */}
                <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-[13px] font-medium text-foreground whitespace-nowrap">
                  {stage.name}
                </td>
                {candidates.map((c) => {
                  const avg = cellAverage(c.id, stage.id);
                  return (
                    <td key={c.id} className="px-4 py-3 text-center">
                      {avg !== null ? (
                        <span
                          className={cn(
                            "inline-block min-w-[3rem] rounded-md border px-2.5 py-1 text-[13px] font-semibold tabular-nums",
                            ratingColorClasses(avg),
                          )}
                        >
                          {avg.toFixed(1)}
                        </span>
                      ) : (
                        <span className="inline-block min-w-[3rem] rounded-md border px-2.5 py-1 text-[13px] font-medium bg-muted/40 text-muted-foreground border-border/60">
                          &mdash;
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Overall row */}
            <tr className="border-t-2 border-border/60">
              <td className="sticky left-0 z-10 bg-card px-4 py-3 text-[13px] font-bold text-foreground">
                Overall
              </td>
              {candidates.map((c) => {
                const overall = candidateOverallAvg(c.id);
                return (
                  <td key={c.id} className="px-4 py-3 text-center">
                    {overall !== null ? (
                      <span
                        className={cn(
                          "inline-block min-w-[3rem] rounded-md border px-2.5 py-1 text-[14px] font-bold tabular-nums",
                          ratingColorClasses(overall),
                        )}
                      >
                        {overall.toFixed(1)}
                      </span>
                    ) : (
                      <span className="inline-block min-w-[3rem] rounded-md border px-2.5 py-1 text-[13px] font-medium bg-muted/40 text-muted-foreground border-border/60">
                        &mdash;
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Per-candidate summary cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(candidates.length, 4)}, minmax(0, 1fr))` }}>
        {candidates.map((c) => {
          const { pros, cons } = candidateSummary(c.id);
          const hasContent = pros.length > 0 || cons.length > 0;

          if (!hasContent) return null;

          return (
            <div
              key={c.id}
              className="rounded-xl border border-border/40 bg-card p-5 shadow-sm space-y-3"
            >
              <h4 className="text-[13px] font-semibold text-foreground truncate">
                {c.name}
              </h4>

              {pros.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-green-700 mb-1">
                    Top Strengths
                  </p>
                  <ul className="space-y-1">
                    {pros.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[12px] text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                        <span className="line-clamp-2">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {cons.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-red-700 mb-1">
                    Top Concerns
                  </p>
                  <ul className="space-y-1">
                    {cons.map((c2, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[12px] text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                        <span className="line-clamp-2">{c2}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
