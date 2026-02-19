"use client";

import { useState } from "react";
import type { CoverageAnalysis, JobDescription } from "@reconnect/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import { AIIndicatorBadge } from "@/components/ai/ai-indicator-badge";
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  Lightbulb,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { StageData } from "./process-page-client";

interface CoverageAnalysisPanelProps {
  role: string;
  level: string;
  jd: JobDescription;
  stages: StageData[];
}

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-100 text-red-800", icon: AlertTriangle },
  important: { color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  minor: { color: "bg-yellow-100 text-yellow-800", icon: Info },
};

const STRENGTH_CONFIG = {
  strong: "bg-green-100 text-green-800",
  moderate: "bg-blue-100 text-blue-800",
  weak: "bg-orange-100 text-orange-800",
};

export function CoverageAnalysisPanel({
  role,
  level,
  jd,
  stages,
}: CoverageAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<CoverageAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleAnalyze() {
    setIsAnalyzing(true);
    try {
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
      setAnalysis(data);
    } catch (err) {
      console.error("[coverage] Analysis failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to analyze coverage",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Coverage Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Analyze how well your interview stages cover the job requirements
            </p>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Analyze Coverage
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
            <ShieldCheck className="h-5 w-5" />
            Coverage Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <AIIndicatorBadge />
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
                <ShieldCheck className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Coverage</span>
            <span className="font-semibold">
              {analysis.overall_coverage_score}%
            </span>
          </div>
          <Progress
            value={analysis.overall_coverage_score}
            className="mt-1 h-2"
          />
        </div>

        {/* Requirements Covered */}
        {analysis.requirements_covered.length > 0 && (
          <div>
            <p className="text-sm font-medium flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Requirements Covered ({analysis.requirements_covered.length})
            </p>
            <div className="mt-1 space-y-1">
              {analysis.requirements_covered.map((rc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs rounded-md bg-muted/50 px-2 py-1.5"
                >
                  <span className="truncate flex-1">{rc.requirement}</span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-muted-foreground">
                      {rc.covered_by_stage}
                    </span>
                    <Badge
                      className={`${STRENGTH_CONFIG[rc.coverage_strength] ?? ""} text-[10px]`}
                    >
                      {rc.coverage_strength}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gaps */}
        {analysis.gaps.length > 0 && (
          <div>
            <p className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Gaps ({analysis.gaps.length})
            </p>
            <div className="mt-1 space-y-2">
              {analysis.gaps.map((gap, i) => {
                const config = SEVERITY_CONFIG[gap.severity];
                const Icon = config.icon;
                return (
                  <div key={i} className="rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs font-medium flex-1 truncate">
                        {gap.requirement}
                      </span>
                      <Badge className={`${config.color} text-[10px]`}>
                        {gap.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground pl-5">
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
          <div>
            <p className="text-sm font-medium flex items-center gap-1">
              <Info className="h-4 w-4 text-blue-600" />
              Redundancies ({analysis.redundancies.length})
            </p>
            <div className="mt-1 space-y-1">
              {analysis.redundancies.map((r, i) => (
                <div key={i} className="text-xs rounded-md bg-muted/50 px-2 py-1.5">
                  <span className="font-medium">{r.focus_area}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    appears in: {r.appears_in_stages.join(", ")}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {r.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div>
            <p className="text-sm font-medium flex items-center gap-1">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Recommendations
            </p>
            <ol className="mt-1 space-y-1 list-decimal list-inside">
              {analysis.recommendations.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  {r}
                </li>
              ))}
            </ol>
          </div>
        )}

        <AIDisclaimer />
      </CardContent>
    </Card>
  );
}
