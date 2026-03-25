"use client";

import { useState, useEffect } from "react";
import {
  WarningCircle,
  Info,
  CheckCircle,
  Scales,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import {
  analyzeBias,
  type BiasFlag,
  type FeedbackForAnalysis,
} from "@/lib/debrief/bias-analysis";
import { parseRatings } from "@/lib/debrief/feedback-parsers";
import { loadFeedbackForInterviews } from "@/lib/debrief/feedback-loader";

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

      try {
        const { results, cancelled: sessionExpired } =
          await loadFeedbackForInterviews(interviews);
        if (sessionExpired) { cancelled = true; return; }

        const allFeedback: FeedbackForAnalysis[] = [];
        for (const { data } of results) {
          for (const entry of data) {
            if (!entry.interviewer_id) continue;
            const ratings = parseRatings(entry.ratings);
            if (ratings.length === 0) continue;
            allFeedback.push({ interviewer_id: entry.interviewer_id, ratings });
          }
        }

        if (!cancelled) {
          setHasFeedback(allFeedback.length > 0);
          setFlags(analyzeBias(allFeedback));
        }
      } catch (err) {
        console.error("[bias-detection] Load failed:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAndAnalyze();
    return () => { cancelled = true; };
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
