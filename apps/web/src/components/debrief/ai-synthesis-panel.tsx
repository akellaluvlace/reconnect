"use client";

import { useState } from "react";
import type { Json } from "@reconnect/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import { AIIndicatorBadge } from "@/components/ai/ai-indicator-badge";
import { Brain, Sparkles, Loader2, FileText } from "lucide-react";
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
  interviews,
  stages,
}: AISynthesisPanelProps) {
  const [synthesis, setSynthesis] = useState<SynthesisData | null>(null);
  const [metadata, setMetadata] = useState<SynthesisMetadata | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if any interview has a transcript
  const hasTranscript = interviews.some(
    (i) => i.recording_status === "completed",
  );

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      // Fetch real feedback from all completed interviews
      const completedInterviews = interviews.filter(
        (i) => i.status === "completed",
      );

      if (completedInterviews.length === 0) {
        toast.error("No completed interviews to synthesize");
        return;
      }

      const feedbackForms: Array<{
        interviewer_name: string;
        ratings: Array<{ category: string; score: number }>;
        pros: string[];
        cons: string[];
        notes?: string;
      }> = [];

      // Fetch feedback for each completed interview
      for (const interview of completedInterviews) {
        const fbRes = await fetch(
          `/api/feedback?interview_id=${interview.id}`,
        );
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
            interviewer_name: stage?.name ?? "Interviewer",
            ratings,
            pros,
            cons,
            notes: fb.notes ?? undefined,
          });
        }
      }

      if (feedbackForms.length === 0) {
        toast.error("No feedback submitted yet — cannot generate synthesis");
        return;
      }

      // Pick the first completed interview with a transcript
      const transcriptInterview = interviews.find(
        (i) => i.recording_status === "completed",
      );

      const res = await fetch("/api/ai/synthesize-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidateName,
          role: stages[0]?.name ?? "Role",
          stage_name: "All Stages",
          feedback_forms: feedbackForms,
          interview_id: transcriptInterview?.id,
          candidate_id: candidateId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate synthesis");
      }

      const result = await res.json();
      setSynthesis(result.data);
      setMetadata(result.metadata);
    } catch (err) {
      console.error("[ai-synthesis] Generation failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate synthesis",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (!synthesis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Synthesis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Generate an AI synthesis of all feedback for this candidate
            </p>
            {hasTranscript && (
              <Badge variant="secondary" className="text-xs">
                <FileText className="mr-1 h-3 w-3" />
                Transcript available
              </Badge>
            )}
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Synthesis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Synthesis
          </CardTitle>
          <div className="flex items-center gap-2">
            <AIIndicatorBadge />
            {metadata?.transcript_included && (
              <Badge variant="secondary" className="text-xs">
                <FileText className="mr-1 h-3 w-3" />
                {metadata.transcript_truncated
                  ? "Transcript (truncated)"
                  : "Transcript included"}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              aria-label="Regenerate synthesis"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {synthesis.summary && (
          <div>
            <p className="text-sm font-medium">Summary</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {synthesis.summary}
            </p>
          </div>
        )}

        {/* Consensus */}
        {synthesis.consensus && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Team Consensus</p>
            {synthesis.consensus.areas_of_agreement.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-700">Areas of Agreement</p>
                <ul className="mt-1 space-y-1">
                  {synthesis.consensus.areas_of_agreement.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {synthesis.consensus.areas_of_disagreement.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-700">Areas of Disagreement</p>
                <ul className="mt-1 space-y-1">
                  {synthesis.consensus.areas_of_disagreement.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
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
          <div>
            <p className="text-sm font-medium text-green-700">Key Strengths</p>
            <ul className="mt-1 space-y-1">
              {synthesis.key_strengths.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Concerns */}
        {synthesis.key_concerns.length > 0 && (
          <div>
            <p className="text-sm font-medium text-red-700">Key Concerns</p>
            <ul className="mt-1 space-y-1">
              {synthesis.key_concerns.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rating Overview */}
        {synthesis.rating_overview && (
          <div>
            <p className="text-sm font-medium">Rating Overview</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                Average: {synthesis.rating_overview.average_score.toFixed(1)}/4
              </Badge>
              <Badge variant="outline" className="text-xs">
                {synthesis.rating_overview.total_feedback_count} feedback forms
              </Badge>
            </div>
            {synthesis.rating_overview.score_distribution.length > 0 && (
              <div className="mt-2 flex gap-2">
                {synthesis.rating_overview.score_distribution.map((d) => (
                  <Badge key={d.score} variant="outline" className="text-xs">
                    Score {d.score}: {d.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discussion Points */}
        {synthesis.discussion_points &&
          synthesis.discussion_points.length > 0 && (
            <div>
              <p className="text-sm font-medium">Discussion Points</p>
              <ol className="mt-1 space-y-1 list-decimal list-inside">
                {synthesis.discussion_points.map((d, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {d}
                  </li>
                ))}
              </ol>
            </div>
          )}

        {/* AI Disclaimer from synthesis output */}
        {synthesis.disclaimer && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
            {synthesis.disclaimer}
          </p>
        )}

        <AIDisclaimer />
      </CardContent>
    </Card>
  );
}
