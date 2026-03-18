"use client";

import { useState, useEffect, useCallback } from "react";
import type { InterviewData, StageInfo } from "./types";
import { useAIGenerationStore, IDLE_OP } from "@/stores/ai-generation-store";
import { Button } from "@/components/ui/button";
import { Brain, Sparkle, CircleNotch, FileText } from "@phosphor-icons/react";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

interface SynthesisData {
  summary: string;
  consensus: {
    areas_of_agreement: string[];
    areas_of_disagreement: string[];
  };
  key_strengths: string[];
  key_concerns: string[];
  discussion_points: string[];
  rating_overview: {
    average_score: number;
    total_feedback_count: number;
    score_distribution: Array<{ score: number; count: number }>;
  };
  disclaimer: string;
}

interface SynthesisMetadata {
  model_used: string;
  prompt_version: string;
  generated_at: string;
  transcript_included: boolean;
  transcript_truncated: boolean;
}

interface AISynthesisPanelProps {
  candidateId: string;
  candidateName: string;
  playbookTitle: string;
  interviews: InterviewData[];
  stages: StageInfo[];
}

export function AISynthesisPanel({
  candidateId,
  candidateName,
  playbookTitle,
  interviews,
  stages,
}: AISynthesisPanelProps) {
  const [synthesis, setSynthesis] = useState<SynthesisData | null>(null);
  const [metadata, setMetadata] = useState<SynthesisMetadata | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  const opKey = `synthesis-${candidateId}`;
  const { status } = useAIGenerationStore(
    (s) => s.operations[opKey] ?? IDLE_OP,
  );
  const isGenerating = status === "loading";

  // Load existing synthesis from DB on mount / candidate change
  useEffect(() => {
    setSynthesis(null);
    setMetadata(null);
    setIsLoadingExisting(true);

    (async () => {
      try {
        const res = await fetch(`/api/ai/synthesize-feedback?candidate_id=${candidateId}`);
        if (handleSessionExpired(res)) return;
        if (res.ok) {
          const data = await res.json();
          if (data.synthesis) {
            setSynthesis(data.synthesis.content as SynthesisData);
            setMetadata({
              model_used: data.synthesis.model_used ?? "",
              prompt_version: data.synthesis.prompt_version ?? "",
              generated_at: data.synthesis.generated_at ?? "",
              transcript_included: false,
              transcript_truncated: false,
            });
          }
        } else {
          console.error("[synthesis] Load existing failed:", res.status);
          toast.error("Failed to load existing synthesis");
        }
      } catch (err) {
        console.error("[synthesis] Load existing failed:", err);
        toast.error("Failed to load existing synthesis");
      } finally {
        setIsLoadingExisting(false);
      }
    })();
  }, [candidateId]);

  // Subscribe to store changes to apply results (avoids setState in useEffect body)
  const handleStoreChange = useCallback((op: { status: string; result: unknown; error: string | null }) => {
    if (op.status === "success" && op.result) {
      const r = op.result as { data: SynthesisData; metadata: SynthesisMetadata };
      setSynthesis(r.data);
      setMetadata(r.metadata);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
    if (op.status === "error" && op.error) {
      toast.error(op.error);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
  }, [opKey]);

  useEffect(() => {
    return useAIGenerationStore.subscribe((state, prevState) => {
      const op = state.operations[opKey];
      const prevOp = prevState.operations[opKey];
      if (op && op !== prevOp) {
        handleStoreChange(op);
      }
    });
  }, [opKey, handleStoreChange]);

  // Check if any interview has a transcript
  const hasTranscript = interviews.some(
    (i) => i.recording_status === "transcribed" || i.recording_status === "completed",
  );

  function handleGenerate() {
    // Pre-validate: need at least one interview with a transcript or completed status
    const readyInterviews = interviews.filter(
      (i) => i.recording_status === "transcribed" || i.recording_status === "completed" || i.status === "completed",
    );

    if (readyInterviews.length === 0) {
      toast.error("No transcribed interviews to synthesize. Record or upload a transcript first.");
      return;
    }

    useAIGenerationStore.getState().startOperation(opKey, async () => {
      const feedbackForms: Array<{
        interviewer_name: string;
        ratings: Array<{ category: string; score: number }>;
        pros: string[];
        cons: string[];
        notes?: string;
      }> = [];

      // Fetch feedback for each ready interview
      for (const interview of readyInterviews) {
        const fbRes = await fetch(
          `/api/feedback?interview_id=${interview.id}`,
        );
        if (handleSessionExpired(fbRes)) return;
        if (!fbRes.ok) continue;

        const { data: fbData } = await fbRes.json();
        if (!Array.isArray(fbData)) continue;

        const stage = stages.find((s) => s.id === interview.stage_id);

        for (const fb of fbData) {
          const ratings = Array.isArray(fb.ratings)
            ? fb.ratings.filter(
                (r: unknown): r is { category: string; score: number } =>
                  typeof r === "object" &&
                  r !== null &&
                  "category" in r &&
                  "score" in r,
              )
            : [];

          const pros = Array.isArray(fb.pros)
            ? fb.pros.filter((p: unknown): p is string => typeof p === "string")
            : [];

          const cons = Array.isArray(fb.cons)
            ? fb.cons.filter((c: unknown): c is string => typeof c === "string")
            : [];

          feedbackForms.push({
            interviewer_name: fb.interviewer_name ?? stage?.name ?? "Interviewer",
            ratings,
            pros,
            cons,
            notes: fb.notes ?? undefined,
          });
        }
      }

      if (feedbackForms.length === 0) {
        throw new Error("No feedback submitted yet — cannot generate synthesis");
      }

      // Pick the first interview with a transcript
      const transcriptInterview = readyInterviews.find(
        (i) => i.recording_status === "transcribed" || i.recording_status === "completed",
      );

      const res = await fetch("/api/ai/synthesize-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidateName,
          role: playbookTitle || "Role",
          stage_name: "All Stages",
          feedback_forms: feedbackForms,
          interview_id: transcriptInterview?.id,
          candidate_id: candidateId,
        }),
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate synthesis");
      }

      const apiResult = await res.json();
      return { data: apiResult.data, metadata: apiResult.metadata };
    });
  }

  if (isLoadingExisting) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <CircleNotch size={24} weight="bold" className="animate-spin text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          Loading existing synthesis...
        </p>
      </div>
    );
  }

  if (!synthesis) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <Brain size={24} weight="duotone" className="text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          Generate an AI synthesis of all feedback for this candidate
        </p>
        {hasTranscript && (
          <span className="mt-2 flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[12px] font-medium text-muted-foreground">
            <FileText size={12} weight="duotone" />
            Transcript available
          </span>
        )}
        <Button className="mt-4" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
          ) : (
            <Sparkle size={16} weight="duotone" className="mr-2" />
          )}
          Generate Synthesis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        {metadata?.transcript_included && (
          <span className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[12px] font-medium text-muted-foreground">
            <FileText size={12} weight="duotone" />
            {metadata.transcript_truncated
              ? "Transcript (truncated)"
              : "Transcript included"}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          aria-label="Regenerate synthesis"
        >
          {isGenerating ? (
            <CircleNotch size={16} weight="bold" className="animate-spin" />
          ) : (
            <Sparkle size={16} weight="duotone" />
          )}
        </Button>
      </div>

      {/* Summary */}
      {synthesis.summary && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <h3 className="text-[15px] font-semibold tracking-tight mb-3">Summary</h3>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {synthesis.summary}
          </p>
        </div>
      )}

      {/* Rating Overview */}
      {synthesis.rating_overview && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm text-center">
            <p className="text-[28px] font-bold tabular-nums tracking-tight">
              {synthesis.rating_overview.average_score.toFixed(1)}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Average score (out of 4)</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm text-center">
            <p className="text-[28px] font-bold tabular-nums tracking-tight">
              {synthesis.rating_overview.total_feedback_count}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Feedback forms</p>
          </div>
        </div>
      )}

      {/* Consensus */}
      {synthesis.consensus && (
        <div className="space-y-3">
          {synthesis.consensus.areas_of_agreement.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
              <h3 className="text-[15px] font-semibold tracking-tight text-green-700 mb-3">Areas of Agreement</h3>
              <ul className="space-y-2">
                {synthesis.consensus.areas_of_agreement.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {synthesis.consensus.areas_of_disagreement.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
              <h3 className="text-[15px] font-semibold tracking-tight text-amber-700 mb-3">Areas of Disagreement</h3>
              <ul className="space-y-2">
                {synthesis.consensus.areas_of_disagreement.map((d, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Key Strengths */}
      {synthesis.key_strengths.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <h3 className="text-[15px] font-semibold tracking-tight text-green-700 mb-3">Key Strengths</h3>
          <ul className="space-y-2">
            {synthesis.key_strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Concerns */}
      {synthesis.key_concerns.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <h3 className="text-[15px] font-semibold tracking-tight text-red-700 mb-3">Key Concerns</h3>
          <ul className="space-y-2">
            {synthesis.key_concerns.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Discussion Points */}
      {synthesis.discussion_points &&
        synthesis.discussion_points.length > 0 && (
          <div className="space-y-3">
            {synthesis.discussion_points.map((d, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-border/40 bg-card p-5 shadow-sm"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[11px] font-bold text-teal-700">
                  {i + 1}
                </span>
                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  {d}
                </p>
              </div>
            ))}
          </div>
        )}

      {/* AI Disclaimer */}
      <AIDisclaimer />
    </div>
  );
}
