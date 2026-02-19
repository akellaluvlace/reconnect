"use client";

import { useState } from "react";
import type { MarketInsights, HiringStrategy } from "@reconnect/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIDisclaimer } from "@/components/ai/ai-disclaimer";
import { AIIndicatorBadge } from "@/components/ai/ai-indicator-badge";
import {
  Target,
  Sparkles,
  ShieldAlert,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface StrategyPanelProps {
  playbookId: string;
  strategy: HiringStrategy | null;
  marketInsights: MarketInsights | null;
  role: string;
  level: string;
  industry: string;
  onUpdate: (data: HiringStrategy) => void;
}

const MARKET_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  employer_market: { label: "Employer's Market", color: "bg-green-100 text-green-800" },
  balanced: { label: "Balanced Market", color: "bg-blue-100 text-blue-800" },
  candidate_market: { label: "Candidate's Market", color: "bg-red-100 text-red-800" },
};

const SPEED_LABELS: Record<string, { label: string; color: string }> = {
  fast_track: { label: "Fast Track", color: "bg-orange-100 text-orange-800" },
  standard: { label: "Standard", color: "bg-blue-100 text-blue-800" },
  thorough: { label: "Thorough", color: "bg-purple-100 text-purple-800" },
};

const SALARY_LABELS: Record<string, string> = {
  lead: "Lead Market",
  match: "Match Market",
  lag: "Below Market",
};

export function StrategyPanel({
  playbookId,
  strategy,
  marketInsights,
  role,
  level,
  industry,
  onUpdate,
}: StrategyPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    if (!marketInsights) {
      toast.error("Market insights required to generate strategy");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          level,
          industry,
          market_insights: {
            salary: marketInsights.salary,
            competition: marketInsights.competition,
            time_to_hire: marketInsights.time_to_hire,
            candidate_availability: marketInsights.candidate_availability,
            key_skills: marketInsights.key_skills,
            trends: marketInsights.trends,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate strategy");
      }

      const { data } = await res.json();
      onUpdate(data);

      // Auto-save to playbook
      const saveRes = await fetch(`/api/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiring_strategy: data }),
      });

      if (!saveRes.ok) {
        console.error("[strategy] Auto-save failed");
        toast.error("Strategy generated but failed to save");
      }
    } catch (err) {
      console.error("[strategy] Generation failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate strategy",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (!strategy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Hiring Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {marketInsights ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                Generate an AI-powered hiring strategy based on market research
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Strategy
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete market research first to generate a hiring strategy.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const mc = MARKET_CLASS_LABELS[strategy.market_classification];
  const speed = SPEED_LABELS[strategy.process_speed.recommendation];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Hiring Strategy
          </CardTitle>
          <div className="flex items-center gap-2">
            <AIIndicatorBadge />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || !marketInsights}
              aria-label="Regenerate strategy"
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
        {/* Market Classification */}
        <div className="flex items-start gap-3">
          <Badge className={mc?.color ?? ""}>
            {mc?.label ?? strategy.market_classification}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {strategy.market_classification_rationale}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Salary Positioning */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium">Salary Positioning</p>
              <Badge variant="outline" className="mt-1">
                {SALARY_LABELS[strategy.salary_positioning.strategy] ??
                  strategy.salary_positioning.strategy}
              </Badge>
              <p className="mt-1 text-lg font-semibold">
                {strategy.salary_positioning.recommended_range.currency}{" "}
                {strategy.salary_positioning.recommended_range.min.toLocaleString()}
                –
                {strategy.salary_positioning.recommended_range.max.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {strategy.salary_positioning.rationale}
              </p>
            </CardContent>
          </Card>

          {/* Process Speed */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium">Process Speed</p>
              <Badge className={speed?.color ?? ""}>
                {speed?.label ?? strategy.process_speed.recommendation}
              </Badge>
              <p className="mt-1 text-sm">
                Max {strategy.process_speed.max_stages} stages &middot; Target{" "}
                {strategy.process_speed.target_days} days
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {strategy.process_speed.rationale}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Competitive Differentiators */}
        <div>
          <p className="text-sm font-medium">Competitive Differentiators</p>
          <ul className="mt-1 space-y-1">
            {strategy.competitive_differentiators.map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                {d}
              </li>
            ))}
          </ul>
        </div>

        {/* Skills Priority */}
        <div>
          <p className="text-sm font-medium">Skills Priority</p>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-red-700">Must Have</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {strategy.skills_priority.must_have.map((s) => (
                  <Badge key={s} className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-700">Nice to Have</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {strategy.skills_priority.nice_to_have.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-green-700">
                Emerging Premium
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {strategy.skills_priority.emerging_premium.map((s) => (
                  <Badge
                    key={s}
                    className="bg-green-100 text-green-800 hover:bg-green-100 text-xs"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Risks */}
        {strategy.key_risks.length > 0 && (
          <div>
            <p className="flex items-center gap-1 text-sm font-medium">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Key Risks
            </p>
            <div className="mt-1 space-y-2">
              {strategy.key_risks.map((r, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-2">
                  <p className="text-sm font-medium">{r.risk}</p>
                  <p className="text-xs text-muted-foreground">
                    Mitigation: {r.mitigation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {strategy.recommendations.length > 0 && (
          <div>
            <p className="flex items-center gap-1 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Recommendations
            </p>
            <ol className="mt-1 space-y-1 list-decimal list-inside">
              {strategy.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground">
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
