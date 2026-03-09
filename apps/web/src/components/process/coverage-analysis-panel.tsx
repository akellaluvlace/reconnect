"use client";

import { useState, useEffect, useCallback } from "react";
import type { CoverageAnalysis, JobDescription } from "@reconnect/database";
import { useAIGenerationStore, IDLE_OP } from "@/stores/ai-generation-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  Warning,
  Info,
  CircleNotch,
  CheckCircle,
  Sparkle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import type { StageData } from "./process-page-client";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";

interface CoverageAnalysisPanelProps {
  playbookId: string;
  role: string;
  level: string;
  jd: JobDescription;
  stages: StageData[];
  initialAnalysis: CoverageAnalysis | null;
  onAnalysisChange?: (analysis: CoverageAnalysis) => void;
  stagesChanged?: boolean;
}

const SEVERITY_CONFIG = {
  critical: { color: "border-red-200 bg-red-50 text-red-800", icon: Warning },
  important: { color: "border-orange-200 bg-orange-50 text-orange-800", icon: Warning },
  minor: { color: "border-yellow-200 bg-yellow-50 text-yellow-800", icon: Info },
};

const STRENGTH_CONFIG = {
  strong: "border-green-200 bg-green-50 text-green-800",
  moderate: "border-blue-200 bg-blue-50 text-blue-800",
  weak: "border-orange-200 bg-orange-50 text-orange-800",
};

export function CoverageAnalysisPanel({
  playbookId,
  role,
  level,
  jd,
  stages,
  initialAnalysis,
  onAnalysisChange,
  stagesChanged,
}: CoverageAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<CoverageAnalysis | null>(initialAnalysis);

  const opKey = `coverage-${playbookId}`;
  const { status } = useAIGenerationStore(
    (s) => s.operations[opKey] ?? IDLE_OP,
  );
  const isAnalyzing = status === "loading";

  // Sync analysis with parent state (apply flow updates coverage externally)
  useEffect(() => {
    setAnalysis(initialAnalysis);
  }, [initialAnalysis]);

  // Subscribe to store changes to apply results
  const handleStoreChange = useCallback((op: { status: string; result: unknown; error: string | null }) => {
    if (op.status === "success" && op.result) {
      const data = op.result as CoverageAnalysis;
      setAnalysis(data);
      onAnalysisChange?.(data);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
    if (op.status === "error" && op.error) {
      toast.error(op.error);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
  }, [opKey, onAnalysisChange]);

  useEffect(() => {
    return useAIGenerationStore.subscribe((state, prevState) => {
      const op = state.operations[opKey];
      const prevOp = prevState.operations[opKey];
      if (op && op !== prevOp) {
        handleStoreChange(op);
      }
    });
  }, [opKey, handleStoreChange]);

  function handleAnalyze() {
    useAIGenerationStore.getState().startOperation(opKey, async () => {
      const stagesSummary = stages.map((s) => ({
        name: s.name,
        type: s.type,
        focus_areas: (s.focus_areas ?? []).map((fa) => ({
          name: fa.name,
          description: fa.description,
        })),
      }));

      const totalFAs = stagesSummary.reduce((n, s) => n + s.focus_areas.length, 0);
      const stageNames = stagesSummary.map((s) => `${s.name} (${s.focus_areas.length} FAs)`).join(", ");

      console.log(`[coverage] SENDING { stages=${stagesSummary.length}: [${stageNames}], totalFAs=${totalFAs} }`);

      // Always use full analysis — user drives all edits, score must reflect reality
      const res = await fetch("/api/ai/analyze-coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          level,
          jd_requirements: {
            required: jd.requirements?.required ?? [],
            preferred: jd.requirements?.preferred ?? [],
            responsibilities: jd.responsibilities ?? [],
          },
          stages: stagesSummary,
        }),
        signal: AbortSignal.timeout(120_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("Coverage analysis timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to analyze coverage");
      }

      const { data } = await res.json();

      console.log(`[coverage] OK { score=${data.overall_coverage_score}%, covered=${data.requirements_covered?.length ?? 0}, gaps=${data.gaps?.length ?? 0} }`);

      // Persist to DB immediately (runs even if component unmounts during AI call)
      const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverage_analysis: data }),
      });
      if (handleSessionExpired(saveRes)) return;
      if (!saveRes.ok) {
        console.error("[coverage] Auto-save failed:", await saveRes.text().catch(() => ""));
        toast.warning("Coverage analysis generated but failed to save — try re-analyzing");
      }

      return data;
    });
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <ShieldCheck size={24} weight="duotone" className="text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          Analyze how well your interview stages cover the job requirements
        </p>
        <Button className="mt-4" onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
          ) : (
            <ShieldCheck size={16} weight="duotone" className="mr-2" />
          )}
          Analyze Coverage
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stages changed banner */}
      {stagesChanged && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Warning size={16} weight="duotone" className="text-amber-600 shrink-0" />
            <span className="text-[13px] text-amber-800">
              Interview stages have changed since this analysis was run.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            {isAnalyzing ? (
              <CircleNotch size={14} weight="bold" className="mr-1.5 animate-spin" />
            ) : (
              <Sparkle size={14} weight="duotone" className="mr-1.5" />
            )}
            Re-analyze
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          aria-label="Re-analyze coverage"
        >
          {isAnalyzing ? (
            <CircleNotch size={16} weight="bold" className="animate-spin" />
          ) : (
            <Sparkle size={16} weight="duotone" />
          )}
        </Button>
      </div>

      {/* Overall Score */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground">Overall Coverage</span>
          <span className="text-[28px] font-bold tabular-nums tracking-tight">
            {analysis.overall_coverage_score}%
          </span>
        </div>
        <Progress
          value={analysis.overall_coverage_score}
          className="mt-3 h-2.5"
        />
      </div>

      {/* Requirements Covered */}
      {analysis.requirements_covered.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} weight="duotone" className="text-green-600" />
            <h3 className="text-[15px] font-semibold tracking-tight">
              Requirements Covered ({analysis.requirements_covered.length})
            </h3>
          </div>
          <div className="space-y-2">
            {analysis.requirements_covered.map((rc, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2.5"
              >
                <span className="text-[13px] text-foreground truncate flex-1">{rc.requirement}</span>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[12px] text-muted-foreground">
                    {rc.covered_by_stage}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                      STRENGTH_CONFIG[rc.coverage_strength] ?? ""
                    }`}
                  >
                    {rc.coverage_strength}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps */}
      {analysis.gaps.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Warning size={16} weight="duotone" className="text-amber-600" />
            <h3 className="text-[15px] font-semibold tracking-tight">
              Gaps ({analysis.gaps.length})
            </h3>
          </div>
          <div className="space-y-3">
            {analysis.gaps.map((gap, i) => {
              const config = SEVERITY_CONFIG[gap.severity];
              const Icon = config.icon;
              return (
                <div key={i} className="rounded-lg border border-border/40 p-4">
                  <div className="flex items-center gap-2">
                    <Icon size={16} weight="duotone" className="shrink-0 text-amber-500" />
                    <span className="text-[13px] font-medium text-foreground flex-1 truncate">
                      {gap.requirement}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${config.color}`}
                    >
                      {gap.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground pl-6">
                    {gap.suggestion}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Redundancies */}
      {analysis.redundancies.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Info size={16} weight="duotone" className="text-blue-600" />
            <h3 className="text-[15px] font-semibold tracking-tight">
              Redundancies ({analysis.redundancies.length})
            </h3>
          </div>
          <div className="space-y-2">
            {analysis.redundancies.map((r, i) => (
              <div key={i} className="rounded-lg bg-muted/30 px-4 py-3">
                <span className="text-[13px] font-medium text-foreground">{r.focus_area}</span>
                <span className="text-[12px] text-muted-foreground">
                  {" "}appears in: {r.appears_in_stages.join(", ")}
                </span>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {r.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="space-y-3">
          {analysis.recommendations.map((r, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-border/40 bg-card p-5 shadow-sm"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-[11px] font-bold text-amber-700">
                {i + 1}
              </span>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                {r}
              </p>
            </div>
          ))}
        </div>
      )}
      <AIDisclaimer />
    </div>
  );
}
