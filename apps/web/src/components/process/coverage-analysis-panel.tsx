"use client";

import { useState, useEffect } from "react";
import type { CoverageAnalysis, JobDescription } from "@reconnect/database";
import { useAIGenerationStore, IDLE_OP } from "@/stores/ai-generation-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  Lightbulb,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { StageData } from "./process-page-client";

interface CoverageAnalysisPanelProps {
  playbookId: string;
  role: string;
  level: string;
  jd: JobDescription;
  stages: StageData[];
}

const SEVERITY_CONFIG = {
  critical: { color: "border-red-200 bg-red-50 text-red-800", icon: AlertTriangle },
  important: { color: "border-orange-200 bg-orange-50 text-orange-800", icon: AlertTriangle },
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
}: CoverageAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<CoverageAnalysis | null>(null);

  const opKey = `coverage-${playbookId}`;
  const { status, result, error } = useAIGenerationStore(
    (s) => s.operations[opKey] ?? IDLE_OP,
  );
  const isAnalyzing = status === "loading";

  // Apply result when operation completes
  useEffect(() => {
    if (status === "success" && result) {
      setAnalysis(result as CoverageAnalysis);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
    if (status === "error" && error) {
      toast.error(error);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
  }, [status, result, error, opKey]);

  function handleAnalyze() {
    useAIGenerationStore.getState().startOperation(opKey, async () => {
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
          stages: stages.map((s) => ({
            name: s.name,
            type: s.type,
            focus_areas: (s.focus_areas ?? []).map((fa) => ({
              name: fa.name,
              description: fa.description,
            })),
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to analyze coverage");
      }

      const { data } = await res.json();
      return data;
    });
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <ShieldCheck className="h-6 w-6 text-muted-foreground/40" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          Analyze how well your interview stages cover the job requirements
        </p>
        <Button className="mt-4" onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Analyze Coverage
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
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
            <CheckCircle2 className="h-4 w-4 text-green-600" />
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
            <AlertTriangle className="h-4 w-4 text-amber-600" />
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
                    <Icon className="h-4 w-4 shrink-0 text-amber-500" />
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
            <Info className="h-4 w-4 text-blue-600" />
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
    </div>
  );
}
