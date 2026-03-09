"use client";

import { useState, useEffect } from "react";
import type { Json } from "@reconnect/database";
import {
  WarningCircle,
  Info,
  CheckCircle,
  Scales,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import { cn } from "@/lib/utils";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import {
  analyzeBias,
  type BiasFlag,
  type FeedbackForAnalysis,
} from "@/lib/debrief/bias-analysis";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BiasDetectionProps {
  candidates: Array<{ id: string; name: string }>;
  interviews: Array<{
    id: string;
    candidate_id: string | null;
    stage_id: string | null;
    status: string | null;
  }>;
  stages: Array<{ id: string; name: string }>;
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BiasDetection({
  candidates,
  interviews,
  stages,
}: BiasDetectionProps) {
  const [flags, setFlags] = useState<BiasFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFeedback, setHasFeedback] = useState(false);

  /* ---- Fetch feedback for every interview in parallel, then analyze ---- */
  useEffect(() => {
    let cancelled = false;

    async function loadAndAnalyze() {
      setIsLoading(true);
      const allFeedback: FeedbackForAnalysis[] = [];

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
            return { json: await res.json() };
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

          const { data } = result.value.json;
          if (!Array.isArray(data)) continue;

          for (const entry of data as FeedbackEntry[]) {
            if (!entry.interviewer_id) continue;

            const ratings = parseRatings(entry.ratings);
            if (ratings.length === 0) continue;

            allFeedback.push({
              interviewer_id: entry.interviewer_id,
              ratings,
            });
          }
        }

        if (!cancelled) {
          if (failedCount > 0) {
            toast.warning(
              `Some feedback could not be loaded (${failedCount} interview${failedCount > 1 ? "s" : ""} failed). Data may be incomplete.`,
            );
          }
          setHasFeedback(allFeedback.length > 0);
          setFlags(analyzeBias(allFeedback));
        }
      } catch (err) {
        console.error("[bias-detection] Load failed:", err);
        if (!cancelled) toast.error("Failed to load bias analysis data");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAndAnalyze();
    return () => {
      cancelled = true;
    };
  }, [interviews]);

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <p className="text-[14px] text-muted-foreground">
          Analyzing feedback patterns...
        </p>
      </div>
    );
  }

  /* ---- No feedback state ---- */
  if (!hasFeedback) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <Scales
          size={24}
          weight="duotone"
          className="text-muted-foreground/40"
        />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No feedback submitted yet.
        </p>
      </div>
    );
  }

  /* ---- No flags detected ---- */
  if (flags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <CheckCircle
          size={24}
          weight="duotone"
          className="text-green-500"
        />
        <p className="mt-3 text-[14px] text-muted-foreground">
          No patterns detected — all feedback appears balanced.
        </p>
      </div>
    );
  }

  /* ---- Flag cards ---- */
  return (
    <div className="space-y-4">
      <p className="text-[12px] font-medium text-muted-foreground/60 uppercase tracking-wider">
        Patterns worth noting
      </p>

      {flags.map((flag) => (
        <div
          key={flag.type}
          className={cn(
            "rounded-xl border p-5 shadow-sm",
            flag.severity === "warning"
              ? "border-amber-200 bg-amber-50"
              : "border-blue-200 bg-blue-50",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {flag.severity === "warning" ? (
              <WarningCircle
                size={18}
                weight="duotone"
                className="shrink-0 text-amber-600"
              />
            ) : (
              <Info
                size={18}
                weight="duotone"
                className="shrink-0 text-blue-600"
              />
            )}
            <span
              className={cn(
                "text-[14px] font-semibold",
                flag.severity === "warning"
                  ? "text-amber-800"
                  : "text-blue-800",
              )}
            >
              {flag.label}
            </span>
          </div>
          <p
            className={cn(
              "text-[13px] leading-relaxed pl-[26px]",
              flag.severity === "warning"
                ? "text-amber-700"
                : "text-blue-700",
            )}
          >
            {flag.description}
          </p>
        </div>
      ))}
      <AIDisclaimer />
    </div>
  );
}
