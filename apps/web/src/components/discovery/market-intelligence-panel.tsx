"use client";

import { useState, useEffect, useRef } from "react";
import type { MarketInsights } from "@reconnect/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhaseBadge } from "@/components/ai/phase-badge";
import {
  TrendingUp,
  Users,
  Building2,
  Zap,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface MarketIntelligencePanelProps {
  playbookId: string;
  marketInsights: MarketInsights | null;
  onUpdate: (data: MarketInsights) => void;
}

export function MarketIntelligencePanel({
  playbookId,
  marketInsights,
  onUpdate,
}: MarketIntelligencePanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const MAX_POLL_ATTEMPTS = 60; // 5s * 60 = 5 minutes max

  // Poll for deep research completion when in quick phase
  useEffect(() => {
    if (marketInsights?.phase !== "quick" || isPolling) return;

    // Start polling
    setIsPolling(true);
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        setIsPolling(false);
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const res = await fetch(`/api/playbooks/${playbookId}`);
        if (!res.ok) return;
        const data = await res.json();
        const mi = data.market_insights as MarketInsights | null;
        if (mi?.phase === "deep") {
          onUpdate(mi);
          setIsPolling(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Silently retry
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [marketInsights?.phase, playbookId, onUpdate, isPolling]);

  if (!marketInsights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No market insights available. Complete the playbook wizard to
            generate initial insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  const mi = marketInsights;

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      // Trigger re-fetch by re-loading playbook data
      const res = await fetch(`/api/playbooks/${playbookId}`);
      if (!res.ok) throw new Error("Failed to refresh");
      const data = await res.json();
      if (data.market_insights) {
        onUpdate(data.market_insights as MarketInsights);
      }
    } catch {
      toast.error("Failed to refresh market data");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            {mi.metadata?.source_count > 0 && (
              <span className="text-xs text-muted-foreground">
                Based on {mi.metadata.source_count} sources
              </span>
            )}
            <PhaseBadge phase={mi.phase} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh market data"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Salary Range */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-green-600" />
                Salary Range
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {mi.salary.currency} {mi.salary.min.toLocaleString()}
                  </span>
                  <span>
                    {mi.salary.currency} {mi.salary.max.toLocaleString()}
                  </span>
                </div>
                <div className="relative mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 rounded-full bg-green-500"
                    style={{
                      left: "0%",
                      right: "0%",
                    }}
                  />
                  {/* Median marker */}
                  {mi.salary.max > mi.salary.min && (
                    <div
                      className="absolute top-0 h-2 w-0.5 bg-green-800"
                      style={{
                        left: `${((mi.salary.median - mi.salary.min) / (mi.salary.max - mi.salary.min)) * 100}%`,
                      }}
                    />
                  )}
                </div>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  Median: {mi.salary.currency}{" "}
                  {mi.salary.median.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Demand */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-blue-600" />
                Candidate Availability
              </div>
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className={
                    mi.candidate_availability.level === "scarce"
                      ? "border-red-300 text-red-700"
                      : mi.candidate_availability.level === "limited"
                        ? "border-orange-300 text-orange-700"
                        : mi.candidate_availability.level === "moderate"
                          ? "border-blue-300 text-blue-700"
                          : "border-green-300 text-green-700"
                  }
                >
                  {mi.candidate_availability.level}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mi.candidate_availability.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Competition */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-purple-600" />
                Competition
              </div>
              <div className="mt-2">
                <p className="text-lg font-semibold">
                  {mi.competition.job_postings_count}
                </p>
                <p className="text-xs text-muted-foreground">
                  active postings ({mi.competition.market_saturation} saturation)
                </p>
                {mi.competition.companies_hiring.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {mi.competition.companies_hiring.slice(0, 5).map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                    {mi.competition.companies_hiring.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{mi.competition.companies_hiring.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skills */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-amber-600" />
              Skills Landscape
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mi.key_skills.required.map((s) => (
                <Badge key={s} className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {s}
                </Badge>
              ))}
              {mi.key_skills.emerging.map((s) => (
                <Badge
                  key={s}
                  className="bg-green-100 text-green-800 hover:bg-green-100"
                >
                  {s}
                  <span className="ml-1 text-[10px]">NEW</span>
                </Badge>
              ))}
              {mi.key_skills.declining.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="text-muted-foreground line-through"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trends */}
        {mi.trends.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium">Market Trends</p>
              <ul className="mt-2 space-y-1">
                {mi.trends.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                    {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
